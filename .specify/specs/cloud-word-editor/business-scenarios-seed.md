# Business Scenarios Seed — Cloud Word Chatbot Editor

> **GOFER INSTRUCTIONS:**
>
> 1. **Deep-research the Configurator submodule** at `./Configurator/` before
>    generating scenarios. Understand the FULL assessment workflow, all
>    collections, entities, API routes, blocks, and the existing DocumentEditor.
>    Also read `Configurator/documentation/Architecture.md` for the three-tier
>    configuration system (Collections + TenantData + TenantSchemas).
>
> 2. Use these 3 example business scenarios as patterns to **generate 50 more**.
>
> 3. **ARCHITECTURE: The editor block MUST be built with a universal,
>    use-case-agnostic architecture** (zero hardcoded business logic, all
>    domain behaviour from three-tier config). **However, today's delivery
>    focus is the Australian NSW government council DA assessment workflow** from the Configurator.
>    Most scenarios should cover the council use case in depth. Include
>    ~5-8 non-council scenarios to validate the universal architecture works.
>
> 4. Cover ALL of the following dimensions:
>    - **Actors**: Council Assessor, Senior Planner, Tenant Admin, Builder,
>      Applicant (external via B2C), DAISY chatbot, External Developer,
>      Referral Officer
>    - **Primary use case (council)**: DA assessment reports, conditions of
>      consent, referral letters, SEPP compliance reports, modification
>      reports, determination letters, invoice documents, clearance checklists
>    - **Architecture validation (non-council)**: ~5-8 scenarios showing
>      the same block works for retail, legal, or healthcare via config only
>    - **Workflow stages**: Lodgement (4 substages), Assessment (6 substages:
>      Clearance, Referrals, Assessments, Conditions, Reviews, Determination)
>    - **Configuration scenarios**: Tenant admin configures templates via
>      TenantData, builder adds editor block to workflow page, TenantSchemas
>      extend the block with custom fields, child tenant inherits from parent
>    - **Edge cases**: Concurrent editing, offline/degraded network, large
>      documents (50+ pages), multi-tenant isolation failures, token expiry
>      mid-edit, chatbot tool call failures, .docx fidelity loss
>    - **External integration**: npm package (domain-agnostic API), web
>      component embed, Docker deployment, chatbot API bridging, multi-framework
>    - **Multi-tenant**: Cross-tenant isolation, tenant-specific templates,
>      tenant-specific chatbot prompts, hierarchical tenant inheritance

---

## Configurator Context (from submodule deep-dive)

> Gofer: This section summarises what EXISTS in the Configurator today.
> Research the submodule at `./Configurator/` to verify and expand on this.
> Also read `./Configurator/documentation/Architecture.md` for the full
> three-tier configuration architecture.

### Three-Tier Configuration System (Architecture.md)

The Configurator supports 10,000+ tenants through:

1. **Collections** (20 total) — Universal data storage with `customData` JSON
2. **TenantData** (17 dataTypes) — Granular per-tenant configuration
3. **TenantSchemas** — Dynamic field extensions for collections AND blocks

Every tenant has a `usecase` field (council, retail, legal, etc.) that
determines available features. The `onlyoffice-editor` block MUST be
registered WITHOUT usecase filtering — available to ALL tenant types.

### NSW DA Assessment Workflow (6 substages under ASSESSMENT stage)

> **NOTE**: This workflow is specific to the **NSW (New South Wales) planning
> framework** — governed by the Environmental Planning and Assessment Act 1979.
> The Lodgement → Assessment → Determination pipeline, EPA compliance, SEPPs,
> LEPs, and conditions of consent are all NSW-specific instruments. Other
> Australian states (e.g. Victoria) have different planning frameworks and
> different workflow stages. The universal editor architecture means a Victorian
> council would configure their OWN workflow stages and templates via TenantData.

```
LODGEMENT (Stage 1, Order 1)
├── Application Information (0 days target)
├── Document Checklist (2 days)
├── Clearance Summary (2 days)
└── Invoice (3 days)

ASSESSMENT (Stage 2, Order 2)
├── Clearance (5 days)
├── Notifications & Referrals (30 days)
├── Assessments (50 days)           ← CORE: Where assessor writes reports
├── Conditions (5 days)             ← CONDITIONS OF CONSENT
├── Reviews (10 days)               ← PEER REVIEW + SIGN-OFF
└── Determination (10 days)         ← FINAL DECISION
```

