-- Teranga Santé — M7 Discussion avec une infirmière (côté jeune) + messages vocaux

-- ---------- Droits resserrés ----------
-- Avant : tout participant pouvait modifier n'importe quelle colonne d'une conversation ou d'un message.
-- Désormais : seule l'infirmière modifie la conversation ; le jeune passe par des fonctions dédiées.
drop policy if exists "participants mettent à jour" on public.conversations;
create policy "infirmière met à jour sa conversation" on public.conversations for update
  using (nurse_id = auth.uid()) with check (nurse_id = auth.uid());

-- Le jeune choisit éventuellement une infirmière à la création, jamais un autre joueur.
drop policy if exists "joueur ouvre une conversation" on public.conversations;
create policy "joueur ouvre une conversation" on public.conversations for insert
  with check (player_id = auth.uid() and closed = false
              and (nurse_id is null or exists (select 1 from public.pros p where p.id = nurse_id and p.role = 'nurse')));

-- Plus de modification directe des messages (le contenu est immuable) : accusés de lecture via mark_read().
drop policy if exists "destinataire marque lu" on public.messages;

-- Infirmière qui ouvre une conversation libre : elle peut lire les messages avant de la prendre en charge.
create policy "infirmières lisent les conversations libres" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and c.nurse_id is null and public.my_pro_role() = 'nurse'));

create or replace function public.mark_read(p_conversation_id uuid) returns void
language sql security definer set search_path = public as
$$
  update public.messages m set read_at = now()
  from public.conversations c
  where m.conversation_id = p_conversation_id and c.id = m.conversation_id
    and m.read_at is null and m.sender_id <> auth.uid()
    and (c.player_id = auth.uid() or c.nurse_id = auth.uid())
$$;

-- Bouton Urgence du jeune : marque la conversation prioritaire (seule colonne modifiable par lui).
create or replace function public.flag_urgent(p_conversation_id uuid) returns void
language sql security definer set search_path = public as
$$ update public.conversations set urgent = true, closed = false where id = p_conversation_id and player_id = auth.uid() $$;

-- Infirmières visibles par les jeunes (M6) : prénom, spécialité, langues, centre et statut uniquement.
create or replace function public.nurses_directory()
returns table (id uuid, display_name text, specialty text, languages public.lang[], status public.pro_status, centre_id uuid, centre_name text)
language sql stable security definer set search_path = public as
$$
  select p.id, p.display_name, p.specialty, p.languages, p.status, p.centre_id, c.name
  from public.pros p left join public.centres c on c.id = p.centre_id
  where p.role = 'nurse'
  order by (p.status = 'online') desc, (p.status = 'busy') desc, p.display_name
$$;

grant execute on function public.mark_read(uuid), public.flag_urgent(uuid), public.nurses_directory() to authenticated;

-- ---------- Messages vocaux : stockage privé ----------
-- Chemin : <conversation_id>/<uuid>.m4a — accessible uniquement aux participants de la conversation.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice', 'voice', false, 2097152, array['audio/mp4', 'audio/m4a', 'audio/aac', 'audio/webm', 'audio/ogg'])
on conflict (id) do nothing;

create or replace function public.can_access_conversation(p_conversation_id text) returns boolean
language sql stable security definer set search_path = public as
$$
  select exists (
    select 1 from public.conversations c
    where c.id::text = p_conversation_id
      and (c.player_id = auth.uid() or c.nurse_id = auth.uid() or (c.nurse_id is null and public.my_pro_role() = 'nurse')))
$$;

create policy "vocal : participants déposent" on storage.objects for insert to authenticated
  with check (bucket_id = 'voice' and public.can_access_conversation((storage.foldername(name))[1]));
create policy "vocal : participants écoutent" on storage.objects for select to authenticated
  using (bucket_id = 'voice' and public.can_access_conversation((storage.foldername(name))[1]));
