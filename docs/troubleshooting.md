# Troubleshooting Guide

This guide helps you diagnose and fix common Vellum issues.

## Common Issues

### 1. "Git signature verification failed"

**Symptom**: Approval command fails with signature error.

**Cause**: Git not configured for GPG signing, or signing key missing.

**Solution**:

```bash
# Check if GPG is installed
gpg --version

# Generate a GPG key (if needed)
gpg --full-generate-key

# List your keys
gpg --list-secret-keys --keyid-format=long

# Configure git to use your key
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true

# Test signing
echo "test" | gpg --clearsign

# Verify git config
git config --global --list | grep sign
```

### 2. "Detected AI assistant session"

**Symptom**: `vellum approve` refuses with assistant detection.

**Cause**: Running from an AI assistant session (Claude, Kiro, etc.).

**Solution**: Approvals must come from a human in a real terminal.

- Copy the approve command to your terminal
- Run it directly (not via AI)
- Ensure no `CLAUDE_SESSION`, `KIRO_SESSION`, etc. env vars are set

### 3. "Preconditions not met"

**Symptom**: `vellum task start` or `vellum approve` fails.

**Possible causes**:

1. **Artifacts missing**: requirements.md, design.md, or tasks.md not found
2. **Approvals missing**: Previous stage not approved
3. **Checksum mismatch**: Artifact changed after approval
4. **Invalid state**: Not in correct state for this action

**Debug steps**:

```bash
# Check status
vellum status 001

# Run diagnostics
vellum doctor

# Check specific preconditions
vellum check 001 --json | jq '.unmetPreconditions'
```

**Common fixes**:

```bash
# If artifacts missing
touch .agents/specs/001/requirements.md
touch .agents/specs/001/design.md
touch .agents/specs/001/tasks.md

# If approvals missing
vellum approve 001 requirements

# If checksum mismatch
# Re-approve the changed artifact
```

### 4. "Ledger integrity failure"

**Symptom**: Verification fails with ledger integrity error.

**Cause**: Ledger `.sdlc/ledger.jsonl` corrupted or tampered.

**Types of failures**:

1. **Broken chain**: Predecessor digest mismatch
2. **Missing entry**: Referenced entry doesn't exist
3. **Fork detected**: Duplicate predecessor digest
4. **Schema invalid**: Entry doesn't match schema

**Recovery**:

```bash
# Check ledger manually
cat .agents/specs/001/.sdlc/ledger.jsonl | jq -c '.'

# Validate each entry
cat .agents/specs/001/.sdlc/ledger.jsonl | while read line; do
  echo "$line" | jq '.'
done

# If entries are corrupted, you may need to:
# 1. Restore from backup
# 2. Re-create approvals (with history)
# 3. Start fresh (only if acceptable)
```

**Prevention**: Commit ledger to git, use `git revert` instead of manual edits.

### 5. "Checksum mismatch at task completion"

**Symptom**: `vellum task complete` fails with checksum error.

**Cause**: Artifact changed during task execution.

**Solution**:

```bash
# Check what changed
git diff .agents/specs/001/

# If change is legitimate
# 1. Cancel current task
vellum task cancel 001 T2.1

# 2. Re-approve if necessary
vellum approve 001 requirements

# 3. Restart task
vellum task start 001 T2.1

# If change is accidental
git checkout -- .agents/specs/001/
vellum task complete 001 T2.1
```

### 6. "No tests found"

**Symptom**: Mutation testing or coverage checks fail.

**Cause**: Test files not found by vitest.

**Solution**:

```bash
# Check test file locations
find packages/engine -name "*.test.ts"

# Verify vitest config
cat packages/engine/vitest.config.ts

# Run tests manually
cd packages/engine
pnpm test

# Check coverage include/exclude
cat packages/engine/vitest.config.ts | grep -A10 "coverage"
```

### 7. "Bundle size exceeds limit"

**Symptom**: Bundle size check fails (< 500KB).

**Cause**: Too much code bundled, large dependencies.

**Solution**:

```bash
# Check bundle size
du -sh packages/vellum/dist/

# Analyze bundle
pnpm build --analyze

# Check for accidental dependencies
cat packages/vellum/package.json | grep dependencies

# Ensure only workspace dependencies
# Remove any external runtime dependencies
```

### 8. "Unknown command"

**Symptom**: `vellum <command>` returns "unknown command".

**Cause**: Command not implemented or typo.

