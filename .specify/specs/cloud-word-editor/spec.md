---
id: cloud-word-editor
title: Cloud Word Chatbot Editor
status: draft
created: '2026-03-04'
updated: '2026-03-04'
author: Claude
---

# Cloud Word Chatbot Editor

## Overview

The Cloud Word Chatbot Editor enables native .docx document editing with AI
chatbot integration inside the Configurator ecospace. It addresses the pain
point that Australian NSW government council staff — and any future tenant —
currently cannot edit Word documents (.docx) with full fidelity within the
platform, forcing context-switching to external tools.

**Architectural Principle: Use-Case Agnostic Design**

> The editor block contains ZERO hardcoded business logic. All domain-specific
> behaviour comes from the Configurator's three-tier configuration system:
> 1. **Block config** (presentationConfig, dataConfig, businessLogic)
> 2. **TenantData** (per-tenant templates, prompts, branding)
> 3. **TenantSchemas** (dynamic field extensions per tenant)
>
> This means: build it universal, ship it for councils.

**Target Users**: NSW council assessors, senior planners, DAISY chatbot,
applicants (read-only), external developers, workflow builders, and any future
tenant user (retail, legal, healthcare) via configuration only.

**Primary Value**: Eliminate context-switching for document editing during
workflow processes, while enabling AI chatbot to programmatically draft documents
with <5% formatting loss.

**Discovery Reference**: See `discovery.md` for full business context.
**Research Reference**: See `research.md` for codebase analysis.
**Business Scenarios**: See `business-scenarios.md` for 52 detailed scenarios.

---

## Technical Context: OnlyOffice Architecture

### Stateless Editing Engine (Not SharePoint)

OnlyOffice Document Server is a **stateless editing engine** — it does NOT store
files. Unlike SharePoint where storage, editing, and permissions are tightly
coupled, OnlyOffice is purely a rendering/editing service. Files remain in your
own storage (Azure Blob in our case).

**How it works:**

1. Your app sends the Document Server a URL to the .docx file
2. Document Server downloads it, opens it for editing in the browser
3. User edits live in the browser via the Document Server's iframe UI
4. When editing is done, Document Server POSTs the modified file back to your
   callback URL
5. Your app saves it back to Azure Blob Storage

```
User Browser
    ↓
Your Web App (serves the editor page with OnlyOffice JS SDK)
    ↓
OnlyOffice Document Server (editing UI only — stateless)
    ↕
Azure Blob Storage (your files stay here)
```

### Document Save Flow & Autosave Mechanisms

There is no direct "autosave straight to Azure Blob" toggle. The Document Server
always acts as a middleman. Every path to Blob goes through:

```
Editor → Document Server cache → callback/forcesave → your backend → Azure Blob
```

**Available save approaches:**

| Approach | Trigger | Latency to Blob | Complexity |
|----------|---------|-----------------|------------|
| Default callback | Last user closes doc | Minutes after close | Low |
| Server-side forcesave cron | Timer (e.g. every 2-5 min) | 2-5 min | Low |
| Client-side event → your API → forcesave | User clicks save / Ctrl+S | Seconds | Medium |
| `onRequestSave` editor event | Editor's internal save fires | ~2 min | Medium |

**Built-in autosave** (`customization.autosave: true`, enabled by default) only
saves to the Document Server's internal cache — NOT to Azure Blob. It protects
against browser crashes (user can reopen and resume), but the file doesn't reach
Blob until the callback fires.

**Recommended approach**: Server-side forcesave on a short timer (2-3 min) from
your backend. Simple, reliable, doesn't depend on client-side events. Combined
with `onRequestSave` for user-triggered saves.

**Real-time co-editing**: If multiple users edit the same doc simultaneously,
OnlyOffice handles real-time sync between users internally (OT-based). But the
file only gets written back to Azure Blob when all users close the doc OR you
call forcesave.

### OnlyOffice Product Landscape

OnlyOffice offers 5 distinct products. Only one fits our embedding use case.

#### Full Product Comparison

| Product | What It Is | Embedding Into Your App? | Licensing | Starting Price |
|---------|-----------|------------------------|-----------|---------------|
| **Docs Community** | Free open-source editor | Technically yes, but AGPL copyleft requires open-sourcing your code | AGPL v3 | Free (max 20 connections) |
| **Docs Enterprise** | Commercial editor for existing DMS connectors (Nextcloud, SharePoint, Confluence, etc.) | Via pre-built connectors only — not designed for custom app embedding | Commercial (annual) | $1,500/yr (50 connections) |
| **Docs Developer** | Commercial editor **designed for embedding into your own product** | **Yes — this is its purpose**. White-label, Document Builder API, commercial license | Commercial (one-time perpetual) | $1,950 (one-time) |
| **DocSpace** | Room-based document collaboration platform (like SharePoint rooms) | No — standalone platform with its own UI | Free tier + $20/admin/mo | Free (Startup) to $20/admin/mo (Business) |
| **Workspace** | Full office suite: docs, CRM, mail, projects, calendar | No — standalone suite, not an embeddable component | Commercial (one-time) | $2,200 (50 users) |

**Best fit: Docs Developer Edition** — it is the ONLY product designed for
integrators who embed the editor into their own application with white-label
and a proprietary license.

#### Why NOT the Other Products

