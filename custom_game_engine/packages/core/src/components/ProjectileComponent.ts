export interface ProjectileComponent {
  sourceId: string;
  expired: boolean;
  hit: boolean;
  velocity: { x: number; y: number };
  damage: number;
}
