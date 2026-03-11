---
id: "023-documentation-site"
title: "Documentation Website for eai-tools.github.io/gofer/"
status: "draft"
created: "2026-03-09"
updated: "2026-03-11"
priority: "medium"
assignee: "engineer-agent"
---

# Documentation Website for eai-tools.github.io/gofer/

## Overview

The Gofer project's public website at `eai-tools.github.io/gofer/` currently
serves only as a release download portal. Users who discover Gofer have no way
to learn what it does, how to get started, or how the pipeline works without
cloning the repository and reading internal files.

This feature transforms the site into a comprehensive documentation hub with a
landing page, quickstart guide, pipeline reference, configuration docs, and the
existing releases functionality - all without changing the deployment pipeline
or breaking the auto-updater API.

**Research Reference**: See `research.md` for codebase analysis and integration
points.

## User Stories

### US1: First-Time Visitor Learns About Gofer (P1)

**As a** developer discovering Gofer for the first time **I want to** understand
what Gofer does, how it works, and how to get started **So that** I can evaluate
whether it fits my workflow and install it quickly

**Why this priority**: Without a clear landing page and quickstart, potential
users bounce. This is the primary conversion funnel.

**Independent Test**: Visit `eai-tools.github.io/gofer/` and within 2 minutes
understand what Gofer is, see its key features, and find the installation
instructions.

**Acceptance Criteria**:

- [ ] Landing page has a hero section explaining what Gofer is in one sentence
- [ ] Key features are listed with brief descriptions (pipeline, MCP tools,
      multi-agent, etc.)
- [ ] A prominent "Get Started" button links to the quickstart guide
- [ ] Latest release version and download link are visible on the landing page
- [ ] Page is responsive and readable on mobile devices

---

### US2: User Follows Quickstart to Install and Run First Pipeline (P1)

**As a** developer who has decided to try Gofer **I want to** follow a
step-by-step quickstart guide **So that** I can install the extension and run my
first pipeline command within 5 minutes

**Why this priority**: The quickstart is the critical path from interest to
adoption. Without it, users give up.

**Independent Test**: A developer with VSCode and Claude Code installed can
follow the quickstart from start to finish and successfully run
`/0_business_scenario`.

**Acceptance Criteria**:

- [ ] Quickstart page covers: download VSIX, install in VSCode, initialize
      repository, run first command
- [ ] Prerequisites are clearly listed (VSCode, Claude Code or GitHub Copilot)
- [ ] Each step has clear instructions with code snippets or screenshots
- [ ] The guide links to the releases page for downloading the VSIX
- [ ] Success state is described ("You should see... in the Gofer sidebar")

---

### US3: User Understands the Gofer Pipeline (P2)

**As a** Gofer user who has installed the extension **I want to** understand how
the 6-stage pipeline works and what each stage does **So that** I can use the
pipeline effectively and know what to expect at each stage

**Why this priority**: Understanding the pipeline is essential for effective
use, but users can start with just `/0_business_scenario` from the quickstart.

**Independent Test**: Read the pipeline documentation and understand the flow
from research to validation, including what artifacts are produced.

**Acceptance Criteria**:

- [ ] Pipeline overview page shows the 6-stage flow with a visual diagram
- [ ] Each stage has a brief description of its purpose and output
- [ ] The relationship between stages is clear (auto-chaining, artifacts as
      inputs)
- [ ] Users understand they only need to run `/0_business_scenario` for the full
      pipeline
- [ ] Individual stage pages explain what each command does, its inputs, and
      outputs
- [ ] Auxiliary commands (`/7_gofer_save`, `/8_gofer_resume`, etc.) are
      documented

---

### US4: User Downloads and Installs a Specific Release (P2)

**As a** Gofer user **I want to** browse available releases and download a
specific version **So that** I can install or rollback to a particular version

**Why this priority**: This is existing functionality that must be preserved and
remain accessible.

**Independent Test**: Navigate to the releases page, see all available versions
with release notes, and download a VSIX file.

**Acceptance Criteria**:

- [ ] Releases page shows all available versions with dates and release notes
- [ ] Each release has a download button for the VSIX file
- [ ] Installation instructions are visible on the releases page
- [ ] The current/latest version is highlighted
- [ ] All existing release download URLs continue to work

---

### US5: User Configures Gofer Settings (P3)

