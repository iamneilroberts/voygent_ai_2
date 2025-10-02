# Specs Quick Reference

## The Problem We Solved

When working on multiple features in separate Claude Code sessions, specs would "disappear" from VS Code because they live on different feature branches.

## The Solution

**Automatic sync + Permanent worktree = Never lose specs**

## Quick Commands

### View All Specs (Always Works)
```bash
ls -la ../Voygent_specs/specs/
# or
cd ../Voygent_specs/specs/
```

### Create New Spec
```bash
/specify "your feature description"
# ✅ Auto-synced to specs-archive
# ✅ Visible in ../Voygent_specs/specs/
```

### Switch Branches Safely
```bash
git checkout some-other-branch
# 🔄 Auto-sync triggers automatically
# ✅ Your specs are safe!
```

### Manual Sync (if needed)
```bash
.specify/scripts/bash/sync-spec-to-archive.sh
```

## Key Locations

| Location | What It Is | When to Use |
|----------|-----------|-------------|
| `specs/` | Specs on CURRENT branch | Editing specs for current feature |
| `../Voygent_specs/specs/` | ALL specs (permanent) | Viewing/referencing any spec |
| `.git/hooks/post-checkout` | Auto-sync trigger | (Automatic, don't touch) |

## How It Works

1. **Create a spec** → Auto-synced to `specs-archive` branch
2. **Switch branches** → Auto-synced before switching
3. **View anytime** → Check `../Voygent_specs/specs/`

## Multi-Session Development

**Session 1:**
```bash
/specify "add authentication"
# Work on specs/006-add-authentication/
```

**Session 2** (simultaneously):
```bash
/specify "payment integration"
# Work on specs/007-payment-integration/
```

**Both specs** are preserved and visible in `../Voygent_specs/specs/`!

## Troubleshooting

**Q: I switched branches and my specs disappeared!**
A: Normal! Check `../Voygent_specs/specs/` - they're all there.

**Q: How do I get specs back in my current branch?**
A: `cp -r ../Voygent_specs/specs/* specs/`

**Q: Is auto-sync running?**
A: Check `.git/hooks/post-checkout` exists and is executable

## Full Documentation

See [docs/SPECS_WORKFLOW.md](docs/SPECS_WORKFLOW.md) for complete details.

---

**Bottom line:** Work on any feature, switch branches freely. Your specs are automatically preserved in `../Voygent_specs/specs/`. ✅
