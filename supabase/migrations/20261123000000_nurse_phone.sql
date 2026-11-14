-- Teranga Santé — numéro professionnel des infirmières, affiché aux jeunes sur la page du poste de santé.
-- Renseigné par l'infirmière (profil web) ou son responsable ; vide = pas de numéro affiché.

alter table public.pros add column if not exists phone text
  check (phone is null or phone ~ '^[0-9 +().-]{7,20}$');

drop function if exists public.nurses_directory();
create or replace function public.nurses_directory()
returns table (
  id uuid, display_name text, specialty text, bio text, languages public.lang[], status public.pro_status, phone text,
  centre_id uuid, centre_name text, centre_district text, centre_phone text, region_id smallint
)
language sql stable security definer set search_path = public, auth as
$$
  select p.id, p.display_name, p.specialty, p.bio, p.languages, p.status, p.phone,
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
