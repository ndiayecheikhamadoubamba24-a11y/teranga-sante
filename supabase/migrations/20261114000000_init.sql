-- Teranga Santé — schéma initial
-- Principe : aucune donnée identifiante côté usager (pseudo + avatar, codes de réservation).
-- Usagers = sessions anonymes Supabase (auth.signInAnonymously). Professionnels = comptes email + mot de passe.

create extension if not exists pgcrypto;

-- ---------- Types ----------
create type public.lang as enum ('fr', 'wo', 'ff');                       -- français, wolof, pulaar
create type public.pro_role as enum ('nurse', 'manager', 'national_admin');
create type public.pro_status as enum ('online', 'busy', 'away');
create type public.booking_status as enum ('pending', 'confirmed', 'attended', 'no_show', 'cancelled');
create type public.service_kind as enum ('screening', 'consultation', 'prep', 'selftest_pickup', 'counselling');
create type public.report_status as enum ('new', 'assigned', 'answered', 'closed');

-- ---------- Référentiels ----------
create table public.regions (
  id   smallint primary key,
  name text not null unique
);

create table public.centres (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  region_id    smallint not null references public.regions(id),
  district     text,
  address      text,
  lat          double precision,
  lng          double precision,
  phone        text,
  is_free      boolean not null default true,
  is_confidential boolean not null default true,
  opening_hours jsonb not null default '{}'::jsonb,   -- ex : {"mon":["08:00","17:00"], ...}
  services     public.service_kind[] not null default '{screening}',
  created_at   timestamptz not null default now()
);

-- ---------- Profils ----------
-- Usager anonyme (M1) : lié à la session anonyme, jamais de nom ni numéro.
create table public.players (
  id         uuid primary key references auth.users(id) on delete cascade,
  pseudo     text not null check (char_length(pseudo) between 2 and 24),
  avatar     jsonb not null default '{}'::jsonb,
  lang       public.lang not null default 'fr',
  points     integer not null default 0,
  streak     integer not null default 0,
  last_played date,
  badges     text[] not null default '{}',
  age_band   text check (age_band in ('18-24', '25-29', '30-35')),
  region_id  smallint references public.regions(id),
  created_at timestamptz not null default now()
);

-- Professionnels (A1) : infirmières, responsables de centre, administrateurs nationaux.
create table public.pros (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         public.pro_role not null,
  centre_id    uuid references public.centres(id),
  display_name text not null,                         -- prénom affiché aux jeunes (ex : « Awa »)
  specialty    text,
  languages    public.lang[] not null default '{fr}',
  status       public.pro_status not null default 'away',
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- ---------- Helpers de rôle (security definer pour éviter la récursion RLS) ----------
create or replace function public.my_pro_role() returns public.pro_role
language sql stable security definer set search_path = public as
$$ select role from public.pros where id = auth.uid() $$;

create or replace function public.my_centre() returns uuid
language sql stable security definer set search_path = public as
$$ select centre_id from public.pros where id = auth.uid() $$;

create or replace function public.is_pro() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.pros where id = auth.uid()) $$;

