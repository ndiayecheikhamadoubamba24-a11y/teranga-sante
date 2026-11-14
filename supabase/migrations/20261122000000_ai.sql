-- Teranga Santé — intelligence artificielle (chatbot Groq, génération de questions Gemini).
-- Les clés API ne sont JAMAIS en base ni dans les apps : elles sont dans les secrets des fonctions Edge.

-- Origine d'une question du jeu : saisie par une infirmière ou générée par l'IA (à valider avant publication).
alter table public.quiz_questions add column if not exists source text not null default 'manuel' check (source in ('manuel', 'ia'));

-- Compteur d'usage pour limiter les abus et les coûts (lu et écrit uniquement par les fonctions Edge, clé service).
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default current_date,
  kind    text not null check (kind in ('chat', 'quiz')),
  count   int  not null default 0,
  primary key (user_id, day, kind)
);
alter table public.ai_usage enable row level security;   -- aucune politique : invisible pour les apps

-- Incrément atomique ; renvoie le nouveau total du jour.
create or replace function public.ai_usage_hit(p_user uuid, p_kind text) returns int
language sql security definer set search_path = public as
$$
  insert into public.ai_usage (user_id, kind, count) values (p_user, p_kind, 1)
  on conflict (user_id, day, kind) do update set count = public.ai_usage.count + 1
  returning count
$$;
revoke execute on function public.ai_usage_hit(uuid, text) from public, anon, authenticated;
grant execute on function public.ai_usage_hit(uuid, text) to service_role;
