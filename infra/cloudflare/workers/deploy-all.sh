#!/bin/bash
# Deploy all Cloudflare Workers for Voygent v2
# Automatically injects voygent-prod database ID

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Voygent v2 - Deploy All Workers${NC}"
echo "================================"
echo ""

# Load database ID
D1_DATABASE_ID_FILE="$(dirname "$0")/../.database_id"
if [ ! -f "${D1_DATABASE_ID_FILE}" ]; then
    echo -e "${RED}Error: Database ID file not found: ${D1_DATABASE_ID_FILE}${NC}"
    echo "Expected file: infra/cloudflare/.database_id"
    exit 1
fi

export D1_DATABASE_ID=$(cat "${D1_DATABASE_ID_FILE}")
echo -e "${YELLOW}Database ID loaded: ${D1_DATABASE_ID}${NC}"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: wrangler CLI not found${NC}"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Cloudflare${NC}"
    echo "Run: wrangler login"
    exit 1
fi

# List of workers to deploy
WORKERS=(
    "d1-database-prod"
    "prompt-instructions-d1-mcp"
    "template-document-mcp"
    "document-publish-mcp"
    "web-fetch-mcp"
)

# Deploy each worker
for WORKER in "${WORKERS[@]}"; do
    if [ ! -d "${WORKER}" ]; then
        echo -e "${YELLOW}⚠ Worker directory not found: ${WORKER} (skipping)${NC}"
        continue
    fi

    echo -e "${YELLOW}Deploying: ${WORKER}${NC}"
    cd "${WORKER}"

    # Update database configuration if wrangler.toml exists
    if [ -f "wrangler.toml" ]; then
        # Check if worker uses D1
        if grep -q "d1_databases" wrangler.toml; then
            echo -e "  Updating D1 database configuration..."

            # Update database_id
            if grep -q "database_id" wrangler.toml; then
                sed -i.bak "s/database_id = \".*\"/database_id = \"${D1_DATABASE_ID}\"/" wrangler.toml
            fi

            # Update database_name to voygent-prod
            if grep -q "database_name" wrangler.toml; then
                sed -i.bak "s/database_name = \".*\"/database_name = \"voygent-prod\"/" wrangler.toml
            fi

            # Clean up backup file
            rm -f wrangler.toml.bak
        fi
    fi

    # Deploy worker
    if wrangler deploy; then
        echo -e "${GREEN}✓ ${WORKER} deployed successfully${NC}"
    else
        echo -e "${RED}✗ Failed to deploy ${WORKER}${NC}"
        cd ..
        exit 1
    fi

    echo ""
    cd ..
done

echo -e "${GREEN}All workers deployed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Test MCP endpoints:"
echo "   curl https://d1-database-prod.somotravel.workers.dev/sse"
echo "   curl https://prompt-instructions-d1-mcp.somotravel.workers.dev/sse"
echo "   curl https://template-document-mcp.somotravel.workers.dev/sse"
echo ""
echo "2. Deploy LibreChat to Render:"
echo "   Follow docs/DEPLOYMENT.md Phase 5"
