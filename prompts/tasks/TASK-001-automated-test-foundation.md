# TASK-001 — Establish the Automated Unit-Test Foundation

- Status: READY
- Suggested owner: Any implementation agent (tool/model agnostic)
- Dependencies: None
- Target branch: `chore/ai-development-governance` (confirm the current integration branch with the maintainer before creating your task branch)

## Context
The application currently has a Vite + TypeScript scaffold and CI checks for typecheck, lint, formatting, and production build. It does not yet have a standard unit-test runner or a committed dependency lockfile. The project must be verifiable in headless GitHub Actions without physical devices.

Read `AI_GUIDE.md`, `DEVELOPMENT.md`, `ROADMAP.md`, `ARCHITECTURE.md`, `GAME_RULES.md`, and inspect the existing workflow and package files before editing.

## Goal
Add a minimal, reproducible unit-test foundation for pure TypeScript modules, and make CI install dependencies reproducibly.

## In scope
- Select and configure a lightweight TypeScript-compatible unit test runner suitable for Vite. Prefer Vitest unless a concrete compatibility issue is demonstrated.
- Add `test` and, if useful, `test:watch` scripts to `app/package.json`.
- Add one small deterministic example test proving the runner works. Keep it independent of DOM and game implementation.
- Generate and commit `app/package-lock.json`.
- Update GitHub Actions to use the lockfile and `npm ci` rather than unconstrained `npm install`.
- Update `app/README.md` and/or `DEVELOPMENT.md` with exact test commands.
- Keep the test runner compatible with the current TypeScript/Vite setup and supported CI Node version.

## Out of scope
- Implementing billiards physics, game rules, AI, rendering, or UI.
- Adding Playwright or browser E2E tests (separate task).
- Rewriting existing application configuration or changing the framework.
- Changing project-wide lint/format rules unless strictly required; explain any required change.

## Constraints
- Preserve the root-level demo and all existing application behavior.
- Do not introduce React, a backend, a database, or a physics library.
- Do not add tests that depend on network access, wall-clock timing, ambient randomness, GPU, or physical devices.
- Keep dependencies minimal and explain any new direct dependency.
- CI must remain headless and run on GitHub-hosted Linux runners.

## Acceptance criteria
1. `app/package-lock.json` is committed and consistent with `app/package.json`.
2. CI installs with `npm ci` from `app/`.
3. `npm test` executes the test runner and passes at least one deterministic example test.
4. Existing typecheck, lint, format check, and production build remain enabled and pass.
5. Documentation lists the commands for installing, testing, and building.
6. No unrelated game implementation or root demo changes are included.

## Required verification
From `app/`, execute and report the actual results of:
- `npm ci`
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run build`

Do not claim success for commands not executed. If local execution is unavailable, report NOT RUN and rely on the resulting GitHub Actions run as separate evidence.

## Git delivery
- Create a dedicated branch from the agreed integration branch.
- Open a PR; do not push to `main` or merge.
- Keep the diff limited to test infrastructure, lockfile, documentation, and workflow.
- In the PR description, list changed files, exact commands/results, dependency rationale, and known limitations.
