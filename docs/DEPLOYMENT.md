# Voygent v2 Deployment Guide

Complete deployment instructions for Voygent v2 to Render.com with Cloudflare Workers MCP servers.

## Prerequisites

- Cloudflare account with Workers enabled
- Render.com account
- GitHub account
- Node.js 18+ and npm/pnpm
- Wrangler CLI: `npm install -g wrangler`

## Architecture Overview

```
Render.com (LibreChat + MongoDB)
    ↓ HTTPS/SSE
Cloudflare Workers (3 MCP Servers)
    ↓
Cloudflare D1 (voygent-prod database)
```

## Deployment Phases

### Phase 1: Backup Legacy Database (Optional)

If migrating from existing `travel_assistant` database:

```bash
# Create backup directory
mkdir -p ~/dev/Voygent_ai_2/db/backups

# Export current database
wrangler d1 export travel_assistant --remote \
  --output=~/dev/Voygent_ai_2/db/backups/travel_assistant_final_backup.sql

# Verify backup
ls -lh ~/dev/Voygent_ai_2/db/backups/
```

### Phase 2: Verify voygent-prod D1 Database

```bash
# Login to Cloudflare
wrangler login

# Verify voygent-prod database exists
wrangler d1 list | grep voygent-prod

# Store database ID in config file (already exists)
cat ~/dev/Voygent_ai_2/infra/cloudflare/.database_id
# Output: b0eb7ec7-67bc-4b54-b66b-02f4efc22a24
```

**Note**: Database ID is stored in `infra/cloudflare/.database_id` and automatically injected by deployment scripts.

### Phase 3: Run Database Migration

```bash
cd ~/dev/Voygent_ai_2/db/migrations

# Edit migrate.sh if needed to change D1_DATABASE_NAME
# Default is "voygent-prod"

# Run migration
./migrate.sh
```

Expected output:
```
✓ Backup created (if database exists)
✓ Applying: 001-initial-schema.sql
✓ Database migration completed successfully
```

### Phase 4: Setup Cloudflare Workers

#### 4.1 Copy MCP Server Code

```bash
cd ~/dev/Voygent_ai_2/infra/cloudflare/workers

# Copy d1-database worker
cp -r ~/dev/new-claude-travel-agent/remote-mcp-servers/d1-database-improved \
  ./d1-database-prod

# Copy prompt-instructions worker
cp -r ~/dev/new-claude-travel-agent/remote-mcp-servers/prompt-instructions-d1-mcp \
  ./prompt-instructions-d1-mcp

# Copy template-document worker
cp -r ~/dev/new-claude-travel-agent/remote-mcp-servers/template-document-mcp \
  ./template-document-mcp
```

#### 4.2 Update d1-database-prod Configuration

```bash
cd d1-database-prod

# Database ID automatically loaded from config file
export D1_DATABASE_ID=$(cat ~/dev/Voygent_ai_2/infra/cloudflare/.database_id)

# Update wrangler.toml with correct database_id
sed -i "s/database_id = \".*\"/database_id = \"${D1_DATABASE_ID}\"/" wrangler.toml

# Verify configuration
grep -A 3 "d1_databases" wrangler.toml
```

Expected `wrangler.toml` configuration:
```toml
name = "d1-database-prod"  # Changed from d1-database-improved

[[d1_databases]]
binding = "DB"
database_name = "voygent-prod"  # Changed from travel_assistant
database_id = "b0eb7ec7-67bc-4b54-b66b-02f4efc22a24"  # Auto-injected from .database_id
```

#### 4.3 Update Other Workers

For `prompt-instructions-d1-mcp` and any other D1-dependent workers:

```bash
cd ../prompt-instructions-d1-mcp

# Auto-inject database ID
export D1_DATABASE_ID=$(cat ~/dev/Voygent_ai_2/infra/cloudflare/.database_id)
sed -i "s/database_id = \".*\"/database_id = \"${D1_DATABASE_ID}\"/" wrangler.toml
sed -i "s/database_name = \".*\"/database_name = \"voygent-prod\"/" wrangler.toml

# Verify
grep -A 3 "d1_databases" wrangler.toml
```

#### 4.4 Deploy Workers

```bash
cd ~/dev/Voygent_ai_2/infra/cloudflare/workers

# Deploy all at once
./deploy-all.sh

# Or deploy individually:
cd d1-database-prod && wrangler deploy
cd ../prompt-instructions-d1-mcp && wrangler deploy
cd ../template-document-mcp && wrangler deploy
```

#### 4.5 Test MCP Endpoints

```bash
# Test d1-database-prod
curl https://d1-database-prod.somotravel.workers.dev/sse

# Test prompt-instructions
curl https://prompt-instructions-d1-mcp.somotravel.workers.dev/sse

# Test template-document
curl https://template-document-mcp.somotravel.workers.dev/sse
```

Expected response: SSE stream or JSON with MCP server info.

### Phase 5: Deploy to Render.com

#### 5.1 Create Render Service

1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click **New +** → **Blueprint**
3. Connect your GitHub repository
4. Select `Voygent_ai_2` repository
5. Render will detect `infra/render.yaml`

