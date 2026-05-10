# Research Stage

**Command**: `/1_gofer_research` **Output**: `research.md`

The research stage is the foundation of the pipeline. It explores your codebase
to understand existing patterns, integration points, and technology decisions
before any code is written.

## What It Does

1. **Spawns parallel research agents** that explore your codebase
   simultaneously:
   - **Codebase Locator** - finds WHERE relevant code lives (files, directories,
     entry points)
   - **Codebase Analyzer** - explains HOW existing features work (architecture,
     data flow)
   - **Pattern Finder** - shows EXAMPLES to follow (similar implementations,
     conventions)

2. **Researches technology decisions** - evaluates libraries, frameworks, and
   best practices

3. **Documents constraints** - identifies limitations, deprecated patterns, and
   areas requiring caution

## When to Use

- Starting a new feature from scratch
- Modifying existing functionality and need to understand the current
  implementation
- Exploring a codebase before making changes
- Investigating a bug's root cause

## What You Get

The `research.md` file includes:

| Section              | Content                                         |
| -------------------- | ----------------------------------------------- |
| Where to Implement   | File paths and components for the new code      |
| Existing Patterns    | Code examples to model after                    |
| Integration Points   | Where new code connects to existing systems     |
| Technology Decisions | Libraries and frameworks chosen, with rationale |
| Constraints          | Limitations and areas requiring caution         |
| Brownfield Analysis  | Technical debt and deprecated patterns to avoid |

## Example

```text
/1_gofer_research How does authentication work in this codebase?
```

This will produce a `research.md` documenting the auth architecture, middleware
patterns, token handling, and integration points.

## Running Standalone

Research can be run independently (without the full pipeline) for codebase
exploration:

```text
/1_gofer_research Explore the database layer and ORM patterns
```

When run standalone, you'll be asked if you want to continue to the
specification stage.
