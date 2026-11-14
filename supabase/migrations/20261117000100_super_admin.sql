-- Teranga Santé — rôle super administrateur (2/2)
-- Le super admin gère toute la plateforme : comptes, centres, contenus, stocks, agendas, statistiques,
-- signalements et journal. Par principe de confidentialité, il N'A PAS accès aux conversations
-- des jeunes (conversations, messages, vocaux) ni à la table players.

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.pros where id = auth.uid() and role::text = 'super_admin') $$;
grant execute on function public.is_super_admin() to authenticated;

-- Accès complet, table par table (les politiques permissives s'additionnent aux existantes).
do $$
declare t text;
begin
  foreach t in array array['regions', 'centres', 'pros', 'slots', 'bookings', 'quiz_questions', 'chatbot_nodes',
                           'reports', 'stocks', 'activity_log', 'articles', 'alerts', 'booking_events', 'chatbot_hits']
  loop
    execute format('create policy "super admin : accès complet" on public.%I for all using (public.is_super_admin()) with check (public.is_super_admin())', t);
  end loop;
end $$;

-- Statistiques d'un centre : le super admin choisit le centre, les autres restent sur le leur.
drop function if exists public.centre_stats(date, date);
create or replace function public.centre_stats(p_from date, p_to date, p_centre_id uuid default null)
returns json language sql stable security definer set search_path = public as
$$
  with target as (
    select case when public.is_super_admin() then coalesce(p_centre_id, public.my_centre()) else public.my_centre() end as id
  ), bk as (
    select b.*, s.starts_at from public.bookings b join public.slots s on s.id = b.slot_id, target
    where b.centre_id = target.id and s.starts_at::date between p_from and p_to
  ), first_visit as (
    select player_id, min(created_at) as first_at from public.bookings, target where centre_id = target.id group by player_id
  )
  select json_build_object(
    'screenings', (select count(*) from bk where service = 'screening' and status = 'attended'),
    'consultations', (select count(*) from bk where service <> 'screening' and status = 'attended'),
    'no_show_rate', (select case when count(*) filter (where status in ('attended','no_show')) = 0 then 0
                       else round(100.0 * count(*) filter (where status = 'no_show') / count(*) filter (where status in ('attended','no_show'))) end from bk),
    'new_users', (select count(*) from first_visit where first_at::date between p_from and p_to),
    'by_weekday', (select coalesce(json_agg(json_build_object('dow', d, 'count', coalesce(n, 0)) order by d), '[]')
                   from generate_series(1, 7) d left join (select extract(isodow from starts_at)::int dow, count(*) n from bk where status <> 'cancelled' group by 1) x on x.dow = d),
    'by_nurse', (select coalesce(json_agg(json_build_object('name', p.display_name, 'count', coalesce(x.n, 0)) order by p.display_name), '[]')
                 from public.pros p cross join target left join (select nurse_id, count(*) n from bk where status <> 'cancelled' group by 1) x on x.nurse_id = p.id
                 where p.centre_id = target.id and p.role = 'nurse')
  )
  where public.my_pro_role()::text in ('manager', 'nurse', 'super_admin')
$$;
grant execute on function public.centre_stats(date, date, uuid) to authenticated;

-- Tableau national : ouvert au super admin.
create or replace function public.national_overview(p_months int default 6, p_region smallint default null, p_age text default null)
returns json language sql stable security definer set search_path = public as
$$
  with bk as (
    select b.status, b.service, b.created_at, c.region_id
    from public.bookings b
    join public.centres c on c.id = b.centre_id
    left join public.players pl on pl.id = b.player_id
    where b.created_at >= date_trunc('month', now()) - make_interval(months => p_months - 1)
      and (p_region is null or c.region_id = p_region)
      and (p_age is null or pl.age_band = p_age)
  )
  select json_build_object(
    'active_users', (select count(*) from public.players pl
                      where coalesce(pl.last_played, pl.created_at::date) >= (now() - make_interval(months => p_months))::date
                        and (p_region is null or pl.region_id = p_region) and (p_age is null or pl.age_band = p_age)),
    'bookings', (select count(*) from bk where status <> 'cancelled'),
    'screenings', (select count(*) from bk where service = 'screening' and status = 'attended'),
    'orientations', (select count(*) from public.chatbot_hits where routed_to is not null
                      and created_at >= now() - make_interval(months => p_months)),
    'by_region', (select coalesce(json_agg(json_build_object('region_id', r.id, 'name', r.name,
                    'count', case when coalesce(x.n, 0) >= 5 then x.n end) order by r.id), '[]')
                  from public.regions r left join (select region_id, count(*) n from bk where status <> 'cancelled' group by 1) x on x.region_id = r.id),
    'by_month', (select coalesce(json_agg(json_build_object('month', to_char(m, 'YYYY-MM'), 'count', coalesce(x.n, 0)) order by m), '[]')
                 from generate_series(date_trunc('month', now()) - make_interval(months => p_months - 1), date_trunc('month', now()), interval '1 month') m
                 left join (select date_trunc('month', created_at) mm, count(*) n from bk where status <> 'cancelled' group by 1) x on x.mm = m),
    'top_questions', (select coalesce(json_agg(json_build_object('node_id', node_id, 'count', n) order by n desc), '[]')
                      from (select node_id, count(*) n from public.chatbot_hits
                            where node_id <> 'root' and created_at >= now() - make_interval(months => p_months)
                            group by 1 order by 2 desc limit 3) t)
  )
  where public.my_pro_role()::text in ('national_admin', 'super_admin')
$$;

-- Report de rendez-vous : le super admin peut agir sur tous les centres.
create or replace function public.reschedule_booking(p_booking_id uuid, p_slot_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as
$$
declare b public.bookings; s public.slots; taken int;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or (b.centre_id is distinct from public.my_centre() and not public.is_super_admin()) then raise exception 'rendez-vous introuvable'; end if;
  select * into s from public.slots where id = p_slot_id for update;
  if not found or s.centre_id <> b.centre_id or s.blocked then raise exception 'créneau indisponible'; end if;
  select count(*) into taken from public.bookings where slot_id = s.id and status <> 'cancelled' and id <> b.id;
  if taken >= s.capacity then raise exception 'créneau complet'; end if;
  update public.bookings set slot_id = s.id, nurse_id = coalesce(s.nurse_id, nurse_id), status = 'confirmed'
   where id = b.id returning * into b;
  return b;
end $$;

-- Le super admin n'a pas de centre propre : contrainte de cohérence pour les autres rôles.
alter table public.pros add constraint pros_centre_required
  check (role::text in ('national_admin', 'super_admin') or centre_id is not null) not valid;

-- Annuaire des infirmières (M6) : inchangé, le super admin n'y apparaît pas (role = 'nurse').