**Solution**:

```bash
# List available commands
vellum --help

# Check spelling
vellum lint   # not 'lints' or 'Lint'

# Ensure Vellum installed
npx vellum --version
```

### 9. "Spec not found"

**Symptom**: Command returns "spec not found" or "invalid spec ID".

**Cause**: Spec directory doesn't exist or naming issue.

**Solution**:

```bash
# Check spec directory exists
ls -la .agents/specs/

# Verify naming
# Valid: 001-feature-name, 002-xyz
# Invalid: feature-name (missing number), 1 (missing name)

# Create missing spec
mkdir -p .agents/specs/001-my-feature
```

### 10. "Permission denied"

**Symptom**: Commands fail with permission errors.

**Cause**: File permissions, git hooks, or directory ownership.

**Solution**:

```bash
# Fix file permissions
chmod 644 .agents/specs/**/*.md
chmod 755 .agents/specs/*/

# Fix git hooks
chmod +x .git/hooks/pre-*

# Fix ownership (if needed)
chown -R $USER:$USER .agents/
```

## Running Diagnostics

Use `vellum doctor` for comprehensive checks:

```bash
vellum doctor
```

This checks:
- Git version and config
- GPG signing setup
- Node.js version
- Package installation
- Spec directory structure
- File permissions

**Output**:

```
Running diagnostics...

✅ Git version: 2.43.0
✅ Git configured: user.name, user.email
✅ GPG signing: enabled
✅ Node.js: 22.0.0
✅ Vellum: installed
✅ .agents/specs/ exists
✅ Found 3 specs

Status: All checks passed
```

## Debug Mode

Enable verbose logging:

```bash
# Environment variable
VELLUM_LOG_LEVEL=debug vellum status 001

# For mutation testing
stryker run --logLevel debug --fileLogLevel trace
```

## Getting Help

1. **Check documentation**: [CLI Reference](cli/README.md), [Getting Started](guides/getting-started.md)
2. **Run diagnostics**: `vellum doctor`
3. **Check examples**: See `fixtures/` directory for valid specs
4. **Search issues**: Check GitHub issues for similar problems
5. **Ask for help**: Open a GitHub issue with:
   - `vellum doctor` output
   - Command that failed
   - Full error message
   - Node.js version, OS, etc.

## Verified Approaches

### "Works on my machine" checklist

Before asking for help, verify:

- [ ] Node.js >= 22.0.0 (`node --version`)
- [ ] Git >= 2.28 (`git --version`)
- [ ] GPG configured (if using approvals)
- [ ] `.agents/specs/` exists
- [ ] Spec directories follow `NNN-name` pattern
- [ ] All artifacts have frontmatter
- [ ] Spec directory has `.sdlc/` after `vellum adopt`
- [ ] Git repository initialized
- [ ] Working directory is repo root

### Common setups

**Minimal setup (checking only)**:

```bash
mkdir -p .agents/specs/001-test
touch .agents/specs/001-test/{requirements,design,tasks}.md
# Add frontmatter to each
vellum lint
vellum check
```

**Full setup (with approvals)**:

```bash
mkdir -p .agents/specs/001-test
touch .agents/specs/001-test/{requirements,design,tasks}.md
# Add frontmatter
# Configure GPG
git config --global commit.gpgsign true
git config --global user.signingkey YOUR_KEY
# Set state to IN_REVIEW
vellum approve 001 requirements
```

## Performance Issues

### Slow lint/check/verify

**Possible causes**:
- Large number of specs
- Deep dependency graphs
- Slow git operations
- Network calls (should be zero)

**Solutions**:

```bash
# Filter to specific spec
vellum check 001

# Check offline (ensure no network)
VELLUM_OFFLINE=1 vellum check

# Profile git operations
GIT_TRACE=1 vellum check 2>&1 | grep trace

# Use cache
cat .sdlc/cache/verification-*.json
```

### Mutation testing slow

**Possible causes**:
- Too many mutants
- Slow tests
- Low concurrency

**Solutions**:

```bash
# Reduce concurrency (if memory limited)
# Edit .stryker.config.json: "concurrency": 1

# Target specific files
stryker run --mutate packages/engine/src/lifecycle/*.ts

# Use incremental mode (Stryker 10+)
stryker run --incremental

# Skip type checking
stryker run --disableTypeChecks
```

---

Still stuck? Open an issue at https://github.com/figentra/vellum/issues