Note: Other use cases (retail, legal, etc.) and other Australian states have
their OWN workflow stages configured via `pageDefinitionUtils.ts`. The editor
block works in ANY stage — it is workflow-agnostic.

### Key Domain Entities (stored in BusinessRequest.customData)

- **Assessment Entity** (`src/domain/entities/assessment.entity.ts`):
  `assessingOfficer`, `proposalDescription`, `siteDetails`, `siteHistory`,
  `epaCompliance`, `epaRelevantSections`, `epaMatters[]` (EPAMatter with
  sectionReference + compliant yes/no), `applicableSEPPs`, `seppCompliance`,
  `sepps[]` (SEPP with seppName + compliant yes/no/na), `requiredReferrals`,
  `referralStatus`, `submissionCount`, `submissionsSummary`, `recommendation`,
  `recommendationJustification`, `appliedConditions[]` (code, title, content,
  reason, evidenceType, categoryName), `documentUrl`

- **Referral Entity** (`src/domain/entities/referral.entity.ts`):
  `type` (Internal/External), `group` (Heritage, Traffic, Water, etc.),
  `assignee`, `status` (Draft/Sent/Submitted/In Progress/Completed/Cancelled),
  `dueDate`, `decision` (approved/rejected), `reviewComments`, `documents[]`

- **Review Entity** (`src/domain/entities/review.entity.ts`):
  `reviewType` (peer-review/sign-off), `reviewer`, `status`
  (pending/in-progress/completed), `recommendation` (approve/approve-with-conditions),
  `decision` (approve/refuse for sign-offs), `conditionsOrReasons`,
  `determinationNotes`

- **Determination Entity** (`src/domain/entities/determination.entity.ts`):
  `officer`, `decision` (approved/refused/deferred/withdrawn), `conditions`,
  `reasons`, `delegatedAuthority`, `notificationSent`, `appealPeriodEnds`,
  `documents[]`

Note: These entities are council-specific. Other use cases store their OWN
domain data in `customData` using different keys. The editor block reads
from whatever `dataConfig.loadFromPath` is configured — it doesn't know
about EPA, SEPP, or any council concept.

### Assessment API Routes

- `POST/PATCH /api/custom-business-requests/[id]/assessment` — Create/update
- `GET/POST/PATCH/DELETE /api/custom-business-requests/[id]/referrals` — CRUD
- `POST /api/custom-business-requests/[id]/referrals/[id]/review` — Submit decision
- `GET/POST/PATCH/DELETE /api/custom-business-requests/[id]/reviews` — CRUD
- `POST /api/custom-business-requests/[id]/reviews/[id]/complete` — Complete review
- `POST /api/custom-business-requests/[id]/determination-letter` — Generate letter
- `POST /api/custom-business-requests/[id]/determination-notification` — Send notification
- `PATCH /api/custom-business-requests/[id]/workflow-progress` — Advance stages

### Existing DocumentEditor (TipTap-based, 12 AI tool calls)

Located at `Configurator/src/blocks/DocumentEditor/`. Key tools:
- `get_document_content` — Read HTML/text/structure/nodeMap
- `edit_content` — searchReplace, insert, delete, replaceAt, html, mergeDocument, importDocx
- `edit_table` — 13 table operations (insertTable, addRow, updateCell, styleCell, mergeCells, etc.)
- `edit_layout` — margins, columns, orientation
- `edit_styles` — 16 named styles + 14 font props + 5 paragraph props
- `edit_list` — bullet/ordered/task list conversion + indent/outdent
- `edit_toc` — Table of Contents management
- `edit_links` — hyperlink CRUD + searchAndLink
- `edit_visual_elements` — images, horizontal rules, captions
- `edit_fields` — date/time fields, page breaks
- `navigate_document` — scroll to node/heading/text
- `export_document` — PDF/DOCX export + word count + outline

