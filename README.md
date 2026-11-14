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
   `20261119000000_site.sql`, `20261120000000_team.sql`, `20261121000000_nurses.sql`, `20261122000000_ai.sql`, puis `supabase/seed.sql` (données fictives).
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

### Intelligence artificielle (chatbot et questions du jeu)

Les clés API ne vont **jamais** dans le code des apps : elles sont stockées dans les **secrets Supabase** et utilisées
uniquement par des fonctions serveur.

1. Supabase → **Edge Functions** → **Secrets** (ou *Project Settings → Edge Functions*) → ajouter :
   - `GROQ_API_KEY` = clé Groq (`gsk_…`) — chatbot « Question sans honte »
   - `GEMINI_API_KEY` = clé Google Gemini — génération des questions Vrai ou Faux
   - facultatif : `GROQ_MODEL` (défaut `llama-3.3-70b-versatile`), `GEMINI_MODEL` (défaut `gemini-2.5-flash`)
2. Déployer les fonctions `ai-chat` et `ai-quiz` (Dashboard → Edge Functions → *Deploy a new function* → *Via Editor*,
   en collant `supabase/functions/ai-chat/index.ts` puis `ai-quiz/index.ts`), ou en CLI :
   `supabase functions deploy ai-chat` et `supabase functions deploy ai-quiz`.

- **Chatbot** : vraie conversation libre avec Baobi, **à l'écrit ou en vocal** (le vocal est transcrit par Whisper sur
  Groq, même clé ; secret facultatif `GROQ_STT_MODEL`, défaut `whisper-large-v3-turbo`). Pas de questions à choisir :
  la personne s'exprime avec ses mots, Baobi garde le fil de l'échange et peut proposer une action (centres, infirmière,
  réservation, jeu, SAMU). Règles strictes : pas de diagnostic, urgence TPE < 72 h et SAMU 1515, jamais de nom ni de
  numéro (masqués avant envoi). Sans IA (hors ligne / non configurée) : réponse de secours par mots-clés.
  40 messages IA par jour et par utilisateur. Ni le texte ni l'audio ne sont conservés (seul le sujet, pour les stats).
- **Jeu** : dans l'admin, *Contenus → Jeux → Générer avec l'IA*. Les questions arrivent en **brouillon** avec la mention
  « Générée par l'IA » ; une infirmière les relit puis les publie pour qu'elles apparaissent dans le jeu.

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

**Équipe d'un centre** (`/equipe`) — le **responsable** crée les comptes infirmières de son centre (mot de passe
provisoire), les modifie, réinitialise leur mot de passe et les désactive ; il voit pour chaque membre le travail réalisé
(rendez-vous attribués / venus / absents, actions sur les rendez-vous, conversations, messages, délai moyen de réponse,
créneaux créés, dernière activité) et un fil d'activité de l'équipe. Le **super admin** voit la même page pour n'importe quel
centre (sélecteur en en-tête, ou depuis « Centres »). Statistiques agrégées uniquement : jamais de contenu de message.
Après mise à jour, **redéployer la fonction `manage-users`**.

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

### Identité visuelle

- Logo officiel : `apps/web/public/logo.png`, `apps/mobile/assets/logo.png` ; emblème seul : `logo-mark.png`.
- **Baobi** (la mascotte) = le baobab du logo : composant `Baobi` (web et mobile), avec un petit rebond quand il se réjouit.
- Couleurs du logo : vert `#076236`, orange `#E85A05`, jaune `#F8B400`, fond crème `#FFF8EC`.
- Arrière-plans de l'app mobile : `apps/mobile/assets/backgrounds/` (Motifs par défaut, Savane, Baobab, Wax), posés derrière
  tous les écrans par `AppBackground` ; chaque jeune choisit le sien dans « Moi → Fond d'écran ».

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
| – | Infirmières : liste (filtres en ligne / langue / centre) et profil (Poser une question, Réserver, Appeler le centre) | `/infirmieres`, `/infirmieres/[id]` | M6 |
| – | Discussion avec une infirmière (écrit, vocal, réservation intégrée, Urgence) | `/discussion` | M7 |
| 8 | Rappel de traitement discret | `/traitement` | M10 |
| 9 | Profil et progression | `/moi` | M14 |
| 10 | Mode discret (faux écran météo, secouer) | `/discret` | M13 |

- Hors ligne : quiz, chatbot et centres ont un contenu de secours (`src/data/content.ts`) si Supabase ne répond pas en 4 s.
- Le suivi de traitement reste **uniquement sur le téléphone** (AsyncStorage).
- Discussion (M7) : messages vocaux AAC mono 32 kb/s (≤ 60 s) dans le bucket privé `voice`, lisibles uniquement par les participants ; bouton Urgence = conversation prioritaire chez l'infirmière + appel SAMU (1515) ; après un échange, l'app propose de réserver, et après une réservation, d'écrire à l'infirmière.
- Mode discret : secouer le téléphone → faux écran météo ; garder le doigt **3 secondes** sur la température pour revenir.
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
