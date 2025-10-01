# Database Cleanup Backup Summary

**Date**: 2025-07-28
**Purpose**: Backup data before dropping obsolete tables

## Tables Being Backed Up

### dv_searches (5 records)
- Backed up to: `dv_searches_backup.json`
- Contains: Delta Vacations search queries (JFK-CDG, JFK-DUB, LAX-FCO routes)

### temp_driving_analysis (14 records)  
- Backed up to: `temp_driving_analysis_backup.json`
- Contains: Ireland trip driving route analysis

### dv_hotels (186 records)
- **NOTE**: Too large to backup individually due to D1 query limits
- Sample saved above shows structure
- Contains: Hotel search results from Delta Vacations searches
- **Recommendation**: If needed later, export via D1 console or rebuild from search functionality

### dv_flight_options (10 records)
- **NOTE**: Small table, will backup before dropping
- Contains: Flight options from Delta Vacations searches

## Tables to Drop After Backup
1. `dv_searches` (5 records)
2. `dv_hotels` (186 records) 
3. `dv_flight_options` (10 records)
4. `temp_driving_analysis` (14 records)
5. `gallery_sessions` (0 records)
6. `gallery_images` (0 records)
7. `image_selections` (0 records)
8. `Activities` (0 records)

**Total records being deleted**: 215 records
**Total tables being dropped**: 8 tables