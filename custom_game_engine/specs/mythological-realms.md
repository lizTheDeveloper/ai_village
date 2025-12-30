# Mythological Realms System

## Core Concept

Mythological realms are **pocket dimensions** that exist alongside, within, or adjacent to universes. Unlike full universes (which have their own physics, magic paradigms, and fundamental laws), realms are extensions of their parent universe - divine territories carved out of reality itself.

Think of the difference:
- **Universe**: A complete book with its own language, rules, and internal logic
- **Realm**: A chapter or room within that book - it can have its own style, but it's written in the same language

### Why Realms Matter

Realms are where mythology actually *happens*:
- **Olympus** - Where gods hold court
- **Valhalla** - Where the honored dead feast
- **The Underworld** - Where souls journey after death
- **The Dreaming** - Where consciousness wanders in sleep
- **The Fae Courts** - Where the fair folk rule
- **Yomi/Diyu/Hel** - Various death realms

Realms are far more accessible than other universes. A mortal hero can journey to the underworld and return. A shaman can visit the spirit world in trance. A dreamer can walk in other realms while sleeping.

---

## Realm vs Universe Comparison

| Aspect | Universe | Realm |
|--------|----------|-------|
| **Physics** | Own fundamental laws | Inherits from parent (with modifications) |
| **Magic** | Own paradigm | Parent's paradigm (possibly enhanced) |
| **Time** | Independent | Can differ but linked to parent |
| **Creation Cost** | Astronomical (0.99+ spectrum) | Moderate (0.70+ spectrum for small) |
| **Crossing Cost** | Ridiculously expensive | Affordable (ritual, death, dreams) |
| **Stability** | Self-sustaining | Usually requires maintainer |
| **Size** | Infinite potential | Limited by creator's power |
| **Destruction** | Nearly impossible | Possible if maintainer dies/leaves |

---

## Realm Categories

### 1. Celestial Realms
Divine courts, heavens, paradises - realms of light, order, and divine presence.

**Examples**: Olympus, Asgard, Heaven, Tian, Takamagahara
**Typical Properties**:
- Time flows slower (or is eternal)
- Enhanced beauty and order
- Mortals can visit but age rapidly on return
- Usually requires invitation or achievement to enter permanently

### 2. Underworld Realms
Death realms, afterlives, spirit worlds - where souls go after death.

**Examples**: Hades, Yomi, Duat, Hel, Diyu, Naraka
**Typical Properties**:
- Accessible primarily through death
- Multiple layers/regions based on how one lived
- Living can visit but risk being trapped
- Often has guardians/judges

### 3. Elemental Realms
Pure manifestations of elemental forces - fire, water, earth, air, and more abstract elements.

**Examples**: Plane of Fire, Elemental Chaos, Jotunheim (ice)
**Typical Properties**:
- Dominated by one element
- Dangerous to mortals without protection
- Home to elemental beings
- Source of elemental magic

### 4. Dream Realms
Spaces of consciousness, imagination, collective unconscious.

**Examples**: The Dreaming, Astral Plane, Noosphere
**Typical Properties**:
- Entered through sleep, trance, or meditation
- Malleable by strong wills
- Thoughts can become real (temporarily)
- Time is subjective

### 5. Liminal Realms
Boundary spaces, crossroads, in-between places - neither here nor there.

**Examples**: The Crossroads, Twilight Realm, The Hedge
**Typical Properties**:
- Exist at boundaries (dawn/dusk, life/death, land/sea)
- Easier to enter at threshold times
- Navigation is treacherous
- Deal-making has power here

### 6. Personal Domains
Individual realms created and maintained by a single presence.

**Examples**: A god's personal heaven, a demon's pocket dimension
**Typical Properties**:
- Creator has absolute power within
- Reflects creator's nature
- Dissolves if creator dies (usually)
- Can be expanded with power

### 7. Wild Realms
Untamed, unclaimed pocket dimensions - primordial or abandoned.

**Examples**: Faerie (parts), The Wyld, Primordial Chaos
**Typical Properties**:
- No single ruler
- Reality is unstable
- Dangerous but powerful
- Can be claimed by sufficiently powerful beings

---

## Realm Properties

### Topology

```
REALM STRUCTURE:

     [Parent Universe]
            │
     ┌──────┴──────┐
     │   Boundary  │ ← The "membrane" between universe and realm
     │    Layer    │
     └──────┬──────┘
            │
     ┌──────┴──────┐
     │    Realm    │
     │   Interior  │ ← Where the realm "really is"
     └──────┬──────┘
            │
     ┌──────┴──────┐
     │  Sub-Realms │ ← Nested realms within realms
     └─────────────┘
```

