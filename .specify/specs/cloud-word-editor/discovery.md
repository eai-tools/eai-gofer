---
feature: cloud-word-editor
created: '2026-03-03T20:30:00Z'
modified: '2026-03-03T21:30:00Z'
discoveredBy: Claude + Van
status: complete
---

# Business Discovery: Cloud Word Chatbot Editor

## CRITICAL DESIGN CONSTRAINT

> **The Cloud Word Editor MUST be built with a UNIVERSAL, USE-CASE-AGNOSTIC
> architecture** — but today's delivery focus is the **Australian NSW government
> council DA assessment workflow** from the Configurator submodule at `./Configurator/`.
>
> The architecture uses ZERO hardcoded business logic. All domain-specific
> behaviour (templates, prompts, data bindings) comes from the Configurator's
> three-tier configuration system:
> 1. **Block config** (presentationConfig, dataConfig, businessLogic)
> 2. **TenantData** (per-tenant templates, prompts, branding)
> 3. **TenantSchemas** (dynamic field extensions per tenant)
>
> This means: build it universal, ship it for councils.
> See `Configurator/documentation/Architecture.md` for the three-tier system.

## Problem Statement

**Pain Point**: Australian NSW government council staff need to edit Word
documents (.docx) within the Configurator ecospace during the DA assessment
process, with DAISY
chatbot able to programmatically edit content via tool calls. Currently the
TipTap-based editor handles rich text but does NOT support native .docx
round-tripping with full fidelity.

**Immediate Focus**: Australian NSW government council DA assessment —
assessors draft reports, referral letters, conditions of consent, and
determination letters across the 6 assessment substages in the Configurator
workflow. The Lodgement → Assessment → Determination pipeline, EPA compliance,
SEPPs, LEPs, and conditions of consent are all **NSW-specific planning
instruments** (Environmental Planning and Assessment Act 1979). Other
Australian states (e.g. Victoria) have different planning frameworks.

**Architecture Requirement**: While councils are the delivery target, the
editor block MUST be use-case agnostic so future tenants (retail, legal,
healthcare, etc.) can adopt it via configuration only — no code changes.

**Current State**:
- Existing TipTap DocumentEditor block with 37+ features and 12 AI tool calls
- .docx import via mammoth.js (~85-90% fidelity), export via `docx` npm (~90%)
- Microsoft Word Online CANNOT be embedded (CSP frame-ancestors restriction)
- DAISY chatbot already has working tool call bridge via CustomEvents
- Configurator supports 10,000+ tenants with `usecase` field (council, retail, legal, etc.)

**Impact**: Blocking other work. NSW council assessors spend significant time
switching between platforms to edit .docx documents. External teams (DAISY
repo, third-party businesses) cannot integrate Word editing without deep
Configurator knowledge.

## Target Users

### Primary Users (Australian NSW Government Council — Immediate Delivery)

1. **Council Assessor** (tenant-staff role)
   - Drafts DA assessment reports, conditions of consent, referral letters
   - Needs Word-like UI familiarity — uses MS Word daily
   - Works across ASSESSMENT stage substages (Clearance → Determination)

2. **Senior Planner** (tenant-admin role)
   - Reviews and signs off assessment reports
   - Needs tracked changes, comments, comparison features

3. **DAISY Chatbot** (AI agent)
   - Pre-fills document templates from BusinessRequest customData
   - Responds to assessor queries ("What SEPP controls apply?")
   - Uses 12 tool calls: edit_content, edit_table, edit_styles, etc.

4. **Applicant** (tenant-viewer via B2C)
   - Views determination letters and conditions of consent (read-only)

### Secondary Users (Universal Architecture — Future Use Cases)

5. **External Developer** (third-party)
   - Integrates editor into standalone apps via npm package / web component
   - Needs <4 hour setup, <5 config props, framework-agnostic
   - Package API is domain-agnostic (no council/DA concepts exposed)

6. **Workflow Builder** (tenant-builder role)
   - Configures which workflow pages include the editor block
   - Sets block config (mode, data bindings, AI settings) per substage
   - No code deployment needed — pure configuration via admin UI

