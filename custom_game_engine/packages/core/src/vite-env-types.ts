/** Vite import.meta.env type declarations — extends root env.d.ts with package-specific vars */
interface ImportMetaEnv {
  readonly VITE_PLANET_SERVER_URL?: string;
}
