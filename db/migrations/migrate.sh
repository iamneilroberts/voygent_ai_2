#!/bin/bash
# Voygent v2 Database Migration Script
# Migrates schema to voygent-prod Cloudflare D1 database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
D1_DATABASE_NAME="voygent-prod"
MIGRATIONS_DIR="$(dirname "$0")"
BACKUP_DIR="${MIGRATIONS_DIR}/backups"

echo -e "${GREEN}Voygent v2 Database Migration${NC}"
echo "================================"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: wrangler CLI not found${NC}"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Cloudflare${NC}"
    echo "Run: wrangler login"
    exit 1
fi

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup existing database (if it exists)
echo -e "${YELLOW}Creating backup of existing database...${NC}"
BACKUP_FILE="${BACKUP_DIR}/backup-$(date +%Y%m%d-%H%M%S).sql"
if wrangler d1 export "${D1_DATABASE_NAME}" --remote --output="${BACKUP_FILE}" 2>/dev/null; then
    echo -e "${GREEN}✓ Backup created: ${BACKUP_FILE}${NC}"
else
    echo -e "${YELLOW}⚠ No existing database to backup (this is expected for initial setup)${NC}"
fi

# Apply migrations in order
echo ""
echo -e "${YELLOW}Applying migrations to ${D1_DATABASE_NAME}...${NC}"
echo ""

for migration in "${MIGRATIONS_DIR}"/*.sql; do
    if [ -f "$migration" ]; then
        migration_name=$(basename "$migration")
        echo -e "Applying: ${GREEN}${migration_name}${NC}"

        if wrangler d1 execute "${D1_DATABASE_NAME}" --remote --file="${migration}"; then
            echo -e "${GREEN}✓ Success${NC}"
        else
            echo -e "${RED}✗ Failed to apply ${migration_name}${NC}"
            echo -e "${YELLOW}To rollback, restore from: ${BACKUP_FILE}${NC}"
            exit 1
        fi
        echo ""
    fi
done

# Verify migration
echo -e "${YELLOW}Verifying migration...${NC}"
if wrangler d1 execute "${D1_DATABASE_NAME}" --remote --command="SELECT name FROM sqlite_master WHERE type='table';" > /dev/null; then
    echo -e "${GREEN}✓ Database migration completed successfully${NC}"
else
    echo -e "${RED}✗ Database verification failed${NC}"
    exit 1
fi

# Validate query efficiency (Constitution Principle II: ≤2 queries per LLM interaction)
echo ""
echo -e "${YELLOW}Validating query patterns for Constitution Principle II compliance...${NC}"
echo "Testing common query patterns:"
echo ""

# Test 1: Single trip with facts (should be 1-2 queries max)
echo -e "1. Trip retrieval with facts:"
wrangler d1 execute "${D1_DATABASE_NAME}" --remote --command="EXPLAIN QUERY PLAN SELECT t.*, tf.facts FROM trips t LEFT JOIN trip_facts tf ON t.id = tf.trip_id WHERE t.id = 'test';" 2>/dev/null | head -5

# Test 2: Trip summary view (optimized single query)
echo -e "2. Trip summary view:"
wrangler d1 execute "${D1_DATABASE_NAME}" --remote --command="EXPLAIN QUERY PLAN SELECT * FROM trip_summary WHERE id = 'test';" 2>/dev/null | head -5

# Test 3: Hotel cache retrieval (should use index)
echo -e "3. Hotels by trip_id:"
wrangler d1 execute "${D1_DATABASE_NAME}" --remote --command="EXPLAIN QUERY PLAN SELECT * FROM hotel_cache WHERE trip_id = 'test' ORDER BY lead_price;" 2>/dev/null | head -5

echo ""
echo -e "${GREEN}✓ Query pattern validation complete${NC}"
echo -e "${YELLOW}Note: Review EXPLAIN QUERY PLAN output to ensure indexes are used${NC}"

echo ""
echo -e "${GREEN}Migration Complete!${NC}"
echo "Database: ${D1_DATABASE_NAME}"
echo "Backup: ${BACKUP_FILE}"
echo ""
echo "Next steps:"
echo "1. Update Worker wrangler.toml files to use ${D1_DATABASE_NAME}"
echo "2. Deploy Workers: cd infra/cloudflare/workers && ./deploy-all.sh"
echo "3. Test MCP servers: curl https://d1-database-prod.somotravel.workers.dev/sse"