7. **Future Tenant Users** (any usecase — retail, legal, healthcare, etc.)
   - The universal architecture means any tenant-staff or tenant-admin can
     use the editor once their tenant admin configures templates and prompts
     via TenantData — no code changes needed

## Value Proposition

**Primary Value**: Eliminate context-switching for NSW council assessors editing
.docx documents during DA assessment, while enabling DAISY chatbot to
programmatically draft assessment reports with <5% formatting loss.

**Secondary Value**: Provide drop-in editor package for external consumers
(DAISY repo, third-party businesses) with <1 day integration effort.

**Architecture Value**: Built universal so future tenants (retail, legal,
healthcare) can adopt the editor via TenantData configuration only — no code
changes, no new block variants.

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| .docx fidelity | <5% formatting loss on round-trip | Automated comparison test |
| Editor load time | <3 seconds on 10 Mbps | Performance test |
| Chatbot tool call latency | <500ms per operation | Instrumented timing |
| External integration time | <4 hours | Developer test (no Slack help) |
| Large document handling | 50+ pages without degradation | Performance test |
| Cross-browser support | Chrome, Safari, Edge (Win + Mac) | Manual verification |
| Accessibility | WCAG 2.1 AA compliance | Screen reader test (NVDA/VoiceOver) |
| Multi-tenant isolation | 10,000+ tenants isolated | Tenant isolation test |
| User usability | Standard editing task in <5 min first use | User test |
| Use-case agnosticism | Non-council tenant configures in <1 hour, zero code | Config-only test |

## Technical Context

**Recommended Solution**: ONLYOFFICE Document Server (self-hosted on Azure AKS)
**Basis**: Two independent AI architecture analyses both recommend ONLYOFFICE
**Reference**: `deep-research-reference.md` (12 options evaluated)

**Architecture Alignment** (with Configurator three-tier system):
- Editor block follows `presentationConfig` / `dataConfig` / `businessLogic` pattern
- Templates stored in TenantData `document-configuration` dataType (per tenant)
- Chatbot prompts stored in ChatBot collection (per tenant)
- Dynamic fields extensible via TenantSchemas (block target: `onlyoffice-editor`)
- Block registered without `usecase` filter — available to ALL tenant types

**Key Integration Points**:
- AI Chatbot (any ChatBot block instance) via CustomEvent protocol
- Configurator Ecospace (iframe embedding in any workflow page)
- Azure Blob Storage (document storage backend)
- Payload CMS Documents collection (metadata, versioning)
- Entra ID (B2B admin + B2C per-tenant auth)
- Existing TipTap DocumentEditor block (coexistence, not replacement)

**Constraints**:
- NO Microsoft Word add-ins — standalone web-based only
- NO desktop app dependency — browser-only
- Azure-first: deploy on AKS/App Service/CDN
- Multi-region data governance (per-region Document Server instances)
- WCAG 2.1 AA accessibility (government requirement, good practice for all)
- ZERO hardcoded business logic in the block code

## Competitive Analysis

**Status**: Researched (see deep-research-reference.md)
- 12 options evaluated: ONLYOFFICE, CKEditor 5, Aspose.Words, PrizmDoc, Syncfusion, Apryse, Collabora, TX Text Control, Zoho Writer, Google Docs, SuperOffice, Hancom
- ONLYOFFICE selected: best balance of .docx fidelity, cost, external integration, Azure deployment

## Discovery Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Delivery Focus | Australian NSW government council DA assessment | Immediate need — assessors blocked today |
| Architecture | Universal block (use-case agnostic) | Configurator serves 10,000+ tenants; can't hardcode council logic |
| User Target | NSW council assessors + DAISY chatbot (now); any tenant (future) | Build universal, ship for councils |
| Value Metric | .docx fidelity + tool call latency | Core technical differentiators |
| Editor Solution | ONLYOFFICE Document Server | Best fidelity/cost/integration balance |
| Deployment | Azure AKS (self-hosted) | Data residency + Azure-first constraint |
| Integration Pattern | npm package + web component (domain-agnostic API) | External consumers need drop-in integration |
| Config System | Three-tier (block config + TenantData + TenantSchemas) | Matches Configurator architecture — no hardcoded domain logic |
