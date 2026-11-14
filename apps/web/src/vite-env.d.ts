/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_KEY: string;
  /** "true" pour rendre la validation en 2 étapes facultative (démo hackathon uniquement). */
  readonly VITE_MFA_OPTIONAL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
