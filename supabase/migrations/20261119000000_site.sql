-- Teranga Santé — site vitrine public (conseils et publications).
-- Les fiches « articles » publiées sont déjà lisibles sans compte (politique « fiches publiées lisibles »).

alter table public.articles
  add column category text not null default 'conseil' check (category in ('conseil', 'actualite')),
  add column published_at timestamptz;

-- Date de publication renseignée automatiquement à la première publication.
create or replace function public.article_published_at() returns trigger
language plpgsql as
$$ begin
  if new.published and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;
create trigger articles_published_at before insert or update on public.articles
  for each row execute function public.article_published_at();

update public.articles set published_at = coalesce(published_at, updated_at) where published;
