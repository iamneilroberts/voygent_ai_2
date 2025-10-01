-- Drop all existing tables from voygent-prod
-- This clears the database for fresh v2 schema

-- Disable foreign key constraints
PRAGMA foreign_keys = OFF;

-- Drop views first
DROP VIEW IF EXISTS trip_summary;

-- Drop tables with foreign key dependencies first
DROP TABLE IF EXISTS trip_search_surface_dirty;
DROP TABLE IF EXISTS trip_search_surface;
DROP TABLE IF EXISTS trip_external_docs;
DROP TABLE IF EXISTS trip_client_assignments;
DROP TABLE IF EXISTS trip_activities_enhanced;
DROP TABLE IF EXISTS TripParticipants;
DROP TABLE IF EXISTS TripDays;
DROP TABLE IF EXISTS TripCosts;
DROP TABLE IF EXISTS trip_legs;
DROP TABLE IF EXISTS trip_facts_v2;
DROP TABLE IF EXISTS trip_facts;
DROP TABLE IF EXISTS rooms_cache;
DROP TABLE IF EXISTS hotel_cache;
DROP TABLE IF EXISTS extraction_sessions;
DROP TABLE IF EXISTS extraction_attempts;
DROP TABLE IF EXISTS proposals_enhanced;
DROP TABLE IF EXISTS proposal_images;
DROP TABLE IF EXISTS proposals;
DROP TABLE IF EXISTS travel_searches;
DROP TABLE IF EXISTS BookingHistory;

-- Drop main entity tables
DROP TABLE IF EXISTS trips_v2;
DROP TABLE IF EXISTS Trips;
DROP TABLE IF EXISTS clients_v2;
DROP TABLE IF EXISTS Clients;

-- Drop configuration tables
DROP TABLE IF EXISTS commission_rules;
DROP TABLE IF EXISTS commission_rates;
DROP TABLE IF EXISTS commission_config;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS HtmlDocumentTemplates;
DROP TABLE IF EXISTS instruction_sets;

-- Drop LLM/cache tables
DROP TABLE IF EXISTS llm_trip_context;
DROP TABLE IF EXISTS llm_query_sessions;
DROP TABLE IF EXISTS llm_query_log;
DROP TABLE IF EXISTS llm_faq_cache;
DROP TABLE IF EXISTS llm_failed_queries;
DROP TABLE IF EXISTS llm_conversation_memory;
DROP TABLE IF EXISTS llm_config;

-- Drop maintenance/logging tables
DROP TABLE IF EXISTS facts_dirty_v2;
DROP TABLE IF EXISTS facts_dirty;
DROP TABLE IF EXISTS db_errors;
DROP TABLE IF EXISTS schema_migrations;
DROP TABLE IF EXISTS ActivityLog;
DROP TABLE IF EXISTS search_index;

-- Note: Cannot drop _cf_KV (Cloudflare internal)
-- Note: Cannot drop d1_migrations (D1 internal)
-- Note: Cannot drop sqlite_sequence (SQLite internal)
