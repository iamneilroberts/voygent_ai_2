# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Voygent v2** - a spec-driven refactor of the existing Voygent travel planning AI assistant. The legacy system (in ~/dev/VoygentAI) uses LibreChat frontend + Cloudflare Workers MCP servers backed by D1, with HTML templating/publishing to GitHub Pages, hosted on Render.

**This is currently a greenfield rebuild** - treat this as a fresh start that selectively keeps proven components from v1.

## Database

- **Production database**: voygent-prod (NOT travel_assistant)
- Target: Cloudflare D1 (SQLite)
- Design goals: minimize DB round-trips per LLM interaction (≤2 queries), single-query read models using JSON, materialized views, transactions via Durable Objects where needed

## Architecture Strategy

The refactoring plan follows GitHub Spec Kit methodology:
1. Spec-first approach with `constitution.md`, `spec.md`, `plan.md`, `tasks.md`
2. Keep/rebuild decisions scored on: Maintainability, Latency, Cost, Reliability, Simplicity
3. Python feasibility evaluation for Cloudflare Workers (with JS fallback)
4. Edge-first: Cloudflare Workers for MCP servers, D1 for data, GitHub Pages for static output

## Key Principles

- Optimize for **fewest possible DB calls per LLM task**
- Prefer **boring, observable** infrastructure
- Keep legacy only if demonstrably better
- Everything as code
- Ship small, test early, add rollback

## Target Repository Structure

```
voygent-v2/
  spec/                 # Spec Kit artifacts
  apps/
    librechat/          # Thin config, no fork drift
  services/
    edge-api/           # Cloudflare Worker (JS or Python)
    mcp-templates/      # MCP server for templates
    mcp-publisher/      # GitHub Pages publisher
  packages/
    core/               # Core models, shared types
    templates/          # Jinja2/HTML templates
  infra/
    cloudflare/         # wrangler.toml, D1 migrations
    render.yaml         # Render Blueprint
    github/             # CI/CD workflows
  docs/
    adr/                # Architecture Decision Records
    runbooks/           # Operational procedures
```

## Development Workflow

1. **Spec Kit setup**: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git`
2. **Initialize**: `specify init . --ai claude`
3. **D1 operations**: `npx wrangler d1 export <DB_NAME> --remote --output=<file>.sql`

## Migration Context

- Legacy system in: ~/dev/VoygentAI
- Dockerized LibreChat reference: ~/dev/voygent.appCE
- Downtime acceptable during development
- Database can be rebuilt from scratch
