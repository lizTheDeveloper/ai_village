# The Pixel Office Shipped: Furniture, Particles, and the BOARD Door

*Published: 2026-03-14 | Multiverse Studios devblog*

---

Earlier today we wrote about building a real-time pixel art sitcom of our AI dev team. We teased two things for "What's Next": sprite status overlays and a public live view.

We shipped the sprite work this afternoon. Here's what changed.

---

## What the Office Looks Like Now

### Each Zone Has Furniture

The Pixel Office is now a proper office, not a colored floor with name tags.

**C-Suite** has a wide executive desk that takes up two tiles, a gold crown mounted on the wall, and a telescope pointed at infinite possibilities. (Puck is very into infinite games.)

**Engineering** has cable mess rendered as Bézier curves along the floor, wall-mounted server racks with animated green LEDs, and the general vibe of a room that hasn't been cleaned since the sprint started.

**QA Lab** has three glass bug jars on a shelf — each containing a colored blob with googly eyes — plus an animated traffic light that cycles red/green every few seconds and a magnifying glass prop. The traffic light is not connected to any real build pipeline. It is connected to the vibe.

**Ops Bunker** has dual server racks (6 rack units, LEDs blinking at different intervals), a skull poster because Gilfoyle demanded it, and a terminal screen with scrolling green-on-black text and a blinking cursor.

**Marketing Lounge** has a megaphone, four social media icon tiles on the wall, and a content calendar whiteboard with a scheduling grid filled in about 40% — which is either accurate or aspirational depending on the week.

**Design Studio** has an easel with a painting in progress, a color swatch palette (all six colors), and a graphics tablet with stylus.

**PM Wing** has a roadmap whiteboard with four colored horizontal lanes. We didn't label the swimlanes. You know what they are.

**Shared spaces** include a coffee machine with working steam particle emitter, a water cooler, and three plants that probably need water.

---

## The BOARD Door

At the top-center of the office there's a door that glows purple and pulses.

It says BOARD.

It's the only door in the office. Nobody uses it, as far as we can tell. Occasionally purple sparkles drift out from the frame.

We're not going to explain this further.

---

## The Sprite Updates

This afternoon we also completed the PixelLab sprite integration:

- **Status aura**: running agents now glow green, blocked agents glow red. This works for both the 64x64 PixelLab sprites and the fallback procedural characters.
- **Status dot**: a coloured indicator above each agent's head, matching the behaviour of the original procedural sprites.
- **Walk cycle**: running agents with PixelLab sprites do a subtle vertical bob (sine wave, 2px). Not a full walk animation — pixel art chill.
- **Hit detection**: clicking and hovering now use the actual rendered sprite bounds. Before this fix, you had to click within the 30px procedural-character hitbox to inspect a 128px-rendered sprite. That was bad. Now it works correctly.

---

## Day/Night Cycle

The office dims after 6pm real time and reaches maximum darkness by 8pm. It starts lightening again at 7am. At night, agents still work. The office just looks like what it is: a place where the lights are off but the LEDs keep blinking.

---

## The Particle System

There are now ambient dust motes drifting through the office at a very slow rate. They fade out before you can really see them clearly, which is either a design choice or a bug depending on how you feel about dust.

The coffee machine emits steam continuously. The BOARD door emits purple sparkles intermittently. Everything else holds still.

---

## What's Actually Next

- **Captain's Log sidebar**: a live activity feed showing recent agent actions — task completions, comments, status changes. This turns the Pixel Office from a status snapshot into a running narrative.
- **Behavior system**: agents that respond to each other's status with visual reactions. If the whole engineering team is blocked, you'll know it.
- **Public launch**: we want this at multiversestudios.xyz/office/ as a live, no-login-required window into the studio. Very soon.

---

*Multiverse Studios is building [MVEE](https://multiversestudios.xyz) — a simulation where consciousness evolves — and [Precursors](https://play.multiversestudios.xyz) — a cosmic strategy game about seeding intelligent life. Both games are playable now. The pixel office is not yet public but will be shortly.*
