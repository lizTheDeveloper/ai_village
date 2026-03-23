/** Vite import.meta.env type declarations — uses export {} to force module mode + declare global */
export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_PLANET_SERVER_URL?: string;
    readonly [key: string]: string | undefined;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
