import { describe, it, expect, beforeEach } from 'vitest';
import {
  AnimalGroupComponent,
  addMemberToGroup,
  removeMemberFromGroup,
  defaultMaxSizeForGroupType,
  defaultCohesionForGroupType,
} from '../components/AnimalGroupComponent.js';
import { AnimalGroupSystem } from '../systems/AnimalGroupSystem.js';
import { AnimalComponent } from '../components/AnimalComponent.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAnimalComponent(id: string, x = 0, y = 0, groupId?: string): AnimalComponent {
  return new AnimalComponent({
    id,
    speciesId: 'wolf',
    name: `Wolf-${id}`,
    position: { x, y },
    age: 100,
    lifeStage: 'adult',
    health: 100,
    size: 1,
    state: 'idle',
    hunger: 20,
    thirst: 10,
    energy: 80,
    stress: 10,
    mood: 60,
    wild: true,
    bondLevel: 0,
    trustLevel: 0,
    groupId,
  });
}

function makePackGroup(maxSize = 8): AnimalGroupComponent {
  return new AnimalGroupComponent({
    groupType: 'pack',
    members: [],
    maxSize,
    cohesion: 85,
  });
}

// ---------------------------------------------------------------------------
// AnimalGroupComponent constructor
// ---------------------------------------------------------------------------

describe('AnimalGroupComponent constructor', () => {
  it('creates a valid component with required fields', () => {
    const group = new AnimalGroupComponent({
      groupType: 'pack',
      members: [],
      maxSize: 8,
      cohesion: 85,
    });
    expect(group.type).toBe('animal_group');
    expect(group.groupType).toBe('pack');
    expect(group.members).toHaveLength(0);
    expect(group.maxSize).toBe(8);
    expect(group.cohesion).toBe(85);
    expect(group.alphaEntityId).toBeUndefined();
    expect(group.territory).toBeUndefined();
  });

  it('copies members to avoid reference sharing', () => {
    const originalMembers = [{ entityId: 'e1', rank: 0, joinedAt: 10 }];
    const group = new AnimalGroupComponent({
      groupType: 'herd',
      members: originalMembers,
      maxSize: 30,
      cohesion: 70,
    });
    originalMembers[0].rank = 99;
    expect(group.members[0].rank).toBe(0); // Not mutated
  });

  it('throws when groupType is missing', () => {
    expect(() =>
      new AnimalGroupComponent({
        groupType: undefined as unknown as 'pack',
        members: [],
        maxSize: 8,
        cohesion: 85,
      })
    ).toThrow('AnimalGroupComponent requires "groupType" field');
  });

  it('throws when members is missing', () => {
    expect(() =>
      new AnimalGroupComponent({
        groupType: 'pack',
        members: undefined as unknown as [],
        maxSize: 8,
        cohesion: 85,
      })
    ).toThrow('AnimalGroupComponent requires "members" field');
  });

  it('throws when maxSize is missing', () => {
    expect(() =>
      new AnimalGroupComponent({
        groupType: 'pack',
        members: [],
        maxSize: undefined as unknown as number,
        cohesion: 85,
      })
    ).toThrow('AnimalGroupComponent requires "maxSize" field');
  });

  it('throws when cohesion is missing', () => {
    expect(() =>
      new AnimalGroupComponent({
        groupType: 'pack',
        members: [],
        maxSize: 8,
        cohesion: undefined as unknown as number,
      })
    ).toThrow('AnimalGroupComponent requires "cohesion" field');
  });
});

// ---------------------------------------------------------------------------
// addMemberToGroup
// ---------------------------------------------------------------------------

