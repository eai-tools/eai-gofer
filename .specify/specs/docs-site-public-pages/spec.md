---
id: docs-site-public-pages
title: Public Documentation & Marketing Site
status: draft
created: 2026-01-29
updated: 2026-01-29
author: Claude
---

# Public Documentation & Marketing Site

## Overview

Enterprise AI Gofer needs a public-facing website that communicates what Gofer
does, who it's for, and how to get started -- without exposing any proprietary
source code or internal implementation details. The site replaces a bare-bones
release download page with a full marketing and documentation experience built
with Astro SSG, deployed via GitHub Pages.

**Target Users**: Business decision-makers evaluating Gofer AND developers
learning to use it.

**Primary Value**: A professional, approachable public presence that drives
adoption by making Gofer easy to understand and easy to install.

**Research Reference**: See `research.md` for codebase analysis and integration
points.

## User Scenarios & Testing

### US1: Visitor Discovers Gofer and Understands Its Value (P1)

A potential user lands on the site (from a search, a link, or the GitHub repo)
and within 30 seconds understands what Gofer does and whether it's relevant to
them. The landing page communicates the value proposition clearly for both
business and technical audiences without feeling pushy or salesy.

**Why this priority**: First impressions determine whether visitors stay or
leave. Without a clear landing page, no other page matters.

**Independent Test**: Navigate to the site root. Within 30 seconds a
non-technical person can explain what Gofer does. A developer can identify
whether it supports their tooling (Claude Code, Copilot, VSCode).

**Acceptance Scenarios**:

1. **Given** a visitor arrives at the landing page, **When** they read the hero
   section, **Then** they see a clear tagline, a one-sentence description, and a
   prominent "Get Started" or "Download" call to action.