These tools are DOMAIN-AGNOSTIC. They edit content, tables, styles — not
"council content" or "retail content". The chatbot prompt (from TenantData)
determines what data to insert.

Communication pattern: `CustomEvent` bridge between ChatBot and DocumentEditor.
AI edits tracked via snapshot-based accept/reject (AIEditReviewBar).
Auto-fill: template mode (strict placeholder fill) and document mode (flexible scan+update+append).

### Multi-Tenant Architecture

- PayloadCMS multi-tenant plugin auto-injects `tenant` field on all collections
- Dual Entra auth: B2B (admin panel) + B2C (per-tenant customer login)
- 4 base roles: tenant-admin, tenant-builder, tenant-staff, tenant-viewer
- OPA-based access control with legacy fallback
- 17 TenantData dataTypes for per-tenant config (document-configuration,
  checklist-rules, development-types, etc.)
- Hierarchical tenant relationships (parent → child with ultimateParent)
- `usecase` field on tenants (council, retail, legal, etc.) determines features

### Documents Collection

- Stored with Azure Blob Storage URLs in `fileInfo.dataLakeUrl`
- Blocks: AssessmentBlock (AI classification + human review + validation + RFI),
  ExtractionBlock, ComplianceBlock, ClassificationBlock
- Linked to BusinessRequests via `context.businessRequest`
- Security levels: public, internal, confidential, restricted

---

## Example Scenario 1: NSW Council Assessor Drafts DA Assessment Report with AI Assistance

**Actor:** NSW Council Assessor (planning officer, `tenant-staff` role with assessment permissions)
**Use Case:** Australian NSW Government Council (usecase: "council")
**Trigger:** A Development Application (DA) has been lodged, triaged, and the
BusinessRequest is at ASSESSMENT stage → Assessments substage (Stage 2, Substage 3).
**Preconditions:**
- DA record exists in `business-requests` collection with `workflow_stage` = "Assessment"
- `customData.workflowProgress.currentSubstageId` = "assessments"
- Relevant uploaded documents (plans, SEE) are in `documents` collection linked via `context.businessRequest`
- Assessment report template (.docx) exists in tenant's `document-configuration` TenantData
- `customData.assessment` may be partially populated from earlier substages

**Steps:**
1. Assessor opens the DA in the Configurator ecospace at `/{tenant-slug}/staff/business-requests/{id}`
2. Assessor navigates to the Assessments substage which shows the `onlyoffice-editor` block
3. Editor block loads configured with:
   - `dataConfig.loadFromPath` = `customData.assessment.documentUrl`
   - `businessLogic.aiToolsEnabled` = true
   - `businessLogic.autoFillOnLoad` = true
   - `businessLogic.autoFillPrompt` = tenant-specific template prompt from ChatBot collection
4. Editor loads the assessment report template (.docx) from Azure Blob Storage
5. Template contains sections: Site Description, Proposal Summary, Planning Controls (EPA + SEPP), Assessment, Conditions, Recommendation
6. Auto-fill triggers immediately: chatbot pre-reads document structure via `get_document_content` with `includeStructure: true`, gets nodeMap
7. Chatbot uses `edit_content` (type: `searchReplace`) to populate Site Description from `customData.assessment.siteDetails`
8. Chatbot uses `edit_table` (type: `updateCell`) to fill the EPA compliance table from `customData.assessment.epaMatters[]`
9. Chatbot uses `edit_content` (type: `insert`) to populate SEPP analysis from `customData.assessment.sepps[]`
10. AI Edit Review shows tracked changes — assessor reviews, accepts most, rejects 2
11. Assessor manually writes the Assessment section
12. Assessor asks chatbot: "Draft standard conditions of consent for a single dwelling addition"
13. Chatbot uses `edit_content` to insert conditions from `customData.assessment.appliedConditions[]`
14. Assessor modifies conditions, adds site-specific conditions
15. Assessor saves — document uploaded to Azure Blob, `customData.assessment.documentUrl` updated

**Expected Outcome:**
- Complete assessment report with <5% formatting loss on .docx round-trip
- All AI edits tracked and reviewable
- Document versioned in `documents` collection

