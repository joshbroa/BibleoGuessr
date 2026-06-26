# AGENTS.md — Antigravity Workspace Rules & Directives

This file outlines the engineering standards, architecture rules, and operational guardrails for all autonomous agents operating within this web application workspace using **Google Antigravity 2.0**. All subagents must parse and strictly follow these rules during exploration, planning, and execution phases.

---

## 1. Core Operating Paradigm & Worktree Management

Autonomous execution must follow a strict **Triple-Phase Loop** to prevent architectural drift and context pollution across simultaneous environments.

```
[1. Exploration] ➔ [2. Implementation Plan] ➔ [3. Execution & Verification]
(Read/Analyze)        (Artifact Review)         (Local Terminal & Headless)
```

1. **Exploration**: Survey existing routes, schemas, and components inside the current active **Git Worktree**. Do not stray into or scan sibling worktree paths unless explicitly instructed. Match imports to current project versions.
2. **Planning**: Generate an **Implementation Plan** artifact mapping files to modify, new dependencies required, and potential breaking points. Ensure the plan isolates changes to the dedicated worktree branch. Seek human checkpoint clearance before proceeding.
3. **Execution & Manual Verification**: Implement changes. Instantly trigger local terminal-driven verification loops. **Note: Integrated browser-sandbox tools are fully disabled.** All front-end verification must rely on automated headless integration tests, console assertions, or explicit human validation requests.

---

## 2. Web Application Architecture Standards

### Frontend Guardrails
- **Component Pattern**: Use modular, isolated functional components. Maintain clean separation of state and UI presentation.
- **Verification Alternative**: Because active browser sandbox automation is disabled, rely strictly on component snapshot tests, automated Jest/Vitest assertions, and explicit instruction to the user to visually inspect layouts.
- **Accessibility (a11y)**: All markup must feature descriptive `aria-*` tags, appropriate semantic elements, and satisfy contrast checks using static analysis tools.

### Backend & API Guardrails
- **Type Safety**: Maintain absolute type safety across the full stack. Never pass unvalidated dynamic variables into database queries.
- **Error Boundaries**: Wrap critical routes and async handlers in explicit try/catch blocks. Gracefully route exceptions to error-handling middleware.
- **Database Scope**: Do not write raw queries in view layers. Route database manipulation through the dedicated Model/Data layer or use registered Model Context Protocol (MCP) database clients securely.

---

## 3. Tool Access, Context Boundaries & Worktrees

To ensure efficient token management, safe execution, and clean concurrency control across multiple worktrees, agents must adhere to the following file boundary rules:

| Domain Namespace | Permitted File Modifiers | Restricted Directories / States |
| :--- | :--- | :--- |
| `frontend` | `src/components/**/*`, `src/pages/**/*` | `server/`, `prisma/`, Sibling Worktrees |
| `backend` | `server/routes/**/*`, `server/controllers/**/*` | `src/components/`, Sibling Worktrees |
| `database` | `prisma/schema.prisma`, `server/models/**/*` | Front-end asset folders, Sibling Worktrees |

- **Worktree Isolation**: Never look outside the immediate workspace root boundary path. Be highly selective with multi-directory searching to avoid leaking context from other checked-out branches or parallel worktrees.
- **Token Economy**: Avoid scanning large compressed builds, `node_modules/`, or log files. Use lazy-loading gateways and fine-tune context compaction safely when nearing the 135k token threshold.

---

## 4. Verification & Testing Playbook

- **Pre-Flight Check**: Verify that a local test file or test suite block exists matching the workspace route being altered. If absent, **write a test suite first**.
- **Automated Execution**: Run local terminal commands inside the Antigravity workspace terminal to verify builds automatically (e.g., `npm run build`, `npm test`, or `pytest`).
- **Loop Interruption**: If terminal testing generates consecutive failures, freeze execution loops immediately. Do not guess fixes continuously. Review the error trace, or wait for human feedback.

---

## 5. Troubleshooting & Escape Hatches

- **Agent Loops**: If an agent becomes stuck rewriting the same logical path, force a context reset or consult `GUARDRAILS.md` to break the pattern.
- **Merge Conflicts & Branch Guarding**: Use clear `@workspace_scope` limits to ensure background tasks do not write into paths mapped to locked branches or active development files in parallel worktrees.
- **State Rollback**: In case of persistent errors, call `/rewind` or `/undo` to reset the repository head within the current worktree directory to the last stable verified checkout.