-- Teranga Santé — interface d'administration (A1 à A10)

-- ---------- Conversations : libellé anonyme + contexte affiché à l'infirmière (A5) ----------
alter table public.conversations
  add column alias text,                                  -- ex : BAO-4821 (dernier code de réservation) ou ANON-1234
  add column topic text,                                  -- motif choisi dans l'app (dépistage, PrEP…)
  add column lang public.lang not null default 'fr';

create or replace function public.conversation_defaults() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if new.alias is null then
    select code into new.alias from public.bookings where player_id = new.player_id order by created_at desc limit 1;
    new.alias := coalesce(new.alias, 'ANON-' || lpad((floor(random() * 10000))::int::text, 4, '0'));
  end if;
  select p.lang into new.lang from public.players p where p.id = new.player_id;
  new.lang := coalesce(new.lang, 'fr');
  return new;
end $$;
create trigger conversations_defaults before insert on public.conversations
  for each row execute function public.conversation_defaults();

-- Le jeune a-t-il un rendez-vous à venir ? (sans exposer ses réservations)
create or replace function public.conversation_has_booking(p_conversation_id uuid) returns boolean
language sql stable security definer set search_path = public as
$$
  select exists (
    select 1 from public.conversations c
    join public.bookings b on b.player_id = c.player_id
    join public.slots s on s.id = b.slot_id
    where c.id = p_conversation_id and (c.nurse_id = auth.uid() or (c.nurse_id is null and public.is_pro()))
      and b.status in ('pending', 'confirmed') and s.starts_at > now())
$$;

-- Conversations non attribuées : visibles par toutes les infirmières, qui peuvent les prendre en charge.
create policy "infirmières voient les conversations libres" on public.conversations for select
  using (nurse_id is null and public.my_pro_role() = 'nurse');
create policy "infirmière prend une conversation libre" on public.conversations for update
  using (nurse_id is null and public.my_pro_role() = 'nurse') with check (nurse_id = auth.uid());