**Acceptance Criteria:**
- Editor loads template in <3 seconds on 10 Mbps network
- Chatbot tool calls complete in <500ms each
- Exported .docx preserves tables, headings, numbered conditions, images

---

## Example Scenario 2: External Developer Integrates Editor into Standalone App

**Actor:** External developer (from any team or third-party business)
**Use Case:** Any (domain-agnostic npm package)
**Trigger:** External team wants to add Word editing + chatbot capability to their own app
**Preconditions:**
- Developer has npm/Node.js environment
- Developer has access to the published editor package
- Developer has an auth token (Entra B2C bearer token) for document storage API

**Steps:**
1. Developer runs `npm install @eai/cloud-word-editor`
2. Developer creates a minimal React component:
   ```jsx
   <CloudWordEditor
     documentUrl="https://storage.blob.core.windows.net/docs/report.docx"
     authToken={token}
     onSave={(blob) => uploadToStorage(blob)}
   />
   ```
3. Editor renders with full Word-like toolbar, loads .docx
4. Developer configures chatbot integration using the same 12-tool API:
   ```jsx
   <CloudWordEditor
     documentUrl={url}
     authToken={token}
     chatbotApi={{
       endpoint: "/api/my-chatbot",
       tools: ["edit_content", "edit_table", "edit_styles", "get_document_content"]
     }}
   />
   ```
5. Developer tests: opens a 30-page .docx with tables, images, headers/footers
6. Developer triggers a tool call programmatically:
   ```js
   editor.executeToolCall("edit_content", {
     edits: [{ type: "insert", afterNodeIndex: 5, text: "Inserted by AI" }]
   })
   ```
7. Content appears with AI change highlighting
8. Developer exports to .docx — formatting matches within 5% tolerance

**Expected Outcome:**
- Working editor in <50 lines of code
- Full 12-tool API works identically to Configurator-embedded version
- Framework-agnostic: works for React, Vue, Angular, plain HTML
- NO domain-specific concepts in the package API

**Acceptance Criteria:**
- Developer completes integration in <4 hours with only docs (no Slack help)
- <5 required config props
- Package size <5MB gzipped
- AI edit accept/reject flow works out of the box

---

## Example Scenario 3: Retail Store Manager Drafts Inventory Report with AI Assistance

**Actor:** Store Manager (tenant-staff role, retail usecase)
**Use Case:** Retail (usecase: "retail")
**Trigger:** Monthly stocktake complete, manager needs to generate inventory
reconciliation report. BusinessRequest is at REPORTING stage → Report Generation
substage.
**Preconditions:**
- Retail tenant configured in Configurator with `usecase` = "retail"
- BusinessRequest exists for monthly stocktake with `customData.inventory` populated:
  `{ categories: [...], discrepancies: [...], writeOffs: [...], totalValue: ... }`
- Inventory report template (.docx) uploaded in tenant's `document-configuration` TenantData
- Chatbot auto-fill prompt configured: "Read the inventory template, fill category
  summaries from customData.inventory.categories, populate discrepancy table from
  customData.inventory.discrepancies, calculate totals"
- `onlyoffice-editor` block added to Report Generation workflow page by tenant builder

**Steps:**
1. Store manager opens the stocktake BusinessRequest in Configurator
2. Navigates to Report Generation substage — `onlyoffice-editor` block loads
3. Editor block loads configured with:
   - `dataConfig.loadFromPath` = `customData.inventory.reportUrl`
   - `businessLogic.aiToolsEnabled` = true
   - `businessLogic.autoFillOnLoad` = true
   - `businessLogic.autoFillPrompt` = retail-specific prompt from ChatBot collection
4. Editor loads the inventory report template (.docx) from Azure Blob Storage
5. Template contains sections: Executive Summary, Category Breakdown, Discrepancies, Write-Offs, Recommendations
6. Auto-fill triggers: chatbot reads document structure via `get_document_content`
7. Chatbot uses `edit_table` to fill category breakdown table from `customData.inventory.categories[]`
8. Chatbot uses `edit_table` to fill discrepancy table from `customData.inventory.discrepancies[]`
9. Chatbot uses `edit_content` to draft executive summary from aggregated data
10. AI Edit Review shows tracked changes — manager reviews, adjusts write-off commentary
11. Manager asks chatbot: "Add a recommendation for the Fresh category based on the shrinkage rate"
12. Chatbot inserts recommendation paragraph
13. Manager saves — document uploaded to Azure Blob, `customData.inventory.reportUrl` updated

