# AI Collaboration Guide

This document is the mandatory operating contract for every AI or human contributor.

## Product contract
- Build a casual, single-player American 8-ball pool game against a computer opponent.
- The original root-level `index.html` demo is a read-only reference unless a task explicitly says otherwise.
- The production application lives in `app/` and currently uses Vite + TypeScript + Canvas 2D with HTML/CSS for interface elements.
- Prioritize deterministic, automated validation. No physical pool table, controller, mobile device, or manual hardware test may be required for acceptance.

## Before work
1. Read this guide, `DEVELOPMENT.md`, `ROADMAP.md`, `ARCHITECTURE.md`, `GAME_RULES.md`, and the assigned task.
2. Inspect current code, package scripts, recent commits, and existing tests. Do not assume documents describe code that has not yet been implemented.
3. If requirements conflict or a required interface is missing, stop and report the conflict instead of inventing a project-wide decision.

## Scope and architecture
- Implement only the assigned task and its acceptance criteria.
- Preserve TypeScript + Vite + Canvas 2D. Do not introduce React, a server, a database, or a physics framework without explicit approval.
- Keep physics, rules, AI decision-making, rendering, input, and UI separated.
- The renderer must not own game rules or mutate physics state.
- Rules must not depend on Canvas, DOM, or browser rendering.
- The AI must use the same legal shot and physics interfaces as the human player. No hidden physics advantages.
- Simulations for AI search must use isolated/copyable state and must never mutate the live match.
- Prefer small deterministic functions and explicit units. Document coordinate systems and time units.
- Avoid premature abstraction, unrelated refactors, and unnecessary dependencies.

## Engineering quality
- Keep TypeScript strict; avoid `any` unless justified and isolated.
- Validate numeric inputs; guard against NaN, Infinity, negative radii, invalid IDs, and impossible states.
- Use fixed-step simulation for physics. Rendering frame rate must not determine physics outcomes.
- Avoid unbounded loops and unbounded AI search. Every search needs a deterministic budget or termination condition.
- Make randomness injectable/seedable in tests. Do not make core simulation depend on ambient randomness or wall-clock time.
- Keep accessibility and responsive layout in mind; keyboard and touch support should not be blocked by mouse-first design.

## Tests and evidence
Run the relevant commands from `app/` and report the exact commands and outcomes:
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm test` when a test script exists
- `npm run build`
- Relevant Playwright/browser tests when available

Never claim a check passed unless it was actually executed. If unavailable, say NOT RUN and explain why. Never delete, weaken, skip, or loosen a test simply to get a green result. Add regression tests for bug fixes and boundary conditions for new logic.

The CI environment must be headless and reproducible. Browser tests should use Playwright in CI, deterministic fixtures, fixed seeds, and screenshots/artifacts where useful. Do not require GPU-specific behavior.

## Git and review
- Use a dedicated task branch and open a Pull Request to the designated integration branch.
- Never push directly to `main`, force-push, or rewrite shared history.
- Keep changes focused. Do not bundle unrelated tasks.
- Never commit secrets, tokens, credentials, local environment files, generated build output, or dependency caches.
- Do not merge your own PR or change branch protection / CI policy.
- Preserve task prompt files and report any mismatch between prompt and implementation.

## Completion report
Include: summary; files changed; decisions and assumptions; exact tests/commands and results; known limitations; follow-up risks. Link the branch/PR if available. A code change is not complete merely because it compiles or because the agent says it is complete.

## Reviewer authority
The project reviewer (GPT / designated maintainer) decides whether acceptance criteria are met. The implementation agent must wait for review before merge.
