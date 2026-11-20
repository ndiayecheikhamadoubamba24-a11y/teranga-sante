import { Linking } from 'react-native';

// Informations légales de l'application. Le texte complet est publié sur le site web
// (apps/web/src/pages/site/Legal.tsx) : garder TERMS_VERSION identique à LEGAL.termsVersion
// (apps/web/src/lib/legal.ts). Changer la version redemande l'acceptation des conditions.
export const TERMS_VERSION = '2026-11-20';

/** Adresse publique du site (EXPO_PUBLIC_SITE_URL), ex. https://teranga-sante.sn. Vide tant qu'il n'est pas en ligne. */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? '').trim().replace(/\/$/, '');
/** Email pour les demandes sur les données (EXPO_PUBLIC_PRIVACY_EMAIL). Non affiché tant qu'il n'est pas renseigné. */
export const PRIVACY_EMAIL = (process.env.EXPO_PUBLIC_PRIVACY_EMAIL ?? '').trim();

export const LEGAL_PAGES = {
  confidentialite: 'Politique de confidentialité',
  cgu: 'Conditions d’utilisation',
  'mentions-legales': 'Mentions légales',
} as const;

export function openLegal(page: keyof typeof LEGAL_PAGES) {
  if (SITE_URL) Linking.openURL(`${SITE_URL}/${page}`).catch(() => {});
}
