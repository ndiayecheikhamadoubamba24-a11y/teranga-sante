# Teranga Santé — Hack4VIH

Application ludique et confidentielle (VIH, jeunes 18–35 ans, Sénégal).

| Dossier | Rôle | Stack |
|---|---|---|
| `apps/mobile` | App usager (M1–M14) | React Native · Expo SDK 58 · Expo Router |
| `apps/web` | Interface d'administration (A1–A10) | React · Vite · React Router |
| `supabase` | Base, RLS, fonctions, temps réel | Supabase (Postgres) |

## 1. Base Supabase (une seule fois)

1. Dashboard Supabase → **SQL Editor** → coller et exécuter `supabase/migrations/20261114000000_init.sql`, puis `supabase/seed.sql` (données fictives).
2. **Authentication → Sign In / Providers** → activer **Allow anonymous sign-ins** (usagers sans compte, pseudo uniquement).
3. **Authentication → Users → Add user** pour chaque infirmière / admin, puis insérer sa ligne dans `public.pros` (exemple en bas de `seed.sql`).

## 2. Mobile

```bash
cd apps/mobile
cp .env.example .env   # URL + clé publishable Supabase
npm install
npx expo start         # scanner le QR avec Expo Go
```

### Écrans mobiles intégrés (maquette 1)

| # | Écran | Route | Module |
|---|---|---|---|
| 1 | Accueil / langue | `/` | M1 |
| 2 | Profil sans compte | `/profil` | M1 |
| 3 | Écran principal (3 parcours) | `/accueil` | M2 |
| 4 | Jeu Vrai ou Faux (boutons + swipe) | `/jeu` | M3 |
| 5 | Résultat (points, badge, série, partage) | `/resultat` | M3/M14 |
| 6 | Carte des centres (Leaflet/OSM) | `/carte` | M4 |
| – | Réservation anonyme (code BAO-XXXX) | `/reserver/[id]` | M5 |
| 7 | Chatbot Question sans honte | `/chatbot` | M8 |
| 8 | Rappel de traitement discret | `/traitement` | M10 |
| 9 | Profil et progression | `/moi` | M14 |
| 10 | Mode discret (faux écran météo, secouer) | `/discret` | M13 |

- Hors ligne : quiz, chatbot et centres ont un contenu de secours (`src/data/content.ts`) si Supabase ne répond pas en 4 s.
- Le suivi de traitement reste **uniquement sur le téléphone** (AsyncStorage).
- Mode discret : secouer le téléphone → faux écran météo ; appui long sur la température pour revenir.
- Wolof et pulaar : structure prête dans `src/lib/i18n.ts`, traductions à fournir par des locuteurs natifs.

## 3. Web (admin)

```bash
cd apps/web
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

## Modèle de données (résumé)

- `players` : usager anonyme (pseudo, avatar, langue, points) — **aucun nom ni numéro**.
- `pros` : infirmières / responsables / admin national (rôle, centre, statut en ligne).
- `centres`, `regions`, `slots`, `bookings` (code `BAO-XXXX`), `conversations`, `messages`,
  `quiz_questions`, `chatbot_nodes`, `reports`, `stocks`, `activity_log`.
- RPC : `book_slot(slot_id)`, `cancel_booking(id)`, `available_slots(centre_id)`, `national_stats()` (seuil d'effectif ≥ 5).
- Temps réel activé sur `bookings`, `messages`, `conversations`, `slots` (boucle de démo mobile → agenda → carte nationale).

La clé `sb_publishable_…` est publique par conception ; la sécurité repose sur les règles RLS. Ne jamais committer la clé `service_role` / `sb_secret_…`.
