# Phase 0: Research - Rebuild LibreChat with Voygent Customizations

**Date**: 2025-10-02
**Feature**: 002-rebuild-the-whole

## Research Questions

### 1. Source Directory Analysis
**Question**: What customizations exist in `/home/neil/dev/voygen/librechat-source`?

**Decision**: Copy all customizations from source to target

**Rationale**:
- Source contains proven working customizations from previous development
- Includes frontend (React components, Recoil state, branding assets)
- Includes backend (API routes under `/api/voygen/*`)
- Includes MCP server configurations (needs correction to proper server list)

**Alternatives Considered**:
- Recreate from scratch: Rejected - unnecessary rework, loses battle-tested code
- Cherry-pick specific features: Rejected - clarification confirmed "all customizations"

---

### 2. Build System Integration
**Question**: How to integrate Voygent customizations into LibreChat build process?

**Decision**: Preserve LibreChat's existing Vite + npm build system, add Voygent files to source tree

**Rationale**:
- LibreChat uses standard Vite for frontend, npm scripts for backend
- Voygent customizations are additive (new components, new routes, new config)
- No modifications to build tooling needed - just file additions
- Vite hot module replacement will work with new components

**Alternatives Considered**:
- Custom build pipeline: Rejected - over-engineering, LibreChat's build already works
- Separate bundling: Rejected - creates deployment complexity

---

### 3. Testing Framework Selection
**Question**: What testing frameworks to use for unit, integration, E2E tests?

**Decision**:
- **Unit Tests**: Vitest (frontend React components), Jest (backend Node.js)
- **Integration Tests**: Supertest (backend API endpoints)
- **E2E Tests**: Playwright (full user journeys)

**Rationale**:
- Vitest: Modern, fast, works seamlessly with Vite (already in LibreChat)
- Jest: Standard for Node.js, likely already in LibreChat backend
- Supertest: Industry standard for Express.js API testing
- Playwright: Cross-browser E2E, better than Cypress for this use case

**Alternatives Considered**:
- All Jest: Rejected - Vitest is faster for Vite projects
- Cypress for E2E: Considered - Playwright has better API, modern architecture

---

### 4. MCP Server Configuration
**Question**: How to correct MCP server list and ensure connectivity?

**Decision**: Update `librechat.yaml` with correct server list: chrome, d1_database, prompt_instructions, template_document

**Rationale**:
- Current UI shows incorrect servers (from screenshot context)
- Correct list specified in clarifications
- MCP servers are external dependencies (Cloudflare Workers)
- Configuration via librechat.yaml follows LibreChat conventions

**Alternatives Considered**:
- Hardcode in code: Rejected - configuration should be declarative
- Environment variables only: Rejected - yaml provides better structure

---

### 5. Docker Configuration for Render.com
**Question**: What Docker setup is needed for production deployment?

**Decision**: Create Dockerfile that:
- Uses Node.js 20 alpine base
- Installs all dependencies (frontend + backend)
- Builds frontend production bundle
- Exposes port 3080 (backend serves built frontend)
- Includes healthcheck endpoint
- Sets proper environment variables

**Rationale**:
- Render.com supports Docker deployments natively
- Alpine base keeps image size small
- Single container simplifies deployment (vs separate frontend/backend)
- Backend can serve built frontend files (standard pattern)

**Alternatives Considered**:
- Separate frontend/backend containers: Rejected - adds complexity, not needed for this scale
- Pre-built image: Rejected - customizations require custom build

---

### 6. Environment Variables Strategy
**Question**: Which environment variables are required?

**Decision**: Document required variables in `.env.example`:
- `DATABASE_URL` (MongoDB for LibreChat core)
- `MCP_SERVER_*` URLs (for each MCP server: d1_database, prompt_instructions, template_document)
- `PORT` (default 3080)
- `NODE_ENV` (production/development)
- Any LibreChat-required vars (to be discovered during implementation)

**Rationale**:
- Environment vars are standard for 12-factor app config
- Render.com makes env var management easy
- Clarifications identified this as "to be determined during implementation"
- .env.example provides template for developers

**Alternatives Considered**:
- Config files only: Rejected - secrets shouldn't be in git
- All hardcoded: Rejected - violates security and portability

---

### 7. Migration/Rollback Strategy
**Question**: How to safely replace existing `apps/librechat` without data loss?

**Decision**:
- Backup current `apps/librechat` to `apps/librechat.backup-YYYYMMDD`
- Copy all files from source to target
- Test locally before deployment
- Document rollback procedure in README

**Rationale**:
- Edge case FR requirements specify clean rollback needed
- Git provides version control, but local backup adds safety
- No user data in `apps/librechat` (data is in databases)

**Alternatives Considered**:
- Git branch only: Considered - backup adds extra safety layer
- No backup: Rejected - violates edge case requirements

---

## Summary of Resolved Items

✅ All NEEDS CLARIFICATION items from Technical Context have been researched
✅ Build system approach defined (use existing LibreChat + Vite)
✅ Testing frameworks selected (Vitest, Jest, Supertest, Playwright)
✅ MCP configuration strategy documented
✅ Docker/deployment approach defined
✅ Environment variable strategy established
✅ Migration safety addressed

## Next Steps

Proceed to Phase 1: Design & Contracts
- Create data model for Voygent entities
- Generate API contracts for `/api/voygen/*` routes
- Define test contracts
- Generate quickstart.md
