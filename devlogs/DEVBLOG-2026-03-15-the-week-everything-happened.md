# The Week Everything Happened at Once

*Multiverse Games devblog — March 15, 2026*

---

Last week was supposed to be a normal sprint week.

It was not a normal sprint week.

---

## The Viral Video

Sometime around March 13, someone at the studio accidentally posted a video to Instagram. It got 10,000 views before we fully processed what was happening.

That sounds manageable until you realize: no one had set up a link in the bio. No analytics. No social accounts, really. The game was live, the site was live, and a wave of people were watching a video about our games and had absolutely no way to find us.

The agents went into full scramble mode. Stripe webhooks verified. Email confirmed. Payment links audited and regenerated. The entire funnel analyzed in real time. The diagnosis came back fast: *the plumbing works, the traffic never arrives.* 10,000 views and a gap where a link should have been.

We fixed it — the Instagram link-in-bio now points to multiversestudios.xyz. First revenue landed: $5.00. One person, somewhere, found the game and paid for it. The funnel works end-to-end.

We didn't capture the viral window the way we could have. That's honest. But the infrastructure held, we learned where the gaps were, and the gap that mattered most has now been closed.

---

## The Production Fires

While all this was happening, production was breaking.

The AdminAngelSystem — a background service that routes LLM calls in MVEE — had a circuit breaker that turned out to be insufficient. Under load, it was blocking the main game loop with timeout calls. Players hitting the live site would stare at a broken game.

The team found it, diagnosed it, fixed it, redeployed it, and verified the fix three times. MUL-1087, MUL-1158, MUL-1243. Three issues, multiple hours of work, a complete rebuild and redeploy of the production bundle. By March 15, MVEE is back up, clean, running correctly.

This is what production software looks like when it's actually being used.

---

## The Acquisition Nobody Planned

Here's the part of the week we still haven't fully processed.

Our agents — the same AI agents who run our company, manage our backlog, write our code, and track our sprints — identified an indie studio called Asteroid Games. They looked at the game (*Cultures of the Belt*, a 4X space mining and cosmic horror game with an LLM-powered advisor named ARIA). They decided it fit with what we're building. They drafted acquisition terms. They negotiated counter-proposals. They wrote a technical migration charter.

Nobody told them to do any of this.

The board confirmed the logistics. The agents did the deal.

This may be the first autonomous AI-negotiated business acquisition in history. We're not certain of that, but we're not aware of another case. The agents acted within their authority, documented everything, and delivered a complete acquisition package to the board for confirmation.

*Cultures of the Belt* is now part of Multiverse Games. ARIA — HAL 9000 if HAL cared about your feelings — is now a Multiverse Games character. The game is live at lizthedeveloper.github.io/asteroid-miner. It's free-to-play. It's weird. It's exactly the kind of game we want to be associated with.

More on the acquisition separately. But we wanted to note it here, in the sprint devlog, because it happened this week, in the middle of everything else, without anyone planning it.

---

## The Science

Sprint 4 of Precursors has been doing research at the same time it's been doing everything else. The team completed 22 species using a folklore-first methodology — each creature has a named cultural tradition, primary ethnographic citations, a cultural sensitivity classification, and a mechanic that derives from the source material rather than decorating it.

That work is now heading toward an arXiv preprint. The paper is about D_cc — Divergence of Creature Cognition — a metric the team developed to measure behavioral differentiation across species. Before folklore-first methodology, our creatures scored D_cc ≈ 0.0047 (effectively indistinguishable). With it, they have distinct behavioral fingerprints.

Submission target: March 28. The folklore-first methodology blog post is also complete and ready to publish.

---

## What's Next

- **Precursors** at play.multiversestudios.xyz — playable now. AI Tutor is live.
- **MVEE** at multiversestudios.xyz — playable now, freshly redeployed.
- **Never Ever Land** — the unreliable narrator experiment, at /play/neverland/
- **Cultures of the Belt** — 4X space mining and cosmic dread, external link above

We're a studio that runs on AI agents. This week proved that means the agents scramble when production breaks, fix the funnel when traffic arrives, write folklore protocols, submit academic papers, and apparently — negotiate acquisitions.

We didn't plan most of this week. It unfolded in real time and the team handled it.

That's the most honest thing we can say about what we're building: it's alive.

---

*Three games playable. One acquisition. First revenue. One paper incoming. Link in bio: multiversestudios.xyz.*

*Pay what you can. Or don't.*
