
# Implementation Plan: Rebuild LibreChat with Voygent Customizations

**Branch**: `002-rebuild-the-whole` | **Date**: 2025-10-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/neil/dev/Voygent_ai_2/specs/002-rebuild-the-whole/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Rebuild the LibreChat v0.8.0-rc3 application with all Voygent customizations integrated into `apps/librechat/` directory in Voygent_ai_2 repository. Source customizations from `/home/neil/dev/voygen/librechat-source` include: branding assets (logo, favicon, theme CSS), custom React components (StatusBar for token usage, VoygenWelcome), Recoil state management atoms, backend API routes (`/api/voygen/*`), and corrected MCP server configurations (chrome, d1_database, prompt_instructions, template_document). The rebuild must be production-ready for Render.com deployment with full test coverage (unit, integration, E2E).

## Technical Context
**Language/Version**: Node.js 20.x (backend), TypeScript 5.x (frontend), React 18.x
**Primary Dependencies**:
- Frontend: Vite 6.3.4, Recoil (state), TanStack Query, Tailwind CSS
- Backend: Express.js, LibreChat v0.8.0-rc3 base
- Testing: Vitest (unit), Playwright (E2E), Supertest (integration)
**Storage**: Cloudflare D1 (SQLite) via MCP servers, MongoDB (LibreChat core data)
**Testing**: Vitest for React components, Jest for backend, Playwright for E2E
**Target Platform**: Render.com (Docker containers), Linux x86_64
**Project Type**: Web (frontend + backend monorepo structure)
**Performance Goals**: <2s initial page load, <500ms API response p95, StatusBar updates every 15s
**Constraints**: Zero tolerance for build errors, all tests must pass before deployment, MCP servers must be reachable
**Scale/Scope**: Single-user development initially, production deployment to Render.com, ~50 custom files added to LibreChat base

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution file is a template placeholder - no specific constitutional gates defined yet. This rebuild follows general software engineering best practices:

