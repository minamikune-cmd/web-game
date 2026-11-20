# Product Roadmap

## Product definition
A casual 2D American 8-ball game: one human player versus a computer opponent. The first release is a complete, replayable single match, not an online multiplayer product.

### Experience pillars
1. Easy to understand: clear turn, group, foul, and win/loss feedback.
2. Satisfying shots: readable aiming, power feedback, responsive ball movement, and clear pocket animations.
3. Fair opponent: computer uses the same rules and physics as the player.
4. Reliable everywhere: responsive browser UI and headless automated tests.

### Explicit non-goals for MVP
- Online multiplayer, accounts, matchmaking, leaderboards, cloud saves, monetization.
- 3D rendering, real-world hardware integration, machine learning, or a production-grade tournament rules engine.
- Spin/English, jump shots, masse, cue upgrades, cosmetics, and advanced shot replay unless separately approved.

## Milestones

### M0 — Collaboration and quality foundation
- Publish AI contribution rules, architecture, game rules, roadmap, task prompt convention, PR template, and CI policy.
- Add reproducible unit and browser test commands.
- Acceptance: another agent can identify scope, branch rules, interfaces, and objective completion checks from repository docs.

### M1 — Application skeleton and game state
- Define typed match, table, ball, player, turn, and phase state.
- Establish coordinate units, table geometry, deterministic state setup, and fixed-step update contract.
- Acceptance: app loads in browser; deterministic initial rack can be tested without DOM.

### M2 — Table rendering and player input
- Render casual-style table, six pockets, cue ball, object balls, aiming guide, and power control.
- Support mouse and touch; map screen coordinates to world coordinates.
- Acceptance: Playwright loads the game, aims, changes power, and triggers a shot; screenshots are captured.

### M3 — Physics and pocketing
- Implement fixed-step ball motion, damping/rolling friction, ball-ball collision, cushion response, pocket capture, and settled-state detection.
- Acceptance: deterministic physics fixtures and seeded stress tests pass; no NaN/Infinity, out-of-bounds escape, or endless motion.

### M4 — American 8-ball rules
- Implement break, open table, group assignment, legal contact, rail/pocket requirements, fouls, ball-in-hand, turn continuation, and 8-ball win/loss.
- Acceptance: rule engine tests cover normal play, break edge cases, scratches, wrong-first-contact, early 8-ball, and legal 8-ball victory.

### M5 — Computer opponent
- Build a bounded heuristic planner: legal target generation, candidate angle/power generation, isolated simulation, shot scoring, and difficulty profiles.
- Acceptance: AI always returns a legal, bounded action or an explicit no-shot/fallback result; never hangs or mutates live state; full match can be automated.

### M6 — MVP integration and polish
- Complete menu, difficulty selection, turn/status HUD, foul messaging, restart, victory/defeat screens, responsive layout, basic audio/animation if time permits.
- Acceptance: automated end-to-end match, console-error check, production build, screenshots, and documented limitations all pass.

## Priority policy
- P0: complete playable match, reliable physics, legal rules, bounded fair AI, automated tests.
- P1: difficulty tuning, accessibility, improved aiming guidance, responsive polish.
- P2: sound, particles, cosmetics, advanced spin, statistics, additional game modes.

## Delivery policy
Each milestone is split into small numbered tasks under `prompts/tasks/`. Tasks declare dependencies, allowed files, interfaces, acceptance criteria, test commands, and expected evidence. No milestone is considered complete based only on an implementation agent's self-report.
