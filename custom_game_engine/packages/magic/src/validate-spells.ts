/**
 * Validation script for spell data migration from TypeScript to JSON.
 * Run with: npx tsx src/validate-spells.ts
 */

import {
  DIVINE_SPELLS,
  ACADEMIC_SPELLS,
  BLOOD_SPELLS,
  NAME_SPELLS,
  BREATH_SPELLS,
  PACT_SPELLS,
  SPELL_COUNTS,
} from './ExpandedSpells.js';

function validateSpells() {
  console.log('Validating spell data migration...\n');

  // Check counts
  console.log('Spell Counts:');
  console.log(`  Divine:   ${SPELL_COUNTS.divine}`);
  console.log(`  Academic: ${SPELL_COUNTS.academic}`);
  console.log(`  Blood:    ${SPELL_COUNTS.blood}`);
  console.log(`  Name:     ${SPELL_COUNTS.name}`);
  console.log(`  Breath:   ${SPELL_COUNTS.breath}`);
  console.log(`  Pact:     ${SPELL_COUNTS.pact}`);
  console.log(`  Total:    ${SPELL_COUNTS.total}`);

  // Validate structure
  const allSpells = [
    ...DIVINE_SPELLS,
    ...ACADEMIC_SPELLS,
    ...BLOOD_SPELLS,
    ...NAME_SPELLS,
    ...BREATH_SPELLS,
    ...PACT_SPELLS,
  ];

  console.log('\nValidating spell structure...');

  let errors = 0;
  for (const spell of allSpells) {
    // Required fields
    if (!spell.id) {
      console.error(`  ERROR: Spell missing id: ${JSON.stringify(spell).substring(0, 50)}`);
      errors++;
    }
    if (!spell.name) {
      console.error(`  ERROR: Spell ${spell.id} missing name`);
      errors++;
    }
    if (!spell.paradigmId) {
      console.error(`  ERROR: Spell ${spell.id} missing paradigmId`);
      errors++;
    }
    if (!spell.description) {
      console.error(`  ERROR: Spell ${spell.id} missing description`);
      errors++;
    }

    // Check for truncated descriptions
    if (spell.description && spell.description.includes('\\')) {
      console.warn(`  WARNING: Spell ${spell.id} has escaped characters in description`);
    }
  }

  if (errors === 0) {
    console.log(`  ✅ All ${allSpells.length} spells validated successfully`);
  } else {
    console.log(`  ❌ Found ${errors} errors`);
    process.exit(1);
  }

  // Sample a few spells
  console.log('\nSample spells:');
  console.log(`  ${DIVINE_SPELLS[0].name} (${DIVINE_SPELLS[0].id})`);
  console.log(`    ${DIVINE_SPELLS[0].description.substring(0, 80)}...`);
  console.log(`  ${ACADEMIC_SPELLS[0].name} (${ACADEMIC_SPELLS[0].id})`);
  console.log(`    ${ACADEMIC_SPELLS[0].description.substring(0, 80)}...`);

  console.log('\n✅ Validation complete!');
}

validateSpells();
