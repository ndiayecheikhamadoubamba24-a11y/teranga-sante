import { supabase, type I18n } from './supabase';

// Liens de téléchargement : à renseigner dans apps/web/.env quand l'application est en ligne.
//   VITE_ANDROID_URL : lien Play Store ou fichier .apk (ex. build EAS)
//   VITE_IOS_URL     : lien App Store
export const ANDROID_URL = (import.meta.env.VITE_ANDROID_URL ?? '').trim();
export const IOS_URL = (import.meta.env.VITE_IOS_URL ?? '').trim();
export const IS_APK = /\.apk(\?|$)/i.test(ANDROID_URL);
export const APP_ONLINE = !!(ANDROID_URL || IOS_URL);

export type Category = 'conseil' | 'actualite';
export type SiteArticle = { id: string; title: I18n; body: I18n; illustration: string | null; category: Category; published_at: string | null };

export async function loadArticles(category?: Category, limit = 50): Promise<SiteArticle[]> {
  let q = supabase
    .from('articles')
    .select('id, title, body, illustration, category, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (category) q = q.eq('category', category);
  const { data } = await q;
  return (data as SiteArticle[]) ?? [];
}

export async function loadArticle(id: string) {
  const { data } = await supabase.from('articles').select('id, title, body, illustration, category, published_at').eq('id', id).eq('published', true).maybeSingle();
  return (data as SiteArticle | null) ?? null;
}

export const excerpt = (body: I18n, n = 140) => {
  const t = (body.fr ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n).replace(/\s\S*$/, '')}…` : t;
};

export const fmtLongDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
