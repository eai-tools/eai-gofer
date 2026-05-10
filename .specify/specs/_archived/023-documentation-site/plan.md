---
feature: 023-documentation-site
spec: spec.md
research: research.md
status: ready
created: 2026-03-09
---

# Implementation Plan: Documentation Website

## Technical Context

### Tech Stack

- **Framework**: Docsify v4 (via CDN - no local install)
- **Content**: Markdown files rendered client-side
- **Styling**: Custom CSS extending existing purple gradient design
- **Deployment**: GitHub Pages (static upload of docs/ directory)
- **Testing**: Manual browser testing (no automated tests - static content only)

### Architecture

```
docs/                              → https://eai-tools.github.io/gofer/
├── index.html                     → Landing page + Docsify app shell
├── _sidebar.md                    → Navigation structure (Docsify)
├── _navbar.md                     → Top navigation bar (Docsify)
├── .nojekyll                      → Prevent GitHub Pages Jekyll processing
├── README.md                      → Docs home (rendered by Docsify at #/)
├── quickstart.md                  → Getting started guide
├── pipeline/
│   ├── README.md                  → Pipeline overview with diagram
│   ├── research.md                → /1_gofer_research user guide
│   ├── specify.md                 → /2_gofer_specify user guide
│   ├── plan.md                    → /3_gofer_plan user guide
│   ├── tasks.md                   → /4_gofer_tasks user guide
│   ├── implement.md               → /5_gofer_implement user guide
│   └── validate.md                → /6_gofer_validate user guide
├── guides/
│   ├── README.md                  → Guides index
│   ├── configuration.md           → Extension settings reference
│   ├── session-management.md      → Save/resume workflow
│   └── auxiliary-commands.md      → /7-/10 + hydrate + constitution
├── releases.html                  → Releases page (migrated from old index.html)
├── releases.json                  → *** UNCHANGED - auto-updater API ***
├── releases/                      → *** UNCHANGED - VSIX files ***
├── update-releases.js             → *** UNCHANGED - release updater ***
├── assets/
│   └── css/
│       └── custom.css             → Custom Docsify theme overrides
└── [existing md files]            → Preserved (agentic-coding/, etc.)
```

### Integration Points

| Component         | File                          | Integration Type                             |
| ----------------- | ----------------------------- | -------------------------------------------- |
| Auto-updater API  | `docs/releases.json`          | Must preserve exact path and schema          |
| VSIX distribution | `docs/releases/*.vsix`        | Must preserve all download URLs              |
| Release script    | `release-auto.sh`             | No changes needed - writes to docs/releases/ |
| Pages workflow    | `.github/workflows/pages.yml` | No changes needed - deploys docs/ as-is      |
| Release updater   | `docs/update-releases.js`     | No changes needed                            |

### Key Dependencies

- Docsify v4 via CDN (`cdn.jsdelivr.net/npm/docsify@4`)
- Docsify search plugin via CDN
- Docsify copy-code plugin via CDN (for code snippet copying)
- No local npm dependencies

## Constitution Check

- [x] Test-Driven Development: N/A - this feature is static HTML/CSS/Markdown,
      no executable code
- [x] No build step required - aligns with existing deployment pattern
- [x] Preserves all existing functionality (releases, auto-updater)

## Implementation Phases

### Phase 1: Docsify Setup & Landing Page

**Goal**: Set up Docsify framework and transform index.html into a proper
landing page

**Tasks**:

- [ ] Create `docs/.nojekyll` file (prevents GitHub Pages from using Jekyll)
- [ ] Transform `docs/index.html` into Docsify app shell with landing page hero
      section
  - Keep: hero section, feature highlights, latest release card
  - Add: Docsify `<script>` tags and configuration
  - Add: Top navigation bar (Home, Docs, Releases, GitHub)
  - Add: Link to full documentation
- [ ] Create `docs/assets/css/custom.css` with theme overrides matching existing
      design
  - Purple gradient background for hero
  - Card-based layout styles
  - Responsive breakpoints for mobile
  - Code block styling