- **Community Edition**: AGPL v3 copyleft — embedding it in Configurator would
  legally require open-sourcing the Configurator codebase. Acceptable for
  dev/testing only.
- **Enterprise Edition**: Designed for organizations using OnlyOffice with
  existing DMS platforms via pre-built connectors. Not for custom app embedding.
  Annual license (not perpetual). Higher cost at scale (50/100/200 connections).
- **DocSpace**: A standalone collaboration platform with rooms, not an
  embeddable editor component. Completely different product category.
- **Workspace**: A full office suite (docs + CRM + mail + projects). Overkill
  and not embeddable into a custom app.

#### Docs Developer Edition — Pricing & Tiers

**On-Premises (one-time perpetual license):**

| Tier | Price (one-time) | Support Requests | Response Time | Account Engineer |
|------|-----------------|-----------------|--------------|-----------------|
| Basic | $1,950 | 5 requests | 48 hours | No |
| Plus | $3,500 | 10 requests | 24 hours | No |
| Premium | $4,500 | 20 requests | 12 hours | Yes |

- 20 concurrent connections per server
- All major upgrades and minor updates included
- White-label customization available (custom logos, branding, menu hiding)
- Document Builder service included (for programmatic editing via macros)
- Conversion service included (format conversion)
- Mobile web editors included
- Phone support on all tiers

**Cloud (pay-as-you-go alternative):**
- $12/user/month (10-user minimum)
- OnlyOffice hosts the Document Server — no Docker/container to manage
- Same features as on-premises

#### Docs Enterprise Edition — For Reference

If connectors to existing DMS were needed instead of custom embedding:

| Support | 50 Connections | 100 Connections | 200 Connections |
|---------|---------------|----------------|----------------|
| Basic (1yr) | $1,500/yr | $3,000/yr | $6,000/yr |
| Plus (1yr) | $2,100/yr | $4,080/yr | $7,920/yr |
| Premium (1yr) | $2,400/yr | $4,680/yr | $8,880/yr |

- Annual license (not perpetual like Developer Edition)
- 3-year and lifetime license options available at higher rates
- Includes Private Rooms (end-to-end encryption) — not in Community
- Multi-server clustering support
- Pre-built connectors for Nextcloud, Moodle, Confluence, SharePoint, etc.

#### Docs Community Edition — For Reference

- **Free** under AGPL v3 (source on GitHub)
- 20 concurrent connections max
- No commercial support (GitHub/forum only)
- No Private Rooms or cache lifetime control
- Same core editor features as commercial editions
- **Use case**: Development, testing, and non-commercial deployments

#### Feature Differences Across Editions

| Feature | Community | Enterprise | Developer |
|---------|-----------|-----------|-----------|
| Core editors (docs, sheets, slides, forms, PDF) | Yes | Yes | Yes |
| Document Builder API | Yes | Yes | Yes |
| JWT protection | Yes | Yes | Yes |
| Co-editing (real-time + strict) | Yes | Yes | Yes |
| Track changes, comments, version history | Yes | Yes | Yes |
| Document comparison/combining | Yes | Yes | Yes |
| Plugins and macros | Yes | Yes | Yes |
| Mobile web editors | Yes | Yes | Yes |
| Private Rooms (E2E encryption) | **No** | Yes | Yes |
| Cache lifetime control | **No** | Yes | Yes |
| White-label customization | **No** | **No** | **Yes** |
| Commercial (non-AGPL) license | **No** | Yes | Yes |
| Concurrent connections | 20 max | 50/100/200 | 20 per server |
| Support | GitHub/forum | Basic/Plus/Premium | Basic/Plus/Premium |
| License type | AGPL v3 | Annual/3yr/lifetime | One-time perpetual |

#### DocSpace — For Reference

A standalone room-based collaboration platform (not relevant to our embedding
use case, listed for completeness):

| Plan | Price | Admins | Users/Guests | Storage | Rooms |
|------|-------|--------|-------------|---------|-------|
| Startup (Free) | $0 | Up to 3 | Unlimited | 2 GB | Up to 12 |
| Business | $20/admin/month | Unlimited | Unlimited | 250 GB/admin | Unlimited |
| Enterprise | Custom (self-hosted) | Unlimited | Unlimited | Unlimited | Unlimited |

#### Workspace — For Reference

A full on-premises office suite (not relevant to our embedding use case):

| Edition | Price (one-time, 50 users) | Support | Modules |
|---------|---------------------------|---------|---------|
| Enterprise | $2,200 | Basic (48hr) | Docs, Groups, Mail, Talk |
| Enterprise Plus | $3,300 | Plus (24hr) | Docs, Groups, Mail, Talk |
| Enterprise Premium | $4,450 | Premium (12hr) | Docs, Groups, Mail, Talk + Monitoring + Clustering |

#### Recommendation

Use **Community Edition** (free) during development and local testing. Purchase
**Docs Developer Edition** for production — it is the only product designed for
embedding into custom applications with a commercial license. Start with Basic
tier and upgrade support tier as needed.

