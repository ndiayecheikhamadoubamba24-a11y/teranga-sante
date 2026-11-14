-- Teranga Santé — équipe et activité de chaque centre.
-- Statistiques agrégées uniquement : aucun contenu de message ni identité de jeune n'est exposé.

-- Qui peut voir l'équipe d'un centre : son responsable, l'administration nationale et le super admin.
create or replace function public.can_view_team(p_centre_id uuid) returns boolean
language sql stable security definer set search_path = public as
$$
  select public.is_super_admin()
      or public.my_pro_role()::text = 'national_admin'
      or (public.my_pro_role()::text = 'manager' and public.my_centre() = p_centre_id)
$$;

create or replace function public.team_activity(p_centre_id uuid, p_from timestamptz default now() - interval '30 days')
returns table (
  id uuid, display_name text, role text, specialty text, status text, languages text[],
  bookings_assigned bigint, attended bigint, no_show bigint, bookings_handled bigint,
  conversations bigint, messages_sent bigint, avg_response_min numeric, slots_created bigint, last_activity timestamptz
)
language sql stable security definer set search_path = public as
$$
  select
    p.id, p.display_name, p.role::text, p.specialty, p.status::text, p.languages::text[],
    -- rendez-vous qui lui sont attribués sur la période (passés et 30 jours à venir)
    (select count(*) from public.bookings b join public.slots s on s.id = b.slot_id
      where b.nurse_id = p.id and b.status <> 'cancelled' and s.starts_at >= p_from and s.starts_at < now() + interval '30 days'),
    (select count(*) from public.bookings b join public.slots s on s.id = b.slot_id
      where b.nurse_id = p.id and b.status = 'attended' and s.starts_at >= p_from),
    (select count(*) from public.bookings b join public.slots s on s.id = b.slot_id
      where b.nurse_id = p.id and b.status = 'no_show' and s.starts_at >= p_from),
    -- rendez-vous qu'il/elle a traités (confirmé, venu, absent, annulé…)
    (select count(*) from public.activity_log a where a.actor_id = p.id and a.action like 'booking.%' and a.created_at >= p_from),
    (select count(*) from public.conversations c where c.nurse_id = p.id and c.last_message_at >= p_from),
    (select count(*) from public.messages m where m.sender_id = p.id and m.created_at >= p_from),
    -- délai moyen entre un message du jeune et la réponse suivante de l'infirmière (minutes)
    (select round(avg(extract(epoch from (r.reply_at - m.created_at)) / 60)::numeric, 0)
       from public.messages m
       join public.conversations c on c.id = m.conversation_id
       cross join lateral (select min(m2.created_at) as reply_at from public.messages m2
                           where m2.conversation_id = m.conversation_id and m2.sender_id = p.id and m2.created_at > m.created_at) r
      where c.nurse_id = p.id and m.sender_id = c.player_id and m.created_at >= p_from and r.reply_at is not null),
    (select coalesce(sum(case when a.entity_id ~ '^\d+$' then a.entity_id::int else 1 end), 0)
       from public.activity_log a where a.actor_id = p.id and a.action = 'slot.create' and a.created_at >= p_from),
    (select max(a.created_at) from public.activity_log a where a.actor_id = p.id)
  from public.pros p
  where p.centre_id = p_centre_id and public.can_view_team(p_centre_id)
  order by (p.role::text = 'manager') desc, p.display_name
$$;

-- Fil d'activité de l'équipe d'un centre (actions des professionnels, jamais de contenu).
create or replace function public.team_feed(p_centre_id uuid, p_limit int default 40)
returns table (created_at timestamptz, actor_id uuid, display_name text, role text, action text, entity text)
language sql stable security definer set search_path = public as
$$
  select a.created_at, p.id, p.display_name, p.role::text, a.action, a.entity
  from public.activity_log a
  join public.pros p on p.id = a.actor_id
  where p.centre_id = p_centre_id and public.can_view_team(p_centre_id)
  order by a.created_at desc
  limit least(greatest(p_limit, 1), 200)
$$;

grant execute on function public.can_view_team(uuid), public.team_activity(uuid, timestamptz), public.team_feed(uuid, int) to authenticated;
