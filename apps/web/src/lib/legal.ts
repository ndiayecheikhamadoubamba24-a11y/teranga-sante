// Source UNIQUE des informations légales affichées sur le site (mentions légales, politique de
// confidentialité, CGU, pied de page). Modifier ici = cohérent partout.
// Tout ce qui est entre crochets doit être complété par l'équipe avant la mise en ligne.

export const TODO = (s: string) => `[À COMPLÉTER : ${s}]`;

export const LEGAL = {
  /** Date de dernière mise à jour des documents (à changer à chaque modification). */
  updatedAt: '20 novembre 2026',
  /** Version des CGU : l'app et l'espace pro redemandent l'acceptation si elle change. */
  termsVersion: '2026-11-20',

  // ---- Éditeur (projet porté par une équipe de particuliers, sans structure juridique) ----
  project: 'Teranga Santé',
  publishers: TODO('prénom et nom de chaque membre de l’équipe qui édite le projet'),
  publicationDirector: TODO('prénom et nom du ou de la responsable de la publication'),
  address: TODO('adresse postale de contact au Sénégal (ville, quartier)'),
  email: TODO('adresse email de contact qui existe et qui est relevée, ex. contact@…'),
  privacyEmail: TODO('adresse email pour les demandes sur les données personnelles (peut être la même)'),
  phone: null as string | null, // facultatif : laisser null si aucun numéro n'est publié

  // ---- Hébergement ----
  dataHost: {
    name: 'Supabase, Inc.',
    address: TODO('adresse postale de Supabase, Inc. à recopier depuis supabase.com/privacy ou les conditions du contrat'),
    contact: 'https://supabase.com',
    location: TODO('région exacte du projet Supabase, ex. « Union européenne – Francfort (eu-central-1) »'),
  },
  siteHost: {
    name: TODO('hébergeur du site web, ex. Vercel Inc.'),
    address: TODO('adresse de l’hébergeur du site'),
    contact: TODO('téléphone ou site de contact de l’hébergeur du site'),
  },

  // ---- Autorité de contrôle ----
  authority: {
    name: 'Commission de protection des données personnelles (CDP)',
    url: 'https://www.cdp.sn',
  },
  cdpReference: TODO('numéro de récépissé ou d’autorisation délivré par la CDP'),
} as const;

/** Durées de conservation : appliquées par la fonction de purge (supabase/functions/purge-data). */
export const RETENTION = [
  { what: 'Conversations avec les infirmières (messages écrits et vocaux)', how: '12 mois après le dernier message, puis suppression automatique' },
  { what: 'Rendez-vous (code, centre, service, créneau, statut)', how: '24 mois après la date du rendez-vous, puis suppression automatique' },
  { what: 'Profil de jeu (pseudo, avatar, points, badges, langue)', how: 'jusqu’à l’effacement par l’utilisateur, ou 24 mois sans utilisation de l’application' },
  { what: 'Signalements', how: '24 mois après leur envoi, une fois clôturés' },
  { what: 'Compteur d’usage de l’assistant IA', how: '30 jours' },
  { what: 'Journal d’activité des professionnels', how: '12 mois' },
  { what: 'Compte professionnel', how: 'pendant la durée des fonctions ; supprimé à la demande du centre ou de l’administrateur' },
  { what: 'Statistiques anonymes (région, date, sujets abordés)', how: 'sans limite : elles ne permettent d’identifier personne' },
] as const;
