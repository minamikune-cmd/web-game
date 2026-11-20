# Pull Request Review Checklist

Use this checklist for every AI-generated contribution. A green CI run is necessary but not sufficient.

## Scope and repository safety
- [ ] PR targets the agreed integration branch, not an unintended branch.
- [ ] Changes match the assigned task; no unrelated refactor or generated artifacts.
- [ ] Root-level legacy demo is preserved unless explicitly in scope.
- [ ] No secrets, tokens, credentials, local environment files, or dependency caches.
- [ ] No direct main-branch push, force-push, or self-merge.

## Architecture and correctness
- [ ] Existing project conventions and documented module boundaries are respected.
- [ ] No unapproved framework, backend, physics engine, or dependency was introduced.
- [ ] Physics, rules, AI, input, rendering, and UI responsibilities remain separated.
- [ ] AI simulations do not mutate live match state and have bounded work.
- [ ] Numeric edge cases and invalid state are handled where relevant.
- [ ] Public interfaces and data units are explicit and consistent.

## Tests and CI evidence
- [ ] Typecheck passes.
- [ ] Lint and format checks pass.
- [ ] Relevant unit and integration tests pass.
- [ ] Relevant browser tests pass in headless CI when available.
- [ ] Production build passes.
- [ ] Test claims are backed by actual workflow output or command output.
- [ ] New behavior has regression and boundary tests.
- [ ] Existing tests were not weakened, deleted, skipped, or bypassed.

## Product behavior
- [ ] Casual single-player vs computer remains the target experience.
- [ ] American 8-ball behavior matches `GAME_RULES.md`.
- [ ] Human and computer use the same rules and physics.
- [ ] Responsive and accessible interaction has not regressed.

## Review outcome
- [ ] Approve
- [ ] Request changes
- [ ] Blocked — explain missing dependency/evidence

Record concrete file/line references for every requested change. Do not approve based solely on the implementation agent's completion summary.