**As a** Gofer user who wants to customize behavior **I want to** find a
reference of all available settings **So that** I can configure API keys, enable
features, and tune the extension

**Why this priority**: Configuration is needed for advanced features (LLM
Council, auto-handoff) but not for basic usage.

**Independent Test**: Look up a specific setting (e.g., `gofer.anthropicApiKey`)
and find its description, type, and default value.

**Acceptance Criteria**:

- [ ] Configuration page lists all extension settings
- [ ] Each setting shows: name, type, default value, description
- [ ] Settings are grouped by category (API Keys, Pipeline, Advanced)
- [ ] Links to related documentation (e.g., API key setup links to LLM Council
      docs)

---

### US6: User Navigates Documentation Efficiently (P1)

**As a** documentation reader **I want to** navigate between documentation pages
via sidebar and top navigation **So that** I can find information quickly
without using the browser back button

**Why this priority**: Navigation is foundational - without it, multi-page
documentation is unusable.

**Independent Test**: From any documentation page, navigate to any other page
within 2 clicks.

**Acceptance Criteria**:

- [ ] Sidebar navigation shows hierarchical document structure on all doc pages
- [ ] Current page is highlighted in the sidebar
- [ ] Top navigation bar provides links to: Home, Documentation, Releases,
      GitHub repo
- [ ] Full-text search finds content across all documentation pages
- [ ] Navigation works on mobile devices (hamburger menu or equivalent)

---

### Edge Cases

- What happens when a user visits the site with JavaScript disabled? (Docsify
  requires JS - show a graceful fallback message)
- What happens when `releases.json` fails to load? (Existing error handling in
  releases page should be preserved)
- What happens when a user follows a deep link to a specific doc page? (Docsify
  hash-based routing should handle this)
- What happens on very narrow screens (<320px)? (Content should still be
  readable)

## Requirements

### Functional Requirements

- **FR-001**: Site MUST have a landing page (`index.html`) with hero section,
  feature highlights, quickstart link, and latest release info
- **FR-002**: Site MUST have a quickstart guide covering installation through
  first pipeline run
- **FR-003**: Site MUST have a pipeline overview page with visual diagram
  showing all 6 stages
- **FR-004**: Site MUST have individual documentation for each pipeline stage
  explaining purpose, inputs, outputs, and usage
- **FR-005**: Site MUST have a releases page preserving all existing release
  download functionality
- **FR-006**: Site MUST have sidebar navigation with hierarchical document
  structure
- **FR-007**: Site MUST have a top navigation bar with links to Home, Docs,
  Releases, and GitHub
- **FR-008**: Site MUST have full-text search across all documentation pages
- **FR-009**: Site MUST have a configuration reference listing all extension
  settings
- **FR-010**: Site MUST preserve `releases.json` at `docs/releases.json`
  unchanged
- **FR-011**: Site MUST preserve all VSIX download URLs at
  `docs/releases/*.vsix`
- **FR-012**: Site MUST be responsive and usable on mobile devices
- **FR-013**: Site MUST use Docsify for client-side markdown rendering (zero
  build step)
- **FR-014**: Site MUST maintain visual consistency with the existing purple
  gradient + card design language

### Key Entities

- **Documentation Page**: A markdown file rendered by Docsify, with title,
  content, and position in the navigation hierarchy
- **Navigation Structure**: A sidebar (`_sidebar.md`) defining the hierarchical
  relationships between documentation pages
- **Landing Page**: The `index.html` entry point combining custom HTML hero
  section with Docsify-rendered documentation
- **Releases Page**: Dynamic page loading release data from `releases.json`

## Non-Functional Requirements

### Performance

- Landing page should load in under 3 seconds on a standard connection
- Docsify documentation pages should render markdown in under 1 second after
  navigation
- VSIX download links must remain fast (served from GitHub Pages CDN)

### Compatibility

- Site must work in all modern browsers (Chrome, Firefox, Safari, Edge - latest
  2 versions)
- Site must be responsive from 320px to 2560px viewport width
- Site must not require a build step - `docs/` directory is deployed as-is to
  GitHub Pages

### Maintainability

- Adding a new documentation page should require only: (1) creating a markdown
  file, (2) adding an entry to `_sidebar.md`
- No changes to `release-auto.sh`, `update-releases.js`, or `pages.yml` should
  be needed
