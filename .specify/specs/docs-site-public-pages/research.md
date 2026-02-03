---
date: '2026-01-29T09:00:00Z'
researcher: Claude
feature: 'docs-site-public-pages'
status: complete
---

# Research: Public Documentation & Marketing Site

## Feature Summary

Build a public-facing GitHub Pages site for Enterprise AI Gofer using Astro SSG.
The site serves both business decision-makers (marketing/use cases) and
developers (getting started guides, usage documentation). It hosts current and
past VSIX extension downloads. The existing release automation script
(`release-auto.sh`) must continue working unchanged. No private implementation
details or source code architecture should be exposed on the public site.

## Codebase Analysis

### Current `docs/` Structure

The existing `docs/` folder is deployed as-is (no build step) to GitHub Pages at
`https://eai-tools.github.io/gofer/`.

| File/Dir                         | Purpose                                    | Keep Public? |
| -------------------------------- | ------------------------------------------ | ------------ |
| `docs/index.html`                | Single-page release download portal        | Replace      |
| `docs/releases.json`             | JSON API for extension auto-updater        | Yes (API)    |
| `docs/releases/`                 | VSIX binary downloads (8 files, ~130MB)    | Yes          |
| `docs/update-releases.js`        | Node script called by release-auto.sh      | Internal     |
| `docs/releases-README.md`        | Internal release infrastructure docs       | No           |
| `docs/RELEASE_PROCESS.md`        | Internal release process documentation     | No           |
| `docs/API_KEY_SETUP.md`          | User guide for API key config              | Yes (guide)  |
| `docs/QUALITY_STANDARDS.md`      | Internal code quality standards            | No           |
| `docs/WHATSAPP_SETUP.md`         | User guide for WhatsApp notification setup | Yes (guide)  |
| `docs/TWO_WAY_WHATSAPP.md`       | User guide for two-way WhatsApp            | Yes (guide)  |
| `docs/migration-guide.md`        | User migration guide                       | Yes (guide)  |
| `docs/memory-learning-system.md` | Internal memory system design docs         | No           |
| `docs/technical-debt.md`         | Internal tech debt tracking                | No           |
| `docs/README.md`                 | Internal docs index                        | No           |
| `docs/research/`                 | Internal AI research notes                 | No           |

### Release Script Integration Points

`release-auto.sh` touches `docs/` in these specific ways:

1. **Line 289**: `mkdir -p docs/releases` - creates releases dir
2. **Line 290**: `cp "gofer-$NEW_VERSION.vsix" "docs/releases/"` - copies VSIX
3. **Line 295-298**: Runs `node docs/update-releases.js` - updates releases.json
4. **Line 299, 340**: `git add docs/releases.json docs/releases/` - stages files
5. **Line 385**: Polls `https://eai-tools.github.io/gofer/releases.json` to
   verify deployment
6. **Line 409**: Prints download URL
   `https://eai-tools.github.io/gofer/releases/gofer-X.Y.Z.vsix`

**Critical paths that must remain unchanged:**

- `docs/releases/` - VSIX storage
- `docs/releases.json` - version manifest
- `docs/update-releases.js` - release helper script

### Auto-Updater Integration

`extension/src/autoUpdater.ts` fetches:

- **Hostname**: `eai-tools.github.io` (line 74)
- **Path**: `/gofer/releases.json` (line 75)
- **Download URLs**:
  `https://eai-tools.github.io/gofer/releases/gofer-X.Y.Z.vsix`

These URLs must resolve correctly after the site redesign.

### GitHub Actions Deployment

`.github/workflows/pages.yml`:

- Triggers on: push to `main` with `docs/**` changes, release publish, manual
  dispatch
- Deploys: `path: './docs'` (entire folder, no build step)
- Uses: `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`

### Existing Design System (from `docs/index.html`)

Current color palette (can inform new design):