**Expected Outcome:**
- Complete inventory report with <5% formatting loss
- All AI edits tracked and reviewable
- SAME editor block code as the council scenario — only TenantData config differs
- Zero code changes were needed to support this retail use case

**Acceptance Criteria:**
- Editor loads for a `usecase: "retail"` tenant without errors
- Chatbot auto-fill uses the retail-specific prompt (not a council prompt)
- The 12 tool calls work identically to the council scenario
- Template loaded from this tenant's TenantData (not shared with council tenants)

**Why This Scenario Matters:**
This proves the editor is use-case agnostic. The SAME block code handles council
DA assessments AND retail inventory reports. The difference is ONLY in:
- TenantData: different .docx template
- ChatBot collection: different auto-fill prompt
- customData: different data paths (`.assessment.*` vs `.inventory.*`)
- Workflow page: different stage/substage

---

## Scenario Generation Instructions for Gofer

> Generate 50 additional business scenarios covering these categories.
> For EACH scenario, use the same format as above (Actor, Trigger,
> Preconditions, Steps, Expected Outcome, Acceptance Criteria).
>
> **FOCUS: ~40-42 scenarios for the Australian NSW government council DA assessment workflow (deep
> coverage of all substages, document types, and edge cases). ~5-8
> scenarios validating the universal architecture works for non-council
> use cases (retail, legal, healthcare) via configuration only.**

### Categories to cover (aim for ~5 scenarios per category):

1. **Lodgement stage** (4 substages): Application info entry, document
   checklist validation, clearance summary generation, invoice generation —
   all involving the Word editor for document templates and DAISY pre-fill

2. **Assessment substages**: Clearance reports, referral letter generation
   (internal + external), assessment report drafting (EPA compliance tables,
   SEPP analysis, site history), conditions of consent drafting, peer review
   workflow (reviewer opens report, adds comments), sign-off review (senior
   planner approves/refuses), determination letter generation + notification

3. **Multi-tenant variations**: Different council templates, tenant-specific
   SEPP/LEP controls, tenant-specific conditions libraries, hierarchical
   tenant inheritance of document templates, B2C applicant viewing
   determination letters

4. **DAISY chatbot interactions**: Auto-fill on template load, mid-edit
   queries ("What controls apply?"), batch operations ("Fill all EPA rows"),
   error recovery (tool call fails, retry), context-aware suggestions based
   on BR customData, background pre-fill via `useAutoFillService`

5. **Edge cases and errors**: .docx fidelity loss on complex documents,
   concurrent editing conflicts, token expiry mid-edit, large document
   performance (50+ pages), offline/degraded network, DAISY hallucination
   in conditions (assessor rejects via Track Changes), template not found,
   document locked by another user

6. **External integration**: npm package install + render, web component
   embed, Docker deployment of ONLYOFFICE Document Server, chatbot API
   bridging, multi-framework support (React/Vue/Angular/Lit/plain HTML),
   auth token management for external consumers

7. **Document lifecycle**: Version history, document comparison (before/after
   DAISY edits), PDF export for public notification, .docx archival,
   document security levels (confidential assessment reports), RFI document
   generation

8. **Admin and builder scenarios**: Tenant admin configures document templates
   via TenantData, builder creates workflow with editor block, admin manages
   chatbot prompts in ChatBot collection, admin reviews audit trail of AI edits

9. **Referral-specific**: Generate referral letters to Heritage/Traffic/Water
   departments, track referral responses in documents, merge referral
   feedback into assessment report, handle overdue referrals

10. **Universal architecture validation** (~5-8 scenarios): A retail tenant
    configures the SAME editor block for inventory reports, a legal tenant
    uses it for contract drafts, a new usecase tenant onboards with zero
    code changes — proving the three-tier config architecture works.
    These scenarios should show that ONLY TenantData and chatbot prompts
    differ, NOT the block code.
