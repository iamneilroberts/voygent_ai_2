VoygentAI version 2 refactoring plan. 

Note: existing system is in ~/dev/VoygentAI
Dockerized version of the latest and best librechat version is in /home/neil/dev/voygent.appCE

# Voygent v2 Migration Plan (Spec Kit Driven)

This file contains the detailed plan and prompt for refactoring the Voygent project using GitHub Spec Kit, with keep/rebuild decision points, Cloudflare Workers Python feasibility, and LLM-optimized database design.

---

## ✅ Prompt for Local Coding Agent (Codex/Claude Code)

You are my refactoring and migration engineer. You have full read/write access to my existing **Voygent** codebase (LibreChat frontend + Cloudflare Worker MCP servers backed by D1, HTML templating/publishing to GitHub Pages, all hosted on Render). The app is in development—downtime is fine and the database can be rebuilt from scratch. Treat this as a near-greenfield rebuild that keeps only what is clearly winning.

### Mission
1. Stand up **GitHub Spec Kit** in a fresh repo and use it to drive a spec-first refactor.  
2. Inventory the current Node.js + Cloudflare Workers/D1 system and decide **keep vs rebuild** per component.  
3. Evaluate the feasibility of migrating Worker logic/MCP servers/orchestrator to **Python**, without harming DX or performance.  
4. Redesign the **database and data-access patterns** to minimize round-trips per LLM interaction while guaranteeing consistency—even if we use “ugly” internal structures to serve clean APIs.  
5. Produce a **new repo** with CI/CD, docs, and a migration/cutover plan.

### Guardrails / Principles
- Optimize for **fewest possible DB calls per LLM task**.  
- Prefer **boring, observable** infrastructure.  
- Keep legacy only if demonstrably better.  
- Everything as code.  
- Ship small, test early, add rollback.

---

## Deliverables (Definition of Done)
- New private repo (`voygent-v2`) with:
  - Spec Kit artifacts (`constitution.md`, `spec.md`, `plan.md`, `tasks.md`)
  - Infra as code: Render Blueprint, Environment Groups, Wrangler configs, D1 migrations
  - Services: Workers (JS or Python), MCP servers, GitHub publisher
  - Packages: core models, templates, shared libraries
  - LibreChat thin config (no fork drift)
  - CI/CD pipelines for Workers deploy + Pages publish
  - Docs with ADRs, runbooks, architecture map

- Keep/Rebuild decision log  
- Python Worker spike report (go/no-go)  
- DB redesign benchmarks and query plans  
- Cutover/rollback runbook

---

## Step 0 — Install Spec Kit

```bash
# Install CLI via uv
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
specify check

# Initialize in new repo
mkdir voygent-v2 && cd voygent-v2
specify init . --ai claude
```

---

## Step 1 — Snapshot “as-is”
- Inventory all Workers, wrangler.toml, D1 DBs, Render services, Pages workflows, LibreChat configs  
- Graph dependencies (services ↔ DB ↔ APIs)  
- Export current D1 dev database for analysis

```bash
npx wrangler d1 export <DB_NAME> --remote --output=./_archive/d1-full.sql
```

---

## Step 2 — Spec First
Create Spec Kit artifacts:
- **constitution.md** → quality bars (perf, test, cost, no PII leaks)  
- **spec.md** → WHAT the app does (not how)  
- **clarify.md** → risks, unknowns  
- **plan.md** → architecture layout, infra choices, CI/CD strategy  
- **tasks.md** → actionable backlog grouped by capability

---

## Step 3 — Keep/Rebuild Rubric
Score each component 0–5 across Maintainability, Latency, Cost, Reliability, Simplicity.  
If <14 total or clear win from Python → **Rebuild**.

Components to score: MCP servers, orchestrator, publisher, HTML templates, LLM tools, DB schema, LibreChat integration, CI/CD.

---

## Step 4 — Python Feasibility (Cloudflare Workers)
Spike a Python Worker with D1 bindings:
- Endpoints: `/health`, `GET /trip/:id`, `POST /trip`  
- Verify latency, cold-start, library support (pydantic, jinja2, httpx, PyGitHub)  
- Explore Durable Objects in Python (optional)  
- Go/No-Go criteria: latency, lib gaps, deploy story, observability parity

If **No-Go**, keep JS proxy Worker for D1, shift business logic to Python (FastAPI on Render).

---

## Step 5 — Database Redesign
Goals: single-query read models, materialized JSON snapshots, transactions, idempotency, versioning.

Strategies:
- **Wide JSON read models** via D1 JSON functions  
- **Materialization** with triggers/jobs  
- **Transactions** + Durable Objects where needed  
- **Idempotency** with content hashes  
- **Append-only event table + compaction**

Benchmarks: p95 latency, # DB calls per LLM action (≤2), query plans.

---

## Step 6 — Repo Layout

```
voygent-v2/
  spec/
  apps/
    librechat/
  services/
    edge-api/
    mcp-templates/
    mcp-publisher/
  packages/
    core/
    templates/
  infra/
    cloudflare/
    render.yaml
    github/
  docs/
    adr/
    runbooks/
```

---

## Step 7 — CI/CD
- Workers deploy via GitHub Actions + wrangler-action  
- D1 migrations in CI  
- GitHub Pages publish workflow  
- Render Blueprint with Env Groups

---

## Step 8 — Cutover Plan
1. Deploy staging infra, import D1 dump  
2. Dual-write Pages (staging + prod)  
3. Smoke test, cut DNS  
4. Rollback = old Render service + D1 snapshot

---

## Step 9 — Tasks
- Inventory/diagrams  
- Spec Kit artifacts  
- Python Worker spike + report  
- DB redesign + migrations  
- Port MCP servers/orchestrator  
- Publisher hardening  
- CI/CD setup  
- Benchmarks  
- Cutover plan

---

## Notes
- LibreChat stays Node.js; integrate via REST instead of forking  
- If Codex struggles with Spec Kit slash commands, manipulate files/scripts directly

---