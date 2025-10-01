# Voygent v2

> AI-first travel planning with LibreChat + Cloudflare Workers MCP servers

Voygent v2 is a spec-driven refactor of the Voygent travel planning AI assistant, optimized for edge deployment with <100ms latency and ≤2 database queries per LLM interaction.

## Architecture

```
┌─────────────────────────────────────────┐
│     Render.com (LibreChat + MongoDB)    │
│  - Professional chat UI                 │
│  - User authentication                  │
│  - MCP client integration               │
└──────────────┬──────────────────────────┘
               │ HTTPS/SSE
┌──────────────▼──────────────────────────┐
│    Cloudflare Workers (MCP Servers)     │
│  - d1-database-prod: Trip data mgmt     │
│  - prompt-instructions: Workflows       │
│  - template-document: Publishing        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Cloudflare D1 (voygent-prod)          │
│  - Edge-replicated SQLite               │
│  - Optimized for LLM context            │
└─────────────────────────────────────────┘
```

## Features

- **Edge-First Architecture**: Cloudflare Workers + D1 for <100ms p95 latency
- **Database Efficiency**: ≤2 queries per LLM interaction via materialized JSON facts
- **LibreChat Integration**: Professional UI with MCP tool support
- **Spec-Driven Development**: GitHub Spec Kit workflow (constitution → spec → plan → tasks)
- **Observable Infrastructure**: Structured logging, Cloudflare Analytics
- **Trip Validation**: Independent LLM verification of all trip elements with citations

## Quick Start

### Prerequisites

- Cloudflare account with Workers enabled
- Render.com account
- Node.js 18+
- Wrangler CLI: `npm install -g wrangler`

### Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete instructions.

**TL;DR**:
```bash
# 1. Setup D1 database
wrangler d1 create voygent-prod
cd db/migrations && ./migrate.sh

# 2. Deploy Cloudflare Workers
cd infra/cloudflare/workers
# Copy MCP server code from ~/dev/new-claude-travel-agent/remote-mcp-servers
# Update wrangler.toml files with voygent-prod database ID
./deploy-all.sh

# 3. Deploy to Render
# Connect repository to Render
# Render will use infra/render.yaml
# Set ANTHROPIC_API_KEY and OPENAI_API_KEY via dashboard

# 4. Access at https://voygent-librechat.onrender.com
```

## Project Structure

```
Voygent_ai_2/
├── .specify/              # Spec Kit artifacts
│   ├── memory/
│   │   └── constitution.md   # Project principles & governance
│   └── templates/         # Spec/plan/tasks templates
├── specs/                 # Feature specifications
│   └── 001-trip-validation/
├── apps/
│   └── librechat/         # LibreChat deployment
│       ├── Dockerfile     # Production container
│       ├── config/
│       │   └── librechat.yaml
│       └── .env.example
├── infra/
│   ├── render.yaml        # Render Blueprint
│   └── cloudflare/
│       └── workers/       # MCP server configs
├── db/
│   ├── schema.sql         # D1 database schema
│   └── migrations/        # Migration scripts
└── docs/
    ├── DEPLOYMENT.md      # Full deployment guide
    └── adr/               # Architecture Decision Records
```

## Constitution Principles

Voygent v2 follows five core principles (see [.specify/memory/constitution.md](.specify/memory/constitution.md)):

1. **Edge-First Latency**: All services on Cloudflare Workers, <100ms p95
2. **Database Efficiency**: ≤2 DB queries per LLM interaction
3. **Spec-Driven Development**: spec.md → plan.md → tasks.md workflow
4. **Observable Infrastructure**: Structured JSON logging, Cloudflare Analytics
5. **Legacy Evaluation**: Keep/rebuild decisions scored on Maintainability, Latency, Cost, Reliability, Simplicity

### External Validation (Constitution v1.1.0+)

All major changes (DB schema, APIs, constitution amendments) **MUST** receive independent Codex CLI review in critic mode:

```bash
codex --profile critic "Review plan.md for [feature]: identify constitution violations, edge cases, performance risks, security issues. Be adversarial."
```

## Development Workflow

### Using Spec Kit

```bash
# Initialize (if not already done)
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
specify init . --ai claude

# Create feature specification
specify spec "New feature description"

# Generate implementation plan
specify plan

# Generate tasks
specify tasks

# Implement
# (Execute tasks.md following TDD workflow)
```

### Local Development

For local development with the voygent.appCE Docker setup:

```bash
cd ~/dev/voygent.appCE

# Start services
./voygent start

# Access LibreChat at http://localhost:3080
# Orchestrator API at http://localhost:3000
```

## Database

**Production**: `voygent-prod` (Cloudflare D1)
**Schema**: Hybrid normalized + LLM-optimized JSON
**Migration**: See [db/migrations/migrate.sh](db/migrations/migrate.sh)

### Key Tables

- `trips`: Core trip information
- `trip_facts`: Materialized JSON for ≤2 query pattern
- `hotel_cache`: Raw ingested hotel data
- `trip_legs`: City segments with preferences
- `proposals`: Generated travel documents

## MCP Servers

### d1-database-prod
**URL**: `https://d1-database-prod.somotravel.workers.dev/sse`
**Purpose**: Trip and hotel data management
**Tools**: `get_anything`, `create_trip_with_client`, `bulk_trip_operations`

### prompt-instructions-d1-mcp
**URL**: `https://prompt-instructions-d1-mcp.somotravel.workers.dev/sse`
**Purpose**: Workflow and conversation management
**Tools**: `travel_agent_start`, `continue_trip`, `get_instruction`

### template-document-mcp
**URL**: `https://template-document-mcp.somotravel.workers.dev/sse`
**Purpose**: Document rendering and GitHub Pages publishing
**Tools**: `render_template`, `list_templates`, `publish_travel_document`

## Migration from v1

Voygent v1 (voygent.appCE) used:
- Local Docker deployment
- SQLite/MongoDB hybrid
- `travel_assistant` D1 database

Voygent v2 improvements:
- Hosted Render.com deployment
- Unified `voygent-prod` D1 database
- Renamed `d1-database-improved` → `d1-database-prod`
- Constitution-driven development
- External Codex validation for major changes

## Monitoring

### Render
```bash
render logs voygent-librechat --tail
```

### Cloudflare Workers
```bash
wrangler tail d1-database-prod
```

### Health Checks
```bash
curl https://voygent-librechat.onrender.com/api/health
curl https://d1-database-prod.somotravel.workers.dev/sse
```

## Cost

**Estimated monthly**:
- Cloudflare: $0-5 (likely free tier)
- Render: $7 (Starter web service + free MongoDB)
- **Total**: ~$7/month

## Documentation

- [Deployment Guide](docs/DEPLOYMENT.md) - Complete setup instructions
- [Constitution](. specify/memory/constitution.md) - Project principles & governance
- [MCP Workers Setup](infra/cloudflare/workers/README.md) - Worker configuration
- [Trip Validation Spec](specs/001-trip-validation/spec.md) - LLM-based validation feature

## Contributing

1. Follow Spec Kit workflow (spec → plan → tasks)
2. Adhere to constitution principles
3. Use Codex critic mode for major changes
4. TDD required (tests before implementation)
5. Document architectural decisions in `docs/adr/`

## License

[Specify license - e.g., MIT, AGPL-3.0]

## Support

File issues in this repository with:
- Environment (Render URL, Worker names)
- Error logs (Render logs, Worker logs)
- Steps to reproduce