- [ ] Create `docs/_navbar.md` with top navigation links
- [ ] Create `docs/_sidebar.md` with documentation hierarchy
- [ ] Create `docs/README.md` as the docs home page (what Docsify renders at
      `#/`)
- [ ] Migrate releases page content to `docs/releases.html` (standalone page
      linked from nav)

**Verification**:

- [ ] Open `docs/index.html` locally - landing page renders correctly
- [ ] Docsify loads and sidebar appears
- [ ] Top nav links work
- [ ] `releases.json` is still accessible at its original path

### Phase 2: Core Documentation Pages

**Goal**: Write the essential documentation content

**Tasks**:

- [ ] Write `docs/quickstart.md` - Installation and first pipeline run
  - Prerequisites (VSCode, Claude Code/Copilot)
  - Download and install VSIX
  - Initialize repository
  - Run `/0_business_scenario`
  - What to expect
- [ ] Write `docs/pipeline/README.md` - Pipeline overview with Mermaid diagram
  - 6-stage flow visualization
  - What each stage does (brief)
  - Auto-chaining explanation
  - Artifacts produced
- [ ] Write `docs/pipeline/research.md` - Research stage user guide
- [ ] Write `docs/pipeline/specify.md` - Specify stage user guide
- [ ] Write `docs/pipeline/plan.md` - Plan stage user guide
- [ ] Write `docs/pipeline/tasks.md` - Tasks stage user guide
- [ ] Write `docs/pipeline/implement.md` - Implement stage user guide
- [ ] Write `docs/pipeline/validate.md` - Validate stage user guide

**Verification**:

- [ ] All pages render correctly in Docsify
- [ ] Sidebar navigation shows all pages
- [ ] Links between pages work

### Phase 3: Guides & Configuration

**Goal**: Write configuration reference and supplementary guides

**Tasks**:

- [ ] Write `docs/guides/README.md` - Guides index page
- [ ] Write `docs/guides/configuration.md` - All extension settings reference
  - API keys (Anthropic, Google, xAI, OpenAI)
  - Pipeline settings
  - Auto-handoff settings
  - Advanced settings
- [ ] Write `docs/guides/session-management.md` - Save/resume workflow
- [ ] Write `docs/guides/auxiliary-commands.md` - /7_gofer_save through
      /gofer_hydrate

**Verification**:

- [ ] Configuration page lists all settings from extension/package.json
- [ ] All guides are accessible from sidebar
- [ ] Cross-references between pages work

### Phase 4: Search, Polish & Responsive Design

**Goal**: Add search, ensure responsive design, final polish

**Tasks**:

- [ ] Enable Docsify search plugin
- [ ] Test and fix responsive design on mobile viewports (375px, 768px)
- [ ] Add favicon
- [ ] Add Open Graph meta tags for link previews
- [ ] Test all navigation paths
- [ ] Test releases page still works (download buttons, release notes rendering)
- [ ] Test `releases.json` is still accessible and parseable
- [ ] Verify no changes needed to `release-auto.sh` or `pages.yml`

**Verification**:

- [ ] Search returns results for "pipeline", "install", "validate"
- [ ] Site is usable at 375px viewport width
- [ ] All release download links work
- [ ] `releases.json` returns valid JSON at its original URL

## File Structure

```
docs/                              # All new/modified files
├── index.html                     # MODIFIED - Docsify app shell + landing page
├── .nojekyll                      # NEW - prevent Jekyll processing
├── _sidebar.md                    # NEW - Docsify sidebar navigation
├── _navbar.md                     # NEW - Docsify top navigation
├── README.md                      # MODIFIED - becomes docs home page
├── quickstart.md                  # NEW - getting started guide
├── pipeline/
│   ├── README.md                  # NEW - pipeline overview
│   ├── research.md                # NEW - research stage guide
│   ├── specify.md                 # NEW - specify stage guide
│   ├── plan.md                    # NEW - plan stage guide
│   ├── tasks.md                   # NEW - tasks stage guide
│   ├── implement.md               # NEW - implement stage guide
│   └── validate.md                # NEW - validate stage guide
├── guides/
│   ├── README.md                  # NEW - guides index
│   ├── configuration.md           # NEW - settings reference
│   ├── session-management.md      # NEW - save/resume guide
│   └── auxiliary-commands.md      # NEW - auxiliary commands guide
├── releases.html                  # NEW - standalone releases page
├── assets/
│   └── css/
│       └── custom.css             # NEW - Docsify theme overrides
├── releases.json                  # UNCHANGED
├── releases/                      # UNCHANGED
├── update-releases.js             # UNCHANGED
└── [existing files]               # UNCHANGED
```

