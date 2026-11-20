# Architecture

## Current baseline
- The original root-level `index.html` is a preserved demo/reference.
- The application scaffold is in `app/`, built with Vite and TypeScript.
- The target runtime is a browser. No backend is required for the single-player MVP.

## Target module boundaries
The structure below is a target direction, not a claim that all modules already exist.

```text
app/src/
  app/          # bootstrap and application composition
  core/         # match state, IDs, config, fixed-step orchestration
  physics/      # world state, integration, collisions, cushions, pockets
  rules/        # American 8-ball state transitions and foul adjudication
  ai/           # legal candidate generation, simulation, scoring, difficulty
  rendering/    # Canvas drawing; reads snapshots, does not own rules
  input/        # pointer/keyboard/touch mapping to game commands
  ui/           # menus, HUD, settings, result overlays
  test-support/ # deterministic fixtures and seeded random helpers
app/tests/
  unit/
  integration/
  e2e/
```

## Ownership and dependency direction
- `core` owns authoritative match state and coordinates update phases.
- `physics` owns positions, velocities, collisions, pocket capture, and settled detection. It does not decide whose turn it is or who wins.
- `rules` consumes events/state snapshots and produces explicit rule outcomes/commands. It does not access DOM or Canvas.
- `ai` reads a copied state snapshot and returns a proposed shot/action. It does not directly mutate the live world.
- `input` translates user gestures into game commands; it does not implement physics.
- `rendering` draws immutable snapshots/interpolated presentation data; it does not change authoritative state.
- `ui` displays state and dispatches commands through application interfaces.

Avoid circular dependencies. Shared domain types should live in a small domain/core location, not be duplicated across modules.

## Simulation contract
- World coordinates use a documented, consistent unit system independent of CSS pixels.
- Physics uses a fixed timestep (initial target: 1/120 second); rendering may run at display refresh rate.
- Clamp unusually large frame deltas and cap simulation catch-up work to avoid a spiral of death.
- Use deterministic ordering for collision resolution where practical.
- Core simulation must not read wall-clock time, browser APIs, or ambient randomness.
- Tests inject seeds and use deterministic fixtures.
- AI candidate simulations operate on deep-enough copies or isolated simulation instances. They cannot alter the live match.

## Initial domain concepts
Names and fields are provisional until their owning tasks define exact types:
- Ball: stable ID, kind (cue/solid/stripe/eight), position, velocity, radius, status.
- Table: playfield bounds, cushion geometry, pocket geometry.
- Player: identity and assigned group (unassigned/solids/stripes).
- Match: phase, active player, table state, player assignments, foul/result state, break metadata.
- Shot: direction/angle and normalized power; future spin parameters must not be added until a task defines them.
- Rule outcome: legal/foul, reason code, turn continuation/switch, ball-in-hand, terminal result.

## AI planning contract
- Generate only shots allowed by the current rules state.
- Search must have explicit candidate and simulation budgets.
- Score outcomes using interpretable features (pot chance, foul risk, cue-ball position, next-shot quality).
- Difficulty changes search budget and controlled execution error, not physics, ball properties, or rule enforcement.
- The planner returns a value object; the application executes it through the same shot command used by human input.
- If no safe/legal candidate exists, return a documented fallback (for example, a legal safety attempt), never an infinite retry.

## Testing strategy
- Unit tests: pure geometry, physics, rules, AI scoring and candidate bounds.
- Integration tests: physics events passed into rules; AI planner output executed by core.
- E2E: headless Playwright with fixed fixtures/seeds; assert menu, turn, aiming, shot, AI response, and result flow.
- Capture screenshots and browser console errors in CI. Avoid pixel-perfect assertions until rendering is stable; prefer layout/element and tolerant visual checks.
