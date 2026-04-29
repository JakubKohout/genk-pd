/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOATCOUNTER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css';
declare module '*.svg' {
  const src: string;
  export default src;
}