✅ **Simplicity**: Reusing existing LibreChat base, adding only Voygent customizations
✅ **Testing**: Full test coverage required (unit, integration, E2E) per FR-011, FR-012, FR-013
✅ **Observability**: StatusBar provides UI observability for token usage and system health
✅ **Documentation**: Rebuild process must be documented (FR-018)
✅ **No violations identified** - rebuild approach is straightforward integration work

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
apps/librechat/                    # Target directory for rebuild
├── api/                           # Backend (Node.js/Express)
│   ├── server/
│   │   ├── routes/
│   │   │   ├── voygent/          # Voygent custom routes
│   │   │   │   ├── status.js
│   │   │   │   ├── token-usage.js
│   │   │   │   ├── trip-progress.js
│   │   │   │   ├── mcp-health.js
│   │   │   │   └── index.js
│   │   │   └── index.js
│   │   ├── index.js
│   │   └── utils/
│   └── __tests__/                # Backend tests
│       ├── unit/
│       └── integration/
│
├── client/                        # Frontend (React/Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── StatusBar.tsx     # Voygent custom component
│   │   │   ├── VoygenWelcome.tsx # Voygent custom component
│   │   │   └── StatusBar/
│   │   │       └── index.tsx
│   │   ├── store/
│   │   │   ├── voygent.ts        # Voygent Recoil atoms
│   │   │   └── index.ts
│   │   ├── App.jsx
│   │   └── style.css
│   ├── public/
│   │   └── assets/               # Voygent branding assets
│   │       ├── voygent-favicon.svg
│   │       ├── favicon-32x32.png
│   │       ├── favicon-16x16.png
│   │       ├── apple-touch-icon-180x180.png
│   │       └── voygent-theme.css
│   ├── index.html                # Voygent branded HTML
│   ├── vite.config.ts
│   └── __tests__/                # Frontend tests
│       ├── unit/
│       │   ├── StatusBar.test.tsx
│       │   └── VoygenWelcome.test.tsx
│       └── e2e/
│           └── voygent-features.spec.ts
│
├── config/
│   └── librechat.yaml            # MCP server configs
├── Dockerfile                     # Render.com deployment
├── .env.example
├── package.json
└── README.md
```

**Structure Decision**: Web application structure with LibreChat base. All Voygent customizations will be copied from `/home/neil/dev/voygen/librechat-source` into `apps/librechat/` in Voygent_ai_2 repo, replacing the existing simple LibreChat installation. The structure preserves LibreChat's layout while adding Voygent-specific components, routes, and configurations.

## Phase 0: Outline & Research
✅ **Completed** - See `research.md`

**Research Topics Addressed**:
1. Source directory analysis (`/home/neil/dev/voygen/librechat-source`)
2. Build system integration strategy (Vite + npm)
3. Testing framework selection (Vitest, Jest, Supertest, Playwright)
4. MCP server configuration approach
5. Docker configuration for Render.com
6. Environment variables strategy
7. Migration/rollback safety procedures

**Key Decisions**:
- Use existing LibreChat build system (no custom pipeline)
- Full test coverage: unit (Vitest/Jest), integration (Supertest), E2E (Playwright)
- MCP config via librechat.yaml with corrected server list
- Single Docker container approach (backend serves built frontend)
- Backup existing installation before rebuild

**Output**: `research.md` with all technical unknowns resolved

## Phase 1: Design & Contracts
✅ **Completed** - See `data-model.md`, `contracts/`, `quickstart.md`, and updated `CLAUDE.md`

**Artifacts Generated**:

1. **`data-model.md`**: Defines runtime state structures
   - TokenUsageData entity (Recoil state + API response)
   - TripProgressData entity (trip planning workflow state)
   - MCPServerStatus entity (MCP health monitoring)
   - StatusPayload entity (combined API response shape)
   - Data flow examples and storage strategy

2. **`contracts/api-voygen-status.yaml`**: OpenAPI 3.0 specification
   - GET `/api/voygen/status` - returns token usage or trip progress
   - POST `/api/voygen/start` - initializes Voygent services
   - Request/response schemas with validation rules
   - Error responses and status codes

3. **`quickstart.md`**: Step-by-step verification guide
   - 15-step process from backup to Docker deployment
   - Verification checkpoints for branding, StatusBar, API endpoints
   - Success criteria checklist
   - Troubleshooting guide
   - Rollback procedure

4. **`CLAUDE.md`** updated:
   - Added Node.js/TypeScript/React tech stack
   - Added Cloudflare D1 + MongoDB storage context
   - Preserved existing project overview

**Contract Test Strategy** (to be implemented in tasks):
- `/api/voygen/status` → contract test validates response schema
- `/api/voygen/start` → contract test validates initialization
- All tests use Supertest for Express.js API testing

**Output**: All Phase 1 artifacts complete and documented

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

The /tasks command will generate a detailed task list following this structure:

1. **Setup & Backup Tasks**:
   - Backup existing apps/librechat directory
   - Verify source directory structure
   - Create .env from template

2. **File Copy Tasks** [P - can run in parallel]:
   - Copy frontend customizations (client/)
   - Copy backend customizations (api/)
   - Copy configuration files (config/, Dockerfile, package.json)
   - Copy branding assets (logos, favicons, theme CSS)

3. **Dependency Installation**:
   - Install backend dependencies
   - Install frontend dependencies
   - Verify no dependency conflicts

4. **Contract Test Tasks** (TDD - write before implementation):
   - Write contract test for GET `/api/voygen/status` [P]
   - Write contract test for POST `/api/voygen/start` [P]
   - Verify tests fail (no implementation yet)

5. **Unit Test Tasks** (TDD):
   - Write unit test for StatusBar component [P]
   - Write unit test for VoygenWelcome component [P]
   - Write unit test for Voygent Recoil atoms [P]
   - Verify tests fail

6. **Integration Test Tasks** (TDD):
   - Write integration test for status route
   - Write integration test for voygent router mounting
   - Write integration test for MCP config loading
   - Verify tests fail

7. **Implementation Tasks** (Make tests pass):
   - Verify StatusBar component copied and integrated
   - Verify VoygenWelcome component copied and integrated
   - Verify Recoil store exports voygent atoms
   - Verify backend routes mounted correctly
   - Verify MCP server list corrected in librechat.yaml

8. **Build & Verification Tasks**:
   - Build frontend (verify Voygent branding in dist/)
   - Run all unit tests (must pass)
   - Run all integration tests (must pass)
   - Start backend server (verify health check)
   - Start frontend dev server (verify branding)

9. **E2E Test Tasks**:
   - Write E2E test for login + branding verification
   - Write E2E test for chat interaction + StatusBar display
   - Write E2E test for MCP server connectivity
   - Run E2E tests (must pass)

10. **Docker & Deployment Tasks**:
    - Build Docker image
    - Test Docker container locally
    - Verify health checks in container
    - Document deployment process

**Ordering Strategy**:
- **Phase 1**: Setup & file operations (tasks 1-3)
- **Phase 2**: Test writing (TDD) (tasks 4-6) - tests must fail initially
- **Phase 3**: Implementation verification (tasks 7) - make tests pass
- **Phase 4**: Build & local verification (tasks 8)
- **Phase 5**: E2E testing (task 9)
- **Phase 6**: Docker & deployment (task 10)

**Parallelization**:
- File copy tasks can run in parallel [P]
- Contract test writing can run in parallel [P]
- Unit test writing can run in parallel [P]
- Build steps are sequential (dependencies)

**Estimated Output**: 35-40 numbered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [ ] Phase 3: Tasks generated (/tasks command) - **NEXT STEP**
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅ (no new violations)
- [x] All NEEDS CLARIFICATION resolved ✅ (via clarifications + research)
- [x] Complexity deviations documented ✅ (none identified)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