**New files**: 18 **Modified files**: 2 (index.html, README.md) **Unchanged
files**: releases.json, releases/, update-releases.js, agentic-coding/, all
other existing files

## Risk Assessment

| Risk                                        | Impact | Mitigation                                                                      |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| Breaking releases.json URL                  | High   | Don't move or rename the file. Verify auto-updater still works after deployment |
| Docsify CDN unavailable                     | Medium | Use specific version pinning (e.g., `docsify@4.13.1`), can self-host JS later   |
| index.html changes break existing bookmarks | Medium | Keep root URL working, Docsify uses hash-based routing (`/#/quickstart`)        |
| Large docs/ upload slows Pages deployment   | Low    | Markdown files are tiny compared to existing 2GB of VSIX files                  |
| JavaScript disabled users see blank page    | Low    | Add `<noscript>` fallback message                                               |

## Notes

- This is a content-focused feature: ~18 new markdown/HTML files, no TypeScript
  code
- No changes to any extension source code, tests, build process, or CI/CD
- The only modified existing file is `docs/index.html` (transformed into Docsify
  app shell)
- `docs/README.md` is modified to become the documentation home page
- All existing docs/ files remain in place and accessible

## Spec Traceability

### User Story Coverage

| Story                        | Priority | Plan Phase(s) | Components                                                |
| ---------------------------- | -------- | ------------- | --------------------------------------------------------- |
| US1: First-time visitor      | P1       | Phase 1       | index.html landing page, hero section, feature highlights |
| US2: Quickstart guide        | P1       | Phase 2       | quickstart.md                                             |
| US3: Pipeline understanding  | P2       | Phase 2       | pipeline/README.md, pipeline/\*.md (7 files)              |
| US4: Release downloads       | P2       | Phase 1       | releases.html (migrated from old index.html)              |
| US5: Configuration reference | P3       | Phase 3       | guides/configuration.md                                   |
| US6: Navigation              | P1       | Phase 1, 4    | \_sidebar.md, \_navbar.md, search plugin                  |

### Requirement Coverage

| Requirement                     | Status  | Plan Reference                      |
| ------------------------------- | ------- | ----------------------------------- |
| FR-001: Landing page            | COVERED | Phase 1 - index.html transformation |
| FR-002: Quickstart guide        | COVERED | Phase 2 - quickstart.md             |
| FR-003: Pipeline overview       | COVERED | Phase 2 - pipeline/README.md        |
| FR-004: Individual stage docs   | COVERED | Phase 2 - pipeline/\*.md            |
| FR-005: Releases page           | COVERED | Phase 1 - releases.html             |
| FR-006: Sidebar navigation      | COVERED | Phase 1 - \_sidebar.md              |
| FR-007: Top navigation bar      | COVERED | Phase 1 - \_navbar.md               |
| FR-008: Full-text search        | COVERED | Phase 4 - search plugin             |
| FR-009: Configuration reference | COVERED | Phase 3 - guides/configuration.md   |
| FR-010: Preserve releases.json  | COVERED | All phases - file unchanged         |
| FR-011: Preserve VSIX URLs      | COVERED | All phases - files unchanged        |
| FR-012: Responsive design       | COVERED | Phase 4 - mobile testing            |
| FR-013: Docsify framework       | COVERED | Phase 1 - Docsify setup             |
| FR-014: Visual consistency      | COVERED | Phase 1 - custom.css                |

Coverage: 100% of user stories (6/6), 100% of functional requirements (14/14)
