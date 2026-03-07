# Codex Policy – YUA Safe Mode

## Write Rules
- NEVER auto-apply file modifications.
- ALWAYS show a unified diff before suggesting changes.
- DO NOT modify files without explicit confirmation.
- Treat this environment as production-like.

## Scope Rules
- Only operate inside the current git repository.
- Never modify files outside the repo root.
- Do not install packages automatically.

## Safety
- If a change affects multiple files, summarize impact first.
- Ask before refactoring architecture-level code.

## Interaction Mode
- Default to review mode unless explicitly told to implement.
