-- Teranga Santé — conformité données personnelles (loi sénégalaise n° 2008-12).
-- 1. Traçabilité de l'acceptation des conditions d'utilisation (jeunes et professionnels).
-- 2. Effacement complet d'un compte de jeune possible (fonction Edge « delete-account »).
-- 3. Durées de conservation appliquées automatiquement (fonction Edge « purge-data », lancée chaque jour).
-- Les durées sont reprises telles quelles dans la politique de confidentialité (apps/web/src/lib/legal.ts).
-- Migration autonome et rejouable.

-- ---------- 1. Acceptation des CGU ----------
alter table public.pros    add column if not exists terms_version text;
alter table public.pros    add column if not exists terms_accepted_at timestamptz;
alter table public.players add column if not exists terms_version text;
alter table public.players add column if not exists terms_accepted_at timestamptz;

-- ---------- 2. Effacement d'un compte ----------
-- Le journal d'activité garde la trace de l'action, mais plus le lien vers un compte supprimé
-- (sinon la suppression d'un compte de jeune ayant réservé serait bloquée).
alter table public.activity_log drop constraint if exists activity_log_actor_id_fkey;
alter table public.activity_log add constraint activity_log_actor_id_fkey
  foreign key (actor_id) references auth.users(id) on delete set null;

-- Même chose pour l'auteur d'un message : sans cela, supprimer un compte est refusé. Les messages d'un jeune
-- disparaissent de toute façon avec ses conversations ; ceux d'une infirmière supprimée restent, sans auteur.
alter table public.messages alter column sender_id drop not null;
alter table public.messages drop constraint if exists messages_sender_id_fkey;
alter table public.messages add constraint messages_sender_id_fkey
  foreign key (sender_id) references auth.users(id) on delete set null;

-- Conversations d'un jeune (pour supprimer ses messages vocaux du stockage avant le compte).
create or replace function public.conversations_of(p_user uuid) returns setof uuid
language sql stable security definer set search_path = public as
$$ select id from public.conversations where player_id = p_user $$;
revoke execute on function public.conversations_of(uuid) from public, anon, authenticated;
grant execute on function public.conversations_of(uuid) to service_role;

-- ---------- 3. Purge des données arrivées à échéance ----------
-- Renvoie ce que la base ne peut pas supprimer seule : les dossiers de vocaux (stockage)
-- et les comptes anonymes inactifs (supprimés par l'API d'administration).
create or replace function public.purge_expired_data() returns jsonb
language plpgsql security definer set search_path = public, auth as
$$
declare
  v_conv uuid[];
  v_users uuid[];
  n_bookings int; n_reports int; n_usage int; n_log int;
begin
  -- Conversations sans message depuis 12 mois (les messages suivent par cascade).
  select coalesce(array_agg(id), '{}') into v_conv
  from public.conversations where last_message_at < now() - interval '12 months';
  delete from public.conversations where id = any(v_conv);

  -- Rendez-vous dont la date est passée depuis plus de 24 mois.
  with d as (
    delete from public.bookings b using public.slots s
    where s.id = b.slot_id and s.starts_at < now() - interval '24 months' returning 1
  ) select count(*) into n_bookings from d;

  -- Signalements clôturés, envoyés il y a plus de 24 mois.
  with d as (
    delete from public.reports where status = 'closed' and created_at < now() - interval '24 months' returning 1
  ) select count(*) into n_reports from d;

  -- Compteur d'usage de l'IA : 30 jours.
  with d as (delete from public.ai_usage where day < current_date - 30 returning 1) select count(*) into n_usage from d;

  -- Journal d'activité : 12 mois.
  with d as (delete from public.activity_log where created_at < now() - interval '12 months' returning 1) select count(*) into n_log from d;

  -- Comptes anonymes (jeunes) sans aucune activité depuis 24 mois.
  select coalesce(array_agg(u.id), '{}') into v_users
  from auth.users u
  where u.is_anonymous
    and not exists (select 1 from public.pros p where p.id = u.id)
    and greatest(
          u.created_at,
          coalesce(u.last_sign_in_at, u.created_at),
          coalesce((select max(s.updated_at) from auth.sessions s where s.user_id = u.id), u.created_at),
          coalesce((select pl.last_played::timestamptz from public.players pl where pl.id = u.id), u.created_at)
        ) < now() - interval '24 months';

  return jsonb_build_object(
    'voice_folders', to_jsonb(v_conv),
    'stale_users', to_jsonb(v_users),
    'conversations', coalesce(array_length(v_conv, 1), 0),
    'bookings', n_bookings, 'reports', n_reports, 'ai_usage', n_usage, 'activity_log', n_log
  );
end $$;
revoke execute on function public.purge_expired_data() from public, anon, authenticated;
grant execute on function public.purge_expired_data() to service_role;
