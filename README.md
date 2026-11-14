# Teranga Santé — Hack4VIH

Application ludique et confidentielle (VIH, jeunes 18–35 ans, Sénégal).

| Dossier | Rôle | Stack |
|---|---|---|
| `apps/mobile` | App usager (M1–M14) | React Native · Expo SDK 58 · Expo Router |
| `apps/web` | Interface d'administration (A1–A10) | React · Vite · React Router |
| `supabase` | Base, RLS, fonctions, temps réel | Supabase (Postgres) |

## 1. Base Supabase (une seule fois)

1. Dashboard Supabase → **SQL Editor** → exécuter dans l'ordre :
   `supabase/migrations/20261114000000_init.sql`, `20261115000000_admin.sql`, `20261116000000_chat.sql`,
   `20261117000000_super_admin_role.sql` **(seul, puis cliquer Run)**, `20261117000100_super_admin.sql`, `20261118000000_temp_password.sql`,
   `20261119000000_site.sql`, puis `supabase/seed.sql` (données fictives).
2. **Authentication → Sign In / Providers** → activer **Allow anonymous sign-ins** (usagers sans compte, pseudo uniquement).
3. Comptes et données de démo (6 mois de rendez-vous, 14 régions, conversations, signalements) — en local, avec la clé secrète :
   ```bash
   cd apps/web && npm install
   SUPABASE_SERVICE_ROLE_KEY=... DEMO_PASSWORD='un-mot-de-passe-solide' node scripts/seed-demo.mjs
   ```
   Comptes créés : `superadmin@teranga.demo`, `infirmiere@teranga.demo`, `responsable@teranga.demo`, `cnls@teranga.demo` (+ 2 infirmières).