-- ---------- Bibliothèque : fiches d'information (A6) ----------
create table public.articles (
  id          uuid primary key default gen_random_uuid(),
  title       jsonb not null,                            -- {"fr": "...", "wo": "...", "ff": "..."}
  body        jsonb not null default '{}'::jsonb,
  illustration text,                                     -- clé d'illustration (ex : 'baobi-friends')
  published   boolean not null default false,
  author_id   uuid references public.pros(id),
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
alter table public.articles enable row level security;
create policy "fiches publiées lisibles" on public.articles for select using (published or public.is_pro());
create policy "fiches gérées" on public.articles for all
  using (public.my_pro_role() in ('nurse', 'national_admin')) with check (public.my_pro_role() in ('nurse', 'national_admin'));
create policy "quiz gérés (admin)" on public.quiz_questions for update using (public.my_pro_role() = 'national_admin');

-- ---------- Alertes (ruptures de stock, etc.) — A7, A8, A10 ----------
create table public.alerts (
  id         uuid primary key default gen_random_uuid(),
  centre_id  uuid references public.centres(id) on delete cascade,
  kind       text not null check (kind in ('stock_out', 'stock_low', 'staff', 'other')),
  item       text,
  message    text not null,
  status     public.report_status not null default 'new',
  created_by uuid references public.pros(id),
  created_at timestamptz not null default now()
);
alter table public.alerts enable row level security;
create policy "alertes du centre" on public.alerts for select
  using (public.my_pro_role() = 'national_admin' or centre_id = public.my_centre());
create policy "centre signale" on public.alerts for insert
  with check (public.is_pro() and centre_id = public.my_centre() and created_by = auth.uid());
create policy "admin traite les alertes" on public.alerts for update
  using (public.my_pro_role() = 'national_admin' or (public.my_pro_role() = 'manager' and centre_id = public.my_centre()));

-- Capacité de stockage pour afficher les jauges en % (A8)
alter table public.stocks add column capacity int not null default 100 check (capacity > 0);

-- Alerte automatique quand un stock passe sous le seuil.
create or replace function public.stock_alert() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if new.level <= new.threshold and (tg_op = 'INSERT' or old.level > old.threshold) then
    insert into public.alerts (centre_id, kind, item, message)
    values (new.centre_id, case when new.level = 0 then 'stock_out' else 'stock_low' end, new.item,
            case when new.level = 0 then 'Rupture : ' else 'Stock bas : ' end ||
            case new.item when 'selftest' then 'autotests' when 'condom' then 'préservatifs' when 'arv' then 'ARV' when 'prep' then 'PrEP' else new.item end);
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger stocks_alert before insert or update on public.stocks for each row execute function public.stock_alert();

-- ---------- Signalements : géolocalisation par région, lecture associations ----------
create policy "joueur lit ses signalements" on public.reports for select using (player_id = auth.uid());

-- ---------- Équipe : le responsable gère les infirmières de son centre (A8) ----------
create policy "responsable gère son équipe" on public.pros for update
  using (public.my_pro_role() = 'manager' and centre_id = public.my_centre());

-- ---------- Journal : chaque professionnel trace ses actions ----------
create policy "pro écrit dans le journal" on public.activity_log for insert with check (actor_id = auth.uid() and public.is_pro());

-- ---------- Événements anonymes pour la carte nationale en direct (A9) ----------
-- Seule la région et l'horodatage sont conservés : aucun code, aucun joueur.
create table public.booking_events (
  id         bigint generated always as identity primary key,
  region_id  smallint not null references public.regions(id),
  created_at timestamptz not null default now()
);
alter table public.booking_events enable row level security;
create policy "événements lisibles par admins" on public.booking_events for select
  using (public.my_pro_role() in ('national_admin', 'manager'));

create or replace function public.emit_booking_event() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  insert into public.booking_events (region_id) select region_id from public.centres where id = new.centre_id;
  return new;
end $$;
create trigger bookings_event after insert on public.bookings for each row execute function public.emit_booking_event();

-- ---------- Questions posées au chatbot (top questions, orientations) ----------
create table public.chatbot_hits (
  id         bigint generated always as identity primary key,
  node_id    text not null,
  routed_to  text,                                       -- module vers lequel le chatbot a orienté
  created_at timestamptz not null default now()
);
alter table public.chatbot_hits enable row level security;
create policy "usager enregistre un passage" on public.chatbot_hits for insert to authenticated with check (true);
create policy "admins lisent" on public.chatbot_hits for select using (public.my_pro_role() = 'national_admin');

-- ---------- Report d'un rendez-vous (A4) ----------
create or replace function public.reschedule_booking(p_booking_id uuid, p_slot_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as
$$
declare b public.bookings; s public.slots; taken int;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.centre_id is distinct from public.my_centre() then raise exception 'rendez-vous introuvable'; end if;
  select * into s from public.slots where id = p_slot_id for update;
  if not found or s.centre_id <> b.centre_id or s.blocked then raise exception 'créneau indisponible'; end if;
  select count(*) into taken from public.bookings where slot_id = s.id and status <> 'cancelled' and id <> b.id;
  if taken >= s.capacity then raise exception 'créneau complet'; end if;
  update public.bookings set slot_id = s.id, nurse_id = coalesce(s.nurse_id, nurse_id), status = 'confirmed'
   where id = b.id returning * into b;
  return b;
end $$;

-- ---------- Tableau de bord du centre (A7) ----------
create or replace function public.centre_stats(p_from date, p_to date)
returns json language sql stable security definer set search_path = public as
$$
  with bk as (
    select b.*, s.starts_at from public.bookings b join public.slots s on s.id = b.slot_id
    where b.centre_id = public.my_centre() and s.starts_at::date between p_from and p_to
  ), first_visit as (
    select player_id, min(created_at) as first_at from public.bookings where centre_id = public.my_centre() group by player_id
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
                 from public.pros p left join (select nurse_id, count(*) n from bk where status <> 'cancelled' group by 1) x on x.nurse_id = p.id
                 where p.centre_id = public.my_centre() and p.role = 'nurse')
  )
  where public.my_pro_role() in ('manager', 'nurse')
$$;

-- ---------- Tableau de bord national (A9) — données agrégées, seuil d'effectif 5 ----------
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
  where public.my_pro_role() = 'national_admin'
$$;

grant execute on function public.reschedule_booking(uuid, uuid), public.centre_stats(date, date),
  public.national_overview(int, smallint, text), public.conversation_has_booking(uuid) to authenticated;

-- ---------- Temps réel ----------
alter publication supabase_realtime add table public.alerts, public.booking_events, public.reports, public.pros;

