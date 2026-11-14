-- Teranga Santé — M6 Infirmières : liste et profil (côté jeune).

-- Courte présentation rédigée par l'infirmière (affichée sur son profil dans l'app).
alter table public.pros add column if not exists bio text check (char_length(bio) <= 300);

-- Annuaire public des infirmières : uniquement les comptes actifs (ni désactivés, ni en attente de mot de passe).
-- Le numéro affiché est celui du CENTRE, jamais un numéro personnel.
drop function if exists public.nurses_directory();
create or replace function public.nurses_directory()
returns table (
  id uuid, display_name text, specialty text, bio text, languages public.lang[], status public.pro_status,
  centre_id uuid, centre_name text, centre_district text, centre_phone text, region_id smallint
)
language sql stable security definer set search_path = public, auth as
$$
  select p.id, p.display_name, p.specialty, p.bio, p.languages, p.status,
         p.centre_id, c.name, c.district, c.phone, c.region_id
  from public.pros p
  left join public.centres c on c.id = p.centre_id
  left join auth.users u on u.id = p.id
  where p.role = 'nurse'
    and not p.must_change_password
    and (u.banned_until is null or u.banned_until < now())
  order by (p.status = 'online') desc, (p.status = 'busy') desc, p.display_name
$$;
grant execute on function public.nurses_directory() to authenticated;