Sources: [OnlyOffice Compare Editions](https://www.onlyoffice.com/compare-editions),
[Developer Edition Pricing](https://www.onlyoffice.com/developer-edition-prices),
[Enterprise Pricing](https://www.onlyoffice.com/docs-enterprise-prices),
[DocSpace Pricing](https://www.onlyoffice.com/docspace-prices),
[Workspace Pricing](https://www.onlyoffice.com/workspace-prices)

### Azure Deployment Architecture

OnlyOffice fits into the existing Azure ecosystem. Since the project already
uses Azure App Services and SWA:

**Recommended: Azure App Service (Container)**

```
┌─────────────────────────────────────────────────────┐
│                      Azure                           │
│                                                      │
│  ┌──────────────┐       ┌──────────────────────┐    │
│  │ SWA / App    │       │ App Service          │    │
│  │ Service      │──────▶│ (OnlyOffice Docker)  │    │
│  │ (Your App)   │       │                      │    │
│  └──────┬───────┘       └──────────┬───────────┘    │
│         │                          │                 │
│         │   callback URL           │ fetches file    │
│         │◀─────────────────────────┘                 │
│         │                                            │
│         ▼                                            │
│  ┌──────────────┐                                    │
│  │ Azure Blob   │                                    │
│  │ Storage      │                                    │
│  │ (Your files) │                                    │
│  └──────────────┘                                    │
└─────────────────────────────────────────────────────┘
```

**Azure hosting options:**

| Option | Best For | Approx Cost | Notes |
|--------|---------|------------|-------|
| Azure App Service (Container) | **Recommended** — fits existing infrastructure | Existing plan or ~$50-100/mo | Built-in SSL, custom domains, scaling |
| Azure Container Instance | Simplest, no cluster | ~$50-100/mo (2 vCPU/4GB) | Pay per second, no infra to manage |
| Azure Kubernetes Service | High availability, many concurrent editors | Higher | Overkill unless 100+ concurrent users |

**Networking recommendations:**
- Put OnlyOffice on a private VNet — only your app talks to it
- Use Azure Front Door or App Gateway for single domain with path routing
- Use Managed Identity for Blob Storage access (no keys in code)

### Scaling & Multi-Tenancy

**Multi-tenancy — Natural fit**: OnlyOffice is tenant-agnostic — it just edits
files. All tenant isolation is handled by the Configurator's existing
`@payloadcms/plugin-multi-tenant` and OPA access control. OnlyOffice never
touches the tenant model.

**Flow**: User opens doc → your app checks tenant ACL → generates SAS URL →
passes to OnlyOffice → OnlyOffice edits → callback POSTs back → your app saves
to tenant-scoped blob path.

**Scaling by concurrent editors:**

| Concurrent Editors | OnlyOffice Setup | Azure Hosting |
|--------------------|-----------------|---------------|
| 1-20 | Single container (Community Edition) | 1x App Service B2 |
| 20-250 | Single container (Developer Edition) | 1x App Service P1v3 |
| 250-1000 | Multiple containers behind load balancer | App Service + Azure Front Door |
| 1000+ | Kubernetes cluster | AKS |

**Key insight**: 10,000 tenants does NOT mean 10,000 concurrent editors. If
only 2-5% edit simultaneously, that's 200-500 connections — a single Developer
Edition instance handles that.

**Callback tenant isolation**: OnlyOffice's callback sends the edited file back
to ONE callback URL. The callback handler must:
1. Parse tenantId + documentId from the document key
2. Verify tenant ACL using existing Payload access control
3. Save back to tenant-scoped blob path

**TenantSchemas**: Not directly relevant to OnlyOffice (it edits file content,
not collection fields). Document metadata (custom fields per tenant) stays in
the Documents collection. OnlyOffice only touches the .docx binary.

**Block cache**: When a document is saved back from OnlyOffice, any hooks that
depend on cached data (document lifecycle blocks — Assessment, Retention,
Classification) must be triggered correctly.

**Architecture fit**: Integrates as a new use case + adapter following existing
dependency flow: Presentation → Application → Infrastructure → Domain →
PayloadCMS. No changes to existing 20 collections or 17 TenantData types
needed — just a `blobStoragePath` field on the Documents collection.

**Main risk**: Callback reliability — if OnlyOffice's callback fails, edits
are lost. A dead-letter queue or retry mechanism on the callback endpoint is
recommended.

---

## User Stories

### US1: Tenant User Edits .docx Document Within Workflow (P1)

**As a** tenant user (e.g., *NSW council assessor*)
**I want to** open, edit, and save .docx documents directly within the
Configurator workflow page
**So that** I don't need to switch between platforms to work on documents.

**Why this priority**: Core feature — without this, nothing else works. Enables
all document editing use cases across all tenant types.

**Independent Test**: Load a .docx template, edit text and tables, save, reopen
— formatting preserved within 5% tolerance.

**Acceptance Scenarios**:

1. **Given** a workflow page with the editor block configured, **When** the user
   opens the page, **Then** the editor loads the configured .docx template
   within 3 seconds on a 10 Mbps connection.
2. **Given** a loaded .docx document, **When** the user edits text, tables,
   headings, and lists, **Then** edits are visible in real-time with Word-like
   toolbar and ribbon interface.
3. **Given** an edited document, **When** the user saves, **Then** the .docx is
   stored in cloud storage and the URL persisted to the configured
   `customData` path with <5% formatting loss on round-trip.
4. **Given** a saved document, **When** the user reopens it later, **Then** all
   previous edits are preserved including tables, images, and styles.

---

### US2: AI Chatbot Pre-fills Document from Workflow Data (P1)

**As a** tenant user (e.g., *NSW council assessor drafting an assessment report*)
**I want** the AI chatbot to auto-fill document sections from workflow data
**So that** I spend time reviewing and refining rather than manual data entry.

**Why this priority**: The AI-assisted drafting is the primary differentiator
over opening documents in a standalone Word editor.

**Independent Test**: Open a template with auto-fill enabled, verify chatbot
populates sections from workflow data, accept/reject individual changes.

**Acceptance Scenarios**:

1. **Given** auto-fill is enabled and a template is loaded, **When** the editor
   loads, **Then** the chatbot reads the document structure and populates
   sections from configured data paths (e.g., *`customData.assessment`* for
   councils, *`customData.inventory`* for retail).
2. **Given** the chatbot has made edits, **When** the user views the document,
   **Then** all AI edits are highlighted with an accept/reject review bar
   showing "AI made N edits."
3. **Given** tracked AI edits, **When** the user accepts or rejects individual
   changes, **Then** the document updates accordingly and the review bar count
   decreases.
4. **Given** auto-fill is running, **When** a tool call fails, **Then** the
   system retries up to 3 times with exponential backoff and notifies the user
   if all retries fail, preserving any partial progress.

---

### US3: AI Chatbot Responds to Mid-Edit Queries (P2)

**As a** tenant user
**I want to** ask the chatbot questions while editing and have it insert content
on demand
**So that** I get contextual assistance without leaving the document.

**Why this priority**: Interactive AI assistance differentiates the editor from
a static template filler. Builds on US2's auto-fill foundation.

**Independent Test**: With a document open, ask the chatbot a question, verify
it inserts content at the correct location in the document.

**Acceptance Scenarios**:

1. **Given** a document open in the editor and the chatbot visible, **When** the
   user asks a question (e.g., *"What SEPP controls apply?"* for council, or
   *"Draft a non-compete clause"* for legal), **Then** the chatbot responds
   with context from the workflow data.
2. **Given** a chatbot response, **When** the user says "Insert that into the
   report," **Then** the chatbot inserts content at the appropriate document
   location with AI change tracking.
3. **Given** a batch request (e.g., *"Fill all EPA rows"*), **When** the chatbot
   executes multiple tool calls, **Then** each edit completes in <500ms and the
   total batch completes proportionally.

---

### US4: Senior User Reviews Document with Tracked Changes (P2)

**As a** senior user (e.g., *senior planner reviewing an assessment report*)
**I want to** review documents with tracked changes and comments
**So that** I can provide structured feedback and make approval decisions.

**Why this priority**: Review workflow is essential for document governance.
Builds on US1's editing capability.

**Independent Test**: Open a document, add tracked changes and comments, submit
review decision, verify changes visible to original author.

**Acceptance Scenarios**:

1. **Given** a document submitted for review, **When** the reviewer opens it,
   **Then** the editor shows the document with review tools (track changes,
   comments).
2. **Given** a reviewed document, **When** the reviewer submits their decision
   (approve/refuse), **Then** the review status is recorded and the document
   can be locked for signed-off documents.
3. **Given** a signed-off document, **When** any user opens it, **Then** the
   editor loads in read-only mode with a lock indicator.

---

### US5: Read-Only Document Viewing for External Users (P2)

**As an** external user (e.g., *applicant viewing a determination letter*)
**I want to** view documents in read-only mode and download as PDF or .docx
**So that** I can access official documents without editing capability.

**Why this priority**: Completes the document lifecycle — documents must be
viewable by external stakeholders.

**Independent Test**: Log in as viewer role, open a document, verify editing is
disabled, download as PDF.

**Acceptance Scenarios**:

1. **Given** a user with viewer permissions, **When** they open a document,
   **Then** the editor loads in read-only mode with all edit controls disabled.
2. **Given** a read-only document, **When** the user clicks export, **Then**
   the document downloads as PDF or .docx with formatting preserved.

---

### US6: External Developer Integrates Editor via Package (P3)

**As an** external developer
**I want to** install an npm package and render a Word editor in my app with
<5 config props
**So that** I can add document editing to my application without deep platform
knowledge.

**Why this priority**: Extends the editor's reach beyond the Configurator.
Important for ecosystem growth but not blocking core functionality.

**Independent Test**: Install package, render component with minimal config,
load a .docx, make edits, save — all within 4 hours using only docs.

**Acceptance Scenarios**:

1. **Given** a developer with a React/Vue/Angular/plain HTML project, **When**
   they install the npm package and render the component with documentUrl,
   authToken, and onSave props, **Then** a working editor appears.
2. **Given** the package is installed, **When** the developer calls
   `executeToolCall()` with any of the 12 tool schemas, **Then** the editor
   executes the operation and returns a result.
3. **Given** a non-React project, **When** the developer uses the web component
   variant (`<cloud-word-editor>`), **Then** it works identically to the React
   component.

---

### US7: Tenant Admin Configures Templates and Prompts (P3)

**As a** tenant admin
**I want to** upload document templates and configure chatbot prompts for my
tenant without any code changes
**So that** the editor serves my specific business domain immediately.

**Why this priority**: Enables the universal architecture — new tenants onboard
via configuration only.

**Independent Test**: Upload a .docx template via admin UI, configure a chatbot
prompt, verify the editor loads the template and chatbot uses the prompt.

**Acceptance Scenarios**:

1. **Given** a tenant admin logged in, **When** they upload a .docx template
   to tenant document configuration, **Then** the template is available in the
   editor for that tenant's users.
2. **Given** a configured template, **When** a user opens the editor on a
   workflow page, **Then** the tenant-specific template loads (not another
   tenant's template).
3. **Given** chatbot prompts configured per tenant, **When** auto-fill triggers,
   **Then** the chatbot uses the tenant-specific prompt.

---

### US8: Workflow Builder Adds Editor to Any Page (P3)

**As a** workflow builder
**I want to** add the editor block to any workflow page and configure its
behaviour without code deployment
**So that** I can enable document editing in any workflow stage.

**Why this priority**: Proves the block is workflow-agnostic and configurable.

**Independent Test**: Add editor block to a new workflow page via builder UI,
configure data paths, verify it loads and saves correctly.

**Acceptance Scenarios**:

1. **Given** a workflow builder editing a page, **When** they add the editor
   block from the block library, **Then** the block appears without any
   `usecase` restriction — available to all tenant types.
2. **Given** a configured editor block, **When** they set `savePath` and
   `loadFromPath`, **Then** the editor reads from and writes to those
   `customData` paths for any workflow entity.

---

### US9: Real-Time Collaboration on Documents (P4)

**As a** team of users (e.g., *two assessors working on the same report*)
**I want to** see each other's edits in real-time with visible cursors
**So that** we can work on the document simultaneously without conflicts.

**Why this priority**: Nice-to-have for v1. Real-time collaboration is built
into the editor engine but requires infrastructure validation.

**Independent Test**: Two users open the same document, make concurrent edits,
verify both see changes in real-time.

**Acceptance Scenarios**:

1. **Given** two users open the same document, **When** one user types, **Then**
   the other sees the changes within 2 seconds with a visible cursor label.
2. **Given** concurrent edits to different sections, **When** both save, **Then**
   all edits are preserved without conflicts.

---

### Edge Cases

- **What happens when** the document server is unavailable? → Editor shows
  "Document server unavailable" message with retry option. No silent failures.
- **What happens when** a .docx has unsupported formatting (SmartArt, ActiveX)?
  → Editor renders best-effort approximation, warns user of unsupported
  elements, and preserves them in the underlying XML for round-trip fidelity.
- **What happens when** network drops mid-edit? → Local edits continue in
  offline mode, changes sync automatically on reconnect.
- **What happens when** auth token expires during editing? → Silent refresh
  attempted; if failed, user prompted to re-authenticate with changes preserved.
- **What happens when** a 50+ page document is loaded? → Progressive rendering
  loads viewport first within 5 seconds; tool calls work on all pages.
- **What happens when** two chatbot tool calls conflict? → Sequential execution
  with result chaining; second call sees the state after the first.

---

## Functional Requirements

### FR-01: Native .docx Editing

The system MUST provide a browser-based editor that opens, edits, and saves
.docx documents with <5% formatting loss on round-trip (open → edit → save →
reopen). Supported elements: text, headings, tables, lists, images, styles,
headers/footers, page breaks, page numbers.

- **Validation**: Automated pixel comparison test of before/after rendering
- **Integration**: Cloud storage for document persistence

### FR-02: Three-Tier Configuration System Compliance

The editor block MUST follow the Configurator's three-tier configuration pattern:
- **presentationConfig**: height, toolbar visibility, theme, read-only mode
- **dataConfig**: savePath, loadFromPath, autoSave, document server URL
- **businessLogic**: AI tools enabled, auto-fill on load, export formats

The block MUST be registered without `usecase` filtering — available to ALL
tenant types.

- **Validation**: Block loads for council, retail, legal, healthcare tenants
  with different configs — zero code changes between use cases
- **Integration**: Block registry, page definition system, TenantSchemas

### FR-03: 12-Tool AI Editing API

The system MUST support all 12 document editing tool calls used by the existing
chatbot integration:
1. `get_document_content` — read content, structure, node positions
2. `edit_content` — insert, delete, search/replace, HTML content
3. `edit_table` — create/modify tables (13 operations)
4. `edit_styles` — apply text and paragraph formatting
5. `edit_list` — create/convert lists, indent/outdent
6. `edit_toc` — table of contents management
7. `edit_links` — hyperlink CRUD
8. `edit_visual_elements` — images, horizontal rules
9. `edit_fields` — date/time fields, page breaks
10. `navigate_document` — scroll to location
11. `export_document` — PDF/DOCX export, word count
12. `edit_layout` — margins, columns, orientation

Each tool call MUST complete in <500ms for single operations.

- **Validation**: Execute each tool call against a test document, verify output
- **Integration**: Chatbot communication protocol (existing CustomEvent bridge)

### FR-04: Chatbot Communication Protocol

The system MUST use the existing CustomEvent bridge protocol for chatbot
integration:
- `document-editor-tool-call` — chatbot → editor
- `document-editor-tool-result` — editor → chatbot
- `document-editor-new-turn` — chatbot → editor
- `chatbot-auto-fill` — editor → chatbot
- `chatbot-auto-fill-complete` — chatbot → editor
- `document-editor-export-request` — chatbot → editor

The existing ChatBot block MUST work with the new editor WITHOUT modification.

- **Validation**: ChatBot block dispatches tool calls, receives results
- **Integration**: ChatBot block, auto-fill service

### FR-05: AI Edit Tracking and Review

The system MUST track all AI-generated edits and present them for human review:
- Visual highlighting of AI edits (distinct from human edits)
- Accept/reject individual changes
- Batch accept/reject
- Edit count display ("AI made N edits")

- **Validation**: Trigger AI edits, verify review bar shows correct count,
  accept/reject individual changes
- **Integration**: AIEditReviewBar pattern from existing editor

### FR-06: Auto-Fill from Workflow Data

The system MUST support automatic document population from workflow data on load:
- Configurable via `businessLogic.autoFillOnLoad`
- Chatbot prompt from per-tenant configuration
- Data paths configurable via `dataConfig.loadFromPath`
- Background pre-fill (continues even if user navigates away)

- **Validation**: Configure auto-fill, open editor, verify sections populated
- **Integration**: Auto-fill service, TenantData for prompts

### FR-07: Document Persistence and Versioning

The system MUST persist documents to cloud storage with versioning. Note:
OnlyOffice Document Server is stateless — it does NOT store files. All saves
flow through: Editor → Document Server cache → callback/forcesave → backend →
Azure Blob.

- Server-side forcesave on a timer (every 2-3 minutes) persists to Azure Blob
- Manual save via Ctrl+S triggers immediate forcesave to Blob
- Default callback fires when last user closes the document
- Document Server's built-in autosave (`customization.autosave`) protects
  against browser crashes by caching internally, but does NOT write to Blob
- Document URL stored at configurable `customData` path
- Version history accessible from editor
- Link documents to workflow entities via metadata collection

- **Validation**: Edit, save, verify URL in customData; verify forcesave timer
  writes to Blob; check version history
- **Integration**: Cloud storage, Documents collection, forcesave API endpoint

### FR-08: Read-Only Mode

The system MUST support read-only document viewing:
- Configurable via `businessLogic.readOnly` or user role permissions
- All edit controls disabled
- Export (PDF/DOCX) still available
- Lock indicator for signed-off documents

- **Validation**: Open as viewer role, verify no edit capability, export works
- **Integration**: Role-based access, review workflow

### FR-09: Multi-Tenant Isolation

The system MUST ensure complete tenant isolation:
- Documents accessible only by authenticated users of the owning tenant
- Templates loaded from the current tenant's configuration only
- Chatbot prompts scoped to current tenant
- JWT tokens generated per-tenant per-document

- **Validation**: Attempt cross-tenant document access, verify 403 response
- **Integration**: Multi-tenant plugin, OPA access control, Entra ID auth

### FR-10: Document Export

The system MUST support exporting documents as:
- PDF (high fidelity, preserving tables, images, formatting)
- .docx (native format)

Exported files MUST be uploadable to the document storage and linkable to
workflow entities.

- **Validation**: Export as PDF and .docx, compare to source document
- **Integration**: Export API, Documents collection

### FR-11: Per-Tenant Template Management

The system MUST allow tenant admins to manage .docx templates:
- Upload .docx templates via admin UI
- Templates stored in per-tenant configuration
- Templates available in editor template selector
- Hierarchical inheritance (child tenant falls back to parent templates)

- **Validation**: Upload template, verify it appears in editor for that tenant
- **Integration**: TenantData `document-configuration`, tenant hierarchy

### FR-12: Word-Like User Interface

The system MUST provide a familiar Word-like editing experience:
- Ribbon-style toolbar interface
- Compatible keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+Z, etc.)
- WYSIWYG page layout (headers, footers, page breaks visible)
- Configurable theming (light/dark mode minimum)

- **Validation**: User test — government staff complete basic editing tasks
  within 5 minutes on first use without training
- **Integration**: Editor theming, Configurator design tokens

### FR-13: Authentication and Security

The system MUST authenticate document access:
- Server-generated JWT tokens per document session
- JWT contains user identity, document permissions, callback URL
- Tokens validated on every editor operation
- Token refresh on session expiry without data loss

- **Validation**: Verify JWT contains required claims; test expired token flow
- **Integration**: Entra ID, JWT generation API

### FR-14: Accessibility

The system MUST meet WCAG 2.1 AA baseline:
- Full keyboard navigation
- Screen reader support for document content
- High-contrast mode
- Minimum 4.5:1 contrast ratios for text

- **Validation**: Screen reader test (NVDA/VoiceOver can navigate and read),
  keyboard-only editing test
- **Integration**: Accessibility remediation if needed

### FR-15: External Package API

The system MUST provide a standalone npm package for external consumers:
- React component with <5 required props
- Web component variant for non-React frameworks
- Full 12-tool API accessible via `executeToolCall()`
- Domain-agnostic API (no business-specific concepts)

- **Validation**: Developer integrates in <4 hours with docs only
- **Integration**: Package build, ONLYOFFICE iframe wrapper

### FR-16: Dynamic Field Extensions

The system MUST support per-tenant field extensions on the editor block via
TenantSchemas:
- `schemaTarget: 'block'`, `blockSlug: 'onlyoffice-editor'`
- Custom fields visible in admin UI
- Custom field values accessible in component

- **Validation**: Create TenantSchema with custom field, verify it appears
- **Integration**: TenantSchemas, block cache invalidation

### FR-17: Audit Trail

The system MUST log document events for compliance:
- Document open, save, export events with user identity and timestamp
- AI edit events with tool call details
- Accept/reject decisions on AI edits
- Review decisions (approve/refuse)

- **Validation**: Perform document operations, verify events in audit log
- **Integration**: Existing AuditService

---

## Key Entities

- **Document Session**: Represents an active editing session — user, document
  reference, permissions, JWT token, creation time
- **Document Version**: A specific saved version of a document — storage URL,
  version number, author, timestamp, change summary
- **Document Template**: A reusable .docx template — storage URL, label,
  category, owning tenant
- **Tool Call Record**: A chatbot tool call execution — tool name, input,
  result, duration, associated document session

---

## Non-Functional Requirements

### Performance

- Editor loads viewport in <3 seconds on 10 Mbps connection
- Individual tool calls complete in <500ms
- Documents up to 50 pages load without degradation
- Auto-save completes within 2 seconds

### Security

- All document access authenticated via JWT
- Cross-tenant access returns 403
- Document server communication encrypted (HTTPS/WSS)
- JWT secrets stored securely (not in client code)

### Scalability

- Support 10,000+ tenants with isolated documents and templates
- Support 500+ concurrent editing sessions
- Per-region deployment for data residency compliance

### Compatibility

- Cross-browser: Chrome, Safari, Edge (Windows + Mac)
- Responsive viewing on iPad/tablet (editing on desktop)
- Coexistence with existing rich text editor (both available)

### Reliability

- Offline editing continues during network interruption
- Changes sync automatically on reconnect
- No data loss on token expiry (changes preserved during re-auth)
- Failed tool calls retry up to 3 times with exponential backoff

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| .docx fidelity | <5% formatting loss on round-trip | Automated pixel comparison test |
| Editor load time | <3 seconds on 10 Mbps | Performance test with network throttling |
| Tool call latency | <500ms per single operation | Instrumented timing on each tool call |
| External integration time | <4 hours for new developer | Developer test with docs only (no Slack help) |
| Large document handling | 50+ pages without degradation | Performance test with 60-page document |
| Cross-browser support | Chrome, Safari, Edge (Win + Mac) | Manual verification matrix |
| Accessibility | WCAG 2.1 AA baseline | Screen reader test (NVDA + VoiceOver) |
| Multi-tenant isolation | Zero cross-tenant data leaks | Automated security test |
| User usability | Standard editing task in <5 min first use | User test with 3 non-technical staff |
| Use-case agnosticism | Non-council tenant configures in <1 hour | Config-only test (zero code changes) |
| Auto-fill accuracy | >90% of template sections correctly populated | Automated template fill + comparison |

---

## Assumptions

- ONLYOFFICE Document Server is the selected editor engine (per discovery and
  research decisions, based on 12-option evaluation in `deep-research-reference.md`)
- ONLYOFFICE is a **stateless editing engine** — it does NOT store files. Files
  remain in Azure Blob Storage. The Document Server only renders and edits.
- ONLYOFFICE Developer Edition Basic ($1,950 one-time) will be procured for
  production. Community Edition (free, AGPL, 20-connection cap) used for
  development and testing.
- Azure App Service (Container) is the recommended deployment target — fits the
  existing Azure ecosystem (App Services, SWA already in use). AKS is overkill
  unless 100+ concurrent users are needed.
- ONLYOFFICE does NOT support direct autosave to Azure Blob — all saves flow
  through: Editor → Document Server cache → callback/forcesave → backend → Blob.
  Server-side forcesave on a 2-3 minute timer is the recommended approach.
- ONLYOFFICE Community Edition (AGPL, 20-connection cap) is acceptable for
  development and local testing but AGPL requires open-sourcing if embedded
  without Developer Edition license
- Microsoft Word Online CANNOT be embedded (CSP restriction, confirmed by
  Microsoft) — this is why a third-party editor is required
- The existing TipTap-based DocumentEditor will NOT be replaced — both editors
  coexist; workflow builders choose which to use per page
- ONLYOFFICE Document Builder API supports programmatic .docx editing via macros
- ONLYOFFICE lacks formal WCAG 2.1 AA certification — accessibility remediation
  may be needed for government procurement
- Document Builder macro execution is asynchronous (~50-200ms latency per call,
  vs TipTap's ~5ms synchronous DOM operations)
- Multi-region deployment requires one Document Server instance per Azure region
  (can be Azure App Service Container per region, not necessarily AKS)
- Real-time co-editing is handled internally by ONLYOFFICE (OT-based sync
  between users), but file persistence to Blob only happens on close or forcesave
- OnlyOffice Document Server should be placed on a private VNet — only the
  Configurator app talks to it. Managed Identity recommended for Blob access.

---

## Dependencies

- **Configurator Block System** — block registration, rendering, page definitions
- **ChatBot Block** — existing CustomEvent protocol and auto-fill service
- **Azure Blob Storage** — document file storage (per-region containers)
- **Documents Collection** — document metadata, versioning, security levels
- **BusinessRequests Collection** — customData storage for document URLs
- **TenantData Collection** — per-tenant templates, server config, prompts
- **TenantSchemas Collection** — dynamic field extensions for the editor block
- **Entra ID (B2B + B2C)** — authentication and user identity
- **OPA Access Control** — multi-tenant document access enforcement
- **Audit Logs Collection** — event logging for compliance
- **ONLYOFFICE Document Server** — external dependency, self-hosted as Docker
  container on Azure App Service (recommended) or Azure Container Instance.
  Developer Edition Basic ($1,950 one-time) for production; Community Edition
  (free) for development/testing.
- **ONLYOFFICE JS API SDK** — client-side integration library (`DocsAPI.DocEditor`)
- **Azure App Service (Container)** — hosting for OnlyOffice Document Server,
  fits existing Azure ecosystem. Private VNet recommended.
- **Forcesave API** — server-side endpoint to trigger periodic saves from
  Document Server cache to Azure Blob (2-3 minute timer recommended)

---

## Out of Scope

- **Replacing the existing TipTap DocumentEditor** — both editors coexist
- **Microsoft Word Online embedding** — technically impossible (CSP restriction)
- **Desktop application** — browser-only solution
- **Spreadsheet or presentation editing** — .docx only for v1
- **Microsoft Word add-ins** — standalone web-based only
- **Real-time voice/video collaboration** — document collaboration only
- **AI model training** — uses existing chatbot infrastructure
- **Mobile editing** — responsive viewing only; editing on desktop

---

## Glossary

| Term | Definition |
|------|------------|
| ONLYOFFICE | Stateless document editing engine (does NOT store files) with Word-like interface |
| Forcesave | OnlyOffice API to flush Document Server cache to your backend on demand |
| Callback URL | Endpoint the Document Server POSTs to when a document is saved/closed |
| SAS URL | Shared Access Signature — Azure Blob time-limited access URL |
| Document Builder | ONLYOFFICE API for programmatic document editing via JavaScript macros |
| Three-tier config | Configurator's block config + TenantData + TenantSchemas system |
| CustomEvent bridge | Browser event-based communication between ChatBot and editor blocks |
| Tool call | A structured AI operation (e.g., `edit_content`, `edit_table`) dispatched from chatbot to editor |
| AIEditReviewBar | UI component showing AI edit count with accept/reject controls |
| Auto-fill | Chatbot-driven document population from workflow data on editor load |
| TenantData | Per-tenant configuration records (templates, prompts, settings) |
| TenantSchemas | Dynamic field extensions for collections and blocks per tenant |
| JWT | JSON Web Token — server-generated authentication token for document sessions |
| .docx | Microsoft Word Open XML format |
| OOXML | Office Open XML — the underlying XML standard for .docx files |
| DA | Development Application (NSW council planning term) |
| EPA | Environmental Planning and Assessment Act 1979 (NSW) |
| SEPP | State Environmental Planning Policy (NSW) |
| LEP | Local Environmental Plan (NSW) |

---

## Research Traceability

| Research Finding | Spec Section | Reference |
|-----------------|-------------|-----------|
| ChatBot ↔ Editor CustomEvent bridge | FR-04 | 6 event names reused |
| Azure Blob Storage document persistence | FR-07, Dependencies | Per-region containers |
| Documents Collection metadata | FR-07, Dependencies | Version history, security levels |
| BusinessRequest.customData storage | FR-02 (dataConfig.savePath) | Nested path resolution |
| Workflow Pages (pageDefinitionUtils.ts) | FR-02, US8 | Block on any workflow page |
| TenantData per-tenant config | FR-06, FR-11, Dependencies | Templates and prompts |
| Entra ID authentication | FR-13, Dependencies | JWT from Entra user context |
| TenantSchemas block extensions | FR-16, Dependencies | Dynamic fields per tenant |
| ONLYOFFICE Document Server selection | Assumptions, Dependencies | 12-option evaluation |
| Document Builder macro API | FR-03 (tool translation) | 12 tool schemas → macros |
| Coexistence with TipTap editor | Out of Scope, Assumptions | Both editors permanent |
| WCAG 2.1 AA gap in ONLYOFFICE | FR-14, Assumptions | Remediation may be needed |
| Multi-region deployment | NFR Scalability | One cluster per Azure region |
| ONLYOFFICE iframe cross-origin | Assumptions | postMessage API, not DOM access |
| Word Online CSP restriction | Out of Scope, Assumptions | Confirmed impossible |
| Tool call async latency (50-200ms) | Assumptions, FR-03 | vs TipTap's 5ms sync |
| External npm package API | FR-15, US6 | <5 props, framework-agnostic |
| OnlyOffice stateless architecture | Technical Context, Assumptions | Not SharePoint — files stay in Azure Blob |
| Autosave mechanism (forcesave) | FR-07, Technical Context | No direct Blob save — Editor → cache → forcesave → backend → Blob |
| Developer Edition licensing ($1,950) | Technical Context, Dependencies | One-time purchase, 20 concurrent connections |
| Azure App Service Container hosting | Technical Context, Dependencies | Fits existing Azure ecosystem (App Services, SWA) |
| Private VNet for Document Server | Assumptions, Technical Context | Only Configurator app talks to Document Server |
| OT-based co-editing sync | Assumptions, Technical Context | Real-time sync internal, Blob write on close/forcesave |
