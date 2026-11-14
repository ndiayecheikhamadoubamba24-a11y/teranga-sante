-- Teranga Santé — mot de passe provisoire donné par le super admin, à changer à la 1re connexion.

alter table public.pros add column must_change_password boolean not null default false;

-- Empreinte du mot de passe provisoire (schéma privé, non exposé par l'API).
create schema if not exists private;
revoke all on schema private from public;
create table if not exists private.temp_passwords (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_password text not null,
  created_at timestamptz not null default now()
);

-- Appelée par la fonction Edge (clé service) juste après la création / réinitialisation du compte.
create or replace function public.mark_temp_password(p_user_id uuid) returns void
language plpgsql security definer set search_path = public, auth, private as
$$
begin
  insert into private.temp_passwords (user_id, encrypted_password)
  select id, encrypted_password from auth.users where id = p_user_id
  on conflict (user_id) do update set encrypted_password = excluded.encrypted_password, created_at = now();
  update public.pros set must_change_password = true where id = p_user_id;
end $$;
revoke execute on function public.mark_temp_password(uuid) from public, anon, authenticated;
grant execute on function public.mark_temp_password(uuid) to service_role;

-- Appelée par l'utilisateur après auth.updateUser({ password }) : on vérifie que le mot de passe a VRAIMENT changé.
create or replace function public.password_changed() returns boolean
language plpgsql security definer set search_path = public, auth, private as
$$
declare changed boolean;
begin
  select coalesce(u.encrypted_password <> t.encrypted_password, true) into changed
  from auth.users u left join private.temp_passwords t on t.user_id = u.id
  where u.id = auth.uid();
  if changed then
    perform set_config('teranga.password_change', 'on', true);
    update public.pros set must_change_password = false where id = auth.uid();
    delete from private.temp_passwords where user_id = auth.uid();
  end if;
  return coalesce(changed, false);
end $$;
grant execute on function public.password_changed() to authenticated;

-- Tant que le mot de passe provisoire n'est pas changé, le compte n'a AUCUN droit professionnel.
create or replace function public.my_pro_role() returns public.pro_role
language sql stable security definer set search_path = public as
$$ select role from public.pros where id = auth.uid() and not must_change_password $$;

create or replace function public.my_centre() returns uuid
language sql stable security definer set search_path = public as
$$ select centre_id from public.pros where id = auth.uid() and not must_change_password $$;

create or replace function public.is_pro() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.pros where id = auth.uid() and not must_change_password) $$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.pros where id = auth.uid() and role::text = 'super_admin' and not must_change_password) $$;

-- Colonnes sensibles des comptes (rôle, centre, mot de passe provisoire) : modifiables uniquement par
-- le super admin, la fonction Edge (clé service) ou password_changed(). Corrige aussi une faille où un
-- professionnel pouvait modifier son propre rôle via l'API.
create or replace function public.protect_pro_columns() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if (new.role is distinct from old.role or new.centre_id is distinct from old.centre_id
      or new.must_change_password is distinct from old.must_change_password)
     and coalesce(auth.role(), 'service_role') <> 'service_role'
     and current_setting('teranga.password_change', true) is distinct from 'on'
     and not public.is_super_admin() then
    raise exception 'modification réservée au super administrateur';
  end if;
  return new;
end $$;
create trigger pros_protect before update on public.pros for each row execute function public.protect_pro_columns();

drop policy if exists "pro modifie son profil" on public.pros;
create policy "pro modifie son profil" on public.pros for update using (id = auth.uid() and not must_change_password);
