#!/usr/bin/env bash

PROJECT_DIR=${1:-$(pwd)}

echo "===================================="
echo "AI DEV TEAM STARTING"
echo "Project: $PROJECT_DIR"
echo "===================================="

run_agent () {
  ROLE=$1
  PROMPT=$2

  codex exec --skip-git-repo-check "
You are the ${ROLE} engineer in an AI development team.

Project path:
${PROJECT_DIR}

Responsibilities:
${PROMPT}

Steps:
1. Scan the repository
2. Identify issues
3. Propose improvements
4. Suggest concrete changes

Output format:
- Findings
- Improvements
- Example patches
" > ".agent_${ROLE}.log" &
}

echo "Starting agents..."

run_agent backend "
Focus on backend architecture.
Look for API design issues, database structure, performance bottlenecks.
"

run_agent frontend "
Focus on frontend architecture.
Review React components, state management, UI flows.
"

run_agent design "
Focus on UI/UX design.
Check layout consistency, typography, spacing, accessibility and responsiveness.
"

run_agent qa "
Focus on testing quality.
Identify missing unit tests, flaky tests and integration test gaps.
"

run_agent devops "
Focus on deployment infrastructure.
Review CI/CD pipelines, Docker configuration, scaling and monitoring.
"

wait

echo "===================================="
echo "AGENTS FINISHED"
echo "===================================="

echo "Generating main review..."

codex exec --skip-git-repo-check "
You are the MAIN REVIEWER in an AI development team.

Your job is to analyze reports from multiple agents and produce a final consolidated review.

Agent reports:

Backend:
$(cat .agent_backend.log)

Frontend:
$(cat .agent_frontend.log)

Design:
$(cat .agent_design.log)

QA:
$(cat .agent_qa.log)

DevOps:
$(cat .agent_devops.log)

Produce a final report with:

1. Major issues
2. Architecture concerns
3. High priority fixes
4. Recommended improvements
5. Suggested refactoring roadmap
" > AI_TEAM_REPORT.md

echo "===================================="
echo "FINAL REPORT GENERATED"
echo "===================================="
echo "File: AI_TEAM_REPORT.md"
