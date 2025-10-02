# Specs Workflow - Multi-Session Development

## Problem

When working on multiple features simultaneously in separate Claude Code sessions, specs can "disappear" when switching branches. This happens because specs live on feature branches, and Git only shows files from the current branch.

## Solution: Auto-Sync + Worktree

We use a two-part solution:

1. **Automatic Sync** - Specs are automatically synced to `specs-archive` branch
   - When creating a new spec with `/specify`
   - When switching branches (via Git hook)
   - Manually with `sync-spec-to-archive.sh`

2. **Git Worktree** - Permanent view of all specs
   - Located at `../Voygent_specs/specs/`
   - Always shows ALL specs regardless of current branch
   - Safe to browse, search, and reference

## How It Works

### Automatic Sync Triggers

The system automatically preserves your specs in three scenarios:

1. **New Spec Creation**
   ```bash
   /specify "my new feature"
   # ✅ Automatically synced to specs-archive
   ```

2. **Branch Switching**
   ```bash
   git checkout other-feature
   # 🔄 Auto-syncing specs to archive...
   # ✅ Sync complete
   ```

3. **Manual Sync** (if needed)
   ```bash
   .specify/scripts/bash/sync-spec-to-archive.sh
   ```

### What Gets Synced

- All files in `specs/` directory on your current branch
- Synced to `specs-archive` branch
- Pushed to GitHub (if possible)
- Visible in `../Voygent_specs/` worktree

## Multi-Session Workflow

### Working on Multiple Features Simultaneously

**Session 1: Feature A**
```bash
cd ~/dev/Voygent_ai_2
/specify "add user authentication"
# Creates: 006-add-user-authentication branch
# Syncs to: specs-archive automatically
# Edit spec, work on implementation...
```

**Session 2: Feature B** (different terminal/Claude Code instance)
```bash
cd ~/dev/Voygent_ai_2
/specify "payment integration"
# Creates: 007-payment-integration branch
# Syncs to: specs-archive automatically
# Both specs now in specs-archive!
```

**Viewing All Specs** (from any session)
```bash
cd ~/dev/Voygent_specs/specs/
ls -la
# Shows ALL specs:
# 001-trip-validation
# 002-librechat-interface-modifications
# 003-customer-dashboard-based
# 006-add-user-authentication
# 007-payment-integration
# ... and more
```

### Key Benefits

✅ **No spec loss** - Auto-sync prevents accidental deletion
✅ **Multi-session safe** - Work on different specs in parallel
✅ **Always accessible** - View all specs via worktree anytime
✅ **GitHub backed up** - specs-archive branch pushed to remote
✅ **Zero manual work** - Everything happens automatically

## Directory Structure

```
/home/neil/dev/
├── Voygent_ai_2/                    # Main repository
│   ├── specs/                       # Specs on CURRENT branch only
│   │   └── 006-add-user-auth/      # Only if on this branch
│   ├── .git/hooks/post-checkout    # Auto-sync hook
│   └── .specify/scripts/bash/
│       └── sync-spec-to-archive.sh # Sync script
│
└── Voygent_specs/                   # WORKTREE (always complete)
    ├── specs/                       # ALL specs from ALL branches
    │   ├── 001-trip-validation/
    │   ├── 002-librechat-interface-modifications/
    │   ├── 003-customer-dashboard-based/
    │   ├── 006-add-user-auth/
    │   ├── 007-payment-integration/
    │   └── ... (complete archive)
    └── docs/
        └── SPECS_WORKFLOW.md       # This file
```

## Common Scenarios

### Scenario 1: Creating a New Spec

```bash
# In any Claude Code session
/specify "implement dashboard analytics"

# What happens automatically:
# 1. Creates branch: 008-implement-dashboard
# 2. Creates spec file: specs/008-implement-dashboard/spec.md
# 3. Syncs to specs-archive
# 4. Available in ../Voygent_specs/specs/
```

### Scenario 2: Switching Between Features

```bash
# Session 1: Working on feature A
git checkout 006-add-user-auth
# Your work is here: specs/006-add-user-auth/

# Switch to feature B
git checkout 007-payment-integration
# 🔄 Auto-sync triggered
# ✅ Feature A synced to specs-archive
# Now working on: specs/007-payment-integration/

# Meanwhile, ALL specs still visible in:
ls ../Voygent_specs/specs/
# Both 006 and 007 are there!
```

### Scenario 3: Concurrent Development

```bash
# Terminal 1 / Claude Code Session 1
cd ~/dev/Voygent_ai_2
git checkout 006-add-user-auth
# Edit specs/006-add-user-auth/spec.md
# Implement features...

# Terminal 2 / Claude Code Session 2 (SIMULTANEOUSLY)
cd ~/dev/Voygent_ai_2
git checkout 007-payment-integration
# Edit specs/007-payment-integration/spec.md
# Implement features...

# Both specs are preserved!
# Check anytime: ls ../Voygent_specs/specs/
```

