# Specs Workflow - Persistent Access Across Branches

## Problem

Specs created on feature branches can "disappear" when switching branches, making it hard to maintain a master set of all specifications.

## Solution: Git Worktree

We use a dedicated `specs-archive` branch with a git worktree for persistent access to all specs regardless of your current working branch.

## Setup (Already Complete)

```bash
# 1. Create dedicated specs archive branch
git checkout -b specs-archive
git add specs/
git commit -m "docs: Initialize specs archive"
git push -u origin specs-archive

# 2. Create worktree at parent directory level
cd /home/neil/dev/Voygent_ai_2
git worktree add ../Voygent_specs specs-archive
```

## Directory Structure

```
/home/neil/dev/
├── Voygent_ai_2/          # Main working repository
│   ├── specs/             # Specs on current branch (may be incomplete)
│   └── ...
└── Voygent_specs/         # WORKTREE - Always shows ALL specs
    ├── specs/             # Complete archive of all specs
    │   ├── 001-trip-validation/
    │   ├── 002-librechat-interface-modifications/
    │   ├── 002-rebuild-the-whole/
    │   ├── 002-track-detailed-usage/
    │   ├── 003-customer-dashboard-based/
    │   ├── 003-hardening-voygent-ai/
    │   ├── 004-configure-paid-subscription/
    │   └── 005-add-z-ai/
    └── ...
```

## Daily Workflow

### When Creating a New Spec

```bash
# 1. Create spec on feature branch (as usual)
/specify "your feature description"

# 2. After spec is complete, add it to the archive
git checkout specs-archive
git checkout <feature-branch> -- specs/<new-spec>/
git add specs/<new-spec>/
git commit -m "docs: Add spec <number> from <feature-branch>"
git push

# 3. Return to your feature branch
git checkout <feature-branch>
```

### When Updating an Existing Spec

```bash
# 1. Make changes on your feature branch
# 2. Update the archive
git checkout specs-archive
git checkout <feature-branch> -- specs/<spec-number>/
git add specs/<spec-number>/
git commit -m "docs: Update spec <number> - <description>"
git push

git checkout <feature-branch>
```

### Browsing All Specs Anytime

```bash
# Option 1: Navigate to worktree
cd ../Voygent_specs/specs/
ls -la

# Option 2: Open in your editor
code ../Voygent_specs/specs/

# The specs in Voygent_specs/ are ALWAYS complete,
# regardless of which branch you're on in Voygent_ai_2/
```

## Automated Script (Future Enhancement)

Create `.specify/scripts/bash/sync-spec-to-archive.sh`:

```bash
#!/bin/bash
# Usage: ./sync-spec-to-archive.sh <spec-number>
# Automatically syncs a spec from current branch to specs-archive

SPEC_NUM="$1"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ -z "$SPEC_NUM" ]; then
  echo "Usage: $0 <spec-number>"
  exit 1
fi

git checkout specs-archive
git checkout "$CURRENT_BRANCH" -- "specs/$SPEC_NUM/"
git add "specs/$SPEC_NUM/"
git commit -m "docs: Sync spec $SPEC_NUM from $CURRENT_BRANCH"
git push
git checkout "$CURRENT_BRANCH"

echo "✅ Spec $SPEC_NUM synced to specs-archive"
```

## Worktree Commands Reference

```bash
# List all worktrees
git worktree list

# Remove a worktree (if needed)
git worktree remove ../Voygent_specs

# Prune stale worktree references
git worktree prune

# Re-create worktree if removed
git worktree add ../Voygent_specs specs-archive
```

## Benefits

✅ **Never lose specs** - All specs persisted on specs-archive branch
✅ **Always accessible** - Worktree provides constant access regardless of current branch
✅ **No conflicts** - Archive branch separate from feature branches
✅ **Easy reference** - Browse complete spec history anytime
✅ **GitHub backup** - specs-archive branch pushed to remote

## Current Specs Inventory

As of 2025-10-02, we have 8 specs recovered and archived:

1. **001-trip-validation** - Independent Trip Validation System
2. **002-librechat-interface-modifications** - LibreChat Interface Modifications
3. **002-rebuild-the-whole** - Rebuild LibreChat with Voygent Customizations
4. **002-track-detailed-usage** - Usage Analytics & Cost Monitoring Dashboard
5. **003-customer-dashboard-based** - Travel Agent Customer Dashboard
6. **003-hardening-voygent-ai** - Security Hardening - Prevent Internal Disclosure
7. **004-configure-paid-subscription** - Subscription Tiers & Rate Limiting
8. **005-add-z-ai** - Add z.ai as AI Provider

### Renumbering Plan (Optional)

The current numbering has duplicates (multiple 002s, multiple 003s). If you want clean sequential numbering:

**Option A**: Keep as-is (numbers reflect branch names)
**Option B**: Renumber based on creation order (requires updating branch names)

Recommendation: Keep current numbers to maintain consistency with branch names. Use descriptive names to distinguish duplicates.

## Troubleshooting

### Worktree directory deleted accidentally
```bash
cd /home/neil/dev/Voygent_ai_2
git worktree add ../Voygent_specs specs-archive
```

### Specs archive branch lost
```bash
# Re-create from current specs
git checkout -b specs-archive
git add specs/
git commit -m "docs: Recreate specs archive"
git push -u origin specs-archive
```

### Merge conflicts in specs
```bash
# Specs should rarely conflict, but if they do:
git checkout specs-archive
git merge <feature-branch> --no-commit
# Resolve conflicts manually
git commit
```
