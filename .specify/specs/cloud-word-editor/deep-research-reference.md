# [POC] Cloud Word Document Editing — Deep Research & Market Analysis

> **Last updated**: March 2026
> **Status**: Research complete — ready for POC decision
> **Parent doc**: `POC-Cloud-Word-Editor.md`

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Problem Statement](#problem-statement)
- [UI/UX Requirements (Key Feature)](#uiux-requirements-key-feature)
- [Azure-First Architecture Requirement](#azure-first-architecture-requirement)
- [Data Governance Model](#data-governance-model)
- [Critical Finding: Microsoft Word Online Cannot Be Embedded](#critical-finding-microsoft-word-online-cannot-be-embedded)
- [Deep Research: Market Landscape](#deep-research-market-landscape)
- [All 12 Options Compared](#all-12-options-compared)
- [Open-Source Project Health](#open-source-project-health)
- [Companies Already Doing This](#companies-already-doing-this)
- [UI/UX Deep Comparison](#uiux-deep-comparison)
- [Cost Analysis at Scale](#cost-analysis-at-scale)
- [Azure Deployment Paths](#azure-deployment-paths)
- [Dynamic Injection + Word Online Hybrid Pattern](#dynamic-injection--word-online-hybrid-pattern)
- [Top 3 Recommendations](#top-3-recommendations)
- [Honest Assessment: Can We Do This?](#honest-assessment-can-we-do-this)
- [POC Success Criteria](#poc-success-criteria)
- [Research Sources](#research-sources)

---

## Executive Summary

We need an embeddable Word document (.docx) editor for the Configurator ecospace with chatbot (DAISY) programmatic editing. After deep research into every viable open-source project, commercial SDK, and Microsoft-native option:

- **Microsoft Word Online CANNOT be embedded** in a custom web app (CSP restriction, confirmed by Microsoft, no roadmap to change)
- **12 viable alternatives exist** — ranging from free open-source to $100K+/yr commercial SDKs
- **All deploy cleanly on Azure** (except Zoho and Google which require non-Azure infrastructure)
- **UI/UX quality varies dramatically** — OnlyOffice is the most Word-like, Syncfusion is the most developer-friendly, Apryse has the best accessibility compliance
- **A hybrid approach** (embedded editor for daily work + Word Online redirect for high-fidelity editing) is likely the best architecture
- **This IS achievable** with our constraints — no single constraint eliminates all options

---

## Problem Statement

We need to embed a cloud-based Word document (.docx) editing experience directly within the Configurator ecospace, where users can view and edit Word documents without leaving the platform, and the DAISY chatbot can programmatically edit document content on-the-fly via tool calls.

**UI/UX is a key feature** — the editing experience must feel polished, modern, and familiar to government staff who use Microsoft Word daily. A clunky or dated interface is a non-starter.

The solution must be packaged so that external entities (e.g., the DAISY repo or any third-party business) can integrate the Word editing capability with minimal setup — it should be a drop-in integration, not a complex infrastructure project.

---

## UI/UX Requirements (Key Feature)

UI/UX quality is a **first-class requirement**, not an afterthought.

### Familiarity

- The editor UI should closely resemble Microsoft Word's ribbon interface — council staff should feel immediately productive without training
- Keyboard shortcuts must be compatible with Word (Ctrl+B, Ctrl+I, Ctrl+Z, Ctrl+S, etc.)
- Print layout / page view must be faithful — headers, footers, page breaks, margins, columns all visible in WYSIWYG mode

### Customisation

- Must support theming (light/dark mode minimum) to match Configurator ecospace design tokens
- Toolbar must be configurable — show/hide features, rearrange tools, add custom buttons (e.g., "Ask DAISY" button)
- Must support white-labelling for external consumers

### Accessibility

- WCAG 2.1 AA minimum (government procurement requirement)
- Full keyboard navigation
- Screen reader support (ARIA labels, semantic structure)
- High-contrast mode
- Formal VPAT / accessibility conformance report preferred for procurement

### Chatbot Integration UX

- When DAISY chatbot makes edits, the user must see real-time visual feedback (insertion animation, highlight, or change tracking)
- Undo/redo must work correctly with programmatic edits — users must be able to undo chatbot changes
- Grouped undo: multiple rapid chatbot edits should be undoable as a single action

### Mobile / Tablet

- Must support responsive viewing on iPad/tablet (editing is a bonus, not a requirement)
- Touch-friendly controls for basic operations

---

## Azure-First Architecture Requirement

We are a Microsoft Azure shop. All solutions must be evaluated through this lens:

### Preferred: Deploys natively on Azure

- Azure Kubernetes Service (AKS), Azure Container Apps, or Azure App Service
- Azure Blob Storage or SharePoint for document storage
- Azure CDN for static assets
- Entra ID for authentication
- Azure Monitor for observability

### Acceptable: Runs on Azure with minor adaptation

- Docker containers that deploy to AKS/ACA without modification
- Client-side JavaScript SDKs that serve from Azure CDN
- Solutions available on Azure Marketplace

### Requires justification: Deviates from Azure

If a solution requires non-Azure infrastructure (e.g., vendor-hosted SaaS outside Azure), it must:
1. Clearly document what runs outside Azure and why
2. Demonstrate that data governance requirements are still met per-region
3. Provide a migration path back to Azure-hosted infrastructure
4. Justify the deviation with significant capability advantages

---

## Data Governance Model

### Multi-Region via Azure (NOT single-region lock)

We are **NOT constrained to Azure Australia East only**. Our data governance model follows the customer's region. When we expand to other countries, data will be governed to that region via Azure Cloud:

| Customer Region | Azure Region | Data Residency |
|-----------------|-------------|----------------|
| Australia | Azure Australia East / Southeast | Australian data sovereignty |
| United Kingdom | Azure UK South / West | UK GDPR + data sovereignty |
| European Union | Azure West Europe / North Europe | EU GDPR, Schrems II compliant |
| United States | Azure East US / West US | US data residency |
| Canada | Azure Canada Central / East | Canadian data sovereignty |
| New Zealand | Azure Australia East (closest) or NZ region when available | NZ data sovereignty |

**Implementation**: The chosen solution must support multi-region deployment from day one. Client-side SDKs (Syncfusion, Apryse, Nutrient, docx-js-editor) have an inherent advantage — document processing happens in the user's browser, so data never leaves the device regardless of region. Server-side solutions (OnlyOffice, Collabora) require a document server instance per region.

---

## Critical Finding: Microsoft Word Online Cannot Be Embedded

**There is NO Microsoft-approved way to embed a fully editable Word Online experience inside a custom web application's own domain as of March 2026.**

| Source | Verdict | Link |
|--------|---------|------|
| Microsoft Q&A (2024) | "Embedding Microsoft Word in edit mode within an iframe hosted outside of SharePoint is **not supported by design**" | [Link](https://learn.microsoft.com/en-us/answers/questions/5669186/is-there-a-supported-way-to-embed-editable-sharepo) |
| Microsoft Q&A (2023) | "There is no supported configuration at tenant-level to allow this" | [Link](https://learn.microsoft.com/en-us/answers/questions/860742/how-to-embed-office-365-word-document-in-edit-mode) |
| SharePoint GitHub Issue #10526 | Closed as **by-design**. No roadmap item to change. | [Link](https://github.com/sharepoint/sp-dev-docs/issues/10526) |
| WOPI Documentation | Requires Cloud Storage Partner Program membership (ISVs only) | [Link](https://learn.microsoft.com/en-us/microsoft-365/cloud-storage-partner-program/online/) |

### Every Microsoft path evaluated

- **SharePoint Embedded** (GA): Storage via Graph API, editing opens in a **new tab/popup**, NOT embedded. Read-only preview CAN be embedded via iframe.
- **WOPI / Cloud Storage Partner Program**: Only available to ISVs whose primary business is cloud storage. Not open to enterprise app developers.
- **Microsoft Graph API**: File management only — cannot edit content inside a .docx programmatically (insert paragraphs, format text, etc.). You must download, modify with a library, and re-upload.
- **Office Add-ins / Office.js**: Run INSIDE Word Online/Desktop — the user must be in Word. Does NOT let you embed Word inside YOUR app.
- **Loop Components**: Only embeddable within M365 apps (Teams, Outlook), not custom web apps.
- **M365 + Next.js + Azure Entra ID**: [Guides like this one](https://medium.com/@sagar.bantu30/microsoft-365-integration-with-next-js-a-complete-guide-using-azure-entra-id-6908e76607b1) cover authentication with Entra ID and accessing Graph API. Authentication is solved (we already use Entra ID). The blocker is embedding the editable Word UI, which auth does not unlock.
- **iframe embed code from Word Online's "Share → Embed"**: Generates a **read-only** embed only. Does NOT allow editing.

**Bottom line**: Microsoft does not offer an embeddable Word editor. We MUST use a third-party solution for embedded editing. The good news: all viable alternatives deploy cleanly on Azure.

---

## Deep Research: Market Landscape

### All 12 Options Compared

| # | Solution | Type | .docx Fidelity | Chatbot API | Azure Deploy | Effort | Annual Cost (est. 500 users) | External Integration | UI/UX | WCAG |
|---|----------|------|----------------|-------------|-------------|--------|------------------------------|---------------------|-------|------|
| 1 | **[OnlyOffice Docs](https://api.onlyoffice.com/)** | Self-hosted server + iframe | **95%** | JS API + REST + Document Builder | Yes (AKS/Docker, [Azure Marketplace](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/vmlabinc1613642184700.onlyoffice-document-server)) | Med (3-4 wk) | **$4,500–$15,000** | Medium — Docker server | **Excellent** — most Word-like | No formal cert |
| 2 | **[Collabora Online](https://www.collaboraonline.com/)** | Self-hosted server + iframe | **85%** | WOPI + postMessage | Yes (AKS/Docker) | Med (3-4 wk) | **$10,000–$25,000** | Medium — Docker server | Good — 2025 UI refresh | Improving |
| 3 | **[Syncfusion Document Editor](https://www.syncfusion.com/docx-editor-sdk/javascript-docx-editor)** | JS component (client-side) | **90%** | **Full programmatic API** | N/A (client-side) | **Low (1-2 wk)** | **$4,645–$15,000** (unlimited flat-fee) | **Easy — npm install** | **Strong** — full theming | Claimed 2.2 AA |
| 4 | **[Apryse WebViewer](https://apryse.com/capabilities/docx-editor)** | JS component (client-side) | **85%** | **Full programmatic API** | N/A (client-side) | **Low (1-2 wk)** | **$30,000–$100,000+** | **Easy — npm install** | Strong — modular UI | **WCAG 2.2 AA** |
| 5 | **[CKEditor 5](https://ckeditor.com/)** | JS editor + cloud conversion | **70%** (HTML-based, not native DOCX) | Full editor API | Partial (on-prem converter available) | Low-Med (2-3 wk) | **$5,000–$50,000** (usage-based) | **Easy — npm install** | Excellent UX (but rich text, NOT Word) | **WCAG 2.2 AA + VPAT** |
| 6 | **[SharePoint Embedded](https://learn.microsoft.com/en-us/sharepoint/dev/embedded/overview)** | Microsoft API + popup edit | **100%** (native Word) | Graph API (file-level only) | Azure-native | High (4-6 wk) | **M365 licensing ($6–$22/user/mo)** + Azure | Hard — M365 per user | N/A — editing in new tab | N/A (Microsoft UI) |
| 7 | **[TX Text Control](https://www.textcontrol.com/)** | .NET server + JS client | **90%** | Full .NET + JS API | Yes ([Azure App Service](https://www.textcontrol.com/blog/2025/03/26/deploying-the-tx-text-control-document-editor-in-an-asp-net-core-web-app-to-azure-app-services/)) | Med (3-4 wk) | **$14,000–$20,000** | Medium — .NET backend | Very Good — Word-inspired ribbon | Section 508 |
| 8 | **[Nutrient](https://www.nutrient.io/sdk/javascript-docx-editor/)** (formerly PSPDFKit) | JS SDK (client-side) | **80%** | Programmatic API | N/A (client-side) | Low-Med (2-3 wk) | **$30,000–$100,000+** (custom quote) | **Easy — npm install** | Strong — clean viewer design | Assistive tech compatible |
| 9 | **[Zoho Office Integrator](https://www.zoho.com/officeintegrator/)** | Cloud SaaS + iframe | **85%** | REST + JS API | **NO** (Zoho-hosted, data leaves Azure) | Low (1-2 wk) | **$5,000–$30,000** (per-API-call) | Easy — iframe embed | Good — Zoho-branded | Unknown |
| 10 | **[SuperDoc](https://www.superdoc.dev/)** | JS library (ProseMirror-based, client-side) | **75%** | Full JS API (60+ extensions) | N/A (client-side) | Low (1-2 wk) | Custom (AGPL free, commercial license required) | **Easy — npm install** | Good — modern, newer project | Unknown |
| 11 | **[docx-js-editor](https://github.com/eigenpal/docx-js-editor)** | React component (ProseMirror-based, client-side) | **75%** | Full JS API + plugin system | N/A (client-side) | **Low (1 wk)** | **Free (MIT license)** | **Easiest — npm install, zero cost** | Good — modern, TypeScript-native | Unknown |
| 12 | **Word Online Redirect** (not embedded) | Redirect to Word for the Web | **100%** | Graph API for pre-population only | Azure-native (M365) | Med (2-3 wk) | **M365 licensing** | Easy — just a URL | Excellent — it IS Word | N/A (Microsoft UI) |

### Solutions That Require Deviation From Azure

| Solution | What's Outside Azure | Risk | Mitigation |
|----------|---------------------|------|------------|
| **Zoho Office Integrator** | Document processing on Zoho servers (India/US data centres) | Data residency violation | None — cannot force Zoho to Azure |
| **CKEditor Cloud Services** | Collaboration server hosted by CKEditor | Low (optional feature) | On-prem server available (Enterprise plan) |
| **Google Docs** | Google Cloud | Data residency violation | None — eliminated |

**All other options (1–8, 10–12) can run 100% on Azure.**

### Eliminated Options

- **Google Docs Embed**: Data residency issues, converts to Gdoc format (~60% fidelity), not Azure-native
- **Aspose.Words Cloud**: API only, no interactive editor UI
- **MESCIUS/GrapeCity Documents**: Server-side API only, no browser editor ([developer.mescius.com](https://developer.mescius.com/document-solutions))
- **Docxtemplater** ([docxtemplater.com](https://docxtemplater.com/)): Template-based .docx generation from JSON data — not an interactive editor
- **TinyMCE**: HTML editor with limited .docx support (~65% fidelity)

---

## Open-Source Project Health (March 2026)

| Project | GitHub Stars | Contributors | Total Commits | Last Release | License | Docker |
|---------|-------------|-------------|--------------|-------------|---------|--------|
| **[OnlyOffice DocumentServer](https://github.com/ONLYOFFICE/DocumentServer)** | ~6,300 | ~22 (core team) | 533 | v9.3.0 (Feb 2026) | AGPL v3.0 | Yes — `onlyoffice/documentserver` |
| **[Collabora Online](https://github.com/CollaboraOnline/online)** | ~3,000 | 347 | 33,817 | 25.04.7 (Dec 2025) | MPL v2.0 | Yes — `collabora/code` |
| **[docx-js-editor](https://github.com/eigenpal/docx-js-editor)** | ~441 | Small team | 444 | v0.0.16 (Feb 2026) | MIT | N/A — client-side only |
| **[SuperDoc](https://github.com/superdoc-dev/superdoc)** | ~334 | Small team | 4,566 | v1.16.0 (Feb 2026) | AGPL v3.0 | N/A — client-side only |

**Key observations:**
- OnlyOffice has the most mature server-based OSS offering but AGPL Community Edition is **capped at 20 concurrent connections**
- Collabora has the most contributors (347) and commits (33,817) — the LibreOffice engine is battle-tested
- docx-js-editor is a promising **MIT-licensed** React+ProseMirror component with zero server dependencies — ideal for POC and external integration
- SuperDoc is similar to docx-js-editor (ProseMirror-based, client-side) but uses AGPL license

**Notable March 2026 development**: The Document Foundation has [de-atticized LibreOffice Online (LOOL)](https://www.theregister.com/2026/03/02/libreoffice_online_deatticized/), potentially reviving it as a separate project from Collabora. Not yet available for download but worth monitoring.

---

## Companies Already Doing This

### Government deployments

| Organization | Solution | Scale | Details |
|---|---|---|---|
| **German Federal Ministry of the Interior (BMI)** | Collabora Online | National | [openDesk project](https://www.collaboraonline.com/blog/opendesk-collabora-online-brings-digital-freedom-to-european-government/) — EU-wide government office infrastructure |
| **French General Secretariat of Economic Ministries** | OnlyOffice + Alfresco | National | Integrated OnlyOffice with Alfresco DMS |
| **Lao Government** | OnlyOffice + Nextcloud | National | Deployed across government agencies |
| **City of Hopewell, Virginia (USA)** | OnlyOffice Workspace | ~500 employees | Private infrastructure deployment |
| **University of Lille (France)** | Collabora Online + Nextcloud | 70,000+ users | [Implemented by Arawa](https://www.collaboraonline.com/blog/arawa-implementing-collabora-online-university-of-lille/) |
| **University of Nantes (France)** | OnlyOffice + Nextcloud | University-wide | [UNCloud platform](https://www.onlyoffice.com/blog/2020/05/how-the-university-of-nantes-deployed-its-online-collaboration-platform-based-on-nextcloud-and-onlyoffice) |

### Enterprise / SaaS platform integrations

| Company | Solution | Context |
|---|---|---|
| **Nextcloud** | Collabora Online or OnlyOffice | [Nextcloud Office](https://nextcloud.com/office/) bundles Collabora |
| **Dropbox** | Apryse (PDFTron) | [Built PDF editing](https://apryse.com/blog/customers/dropbox) using Apryse SDK |
| **LexisNexis** | SharePoint Embedded | [AI-ready document infrastructure](https://techcommunity.microsoft.com/blog/spblog/sharepoint-showcase-using-sharepoint-embedded-to-create-ai-ready-infrastructure/4496677) for legal workflows |
| **Spielberg Solutions (German ECM)** | Apryse | 7,000+ installations of FileDirector ECM |
| **Talkspirit (French SaaS)** | OnlyOffice | [Enterprise social network](https://www.onlyoffice.com/blog/2020/09/onlyoffice-brings-its-powerful-document-editors-to-the-enterprise-social-network-talkspirit) with real-time co-editing |
| **Eigenpal** | docx-js-editor | Built their own OSS editor for document workflow templates |

**Key insight**: Government bodies overwhelmingly choose OnlyOffice or Collabora for sovereign/self-hosted deployments. Commercial SaaS platforms split between OnlyOffice (Word fidelity) and Apryse (multi-format SDK). **No one has successfully embedded Microsoft Word Online editing inside their own app** — it's not technically possible.

---

## UI/UX Deep Comparison

### Word-Familiarity Ranking

| Rank | Editor | Word Resemblance | Training Overhead | Demo |
|------|--------|-------------------|-------------------|------|
| 1 | **OnlyOffice** | **Very High** — ribbon tabs, OOXML native, nearly identical layout | **Minimal** — staff productive immediately | [Try it (no signup)](https://www.onlyoffice.com/see-it-in-action) |
| 2 | **TX Text Control** | High — MS Word-inspired ribbon bar, pixel-perfect rendering | Low | [Demo](https://demos.textcontrol.com/) |
| 3 | **Collabora Online** | Moderate-High — LibreOffice NotebookBar, 2025 refresh | Low-Moderate | [Via Nextcloud](https://nextcloud.com/office/) |
| 4 | **Syncfusion** | Moderate — page-layout WYSIWYG, toolbar-based (no ribbon) | Moderate | [Demo](https://ej2.syncfusion.com/demos/document-editor/default/) |
| 5 | **docx-js-editor** | Moderate — clean toolbar, modern React design | Moderate | [Eigenpal platform](https://eigenpal.com) |
| 6 | **Nutrient** | Moderate — page-based layout, Google Docs aesthetic | Moderate | [Demo](https://www.nutrient.io/demo/) |
| 7 | **Apryse** | Low-Moderate — SDK UI, document platform feel | Moderate-High | [Demo](https://showcase.apryse.com/) |
| 8 | **CKEditor 5** | Low — flat toolbar, HTML-oriented, NOT a Word processor | High | [Demo](https://ckeditor.com/ckeditor-5/demo/) |

### Print Layout / Page View Fidelity

| Editor | Print Layout | Headers/Footers | Page Breaks | Columns | Tables |
|--------|-------------|-----------------|-------------|---------|--------|
| **OnlyOffice** | Excellent | Yes | Yes | Yes | Full support |
| **Collabora** | Excellent | Yes | Yes | Yes | Full support |
| **TX Text Control** | Excellent | Yes | Yes | Yes | Full support |
| **Syncfusion** | Very Good | Yes | Yes | Yes | Full support |
| **Apryse** | Good | Yes | Yes | Yes | Good |
| **Nutrient** | Good | Yes | Yes | Limited | Good |
| **docx-js-editor** | Good | Yes | Yes | Limited | Yes |
| **SuperDoc** | Good | Yes | Yes | Limited | Yes |
| **CKEditor 5** | **Poor** — no true page view | No | Limited | No | Basic |

### Customization & Theming

| Capability | OnlyOffice | Syncfusion | Apryse | docx-js-editor | Collabora | TX Text Control | Nutrient |
|---|---|---|---|---|---|---|---|
| **Toolbar customization** | Yes (Dev Ed.) | Excellent (full API) | Excellent (modular) | Yes (plugin arch.) | Limited | Yes (ribbon elements) | Yes |
| **Theming** | Light/Dark/Custom | Material, Bootstrap, Tailwind, Fluent | Full CSS | CSS customizable | Limited | HTML5/CSS | Adjustable |
| **White-labeling** | Yes (Dev Ed.) | Yes (commercial) | Yes (open-source UI) | Yes (MIT) | Enterprise only | Yes | Yes |
| **Responsive / mobile** | Fair | Good (view only on mobile) | Fair | Good | Strong (mobile app) | Fair | Good |

### Accessibility Compliance

| Editor | Formal WCAG Claim | VPAT Available | Safe for Gov Procurement? |
|--------|-------------------|----------------|--------------------------|
| **CKEditor 5** | **WCAG 2.2 AA + Section 508** | **Yes** | **Yes** — strongest |
| **Apryse** | **WCAG 2.2 AA** | **Yes** | **Yes** |
| **Syncfusion** | WCAG 2.2 AA claimed, axe-core tested | No | Likely with remediation |
| **OnlyOffice** | No formal certification | No | **Risk** — may block procurement |
| **Collabora** | 100+ improvements in 25.04, no formal cert | No | Possible with caveats |
| **TX Text Control** | Section 508 claimed | No | Needs verification |
| **Nutrient** | Assistive tech compatible | Unknown | Needs verification |
| **docx-js-editor** | No claims | No | Needs evaluation |
| **SuperDoc** | No claims | No | Needs evaluation |

### Real-Time Collaboration

| Editor | Google Docs-style co-editing | Quality |
|---|---|---|
| **OnlyOffice** | Yes — "Fast" mode (real-time) + "Strict" mode (lock-based) | **Excellent** — mature, 40+ integrations |
| **Collabora** | Yes — cursor visibility, "Follow the Editor" feature | **Excellent** — strong for meetings |
| **CKEditor 5** | Yes — via CKEditor Cloud Services | Excellent for rich text |
| **Syncfusion** | Yes — OT algorithm, SignalR-based | Good — requires dev setup (Redis + SignalR) |
| **SuperDoc** | Yes — via Yjs CRDT | Good — newer |
| **docx-js-editor** | Plugin architecture supports it | Emerging |
| **Apryse** | Partial — annotations/comments focus | Moderate |
| **TX Text Control** | Limited — annotations/stamps | Basic |

### Chatbot/AI Integration UX

| Editor | AI Features | Programmatic Edit API | Grouped Undo for AI Edits |
|---|---|---|---|
| **OnlyOffice** | Built-in AI plugin (ChatGPT, Claude, Gemini, Mistral, Ollama) | Document Builder API + JS API | Individual undo steps |
| **Syncfusion** | Blazor AI (Rephrase, Translate, Grammar) | `editor.insertText()`, full API | **Yes — grouped undo/redo** |
| **CKEditor 5** | AI Chat sidebar (OpenAI, Azure, Bedrock) | `model.change()` batch ops | Yes — batch operations |
| **Apryse** | Server-side AI (classification, extraction) | Full programmatic SDK | Programmatic undo stack |
| **docx-js-editor** | None built-in (extensible via plugins) | Plugin architecture | Standard undo/redo |
| **Nutrient** | TypeScript API, template-driven generation | Full API | Standard undo/redo |

---

## Cost Analysis at Scale (100+ Tenants, ~500 Concurrent Users)

### Annual Cost Comparison

| Solution | Licensing Model | License Cost | Azure Infra Cost | **Total Annual Est.** | M365 Required? |
|---|---|---|---|---|---|
| **docx-js-editor** | MIT (free) | $0 | $2K–4K (app hosting) | **$2K–$4K/yr** | No |
| **OnlyOffice Community** | AGPL (free, 20 user cap) | $0 | $6K–8K (AKS) | **$6K–$8K/yr** | No |
| **OnlyOffice Developer Ed.** | Per-server, per-connection | $4,500–$15,000 | $6K–8K (AKS) | **$10K–$23K/yr** | No |
| **Syncfusion** | Unlimited flat-fee | $4,645–$15,000 | $2K–5K (app hosting) | **$7K–$20K/yr** | No |
| **CKEditor 5** | Per-editor-load | $5,000–$50,000 | $2K–4K | **$7K–$54K/yr** | No |
| **SuperDoc** | AGPL / commercial | Custom | $2K–4K (app hosting) | **Custom** | No |
| **Collabora Online** | Per-user/year | $10,000–$25,000 | $6K–10K (AKS) | **$16K–$35K/yr** | No |
| **TX Text Control** | Per-dev + OEM runtime | $14,000–$20,000 | $4K–6K (.NET) | **$18K–$26K/yr** | No |
| **Apryse** | Custom/consumption | $30,000–$100,000+ | $2K–4K | **$32K–$104K/yr** | No |
| **Nutrient** | Custom quote | $30,000–$100,000+ | $2K–4K | **$32K–$104K/yr** | No |
| **Zoho Office Integrator** | Per-API-call | $5,000–$30,000 | $1K–2K | **$6K–$32K/yr** | No (data leaves Azure) |
| **SharePoint Embedded** | M365 licensing + Azure | M365: $36K–$132K/yr (500 users) | ~$14K/yr | **$50K–$146K/yr** | **Yes** |

### Cost-Effectiveness Ranking

1. **docx-js-editor** ($2K–$4K/yr) — Free MIT license, client-side only. Risk: newer project, less proven at scale
2. **Syncfusion** ($7K–$20K/yr) — Best value commercial option, unlimited flat-fee, no per-user charges. Free community license for <$1M revenue
3. **OnlyOffice Developer Ed.** ($10K–$23K/yr) — Best value self-hosted, white-label included, most Word-like UI
4. **Collabora Online** ($16K–$35K/yr) — Strong government adoption, LibreOffice engine fidelity
5. **TX Text Control** ($18K–$26K/yr) — Best for .NET shops, perpetual licensing available
6. **Apryse / Nutrient** ($32K–$104K/yr) — Premium; best for combined PDF+DOCX, strongest accessibility

---

## Azure Deployment Paths

### Path 1: Client-Side SDK (Syncfusion, Apryse, Nutrient, docx-js-editor)

```
Azure CDN ──→ Serves JS SDK bundle
Azure App Service ──→ Your Configurator app
Azure Blob Storage ──→ .docx file storage (per-region)
Entra ID ──→ Authentication
```

- Zero document processing infrastructure
- Cheapest to operate, scales infinitely (browser does the work)
- Best for external integration (npm package)
- **Multi-region**: client-side = no per-region server needed

### Path 2: Self-Hosted Document Server (OnlyOffice, Collabora)

```
Azure Container Apps / AKS ──→ Document Server pods (per region)
Azure Database for PostgreSQL ──→ Metadata
Azure Blob Storage ──→ Document storage (per region)
Azure Load Balancer / Front Door ──→ Traffic distribution + WebSocket
Azure Container Registry ──→ Docker images
Entra ID ──→ Authentication
```

- More infrastructure to manage but better .docx fidelity + real-time collaboration
- OnlyOffice available on [Azure Marketplace](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/vmlabinc1613642184700.onlyoffice-document-server)
- **Multi-region**: deploy separate instances per Azure region

### Path 3: SharePoint Embedded (Microsoft-native, popup editing)

```
SharePoint Embedded ──→ Document storage + Word Online editing (new tab)
Microsoft Graph API ──→ File management + URL generation
Azure App Service ──→ Your Configurator app
Entra ID ──→ Authentication + per-tenant isolation
```

- Most Microsoft-native approach, 100% Word fidelity
- **Editing opens in new tab** — NOT embedded
- Suitable if popup editing is acceptable

---

## Dynamic Injection + Word Online Hybrid Pattern

Instead of embedding Word Online, we flip the model: DAISY chatbot **pre-populates** a Word document, then gives the user a link to open it in Word for the Web.

### How it works

```
1. User asks DAISY: "Draft a compliance report for Council X"
2. DAISY generates content via AI
3. Server-side:
   a. Download .docx template from SharePoint Embedded (via Graph API)
   b. Inject content using OpenXML SDK / python-docx
   c. Upload modified .docx back to SharePoint Embedded
4. DAISY returns: "I've prepared your report. [Open in Word Online →]"
5. User clicks link → Word for the Web opens in new tab
6. User makes final edits in full Word Online
7. Document auto-saves to SharePoint Embedded
8. Webhook notifies Configurator that editing is complete
```

### What this CAN do

- Full Word Online editing experience (100% fidelity)
- DAISY injects content BEFORE the user opens the document
- Templates with placeholders, headers, footers, tables — all populated dynamically
- Real-time co-authoring, auto-save, versioning — all Microsoft-native

### What this CANNOT do

- DAISY **cannot edit the document while the user has it open** in Word Online
- The chatbot interaction is **sequential** (chatbot prepares → user edits), NOT **concurrent**
- User **leaves the Configurator** to edit (new tab)
- The `insertContent`, `replaceContent`, `formatText` tool calls would work server-side but NOT in the live editor

### Best hybrid architecture: Combine both

| Workflow | Solution |
|----------|----------|
| Quick edits, AI-assisted real-time editing, chatbot tool calls | **Embedded editor** (OnlyOffice / Syncfusion / Apryse / docx-js-editor) in Configurator |
| Full document generation from templates, final high-fidelity editing | **SharePoint Embedded** + Word Online (popup) |
| Read-only preview in Configurator | **SharePoint Embedded** iframe preview (read-only) or embedded editor in read mode |

---

## Top 3 Recommendations

### Option A: OnlyOffice Developer Edition — Best Word Fidelity, Self-Hosted

**Best for**: Maximum Word-like experience with real-time collaboration

- Closest to native Word in a browser — ribbon UI, OOXML native, **government staff will feel at home**
- [Full JS API](https://api.onlyoffice.com/) + [Document Builder](https://api.onlyoffice.com/docs/document-builder/get-started/overview/) for chatbot tool calls
- Self-hosted on Azure AKS — data stays in configured Azure region
- [Available on Azure Marketplace](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/vmlabinc1613642184700.onlyoffice-document-server)
- Real-time collaboration built-in (Google Docs-style)
- Built-in AI plugin supports Claude, ChatGPT, Gemini, Mistral, Ollama
- White-label / full rebranding included
- **Est. cost**: $10K–$23K/year
- **Risk**: No formal WCAG certification — may require accessibility remediation for government procurement
- **External integration**: Medium — consumers need Docker or shared server, not a simple `npm install`

### Option B: Syncfusion Document Editor — Fastest to Ship, Best External Integration

**Best for**: Fastest time-to-market with simplest external integration

- [Pure JavaScript component](https://www.syncfusion.com/docx-editor-sdk/javascript-docx-editor) — **no separate server to manage**
- Richest programmatic API with **grouped undo/redo** for AI edits
- Works as React/Lit component directly in Configurator — no iframe, it IS your UI
- Excellent theming (Material, Bootstrap, Tailwind, Fluent)
- Claimed WCAG 2.2 AA with axe-core testing
- `npm install @syncfusion/ej2-documenteditor` → render → done
- **Est. cost**: $7K–$20K/year (free community license for <$1M revenue)
- **Multi-region advantage**: Client-side = no per-region infrastructure
- **Risk**: No formal VPAT. Mobile editing not supported. Not ribbon-style (toolbar).

### Option C: Apryse WebViewer — Best Accessibility, Premium Client-Side

**Best for**: Government procurement where formal accessibility is mandatory

- [All processing in browser](https://apryse.com/capabilities/docx-editor) — no server round-trips, **no M365 licenses needed**
- **WCAG 2.2 AA certified** with published VPAT — strongest accessibility story
- Multi-format SDK (PDF + DOCX + XLSX + PPTX in one package)
- Framework-agnostic: React, Angular, Vue, Next.js, plain HTML
- **Avoids complex M365 authentication setup entirely**
- **Est. cost**: $32K–$104K/year (premium pricing)
- **Risk**: Most expensive. UI doesn't look like Word (SDK-style). Higher training overhead.

### Wildcard: docx-js-editor — Free, MIT, Zero Infrastructure

Worth evaluating in the POC alongside a top-3 pick:

- **MIT license** — completely free, no licensing concerns
- React + ProseMirror, TypeScript-native, zero server deps
- [441 GitHub stars](https://github.com/eigenpal/docx-js-editor), active development (v0.0.16, Feb 2026)
- Plugin architecture for extensibility (chatbot integration via plugins)
- Works with Vite, Next.js, Remix, Astro
- **Risk**: Newer project (v0.0.x), smaller community, .docx fidelity unproven for complex docs, no WCAG claims
- **Best for**: POC prototyping, external integration story, keeping costs at zero

---

## Honest Assessment: Can We Do This?

### Yes — but with trade-offs.

**What IS achievable with our constraints:**
- Embedding a high-fidelity .docx editor inside the Configurator ✅
- Running 100% on Azure ✅
- Chatbot programmatic editing via API ✅
- Multi-region data residency ✅
- Multi-tenant isolation ✅
- Modern, polished UI/UX ✅

**What is NOT possible:**
- Embedding Microsoft Word Online editing inline ❌ (CSP blocks this permanently)
- 100% Word fidelity without using Microsoft's own editor ❌ (best alternatives get to 90-95%)
- Zero-cost at scale ❌ (all viable solutions have licensing or infrastructure costs — except docx-js-editor)
- A single solution that is simultaneously: fully open-source, 100% Word fidelity, polished UI, AND WCAG certified ❌ (pick 3 of 4)

### The core trade-off

| If you prioritize... | Best option | You give up... |
|---|---|---|
| **Word fidelity (95%) + familiar UI** | OnlyOffice (self-hosted) | Simple npm-install integration (needs Docker) |
| **Easiest external integration + good fidelity (90%)** | Syncfusion (npm component) | Server-side collaboration, open-source |
| **100% Word fidelity** | Word Online redirect (new tab) | Embedded experience — user leaves Configurator |
| **Client-side + multi-format (PDF+DOCX)** | Apryse or Nutrient | Cost ($30K–$100K+/yr) |
| **Zero cost + MIT license** | docx-js-editor | Maturity, proven-at-scale, WCAG |
| **Lowest cost + acceptable fidelity** | Syncfusion Community + docx-js-editor | Scale limits, enterprise support |

### When it becomes impossible

The only scenario where this is impossible is if ALL of these are required simultaneously:
1. Must be Microsoft Word Online (native, not third-party) **AND**
2. Must be embedded inline (not new tab) **AND**
3. Must work without M365 licensing for every user

That combination is impossible today with no Microsoft roadmap to change it. All other constraint combinations have viable paths.

---

## POC Success Criteria

- Can open a .docx file in the embedded editor within the Configurator ecospace
- Can edit the document (text, formatting, tables) without leaving the platform
- Chatbot can programmatically insert/replace/format content via tool calls with < 500ms response
- Document can be saved back to .docx with < 5% formatting loss vs original
- Works on Chrome (Win + Mac), Safari (Mac), Edge (Win) — verified in testing
- Editor loads in < 3 seconds on standard government network (10 Mbps)
- Handles documents up to 50 pages without degraded performance
- Multi-user access with tenant isolation verified
- Data stays within the configured Azure region during editing operations
- **UI/UX TEST**: 3 non-technical government staff can complete basic editing tasks (open doc, edit text, format heading, insert table, save) within 5 minutes on first use with no training
- **ACCESSIBILITY TEST**: Screen reader (NVDA/VoiceOver) can navigate the editor, read content, and trigger basic formatting
- **EXTERNAL INTEGRATION TEST**: A developer unfamiliar with the Configurator can integrate the editor into a fresh React/Lit app within 4 hours using only provided docs — no Slack questions, no pairing sessions
- The integration surface is a single component/web component with < 5 required props/config keys
- A working "hello world" example exists that loads and edits a .docx in < 50 lines of code

---

## Research Sources

### Microsoft / Azure

- [SharePoint Embedded Overview](https://learn.microsoft.com/en-us/sharepoint/dev/embedded/overview)
- [SharePoint Embedded Billing Meters](https://learn.microsoft.com/en-us/sharepoint/dev/embedded/administration/billing/meters)
- [Microsoft Word Online CSP iframe restriction — confirmed](https://learn.microsoft.com/en-us/answers/questions/5669186/is-there-a-supported-way-to-embed-editable-sharepo)
- [WOPI Cloud Storage Partner Program](https://learn.microsoft.com/en-us/microsoft-365/cloud-storage-partner-program/online/)
- [SharePoint GitHub Issue #10526 — by design](https://github.com/sharepoint/sp-dev-docs/issues/10526)
- [M365 + Next.js + Azure Entra ID Integration Guide](https://medium.com/@sagar.bantu30/microsoft-365-integration-with-next-js-a-complete-guide-using-azure-entra-id-6908e76607b1)
- [Azure Data Residency](https://azure.microsoft.com/en-us/explore/global-infrastructure/data-residency)
- [Microsoft EU Data Boundary (Feb 2025)](https://blogs.microsoft.com/on-the-issues/2025/02/26/microsoft-completes-landmark-eu-data-boundary-offering-enhanced-data-residency-and-transparency/)

### Open-Source Projects

- [OnlyOffice DocumentServer — GitHub](https://github.com/ONLYOFFICE/DocumentServer) (~6,300 stars)
- [Collabora Online — GitHub](https://github.com/CollaboraOnline/online) (~3,000 stars)
- [docx-js-editor — GitHub](https://github.com/eigenpal/docx-js-editor) (~441 stars, MIT)
- [SuperDoc — GitHub](https://github.com/superdoc-dev/superdoc) (~334 stars)
- [LibreOffice Online De-atticized (March 2026)](https://www.theregister.com/2026/03/02/libreoffice_online_deatticized/)

### Commercial Solutions

- [OnlyOffice Developer Edition Pricing](https://www.onlyoffice.com/developer-edition-prices)
- [OnlyOffice Azure Marketplace](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/vmlabinc1613642184700.onlyoffice-document-server)
- [OnlyOffice Document Builder API](https://api.onlyoffice.com/docs/document-builder/get-started/overview/)
- [OnlyOffice Demo (no signup)](https://www.onlyoffice.com/see-it-in-action)
- [Collabora Online Subscriptions](https://www.collaboraonline.com/subscriptions/)
- [Collabora + German Government (openDesk)](https://www.collaboraonline.com/blog/opendesk-collabora-online-brings-digital-freedom-to-european-government/)
- [Syncfusion DOCX Editor SDK](https://www.syncfusion.com/docx-editor-sdk/javascript-docx-editor)
- [Syncfusion Community License](https://www.syncfusion.com/products/communitylicense)
- [Syncfusion Collaborative Editing](https://www.syncfusion.com/docx-editor-sdk/javascript-docx-editor/collaborative-editing)
- [Syncfusion Demo](https://ej2.syncfusion.com/demos/document-editor/default/)
- [Apryse DOCX Editor](https://apryse.com/capabilities/docx-editor)
- [Apryse Demo](https://showcase.apryse.com/)
- [Apryse + Dropbox Case Study](https://apryse.com/blog/customers/dropbox)
- [Nutrient Office Documents SDK](https://www.nutrient.io/sdk/javascript-docx-editor/)
- [Nutrient Office Document Viewer Guide](https://www.nutrient.io/guides/web/viewer/office-documents/)
- [TX Text Control Pricing](https://www.textcontrol.com/products/asp-dotnet/tx-text-control-dotnet-server/pricing/all/)
- [TX Text Control Azure Deployment](https://www.textcontrol.com/blog/2025/03/26/deploying-the-tx-text-control-document-editor-in-an-asp-net-core-web-app-to-azure-app-services/)
- [TX Text Control Demo](https://demos.textcontrol.com/)
- [CKEditor 5 Pricing](https://ckeditor.com/pricing/)
- [CKEditor 5 WCAG Compliance](https://ckeditor.com/ckeditor-5/capabilities/compliance-features/)
- [CKEditor 5 Demo](https://ckeditor.com/ckeditor-5/demo/)
- [Zoho Office Integrator](https://www.zoho.com/officeintegrator/)
- [LexisNexis + SharePoint Embedded](https://techcommunity.microsoft.com/blog/spblog/sharepoint-showcase-using-sharepoint-embedded-to-create-ai-ready-infrastructure/4496677)

---

## What happens next

1. Submit this issue → `poc-ai` label applied automatically
2. AI workflow runs (~30 seconds) → posts analysis as a comment
3. Review the 3-option comparison and recommendation
4. Copy the `/speckit.specify` prompt into Claude Code to start the POC
