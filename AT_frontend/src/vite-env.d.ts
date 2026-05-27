/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_BYBIT_TESTNET?: string;
  readonly VITE_BYBIT_API_KEY?: string;
  readonly VITE_BYBIT_API_SECRET?: string;
  readonly VITE_GEOFENCE_DENY?: string;
  readonly VITE_GEOFENCE_ALLOW_ONLY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
