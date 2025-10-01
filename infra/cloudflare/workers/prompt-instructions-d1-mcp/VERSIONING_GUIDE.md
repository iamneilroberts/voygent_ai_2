# Instruction Versioning Guide

## Overview
The prompt-instructions-d1 MCP server now includes comprehensive version management for instruction sets. This guide explains how to use the new admin features.

## Key Features

### 1. Automatic Version Tracking
- Every update creates a version archive
- Version numbers increment automatically
- Change summaries track what was modified
- Previous versions can be restored

### 2. Smart Archival
- Keeps last 10 versions by default (configurable per instruction)
- Major versions are always preserved
- Old versions auto-prune to save space

### 3. Admin Tools

#### Creating Instructions
```typescript
create_instruction({
  name: "new-feature",
  title: "New Feature Guide",
  content: "# How to use...",
  category: "guides",
  version_tag: "draft",
  change_summary: "Initial version for new feature",
  changed_by: "admin"
})
```

#### Updating with Version Tracking
```typescript
update_instruction_versioned({
  name: "existing-instruction",
  content: "Updated content...",
  change_summary: "Fixed typos and added examples",
  changed_by: "kim.henderson",
  is_major_change: false  // true for significant updates
})
```

#### Version History
```typescript
list_instruction_versions({
  name: "startup-core",
  limit: 20  // Show last 20 versions
})
```

#### Restoring Previous Versions
```typescript
restore_instruction_version({
  name: "startup-core",
  version: 5,
  changed_by: "admin"
})
```

#### Comparing Versions
```typescript
diff_instruction_versions({
  name: "mobile-mode",
  version1: 1,
  version2: 3
})
```

### 4. Bulk Operations

#### Find and Replace Across Instructions
```typescript
bulk_update_instructions({
  updates: [
    {
      name: "startup-core",
      field: "content",
      old_value: "old-server-name",
      new_value: "new-server-name"
    },
    {
      name: "mobile-mode",
      field: "content", 
      old_value: "old-server-name",
      new_value: "new-server-name"
    }
  ],
  changed_by: "admin"
})
```

#### Export Instructions
```typescript
export_instructions({
  category: "core"  // Optional filter
})
```

#### Import Instructions
```typescript
import_instructions({
  instructions: [
    {
      name: "imported-instruction",
      title: "Imported Guide",
      content: "Content here...",
      category: "imported"
    }
  ],
  changed_by: "admin",
  overwrite: false  // Set true to update existing
})
```

## Database Schema

### New Tables

1. **instruction_versions** - Stores all historical versions
   - Links to parent instruction
   - Tracks who made changes and when
   - Marks major versions for preservation

2. **instruction_changelog** - Detailed change log
   - Records every action (create, update, restore, delete)
   - Tracks field-level changes
   - Includes session context

### Enhanced instruction_sets Table
- `version_count`: Total versions created
- `last_major_version`: Last major version number
- `change_summary`: Latest change description
- `version_tag`: draft, stable, deprecated
- `last_changed_by`: Who made the last change
- `max_versions`: How many versions to keep (default: 10)

## Best Practices

1. **Always provide meaningful change summaries** - These help track why changes were made

2. **Use version tags appropriately**:
   - `draft`: Work in progress
   - `stable`: Production ready
   - `deprecated`: Scheduled for removal

3. **Mark major changes** - Use `is_major_change: true` for significant updates that should never be pruned

4. **Regular exports** - Periodically export instructions for backup

5. **Test before bulk updates** - Use dry-run or test on single instruction first

## Migration Notes

The migration script (003_instruction_versioning.sql):
- Creates all new tables and indexes
- Archives existing instructions as version 1
- Preserves all current data
- Adds new columns with sensible defaults

## Troubleshooting

### Version Not Found
If a version is missing, it may have been pruned. Check:
- Was it marked as a major version?
- How many versions are configured to keep?
- When was it created?

### Restore Failed
Common issues:
- Instruction doesn't exist
- Version number invalid
- Database permissions

### Performance
- Indexes are created on key fields
- Old versions are pruned automatically
- Cache is cleared on updates