- Documentation content should be in markdown files, not embedded in HTML

## Success Criteria

| Metric                      | Target                                  | Measurement                                                                  |
| --------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| Landing page explains Gofer | < 30 seconds to understand              | Manual test: new user can explain what Gofer does after viewing landing page |
| Quickstart completion       | < 5 minutes                             | Manual test: follow quickstart from start to running first command           |
| All docs navigable          | < 2 clicks from any page                | Manual test: navigate between any two pages                                  |
| Search finds content        | All page titles and headings searchable | Test: search for "pipeline", "install", "validate" returns correct results   |
| Releases still work         | 100% backward compatibility             | Verify releases.json URL returns valid JSON, VSIX downloads work             |
| Mobile usable               | Readable at 375px width                 | Manual test on iPhone viewport                                               |
| No deployment changes       | Zero changes to pages.yml               | Verify workflow file unchanged                                               |

## Assumptions

- Docsify CDN (cdn.jsdelivr.net) will remain available and reliable
- Users access the site primarily from desktop browsers (documentation site for
  a VSCode extension)
- The purple gradient + card design language from the current site is the
  desired aesthetic
- JavaScript is enabled in users' browsers (required for Docsify)
- `releases.json` API contract and `releases/*.vsix` paths must not change
  (auto-updater dependency)
- No build step will be added to the GitHub Pages deployment workflow
- Documentation content will be written in English only

## Dependencies

- **Docsify v4** (via CDN): Client-side markdown rendering framework
- **docs/releases.json**: Existing auto-updater API (must preserve exact path
  and schema)
- **docs/releases/\*.vsix**: Existing download distribution (must preserve all
  URLs)
- **`.github/workflows/pages.yml`**: GitHub Pages deployment workflow (no
  changes)
- **`release-auto.sh`**: Release automation script (no changes)
- **`docs/update-releases.js`**: Release JSON updater (no changes)

## Out of Scope

- Server-side rendering or pre-rendering of documentation pages
- Custom domain setup (remains at `eai-tools.github.io/gofer/`)
- Documentation versioning (multiple versions of docs for different releases)
- User authentication or gated content
- Analytics or tracking integration
- Blog or news section
- API documentation generated from TypeScript source code
- Changes to the GitHub Pages deployment workflow
- Changes to the release automation scripts
- Dark mode toggle (may be added later; Docsify supports it but not required for
  v1)
- Internationalization / multi-language support

## Glossary

| Term          | Definition                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Docsify       | A client-side documentation site generator that renders markdown files in the browser without a build step |
| GitHub Pages  | GitHub's static site hosting service, serving content from the `docs/` directory                           |
| VSIX          | Visual Studio Extension package format, the binary distribution of the Gofer extension                     |
| releases.json | JSON API file at `docs/releases.json` polled by the extension auto-updater every 24 hours                  |
| Pipeline      | Gofer's 6-stage development workflow: Research, Specify, Plan, Tasks, Implement, Validate                  |
| MCP           | Model Context Protocol - the standard by which AI assistants interact with Gofer's tools                   |

## Research Traceability

| Research Finding                                 | Spec Section                 | Reference                                |
| ------------------------------------------------ | ---------------------------- | ---------------------------------------- |
| releases.json must stay at docs/releases.json    | FR-010, Dependencies         | Auto-updater polls this URL              |
| VSIX files must stay at docs/releases/\*.vsix    | FR-011, Dependencies         | Download URLs hardcoded in releases.json |
| GitHub Pages deploys docs/ as-is (no build step) | FR-013, NFR Compatibility    | pages.yml uploads raw docs/              |
| release-auto.sh writes to docs/releases/         | Dependencies, Out of Scope   | Must not conflict with new files         |
| update-releases.js reads/writes releases.json    | Dependencies                 | Path must not change                     |
| Docsify chosen for zero-build rendering          | FR-013, Technology Decisions | Research Decision 1                      |
| Purple gradient + card design language           | FR-014, Assumptions          | Existing visual identity                 |
| Current site lacks mobile breakpoints            | FR-012, NFR Compatibility    | Gap identified in research               |
| 16 existing markdown docs not surfaced           | FR-002 through FR-009        | Content inventory from research          |
| Pipeline commands are AI prompts, not user docs  | Content Strategy, FR-004     | Research Decision 3                      |
