import type { Component } from '../ecs/Component.js';

export type AnimalGroupType =
  | 'pack'    // Wolves, dogs — cooperative predators
  | 'herd'    // Deer, cattle — prey with numbers for safety
  | 'flock'   // Birds — aerial formations
  | 'pride'   // Lions — matriarchal group with dominant male
  | 'colony'; // Bees, ants — eusocial with caste system

export interface AnimalGroupMember {
  entityId: string;
  rank: number;     // 0 = alpha/dominant, higher = lower rank
  joinedAt: number; // World tick when joined
}

export interface AnimalGroupComponentData {
  groupType: AnimalGroupType;
  members: AnimalGroupMember[];
  alphaEntityId?: string;
  territory?: { x: number; y: number; radius: number };
  maxSize: number;
  cohesion: number; // 0-100: how strongly members stay together
}

export interface AnimalGroupComponent extends Component {
  readonly type: 'animal_group';
  groupType: AnimalGroupType;
  members: AnimalGroupMember[];
  alphaEntityId?: string;
  territory?: { x: number; y: number; radius: number };
  maxSize: number;
  cohesion: number;
}

export class AnimalGroupComponent implements Component {
  public readonly type = 'animal_group' as const;
  public readonly version = 1;

  public groupType: AnimalGroupType;
  public members: AnimalGroupMember[];
  public alphaEntityId?: string;
  public territory?: { x: number; y: number; radius: number };
  public maxSize: number;
  public cohesion: number;

  constructor(data: AnimalGroupComponentData) {
    if (data.groupType === undefined || data.groupType === null) {
      throw new Error('AnimalGroupComponent requires "groupType" field');
    }
    if (data.members === undefined || data.members === null) {
      throw new Error('AnimalGroupComponent requires "members" field');
    }
    if (data.maxSize === undefined || data.maxSize === null) {
      throw new Error('AnimalGroupComponent requires "maxSize" field');
    }
    if (data.cohesion === undefined || data.cohesion === null) {
      throw new Error('AnimalGroupComponent requires "cohesion" field');
    }

    this.groupType = data.groupType;
    this.members = data.members.map(m => ({ ...m }));
    this.alphaEntityId = data.alphaEntityId;
    this.territory = data.territory ? { ...data.territory } : undefined;
    this.maxSize = data.maxSize;
    this.cohesion = data.cohesion;
  }
}

/**
 * Add a member to a group. Returns false if the group is at max capacity or member already exists.
 */
export function addMemberToGroup(
  group: AnimalGroupComponent,
  entityId: string,
  tick: number
): boolean {
  if (group.members.length >= group.maxSize) return false;
  if (group.members.find(m => m.entityId === entityId)) return false;

  const rank = group.members.length; // New member gets lowest rank
  group.members.push({ entityId, rank, joinedAt: tick });
  return true;
}

/**
 * Remove a member from the group.
 * If the removed member was alpha, the next-highest-ranked member becomes alpha.
 */
export function removeMemberFromGroup(
  group: AnimalGroupComponent,
  entityId: string
): boolean {
  const idx = group.members.findIndex(m => m.entityId === entityId);
  if (idx === -1) return false;

  group.members.splice(idx, 1);

  // Re-rank remaining members
  group.members.sort((a, b) => a.rank - b.rank);
  group.members.forEach((m, i) => { m.rank = i; });

  // Update alpha if needed
  if (group.alphaEntityId === entityId) {
    group.alphaEntityId = group.members[0]?.entityId;
  }

  return true;
}

/**
 * Default max group size by type.
 */
export function defaultMaxSizeForGroupType(groupType: AnimalGroupType): number {
  const sizes: Record<AnimalGroupType, number> = {
    pack:   8,
    herd:   30,
    flock:  50,
    pride:  15,
    colony: 100,
  };
  return sizes[groupType];
}

/**
 * Default cohesion by group type.
 */
export function defaultCohesionForGroupType(groupType: AnimalGroupType): number {
  const cohesion: Record<AnimalGroupType, number> = {
    pack:   85,
    herd:   70,
    flock:  60,
    pride:  75,
    colony: 95,
  };
  return cohesion[groupType];
}