- Hero gradient: `#667eea` → `#764ba2` (purple/blue)
- Primary blue: `#4299e1`
- Body text: `#333`
- Dark header: `#2d3748`
- Font stack:
  `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### Marketing Content Available

From `extension/package.json` and `README.md`:

- **Product name**: Gofer (Enterprise AI)
- **Tagline**: "Spec-Driven Development for AI"
- **Description**: "Exposes 6 MCP tools that let Claude Code and GitHub Copilot
  autonomously implement features from specifications"
- **Key features**: Unified pipeline (6 stages), MCP tools, Claude Code +
  Copilot support, Codespaces support, branch-aware specs, auto-updates,
  progress tracking, context health management, LLM Council mode
- **CHANGELOG.md**: Rich release history for a "What's New" page

### Known Issues Found During Research

1. **`specgofer` naming bug**: `docs/update-releases.js` lines 24, 27, 63 still
   reference old `specgofer` name. Fallback URL and VSIX size calculation
   broken.
2. **`docs/index.html` line 243**: JS fallback fetch uses old `specgofer` URL.
3. **`.devcontainer/install-extension.sh`**: Uses old `specgofer` URLs.
4. **`test-release.sh` line 78**: Uses old `specgofer` URLs.

## Technology Decisions

### Decision 1: Static Site Generator

- **Choice**: Astro
- **Rationale**: User selected Astro. Astro is ideal for content-heavy marketing
  - documentation sites. Zero JS by default, component islands for
    interactivity, native markdown support, excellent GitHub Pages integration.
- **Alternatives considered**: Hugo (fast but Go templates), Next.js (overkill
  for static), plain HTML (doesn't scale for docs)

### Decision 2: Site Source Location

- **Choice**: `docs-site/` directory at repo root
- **Rationale**: Keeps Astro source code separate from the `docs/` directory
  that `release-auto.sh` writes to. The build output merges with release assets
  at deploy time.
- **Constraint**: `release-auto.sh` continues writing to `docs/releases/` and
  `docs/releases.json` unchanged.

### Decision 3: Deployment Strategy

- **Choice**: Modified GitHub Actions workflow with build step
- **Rationale**: The current `pages.yml` deploys `docs/` as-is. The new workflow
  will: (1) Build Astro from `docs-site/`, (2) Copy release assets from `docs/`
  into the build output, (3) Deploy the merged result. This preserves the
  release script while enabling Astro.
- **Workflow triggers**: `docs/**` changes (releases), `docs-site/**` changes
  (site content), manual dispatch.

### Decision 4: Handling Release Assets

- **Choice**: Copy-at-deploy-time merging
- **Rationale**: `release-auto.sh` writes to `docs/releases/` and
  `docs/releases.json`. At deploy time, the GitHub Actions workflow copies these
  into Astro's build output before uploading to Pages. The Astro site can also
  read `releases.json` at build time for a dynamic downloads page.
- **Alternative rejected**: Moving release assets into `docs-site/public/` would
  require modifying `release-auto.sh`.

### Decision 5: Content Security

- **Choice**: Public site contains ONLY user-facing content
- **Rationale**: The repo is private. The public site must not expose:
  - Source code or internal architecture
  - Implementation details of the extension
  - Internal development processes or technical debt
  - How the VSIX is built, coded, or structured
  - Agent prompts, AI pipeline internals, or command definitions
- **What IS public**: Feature descriptions, getting started guides, usage docs,
  download links, changelog highlights, use case examples

### Decision 6: Astro Configuration

- **Choice**: `site: 'https://eai-tools.github.io'`, `base: '/gofer'`
- **Rationale**: The site is deployed to a subpath
  (`eai-tools.github.io/gofer/`). Astro needs `base` set so all internal links
  and asset paths include the `/gofer` prefix.

## Content Architecture

### Public-Facing Pages (Safe for Public)

| Page                | Audience   | Content                                            |
| ------------------- | ---------- | -------------------------------------------------- |
| **Home / Landing**  | Both       | Hero, value prop, feature highlights, CTA          |
| **Features**        | Both       | Detailed feature descriptions with visuals         |
| **Use Cases**       | Business   | Business problems Gofer solves, scenarios          |
| **Getting Started** | Developers | Install, configure, first spec, first pipeline     |
| **Guides**          | Developers | API key setup, WhatsApp notifications, migration   |
| **Downloads**       | Both       | Current + past VSIX versions, install instructions |
| **What's New**      | Both       | Changelog highlights per version                   |

### Content That Must NOT Be Public

| Content Type             | Location in Repo                 | Why Private                |
| ------------------------ | -------------------------------- | -------------------------- |
| Source code architecture | `extension/src/`                 | Proprietary implementation |
| Agent prompts            | `.claude/commands/`              | Internal AI pipeline       |
| Spec templates           | `.specify/templates/`            | Internal process           |
| Release automation       | `release-auto.sh`                | Build infrastructure       |
| Quality standards        | `docs/QUALITY_STANDARDS.md`      | Internal dev standards     |
| Technical debt           | `docs/technical-debt.md`         | Internal tracking          |
| Memory system design     | `docs/memory-learning-system.md` | Internal architecture      |
| Release process          | `docs/RELEASE_PROCESS.md`        | Internal process           |
| Constitution/decisions   | `.specify/memory/`               | Internal AI guidelines     |
| Test patterns research   | `docs/research/`                 | Internal research          |

## Constraints & Considerations

1. **`release-auto.sh` must not change**: Script writes to `docs/releases/` and
   `docs/releases.json`. These paths are hardcoded and used by the auto-updater.

2. **Auto-updater URLs are fixed**: `eai-tools.github.io/gofer/releases.json`
   and `eai-tools.github.io/gofer/releases/gofer-X.Y.Z.vsix` must continue to
   resolve. The deployed site must serve these at the same paths.

3. **VSIX files are large**: 8 files totaling ~130MB in `docs/releases/`. These
   should NOT be in the Astro project -- they're copied at deploy time.

4. **No private info**: The public site must not include internal documentation,
   source code details, or anything that would let someone replicate the
   extension's implementation.

5. **Monorepo compatibility**: The Astro project in `docs-site/` needs its own
   `package.json` and `node_modules/`. It's independent of the extension build.

6. **GitHub Pages base path**: All URLs must account for the `/gofer/` base path
   since this is a project page, not a user/org page.

## Open Questions

- [ ] Should the site include a blog section for announcements and tutorials?
- [ ] Should there be a "Pricing" or "Enterprise" page, or is this purely open
      download?
- [ ] What logo/brand assets exist beyond the VSCode extension icon?

## Recommendations

1. **Create `docs-site/` as a standalone Astro project** with its own
   `package.json`, separate from the extension monorepo.

2. **Update `pages.yml`** to include a build step that: (a) builds Astro, (b)
   copies `docs/releases/` and `docs/releases.json` into the build output, (c)
   deploys the merged result. Also trigger on `docs-site/**` changes.

3. **Use Astro's content collections** for documentation pages, sourced from
   markdown files within `docs-site/src/content/`.

4. **Create a dynamic Downloads page** that reads `releases.json` at build time
   (via Astro's `fetch` in frontmatter) to render a clean download page with
   version history.

5. **Fix the `specgofer` naming bugs** in `docs/update-releases.js` and other
   files as a prerequisite cleanup task.

6. **Add `.nojekyll` file** to prevent GitHub Pages from processing with Jekyll
   (Astro outputs files with underscores that Jekyll would ignore).

7. **Write all documentation content fresh** for the public site rather than
   migrating internal docs. Only the user-facing guides (API key setup, WhatsApp
   setup, migration guide) should be adapted, and even those should be reviewed
   to remove any internal references.