-- ---------- Créneaux et réservations (M5, A3, A4) ----------
create table public.slots (
  id         uuid primary key default gen_random_uuid(),
  centre_id  uuid not null references public.centres(id) on delete cascade,
  nurse_id   uuid references public.pros(id) on delete set null,
  service    public.service_kind not null default 'screening',
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  capacity   smallint not null default 1 check (capacity > 0),
  blocked    boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index on public.slots (centre_id, starts_at);

create table public.bookings (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,                    -- ex : BAO-4821, présenté à l'accueil
  player_id  uuid not null references public.players(id) on delete cascade,
  slot_id    uuid not null references public.slots(id) on delete restrict,
  centre_id  uuid not null references public.centres(id),
  nurse_id   uuid references public.pros(id),
  service    public.service_kind not null,
  status     public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.bookings (centre_id, status);
create index on public.bookings (player_id);

-- Réservation en 1 appel (règle : 3 touches max). Génère un code BAO-XXXX unique.
create or replace function public.book_slot(p_slot_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as
$$
declare
  s public.slots;
  taken int;
  new_code text;
  result public.bookings;
begin
  if auth.uid() is null or not exists (select 1 from public.players where id = auth.uid()) then
    raise exception 'profil joueur requis';
  end if;

  select * into s from public.slots where id = p_slot_id for update;
  if not found or s.blocked or s.starts_at < now() then
    raise exception 'créneau indisponible';
  end if;

  select count(*) into taken from public.bookings
   where slot_id = s.id and status not in ('cancelled');
  if taken >= s.capacity then
    raise exception 'créneau complet';
  end if;

  loop
    new_code := 'BAO-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.bookings where code = new_code);
  end loop;

  insert into public.bookings (code, player_id, slot_id, centre_id, nurse_id, service)
  values (new_code, auth.uid(), s.id, s.centre_id, s.nurse_id, s.service)
  returning * into result;
  return result;
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns void language sql security definer set search_path = public as
$$ update public.bookings set status = 'cancelled', updated_at = now()
   where id = p_booking_id and player_id = auth.uid() and status in ('pending', 'confirmed') $$;

-- Créneaux disponibles d'un centre (vue côté usager, sans exposer les réservations).
create or replace function public.available_slots(p_centre_id uuid, p_from timestamptz default now(), p_days int default 7)
returns table (id uuid, starts_at timestamptz, ends_at timestamptz, service public.service_kind, nurse_id uuid, remaining int)
language sql stable security definer set search_path = public as
$$
  select s.id, s.starts_at, s.ends_at, s.service, s.nurse_id,
         s.capacity - count(b.id) filter (where b.status <> 'cancelled')
  from public.slots s
  left join public.bookings b on b.slot_id = s.id
  where s.centre_id = p_centre_id and not s.blocked
    and s.starts_at >= p_from and s.starts_at < p_from + make_interval(days => p_days)
  group by s.id
  having s.capacity - count(b.id) filter (where b.status <> 'cancelled') > 0
  order by s.starts_at
$$;

-- ---------- Messagerie (M7, A5) ----------
create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references public.players(id) on delete cascade,
  nurse_id   uuid references public.pros(id) on delete set null,
  urgent     boolean not null default false,
  closed     boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.conversations (nurse_id, last_message_at desc);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id),
  body            text,
  audio_path      text,                                -- vocal (Storage bucket « voice »)
  kind            text not null default 'text' check (kind in ('text', 'audio', 'booking_offer', 'referral')),
  payload         jsonb,
  read_at         timestamptz,
  created_at      timestamptz not null default now(),
  check (body is not null or audio_path is not null)
);
create index on public.messages (conversation_id, created_at);

create or replace function public.touch_conversation() returns trigger
language plpgsql security definer set search_path = public as
$$ begin update public.conversations set last_message_at = new.created_at where id = new.conversation_id; return new; end $$;
create trigger messages_touch after insert on public.messages for each row execute function public.touch_conversation();

-- ---------- Contenus (M3, M8, A6) ----------
create table public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  statement   jsonb not null,                          -- {"fr": "...", "wo": "...", "ff": "..."}
  answer      boolean not null,                        -- vrai / faux
  explanation jsonb not null,
  topic       text,
  published   boolean not null default false,
  author_id   uuid references public.pros(id),
  created_at  timestamptz not null default now()
);

create table public.chatbot_nodes (
  id        text primary key,                          -- ex : 'root', 'prep', 'autotest'
  message   jsonb not null,                            -- texte de Baobi par langue
  options   jsonb not null default '[]'::jsonb,        -- [{"label": {...}, "next": "prep"} | {"label": {...}, "route": "/centres"}]
  published boolean not null default true
);

-- ---------- Signalements (M12, A10) ----------
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid references public.players(id) on delete set null,
  category    text not null,
  body        text not null,
  region_id   smallint references public.regions(id),
  status      public.report_status not null default 'new',
  assigned_to uuid references public.pros(id),
  response    text,
  created_at  timestamptz not null default now()
);

-- ---------- Stocks (A8) ----------
create table public.stocks (
  centre_id  uuid not null references public.centres(id) on delete cascade,
  item       text not null check (item in ('selftest', 'condom', 'arv', 'prep')),
  level      int not null default 0,
  threshold  int not null default 10,
  updated_at timestamptz not null default now(),
  primary key (centre_id, item)
);

-- ---------- Journal d'activité (transverse) ----------
create table public.activity_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references auth.users(id),
  action     text not null,
  entity     text,
  entity_id  text,
  created_at timestamptz not null default now()
);

create or replace function public.log_booking_change() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if public.is_pro() then
    insert into public.activity_log (actor_id, action, entity, entity_id)
    values (auth.uid(), 'booking.' || new.status, 'bookings', new.id::text);
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger bookings_log before update on public.bookings for each row execute function public.log_booking_change();

-- ---------- Statistiques nationales anonymisées (A9) ----------
-- Seuil minimal d'effectif : en dessous de 5, la valeur est masquée (null) pour éviter la réidentification.
create or replace function public.national_stats(p_from date default (now() - interval '30 days')::date, p_to date default now()::date)
returns table (region_id smallint, region text, bookings bigint, attended bigint, no_show bigint)
language sql stable security definer set search_path = public as
$$
  select r.id, r.name,
         case when count(b.id) >= 5 then count(b.id) end,
         case when count(b.id) filter (where b.status = 'attended') >= 5 then count(b.id) filter (where b.status = 'attended') end,
         case when count(b.id) filter (where b.status = 'no_show') >= 5 then count(b.id) filter (where b.status = 'no_show') end
  from public.regions r
  left join public.centres c on c.region_id = r.id
  left join public.bookings b on b.centre_id = c.id and b.created_at::date between p_from and p_to
  where public.my_pro_role() in ('national_admin', 'manager')
  group by r.id, r.name
  order by r.id
