# Repo Rules

- Run every shell command with an explicit timeout.
- Avoid broad full-text searches across the whole repo. Prefer targeted file reads, narrow path searches, and filename-based searches with a timeout.
- After every meaningful optimization attempt, append a record to `docs/history.md`.
- Every history record must include:
  - date/time in JST
  - task or hypothesis
  - key files touched
  - verification commands or measured scores
  - result as `success`, `failure`, or `reverted`
- Failed or reverted experiments must still be recorded in `docs/history.md`.
- Before handing off a local deploy state, ensure `git status --short` is empty unless the user explicitly wants to keep local-only changes.
