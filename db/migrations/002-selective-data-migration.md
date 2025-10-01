# Selective Data Migration from travel_assistant

## Migration Strategy: Fresh Schema + Essential Data Only

Rather than migrating all 65 tables from the legacy system, we'll:
1. Apply the clean v2 schema (optimized for ≤2 queries)
2. Selectively import only essential business data
3. Leave behind technical debt and obsolete structures

## Core Tables to Migrate

### Priority 1: Active Business Data
**Why**: Current trips and clients the agent is working on

- `Trips` / `trips_v2` → `trips`
  - Active and recent trips only (last 6 months)
  - Status: planning, booked, in_progress
  - Skip: cancelled, archived older than 6 months

- `Clients` / `clients_v2` → Extract to new format
  - Active clients only (associated with recent trips)
  - Contact information
  - Preferences

- `TripDays` → `trip_legs`
  - Day-by-day itineraries for active trips
  - Accommodation assignments
  - Activities planned

### Priority 2: Valuable Content
**Why**: Agent knowledge and instructions

- `instruction_sets` → Keep as-is
  - Travel agent workflows
  - Pricing strategies
  - Verification processes
  - Critical for agent behavior

- `hotel_cache` → Selective
  - Only hotels for active trips
  - Hotels searched in last 30 days
  - Skip: old searches, expired data

### Priority 3: Templates & Documents
**Why**: Reusable assets

- `HtmlDocumentTemplates` → If useful
  - Proposal templates
  - Itinerary formats
  - Skip: if new templates are better

## Tables to SKIP (Obsolete/Technical Debt)

### Database Maintenance (Don't Need)
- `db_errors` - Old error logs
- `db_documentation` - Legacy docs
- `migration_status` - Old migration tracking
- `schema_migrations` - Old versioning
- `maintenance_reports` - Stale reports
- `system_status` - Old monitoring

### Performance/Analytics (Start Fresh)
- `query_performance_log` - Old query stats
- `search_analytics` - Outdated patterns
- `llm_query_log` - Legacy LLM usage
- `llm_query_sessions` - Old sessions
- `llm_failed_queries` - Old failures
- `instruction_access_log` - Old access logs
- `ActivityLog` - Cluttered activity history

### Experimental/Unused Features
- `parser_scripts` - JavaScript parsers (may not be used)
- `js_extraction_patterns` - Web scraping patterns
- `extraction_attempts` - Extraction logs
- `portal_plugins` - Plugin system (unused?)
- `provider_knowledge` - May be outdated
- `suggestion_cache` - Stale suggestions
- `travel_search_cache` - Expired searches
- `facts_dirty` / `facts_dirty_v2` - Dirty flags (rebuild fresh)

### Email Integration (May Not Need)
- `email_processing_log` - Old emails
- `processed_emails` - Processed flags
- Unless actively using email automation, skip

### LLM Caching (Start Fresh)
- `llm_conversation_memory` - Old conversations
- `llm_faq_cache` - Outdated FAQs
- `llm_trip_context` - Old context
- Better to rebuild with v2 patterns

### Proposals (Selective)
- `proposals` - Keep only for active trips
- `proposal_images` - Keep only for active
- `proposal_versions` - Skip old versions
- `proposals_enhanced` - If duplicates main proposals, skip

### Bookings/History (Conditional)
- `BookingHistory` - Keep if has commission records
- Otherwise skip (can't book through system anyway)

## Migration Execution Plan

### Step 1: Apply Fresh V2 Schema
```bash
# Apply clean optimized schema
wrangler d1 execute voygent-prod --remote \
  --file=db/migrations/001-initial-schema.sql
```

### Step 2: Extract Essential Data
```bash
# Create selective export from backup
# Filter only Priority 1 & 2 tables with active data
```

### Step 3: Transform & Import
```bash
# Transform old structure → new structure
# Import to voygent-prod
```

## Data Transformation Rules

### Trips Migration
```sql
-- From old: Trips/trips_v2
-- To new: trips

-- Only migrate:
WHERE status IN ('planning', 'booked', 'in_progress')
  AND created_at > date('now', '-6 months')

-- Map fields:
trip_id → id
trip_name → title
destinations_json → destinations
trip_dates → start_date, end_date
```

### Clients Migration
```sql
-- From old: Clients/clients_v2
-- To new: Extract to trips.party JSON

-- Only clients with active trips
-- Store as JSON in trips.party:
[{
  "name": "First Last",
  "email": "email@example.com",
  "role": "primary"
}]
```

### Hotel Cache Migration
```sql
-- From old: hotel_cache
-- To new: hotel_cache

-- Only recent searches
WHERE ingested_at > date('now', '-30 days')
  OR trip_id IN (SELECT id FROM trips WHERE status != 'archived')
```

### Instruction Sets Migration
```sql
-- From old: instruction_sets
-- To new: Keep structure, may need table

-- All instruction sets (they're valuable agent knowledge)
-- Consider storing in new format or keeping as-is
```

## Expected Data Reduction

- **Old DB**: 65 tables, 870KB
- **New DB**: ~15-20 tables, ~200-300KB
- **Reduction**: ~65-70% smaller
- **Benefit**: Cleaner structure, faster queries, easier maintenance

## Validation Checklist

After migration:
- [ ] All active trips present
- [ ] All active clients accessible
- [ ] Instruction sets intact
- [ ] Recent hotel searches available
- [ ] No critical business data lost
- [ ] Query performance improved
- [ ] Database size reduced significantly

## Rollback Plan

If migration fails:
1. voygent-prod remains empty (no harm done)
2. Old backup at `~/dev/voygent-v2/travel_assistant_backup_20251001.sql`
3. Can restore to new database if needed
4. Legacy workers still pointing to old database (unchanged)

## Next Steps

1. Review this plan
2. Confirm which tables are truly needed
3. Create extraction script
4. Test migration on local D1
5. Execute on voygent-prod
6. Verify data
7. Update workers to point to voygent-prod