### Core Properties

```typescript
interface RealmProperties {
  // Identity
  name: string;
  category: RealmCategory;
  parentUniverseId: string;

  // Physical
  size: RealmSize;
  topology: RealmTopology;

  // Temporal
  timeFlow: TimeFlowType;
  timeRatio: number;  // 1.0 = same as parent, 0.1 = 10x slower

  // Environmental
  environment: EnvironmentType;
  stability: number;  // 0-1, how stable is reality here

  // Access
  accessMethods: AccessMethod[];
  accessRestrictions: AccessRestriction[];

  // Governance
  ruler?: string;  // Presence ID
  contested: boolean;
  laws: RealmLaw[];  // Special rules that apply here
}
```

### Size Classifications

| Size | Description | Creation Requirement | Example |
|------|-------------|---------------------|---------|
| **Pocket** | Single room/location | 0.50+ spectrum | A god's throne room |
| **Domain** | Village-scale | 0.60+ spectrum | A saint's personal heaven |
| **Territory** | Region-scale | 0.70+ spectrum | A death god's judgment hall |
| **Kingdom** | Nation-scale | 0.80+ spectrum | Olympus, Asgard |
| **Infinite** | Unbounded | 0.90+ spectrum | The Underworld, Heaven |

### Time Flow

| Type | Ratio | Effect | Example |
|------|-------|--------|---------|
| **Frozen** | 0 | No time passes | Eternal moment |
| **Crawling** | 0.01-0.1 | 100-10 years pass outside per year inside | Faerie |
| **Slow** | 0.1-0.5 | 10-2 years pass outside per year inside | Most heavens |
| **Normal** | 1.0 | Same as parent | Some underworlds |
| **Fast** | 2-10 | 1 year inside = weeks outside | Training realms |
| **Rushing** | 10-100 | 1 year inside = days outside | Time prisons |
| **Subjective** | Variable | Depends on perception | Dream realms |

---

## Realm Creation

### Requirements

| Aspect | Minimum | Notes |
|--------|---------|-------|
| Spectrum Position | 0.50 for pocket, scales with size | See size table |
| Attention Cost | 10,000 - 1,000,000 | Depends on size and properties |
| Creation Time | Hours to millennia | Complex realms take longer |
| Maintenance | Ongoing attention drain | Unless self-sustaining |

### Creation Process

1. **Conception**: Define the realm's nature, purpose, and properties
2. **Anchoring**: Choose where the realm attaches to parent universe
3. **Carving**: Spend attention to "hollow out" space
4. **Shaping**: Define topology, environment, laws
5. **Stabilizing**: Establish sustainable attention sources
6. **Populating**: (Optional) Create or invite inhabitants

### Self-Sustaining Realms

A realm can become self-sustaining if:
- Mortals believe in it strongly enough (generates attention)
- It has its own presence inhabitants who maintain it
- It's been stable long enough to "crystallize"
- It's connected to a fundamental concept (death, dreams)

Self-sustaining realms persist even if original creator dies.

---

## Realm Access

### Access Methods

| Method | Who Can Use | Typical Realms | Difficulty |
|--------|-------------|----------------|------------|
| **Death** | Any mortal | Underworlds | Permanent (usually) |
| **Dream** | Dreamers | Dream realms | Easy but temporary |
| **Ritual** | Those with knowledge | Any with ritual gate | Moderate |
| **Portal** | Those who find them | Any with portals | Variable |
| **Invitation** | Invited only | Divine courts | Requires relationship |
| **Pilgrimage** | Worthy travelers | Sacred realms | Difficult journey |
| **Ascension** | Achieved beings | Celestial realms | Lifetime achievement |
| **Trance** | Shamans, mystics | Spirit worlds | Skill-based |
| **Physical Gate** | Anyone who reaches it | Some realms | Find the gate |
| **Summoning** | Realm inhabitants | Any | Requires insider help |

### Access Costs (for Living Mortals)

Much cheaper than universe crossing:

| Access Type | Attention Equivalent | Notes |
|-------------|---------------------|-------|
| Dream visit | 10-100 | Temporary, may not remember |
| Ritual gate | 100-1,000 | Requires preparation |
| Portal | 50-500 | If you can find one |
| Pilgrimage | 500-5,000 | Journey IS the cost |
| Living death | 1,000-10,000 | Risky but effective |
| Divine invitation | 0 (gift) | Relationship-based |

