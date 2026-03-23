/** Vite import.meta.env type declarations — uses export {} to force module mode + declare global */
export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_METRICS_WS_URL?: string;
    readonly VITE_API_URL?: string;
    readonly VITE_LLM_PROXY_URL?: string;
    readonly VITE_PLANET_SERVER_URL?: string;
    readonly [key: string]: string | undefined;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
