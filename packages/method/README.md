# @vellum/method

This package contains the Vellum method as data:

- **skills/** — spec, spec-new, spec-design, spec-tasks, spec-implement, spec-run, spec-verify, failure-loop, durable-findings
- **agents/** — role agents (neutral frontmatter, tier not model)
- **templates/** — requirements.md, design.md, tasks.md
- **prompts/** — prompt catalog (P0.1 … P9.3), versioned

## Important

- This package contains **NO CODE** — only Markdown, JSON, and templates.
- It never imports from other packages.
- Plugin packages (`plugin-*`) assemble from this data for each assistant.