### Access Restrictions

Realms can be restricted by:
- **Identity**: Only X bloodline, only worshippers of Y
- **State**: Only the dead, only the dreaming, only the worthy
- **Action**: Only those who complete the trial
- **Permission**: Only those invited by the ruler
- **Knowledge**: Only those who know the way
- **Time**: Only accessible at certain moments

---

## Realm Laws

Within a realm, the ruler (or the realm's nature) can enforce special rules:

### Common Realm Laws

| Law | Effect | Example |
|-----|--------|---------|
| **No Violence** | Combat is impossible | Most heavens |
| **Truth Binding** | Lies physically impossible | Some divine courts |
| **Time Dilation** | Time flows differently | Faerie |
| **Memory Fading** | Visitors forget | Parts of underworld |
| **Emotional Amplification** | Feelings intensified | Passionate realms |
| **Physical Transformation** | Bodies change | Beast realms |
| **Dream Logic** | Causality weakened | Dream realms |
| **Judgment** | Past deeds become visible | Afterlife courts |
| **Binding Contracts** | Deals are enforced | Crossroads, fae courts |
| **No Exit** | Cannot leave without permission | Some prisons |

### Law Enforcement

Laws are enforced by:
- **Automatic**: Reality itself enforces (can't lie if lies are impossible)
- **Environmental**: The realm reacts (violence causes pain to attacker)
- **Guardians**: Entities enforce the rules
- **Ruler**: The presence personally intervenes

---

## Realm Inhabitants

### Types of Inhabitants

| Type | Origin | Permanence | Example |
|------|--------|------------|---------|
| **Native** | Born/created in realm | Permanent | Cherubim, demons |
| **Ascended** | Mortals who earned entry | Permanent | Saints, einherjar |
| **Dead** | Souls of the deceased | Permanent (usually) | Shades, ghosts |
| **Visitor** | Living travelers | Temporary | Heroes, shamans |
| **Prisoner** | Trapped by force | Until freed | Titans, damned |
| **Servant** | Created by ruler | At ruler's will | Angels, devils |
| **Wild** | Native but uncontrolled | Varies | Fae, wild spirits |

### Souls and Afterlife

When mortals die in the parent universe:
1. Soul separates from body
2. Soul is drawn toward appropriate realm based on:
   - Religious affiliation (if god has claim)
   - Moral state (if judgment-based afterlife)
   - Manner of death (drowned → sea realm, battle → warrior's hall)
   - Cultural beliefs (self-fulfilling to some extent)
3. Soul enters realm and takes appropriate form
4. Soul can potentially be:
   - Reincarnated (sent back)
   - Ascended (promoted to higher realm)
   - Destroyed (true death)
   - Rescued (retrieved by living)

---

## Realm Relationships

### Hierarchies

Realms can be nested:
```
Heaven (Infinite realm)
├── First Heaven (Kingdom)
│   ├── Garden of Paradise (Territory)
│   └── Throne Room (Domain)
├── Second Heaven (Kingdom)
└── Third Heaven (Kingdom)
    └── Holy of Holies (Pocket)
```

### Connections

Realms can be connected by:
- **Borders**: Adjacent realms share boundaries
- **Gates**: Fixed portals between specific points
- **Rivers**: Flowing connections (River Styx)
- **Paths**: Journey-routes that connect
- **Dreams**: All dream realms somewhat connected
- **Concepts**: Realms of same concept resonate

### Conflicts

Realms can:
- **War**: Rulers fight, realms clash
- **Merge**: Two realms combine
- **Consume**: Stronger realm absorbs weaker
- **Contest**: Disputed border regions
- **Blockade**: Cut off access

---

## Mortal Interaction with Realms

### The Hero's Journey

Classic mythological structure:
1. **Call**: Learn of the realm (prophecy, need)
2. **Crossing**: Enter the realm (ritual, death, gate)
3. **Trials**: Navigate realm's challenges
4. **Encounter**: Meet ruler/inhabitants
5. **Achievement**: Gain what was sought
6. **Return**: Exit the realm (often harder than entering)
7. **Transformation**: Changed by the experience

### Risks for Mortals

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Time Loss** | Return to find years passed | Know time ratio |
| **Memory Loss** | Forget mortal life | Anchoring rituals |
| **Transformation** | Body/soul changed | Divine protection |
| **Entrapment** | Cannot leave | Know exit before entering |
| **Corruption** | Nature altered by realm | Moral preparation |
| **Addiction** | Cannot bear to leave | Time limits |
| **Pursuit** | Realm denizens follow out | Proper farewell |
| **Soul Claiming** | Realm claims you | Have powerful patron |

### Bringing Things Back

Items from realms are:
- **Powerful**: Imbued with realm essence
- **Unstable**: May not work in mortal world
- **Dangerous**: May attract attention
- **Transformative**: May change the world
- **Temporary**: May fade without realm energy

---

## Realm Economy

### Attention Flow

```
[Mortal Worship] → [Presence] → [Realm Maintenance]
                                        ↓
                              [Realm Inhabitants]
                                        ↓
                              [Realm Expansion]
```

### Costs

| Activity | Attention Cost | Notes |
|----------|---------------|-------|
| Create pocket realm | 10,000 | One-time |
| Create kingdom realm | 500,000 | One-time |
| Maintain non-self-sustaining | 100/tick | Ongoing |
| Enforce special law | 50/tick per law | Ongoing |
| Grant mortal access | 10-100 | Per entry |
| Create realm inhabitant | 1,000-10,000 | One-time |
| Expand realm | 10-50% of creation cost | Scales |
| Defend from invasion | Variable | Combat |

### Self-Sustenance Threshold

A realm becomes self-sustaining when:
```
Attention from inhabitants + Belief in realm ≥ Maintenance cost × 1.5
```

Most major mythological realms are self-sustaining because so many believe in them.

---

## Integration with Other Systems

### Presence Spectrum

| Spectrum | Realm Capability |
|----------|-----------------|
| 0.50 | Create pocket realms |
| 0.60 | Create domain realms |
| 0.70 | Create territory realms |
| 0.80 | Create kingdom realms |
| 0.90 | Create infinite realms |
| 0.95 | Create realms with unique physics |
| 0.99 | Create realms indistinguishable from universes |

### Multiverse Crossing

Realms can serve as:
- **Waypoints**: Easier to hop realm-to-realm than universe-to-universe
- **Neutral Ground**: Negotiate in realms between universes
- **Bridges**: Some realms exist between universes
- **Refuges**: Hide in realms when fleeing between universes

### Universe Modification

At transcendent levels (0.95+):
- Can modify realm-universe boundaries
- Can promote realms to proto-universes
- Can collapse realms into universe
- Can create "realm-spaces" where new rules apply

---

## Example Realm Configuration

### Olympus

```typescript
const olympus: Realm = {
  name: "Olympus",
  category: "celestial",
  parentUniverseId: "greek_mythic",
  size: "kingdom",
  topology: "mountain_peak",
  timeFlow: "slow",
  timeRatio: 0.1,
  environment: "eternal_spring",
  stability: 0.95,
  accessMethods: ["ascension", "invitation", "pilgrimage"],
  accessRestrictions: [
    { type: "identity", requirement: "worshipper_or_hero" },
    { type: "permission", requirement: "god_sponsorship" }
  ],
  ruler: "zeus_presence_id",
  contested: false,
  laws: [
    { name: "hospitality_sacred", effect: "guests_protected" },
    { name: "divine_hierarchy", effect: "zeus_word_is_law" }
  ]
};
```

### Hades (Underworld)

```typescript
const hades: Realm = {
  name: "Hades",
  category: "underworld",
  parentUniverseId: "greek_mythic",
  size: "infinite",
  topology: "underground_world",
  timeFlow: "normal",
  timeRatio: 1.0,
  environment: "eternal_twilight",
  stability: 0.99,
  accessMethods: ["death", "pilgrimage", "ritual"],
  accessRestrictions: [
    { type: "state", requirement: "dead_or_sponsored" }
  ],
  ruler: "hades_presence_id",
  contested: false,
  laws: [
    { name: "no_return", effect: "dead_cannot_leave_without_permission" },
    { name: "river_binding", effect: "styx_oaths_absolute" }
  ],
  subRealms: ["elysium", "asphodel", "tartarus"]
};
```

---

## Summary

Mythological realms are the "local" supernatural geography - much more accessible than other universes, but still separate from the mortal world. They're where gods live, where souls go, where heroes journey, and where the numinous becomes tangible.

Key design principles:
1. **Cheaper than universe crossing** - Realms are meant to be visited
2. **Tied to presences** - Realms reflect their rulers
3. **Culturally significant** - Where mythology happens
4. **Mechanically distinct** - Special laws create unique gameplay
5. **Integrated with death** - Afterlife is a realm system
6. **Nestable** - Realms within realms creates depth
