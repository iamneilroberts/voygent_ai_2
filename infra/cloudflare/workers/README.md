# Cloudflare Workers MCP Servers

This directory contains configuration templates for Voygent v2 MCP servers deployed to Cloudflare Workers.

## Workers

### d1-database-prod
**URL**: `https://d1-database-prod.somotravel.workers.dev/sse`
**Purpose**: Trip and hotel data management using Cloudflare D1
**Database**: `voygent-prod`
**Source**: Copy from `~/dev/new-claude-travel-agent/remote-mcp-servers/d1-database-improved`

**Setup**:
```bash
# 1. Copy source code
cp -r ~/dev/new-claude-travel-agent/remote-mcp-servers/d1-database-improved ./d1-database-prod

# 2. Update wrangler.toml
cp d1-database-prod-wrangler.toml ./d1-database-prod/wrangler.toml

# 3. Get D1 database ID
wrangler d1 list

# 4. Update database_id in wrangler.toml
# Replace YOUR_D1_DATABASE_ID with actual voygent-prod database ID

# 5. Deploy
cd d1-database-prod
wrangler deploy
```

### prompt-instructions-d1-mcp
**URL**: `https://prompt-instructions-d1-mcp.somotravel.workers.dev/sse`
**Purpose**: Workflow and conversation management
**Database**: `voygent-prod`
**Source**: `~/dev/new-claude-travel-agent/remote-mcp-servers/prompt-instructions-d1-mcp`

**Setup**:
```bash
# 1. Copy source code
cp -r ~/dev/new-claude-travel-agent/remote-mcp-servers/prompt-instructions-d1-mcp .

# 2. Update wrangler.toml database binding to voygent-prod
# Update database_name and database_id

# 3. Deploy
cd prompt-instructions-d1-mcp
wrangler deploy
```

### template-document-mcp
**URL**: `https://template-document-mcp.somotravel.workers.dev/sse`
**Purpose**: Travel document template rendering and GitHub Pages publishing
**Source**: `~/dev/new-claude-travel-agent/remote-mcp-servers/template-document-mcp`

**Setup**:
```bash
# 1. Copy source code
cp -r ~/dev/new-claude-travel-agent/remote-mcp-servers/template-document-mcp .

# 2. Update wrangler.toml if needed
# Add any required secrets (GitHub token, etc.)

# 3. Deploy
cd template-document-mcp
wrangler deploy
```

## Deployment Script

Use the `deploy-all.sh` script to deploy all workers at once:

```bash
./deploy-all.sh
```

## Configuration Updates

After renaming `d1-database-improved` → `d1-database-prod`:

1. **Worker Name**: Update `name` in wrangler.toml
2. **Database Binding**: Point to `voygent-prod` instead of `travel_assistant`
3. **Routes**: Update to `d1-database-prod.somotravel.workers.dev`
4. **LibreChat Config**: Already updated to use new URL

## Environment Variables

Set secrets via wrangler:

```bash
# MCP authentication (if using)
wrangler secret put MCP_AUTH_KEY --env production

# GitHub token (for template-document-mcp)
wrangler secret put GITHUB_TOKEN --env production
```

## Testing

After deployment, test each MCP server:

```bash
# d1-database-prod
curl https://d1-database-prod.somotravel.workers.dev/sse

# prompt-instructions
curl https://prompt-instructions-d1-mcp.somotravel.workers.dev/sse

# template-document
curl https://template-document-mcp.somotravel.workers.dev/sse
```

## Troubleshooting

### Database not found
```bash
# List available D1 databases
wrangler d1 list

# Check database binding
wrangler d1 info voygent-prod
```

### Worker deployment fails
```bash
# Check auth
wrangler whoami

# View logs
wrangler tail d1-database-prod
```

### MCP connection issues
- Verify CORS configuration in worker
- Check `ALLOWED_MCP_ORIGINS` in LibreChat
- Ensure SSE endpoint is accessible
