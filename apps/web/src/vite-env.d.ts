/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_KEY?: string;
  /** Lien de téléchargement Android (Play Store ou .apk) affiché sur le site vitrine. */
  readonly VITE_ANDROID_URL?: string;
  /** Lien App Store. */
  readonly VITE_IOS_URL?: string;
  /** Adresse publique du site (URL canoniques, sitemap, llms.txt), ex. https://teranga-sante.sn */
  readonly VITE_SITE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