4. **Déployer la fonction serveur `manage-users`** (obligatoire pour créer des comptes depuis l'admin) :
   - *Sans installation* : Dashboard Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor** →
     nommer la fonction exactement `manage-users` → coller le contenu de `supabase/functions/manage-users/index.ts` → **Deploy**.
     (Laisser « Verify JWT » activé. Les clés serveur sont fournies automatiquement par Supabase.)
   - *Avec la CLI* : `supabase login`, puis depuis la racine du projet
     `supabase functions deploy manage-users --project-ref aqmcghhktfsntdcrfxtd`
   - Après chaque modification du fichier, redéployer.

### Créer le premier super admin (sans le script de démo)

1. Supabase → **Authentication → Users → Add user** (email + mot de passe, « Auto confirm »).
2. SQL Editor (remplacer l'email) :
   ```sql
   insert into public.pros (id, role, display_name)
   select id, 'super_admin', 'Super Admin' from auth.users where email = 'ton.email@exemple.sn'
   on conflict (id) do update set role = 'super_admin', centre_id = null;
   ```
3. Se connecter sur l'admin web (email + mot de passe), puis créer les centres et les comptes des autres utilisateurs.

**Création des comptes** — le super admin (ou le responsable, pour son centre) saisit l'email et un **mot de passe provisoire**
(bouton « Générer »), puis transmet les identifiants. À la première connexion, la personne doit choisir son **mot de passe
personnel** avant d'accéder à quoi que ce soit : tant qu'il n'est pas changé, la base lui refuse tout droit professionnel
(vérification côté serveur que le mot de passe a réellement changé). Mot de passe oublié → icône clé dans « Utilisateurs ».

**Super admin** — gère toute la plateforme : utilisateurs (`/admin/utilisateurs`), centres (`/admin/centres`),
journal d'activité (`/admin/journal`), vue nationale, signalements, contenus, et agenda / rendez-vous / stocks / tableau
de **n'importe quel centre** (sélecteur dans l'en-tête). Par confidentialité, il **ne voit pas** les conversations
des jeunes ni leurs profils. Garde-fous : impossible de se retirer son propre rôle ou de supprimer le dernier super admin.

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
| – | Discussion avec une infirmière (écrit, vocal, réservation intégrée, Urgence) + choix de l'infirmière | `/discussion` | M7 (+ M6 simplifié) |
| 8 | Rappel de traitement discret | `/traitement` | M10 |
| 9 | Profil et progression | `/moi` | M14 |
| 10 | Mode discret (faux écran météo, secouer) | `/discret` | M13 |

- Hors ligne : quiz, chatbot et centres ont un contenu de secours (`src/data/content.ts`) si Supabase ne répond pas en 4 s.
- Le suivi de traitement reste **uniquement sur le téléphone** (AsyncStorage).
- Discussion (M7) : messages vocaux AAC mono 32 kb/s (≤ 60 s) dans le bucket privé `voice`, lisibles uniquement par les participants ; bouton Urgence = conversation prioritaire chez l'infirmière + appel SAMU (1515) ; après un échange, l'app propose de réserver, et après une réservation, d'écrire à l'infirmière.
- Mode discret : secouer le téléphone → faux écran météo ; appui long sur la température pour revenir.
- Wolof et pulaar : structure prête dans `src/lib/i18n.ts`, traductions à fournir par des locuteurs natifs.

## 3. Web — site vitrine + espace professionnel

Le même projet `apps/web` contient :
- **le site public** : `/` (accueil), `/conseils`, `/publications`, `/article/:id`, section « Installer l'application » ;
- **l'espace professionnel** : bouton « Se connecter » → `/connexion` (super admin, CNLS, responsable, infirmière).

Les conseils et publications sont les fiches « Infos santé » **publiées** dans l'admin (Contenus → rubrique *Conseil santé* ou *Publication*).
Quand l'app mobile est en ligne, renseigner dans `apps/web/.env` :
```
VITE_ANDROID_URL=https://play.google.com/store/apps/details?id=sn.teranga.sante   # ou lien direct .apk
VITE_IOS_URL=
```
→ le site affiche alors le bouton de téléchargement, un QR code et les étapes d'installation (sinon « Bientôt disponible »).
Hébergement : `npm run build` puis déployer `dist/` (Netlify / Vercel : la redirection des routes est déjà configurée).



```bash
cd apps/web
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

### Écrans d'administration intégrés (maquette 2)

| # | Écran | Route | Rôle |
|---|---|---|---|
| A1 | Connexion (email + mot de passe, « Se souvenir de moi ») | `/connexion` | tous |
| A2 | Tableau de bord infirmière (Rdv du jour, non lus, urgences, présence, statut) | `/tableau-de-bord` | infirmière |
| A3 | Agenda semaine/jour : créer, bloquer, glisser-déposer, surbrillance temps réel | `/agenda` | infirmière, responsable |
| A4 | Rendez-vous : recherche par code, filtres, confirmer/reporter/venu/absent, export CSV | `/rendez-vous` | infirmière, responsable |
| A5 | Messagerie : priorités, réponses rapides, proposer un RDV, orienter, clôturer | `/messagerie` | infirmière |
| A6 | Bibliothèque : fiches, Vrai/Faux, chatbot, FR/WO/FF, aperçu mobile, brouillon/publié | `/contenus` | infirmière, CNLS |
| A7 | Tableau de bord centre : KPI, fréquentation, charge par infirmière, alertes | `/centre` | responsable |
| A8 | Stocks (jauges, seuils, alerte auto) et équipe (statuts, invitation) | `/stocks` | responsable |
| A9 | National : carte des 14 régions, filtres période/région/âge, seuil d'effectif 5, export Excel/PDF | `/national` | CNLS |
| A10 | Signalements et alertes : carte, assigner, répondre, clôturer | `/signalements` | CNLS |

- Toutes les actions sensibles sont inscrites dans `activity_log` (« Accès sécurisé et traçable »).
- Boucle de démo : réservation mobile → toast + surbrillance dans l'agenda (A3) → région qui s'illumine sur la carte nationale (A9).
- Contours des régions : `apps/web/src/data/senegal.ts`, extraits de `@react-map/senegal` (licence MIT).

## Modèle de données (résumé)

- Admin : `articles`, `alerts` (ruptures, alerte auto sous le seuil), `booking_events` (région + date seulement, pour la carte en direct), `chatbot_hits` (sujet seulement, jamais le texte).
- RPC admin : `centre_stats()`, `national_overview()`, `reschedule_booking()`, `conversation_has_booking()`.
- `players` : usager anonyme (pseudo, avatar, langue, points) — **aucun nom ni numéro**.
- `pros` : infirmières / responsables / admin national (rôle, centre, statut en ligne).
- `centres`, `regions`, `slots`, `bookings` (code `BAO-XXXX`), `conversations`, `messages`,
  `quiz_questions`, `chatbot_nodes`, `reports`, `stocks`, `activity_log`.
- RPC : `book_slot(slot_id)`, `cancel_booking(id)`, `available_slots(centre_id)`, `national_stats()` (seuil d'effectif ≥ 5).
- Temps réel activé sur `bookings`, `messages`, `conversations`, `slots` (boucle de démo mobile → agenda → carte nationale).

La clé `sb_publishable_…` est publique par conception ; la sécurité repose sur les règles RLS. Ne jamais committer la clé `service_role` / `sb_secret_…`.