### Scenario 4: Referencing Other Specs

```bash
# From any branch, reference other specs:
cat ../Voygent_specs/specs/002-librechat-interface-modifications/spec.md
grep "authentication" ../Voygent_specs/specs/*/spec.md
code ../Voygent_specs/specs/  # Open all specs in VS Code
```

## Manual Operations

### Force Sync Current Branch

```bash
.specify/scripts/bash/sync-spec-to-archive.sh
```

### View Worktree Status

```bash
git worktree list
# Shows:
# /home/neil/dev/Voygent_ai_2         <current-branch>
# /home/neil/dev/Voygent_specs        specs-archive
```

### Recreate Worktree (if deleted)

```bash
cd ~/dev/Voygent_ai_2
git worktree add ../Voygent_specs specs-archive
```

### Check Which Specs Are Synced

```bash
cd ../Voygent_specs
git log --oneline | head -20
# Shows all sync commits from different branches
```

## Troubleshooting

### Specs Missing After Branch Switch

**Symptom**: Switched branches and specs disappeared from `specs/` directory
**Solution**: This is normal! View all specs in `../Voygent_specs/specs/`

The specs are safe in specs-archive. Your current branch just doesn't have that spec folder.

### Worktree Directory Deleted

**Symptom**: `../Voygent_specs` folder missing
**Solution**: Recreate the worktree

```bash
cd ~/dev/Voygent_ai_2
git worktree add ../Voygent_specs specs-archive
```

### Sync Not Running Automatically

**Symptom**: Created a spec but it's not in specs-archive
**Solution**: Run manual sync

```bash
.specify/scripts/bash/sync-spec-to-archive.sh
```

Check hook is installed:
```bash
ls -la .git/hooks/post-checkout
# Should exist and be executable
```

### Merge Conflicts in specs-archive

**Symptom**: Git reports conflicts when syncing
**Solution**: specs-archive is append-only, conflicts rare

If it happens:
```bash
cd ../Voygent_specs  # Go to worktree
git status            # Check conflicts
# Manually resolve, then:
git add specs/
git commit
git push
```

## Technical Details

### Git Hook Implementation

`.git/hooks/post-checkout`:
- Runs after every `git checkout`
- Calls `sync-spec-to-archive.sh` in background
- Silent operation (doesn't block checkout)

### Sync Script Logic

`.specify/scripts/bash/sync-spec-to-archive.sh`:
1. Stashes current work (if any)
2. Switches to specs-archive
3. Copies `specs/` from your feature branch
4. Commits changes
5. Pushes to GitHub
6. Returns to original branch
7. Restores stashed work

### Worktree vs Regular Clone

**Worktree** (what we use):
- Single `.git` directory
- Multiple checkouts of different branches
- Efficient disk usage
- Instant sync between worktrees

**Regular Clone**:
- Separate `.git` directory
- Requires manual sync
- More disk space
- Independent repositories

## Best Practices

### Do's ✅

- Let auto-sync handle preserving specs
- Use worktree (`../Voygent_specs/`) to view all specs
- Work on multiple features in parallel confidently
- Reference specs across features using worktree path
- Commit spec updates to your feature branch regularly

### Don'ts ❌

- Don't edit specs directly in `../Voygent_specs/` (it's on specs-archive branch)
- Don't worry if specs disappear from `specs/` when switching branches
- Don't manually copy specs between branches
- Don't delete the worktree directory
- Don't commit directly to specs-archive branch

## Architecture Decisions

**Why auto-sync instead of symlinks?**
- Symlinks break on Windows
- Git doesn't track symlink targets well
- Auto-sync creates clean git history

**Why worktree instead of submodule?**
- Worktrees share single `.git` directory
- Faster sync
- No separate remote required
- Simpler workflow

**Why specs-archive branch?**
- Clean separation from feature branches
- Easy to browse complete spec history
- Can deploy docs from this branch
- GitHub backup included

**Why post-checkout hook?**
- Runs automatically on branch switch
- Users don't need to remember manual sync
- Prevents accidental spec loss
- Non-blocking (runs in background)

## Future Enhancements

Potential improvements:
- [ ] Auto-sync on spec file changes (using inotify/fswatch)
- [ ] Spec conflict detection across branches
- [ ] Web view of all specs (deploy specs-archive to GitHub Pages)
- [ ] Slack/Discord notification when new specs added
- [ ] Spec dependency graph visualization

## Summary

With this workflow, you can:

1. **Work on multiple features** in different Claude Code sessions
2. **Never lose specs** - auto-sync preserves everything
3. **View all specs anytime** via `../Voygent_specs/specs/`
4. **Zero manual work** - automation handles everything

The key insight: **Your current branch has the spec you're working on, but the worktree has ALL specs.**

This separation allows parallel development without conflicts or data loss.
