---
date: 2026-03-09T18:00:00Z
researcher: Claude
feature: '023-documentation-site'
status: complete
---

# Research: Documentation Website for eai-tools.github.io/gofer/

## Feature Summary

Transform the current single-page releases portal at
`eai-tools.github.io/gofer/` into a comprehensive documentation website with
quickstart guides, pipeline command reference, usage documentation, and the
existing releases/download functionality. The site must continue to serve
`releases.json` for the extension auto-updater.

## Codebase Analysis

### Where to Implement

| Component             | Location                      | Purpose                                              |
| --------------------- | ----------------------------- | ---------------------------------------------------- |
| Current site          | `docs/index.html`             | Single-page releases portal (319 lines)              |
| Releases JSON API     | `docs/releases.json`          | Auto-updater endpoint (must preserve)                |
| VSIX files            | `docs/releases/*.vsix`        | 68 extension packages (must preserve)                |
| GitHub Pages workflow | `.github/workflows/pages.yml` | Deploys `docs/` directory to Pages                   |
| Release script        | `release-auto.sh`             | Updates releases.json, copies VSIX to docs/releases/ |
| Update script         | `docs/update-releases.js`     | Node.js script to update releases.json               |
| Agentic coding docs   | `docs/agentic-coding/`        | 5 existing best practices guides                     |
| Pipeline commands     | `.claude/commands/*.md`       | 15 pipeline command definitions                      |
| Root README           | `README.md`                   | Quick start, feature overview, architecture          |
| CLAUDE.md             | `CLAUDE.md`                   | Pipeline diagram, command reference, configuration   |
| Extension manifest    | `extension/package.json`      | Extension metadata, commands, settings               |
| Changelog             | `extension/CHANGELOG.md`      | Release history                                      |

### Existing Content Inventory

**Already in docs/ (ready to surface):**

| File                                          | Content                          | Lines | Audience      |
| --------------------------------------------- | -------------------------------- | ----- | ------------- |
| `agentic-coding/AGENTIC_CODING_PRINCIPLES.md` | Context management, validation   | ~300  | Developers    |
| `agentic-coding/AGENTIC_TESTING_PATTERNS.md`  | Test execution, retry strategies | ~300  | Developers    |
| `agentic-coding/MULTI_AGENT_ARCHITECTURE.md`  | Sub-agents, LLM Council          | ~400  | Architects    |
| `agentic-coding/ITERATIVE_DEVELOPMENT.md`     | Skateboard methodology           | ~400  | Teams         |
| `agentic-coding/AGENT_TOOLING_REFERENCE.md`   | MCP tools, APIs                  | ~350  | Tool builders |
| `migration-guide.md`                          | Legacy format migration          | ~670  | Upgraders     |
| `API_KEY_SETUP.md`                            | LLM Council API keys             | ~80   | Users         |
| `RELEASE_PROCESS.md`                          | Release process for maintainers  | ~300  | Contributors  |
| `cli-comparison-feb-2026.md`                  | CLI tool comparison              | ~400  | Evaluators    |

**In repo root (needs extraction for docs):**

| File        | Content                                | Lines | Audience  |
| ----------- | -------------------------------------- | ----- | --------- |
| `README.md` | Quick start, overview, architecture    | ~430  | All users |
| `CLAUDE.md` | Pipeline reference, context management | ~500+ | AI agents |

**Pipeline commands (needs conversion for docs):**

| Command                | Description                                 |
| ---------------------- | ------------------------------------------- |
| `/0_business_scenario` | Master orchestrator - triage and auto-chain |
| `/1_gofer_research`    | Deep codebase exploration                   |
| `/2_gofer_specify`     | Feature specification                       |
| `/3_gofer_plan`        | Technical architecture                      |
| `/4_gofer_tasks`       | Task breakdown                              |
| `/5_gofer_implement`   | Implementation execution                    |
| `/6_gofer_validate`    | 10-category validation rubric               |
| `/7_gofer_save`        | Session checkpointing                       |
| `/8_gofer_resume`      | Resume from checkpoint                      |
| `/9_gofer_tests`       | Test generation                             |
| `/10_gofer_cloud`      | Cloud infrastructure analysis               |
| `/gofer_constitution`  | Project principles                          |
| `/gofer_hydrate`       | Reverse-engineer spec from code             |

