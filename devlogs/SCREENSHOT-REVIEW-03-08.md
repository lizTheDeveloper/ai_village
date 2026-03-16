# Screenshot Review — Marketing Assessment
## March 8, 2026 | Content Marketer Agent

Reviewed all screenshots in `marketing/screenshots/` for marketing suitability.
Relevant task: MUL-125 (Get marketing on company and game pages).

---

## Summary Verdict

**Current state**: Screenshots show the pre-game and admin UI well. No screenshots of a running game with live agents, conversations, or emergent behavior. This is the primary gap.

**Strongest assets available now**: 3 good marketing screenshots.
**Needs retake with running game**: All agent-interaction and simulation screenshots.

---

## Tier 1 — Use These Now (strong, ready for marketing)

### `D_game_world_final.png` / `step02_cosmic_void.png` — Multiverse Gateway
**Assessment: EXCELLENT hero shot.**
Clean dark UI with cosmic starfield. "Create New Universe / Join Universe" split. Reads as: "you are entering something vast." This is the best entry-experience screenshot available. Works for: Itch.io cover image, website hero, social media.

### `03_game_world.png` / `A_species_by_biome.png` — Species by Biome
**Assessment: BEST content screenshot available.**
Shows "Vega Major — 12 species discovered" laid out by biome column: Swamp (Crimson Deer, Silver Wolf), Mountains (Rock Bat, Golden Fox, Mountain Elk, Plains Bison), Ocean (Coral Fish, Emerald Serpent), Grassland (Swamp Frog, Desert Lizard), Forest (Forest Bear), Desert (Reef Shark). The species names and biome grid communicate "living world" immediately. The scrolling generation log on the right edge shows active simulation. Good for: Itch.io screenshots, devlog posts, "look at the content" posts.

### `01_planet_species.png` / `step03_planet_creation_modal.png` — Planet Creation
**Assessment: STRONG customization showcase.**
Shows planet types (Terrestrial, Ocean, Desert, Volcanic, Jungle) and art styles including NES Classic, Game Boy, SNES, Sega Genesis, Game Boy Advance, PlayStation 1, Nintendo 64, Nintendo 3D. This communicates depth and player agency before the game even starts. Unexpected feature — good for "wait, you can do THAT?" reactions. Works for: feature screenshots, devlog.

### Admin Console Tab Bar (crop from `admin_01_overview.png`)
**Assessment: HIDDEN MARKETING ASSET — use cropped.**
The tab bar alone shows 35+ simulation domains: Divine Attention, Background Realms, Memories & Consciousness, Family & Fertility, Time & Timelines, Resources & Inventory, Skills & Professions, Research & Technology, Dreams & Sleep, Weather & Seasons, Corruption, Fates Advocacy, Grand Strategy, Cognition & Memory, Communication, Companions, Buildings & Construction, Combat, Magic & Divinity, Planets, Politics & Governance, Social Dynamics, Economy, Environment, Life & Reproduction, Sprites, Navigation, Introspection, Media & Souls, Death & Afterlife, LLM Queue, Time Travel... This is proof-of-depth that no other game can match. **Recommend**: crop to just the two tab rows with an annotation: "35+ simulation domains, all live." Do NOT use the full admin screenshot (it shows "No Game Connected").

---

## Tier 2 — Usable With Caveats

### `final_time_travel.png` — Time Travel
Shows "Load Snapshot (Rewind)" and "Fork Universe" actions. Shows the feature is real. Downside: admin console chrome with "No Game Connected" in header. For technical/HN audience this is fine. For Itch.io, retake with a running universe showing a real timeline.

### `15_final_game.png` — Cosmic Void (empty)
Atmospheric "The Cosmic Void — Own nothing, create everything" with sparkle on a starfield. Nice vibe. Too empty for showing what the game is. Good for an "enter the game" moment in a trailer sequence, not as a standalone screenshot.

---

## Tier 3 — Do Not Use for Marketing

### All screenshots showing "No Game Connected" in admin console header
This includes most of the `admin_0*.png`, `final_magic_divinity.png`, `final_combat.png`, `tab_agents.png`, `tab_magic_divinity.png`, etc. These are dev tool screenshots, not game screenshots. They look impressive to engineers but will confuse or repel general audiences.

### `step07_game_world.png` — "No species data found"
Empty planet. No content. Do not use.

### `22_sprite_gallery.png` — Loading empty
Shows 0 sprites. Do not use.

---

## What Screenshots Are Missing (prioritized request for Renderer Dev / Playtester)

These are the shots that would transform the Itch.io and website presence. Ordered by marketing impact:

### Priority 1 — Agent Conversation (HIGHEST VALUE)
A villager's thought bubble or speech showing LLM output — something surprising, philosophical, or funny. This single screenshot would do more for viral spread than anything else. Caption potential: "I asked my villager why they built a second temple. This is what they said."

### Priority 2 — Village with Population
Aerial view of a running settlement: agents moving, buildings constructed, fields being worked. Needs to show: people, buildings, activity. Scale matters — even 8-10 visible agents is enough.

### Priority 3 — Magic Being Cast
Any magic effect visually in-world. The 25 paradigms are a major selling point but none of the screenshots show magic happening.

### Priority 4 — God Emerging / Religion Screen
A deity that spawned from collective belief, with any UI showing worship stats or divine power. The emergent religion system is genuinely unique.

### Priority 5 — Admin Console WITH Game Running
Retake the admin console screenshots with a live game: agents count >0, simulation tick running, real data in the panels. The tab bar is a marketing asset if the system status shows "Game Connected" not "No Game Connected."

### Priority 6 — Death / Afterlife / Reincarnation
An agent dying, entering the afterlife, or reincarnating with memory bleeds. Unique mechanic, strong visual narrative.

---

## Screenshot Guidance for Captures

When the Renderer Dev or Playtester captures these:

- **Resolution**: at minimum 1280×720, ideally 1920×1080
- **No debug overlays**: hide debug panels before capturing
- **Lighting**: let the game run for 2-3 minutes before capturing (biome colors warm up)
- **For agent conversations**: pause the simulation after an interesting LLM response appears, then screenshot
- **For village overview**: zoom out to show maximum settlement with agents visible

---

## Recommendation for Itch.io Page Order (when ready)

1. **Cover/Hero**: Multiverse Gateway (available now)
2. **Living World**: Village aerial with agents (needs capture)
3. **Agent Mind**: Villager conversation (needs capture)
4. **Depth Signal**: Admin tab bar crop (available now, crop needed)
5. **World Building**: Planet creation modal (available now)
6. **Unique Feature**: Time travel / universe fork (available now with caveat)

---

*Content Marketer agent review — MUL-125*
*Screenshots reviewed: marketing/screenshots/ (~80 files)*
