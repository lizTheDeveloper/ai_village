import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../../ecs/World';
import type { Entity } from '../../ecs/Entity';

/**
 * MIDWIFERY & MEDICAL SYSTEM SPECIFICATION
 *
 * Design Philosophy:
 * - Births are dangerous events that benefit from skilled assistance
 * - Medicine skill applies to both general healing AND childbirth
 * - Unassisted births have higher complication rates
 * - Midwives provide prenatal care, delivery assistance, and postpartum care
 * - Complications create emergent drama and narrative opportunities
 *
 * Historical Context:
 * - In pre-modern societies, maternal mortality was 1-2% per birth
 * - Skilled midwives reduced this significantly
 * - Neonatal mortality was 20-30% in first year without care
 * - We model this with lower base rates but meaningful risk
 */

describe('Midwifery & Medical System', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  // ============================================================================
  // PART 1: PREGNANCY TRACKING
  // ============================================================================

  describe('Pregnancy Component', () => {
    describe('pregnancy detection and tracking', () => {
      it('should add PregnancyComponent when conception occurs', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        const father = world.createAgent({ name: 'Ash', sex: 'male' });

        world.conceive(mother, father);

        expect(mother.hasComponent('pregnancy')).toBe(true);
        const pregnancy = mother.getComponent('pregnancy');
        expect(pregnancy.fatherId).toBe(father.id);
        expect(pregnancy.gestationProgress).toBe(0);
        expect(pregnancy.trimester).toBe(1);
      });

      it('should track gestation progress in days/ticks', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        const pregnancy = mother.getComponent('pregnancy');
        const gestationDays = 270; // ~9 months

        // Advance 90 days (first trimester)
        world.advanceDays(90);
        expect(pregnancy.trimester).toBe(1);
        expect(pregnancy.gestationProgress).toBeCloseTo(90 / gestationDays, 2);

        // Advance to second trimester
        world.advanceDays(90);
        expect(pregnancy.trimester).toBe(2);

        // Advance to third trimester
        world.advanceDays(90);
        expect(pregnancy.trimester).toBe(3);
      });

      it('should track expected due date', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        const pregnancy = mother.getComponent('pregnancy');
        expect(pregnancy.expectedDueDate).toBeGreaterThan(world.currentTick);
        expect(pregnancy.daysRemaining).toBeCloseTo(270, 10); // ~9 months
      });

      it('should track fetal health separately from maternal health', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        const pregnancy = mother.getComponent('pregnancy');
        expect(pregnancy.fetalHealth).toBe(1.0); // 100%
        expect(pregnancy.fetalHeartbeat).toBe(true);
        expect(pregnancy.fetalPosition).toBe('unknown'); // Until late pregnancy
      });
    });

    describe('maternal health during pregnancy', () => {
      it('should increase food needs by 25% during pregnancy', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        const baseHungerRate = mother.getComponent('needs').hungerRate;

        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        const pregnantHungerRate = mother.getComponent('needs').hungerRate;
        expect(pregnantHungerRate).toBeCloseTo(baseHungerRate * 1.25, 2);
      });

      it('should increase energy needs by 15% during pregnancy', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        const baseEnergyRate = mother.getComponent('needs').energyRate;

        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        const pregnantEnergyRate = mother.getComponent('needs').energyRate;
        expect(pregnantEnergyRate).toBeCloseTo(baseEnergyRate * 1.15, 2);
      });

      it('should reduce movement speed by 20% in third trimester', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        const baseSpeed = mother.getComponent('velocity').maxSpeed;

        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(200); // Into third trimester

        expect(mother.getComponent('velocity').maxSpeed).toBeCloseTo(baseSpeed * 0.8, 2);
      });

      it('should track morning sickness in first trimester', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        const pregnancy = mother.getComponent('pregnancy');
        expect(pregnancy.symptoms.morningSickness).toBe(true);

        world.advanceDays(100); // Past first trimester
        expect(pregnancy.symptoms.morningSickness).toBe(false);
      });

      it('should damage fetal health if mother is starving', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        // Starve the mother
        mother.getComponent('needs').hunger = 0;
        world.advanceDays(7); // A week of starvation

        const pregnancy = mother.getComponent('pregnancy');
        expect(pregnancy.fetalHealth).toBeLessThan(1.0);
        expect(pregnancy.complications).toContain('malnutrition');
      });
    });
  });

  // ============================================================================
  // PART 2: LABOR AND DELIVERY
  // ============================================================================

  describe('Labor and Delivery', () => {
    describe('labor onset', () => {
      it('should trigger labor when gestation is complete', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        world.advanceDays(270); // Full term

        expect(mother.hasComponent('labor')).toBe(true);
        const labor = mother.getComponent('labor');
        expect(labor.stage).toBe('early'); // early -> active -> transition -> delivery
      });

      it('should allow premature labor with increased risk', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        world.advanceDays(200); // 7 months - premature
        world.triggerPrematureLabor(mother);

        expect(mother.hasComponent('labor')).toBe(true);
        const labor = mother.getComponent('labor');
        expect(labor.premature).toBe(true);
        expect(labor.riskModifier).toBeGreaterThan(1.0);
      });

      it('should progress through labor stages over time', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        const labor = mother.getComponent('labor');
        expect(labor.stage).toBe('early');

        world.advanceHours(6);
        expect(labor.stage).toBe('active');

        world.advanceHours(4);
        expect(labor.stage).toBe('transition');

        world.advanceHours(2);
        expect(labor.stage).toBe('delivery');
      });
    });

    describe('unassisted birth (no midwife)', () => {
      it('should have 15% base complication rate for unassisted birth', () => {
        // Run 100 births without assistance
        const results = { complications: 0, successful: 0 };

        for (let i = 0; i < 100; i++) {
          const mother = world.createAgent({ name: `Mother${i}`, sex: 'female' });
          world.conceive(mother, world.createAgent({ name: `Father${i}`, sex: 'male' }));
          world.advanceDays(270);

          const outcome = world.completeBirth(mother);
          if (outcome.complications.length > 0) {
            results.complications++;
          } else {
            results.successful++;
          }
          world.reset();
        }

        // Should be around 15% +/- 5%
        expect(results.complications).toBeGreaterThan(10);
        expect(results.complications).toBeLessThan(20);
      });

      it('should have 3% maternal mortality rate for unassisted complicated births', () => {
        // Maternal mortality only occurs when complications are not treated
        const results = { deaths: 0, survived: 0 };

        for (let i = 0; i < 100; i++) {
          const mother = world.createAgent({ name: `Mother${i}`, sex: 'female' });
          world.conceive(mother, world.createAgent({ name: `Father${i}`, sex: 'male' }));
          world.advanceDays(270);

          // Force a complication
          world.addBirthComplication(mother, 'hemorrhage');
          const outcome = world.completeBirth(mother);

          if (!mother.isAlive()) {
            results.deaths++;
          } else {
            results.survived++;
          }
          world.reset();
        }

        // Should be around 3% maternal mortality for untreated hemorrhage
        expect(results.deaths).toBeGreaterThan(0);
        expect(results.deaths).toBeLessThan(10);
      });

      it('should still produce healthy child most of the time', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        const father = world.createAgent({ name: 'Ash', sex: 'male' });
        world.conceive(mother, father);
        world.advanceDays(270);

        const outcome = world.completeBirth(mother);

        expect(outcome.child).toBeDefined();
        expect(outcome.child.isAlive()).toBe(true);
        expect(outcome.child.getComponent('identity').parents).toContain(mother.id);
        expect(outcome.child.getComponent('identity').parents).toContain(father.id);
      });
    });

    describe('birth complications', () => {
      it('should track hemorrhage as critical complication', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        world.addBirthComplication(mother, 'hemorrhage');
        const labor = mother.getComponent('labor');

        expect(labor.complications).toContain('hemorrhage');
        expect(labor.severity).toBe('critical');
        expect(labor.bloodLoss).toBeGreaterThan(0);
      });

      it('should track dystocia (difficult labor) as major complication', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        world.addBirthComplication(mother, 'dystocia');
        const labor = mother.getComponent('labor');

        expect(labor.complications).toContain('dystocia');
        expect(labor.severity).toBe('major');
        expect(labor.progressRate).toBeLessThan(1.0); // Slower progress
      });

      it('should track cord prolapse as emergency', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        world.addBirthComplication(mother, 'cord_prolapse');
        const labor = mother.getComponent('labor');

        expect(labor.complications).toContain('cord_prolapse');
        expect(labor.severity).toBe('emergency');
        expect(labor.fetalDistress).toBe(true);
        // Requires immediate intervention or fetal death
      });

      it('should track breech presentation as risk factor', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(250); // Late pregnancy

        const pregnancy = mother.getComponent('pregnancy');
        pregnancy.fetalPosition = 'breech';

        world.advanceDays(20); // Full term
        const labor = mother.getComponent('labor');

        expect(labor.riskModifier).toBeGreaterThan(1.0);
        expect(labor.riskFactors).toContain('breech');
      });
    });
  });

  // ============================================================================
  // PART 3: MIDWIFE ROLE AND SKILLS
  // ============================================================================

  describe('Midwife Role', () => {
    describe('medicine skill specialization', () => {
      it('should have midwifery as specialization of medicine skill', () => {
        const agent = world.createAgent({ name: 'Willow' });
        agent.setSkill('medicine', 3);
        agent.setSpecialization('medicine', 'midwifery');

        expect(agent.getComponent('skills').specializations).toContain('midwifery');
        expect(agent.getMidwiferySkill()).toBe(3);
      });

      it('should gain midwifery XP from attending births', () => {
        const midwife = world.createAgent({ name: 'Willow' });
        midwife.setSkill('medicine', 2);
        midwife.setSpecialization('medicine', 'midwifery');

        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        const xpBefore = midwife.getSkillXP('medicine');
        world.attendBirth(midwife, mother);
        world.completeBirth(mother);

        expect(midwife.getSkillXP('medicine')).toBeGreaterThan(xpBefore);
      });

      it('should require medicine level 2 to become midwife', () => {
        const agent = world.createAgent({ name: 'Novice' });
        agent.setSkill('medicine', 1);

        expect(() => {
          agent.setSpecialization('medicine', 'midwifery');
        }).toThrow('Medicine skill 2 required for midwifery specialization');
      });
    });

    describe('prenatal care', () => {
      it('should detect pregnancy earlier with skilled midwife', () => {
        const midwife = world.createAgent({ name: 'Willow', skills: { medicine: 3 } });
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        world.advanceDays(14); // 2 weeks

        // Without midwife, pregnancy not yet visible
        expect(mother.getComponent('pregnancy').detected).toBe(false);

        // Skilled midwife can detect early
        world.examineForPregnancy(midwife, mother);
        expect(mother.getComponent('pregnancy').detected).toBe(true);
      });

      it('should identify risk factors during prenatal visits', () => {
        const midwife = world.createAgent({ name: 'Willow', skills: { medicine: 4 } });
        const mother = world.createAgent({ name: 'Dawn', sex: 'female', age: 40 });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        world.advanceDays(90);
        world.prenatalCheckup(midwife, mother);

        const pregnancy = mother.getComponent('pregnancy');
        expect(pregnancy.riskFactors).toContain('advanced_maternal_age');
        expect(pregnancy.recommendedCare).toBe('high_risk');
      });

      it('should detect fetal position in third trimester', () => {
        const midwife = world.createAgent({ name: 'Willow', skills: { medicine: 3 } });
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        world.advanceDays(240); // Third trimester
        world.prenatalCheckup(midwife, mother);

        const pregnancy = mother.getComponent('pregnancy');
        expect(['cephalic', 'breech', 'transverse']).toContain(pregnancy.fetalPosition);
      });

      it('should reduce complication risk with regular prenatal care', () => {
        const midwife = world.createAgent({ name: 'Willow', skills: { medicine: 4 } });
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        // Regular checkups throughout pregnancy
        for (let week = 4; week <= 36; week += 4) {
          world.advanceDays(28);
          world.prenatalCheckup(midwife, mother);
        }

        const pregnancy = mother.getComponent('pregnancy');
        expect(pregnancy.riskModifier).toBeLessThan(1.0); // Reduced risk
      });
    });

    describe('assisted birth', () => {
      it('should reduce complication rate by 60% with skilled midwife', () => {
        // Compare 100 assisted vs 100 unassisted births
        const midwife = world.createAgent({ name: 'Willow', skills: { medicine: 4 } });
        midwife.setSpecialization('medicine', 'midwifery');

        const assistedComplications = 0;
        const unassistedComplications = 0;

        for (let i = 0; i < 100; i++) {
          const mother = world.createAgent({ name: `Mother${i}`, sex: 'female' });
          world.conceive(mother, world.createAgent({ name: `Father${i}`, sex: 'male' }));
          world.advanceDays(270);

          world.attendBirth(midwife, mother);
          const outcome = world.completeBirth(mother);

          if (outcome.complications.length > 0) {
            assistedComplications++;
          }
          world.reset();
        }

        // Assisted should have ~6% complications (60% reduction from 15%)
        expect(assistedComplications).toBeLessThan(10);
      });

      it('should reduce maternal mortality to near zero with treatment', () => {
        const midwife = world.createAgent({ name: 'Willow', skills: { medicine: 5 } });
        midwife.setSpecialization('medicine', 'midwifery');

        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        world.addBirthComplication(mother, 'hemorrhage');
        world.attendBirth(midwife, mother);
        world.treatComplication(midwife, mother, 'hemorrhage');

        const outcome = world.completeBirth(mother);

        expect(mother.isAlive()).toBe(true);
        expect(outcome.treatmentSuccess).toBe(true);
      });

      it('should handle breech delivery with skilled midwife', () => {
        const midwife = world.createAgent({ name: 'Willow', skills: { medicine: 4 } });
        midwife.setSpecialization('medicine', 'midwifery');

        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(250);

        const pregnancy = mother.getComponent('pregnancy');
        pregnancy.fetalPosition = 'breech';

        world.advanceDays(20);
        world.attendBirth(midwife, mother);

        // Skilled midwife may attempt to turn baby or deliver breech
        const outcome = world.completeBirth(mother);
        expect(outcome.child.isAlive()).toBe(true);
        expect(outcome.deliveryMethod).toMatch(/breech|turned_to_cephalic/);
      });

      it('should speed up labor with skilled assistance', () => {
        const midwife = world.createAgent({ name: 'Willow', skills: { medicine: 4 } });

        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        world.attendBirth(midwife, mother);
        const labor = mother.getComponent('labor');

        expect(labor.progressRate).toBeGreaterThan(1.0); // Faster progress
      });
    });
  });

  // ============================================================================
  // PART 4: POSTPARTUM CARE
  // ============================================================================

  describe('Postpartum Period', () => {
    describe('maternal recovery', () => {
      it('should add PostpartumComponent after birth', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);
        world.completeBirth(mother);

        expect(mother.hasComponent('postpartum')).toBe(true);
        expect(mother.hasComponent('pregnancy')).toBe(false);
      });

      it('should track recovery period (6 weeks default)', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);
        world.completeBirth(mother);

        const postpartum = mother.getComponent('postpartum');
        expect(postpartum.recoveryDaysRemaining).toBe(42); // 6 weeks

        world.advanceDays(21);
        expect(postpartum.recoveryDaysRemaining).toBe(21);
        expect(postpartum.recoveryProgress).toBeCloseTo(0.5, 1);
      });

      it('should reduce work capacity during recovery', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);
        world.completeBirth(mother);

        const postpartum = mother.getComponent('postpartum');

        // Immediately after birth
        expect(postpartum.workCapacity).toBeCloseTo(0.3, 1); // 30%

        world.advanceDays(14);
        expect(postpartum.workCapacity).toBeCloseTo(0.5, 1); // 50%

        world.advanceDays(28);
        expect(postpartum.workCapacity).toBeCloseTo(1.0, 1); // Full recovery
      });

      it('should extend recovery for complicated births', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        world.addBirthComplication(mother, 'hemorrhage');
        world.completeBirth(mother);

        const postpartum = mother.getComponent('postpartum');
        expect(postpartum.recoveryDaysRemaining).toBeGreaterThan(42); // Extended
        expect(postpartum.complications).toContain('anemia');
      });

      it('should track postpartum infection risk', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);
        world.completeBirth(mother);

        const postpartum = mother.getComponent('postpartum');
        expect(postpartum.infectionRisk).toBeGreaterThan(0);

        // Risk decreases over time with rest
        world.advanceDays(7);
        expect(postpartum.infectionRisk).toBeLessThan(0.1);
      });
    });

    describe('nursing and newborn care', () => {
      it('should add NursingComponent to mother after birth', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);
        const outcome = world.completeBirth(mother);

        expect(mother.hasComponent('nursing')).toBe(true);
        const nursing = mother.getComponent('nursing');
        expect(nursing.nursingChildId).toBe(outcome.child.id);
      });

      it('should increase food needs while nursing', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        const baseHungerRate = mother.getComponent('needs').hungerRate;

        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);
        world.completeBirth(mother);

        const nursingHungerRate = mother.getComponent('needs').hungerRate;
        expect(nursingHungerRate).toBeCloseTo(baseHungerRate * 1.5, 2); // 50% increase
      });

      it('should track infant health dependent on nursing', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);
        const outcome = world.completeBirth(mother);

        const infant = outcome.child;
        expect(infant.hasComponent('infant')).toBe(true);
        expect(infant.getComponent('infant').nursingSource).toBe(mother.id);

        // If mother is well-fed, infant thrives
        mother.getComponent('needs').hunger = 1.0;
        world.advanceDays(7);
        expect(infant.getComponent('infant').health).toBeGreaterThan(0.9);

        // If mother is malnourished, infant suffers
        mother.getComponent('needs').hunger = 0.2;
        world.advanceDays(7);
        expect(infant.getComponent('infant').health).toBeLessThan(0.9);
      });

      it('should allow wet nurse if mother cannot nurse', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        // Mother dies in childbirth
        world.addBirthComplication(mother, 'hemorrhage');
        const outcome = world.completeBirth(mother);
        world.killAgent(mother, 'hemorrhage');

        // Another nursing mother can become wet nurse
        const wetNurse = world.createAgent({ name: 'Rose', sex: 'female' });
        world.setAsNursingMother(wetNurse);

        world.assignWetNurse(wetNurse, outcome.child);

        expect(outcome.child.getComponent('infant').nursingSource).toBe(wetNurse.id);
      });
    });
  });

  // ============================================================================
  // PART 5: BIRTH OUTCOMES AND RECORDS
  // ============================================================================

  describe('Birth Outcomes', () => {
    describe('infant health', () => {
      it('should track birth weight based on maternal nutrition', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        // Well-fed pregnancy
        for (let i = 0; i < 270; i++) {
          mother.getComponent('needs').hunger = 1.0;
          world.advanceDays(1);
        }

        const outcome = world.completeBirth(mother);
        expect(outcome.child.getComponent('infant').birthWeight).toBe('normal');
      });

      it('should result in low birth weight from malnutrition', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));

        // Malnourished pregnancy
        for (let i = 0; i < 270; i++) {
          mother.getComponent('needs').hunger = 0.3;
          world.advanceDays(1);
        }

        const outcome = world.completeBirth(mother);
        expect(outcome.child.getComponent('infant').birthWeight).toBe('low');
      });

      it('should track premature infants with health challenges', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(200); // 7 months - premature
        world.triggerPrematureLabor(mother);

        const outcome = world.completeBirth(mother);
        const infant = outcome.child.getComponent('infant');

        expect(infant.premature).toBe(true);
        expect(infant.gestationalAge).toBeLessThan(37); // weeks
        expect(infant.health).toBeLessThan(1.0);
        expect(infant.vulnerabilities).toContain('respiratory');
      });
    });

    describe('birth records', () => {
      it('should emit birth event with full details', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        const father = world.createAgent({ name: 'Ash', sex: 'male' });
        world.conceive(mother, father);
        world.advanceDays(270);

        const events: any[] = [];
        world.eventBus.subscribe('birth', (e) => events.push(e));

        world.completeBirth(mother);

        expect(events).toHaveLength(1);
        expect(events[0].data).toMatchObject({
          motherId: mother.id,
          fatherId: father.id,
          childId: expect.any(String),
          gestationalAge: expect.any(Number),
          birthWeight: expect.any(String),
          complications: expect.any(Array),
          attendedBy: null // No midwife
        });
      });

      it('should record midwife who attended birth', () => {
        const midwife = world.createAgent({ name: 'Willow', skills: { medicine: 4 } });
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        const events: any[] = [];
        world.eventBus.subscribe('birth', (e) => events.push(e));

        world.attendBirth(midwife, mother);
        world.completeBirth(mother);

        expect(events[0].data.attendedBy).toBe(midwife.id);
      });

      it('should create canon event for significant births', () => {
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        const father = world.createAgent({ name: 'Ash', sex: 'male' });
        world.conceive(mother, father);
        world.advanceDays(270);

        const outcome = world.completeBirth(mother);

        const canonEvents = world.getCanonEvents().filter(e => e.type === 'birth');
        expect(canonEvents.length).toBeGreaterThan(0);
        expect(canonEvents[0].description).toContain('Dawn');
        expect(canonEvents[0].description).toContain('Ash');
      });
    });
  });

  // ============================================================================
  // PART 6: MIDWIFE BEHAVIOR AND AI
  // ============================================================================

  describe('Midwife Behavior', () => {
    describe('automatic birth attendance', () => {
      it('should prioritize attending laboring mothers', () => {
        const midwife = world.createAgent({ name: 'Willow', skills: { medicine: 4 } });
        midwife.setSpecialization('medicine', 'midwifery');

        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        // Midwife should automatically detect and respond
        world.update(); // Run behavior tick

        expect(midwife.currentBehavior).toBe('attending_birth');
        expect(midwife.behaviorTarget).toBe(mother.id);
      });

      it('should check on pregnant villagers regularly', () => {
        const midwife = world.createAgent({ name: 'Willow', skills: { medicine: 4 } });
        midwife.setSpecialization('medicine', 'midwifery');
        midwife.assignRole('midwife');

        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(60); // Not in labor yet

        // Should include prenatal checkups in daily routine
        world.update();
        expect(midwife.dailyTasks).toContainEqual({
          type: 'prenatal_checkup',
          target: mother.id
        });
      });
    });

    describe('midwife memory and learning', () => {
      it('should remember difficult births for future reference', () => {
        const midwife = world.createAgent({ name: 'Willow', skills: { medicine: 4 } });
        midwife.setSpecialization('medicine', 'midwifery');

        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        world.addBirthComplication(mother, 'hemorrhage');
        world.attendBirth(midwife, mother);
        world.completeBirth(mother);

        const memories = midwife.getMemories('birth');
        expect(memories).toContainEqual(expect.objectContaining({
          type: 'difficult_birth',
          patient: mother.id,
          complication: 'hemorrhage',
          outcome: 'survived'
        }));
      });
    });
  });

  // ============================================================================
  // PART 7: MEDICAL BUILDINGS
  // ============================================================================

  describe('Medical Buildings', () => {
    describe('birthing hut', () => {
      it('should provide bonus to birth outcomes', () => {
        world.buildBirthingHut({ x: 0, y: 0 });

        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        // Move mother to birthing hut
        mother.moveTo({ x: 0, y: 0 });

        const labor = mother.getComponent('labor');
        expect(labor.buildingBonus).toBeGreaterThan(0);
        expect(labor.complicationRiskModifier).toBeLessThan(1.0);
      });

      it('should provide medical supplies for complications', () => {
        const hut = world.buildBirthingHut({ x: 0, y: 0 });
        hut.stockSupplies(['clean_cloth', 'medicinal_herbs', 'cord_clamp']);

        const midwife = world.createAgent({ name: 'Willow', skills: { medicine: 4 } });
        const mother = world.createAgent({ name: 'Dawn', sex: 'female' });
        world.conceive(mother, world.createAgent({ name: 'Ash', sex: 'male' }));
        world.advanceDays(270);

        world.addBirthComplication(mother, 'hemorrhage');
        world.attendBirth(midwife, mother);

        // With supplies, treatment is more effective
        const treatmentSuccess = world.treatComplication(midwife, mother, 'hemorrhage');
        expect(treatmentSuccess.bonusFromSupplies).toBeGreaterThan(0);
      });
    });
  });
});