### Existing Patterns to Follow

#### Pattern 1: Current Release Page Design

Found in: `docs/index.html:1-319`

The current site uses a self-contained HTML file with:

- Purple gradient background
  (`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`)
- System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`)
- Card-based layout with white backgrounds, `border-radius: 12px`, `box-shadow`
- Blue accent color (`#4299e1`) for buttons and highlights
- Dark header (`#2d3748`) for section headers
- Green callout (`#f0fff4` bg, `#9ae6b4` border) for installation guide
- Max-width container (`1200px`)
- Dynamic release loading from `releases.json` via `fetch()`

Why relevant: The new multi-page site should maintain visual consistency with
this design language.

#### Pattern 2: Documentation Organization (Agentic Coding)

Found in: `docs/agentic-coding/README.md:1-134`

Index page pattern with:

- Audience-segmented quick start (Developers, Tool Builders, AI Agents)
- Numbered document list with bold titles and bullet-point summaries
- Key concepts summary table linking concepts to documents
- Version history table

Why relevant: This is the existing pattern for organizing documentation in the
project.

#### Pattern 3: Pipeline Diagram (CLAUDE.md)

Found in: `CLAUDE.md` (pipeline section)

ASCII art pipeline diagram showing:

```
1. /1_gofer_research → research.md
2. /2_gofer_specify → spec.md
3. /3_gofer_plan → plan.md, data-model.md
...
```

Why relevant: This visual representation should be on the documentation site as
a key navigation aid.

### Integration Points

1. **releases.json**: Must remain at `docs/releases.json` - the auto-updater in
   all installed extensions polls this URL every 24 hours
2. **VSIX files**: Must remain at `docs/releases/*.vsix` - download URLs are
   hardcoded in releases.json
3. **GitHub Pages workflow**: `docs/` is uploaded as-is (no build step) - any
   approach must work within this constraint
4. **release-auto.sh**: Writes to `docs/releases/` and `docs/releases.json` -
   must not conflict with new site structure
5. **update-releases.js**: Reads/writes `docs/releases.json` - path must not
   change

### Related Code

- `docs/index.html:231-318` - JavaScript for loading and rendering releases
- `docs/update-releases.js:1-58` - Node.js script for updating releases.json
- `.github/workflows/pages.yml:35-38` - Uploads `docs/` as Pages artifact
- `release-auto.sh:297-309` - Copies VSIX and updates releases.json
- `release-auto.sh:389-466` - Verifies GitHub Pages deployment

## Technology Decisions

### Decision 1: Site Framework - Docsify

- **Choice**: Docsify (client-side documentation renderer)
- **Rationale**:
  1. **Zero build step** - Perfectly preserves existing GitHub Pages deployment
     (no changes to `pages.yml`)
  2. **Perfect coexistence** - `releases.json` and `releases/` remain untouched
     as static files
  3. **No release-auto.sh changes** - Release process continues to work
     identically
  4. **Markdown as source** - Write docs in `.md` files, Docsify renders them in
     the browser
  5. **Built-in features** - Sidebar navigation, full-text search, syntax
     highlighting, dark mode
  6. **Minimal footprint** - Single `<script>` tag + CDN, no dependencies to
     install/maintain
  7. **Production proven** - 27k+ GitHub stars, used by Microsoft, Alibaba Cloud
- **Alternatives considered**:
  - **VitePress/Astro Starlight**: Better SEO and performance (pre-rendered
    HTML), but requires adding a build step to CI/CD and special handling for
    releases.json/VSIX files. Overkill for this project.
  - **Jekyll**: GitHub Pages native support, but requires Ruby, Liquid
    templates, and restructuring docs/
  - **Pure HTML/CSS/JS**: No framework, but means hand-crafting navigation,
    search, etc.
  - **Docusaurus**: React-based, heavyweight, requires build step
  - **MkDocs**: Python-based, requires build step
- **SEO tradeoff**: Docsify renders client-side (Lighthouse ~85-95), not ideal
  for SEO. Acceptable because: (a) this is a developer tool docs site, not a
  marketing page, (b) users find it via GitHub repo, not search engines, (c) can
  add `docsify-server-renderer` later if needed.

### Decision 2: Site Structure

- **Choice**: Docsify-powered multi-page site with the current landing page
  preserved