#### 5.2 Configure Environment Variables

In Render dashboard, go to **Environment** and set:

**Required**:
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `OPENAI_API_KEY`: Your OpenAI API key (optional)

**Auto-configured** (from render.yaml):
- `MONGODB_URI`: Automatically set from MongoDB add-on
- `ALLOW_MCP`: Set to `true`
- `MCP_D1_URL`: Points to d1-database-prod
- `MCP_PROMPT_URL`: Points to prompt-instructions
- `MCP_TEMPLATE_URL`: Points to template-document

**Optional**:
- `MCP_AUTH_KEY`: If your Workers require authentication
- `ALLOWED_MCP_ORIGINS`: Update if using custom domain

#### 5.3 Deploy Service

Click **Apply** to deploy. Render will:
1. Create MongoDB database
2. Build Docker image from `apps/librechat/Dockerfile`
3. Deploy LibreChat service
4. Start health checks

Monitor deployment:
```bash
# From Render dashboard → Logs
# Or via CLI:
render logs voygent-librechat --tail
```

#### 5.4 Verify Deployment

1. Open Render service URL: `https://voygent-librechat.onrender.com`
2. Create account/login
3. Select "Voygent Anthropic" endpoint
4. Verify MCP tools appear in UI
5. Test a simple query: "List available MCP tools"

### Phase 6: Configure Custom Domain (Optional)

#### In Render Dashboard:
1. Go to service → **Settings** → **Custom Domain**
2. Add domain: `app.voygent.com`
3. Update DNS:
   ```
   CNAME app voygent-librechat.onrender.com
   ```

#### Update Configurations:
```bash
# Update ALLOWED_MCP_ORIGINS
ALLOWED_MCP_ORIGINS=https://app.voygent.com

# Redeploy
```

## Post-Deployment

### Monitoring

**Render Logs**:
```bash
render logs voygent-librechat --tail
```

**Cloudflare Worker Logs**:
```bash
wrangler tail d1-database-prod
wrangler tail prompt-instructions-d1-mcp
wrangler tail template-document-mcp
```

**Health Checks**:
```bash
# LibreChat
curl https://voygent-librechat.onrender.com/api/health

# Workers
curl https://d1-database-prod.somotravel.workers.dev/sse
```

### Metrics

- **Render Dashboard**: CPU, memory, request metrics
- **Cloudflare Dashboard**: Worker invocations, errors, latency
- **D1 Analytics**: Query performance, storage usage

### Backups

**Database Backups** (run weekly):
```bash
# Automated via cron or GitHub Actions
wrangler d1 export voygent-prod --remote \
  --output=backups/voygent-prod-$(date +%Y%m%d).sql
```

**MongoDB Backups**: Automatic via Render (Standard plan+)

## Troubleshooting

### LibreChat can't connect to MCP servers

1. Check CORS configuration in Workers
2. Verify `ALLOWED_MCP_ORIGINS` matches Render URL
3. Test MCP endpoints directly with curl
4. Check Render logs for connection errors

### D1 Database errors

```bash
# Verify database exists
wrangler d1 list

# Check database info
wrangler d1 info voygent-prod

# View recent queries
wrangler d1 execute voygent-prod --remote \
  --command="SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 10"
```

### Worker deployment fails

```bash
# Check auth
wrangler whoami

# Re-login if needed
wrangler login

# Check wrangler.toml syntax
wrangler deploy --dry-run
```

### MongoDB connection issues

- Verify `MONGODB_URI` environment variable in Render
- Check MongoDB service status in Render dashboard
- Review connection string format

## Rollback Procedure

### Rollback Workers:
```bash
# View deployments
wrangler deployments list

# Rollback to previous
wrangler rollback --message "Rollback to previous version"
```

### Rollback Database:
```bash
# Restore from backup
wrangler d1 execute voygent-prod --remote \
  --file=backups/voygent-prod-20251001.sql
```

### Rollback Render Service:
1. Render Dashboard → Service → **Rollbacks**
2. Select previous deployment
3. Click **Rollback**

## Cost Estimates

### Cloudflare:
- D1 Database: Free tier (5 GB, 5M reads/day)
- Workers: Free tier (100k requests/day)
- Typical cost: $0-5/month

### Render:
- Starter Plan: $7/month (web service)
- MongoDB Starter: $0/month (free tier)
- Total: ~$7/month

## Security Checklist

- [ ] API keys stored as environment variables (not in code)
- [ ] MongoDB authentication enabled
- [ ] CORS properly configured
- [ ] MCP auth keys set (if using)
- [ ] Custom domain uses HTTPS
- [ ] Regular database backups configured
- [ ] Render IP allowlist configured (if needed)

## Next Steps

1. Configure automated backups
2. Set up monitoring/alerting (Sentry, LogDNA)
3. Add custom domain
4. Configure GitHub Actions for CI/CD
5. Document operational runbooks
6. Test disaster recovery procedures

## Support

- Render docs: https://render.com/docs
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- LibreChat: https://github.com/danny-avila/LibreChat
- Issues: File in Voygent_ai_2 repository
