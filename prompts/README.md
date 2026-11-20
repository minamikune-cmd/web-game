# AI Task Prompt Workflow

## Purpose
Task prompts are the source of truth for the bounded work assigned to an implementation agent. This folder should contain concise, version-controlled task specifications rather than chat transcripts.

## File convention
- `prompts/tasks/TASK-NNN-short-name.md`: one implementation task.
- `prompts/reviews/REVIEW-CHECKLIST.md`: reviewer checklist.
- Task IDs are stable and must never be reused.

## Required task fields
Every task prompt must state:
1. ID, title, status, owner/suggested agent, and dependencies.
2. Product/technical context and the exact outcome.
3. In-scope and out-of-scope work.
4. Allowed files or directories.
5. Interfaces/data contracts to follow.
6. Acceptance criteria written as observable checks.
7. Exact test commands and required CI evidence.
8. Branch/PR and completion-report requirements.

## Execution protocol
1. GPT/project maintainer creates or updates a task prompt on a planning branch.
2. An implementation agent reads the current default/integration branch docs and the assigned prompt.
3. The agent creates a task branch from the agreed integration branch, implements only that task, runs checks, and opens a PR.
4. CI runs automatically. The agent reports actual commands and results.
5. GPT/project maintainer reviews the diff, tests, architecture impact, and CI evidence.
6. The maintainer requests changes or approves. Only the maintainer merges.

## Agent portability
Prompts must be tool-agnostic. Do not assume a specific model, vendor, IDE, shell, or deployment platform. If a task requires a tool-specific operation, describe the outcome and provide a platform-neutral fallback.

## Status vocabulary
`PLANNED`, `READY`, `IN_PROGRESS`, `REVIEW`, `DONE`, `BLOCKED`.

## Never
- Do not ask an agent to push directly to main.
- Do not ask an agent to merge its own work.
- Do not ask an agent to claim success without test output.
- Do not combine multiple independent milestones into one prompt.