- **Rationale**: Keep `index.html` as the branded landing page with hero,
  feature highlights, and a "Latest Release" card. Add Docsify at a `#/`
  hash-based routing system within the same page, or as a separate documentation
  portal.
- **Approach**: Convert `index.html` into a landing page that links to
  documentation sections. Docsify handles all `/docs/` markdown rendering.

### Decision 3: Content Strategy

- **Choice**: Write new user-facing documentation pages rather than reusing raw
  command files
- **Rationale**: The `.claude/commands/*.md` files are AI agent instructions
  (prompts), not user documentation. They contain implementation details
  irrelevant to users (sub-agent spawning, context health checks, brownfield
  analysis). Documentation pages should be written for a human audience.
- **Content to create**:
  1. Getting Started / Quick Start (from README.md content)
  2. Installation Guide (expand from current index.html)
  3. Pipeline Overview (user-friendly explanation of 6 stages)
  4. Individual Pipeline Stage guides (what users need to know, not agent
     instructions)
  5. Configuration Reference (extension settings)
  6. Best Practices (curated from agentic-coding/ content)
  7. FAQ / Troubleshooting

### Decision 4: Navigation Architecture

- **Choice**: Top navigation bar + sidebar navigation
- **Rationale**:
  - Top nav: Home, Documentation, Releases, GitHub
  - Sidebar: Hierarchical documentation tree (Getting Started > Pipeline > Best
    Practices > Reference)
  - Docsify's `_sidebar.md` provides automatic sidebar generation

## Constraints & Considerations

- **`releases.json` is a production API**: Any change that moves, breaks, or
  restructures this file will break auto-updates for all installed extensions
- **VSIX files are large**: `docs/releases/` contains ~68 files totaling ~2GB.
  Site framework must not try to process these
- **No build step**: The GitHub Actions workflow uploads `docs/` raw. Adding a
  build step is possible but adds complexity and risk to the release process
- **Copyright**: Footer should maintain "Enterprise AI Pty Ltd. All rights
  reserved."
- **Responsive design**: Current site lacks mobile breakpoints - new site should
  be responsive
- **Dark mode**: Docsify supports this via theme; should match VSCode's
  dark-mode aesthetic

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type   | Description                                          | Impact on Implementation                 |
| ----------------- | ---------------------------------------------------- | ---------------------------------------- |
| No build step     | GitHub Pages deploys docs/ as-is                     | Must use client-side rendering (Docsify) |
| Auto-updater API  | releases.json must stay at docs/releases.json        | Cannot restructure docs root             |
| VSIX distribution | 68 files in docs/releases/                           | Framework must ignore this directory     |
| Existing URLs     | Users may have bookmarked eai-tools.github.io/gofer/ | Landing page URL must not break          |

### Areas Requiring Extra Caution

- **release-auto.sh integration**: This script writes to `docs/releases/` and
  `docs/releases.json`. New documentation files must not conflict.
- **GitHub Pages deployment**: The `pages.yml` workflow uploads the entire
  `docs/` directory. Adding many markdown files is fine; adding a build step
  would require workflow changes.

### Downstream Dependencies

- `extension/src/autoUpdater.ts` - Polls `releases.json` from GitHub Pages
- `release-auto.sh:389-466` - Verifies deployment by checking `releases.json`
- All installed Gofer extensions - Auto-update checks every 24 hours

## Open Questions

- [ ] Should the landing page (index.html) be redesigned, or should
      documentation be added alongside the existing releases page?
- [ ] Should agentic-coding best practices content be included in the docs site,
      or is this too developer/contributor-focused?
- [ ] What is the preferred domain/URL structure? (e.g., `/docs/quickstart` via
      hash routing, or separate pages)

## Recommendations

1. **Use Docsify** for zero-build documentation rendering - add a `<script>` tag
   and markdown files
2. **Redesign index.html** as a proper landing page with hero, features, quick
   start, and link to full docs
3. **Create new user-facing documentation** rather than reusing raw command
   prompt files
4. **Preserve all existing URLs and files** - releases.json, releases/\*.vsix,
   index.html root URL
5. **Add a `_sidebar.md`** for Docsify navigation with hierarchical structure
6. **Create ~8-10 documentation pages** covering quickstart, pipeline,
   configuration, and best practices
7. **Add responsive design** with proper mobile breakpoints (missing from
   current site)
