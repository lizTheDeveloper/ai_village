export interface LoreDiscoveryEmitterOptions {
  game: string;
  apiBase?: string;
  getAuthToken?: () => string | null;
  getUserId?: () => string | null;
}

export class LoreDiscoveryEmitter {
  constructor(options: LoreDiscoveryEmitterOptions);
  discover(category: string, subject: string, aspect: string, detail?: string | null): boolean;
  hasDiscovered(category: string, subject: string, aspect: string, detail?: string | null): boolean;
  flush(): Promise<void>;
  destroy(): void;
}
