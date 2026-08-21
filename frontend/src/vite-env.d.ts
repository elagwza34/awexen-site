/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** دعم مؤقت لمشروعات Supabase التي ما زالت تستخدم anon key القديم. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_DJANGO_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
