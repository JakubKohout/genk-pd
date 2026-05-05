/// <reference types="vite/client" />

interface Window {
  // Set by Playwright's seed() fixture; disables analytics during E2E.
  __GENK_E2E__?: boolean;
}

declare module '*.css';
declare module '*.svg' {
  const src: string;
  export default src;
}