2. **Given** a business stakeholder visits, **When** they scroll the landing
   page, **Then** they see use case summaries (e.g., "From business idea to
   working code") without technical jargon.
3. **Given** a developer visits, **When** they scan the landing page, **Then**
   they see feature highlights (MCP tools, pipeline stages, AI assistant
   support) with enough technical detail to evaluate relevance.

---

### US2: Developer Downloads and Installs the Extension (P1)

A developer wants to install Gofer. They find the Downloads page, see the latest
version and past versions, and install the VSIX into VSCode.

**Why this priority**: The primary conversion action. If users can't easily
download, the site fails its core purpose.

**Independent Test**: Navigate to the Downloads page. Identify the latest
version. Click the download link. The VSIX file downloads successfully. Past
versions are also accessible.

**Acceptance Scenarios**:

1. **Given** a developer visits the Downloads page, **When** the page loads,
   **Then** they see the latest version highlighted with its version number,
   release date, and a download button.
2. **Given** a developer wants an older version, **When** they scroll down,
   **Then** they see a list of all past versions with download links and release
   notes.
3. **Given** the extension auto-updater checks for updates, **When** it fetches
   `releases.json`, **Then** the response is identical in structure and URL to
   the current auto-updater endpoint.

---

### US3: Developer Learns How to Use Gofer (P2)

A new user has installed Gofer and wants to learn the basics. They find the
Getting Started guide, follow it, and successfully run their first Gofer
pipeline.

**Why this priority**: Post-install onboarding is critical for retention.
Without guidance, users churn after install.

**Independent Test**: Follow the Getting Started guide from zero. After
completing it, the user has created a spec and run at least one pipeline
command.

**Acceptance Scenarios**:

1. **Given** a new user visits the Getting Started page, **When** they read the
   guide, **Then** they see step-by-step instructions covering: install, open a
   project, create a first spec, run a pipeline command.
2. **Given** a user follows the Getting Started guide, **When** they complete
   all steps, **Then** they have a working Gofer setup and understand the basic
   workflow.
3. **Given** a user needs to configure API keys, **When** they follow the link
   to the API Key Setup guide, **Then** they find clear, provider-by-provider
   instructions.

---

### US4: Business Stakeholder Evaluates Gofer for Their Team (P2)

A CTO or engineering manager wants to understand whether Gofer fits their team's
workflow. They read the Use Cases page and understand practical scenarios where
Gofer adds value.

**Why this priority**: Business users drive team-wide adoption. Use cases bridge
the gap between features and real-world value.

**Independent Test**: Read the Use Cases page. After reading, the stakeholder
can articulate at least two concrete scenarios where Gofer would help their
team.

**Acceptance Scenarios**:

1. **Given** a business stakeholder visits the Use Cases page, **When** they
   read it, **Then** they see 3-5 concrete scenarios (e.g., "Building a new
   feature from a business requirement," "Onboarding a developer to an
   unfamiliar codebase") described in business language.
2. **Given** a stakeholder is comparing tools, **When** they read feature
   descriptions, **Then** they understand what makes Gofer different
   (spec-driven approach, multi-AI-assistant support) without encountering
   internal implementation details.

---

### US5: Returning User Checks What's New (P3)

An existing Gofer user visits the site to see what changed in recent releases.
They find a What's New page with clear, user-facing changelog entries.

**Why this priority**: Keeps existing users engaged and aware of improvements.
Lower priority because it serves existing users, not new acquisition.

**Independent Test**: Visit the What's New page. Identify the most recent
release and its user-facing changes.

**Acceptance Scenarios**:

1. **Given** a user visits the What's New page, **When** it loads, **Then** they
   see release entries with version numbers, dates, and user-friendly
   descriptions of what changed.
2. **Given** a user wants details about a specific version, **When** they read
   its entry, **Then** they see a summary of changes written for end users (not
   developer commit messages).

---

### US6: Developer Reads Documentation Guides (P3)

A developer configuring advanced features (WhatsApp notifications, API keys,
migration from an older version) finds step-by-step guides.

**Why this priority**: Advanced guides serve a smaller audience but are
important for power users and reduce support burden.

**Independent Test**: Navigate to a specific guide. Follow the instructions. The
documented outcome is achieved.

**Acceptance Scenarios**:

1. **Given** a user needs to set up API keys, **When** they visit the API Key
   Setup guide, **Then** they see provider-specific instructions (Anthropic,
   Google, OpenAI) with screenshots or code samples where relevant.
2. **Given** a user wants WhatsApp notifications, **When** they read the
   WhatsApp Setup guide, **Then** they can configure notifications by following
   the steps.

---

### Edge Cases

- What happens when `releases.json` has no releases? The Downloads page shows a
  friendly "No releases yet" message.
- What happens when the site is accessed without the `/gofer/` base path? All
  internal links and assets use Astro's base path configuration correctly.
- What happens when JavaScript is disabled? The site is static HTML -- all
  content is readable without JavaScript. Only the release-fetching Downloads
  page may degrade to showing a direct link to `releases.json`.

## Requirements

### Functional Requirements

- **FR-001**: Site MUST be built with Astro SSG and output static HTML that
  deploys to GitHub Pages at `https://eai-tools.github.io/gofer/`.
- **FR-002**: Site source MUST live in the `docs/` directory, with the Astro
  project built in-place. Release assets (`releases/`, `releases.json`,
  `update-releases.js`) MUST be placed in Astro's `public/` folder so they pass
  through to the build output unchanged.
- **FR-003**: GitHub Actions workflow MUST install dependencies, build the Astro
  site from `docs/`, and deploy the build output to GitHub Pages.
- **FR-004**: The auto-updater endpoint `releases.json` MUST remain accessible
  at `https://eai-tools.github.io/gofer/releases.json` with the same JSON
  structure.
- **FR-005**: VSIX download URLs MUST remain accessible at
  `https://eai-tools.github.io/gofer/releases/gofer-X.Y.Z.vsix`.
- **FR-006**: `release-auto.sh` MUST continue to function correctly. Its output
  paths will be updated from `docs/releases/` to `docs/public/releases/` and
  `docs/releases.json` to `docs/public/releases.json` so that Astro's `public/`
  directory passes them through to the build output. The script's behavior and
  functionality remain identical.
- **FR-007**: The site MUST NOT contain any source code, internal architecture
  documentation, agent prompts, build processes, or implementation details that
  would allow someone to replicate the extension.
- **FR-008**: The site MUST include these pages: Landing, Features, Use Cases,
  Getting Started, Guides (API keys, WhatsApp, migration), Downloads, What's
  New.
- **FR-009**: The site MUST use Astro content collections for documentation
  pages, authored in Markdown.
- **FR-010**: All pages MUST be responsive and function correctly on mobile,
  tablet, and desktop viewports.
- **FR-011**: The site MUST include a `.nojekyll` file in the build output to
  prevent GitHub Pages Jekyll processing.
- **FR-012**: The site MUST configure Astro with
  `site: 'https://eai-tools.github.io'` and `base: '/gofer'` for correct asset
  and link paths.
- **FR-013**: The Downloads page MUST render release data from `releases.json`
  at build time, showing version, date, size, notes, and download link for each
  release.
- **FR-014**: The site design MUST feel clean, friendly, and professional
  without being pushy, aggressive, or overly sales-oriented.
- **FR-015**: Internal documentation files currently in `docs/` (e.g.,
  `QUALITY_STANDARDS.md`, `technical-debt.md`, `RELEASE_PROCESS.md`) MUST NOT be
  included in the public site output.

### Key Entities

- **Release**: Version number, release date, download URL, release notes, file
  size, prerelease flag. Sourced from `releases.json`.
- **Guide**: Title, content (Markdown), category (getting-started, setup,
  advanced). Stored in Astro content collections.
- **Use Case**: Title, audience (business/developer/both), description,
  benefits. Stored as Astro pages or content collection.

## Non-Functional Requirements

### Performance

- Pages MUST achieve a Lighthouse performance score of 90+ on mobile.
- The site MUST ship zero or minimal client-side JavaScript (Astro's zero-JS
  default).
- Total page weight for the landing page MUST be under 500KB (excluding
  downloadable VSIX files).

### Security

- The public site MUST NOT expose internal repository structure, file paths,
  source code, or development tooling.
- No user-facing forms or input fields that require server-side processing (pure
  static site).

### Compatibility

- The deployment workflow MUST remain compatible with the existing
  `release-auto.sh` script (writes to `docs/releases/` and
  `docs/releases.json`).
- The deployed site MUST serve the auto-updater API at the same URLs as today.
- The site MUST work in all modern browsers (Chrome, Firefox, Safari, Edge --
  latest 2 versions).

### Accessibility

- The site MUST meet WCAG 2.1 Level AA standards.
- All images MUST have alt text. Navigation MUST be keyboard-accessible.

## Success Criteria

| Metric                       | Target                                       | Measurement                                  |
| ---------------------------- | -------------------------------------------- | -------------------------------------------- |
| Auto-updater compatibility   | 100% -- no breaking changes                  | Extension update check succeeds after deploy |
| Release script compatibility | 100% -- `release-auto.sh` works unchanged    | Run release script, verify Pages deployment  |
| Page load time (landing)     | < 2 seconds on 3G                            | Lighthouse audit                             |
| Mobile responsiveness        | All pages usable on 375px viewport           | Manual testing on mobile                     |
| Content security             | Zero internal implementation details exposed | Manual audit of all public pages             |
| Lighthouse score             | 90+ performance, 90+ accessibility           | Lighthouse CI                                |
| All pages reachable          | Every page in sitemap returns 200            | Automated link check post-deploy             |

## Assumptions

- The GitHub repository remains private; only the GitHub Pages site is public.
- GitHub Pages supports deploying from a GitHub Actions build artifact (not
  limited to `docs/` folder).
- The `docs/public/releases/` and `docs/public/releases.json` files will be
  managed by `release-auto.sh` (updated paths) and committed to the repo.
- No blog or pricing page is needed for the initial version (can be added
  later).
- The existing VSCode extension icon (`icon.png`) is the only available brand
  asset for now.
- Astro is installed as a dependency in the `docs/` directory with its own
  `package.json`, separate from the root monorepo `package.json`.

## Dependencies

- **`docs/public/releases.json`**: The Downloads page reads this at build time.
  `release-auto.sh` writes to `docs/releases.json` which will be moved to
  `docs/public/releases.json` (one-time migration).
- **`docs/public/releases/`**: VSIX files pass through Astro's build via the
  `public/` directory. `release-auto.sh` writes to `docs/releases/` which will
  be moved to `docs/public/releases/` (one-time migration, script path update).
- **`docs/public/update-releases.js`**: Moved from `docs/update-releases.js` to
  keep the release tooling accessible.
- **`.github/workflows/pages.yml`**: Must be updated to include Astro build
  step.
- **Astro framework**: External dependency installed in `docs/`.

## Out of Scope

- Blog or announcement system (can be added in a future iteration)
- Pricing, enterprise, or paid-tier pages
- User authentication, comments, or any server-side functionality
- Modification to `release-auto.sh` or any release pipeline scripts
- API documentation for the MCP tools (would expose implementation details)
- Interactive playground or live demo
- Search functionality (can be added later with Pagefind or similar)
- Analytics or tracking pixels (can be added later)

## Glossary

| Term               | Definition                                                           |
| ------------------ | -------------------------------------------------------------------- |
| Astro              | A static site generator framework focused on content-heavy websites  |
| VSIX               | VSCode extension package format                                      |
| GitHub Pages       | GitHub's static site hosting service                                 |
| MCP                | Model Context Protocol -- VSCode's protocol for AI tool integration  |
| Content Collection | Astro's built-in system for organizing and querying Markdown content |
| SSG                | Static Site Generation -- pre-rendering pages at build time          |

## Research Traceability

| Research Finding                         | Spec Section       | Reference      |
| ---------------------------------------- | ------------------ | -------------- |
| release-auto.sh writes to docs/releases/ | FR-006, NFR Compat | Constraints    |
| Auto-updater fetches releases.json       | FR-004, FR-005     | Dependencies   |
| pages.yml deploys docs/ as-is            | FR-003             | Dependencies   |
| No private info on public site           | FR-007, FR-015     | NFR Security   |
| Astro with base: '/gofer'                | FR-012             | Tech Decision  |
| docs/ as Astro project directory         | FR-002             | Tech Decision  |
| public/ folder for release assets        | FR-002             | Tech Decision  |
| gofer naming bugs                        | Out of Scope       | Known Issues   |
| Content collections for docs             | FR-009             | Recommendation |
| .nojekyll file required                  | FR-011             | Recommendation |
