# Midwifery System

Manages pregnancy, labor, birth, and infant care with genetic inheritance and medical intervention.

## Components

**PregnancyComponent** - Tracks 270-day (5min dev) gestation. Three trimesters with symptom progression. Risk factors: maternal age, breech position, malnutrition. Prenatal checkups reduce complications.

**LaborComponent** - Five stages (early → active → transition → delivery → afterbirth). Complications include hemorrhage (critical), dystocia (major), cord prolapse (emergency). Midwife attendance reduces risk 60%, improves progression rate.

**InfantComponent** - Birth to 1 year. Vulnerabilities for premature births (respiratory, temperature, infection). Nursing dependency, developmental milestones, bonding strength. Hunger/health degrades without care.

**NursingComponent** - Milk production tied to nutrition and demand. Wet nurse support (max 2 infants). Mastitis risk without regular nursing. Quality affects infant health.

**PostpartumComponent** - 40-day recovery. Hemorrhage risk, infection monitoring, lactation onset. Complicated births extend recovery.

## Pregnancy Stages

**Trimester 1 (0-33%)** - Morning sickness, fatigue. Fetal position unknown.
**Trimester 2 (33-67%)** - Back pain, cravings. Position detectable at checkups.
**Trimester 3 (67-100%)** - Swelling, 20% speed reduction. Labor onset at 95%.

## Genetic Inheritance

Uses `ReproductionSystem.createOffspring()` for Mendelian genetics. Traits from both parents via allele recombination. Falls back to basic entity creation if system unavailable.

## Public API

```typescript
attendBirth(midwifeId, motherId): boolean
prenatalCheckup(midwifeId, motherId): PrenatalCheckup
treatComplication(midwifeId, motherId, type): boolean
assignWetNurse(wetNurseId, infantId): boolean
```

## Events

`midwifery:pregnancy_started`, `midwifery:labor_started`, `midwifery:complication`, `midwifery:birth`, `midwifery:maternal_death`, `midwifery:infant_death`, `midwifery:recovery_complete`

## Configuration

Default: 5min gestation (dev), 15% base complication rate, 3% mortality if untreated. Disable risks via `MidwiferyConfig`.
