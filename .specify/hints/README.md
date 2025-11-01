# Hints Directory

This directory contains markdown files with coding standards, patterns, and
context for SpecGofer's autonomous implementation.

## How Hints Work

Hints are hierarchical context files that get injected during autonomous task
execution:

1. **Global hints** (this directory): Apply to all tasks
2. **Project hints** (subdirectories): Apply to specific areas of the codebase
3. **Directory hints** (alongside source files): Apply to specific modules

More specific hints take precedence over general hints.

## File Organization

```
.specify/hints/
├── global.md          # Global coding standards (applies everywhere)
├── README.md          # This file
├── api/              # API-specific hints
│   └── conventions.md
├── ui/               # UI-specific hints
│   └── patterns.md
└── testing/          # Testing-specific hints
    └── guidelines.md
```

## Creating Hints

Hints are standard markdown files with optional YAML frontmatter:

```markdown
---
title: API Design Conventions
tags: [api, rest, design]
version: 1.0
---

# API Design Conventions

Your content here...
```

## Priority System

Hints are merged with the following priority (highest to lowest):

1. **Priority 10**: Directory-level hints (in source directory)
2. **Priority 5**: Project-level hints (in `.specify/hints/`)
3. **Priority 1**: Global hints (in `.specify/hints/global.md`)

## Spec-Declared Hints

Specs can explicitly declare required hints in their frontmatter:

```yaml
---
spec_id: '005-authentication'
hints:
  - api-design
  - security-patterns
---
```

These hints will be loaded from `.specify/hints/<hint-name>.md` or
`.specify/hints/<hint-name>/index.md`.

## Performance

- Hints are discovered once per session and cached
- File system watcher invalidates cache when hints change
- Hint loading adds <500ms overhead to autonomous startup

## Best Practices

1. **Keep hints focused**: One topic per file
2. **Use frontmatter**: Include metadata for better discovery
3. **Be specific**: Directory-level hints override global hints
4. **Keep it concise**: Hints should be <5000 characters
5. **Use examples**: Show, don't just tell

## Examples

See `global.md` for an example global hint file.
