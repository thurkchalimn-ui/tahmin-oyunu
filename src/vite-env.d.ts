/// <reference types="vite/client" />

// import.meta.env üzerinden erişilen özel ortam değişkenlerinin tipleri
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_ADMIN_EMAILS: string;
  readonly VITE_ADMOB_APP_ID: string;
  readonly VITE_ADMOB_BANNER_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
