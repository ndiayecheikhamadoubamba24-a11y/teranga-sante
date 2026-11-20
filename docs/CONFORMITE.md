# Conformité légale — Teranga Santé

État au 20 novembre 2026. Ce document résume le chantier de mise en conformité, ce qui a été fait dans le code et
**ce qui reste à faire par l'équipe** avant une mise en ligne réelle. Il ne remplace pas l'avis d'un juriste.

## 1. Le cas

| Élément | Réponse |
|---|---|
| Projet | Site vitrine + application Android + espace professionnel web |
| Éditeur | Équipe de particuliers, **au Sénégal**, sans structure juridique, sans salarié, sans revenu |
| Activité | Gratuite : rien n'est vendu, aucun paiement |
| Données | Comptes anonymes des jeunes, comptes nominatifs des professionnels. **Données de santé (VIH)** |
| Hébergement | Supabase, région Europe (à confirmer précisément) ; site web : hébergeur à choisir |
| Services tiers | Groq (États-Unis), Google Gemini (États-Unis), tuiles OpenStreetMap |
| Agents IA | Site public ouvert aux agents IA ; espace professionnel exclu |

**Droit applicable : le droit sénégalais.**
- Loi n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel, contrôlée par la Commission de
  protection des données personnelles (**CDP**).
- Loi n° 2008-08 du 25 janvier 2008 sur les transactions électroniques.

Le RGPD ne s'applique pas directement : l'éditeur n'est pas établi dans l'UE et ne vise pas de personnes qui s'y trouvent.
Supabase, sous-traitant européen, y reste soumis pour sa propre part. Les obligations propres au droit français ne
s'appliquent pas : LCEN, RGAA, médiateur de la consommation, recommandations CNIL sur les cookies. Elles ont seulement
servi de référence de bonnes pratiques.

## 2. Inventaire des traitements trouvés dans le code

| Traitement | Où dans le code | Données | Base légale retenue |
|---|---|---|---|
| Profil de jeu | `apps/mobile/src/lib/store.tsx` → table `players` | pseudo, avatar, langue, points, série, badges, version des CGU | acceptation des CGU |
| Rendez-vous | `book_slot`, table `bookings` | code, centre, service, créneau, infirmière, statut (**santé**) | consentement exprès |
| Messagerie | `apps/mobile/src/lib/chat.ts`, tables `conversations` et `messages`, bucket `voice` | textes, vocaux, horodatage (**santé**) | consentement exprès |
| Assistant Baobi | `supabase/functions/ai-chat` → Groq | question et historique (masqués), audio à transcrire ; compteur `ai_usage` | consentement exprès |
| Questions du jeu | `supabase/functions/ai-quiz` → Gemini | thème choisi par une infirmière (**aucune donnée personnelle**) | — |
| Signalements | table `reports` (traités dans `apps/web/src/pages/Reports.tsx`) | catégorie, texte, région, réponse | consentement exprès |
| Comptes professionnels | `manage-users`, table `pros` | email, nom, rôle, centre, spécialité, langues, présentation, téléphone pro, statut, version des CGU | exécution des CGU |
| Journal d'activité | table `activity_log` | auteur, action, date | obligation de sécurité |
| Statistiques | `booking_events`, `chatbot_hits` | région, date, sujet (**anonymes**) | — |
| Données techniques | journaux Supabase et de l'hébergeur du site | IP, navigateur, dates | obligation de sécurité |
| Position | `apps/mobile/src/lib/geo.ts` | **reste sur le téléphone**, jamais envoyée | — |
| Suivi de traitement | `apps/mobile/src/app/traitement.tsx` | **reste sur le téléphone** | — |

## 3. Cookies et traceurs

**Aucun bandeau n'a été ajouté** : il n'existe aucun traceur non nécessaire. Ni analytics, ni pixel, ni vidéo, ni
bouton de partage. Les polices sont auto-hébergées (`@fontsource/poppins`).

