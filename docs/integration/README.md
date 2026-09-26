# Integration Guides

Vellum integrates with AI assistants, CI systems, and development workflows.

## AI Assistant Integration

### Claude (Anthropic)

**Setup**:

```bash
vellum sync --target claude
```

This creates files in `~/.claude/` with:
- Proper frontmatter format for Claude
- Relative links to your specs
- Provenance markers

**Features**:
- Claude can read spec status via `~/.claude/skills/`
- Context about specs automatically available
- Task progress tracked

**Example Claude Prompt**:
```
Check the status of spec 001 and help me work on the next task.
```

**Configuration**: Add to `~/.claude/config.json`:

```json
{
  "skills": ["/Users/you/.claude/skills/vellum-status.md"]
}
```

### Kiro (Cline in VS Code)

**Setup**:

```bash
vellum sync --target kiro
```

**Features**:
- Kiro-compatible frontmatter
- Integration with `.agents/rules/`
- Task context in workspace

**Configuration**: Add to `.vscode/settings.json`:

```json
{
  "cline.customInstructions": [
    ".agents/rules/vellum-workflow.md"
  ]
}
```

### OpenCode

**Setup**:

```bash
vellum sync --target opencode
```

**Features**:
- OpenCode session integration
- Skill definitions for spec operations
- Automatic status checks

**Configuration**: Add to `~/.opencode/config.json`:

```json
{
  "skills": ["~/.opencode/skills/vellum.json"]
}
```

## CI/CD Integration

### GitHub Actions

Basic workflow:

```yaml
# .github/workflows/spec-check.yml
name: Specification Checks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    name: Check Specifications
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Check specifications
        run: pnpm vellum check
      
      - name: Verify specifications
        run: pnpm vellum verify
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: spec-results
          path: .sdlc/cache/verification-*.json
```

With caching:

```yaml
jobs:
  check:
    steps:
      - name: Restore spec cache
        uses: actions/cache@v4
        with:
          path: .sdlc/cache
          key: spec-${{ hashFiles('.agents/specs/**/*.md') }}
          restore-keys: spec-
      
      - name: Check specifications
        run: pnpm vellum check
      
      - name: Save spec cache
        uses: actions/cache/save@v4
        with:
          path: .sdlc/cache
          key: spec-${{ hashFiles('.agents/specs/**/*.md') }}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
spec:check:
  image: node:22
  stage: test
  
  cache:
    paths:
      - node_modules/
      - .sdlc/cache/
  
  script:
    - npm ci
    - npx vellum check
    - npx vellum verify
  
  artifacts:
    paths:
      - .sdlc/cache/verification-*.json
    expire_in: 1 week
  
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

### CircleCI

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  spec-check:
    docker:
      - image: cimg/node:22.0
    steps:
      - checkout
      - restore_cache:
          keys:
            - v1-deps-{{ checksum "pnpm-lock.yaml" }}
            - v1-deps-
      - run:
          name: Install dependencies
          command: pnpm install --frozen-lockfile
      - save_cache:
          paths:
            - node_modules
          key: v1-deps-{{ checksum "pnpm-lock.yaml" }}
      - run:
          name: Check specifications
          command: pnpm vellum check
      - run:
          name: Verify specifications
          command: pnpm vellum verify
      - store_artifacts:
          path: .sdlc/cache
          destination: spec-cache

workflows:
  version: 2
  check:
    jobs:
      - spec-check
```

## Git Hooks

### Pre-commit Hook

Install lint-staged:

```bash
npm install --save-dev lint-staged
```

Add to `package.json`:

```json
{
  "lint-staged": {
    ".agents/specs/**/*.md": [
      "vellum check"
    ]
  }
}
```

Or manually:

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Check if spec files changed
if git diff --cached --name-only | grep -q ".agents/specs/"; then
  echo "Checking specifications..."
  pnpm vellum check || exit 1
fi
```

### Pre-push Hook

```bash
# .git/hooks/pre-push
#!/bin/bash

# Verify specs before pushing
echo "Verifying specifications..."
pnpm vellum verify || {
  echo "Verification failed. Fix issues before pushing."
  exit 1
}
```

### Husky Setup

```bash
npm install --save-dev husky
npx husky init
```

Add hooks:

```bash
# .husky/pre-commit
pnpm vellum check

# .husky/pre-push
pnpm vellum verify
```

## Editor Integration

### VS Code

**Task Matcher Extension**:

```json
// .vscode/settings.json
{
  "todo-tree.general.tags": [
    {
      "tag": "[ ]",
      "pattern": "\\[ \\]",
      "name": "TODO"
    },
    {
      "tag": "[x]",
      "pattern": "\\[x\\]",
      "name": "DONE"
    },
    {
      "tag": "[-]",
      "pattern": "\\[-\\]",
      "name": "IN_PROGRESS"
    }
  ]
}
```

**Workspace Recommendations**:

```json
// .vscode/extensions.json
{
  "recommendations": [
    "bierner.markdown-yaml-preamble",
    "yzhang.markdown-all-in-one"
  ]
}
```

### JetBrains IDEs

Configure file watcher:

```xml
<!-- .idea/watcherTasks.xml -->
<project version="4">
  <component name="ProjectFileWatcherManager">
    <watchers>
      <TaskOptions isEnabled="true">
        <option name="check" value="true" />
        <option name="checkFilePattern" value=".agents/specs/**/*.md" />
        <option name="command" value="vellum" />
        <option name="arguments" value="check" />
      </TaskOptions>
    </watchers>
  </component>
</project>
```

## API Integration

### Node.js

```typescript
import { check, verify, status } from '@figentra/vellum';

const result = await check({ json: true });
console.log(result.findings);

const ver = await verify({ spec: '001' });
console.log(ver.passed);

const st = await status({ spec: '001' });
console.log(st.effectiveState);
```

### HTTP API (via MCP)

Run the MCP server:

```bash
vellum mcp-server
```

Connect via MCP client:

```json
{
  "mcpServers": {
    "vellum": {
      "command": "npx",
      "args": ["@figentra/vellum", "mcp"]
    }
  }
}
```

## Custom Tool Integration

### Programmatic Access

Use the engine package directly:

```typescript
import { Validator } from '@vellum/engine';
import { FsReader, GitReader } from '@vellum/storage';

const validator = new Validator({
  reader: new FsReader(),
  git: new GitReader(),
});

const findings = await validator.validate('requirements.md');
```

### Event Hooks

Subscribe to spec events:

```typescript
import { EventEmitter } from 'events';

const events = new EventEmitter();

events.on('spec:approved', (data) => {
  console.log(`Spec ${data.specId} approved by ${data.approver}`);
});

events.on('task:completed', (data) => {
  console.log(`Task ${data.taskId} completed with commit ${data.commit}`);
});
```

## Third-Party Tools

### GitHub Bot

Create a GitHub App that:

1. Listens for PR events
2. Checks if `.agents/specs/` modified
3. Runs `vellum check`
4. Posts status check

### Slack Integration

Use webhook to post status:

```bash
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"Spec 001 moved to $(vellum status 001 --json | jq -r .effectiveState)\"}"
```

### Notion Integration

Sync spec status to Notion database via API (custom script required).

---

For more details, see:
- [CLI Reference](../cli/README.md)
- [API Documentation](../api.md)
- [Architecture](../architecture.md)
