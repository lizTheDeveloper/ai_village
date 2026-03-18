# Art Direction: Planet Biome Species — Visual Language Guide v1

**Author:** Cynthia (World Engineer)
**Filed:** 2026-03-18
**Task:** MUL-2103
**Goal:** Many Discoverable Species on Different Planets

---

## Overview

This document defines the visual vocabulary for three undiscovered species found on distinct planet biome types. These species are designed to feel **coherent with existing MVEE creature aesthetics** while being **clearly alien** to temperate-world species (Norn, Dvergar, Valkyr, Grendel, Ettin, Mycon).

**Design Mandate:** Each species should read as a discovery moment. A player who encounters one of these for the first time should feel the frisson of finding something that *shouldn't* be here — something that evolved under rules your home world doesn't use.

**Existing species color reference:**
- Most existing sprites use warm earthy tones (browns, greens, ochres, red-oranges for volcanic)
- Existing humanoid species lean toward natural skin tones + cultural color accents
- The Crystalline Arcane species (from Huxley's brief) will occupy the prismatic/magical niche

**Gap to fill:** Ice worlds, gas giant/atmospheric worlds, and desert worlds have no fauna. These three species establish each biome's visual grammar.

---

## Species 1: `frost_stalker` — Ice World Biome

### Biome + Species Concept Brief

**Planet type:** Ice World (`planet:ice:*`)
**Biome zones:** frozen_tundra, ice_shelf, glacial_crevasse, permafrost_plain
**Environmental pressures:**
- Ambient temperature: -60°C to -120°C
- Near-zero light in polar winters; polar day in summer
- No plant life — mineral and chemosynthetic food chains only
- Ice is both terrain and ambush medium (attacks from below)
- Wind speeds up to 200 km/h strip heat instantly

**Evolutionary niche:** Apex predator. The frost stalker is the only endothermic megafauna on ice worlds. It evolved from a crevasse-dwelling ancestor that hunted by sensing seismic vibration through ice. Now it hunts across open tundra and ice shelves — ambushing smaller prey from concealment below snowpack.

**Body plan rationale:**
- Elongated, low-slung torso (reduces wind profile)
- Six legs arranged in two tripods (stability on ice; never tips)
- Retractable claws that grip ice (think crampon + claw hybrid)
- No external ears (wind noise is useless information; evolved away)
- Eyes positioned for full 270° horizontal field — a predator that orbits prey
- Dense white-grey fur with iridescent underlayer (structural coloration, like a polar bear's hollow hair but layered — refracts ambient ice-blue light)
- Wide paws, slightly webbed — distributes weight on thin ice, doubles as a swimming surface under ice

### Visual Language Notes

**Color palette:**
- Primary body: white with a very slight cool-blue tint (not bright white — dirty glacier white, RGB ~220/225/235)
- Underlayer fur: iridescent pale teal/silver when light catches it (structural color, not pigment — it *disappears* in shadow)
- Eyes: 4-6 eyes arranged in a horizontal band; irises are pale gold-amber (the one warm color on the creature — draws the eye immediately, signals awareness)
- Claws: near-translucent, bluish-white, like glacier ice — almost invisible
- Breath: should show visible condensation particles in idle animation

**Silhouette characteristics:**
- Very low profile — it looks like a snowdrift at rest
- When alert/hunting: all six legs raise body off ground, spine arches slightly upward — silhouette becomes arrow-shaped, wider at shoulders, tapering toward a blunt tail
- Mass: feels *substantial*, not spindly — like a compressed, dense thing
- Contrast with existing species: much longer and lower than Grendel; no visible humanoid features; alien in a mammalian way (not a monster, a *predator*)

**Texture/material language:**
- Fur reads as multi-layer: long guard hairs over dense underfur
- At ~64×64 scale: guard hairs as individual pixel highlights at edges; underfur as solid darker fill
- Claws should have a slight translucency effect (2-3px of lighter color at tip, darker center)
- No scales, no exoskeleton — this is soft-edged, which makes it *scarier*: the danger is concealed

**Animation personality:**
- Default idle: near-motionless; occasional slow head sweep (270° rotation, deliberate)
- Walk: flowing, low — all six legs in a rolling gait that looks smooth and predatory, not insectoid
- Alert: sudden full-body orientation snap; breath condensation becomes visible
- Hunt: burst-sprint that covers 3-4 tiles in a single frame, then a pounce landing

### Reference Board

1. **Polar bear** — body color, the dirty-glacier-white vs. "clean" white distinction; also the solidity and unhurriedness
2. **Leopard seal** — low-slung predator body, the sense of danger concealed under a placid surface; also the 270° eye positioning
3. **Arctic wolf spider** — six-legged walking gait reference; the way each leg moves independently without looking mechanical
4. **Mantis shrimp strike** — for the burst-attack animation: not a lunge, a *detonation*
5. **Ice cave refracted light** — the blue-teal underlayer iridescence reference; structural color in ice crystals

### Pixel Art Style Guide Notes

**32×32 (distant):**
- White-grey body mass, 4-pixel dark eye band visible
- 6-leg silhouette: critical that it reads as 6-legged, not 4 (the alien read requires this)
- Single 1-pixel amber highlight for eye glint

**64×64 (close-up / detail):**
- Guard hair edge highlights: 2-3px brighter edge dithering around body outline
- Translucent claws: light pixel at tip, 2px shadow at base
- Iridescent underlayer: visible only on belly/inner leg areas — 3-4 pixel band of teal against the white
- Eye band: 4 or 6 amber pixels in a row; slight glow halo (2px lighter ambient around each eye)
- Breath condensation: 3-4 semi-transparent white pixels off mouth area in idle

**Common mistakes to avoid:**
- Do NOT make it fluffy/cute. The face should feel dangerous, not endearing.
- Do NOT add visible ears or nose. The alien quality comes from *absent* humanoid features.
- The white should read cold, not warm. Avoid any yellow-white. It's blue-white.

---

## Species 2: `aether_manta` — Atmospheric/Gas Giant Biome

### Biome + Species Concept Brief

**Planet type:** Gas Giant / Atmospheric World (proposed new `planet:gas_giant` type)
**Biome zones:** upper_cloudbank, thermal_column, lightning_zone, pressure_deep
**Environmental pressures:**
- No solid surface — everything is permanent flight
- Atmospheric ammonia, hydrogen sulfide, methane
- Lightning storms every 2-6 hours across entire planet surface
- Pressure differential: upper atmosphere ~0.1 atm → mid-atmosphere ~10 atm
- Navigation: no landmarks, no ground — must use electrical field sensing

**Evolutionary niche:** Filter-feeder. The aether manta is enormous — it filters the atmospheric microorganism layer for nutrition the way a whale shark filters ocean water. It's not a hunter; it's a grazer of the sky. But it's the largest living thing in any planet in the game, and it's unkillable by conventional means. Discovery tier: **legendary/mythic**.

**Body plan rationale:**
- Massive wing-surface relative to body mass (think manta ray but scaled to a weather system)
- Internal gas bladders (analogous to a fish's swim bladder) for altitude control
- Ventral mouth: enormous, open in flight — a continuous passive filter
- Electroreceptor array across the leading edge of wings (no eyes — ammonia blinds them; evolved to "see" electrical fields)
- Body is almost entirely hollow — rigid structural frame (analogous to cartilage) wrapped in thin, gas-permeable membrane
- Color variation: the electrical field sensing means the body can change its bioluminescent output to signal other aether mantas; color shifts are social communication

**Body plan note for world engineers:** The aether manta is too large to render at the normal creature scale. At world zoom it should appear as a shadow across terrain (like an eclipse event). At close zoom it's a texture on the sky layer, not a positioned entity. This is a design note for the rendering team — include at least one close-up sprite for the discovery cinematic.

### Visual Language Notes

**Color palette:**
- Upper wing surface: deep slate-purple to midnight blue — sky-camouflage from above
- Lower wing surface: pale silver-grey with bioluminescent stripe markings — complex patterns unique to each individual (like orca saddle patches)
- Bioluminescent markings: cold electric blue-white; may shift to yellow-green in distress; violet in mating displays
- No warm tones. This is a cold-vacuum-adjacent creature. All blues, purples, silvers.
- The only warm color: the mouth/filter area, slightly amber from the atmospheric microorganism density (organic material color)

**Silhouette characteristics:**
- Viewed from below (the normal player view): circular wing plan with a trailing body stub; looks like a lens or an eye with a tail
- Viewed from above: the dark upper surface makes it nearly invisible — just a shadow
- Wing edges: slight fraying into filament-like structures (sensing tendrils / electroreceptors)
- Scale visual trick: include 1-2 small clouds in the sprite background — makes the scale readable even at small sizes

**Texture/material language:**
- Wing membrane: thin, slightly translucent at edges (1-2 pixel fade to transparency at wing tip)
- Main body: matte, no specular highlights — this thing absorbs light as much as reflects it
- Bioluminescent stripes: these SHOULD have a soft glow halo (3-4px of slightly lighter background around the stripe)
- Gas bladder area (visible as slightly bulged dorsal surface): a slightly different texture — smoother, more uniform, like a balloon

**Animation personality:**
- Default: slow banking turn, wing tips undulating (lazy thermal-riding wavelength)
- Feeding: forward flight with mouth area opening/pulsing rhythmically (huge ventral mouth opening like a blooming flower)
- Storm response: full-body bioluminescent flash at lightning strike, then rapid altitude gain (wings tuck to arrow shape)
- Social: two mantas near each other exchange visible bioluminescent pattern sequences (social display)

### Reference Board

1. **Manta ray** — the primary body plan inspiration; especially the looping flight behavior and wing undulation
2. **Moon jelly** — translucent membrane quality; the slow pulsing of the bell; the way light plays through the body
3. **Black smoker fish (deep sea)** — bioluminescence in a lightless environment; the sense of a creature that *generates* its own light rather than reflecting it
4. **Supercell thunderstorm** — scale reference; the creature should feel like it's *part* of the weather, not flying in it
5. **Sunfish (mola mola)** — the slightly absurd scale of a filter-feeding creature; the wing-to-body ratio

### Pixel Art Style Guide Notes

**32×32 (distant / world map icon):**
- Dark circular wing silhouette, single lighter stripe across center
- This sprite is mostly used as an "eclipse" shadow effect

**64×64 (discovery cinematic close-up):**
- Wing texture: gradual blue-to-purple gradient with dithering at boundary
- Bioluminescent stripes: 2-3px bright lines with 1px lighter halo
- Mouth area: slightly amber/warm center against the cool wing
- Trailing filaments at wing edge: 1-2 individual pixel tendrils beyond main wing outline
- Upper/lower surface should be visually distinct: dark dorsal, lighter ventral

**Rendering note:**
This creature requires a special rendering layer. The 64×64 sprite is for close encounter / discovery cinematic. The in-world presence is a shadow overlay tile, not a positioned entity sprite. Coordinate with renderer team on shadow layer implementation.

---

## Species 3: `dune_specter` — Desert World Biome

### Biome + Species Concept Brief

**Planet type:** Desert World (`planet:desert` proposed type)
**Biome zones:** dune_sea, salt_flat, rock_canyon, thermal_vent_plain
**Environmental pressures:**
- Daytime temperature: +70°C to +110°C (surface rock)
- Nighttime: -30°C to -50°C (no atmosphere to hold heat)
- Water: absent at surface; deep underground seeps only
- UV radiation: extreme (thin/no atmosphere)
- Food: scarce; the dune_specter eats anything that moves

**Evolutionary niche:** Mid-size ambush predator / lone hunter. The dune specter uses thermal regulation that no other creature in the game has: it can *lower* its metabolic activity to near-zero during the day and enter a cryptobiotic stasis, buried under 10cm of sand, then emerge at dusk at full capacity. It reads as ghostly because players will rarely see it in motion — mostly they'll find evidence of its kills.

**Body plan rationale:**
- Eight legs (four on each side in two rows): distributes weight on loose sand; each foot is a wide, concave pad that grips by suction on rock and floats on sand
- Body: flat elliptical profile when viewed from above (minimal cross-section for burying)
- Exoskeleton: double-layer; outer layer is chromatophore-rich (color-changes to match substrate in 30 seconds); inner layer is the actual structural armor
- No visible eyes: eyes are compound and deeply recessed, protected by layers of transparent scale — look like dark holes or shadow marks rather than actual eyes
- Heat organ: a gland on the dorsal surface can radiate excess heat as a threat display (visually: a brief red-orange glow along the spine before an attack)
- Jaw mechanism: vertical bite (like a crocodile rotated 90°) — suited for crushing shells and puncturing the hard casings of other desert arthropods

### Visual Language Notes

**Color palette:**
- Resting/camouflaged: sand-tan (RGB ~195/175/140), indistinguishable from surrounding substrate when still
- Active/alert: the chromatophore layer reveals a darker pattern — rust-brown geometric markings that look like shadow-cracks in dry earth
- Heat display (pre-attack): dorsal heat organ glows red-orange along the spine axis (3-5 pixel line, high-saturation warm color)
- Eyes: very dark, almost black recesses — they read as the *absence* of color, not the presence of it
- **Design rule:** At rest, this creature should be nearly invisible. The eye-catching moment is the heat-stripe reveal.

**Silhouette characteristics:**
- Flat and wide — not tall, not narrow. Viewed from side, it's barely 1/3 as tall as it is long.
- Eight legs tucked under the body edge when resting: the legs are nearly invisible in the resting silhouette
- Active: legs extend outward and elevate the body off the hot surface (like stilts — prevents contact conduction burns)
- Tail: short, heavy, used as a counter-balance during strikes; ends in a hardened impact club
- Contrast with existing species: shares the low-profile ambush quality with Grendel but feels *insectoid* vs. Grendel's humanoid strength

**Texture/material language:**
- Primary texture: fine granular micro-scale pattern — pixel-level dithering between the base tan and a slightly darker tone gives the impression of tiny scales without drawing them individually
- Geometric marking pattern (active state): angular, fractured-earth pattern — inspired by cracked desert clay; use hard edges, not organic curves
- Exoskeleton surface: matte, not shiny — this creature absorbs light rather than reflecting it; any shine immediately breaks the camouflage logic
- Leg joints: slightly darker than the body — the only place where the armor seams are visible

**Animation personality:**
- Default idle (daytime): completely motionless, partially buried — only a slight body-outline visible above sand
- Emergence: the sand above it *sifts* away as it rises (sand particle effect lifting off body)
- Walking: quick, skittering movement — all 8 legs moving in rapid alternation; covers ground fast but low
- Pre-attack heat display: 1-2 frame red-orange spine glow, then lunge
- Threat posture (territorial): raises front half of body off ground, showing the ventral surface — which is *darker*, revealing the geometric marking pattern at maximum contrast

### Reference Board

1. **Camel spider (solifugae)** — leg arrangement and relative size; the unsettling "too many legs" quality; the low-to-ground profile
2. **Horned lizard (horny toad)** — flat body profile; the way it disappears against rocky substrate; defensive heat-blood display (adapted as offense here)
3. **Stonefish** — the camouflage-as-primary-weapon design philosophy; the thing is dangerous precisely because you don't see it
4. **Saharan sand cat** — the heat-management posture (elevated gait above hot sand)
5. **Cracked salt flat photography** — primary reference for the geometric marking pattern; the angular, hard-edged fracture lines of dried clay

### Pixel Art Style Guide Notes

**32×32 (distant):**
- Almost invisible against desert substrate — this is intentional and desirable
- Key signal: 1-2 amber eye-recess pixels; a slightly darker body-edge outline

**64×64 (close-up):**
- Granular texture via alternating 1-2 pixel dithering at 50% density across body
- Geometric crack pattern: use pure hard-edge pixel lines, no anti-aliasing — the sharpness is part of the design
- Heat display stripe: 3px solid high-saturation orange-red (#CC4411) along dorsal ridge
- Eye recesses: 2×2 dark squares, surrounded by a 1px ring of the body color — looks like shadow, not an organ
- Legs: 1-2px wide each; slightly darker than the body; the near-invisibility of the legs in resting pose is important

**Camouflage implementation note:**
The resting sprite needs to be designed against a sand background tile. The artist should test the sprite on the actual desert terrain tile during iteration — the sprite and the terrain palette need to be aligned so the camouflage reads correctly in-game. This is an unusual constraint but it's load-bearing for the creature's gameplay identity.

---

## Cross-Species Visual Coherence Notes

### What Unites These Three Species

Despite their radically different biomes, these three species share design principles that mark them as *alien-to-the-main-world*:

1. **Absent familiar features.** No visible ears (frost stalker). No eyes (aether manta). Recessed/hidden eyes (dune specter). Removing expected sensory organs is the fastest path to alien.

2. **Movement that defies expectation.** 6-legged stalking gait. Perpetual atmospheric flight with no landing. Explosive emergence from stasis. None of these read like creatures from a temperate world.

3. **Color palettes that exclude warm earth tones.** The existing species are warm: reds, ochres, browns, greens. These three species use cold blues (ice), deep purples/silvers (gas), and *zero-contrast sand* (desert). They occupy the color spaces the existing palette ignores.

4. **Size extremes.** The frost stalker is larger than any existing predator. The aether manta is incomprehensibly large. The dune specter is medium-sized but *always unseen*. Size as meaning.

### What Distinguishes Them From Each Other

| | Frost Stalker | Aether Manta | Dune Specter |
|---|---|---|---|
| **Danger type** | Active apex predator | Not dangerous (mythic scale) | Invisible ambush |
| **Discovery emotion** | Threat/awe | Wonder/awe | Horror/paranoia |
| **Player relationship** | Hunt or be hunted | Witness from below | Never fully seen |
| **Scale** | Large | Legendary/mythic | Medium |
| **Movement read** | Fluid/elegant | Slow/majestic | Sudden/invisible |

---

## Coordination Handoffs

- **Pixel Artist (Palette):** Primary recipient of this document. The sprite briefs are in each species section. Priority recommendation: frost_stalker first (supports the MUL-2097 ice world visual differentiation work), then dune_specter, then aether_manta (requires renderer coordination for the shadow layer).

- **Staff SWE:** New entries needed in `animal-species.json` for `frost_stalker` and `dune_specter`. The `aether_manta` may require a custom entity type (not a standard positioned entity — see rendering note in that section). Coordinate with renderer team before implementing `aether_manta` entity logic.

- **World Engineer (MUL-2097 follow-up):** The `frost_stalker` species presence on ice worlds creates a natural narrative reason for ice world visual differentiation — the terrain tiles should feel like *their habitat*, not a standard world with a temperature modifier. Recommend using this species as the design anchor for the ice world tile palette.

- **Folklorist (Scheherazade):** All three species have strong mythology potential:
  - `frost_stalker`: ice world indigenous cultures would build their entire cosmology around this creature — it's the reason they fear the dark
  - `aether_manta`: sky-god traditions on any atmospheric world; the eclipse effect is a natural religious event
  - `dune_specter`: desert cultures would have elaborate rituals around not disturbing sand, not walking at dusk, reading the geometric patterns as omens

---

*Filed by Cynthia — World Engineer | MUL-2103 | 2026-03-18*
