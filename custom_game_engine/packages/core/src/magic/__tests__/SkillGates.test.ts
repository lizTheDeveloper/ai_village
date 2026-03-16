import { describe, it, expect } from 'vitest';
import {
  isTechniqueUnlocked,
  isFormUnlocked,
  isSpellAccessible,
  getUnlockedTechniques,
  getUnlockedForms,
  getRequiredSkillForTechnique,
  getRequiredSkillForForm,
  getAccessBlockReason,
} from '../SkillGates.js';

describe('SkillGates', () => {
  describe('isTechniqueUnlocked', () => {
    it('novice (skill 0) can use create', () => {
      expect(isTechniqueUnlocked('create', 0)).toBe(true);
    });

    it('novice (skill 0) can use perceive', () => {
      expect(isTechniqueUnlocked('perceive', 0)).toBe(true);
    });

    it('novice (skill 0) cannot use control', () => {
      expect(isTechniqueUnlocked('control', 0)).toBe(false);
    });

    it('novice (skill 0) cannot use transform', () => {
      expect(isTechniqueUnlocked('transform', 0)).toBe(false);
    });

    it('novice (skill 1) cannot use control', () => {
      expect(isTechniqueUnlocked('control', 1)).toBe(false);
    });

    it('apprentice (skill 2) can use control', () => {
      expect(isTechniqueUnlocked('control', 2)).toBe(true);
    });

    it('apprentice (skill 2) can use transform', () => {
      expect(isTechniqueUnlocked('transform', 2)).toBe(true);
    });

    it('apprentice (skill 2) cannot use destroy', () => {
      expect(isTechniqueUnlocked('destroy', 2)).toBe(false);
    });

    it('apprentice (skill 2) cannot use protect', () => {
      expect(isTechniqueUnlocked('protect', 2)).toBe(false);
    });

    it('apprentice (skill 3) cannot use destroy', () => {
      expect(isTechniqueUnlocked('destroy', 3)).toBe(false);
    });

    it('adept (skill 4) can use destroy', () => {
      expect(isTechniqueUnlocked('destroy', 4)).toBe(true);
    });

    it('adept (skill 4) can use protect', () => {
      expect(isTechniqueUnlocked('protect', 4)).toBe(true);
    });

    it('adept (skill 4) cannot use enhance', () => {
      expect(isTechniqueUnlocked('enhance', 4)).toBe(false);
    });

    it('adept (skill 4) cannot use summon', () => {
      expect(isTechniqueUnlocked('summon', 4)).toBe(false);
    });

    it('master (skill 5) can use enhance', () => {
      expect(isTechniqueUnlocked('enhance', 5)).toBe(true);
    });

    it('master (skill 5) can use summon', () => {
      expect(isTechniqueUnlocked('summon', 5)).toBe(true);
    });

    it('master (skill 5) can use all techniques', () => {
      const techniques = ['create', 'perceive', 'control', 'transform', 'destroy', 'protect', 'enhance', 'summon'] as const;
      for (const t of techniques) {
        expect(isTechniqueUnlocked(t, 5)).toBe(true);
      }
    });
  });

  describe('isFormUnlocked', () => {
    it('novice (skill 0) can use fire', () => {
      expect(isFormUnlocked('fire', 0)).toBe(true);
    });

    it('novice (skill 0) can use water, air, earth', () => {
      expect(isFormUnlocked('water', 0)).toBe(true);
      expect(isFormUnlocked('air', 0)).toBe(true);
      expect(isFormUnlocked('earth', 0)).toBe(true);
    });

    it('novice (skill 0) cannot use mind', () => {
      expect(isFormUnlocked('mind', 0)).toBe(false);
    });

    it('novice (skill 0) cannot use body', () => {
      expect(isFormUnlocked('body', 0)).toBe(false);
    });

    it('apprentice (skill 2) can use mind', () => {
      expect(isFormUnlocked('mind', 2)).toBe(true);
    });

    it('apprentice (skill 2) can use body', () => {
      expect(isFormUnlocked('body', 2)).toBe(true);
    });

    it('apprentice (skill 2) cannot use plant', () => {
      expect(isFormUnlocked('plant', 2)).toBe(false);
    });

    it('apprentice (skill 2) cannot use void', () => {
      expect(isFormUnlocked('void', 2)).toBe(false);
    });

    it('adept (skill 4) can use void', () => {
      expect(isFormUnlocked('void', 4)).toBe(true);
    });

    it('adept (skill 4) can use plant and animal', () => {
      expect(isFormUnlocked('plant', 4)).toBe(true);
      expect(isFormUnlocked('animal', 4)).toBe(true);
    });

    it('adept (skill 4) cannot use spirit', () => {
      expect(isFormUnlocked('spirit', 4)).toBe(false);
    });

    it('adept (skill 4) cannot use time or space', () => {
      expect(isFormUnlocked('time', 4)).toBe(false);
      expect(isFormUnlocked('space', 4)).toBe(false);
    });

    it('master (skill 5) can use all forms', () => {
      const forms = ['fire', 'water', 'air', 'earth', 'mind', 'body', 'plant', 'animal', 'void', 'spirit', 'image', 'time', 'space', 'metal'] as const;
      for (const f of forms) {
        expect(isFormUnlocked(f, 5)).toBe(true);
      }
    });
  });

  describe('isSpellAccessible', () => {
    it('novice can cast create+fire', () => {
      expect(isSpellAccessible('create', 'fire', 0)).toBe(true);
    });

    it('novice cannot cast control+fire (technique locked)', () => {
      expect(isSpellAccessible('control', 'fire', 0)).toBe(false);
    });

    it('novice cannot cast create+mind (form locked)', () => {
      expect(isSpellAccessible('create', 'mind', 0)).toBe(false);
    });

    it('novice cannot cast control+mind (both locked)', () => {
      expect(isSpellAccessible('control', 'mind', 0)).toBe(false);
    });

    it('apprentice (skill 2) can cast control+mind', () => {
      expect(isSpellAccessible('control', 'mind', 2)).toBe(true);
    });

    it('apprentice (skill 2) cannot cast destroy+void (both still locked)', () => {
      expect(isSpellAccessible('destroy', 'void', 2)).toBe(false);
    });

    it('adept (skill 4) can cast destroy+void', () => {
      expect(isSpellAccessible('destroy', 'void', 4)).toBe(true);
    });

    it('adept (skill 4) cannot cast enhance+spirit (both locked)', () => {
      expect(isSpellAccessible('enhance', 'spirit', 4)).toBe(false);
    });

    it('master (skill 5) can cast enhance+time', () => {
      expect(isSpellAccessible('enhance', 'time', 5)).toBe(true);
    });

    it('master (skill 5) can cast summon+spirit', () => {
      expect(isSpellAccessible('summon', 'spirit', 5)).toBe(true);
    });
  });

  describe('getUnlockedTechniques', () => {
    it('novice (skill 0) unlocks only create and perceive', () => {
      const unlocked = getUnlockedTechniques(0);
      expect(unlocked).toContain('create');
      expect(unlocked).toContain('perceive');
      expect(unlocked).not.toContain('control');
      expect(unlocked).not.toContain('transform');
      expect(unlocked).not.toContain('destroy');
      expect(unlocked).not.toContain('protect');
      expect(unlocked).not.toContain('enhance');
      expect(unlocked).not.toContain('summon');
      expect(unlocked).toHaveLength(2);
    });

    it('apprentice (skill 2) unlocks create, perceive, control, transform', () => {
      const unlocked = getUnlockedTechniques(2);
      expect(unlocked).toContain('create');
      expect(unlocked).toContain('perceive');
      expect(unlocked).toContain('control');
      expect(unlocked).toContain('transform');
      expect(unlocked).not.toContain('destroy');
      expect(unlocked).not.toContain('protect');
      expect(unlocked).not.toContain('enhance');
      expect(unlocked).not.toContain('summon');
      expect(unlocked).toHaveLength(4);
    });

    it('adept (skill 4) unlocks create, perceive, control, transform, destroy, protect', () => {
      const unlocked = getUnlockedTechniques(4);
      expect(unlocked).toContain('create');
      expect(unlocked).toContain('perceive');
      expect(unlocked).toContain('control');
      expect(unlocked).toContain('transform');
      expect(unlocked).toContain('destroy');
      expect(unlocked).toContain('protect');
      expect(unlocked).not.toContain('enhance');
      expect(unlocked).not.toContain('summon');
      expect(unlocked).toHaveLength(6);
    });

    it('master (skill 5) unlocks all 8 techniques', () => {
      const unlocked = getUnlockedTechniques(5);
      expect(unlocked).toHaveLength(8);
      expect(unlocked).toContain('enhance');
      expect(unlocked).toContain('summon');
    });
  });

  describe('getUnlockedForms', () => {
    it('novice (skill 0) unlocks only fire, water, air, earth', () => {
      const unlocked = getUnlockedForms(0);
      expect(unlocked).toContain('fire');
      expect(unlocked).toContain('water');
      expect(unlocked).toContain('air');
      expect(unlocked).toContain('earth');
      expect(unlocked).not.toContain('mind');
      expect(unlocked).not.toContain('body');
      expect(unlocked).not.toContain('void');
      expect(unlocked).toHaveLength(4);
    });

    it('apprentice (skill 2) additionally unlocks mind and body', () => {
      const unlocked = getUnlockedForms(2);
      expect(unlocked).toContain('fire');
      expect(unlocked).toContain('water');
      expect(unlocked).toContain('air');
      expect(unlocked).toContain('earth');
      expect(unlocked).toContain('mind');
      expect(unlocked).toContain('body');
      expect(unlocked).not.toContain('plant');
      expect(unlocked).not.toContain('animal');
      expect(unlocked).not.toContain('void');
      expect(unlocked).toHaveLength(6);
    });

    it('adept (skill 4) additionally unlocks plant, animal, void', () => {
      const unlocked = getUnlockedForms(4);
      expect(unlocked).toContain('plant');
      expect(unlocked).toContain('animal');
      expect(unlocked).toContain('void');
      expect(unlocked).not.toContain('spirit');
      expect(unlocked).not.toContain('image');
      expect(unlocked).not.toContain('time');
      expect(unlocked).not.toContain('space');
      expect(unlocked).not.toContain('metal');
      expect(unlocked).toHaveLength(9);
    });

    it('master (skill 5) unlocks all 14 forms', () => {
      const unlocked = getUnlockedForms(5);
      expect(unlocked).toHaveLength(14);
      expect(unlocked).toContain('spirit');
      expect(unlocked).toContain('image');
      expect(unlocked).toContain('time');
      expect(unlocked).toContain('space');
      expect(unlocked).toContain('metal');
    });
  });

  describe('getRequiredSkillForTechnique', () => {
    it('returns 0 for create', () => {
      expect(getRequiredSkillForTechnique('create')).toBe(0);
    });

    it('returns 0 for perceive', () => {
      expect(getRequiredSkillForTechnique('perceive')).toBe(0);
    });

    it('returns 2 for control', () => {
      expect(getRequiredSkillForTechnique('control')).toBe(2);
    });

    it('returns 2 for transform', () => {
      expect(getRequiredSkillForTechnique('transform')).toBe(2);
    });

    it('returns 4 for destroy', () => {
      expect(getRequiredSkillForTechnique('destroy')).toBe(4);
    });

    it('returns 4 for protect', () => {
      expect(getRequiredSkillForTechnique('protect')).toBe(4);
    });

    it('returns 5 for enhance', () => {
      expect(getRequiredSkillForTechnique('enhance')).toBe(5);
    });

    it('returns 5 for summon', () => {
      expect(getRequiredSkillForTechnique('summon')).toBe(5);
    });
  });

  describe('getRequiredSkillForForm', () => {
    it('returns 0 for fire, water, air, earth', () => {
      expect(getRequiredSkillForForm('fire')).toBe(0);
      expect(getRequiredSkillForForm('water')).toBe(0);
      expect(getRequiredSkillForForm('air')).toBe(0);
      expect(getRequiredSkillForForm('earth')).toBe(0);
    });

    it('returns 2 for mind and body', () => {
      expect(getRequiredSkillForForm('mind')).toBe(2);
      expect(getRequiredSkillForForm('body')).toBe(2);
    });

    it('returns 4 for plant, animal, void', () => {
      expect(getRequiredSkillForForm('plant')).toBe(4);
      expect(getRequiredSkillForForm('animal')).toBe(4);
      expect(getRequiredSkillForForm('void')).toBe(4);
    });

    it('returns 5 for spirit, image, time, space, metal', () => {
      expect(getRequiredSkillForForm('spirit')).toBe(5);
      expect(getRequiredSkillForForm('image')).toBe(5);
      expect(getRequiredSkillForForm('time')).toBe(5);
      expect(getRequiredSkillForForm('space')).toBe(5);
      expect(getRequiredSkillForForm('metal')).toBe(5);
    });
  });

  describe('getAccessBlockReason', () => {
    it('returns null when both technique and form are accessible', () => {
      expect(getAccessBlockReason('create', 'fire', 0)).toBeNull();
    });

    it('returns null at master level for locked-until-5 spells', () => {
      expect(getAccessBlockReason('summon', 'time', 5)).toBeNull();
    });

    it('returns null for apprentice with control+mind', () => {
      expect(getAccessBlockReason('control', 'mind', 2)).toBeNull();
    });

    it('returns string mentioning locked technique when only technique is locked', () => {
      const reason = getAccessBlockReason('control', 'fire', 0);
      expect(reason).not.toBeNull();
      expect(reason).toContain('control');
    });

    it('returns string mentioning locked form when only form is locked', () => {
      const reason = getAccessBlockReason('create', 'mind', 0);
      expect(reason).not.toBeNull();
      expect(reason).toContain('mind');
    });

    it('returns string mentioning both when both are locked', () => {
      const reason = getAccessBlockReason('control', 'mind', 0);
      expect(reason).not.toBeNull();
      expect(reason).toContain('control');
      expect(reason).toContain('mind');
    });

    it('reason string includes the required skill level', () => {
      const reason = getAccessBlockReason('enhance', 'spirit', 4);
      expect(reason).not.toBeNull();
      expect(reason).toContain('5');
    });

    it('reason string includes current skill level when locked', () => {
      const reason = getAccessBlockReason('destroy', 'fire', 2);
      expect(reason).not.toBeNull();
      expect(reason).toContain('2');
    });

    it('adept cannot cast enhance+spirit, reason mentions both', () => {
      const reason = getAccessBlockReason('enhance', 'spirit', 4);
      expect(reason).not.toBeNull();
      expect(reason).toContain('enhance');
      expect(reason).toContain('spirit');
    });
  });
});