| Élément (navigateur) | Rôle | Nécessaire ? |
|---|---|---|
| `sb-…-auth-token` | session de l'espace professionnel | oui |
| `ts.remember` | choix « Se souvenir de moi » | oui (préférence demandée par l'utilisateur) |
| `ts.centre` | centre affiché (super administrateur) | oui (préférence) |

Ces éléments sont listés dans la section « Cookies » de la politique de confidentialité (`/confidentialite#cookies`).

## 4. Services tiers

| Service | Où | Ce qui part | Traceur | Hors du Sénégal | Verdict |
|---|---|---|---|---|---|
| Supabase | partout | toutes les données du service | non | oui (UE) | nécessaire ; transfert à encadrer (CDP) |
| Groq | `ai-chat` | questions à Baobi (masquées), audio | non | oui (États-Unis) | nécessaire ; **transfert de données de santé à faire autoriser**, vérifier la conservation chez Groq |
| Google Gemini | `ai-quiz` | thème d'un quiz, aucune donnée personnelle | non | oui (États-Unis) | nécessaire ; utiliser une clé de l'offre payante si possible (l'offre gratuite peut servir à améliorer les produits Google) |
| Tuiles OpenStreetMap | carte de l'app | IP et zone affichée | non | oui (Royaume-Uni) | **à remplacer** : la politique d'usage d'OpenStreetMap interdit, sans autorisation, de distribuer une app qui utilise ses tuiles. Le fournisseur est maintenant configurable (`EXPO_PUBLIC_TILE_URL`) |
| unpkg.com (Leaflet) | carte de l'app | IP | non | oui | **supprimé** : Leaflet est maintenant embarqué dans l'app (`scripts/inline-leaflet.mjs`) |
| Google Maps (lien « Itinéraire ») | app, à la demande | destination | — | oui | acceptable : action volontaire, mentionnée dans la politique |

## 5. Durées de conservation (appliquées automatiquement)

Elles sont définies dans `apps/web/src/lib/legal.ts` (texte affiché) et dans `supabase/migrations/20261124000000_privacy.sql`
(fonction `purge_expired_data`, exécutée chaque jour par `supabase/functions/purge-data`). **Les deux doivent rester identiques.**

| Données | Durée |
|---|---|
| Conversations et vocaux | 12 mois après le dernier message |
| Rendez-vous | 24 mois après leur date |
| Profil de jeu / compte anonyme | jusqu'à l'effacement, ou 24 mois sans activité |
| Signalements | 24 mois après l'envoi, une fois clôturés |
| Compteur IA | 30 jours |
| Journal d'activité | 12 mois |

Ces durées sont **des propositions** : à valider par l'équipe et, si besoin, avec la CDP.

## 6. Accessibilité (WCAG 2.1 AA, bonne pratique)

Un audit automatique (axe-core, règles WCAG 2.1 A et AA) a été lancé sur 22 pages. Il a été corrigé comme suit :

- contraste : boutons orange et pastilles (`--orange-strong` #C94C00, 4,65:1) ; rouge de l'app #C62828 (5,6:1) ; bouton orange de l'app ;
- repères : `<main>` dans l'espace professionnel et sur la page de connexion, menu latéral nommé ;
- titres : un `<h1>` sur chaque page (tableau de bord, messagerie), pas de saut de niveau sur les listes d'articles ;
- messages d'erreur annoncés (`role="alert"`), icônes décoratives masquées, animations réduites si le système le demande.

Restent assumés : l'orange du **logo** (texte d'un logo, exempté par le critère 1.4.3) et la maquette décorative du
téléphone sur l'accueil (masquée aux technologies d'assistance).

**À faire manuellement :**
- tester l'app au lecteur d'écran (TalkBack) ;
- tester l'espace professionnel au clavier seul ;
- relire les textes alternatifs.

Il n'y a pas de vidéo, donc pas de sous-titres à prévoir.

## 7. Contenu : passages corrigés

| Avant | Problème | Après |
|---|---|---|
| « Aucune donnée de santé enregistrée » (pied de page du site, accueil, écran de discussion) | **faux** : rendez-vous et messages sont des données de santé | « Données de santé protégées… tu peux tout effacer » ; « Seule l'infirmière lit tes messages… » |
| « Disponible en français, wolof et pulaar » | les traductions n'existent pas encore (`i18n.ts`) | « En français (wolof et pulaar en cours de traduction) » ; mention ajoutée sur l'écran de langue de l'app |
| « Gratuite et légère (moins de 10 Mo) » | chiffre non prouvé (un APK Expo dépasse généralement 10 Mo) | « Gratuite, pensée pour les téléphones Android d'entrée de gamme » |
| « Anonyme · gratuit · sans jugement » | le service est pseudonyme (IP, voix, appels) | « Sans nom · gratuit · sans jugement » |
| Carte de l'écran discret : « Aucune donnée de santé enregistrée » | faux, et contraire au leurre (évoque la santé) | « Écran protégé » |

**À vérifier par l'équipe :**
- « centres gratuits et confidentiels » : vrai seulement si chaque centre partenaire l'est (champs `is_free` et `is_confidential`) ;
- « Réserver anonymement » : acceptable, aucune identité n'est demandée ;
- **droits sur les images** (voir le point 9) ;
- aucun avis client, aucun comparatif ni aucun logo de marque tierce n'a été trouvé.

## 8. Incohérences relevées

- Il n'existait **aucun moyen de contact** sur le site. Un email est maintenant prévu dans le pied de page, la page des
  mentions légales et la politique, à remplir dans `legal.ts`.
- Un commentaire du code mobile affirmait qu'aucune donnée de santé n'était envoyée : il a été corrigé.
- Toutes les informations d'identification viennent maintenant d'une source unique (`apps/web/src/lib/legal.ts`).

## 9. À FAIRE PAR UN HUMAIN

1. **Formalité auprès de la CDP (priorité n° 1).** Le traitement de données de santé exige en principe une **autorisation
   préalable** de la CDP, et pas une simple déclaration. Il faut déposer le dossier avant l'ouverture au public, puis
   reporter le numéro dans `legal.ts` (`cdpReference`).
2. **Transferts hors du Sénégal** (Supabase en UE, Groq et Google aux États-Unis, OpenStreetMap au Royaume-Uni) : les
   déclarer et les faire autoriser par la CDP. Signer les accords de traitement des données (DPA) de Supabase et de Groq.
   Vérifier chez Groq la durée de conservation des requêtes et l'absence de réutilisation pour l'entraînement.
3. **Remplir `apps/web/src/lib/legal.ts`** :
   - noms des membres de l'équipe et du responsable de la publication ;
   - adresse ;
   - email de contact **qui existe et qui est relevé** ;
   - email pour les données ;
   - région exacte de Supabase et adresse de Supabase, Inc. ;
   - hébergeur du site (nom, adresse, contact, pays).

   Puis renseigner `VITE_SITE_URL`, `EXPO_PUBLIC_SITE_URL` et `EXPO_PUBLIC_PRIVACY_EMAIL`.
4. **Fond de carte** : choisir un fournisseur de tuiles qui autorise l'usage dans une app distribuée, ou obtenir l'accord
   de la Fondation OpenStreetMap. Configurer `EXPO_PUBLIC_TILE_URL` et `EXPO_PUBLIC_TILE_ATTRIBUTION`, puis mettre à jour
   la politique de confidentialité si le pays change.
5. **Valider les durées de conservation** du point 5. Exécuter la migration `20261124000000_privacy.sql`, déployer
   `delete-account` et `purge-data`, créer le secret `CRON_SECRET` et la tâche quotidienne (voir le README).
6. **Mineurs** : l'app demande de confirmer avoir 18 ans ou plus, sans contrôle réel. Décider de la conduite à tenir pour
   un mineur qui cherche de l'aide (orientation vers un service adapté ?), éventuellement avec la CDP et les partenaires
   médicaux.
7. **Droits sur les images** : confirmer que l'équipe détient les droits sur le logo, la mascotte, les fonds d'écran
   (`apps/mobile/assets/backgrounds`, `apps/web/public/backgrounds`) et l'image de partage (`og-image.png`). Si une image a
   été générée par IA ou téléchargée, vérifier sa licence ou la remplacer.
8. **Statut juridique** : si le projet continue après le hackathon, créer une structure (association, GIE, société).
   Elle portera la responsabilité à la place des personnes physiques, et il faudra mettre à jour les mentions légales.
9. **Traductions** : faire traduire et relire le wolof et le pulaar par des locuteurs natifs, y compris les textes
   légaux (information claire dans la langue de l'utilisateur), puis retirer les mentions « en cours de traduction ».
10. **Relecture par un avocat ou un juriste sénégalais** de l'ensemble (CGU, politique, mentions) avant la mise en
    ligne : le service traite des données de santé particulièrement sensibles (VIH).
11. **Google Play** : renseigner l'URL de la politique de confidentialité et le formulaire « Sécurité des données »
    (données de santé, messages, audio, identifiants d'appareil), en cohérence avec la politique.

## 10. Points jugés NON applicables

| Point | Raison |
|---|---|
| Bandeau cookies | aucun traceur non nécessaire (voir le point 3) ; un bandeau serait une gêne inutile |
| CGV | rien n'est vendu, aucun paiement |
| Médiateur de la consommation | ni vente ni consommateur ; c'est en outre une obligation du droit français |
| Mentions LCEN « à la française » | l'éditeur est au Sénégal ; une page « Mentions légales » a quand même été créée pour l'identification du responsable du traitement (loi 2008-12) et pour Google Play |
| Déclaration d'accessibilité | obligation du droit français qui ne vise que les acteurs de plus de 10 salariés et 2 M€ de chiffre d'affaires vendant en ligne : le projet n'a ni salarié ni revenu et ne vend rien |
| Formulaire de contact, newsletter | inexistants |
| Mesures « vente aux professionnels » (pénalités, 40 €…) | aucune vente |