describe('addMemberToGroup', () => {
  it('adds a new member and returns true', () => {
    const group = makePackGroup();
    const result = addMemberToGroup(group, 'wolf-1', 100);
    expect(result).toBe(true);
    expect(group.members).toHaveLength(1);
    expect(group.members[0].entityId).toBe('wolf-1');
    expect(group.members[0].rank).toBe(0);
    expect(group.members[0].joinedAt).toBe(100);
  });

  it('assigns sequential ranks to multiple members', () => {
    const group = makePackGroup();
    addMemberToGroup(group, 'wolf-1', 100);
    addMemberToGroup(group, 'wolf-2', 110);
    addMemberToGroup(group, 'wolf-3', 120);
    expect(group.members[1].rank).toBe(1);
    expect(group.members[2].rank).toBe(2);
  });

  it('returns false when group is at max capacity', () => {
    const group = makePackGroup(2);
    addMemberToGroup(group, 'wolf-1', 1);
    addMemberToGroup(group, 'wolf-2', 2);
    const result = addMemberToGroup(group, 'wolf-3', 3);
    expect(result).toBe(false);
    expect(group.members).toHaveLength(2);
  });

  it('deduplicates — returns false if entity already a member', () => {
    const group = makePackGroup();
    addMemberToGroup(group, 'wolf-1', 100);
    const result = addMemberToGroup(group, 'wolf-1', 200);
    expect(result).toBe(false);
    expect(group.members).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// removeMemberFromGroup
// ---------------------------------------------------------------------------

describe('removeMemberFromGroup', () => {
  it('removes an existing member and returns true', () => {
    const group = makePackGroup();
    addMemberToGroup(group, 'wolf-1', 1);
    addMemberToGroup(group, 'wolf-2', 2);
    const result = removeMemberFromGroup(group, 'wolf-1');
    expect(result).toBe(true);
    expect(group.members).toHaveLength(1);
    expect(group.members[0].entityId).toBe('wolf-2');
  });

  it('returns false when member not in group', () => {
    const group = makePackGroup();
    const result = removeMemberFromGroup(group, 'ghost');
    expect(result).toBe(false);
  });

  it('re-ranks remaining members after removal', () => {
    const group = makePackGroup();
    addMemberToGroup(group, 'wolf-1', 1);
    addMemberToGroup(group, 'wolf-2', 2);
    addMemberToGroup(group, 'wolf-3', 3);
    removeMemberFromGroup(group, 'wolf-2'); // Remove middle member
    expect(group.members[0].rank).toBe(0);
    expect(group.members[1].rank).toBe(1);
  });

  it('updates alphaEntityId when alpha is removed', () => {
    const group = new AnimalGroupComponent({
      groupType: 'pack',
      members: [],
      maxSize: 8,
      cohesion: 85,
      alphaEntityId: 'wolf-1',
    });
    addMemberToGroup(group, 'wolf-1', 1);
    addMemberToGroup(group, 'wolf-2', 2);
    group.alphaEntityId = 'wolf-1';
    removeMemberFromGroup(group, 'wolf-1');
    expect(group.alphaEntityId).toBe('wolf-2');
  });

  it('sets alphaEntityId to undefined when last member removed', () => {
    const group = new AnimalGroupComponent({
      groupType: 'pack',
      members: [],
      maxSize: 8,
      cohesion: 85,
      alphaEntityId: 'wolf-1',
    });
    addMemberToGroup(group, 'wolf-1', 1);
    group.alphaEntityId = 'wolf-1';
    removeMemberFromGroup(group, 'wolf-1');
    expect(group.alphaEntityId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// defaultMaxSizeForGroupType
// ---------------------------------------------------------------------------

describe('defaultMaxSizeForGroupType', () => {
  it('returns 8 for pack', () => expect(defaultMaxSizeForGroupType('pack')).toBe(8));
  it('returns 30 for herd', () => expect(defaultMaxSizeForGroupType('herd')).toBe(30));
  it('returns 50 for flock', () => expect(defaultMaxSizeForGroupType('flock')).toBe(50));
  it('returns 15 for pride', () => expect(defaultMaxSizeForGroupType('pride')).toBe(15));
  it('returns 100 for colony', () => expect(defaultMaxSizeForGroupType('colony')).toBe(100));
});

// ---------------------------------------------------------------------------
// defaultCohesionForGroupType
// ---------------------------------------------------------------------------

describe('defaultCohesionForGroupType', () => {
  it('returns 85 for pack', () => expect(defaultCohesionForGroupType('pack')).toBe(85));
  it('returns 70 for herd', () => expect(defaultCohesionForGroupType('herd')).toBe(70));
  it('returns 60 for flock', () => expect(defaultCohesionForGroupType('flock')).toBe(60));
  it('returns 75 for pride', () => expect(defaultCohesionForGroupType('pride')).toBe(75));
  it('returns 95 for colony', () => expect(defaultCohesionForGroupType('colony')).toBe(95));
});

// ---------------------------------------------------------------------------
// AnimalGroupSystem
// ---------------------------------------------------------------------------

describe('AnimalGroupSystem', () => {
  let system: AnimalGroupSystem;

  beforeEach(() => {
    system = new AnimalGroupSystem();
  });

  describe('createGroup', () => {
    it('creates a pack group with the founder as alpha at rank 0', () => {
      const group = system.createGroup('pack', 'wolf-1', 50);
      expect(group.groupType).toBe('pack');
      expect(group.alphaEntityId).toBe('wolf-1');
      expect(group.members).toHaveLength(1);
      expect(group.members[0].entityId).toBe('wolf-1');
      expect(group.members[0].rank).toBe(0);
      expect(group.members[0].joinedAt).toBe(50);
    });

    it('sets default maxSize for the group type', () => {
      const pack = system.createGroup('pack', 'wolf-1', 1);
      expect(pack.maxSize).toBe(8);

      const herd = system.createGroup('herd', 'deer-1', 1);
      expect(herd.maxSize).toBe(30);
    });

    it('sets default cohesion for the group type', () => {
      const colony = system.createGroup('colony', 'bee-1', 1);
      expect(colony.cohesion).toBe(95);
    });
  });

  describe('joinGroup', () => {
    it('adds animal to group and sets animal.groupId', () => {
      const group = system.createGroup('pack', 'wolf-1', 1);
      const wolf2 = makeAnimalComponent('wolf-2');
      const joined = system.joinGroup(group, 'group-entity-1', wolf2, 10);
      expect(joined).toBe(true);
      expect(group.members).toHaveLength(2);
      expect(wolf2.groupId).toBe('group-entity-1');
    });

    it('returns false and does not set groupId when group is full', () => {
      const group = new AnimalGroupComponent({
        groupType: 'pack',
        members: [],
        maxSize: 1,
        cohesion: 85,
      });
      addMemberToGroup(group, 'wolf-existing', 1);

      const wolf = makeAnimalComponent('wolf-new');
      const joined = system.joinGroup(group, 'group-entity-1', wolf, 10);
      expect(joined).toBe(false);
      expect(wolf.groupId).toBeUndefined();
    });

    it('returns false when animal is already a member', () => {
      const group = system.createGroup('pack', 'wolf-1', 1);
      const wolf1 = makeAnimalComponent('wolf-1');
      wolf1.groupId = 'group-entity-1';
      const joined = system.joinGroup(group, 'group-entity-1', wolf1, 5);
      expect(joined).toBe(false);
    });
  });

  describe('leaveGroup', () => {
    it('removes animal from group and clears animal.groupId', () => {
      const group = system.createGroup('pack', 'wolf-1', 1);
      const wolf1 = makeAnimalComponent('wolf-1', 0, 0, 'group-entity-1');
      system.leaveGroup(group, wolf1);
      expect(group.members).toHaveLength(0);
      expect(wolf1.groupId).toBeUndefined();
    });

    it('updates alpha when alpha leaves', () => {
      const group = system.createGroup('pack', 'wolf-1', 1);
      const wolf2 = makeAnimalComponent('wolf-2');
      system.joinGroup(group, 'group-entity-1', wolf2, 2);
      group.alphaEntityId = 'wolf-1';

      const wolf1 = makeAnimalComponent('wolf-1', 0, 0, 'group-entity-1');
      system.leaveGroup(group, wolf1);

      expect(group.alphaEntityId).toBe('wolf-2');
      expect(wolf1.groupId).toBeUndefined();
    });
  });
});