$$;

-- ---------- RLS ----------
alter table public.regions        enable row level security;
alter table public.centres        enable row level security;
alter table public.players        enable row level security;
alter table public.pros           enable row level security;
alter table public.slots          enable row level security;
alter table public.bookings       enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.chatbot_nodes  enable row level security;
alter table public.reports        enable row level security;
alter table public.stocks         enable row level security;
alter table public.activity_log   enable row level security;

-- Référentiels publics (lecture seule)
create policy "regions lisibles"  on public.regions for select using (true);
create policy "centres lisibles"  on public.centres for select using (true);
create policy "centres gérés"     on public.centres for update using (public.my_pro_role() = 'manager' and id = public.my_centre());

-- Joueurs : chacun son profil ; les pros ne voient pas les profils joueurs.
create policy "joueur lit son profil"   on public.players for select using (id = auth.uid());
create policy "joueur crée son profil"  on public.players for insert with check (id = auth.uid());
create policy "joueur modifie son profil" on public.players for update using (id = auth.uid());

-- Pros : profil public limité (liste des infirmières M6), modification de son propre statut.
create policy "pros lisibles"        on public.pros for select using (true);
create policy "pro modifie son profil" on public.pros for update using (id = auth.uid());

-- Créneaux
create policy "créneaux lisibles"   on public.slots for select using (true);
create policy "créneaux gérés"      on public.slots for all
  using (public.my_pro_role() in ('nurse', 'manager') and centre_id = public.my_centre())
  with check (public.my_pro_role() in ('nurse', 'manager') and centre_id = public.my_centre());

-- Réservations : le joueur voit les siennes ; le centre voit les siennes (codes uniquement, pas d'identité).
create policy "joueur lit ses réservations" on public.bookings for select using (player_id = auth.uid());
create policy "centre lit ses réservations" on public.bookings for select using (public.is_pro() and centre_id = public.my_centre());
create policy "centre met à jour ses réservations" on public.bookings for update
  using (public.is_pro() and centre_id = public.my_centre());
-- (Création/annulation côté joueur via book_slot / cancel_booking.)

-- Conversations / messages
create policy "participants lisent la conversation" on public.conversations for select
  using (player_id = auth.uid() or nurse_id = auth.uid());
create policy "joueur ouvre une conversation" on public.conversations for insert with check (player_id = auth.uid());
create policy "participants mettent à jour" on public.conversations for update
  using (player_id = auth.uid() or nurse_id = auth.uid());

create policy "participants lisent les messages" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.player_id = auth.uid() or c.nurse_id = auth.uid())));
create policy "participants écrivent" on public.messages for insert with check (
  sender_id = auth.uid() and
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.player_id = auth.uid() or c.nurse_id = auth.uid())));
create policy "destinataire marque lu" on public.messages for update using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.player_id = auth.uid() or c.nurse_id = auth.uid())));

-- Contenus
create policy "quiz publié lisible" on public.quiz_questions for select using (published or public.is_pro());
create policy "quiz géré par pros"  on public.quiz_questions for all using (public.is_pro()) with check (public.is_pro());
create policy "chatbot lisible"     on public.chatbot_nodes for select using (published or public.is_pro());
create policy "chatbot géré"        on public.chatbot_nodes for all using (public.is_pro()) with check (public.is_pro());

-- Signalements
create policy "joueur signale"        on public.reports for insert with check (player_id = auth.uid());
create policy "admins lisent signalements" on public.reports for select using (public.my_pro_role() = 'national_admin');
create policy "admins traitent signalements" on public.reports for update using (public.my_pro_role() = 'national_admin');

-- Stocks
create policy "stocks lisibles par pros" on public.stocks for select using (public.is_pro());
create policy "stocks gérés par le centre" on public.stocks for all
  using (public.my_pro_role() = 'manager' and centre_id = public.my_centre())
  with check (public.my_pro_role() = 'manager' and centre_id = public.my_centre());

-- Journal
create policy "journal lisible admins" on public.activity_log for select using (public.my_pro_role() in ('manager', 'national_admin'));

-- Fonctions exposées
grant execute on function public.book_slot(uuid), public.cancel_booking(uuid),
  public.available_slots(uuid, timestamptz, int), public.national_stats(date, date) to authenticated;

-- ---------- Temps réel (boucle de démo : réservation mobile → agenda infirmière → carte nationale) ----------
alter publication supabase_realtime add table public.bookings, public.messages, public.conversations, public.slots;
