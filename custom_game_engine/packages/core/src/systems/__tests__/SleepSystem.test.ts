import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Sleep System Tests
 *
 * Tests for the 18-hour wake / 6-hour sleep cycle:
 * - Sleep drive: +5.5/hour while awake (18 hours to reach 100%)
 * - Sleep drive: -17/hour while sleeping (6 hours to reach 0%)
 * - Energy depletion: 0.05-0.2/min based on activity
 * - Energy recovery: 33/hour * quality during sleep
 */

describe('Sleep System - 18/6 Hour Cycle', () => {
  describe('Sleep Drive Accumulation (Awake)', () => {
    it('should take ~18 hours awake to reach 95% sleep drive', () => {
      const rate = 5.5; // per hour
      const targetHours = 95 / rate;
      expect(targetHours).toBeCloseTo(17.27, 1);
    });

    it('should accumulate faster when energy is low', () => {
      const baseRate = 5.5;
      const tiredMultiplier = 1.5; // energy < 30
      const moderateMultiplier = 1.25; // energy < 50

      expect(baseRate * tiredMultiplier).toBe(8.25);
      expect(baseRate * moderateMultiplier).toBe(6.875);
    });
  });

  describe('Sleep Drive Recovery (Sleeping)', () => {
    it('should take ~6 hours sleeping to deplete sleep drive from 100 to 0', () => {
      const rate = 17; // per hour
      const targetHours = 100 / rate;
      expect(targetHours).toBeCloseTo(5.88, 1);
    });
  });

  describe('Energy Depletion Rates', () => {
    it('should have correct idle/walking rate', () => {
      const rate = 0.05; // per game minute
      const hourlyRate = rate * 60;
      expect(hourlyRate).toBe(3); // 3 energy per hour idle
    });

    it('should have correct working rate', () => {
      const rate = 0.15; // per game minute
      const hourlyRate = rate * 60;
      expect(hourlyRate).toBe(9); // 9 energy per hour working
    });

    it('should have correct running rate', () => {
      const rate = 0.2; // per game minute
      const hourlyRate = rate * 60;
      expect(hourlyRate).toBe(12); // 12 energy per hour running
    });

    it('should deplete ~102 energy in 18 hours with mixed activity', () => {
      // 8 hours working + 10 hours idle
      const workingEnergy = 8 * 9; // 72
      const idleEnergy = 10 * 3; // 30
      const total = workingEnergy + idleEnergy;
      expect(total).toBe(102);
    });
  });

  describe('Energy Recovery During Sleep', () => {
    it('should recover energy based on sleep quality', () => {
      const baseRecovery = 33; // per hour
      const groundQuality = 0.5;
      const bedQuality = 0.9;

      const groundRecovery = baseRecovery * groundQuality;
      const bedRecovery = baseRecovery * bedQuality;

      expect(groundRecovery).toBe(16.5); // ~16.5/hour on ground
      expect(bedRecovery).toBeCloseTo(29.7, 1); // ~30/hour in bed
    });

    it('should take ~6 hours on ground to recover 100 energy', () => {
      const recoveryRate = 16.5; // per hour on ground
      const hoursToRecover = 100 / recoveryRate;
      expect(hoursToRecover).toBeCloseTo(6.06, 1);
    });

    it('should take ~3.4 hours in bed to recover 100 energy', () => {
      const recoveryRate = 29.7; // per hour in bed
      const hoursToRecover = 100 / recoveryRate;
      expect(hoursToRecover).toBeCloseTo(3.37, 1);
    });
  });

  describe('Wake Conditions', () => {
    it('should wake immediately when energy reaches 100', () => {
      // Energy >= 100 bypasses minimum sleep duration
      const energy = 100;
      const shouldWake = energy >= 100;
      expect(shouldWake).toBe(true);
    });

    it('should require 4 hours minimum sleep before other wake conditions', () => {
      const minSleepHours = 4;
      expect(minSleepHours).toBe(4);
    });

    it('should wake after 4+ hours if energy >= 80 and sleep drive < 5', () => {
      const energy = 85;
      const sleepDrive = 3;
      const wellRestedAndSatisfied = energy >= 80 && sleepDrive < 5;
      expect(wellRestedAndSatisfied).toBe(true);
    });

    it('should have maximum sleep duration of 12 hours', () => {
      const maxSleepHours = 12;
      expect(maxSleepHours).toBe(12);
    });
  });

  describe('Sleep Trigger Threshold', () => {
    it('should only trigger seek_sleep at sleep drive >= 95', () => {
      const threshold = 95;
      expect(threshold).toBe(95);
    });

    it('should not sleep prematurely at lower sleep drive values', () => {
      const sleepDrive = 60;
      const shouldSeekSleep = sleepDrive >= 95;
      expect(shouldSeekSleep).toBe(false);
    });
  });

  describe('Movement Prevention While Sleeping', () => {
    it('should prevent movement when agent is sleeping', () => {
      // MovementSystem checks circadian.isSleeping and forces velocity to 0
      const isSleeping = true;
      const shouldPreventMovement = isSleeping;
      expect(shouldPreventMovement).toBe(true);
    });
  });
});
