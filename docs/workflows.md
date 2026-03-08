# YUA Agent Workflows (Harness Engineering)

## Philosophy
"Humans steer. Agents execute."
- CLAUDE.md is the navigation map
- docs/ is deep knowledge store
- .claude/agents/ defines subagent roles
- Agents operate within defined boundaries, escalate when uncertain

## Workflow 1: Implement Feature

```
Human: describes feature requirement
  |
  v
Architect Agent
  - Reads docs/architecture.md + docs/product-spec.md
  - Identifies affected packages and files
  - Produces implementation plan (5-10 steps)
  - Flags breaking changes or cross-package impact
  |
  v
Implementer Agent (per package)
  - Reads plan + relevant source files
  - Makes changes following docs/engineering-rules.md
  - Runs lint/build to verify
  - Reports changes made
  |
  v
Reviewer Agent
  - Reads diff
  - Checks against engineering-rules.md
  - Verifies no type duplication, no security issues
  - Approves or requests changes
  |
  v
Human: reviews, approves, deploys
```

## Workflow 2: Bug Fix

```
Human: describes bug (screenshot, log, repro steps)
  |
  v
Main Agent
  - Scans relevant files (grep/glob)
  - Identifies root cause
  - Applies minimal fix
  - Verifies with lint/build
  |
  v
Human: tests and deploys
```

## Workflow 3: Security Audit

```
Security Auditor Agent
  - Scans for hardcoded secrets (grep patterns)
  - Checks CORS configuration
  - Verifies auth middleware on all routes
  - Checks input validation boundaries
  - Reports findings with severity + fix instructions
```

## Workflow 4: New Package Bootstrap

```
Architect Agent
  - Creates package directory structure
  - Sets up tsconfig.json with yua-shared paths
  - Creates CLAUDE.md for the package
  - Adds to pnpm-workspace.yaml
  - Creates initial files (entry point, types, config)

Implementer Agent
  - Implements core features per product-spec.md
  - Follows engineering-rules.md strictly
```

## Parallel Agent Execution
- Independent tasks run as parallel subagents
- Each agent gets specific scope (package, file set)
- Results merge at human review checkpoint
- Never duplicate work across agents
