---
feature: cloud-word-editor
generated: '2026-03-04T00:00:00Z'
generatedBy: Claude
scenarioCount: 52
categories: 10
status: complete
---

# Business Scenarios — Cloud Word Chatbot Editor

> **52 scenarios** (3 seed + 49 generated) across 10 categories.
> Architecture: Universal, use-case-agnostic block. Delivery focus: Australian
> NSW government council DA assessment workflow.

---

## Category 1: Lodgement Stage (5 scenarios)

### BS-04: Assessor Generates Document Checklist Report

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council (usecase: "council")
**Trigger:** DA lodged, BusinessRequest at LODGEMENT → Document Checklist substage.
**Preconditions:**
- BR exists with `customData.workflowProgress.currentSubstageId` = "document-checklist"
- Uploaded documents listed in `documents` collection linked to BR
- Document checklist template (.docx) in tenant's TenantData `document-configuration`
- Chatbot auto-fill prompt configured for checklist generation

**Steps:**
1. Assessor opens BR at Lodgement → Document Checklist substage
2. `onlyoffice-editor` block loads checklist template from Azure Blob
3. Auto-fill triggers: DAISY reads uploaded document list via `get_document_content`
4. DAISY uses `edit_table` to populate checklist table (Document Name, Status, Notes)
5. DAISY marks each document as "Received" / "Missing" / "Incomplete" from classification data
6. Assessor reviews, adds notes for incomplete documents
7. Assessor saves — checklist uploaded to Blob, URL stored in `customData.lodgement.checklistUrl`

**Expected Outcome:** Complete checklist with all uploaded documents cross-referenced.
**Acceptance Criteria:**
- Checklist table auto-populated with correct document statuses
- Missing documents highlighted in table with red background via `edit_table` (styleCell)
- Save completes in <2 seconds

---

### BS-05: Invoice Document Generation at Lodgement

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** DA lodged, fees calculated, BR at LODGEMENT → Invoice substage.
**Preconditions:**
- Fee schedule in TenantData `setup-configuration`
- Invoice template (.docx) in TenantData `document-configuration`
- `customData.lodgement.fees` populated with calculated fees

**Steps:**
1. Assessor opens Invoice substage — `onlyoffice-editor` loads invoice template
2. Auto-fill: DAISY populates applicant details from `customData.applicant`
3. DAISY uses `edit_table` to fill fee breakdown table from `customData.lodgement.fees[]`
4. DAISY calculates totals, inserts into summary section via `edit_content`
5. Assessor verifies amounts, adds any manual adjustments
6. Assessor exports as PDF for applicant notification
7. PDF uploaded to Documents collection with `securityLevel: 'public'`

**Expected Outcome:** Professional invoice matching council branding, auto-calculated fees.
**Acceptance Criteria:**
- Fee table totals match calculated values exactly
- PDF export preserves table formatting and council logo
- Exported PDF linked to BR in Documents collection

---

### BS-06: Clearance Summary Report Generation

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** All lodgement checks complete, BR at LODGEMENT → Clearance Summary.
**Preconditions:**
- All lodgement substages marked complete in `customData.workflowProgress`
- Clearance summary template (.docx) in TenantData

**Steps:**
1. Assessor opens Clearance Summary substage
2. `onlyoffice-editor` loads clearance template
3. Auto-fill: DAISY reads all lodgement data and populates summary sections
4. DAISY inserts pass/fail status for each clearance item via `edit_content`
5. DAISY uses `edit_styles` to format pass items green, fail items red
6. Assessor reviews, adds notes for any items requiring follow-up
7. Save triggers workflow advancement check

**Expected Outcome:** Complete clearance summary ready for assessment stage transition.
**Acceptance Criteria:**
- All lodgement clearance items reflected in summary
- Colour-coded pass/fail status applied correctly
- Document saves within 2 seconds

---

### BS-07: Application Information Summary at Lodgement

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** DA received from NSW ePlanning Portal, BR created at LODGEMENT → Application Information.
**Preconditions:**
- BR created from ePlanning Portal data (`customData.PlanningPortalApplicationData`)
- Application summary template in TenantData

**Steps:**
1. Assessor opens Application Information substage
2. `onlyoffice-editor` loads application summary template
3. Auto-fill: DAISY reads `customData.PlanningPortalApplicationData` and populates:
   - Applicant name, address, contact details
   - Property details (lot/DP, zoning, land area)
   - Development description and estimated cost
4. DAISY uses `edit_table` to populate property details table
5. Assessor verifies data matches portal submission
6. Assessor flags any discrepancies for RFI

**Expected Outcome:** Application summary with all portal data auto-populated.
**Acceptance Criteria:**
- All ePlanning Portal fields mapped to template sections
- No manual data re-entry required for standard fields
- Template loads in <3 seconds

---

### BS-08: RFI (Request for Information) Letter Generation

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** Missing or incomplete documents identified during lodgement review.
**Preconditions:**
- Document checklist shows "Missing" or "Incomplete" items
- RFI letter template in TenantData `document-configuration`

**Steps:**
1. Assessor triggers RFI generation from Document Checklist page
2. `onlyoffice-editor` loads RFI letter template
3. Auto-fill: DAISY reads missing document list, populates RFI items
4. DAISY uses `edit_list` to create numbered list of required documents
5. DAISY inserts deadline date (14 days from current) via `edit_fields`
6. Assessor adds specific instructions for each missing item
7. Assessor exports as PDF, sends to applicant via notification API
8. RFI status tracked in `customData.lodgement.rfiSent`

**Expected Outcome:** Professional RFI letter with specific missing document list.
**Acceptance Criteria:**
- All missing documents from checklist included in RFI
- Deadline date calculated correctly
- Letter exports as PDF with council letterhead

---

## Category 2: Assessment Substages (8 scenarios)

### BS-09: Assessment Clearance Report

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** BR at ASSESSMENT → Clearance substage.
**Preconditions:**
- Lodgement stage complete
- Clearance report template in TenantData
- `customData.assessment` partially populated from lodgement data

**Steps:**
1. Assessor opens Assessment Clearance substage
2. `onlyoffice-editor` loads clearance report template
3. Auto-fill: DAISY cross-reads from `customData.workflowProgress.stageData['lodgement']`
4. DAISY populates site details, development type, and initial assessment notes
5. Assessor adds clearance-specific observations
6. Assessor marks clearance as complete, workflow advances

**Expected Outcome:** Clearance report documenting pre-assessment review.
**Acceptance Criteria:**
- Cross-stage data read works (lodgement → assessment)
- Clearance report saves to `customData.assessment.clearanceDocumentUrl`

---

### BS-10: Internal Referral Letter to Heritage Department

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** Heritage-listed property identified, BR at ASSESSMENT → Referrals substage.
**Preconditions:**
- `customData.assessment.requiredReferrals` includes "Heritage"
- Referral letter template (Heritage) in TenantData
- Referral entity created in `customData.referrals[]` with `type: 'Internal'`, `group: 'Heritage'`

**Steps:**
1. Assessor opens Referrals substage, clicks "Generate Referral Letter" for Heritage
2. `onlyoffice-editor` loads Heritage referral template
3. Auto-fill: DAISY populates property details from `customData.assessment.siteDetails`
4. DAISY inserts heritage listing details and relevant LEP clause references
5. DAISY uses `edit_content` to draft specific questions for Heritage team
6. Assessor reviews, adjusts questions based on site knowledge
7. Assessor saves — letter linked to referral entity via `referral.documents[]`
8. Letter sent to Heritage department (internal workflow)

**Expected Outcome:** Formal referral letter with property context and specific heritage questions.
**Acceptance Criteria:**
- Letter references correct LEP heritage clauses
- Referral entity updated with document link
- Letter exported as .docx for internal distribution

---

### BS-11: External Referral Letter to Rural Fire Service

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** Property in bushfire-prone land, BR at ASSESSMENT → Referrals substage.
**Preconditions:**
- `customData.assessment.requiredReferrals` includes "RFS"
- External referral template in TenantData
- Referral entity created with `type: 'External'`, `group: 'RFS'`

**Steps:**
1. Assessor opens Referrals substage, generates external referral for RFS
2. `onlyoffice-editor` loads RFS referral template (different from internal template)
3. Auto-fill: DAISY populates bushfire assessment level from `customData.assessment`
4. DAISY uses `edit_table` to fill bushfire compliance table (APZ setbacks, BAL rating)
5. DAISY inserts relevant PBP (Planning for Bush Fire Protection) clause references
6. Assessor adds site-specific observations about vegetation and access
7. Referral letter exported as PDF for email to NSW RFS
8. Referral status set to "Sent", dueDate set to 30 days

**Expected Outcome:** External referral with complete bushfire context for RFS review.
**Acceptance Criteria:**
- BAL rating table correctly populated
- PBP clause references accurate
- PDF export includes all tables and formatting

---

### BS-12: EPA Compliance Table Auto-Fill in Assessment Report

**Actor:** DAISY Chatbot (AI agent)
**Use Case:** Australian NSW Government Council
**Trigger:** Assessor opens Assessments substage, auto-fill enabled.
**Preconditions:**
- Assessment report template loaded in ONLYOFFICE
- `customData.assessment.epaMatters[]` populated with EPA sections
- Auto-fill prompt configured in ChatBot collection

**Steps:**
1. Auto-fill service triggers on document load
2. DAISY calls `get_document_content` with `includeStructure: true`
3. DAISY identifies EPA compliance table in the nodeMap
4. DAISY iterates `customData.assessment.epaMatters[]` and calls `edit_table` (updateCell) for each row:
   - Column 1: Section reference (e.g., "4.15 — Stormwater Management")
   - Column 2: Compliant (Yes/No)
   - Column 3: Comments
5. DAISY uses `edit_styles` to colour-code: green for compliant, red for non-compliant
6. AIEditReviewBar shows "DAISY made 15 edits to EPA table"
7. Assessor reviews each cell, accepts/rejects individually

**Expected Outcome:** EPA compliance table fully populated from structured data.
**Acceptance Criteria:**
- All EPA matters from `epaMatters[]` reflected in table
- Colour coding applied correctly (green/red)
- Each cell edit individually reviewable via AIEditReviewBar
- Tool calls complete in <500ms each

---

### BS-13: SEPP Analysis Section Auto-Fill

**Actor:** DAISY Chatbot (AI agent)
**Use Case:** Australian NSW Government Council
**Trigger:** Auto-fill of SEPP section in assessment report.
**Preconditions:**
- Assessment report template with SEPP analysis section
- `customData.assessment.sepps[]` populated with applicable SEPPs

**Steps:**
1. DAISY identifies SEPP analysis section via `get_document_content` nodeMap
2. For each SEPP in `customData.assessment.sepps[]`:
   - DAISY uses `edit_content` (insert) to add SEPP heading
   - DAISY uses `edit_content` to add compliance analysis paragraph
   - If `compliant: 'na'`, DAISY notes "Not applicable to this development type"
3. DAISY uses `edit_table` to create summary table (SEPP Name, Applicable, Compliant)
4. AIEditReviewBar shows tracked changes for assessor review

**Expected Outcome:** SEPP analysis section with per-SEPP compliance narratives.
**Acceptance Criteria:**
- Each SEPP from `sepps[]` has its own subsection
- N/A SEPPs clearly marked
- Summary table matches individual analyses

---

### BS-14: Conditions of Consent Drafting

**Actor:** Council Assessor + DAISY Chatbot
**Use Case:** Australian NSW Government Council
**Trigger:** Assessor at ASSESSMENT → Conditions substage, drafting conditions.
**Preconditions:**
- Conditions template (.docx) loaded
- Conditions library in TenantData `setup-configuration`
- `customData.assessment.appliedConditions[]` partially populated

**Steps:**
1. Assessor opens Conditions substage — `onlyoffice-editor` loads conditions template
2. Auto-fill: DAISY reads existing `appliedConditions[]` and populates numbered list
3. Assessor asks: "Add standard conditions for a single dwelling addition on R2 land"
4. DAISY queries conditions library, inserts 12 standard conditions via `edit_list`
5. Each condition has: code, title, content, reason
6. Assessor modifies condition 7 (site-specific drainage requirement)
7. Assessor adds 2 custom conditions manually
8. DAISY uses `edit_content` (searchReplace) to update condition numbering
9. Assessor saves — conditions written back to `customData.assessment.appliedConditions[]`

**Expected Outcome:** Complete conditions of consent document with standard + custom conditions.
**Acceptance Criteria:**
- Standard conditions match council's conditions library
- Custom conditions integrated seamlessly with standard ones
- Condition numbering correct after modifications
- Save updates both document and `appliedConditions[]` array

---

### BS-15: Peer Review of Assessment Report

**Actor:** Senior Planner (tenant-admin)
**Use Case:** Australian NSW Government Council
**Trigger:** Assessment report submitted for peer review, BR at ASSESSMENT → Reviews substage.
**Preconditions:**
- Review entity created with `reviewType: 'peer-review'`, `status: 'pending'`
- Assessment report .docx exists in Azure Blob
- Senior planner assigned as reviewer

**Steps:**
1. Senior planner opens Reviews substage — sees pending peer review
2. `onlyoffice-editor` loads the assessment report in review mode
3. Senior planner reads through report sections
4. Uses ONLYOFFICE Track Changes to suggest edits to Proposal Summary
5. Uses ONLYOFFICE Comments to flag a missing SEPP analysis
6. Adds annotation: "Please add SEPP 65 analysis for multi-dwelling development"
7. Submits review with `recommendation: 'approve-with-conditions'`
8. Review entity updated: `status: 'completed'`, `comments: '...'`
9. Assessor notified of review comments

**Expected Outcome:** Reviewed report with tracked changes and comments for assessor.
**Acceptance Criteria:**
- Track Changes visible to assessor when they re-open
- Comments linked to specific document locations
- Review status updated in `customData.reviews[]`
- Concurrent access doesn't corrupt document

---

### BS-16: Sign-Off Review and Determination Decision

**Actor:** Senior Planner (tenant-admin)
**Use Case:** Australian NSW Government Council
**Trigger:** Peer review complete, BR at ASSESSMENT → Reviews substage, sign-off requested.
**Preconditions:**
- Peer review completed with `recommendation: 'approve'`
- Sign-off review entity created with `reviewType: 'sign-off'`
- Senior planner is delegated authority

**Steps:**
1. Senior planner opens sign-off review
2. `onlyoffice-editor` loads final assessment report (read-only or tracked changes)
3. Reviews all sections, confirms recommendation aligns with assessment
4. Makes decision: `decision: 'approve'`
5. Adds `determinationNotes`: "Consistent with LEP 2012, meets all SEPP requirements"
6. Sign-off entity updated: `status: 'completed'`, `decision: 'approve'`
7. Document locked after sign-off (editor switches to read-only)
8. Workflow advances to Determination substage

**Expected Outcome:** Formal sign-off with decision recorded, document locked.
**Acceptance Criteria:**
- Document locked after sign-off (no further edits possible)
- Decision recorded in review entity
- Workflow auto-advances to Determination

---

## Category 3: Multi-Tenant Variations (5 scenarios)

### BS-17: Different Council Templates for Same Document Type

**Actor:** Tenant Admin (tenant-admin) for two councils
**Use Case:** Australian NSW Government Council
**Trigger:** Two councils use the same assessment report structure but different templates.
**Preconditions:**
- Council A (Inner West) has its branded assessment template in TenantData
- Council B (Northern Beaches) has its branded template in TenantData
- Both use `usecase: 'council'`

**Steps:**
1. Council A assessor opens assessment report — loads Inner West branded template
2. Council B assessor opens assessment report — loads Northern Beaches branded template
3. Both use the SAME `onlyoffice-editor` block with SAME config
4. Template selection driven by `useTenantData(tenantId, 'document-configuration')`
5. Auto-fill prompts also differ (Council A focuses on heritage, Council B on coastal)
6. Both assessors use identical 12-tool API for editing

**Expected Outcome:** Same editor block, different templates and prompts per tenant.
**Acceptance Criteria:**
- Templates isolated between tenants (no cross-contamination)
- ChatBot uses tenant-specific prompts from ChatBot collection
- No code changes needed for different council branding

---

### BS-18: Tenant-Specific Conditions Library

**Actor:** Tenant Admin (tenant-admin)
**Use Case:** Australian NSW Government Council
**Trigger:** Admin uploads council-specific conditions library.
**Preconditions:**
- Admin has `tenant-admin` role
- TenantData `setup-configuration` allows conditions management

**Steps:**
1. Admin navigates to tenant settings → Document Configuration
2. Uploads conditions library CSV (code, title, content, category)
3. System stores in TenantData `setup-configuration` → conditions array
4. Assessor opens Conditions substage — asks DAISY for standard conditions
5. DAISY reads from THIS tenant's conditions library (not another council's)
6. Conditions populated match the uploaded library exactly

**Expected Outcome:** Per-tenant conditions library used by chatbot.
**Acceptance Criteria:**
- Conditions library isolated per tenant
- ChatBot reads correct library for current tenant
- Library updates reflect immediately in editor

---

### BS-19: Child Tenant Inherits Parent Templates

**Actor:** Council Assessor in child tenant
**Use Case:** Australian NSW Government Council
**Trigger:** Regional council (child) inherits templates from state body (parent).
**Preconditions:**
- Parent tenant: "NSW Planning" with standard templates
- Child tenant: "Wollongong Council" with `parentTenant: 'nsw-planning'`
- Child has NOT uploaded its own templates

**Steps:**
1. Wollongong assessor opens assessment report
2. System checks child tenant TenantData for templates — none found
3. System falls back to parent tenant ("NSW Planning") templates
4. Standard NSW template loaded from parent's TenantData
5. Wollongong-specific data still populated from child's BR customData
6. If Wollongong later uploads its own template, it overrides parent's

**Expected Outcome:** Hierarchical template inheritance works correctly.
**Acceptance Criteria:**
- Child tenant falls back to parent templates when none configured
- Child-specific data NOT leaked to parent
- Override works when child uploads own template

---

### BS-20: B2C Applicant Views Determination Letter (Read-Only)

**Actor:** Applicant (tenant-viewer via B2C portal)
**Use Case:** Australian NSW Government Council
**Trigger:** Determination sent, applicant accesses portal.
**Preconditions:**
- Determination letter generated and saved as .docx
- Determination notification sent to applicant
- Applicant authenticated via Entra B2C

**Steps:**
1. Applicant logs into B2C portal at `/{council-slug}/portal`
2. Navigates to their DA → Determination section
3. `onlyoffice-editor` loads in read-only mode (`businessLogic.readOnly: true`)
4. Applicant reads determination letter with conditions
5. Applicant can download as PDF or .docx
6. Cannot edit — all toolbar buttons disabled except export
7. Appeal period countdown shown alongside document

**Expected Outcome:** Applicant can read and download but not edit.
**Acceptance Criteria:**
- Editor enforces read-only mode via ONLYOFFICE permissions
- Download works for both PDF and .docx formats
- No edit capabilities exposed to viewer role

---

### BS-21: Cross-Tenant Isolation Verification

**Actor:** System (automated test)
**Use Case:** Multi-tenant security
**Trigger:** Security audit requires tenant isolation verification.
**Preconditions:**
- Two tenants with different documents and templates
- Automated test suite with two authenticated sessions

**Steps:**
1. Tenant A opens document X in ONLYOFFICE
2. Tenant B attempts to access document X via direct URL manipulation
3. API returns 403 — OPA access control blocks cross-tenant access
4. Tenant B opens their own document Y
5. ONLYOFFICE JWT validation confirms document key matches tenant
6. Verify: no cross-tenant document URLs leaked in API responses
7. Verify: ONLYOFFICE Document Server separates editing sessions by tenant

**Expected Outcome:** Complete tenant isolation at all layers.
**Acceptance Criteria:**
- API returns 403 for cross-tenant document access
- ONLYOFFICE JWT prevents cross-tenant document loading
- No document content cached across tenant sessions

---

## Category 4: DAISY Chatbot Interactions (6 scenarios)

### BS-22: Mid-Edit Query — "What SEPP Controls Apply?"

**Actor:** Council Assessor + DAISY Chatbot
**Use Case:** Australian NSW Government Council
**Trigger:** Assessor asks a planning question while editing assessment report.
**Preconditions:**
- Assessment report open in ONLYOFFICE
- `customData.assessment.sepps[]` populated
- ChatBot configured with planning context prompt

**Steps:**
1. Assessor types in chatbot: "What SEPP controls apply to this property?"
2. DAISY queries `customData.assessment.applicableSEPPs` and `sepps[]`
3. DAISY responds in chat: "3 SEPPs apply: SEPP 65 (Design Quality), SEPP (Coastal), SEPP (Vegetation)"
4. Assessor says: "Insert the SEPP 65 analysis into the report"
5. DAISY calls `get_document_content` to find the SEPP section
6. DAISY calls `edit_content` (insert) to add SEPP 65 analysis after the section heading
7. AIEditReviewBar shows the insertion for assessor review

**Expected Outcome:** Contextual planning query answered, content inserted on demand.
**Acceptance Criteria:**
- DAISY correctly identifies applicable SEPPs from customData
- Content inserted at correct document location
- Assessor can accept/reject the insertion

---

### BS-23: Batch Operation — "Fill All EPA Rows"

**Actor:** Council Assessor + DAISY Chatbot
**Use Case:** Australian NSW Government Council
**Trigger:** Assessor asks DAISY to bulk-fill EPA compliance table.
**Preconditions:**
- Assessment report with empty EPA table
- `customData.assessment.epaMatters[]` has 20+ entries

**Steps:**
1. Assessor: "Fill all EPA compliance rows from the assessment data"
2. DAISY reads `epaMatters[]` — finds 22 entries
3. DAISY batches updates: calls `edit_table` (updateCell) for each row
4. Each tool call completes in <500ms, total batch in ~11 seconds
5. DAISY uses `edit_styles` to apply conditional formatting (green/red/amber)
6. AIEditReviewBar shows "DAISY made 66 edits" (3 cells × 22 rows)
7. Assessor reviews batch, accepts all compliant rows, reviews 3 non-compliant

**Expected Outcome:** Full EPA table populated in one batch operation.
**Acceptance Criteria:**
- All 22 EPA matters reflected in table
- Batch completes in <15 seconds total
- Individual cell edits reviewable via AIEditReviewBar
- No tool call failures in the batch

---

### BS-24: Error Recovery — Tool Call Failure and Retry

**Actor:** DAISY Chatbot (AI agent)
**Use Case:** Any (universal)
**Trigger:** Tool call fails during auto-fill due to ONLYOFFICE timeout.
**Preconditions:**
- Auto-fill in progress
- ONLYOFFICE Document Server experiencing latency

**Steps:**
1. Auto-fill triggers, DAISY calls `edit_content` (insert)
2. Macro execution timeout — ONLYOFFICE returns error after 5 seconds
3. Tool call result returns `{ success: false, error: 'Macro execution timeout' }`
4. DAISY receives error, retries with smaller content chunk
5. Second attempt succeeds
6. DAISY continues auto-fill with remaining sections
7. If 3 consecutive failures: DAISY stops auto-fill, notifies user
8. User sees: "Auto-fill paused: Document server is slow. Retry?"

**Expected Outcome:** Graceful degradation with retry logic.
**Acceptance Criteria:**
- Tool call errors don't crash the editor
- Retry logic attempts up to 3 times with exponential backoff
- User notified after persistent failures
- Partial auto-fill is preserved (edits already made are not lost)

---

### BS-25: Context-Aware Suggestion Based on BR Data

**Actor:** Council Assessor + DAISY Chatbot
**Use Case:** Australian NSW Government Council
**Trigger:** Assessor asks DAISY for recommendation based on assessment data.
**Preconditions:**
- Assessment partially complete
- All EPA matters and SEPPs evaluated
- `customData.assessment.recommendation` is null (not yet written)

**Steps:**
1. Assessor: "Based on the assessment, what's your recommendation?"
2. DAISY reads all assessment data: EPA compliance (18/22 compliant), SEPP compliance (all met), referral feedback (all approved)
3. DAISY drafts recommendation: "Approval subject to conditions"
4. DAISY calls `edit_content` (insert) to add recommendation paragraph
5. DAISY calls `edit_content` (insert) to add justification referencing specific EPA sections
6. Assessor reviews, adjusts wording to match council style
7. Assessor saves — `customData.assessment.recommendation` updated

**Expected Outcome:** AI-drafted recommendation informed by complete assessment data.
**Acceptance Criteria:**
- Recommendation reflects actual compliance data (not hallucinated)
- Justification references specific EPA/SEPP sections from customData
- Assessor can easily modify AI draft

---

### BS-26: Background Pre-Fill via useAutoFillService

**Actor:** DAISY Chatbot (background process)
**Use Case:** Any (universal)
**Trigger:** User opens a page with auto-fill enabled, but navigates away before completion.
**Preconditions:**
- `businessLogic.autoFillOnLoad: true`
- `businessLogic.backgroundPreFillEnabled: true`
- Template has 8 sections to fill

**Steps:**
1. User opens assessment page — auto-fill starts in background
2. DAISY begins filling sections 1-3
3. User navigates to a different tab/substage
4. Background pre-fill continues (doesn't require editor to be visible)
5. Sections 4-8 filled in background
6. Pre-fill status tracked in Zustand store: `preFillStatusByRequest[brId]`
7. User returns to assessment page — all 8 sections pre-filled
8. AIEditReviewBar shows "DAISY pre-filled 8 sections while you were away"

**Expected Outcome:** Background pre-fill completes even when user navigates away.
**Acceptance Criteria:**
- Pre-fill continues in background (not cancelled on unmount)
- Status tracked in Zustand store
- Results visible when user returns
- No duplicate fills if user returns mid-fill

---

### BS-27: DAISY Hallucination Detection via Track Changes

**Actor:** Council Assessor
**Use Case:** Australian NSW Government Council
**Trigger:** DAISY inserts incorrect condition content.
**Preconditions:**
- DAISY has inserted conditions via auto-fill
- One condition references wrong EPA section

**Steps:**
1. DAISY inserts 15 conditions via `edit_content`
2. Assessor reviews via AIEditReviewBar
3. Condition 7 references "Section 4.6 — Heritage" but property has no heritage listing
4. Assessor rejects condition 7 via Track Changes → Reject
5. ONLYOFFICE reverts the insertion
6. Assessor asks DAISY: "Condition 7 was wrong — this isn't a heritage-listed property"
7. DAISY acknowledges, offers corrected condition for stormwater instead
8. Assessor accepts the corrected condition

**Expected Outcome:** Assessor catches AI error via review workflow, corrects with chatbot.
**Acceptance Criteria:**
- Individual edit rejection works (doesn't reject all edits)
- Rejected content cleanly removed from document
- DAISY can generate corrected content on second attempt

---

## Category 5: Edge Cases and Errors (6 scenarios)

### BS-28: Large Document Performance (50+ Pages)

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** Complex DA with extensive assessment report (60 pages).
**Preconditions:**
- Assessment report template with 60 pages of content
- Multiple tables, images, and formatted sections

**Steps:**
1. Assessor opens 60-page assessment report
2. ONLYOFFICE loads document — progressive rendering
3. Editor responsive within 5 seconds (viewport renders first)
4. Assessor scrolls through document — no lag
5. DAISY tool calls work on any section (not just visible viewport)
6. `get_document_content` with `structureOnly: true` returns compact nodeMap
7. `edit_content` operations on page 45 execute within 500ms
8. Export to .docx completes within 10 seconds for 60 pages

**Expected Outcome:** No degradation on large documents.
**Acceptance Criteria:**
- Editor loads viewport in <5 seconds on 10 Mbps
- Scroll performance maintains 60fps
- Tool calls work on non-visible sections
- Export completes within 15 seconds

---

### BS-29: Concurrent Editing Conflict Resolution

**Actor:** Two Council Assessors
**Use Case:** Australian NSW Government Council
**Trigger:** Two assessors open the same assessment report simultaneously.
**Preconditions:**
- ONLYOFFICE configured in "Fast" collaboration mode
- Both assessors have edit permission

**Steps:**
1. Assessor A opens assessment report
2. Assessor B opens same report 30 seconds later
3. ONLYOFFICE shows both cursors with user names
4. Assessor A edits EPA section, Assessor B edits Conditions section
5. Both edits merge in real-time (different document regions)
6. Assessor A edits paragraph 5, Assessor B edits paragraph 5 simultaneously
7. ONLYOFFICE OT (Operational Transform) merges both edits
8. If conflict cannot be auto-resolved, last writer wins with notification

**Expected Outcome:** Real-time collaboration with conflict resolution.
**Acceptance Criteria:**
- Both users see each other's cursors
- Non-conflicting edits merge seamlessly
- Conflicting edits handled gracefully (no data loss)
- Document state consistent for both users

---

### BS-30: Token Expiry Mid-Edit Session

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Any (universal)
**Trigger:** Entra B2C token expires while assessor is editing (60-minute session).
**Preconditions:**
- Assessor has been editing for 55+ minutes
- Token expiry approaching

**Steps:**
1. Assessor is editing assessment report
2. Token expires (B2C default: 60 minutes)
3. Next auto-save attempt fails with 401 Unauthorized
4. Editor shows warning: "Session expiring — save your work"
5. Silent token refresh attempted via refresh token
6. If refresh succeeds: session continues transparently
7. If refresh fails: user prompted to re-authenticate
8. Unsaved changes preserved in Zustand store during re-auth
9. After re-auth, auto-save resumes with queued changes

**Expected Outcome:** No data loss on token expiry, graceful re-authentication.
**Acceptance Criteria:**
- Warning shown before token expires
- Silent refresh attempted first
- Unsaved changes preserved during re-auth flow
- No duplicate content from queued saves

---

### BS-31: .docx Fidelity Loss on Complex Formatting

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Any (universal)
**Trigger:** Template with complex Word formatting (nested tables, text boxes, SmartArt).
**Preconditions:**
- Template has nested tables, text boxes, and SmartArt diagrams
- These elements are at the limit of ONLYOFFICE's rendering capability

**Steps:**
1. Assessor opens template with nested tables — renders correctly
2. Text boxes render but may lose exact positioning (within 5% tolerance)
3. SmartArt converted to grouped shapes (visual representation preserved)
4. Assessor edits text within these elements
5. Saves .docx — round-trip comparison shows <5% formatting loss
6. Automated fidelity test compares pixel-by-pixel rendering
7. If loss exceeds 5%: system flags for manual review

**Expected Outcome:** Document preserves formatting within acceptable tolerance.
**Acceptance Criteria:**
- <5% formatting loss on round-trip (open, edit, save, reopen)
- Nested tables fully editable
- Text boxes preserve content (positioning may shift)
- SmartArt renders as shapes (not ideal but functional)

---

### BS-32: Offline/Degraded Network Recovery

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Any (universal)
**Trigger:** Network drops while assessor is editing.
**Preconditions:**
- Assessor is mid-edit with unsaved changes
- Network connection drops (WiFi issues, VPN timeout)

**Steps:**
1. Assessor is editing — network drops
2. ONLYOFFICE detects disconnect, shows "Connection lost" banner
3. Editor switches to offline mode — local edits continue
4. Auto-save queues changes locally
5. Network reconnects after 2 minutes
6. ONLYOFFICE reconnects to Document Server
7. Queued changes sync automatically
8. If server has newer version: merge conflict UI shown
9. Editor resumes normal operation

**Expected Outcome:** No data loss on network interruption, automatic recovery.
**Acceptance Criteria:**
- Local editing continues during disconnect
- Changes sync on reconnect
- No duplicate content from queued operations
- User notified of connection status changes

---

### BS-33: Document Locked by Another User

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Any (universal)
**Trigger:** Assessor tries to edit document that's locked by sign-off review.
**Preconditions:**
- Document locked after sign-off (review completed)
- Editor configured with `businessLogic.respectLockStatus: true`

**Steps:**
1. Assessor opens document that has been signed off
2. ONLYOFFICE loads in read-only mode (lock detected)
3. Editor shows banner: "This document is locked (signed off by [Senior Planner] on [date])"
4. Assessor can view but not edit
5. Assessor can still export as PDF/DOCX
6. If assessor needs to edit: must request unlock from senior planner
7. Unlock clears the sign-off, document becomes editable again

**Expected Outcome:** Lock enforcement prevents post-sign-off edits.
**Acceptance Criteria:**
- Locked documents load in read-only mode
- Lock reason and holder displayed
- Export still works in read-only mode
- Unlock requires appropriate permission

---

## Category 6: External Integration (5 scenarios)

### BS-34: npm Package Install and Basic Render

**Actor:** External Developer
**Use Case:** Any (domain-agnostic)
**Trigger:** Developer wants to add .docx editing to their app.

**Steps:**
1. `npm install @eai/cloud-word-editor`
2. Import component: `import { CloudWordEditor } from '@eai/cloud-word-editor'`
3. Render with minimal props:
   ```jsx
   <CloudWordEditor
     documentUrl="https://blob.core.windows.net/docs/report.docx"
     authToken={token}
     onSave={(blob) => upload(blob)}
   />
   ```
4. Editor loads .docx, renders with full toolbar
5. Developer edits document, triggers save
6. `onSave` callback receives .docx Blob

**Expected Outcome:** Working editor in <20 lines of code.
**Acceptance Criteria:**
- Package installs without errors
- <5 required config props
- Editor loads and renders .docx
- Save callback works

---

### BS-35: Web Component Embed (Non-React)

**Actor:** External Developer (Vue/Angular/plain HTML)
**Use Case:** Any (domain-agnostic)
**Trigger:** Developer uses Vue.js, needs framework-agnostic integration.

**Steps:**
1. Install: `npm install @eai/cloud-word-editor`
2. Import web component: `import '@eai/cloud-word-editor/web-component'`
3. Use in HTML:
   ```html
   <cloud-word-editor
     document-url="https://blob.core.windows.net/docs/report.docx"
     auth-token="eyJ..."
   ></cloud-word-editor>
   ```
4. Listen for events: `editor.addEventListener('save', handler)`
5. Call methods: `editor.executeToolCall('edit_content', { edits: [...] })`

**Expected Outcome:** Framework-agnostic web component works in any environment.
**Acceptance Criteria:**
- Works in Vue, Angular, Svelte, plain HTML
- Custom element registers correctly
- Events and methods match React component API
- No React dependency in web component bundle

---

### BS-36: Chatbot API Bridge for External Consumers

**Actor:** External Developer
**Use Case:** Any (domain-agnostic)
**Trigger:** Developer wants to connect their own chatbot to the editor.

**Steps:**
1. Developer configures chatbot API:
   ```jsx
   <CloudWordEditor
     documentUrl={url}
     authToken={token}
     chatbotApi={{
       endpoint: "/api/my-chatbot",
       tools: ["edit_content", "edit_table", "get_document_content"]
     }}
   />
   ```
2. When chatbot sends tool call, editor executes it
3. Developer's chatbot receives tool results via callback
4. Full 12-tool API available (developer can whitelist subset)
5. AIEditReviewBar works out of the box

**Expected Outcome:** Any chatbot can control the editor via tool calls.
**Acceptance Criteria:**
- Custom chatbot endpoint receives tool results
- Tool whitelisting works (only selected tools enabled)
- AIEditReviewBar tracks changes from external chatbot
- No Configurator-specific concepts in the API

---

### BS-37: Docker Deployment of ONLYOFFICE for External Dev

**Actor:** External Developer (DevOps)
**Use Case:** Any (domain-agnostic)
**Trigger:** Developer needs to run ONLYOFFICE Document Server locally.

**Steps:**
1. Package includes `docker-compose.yml` for local development:
   ```bash
   cd node_modules/@eai/cloud-word-editor
   docker-compose up -d
   ```
2. ONLYOFFICE Document Server starts on `localhost:8080`
3. Developer configures component:
   ```jsx
   <CloudWordEditor
     documentUrl={url}
     authToken={token}
     documentServerUrl="http://localhost:8080"
   />
   ```
4. Editor connects to local Document Server
5. All features work identically to production

**Expected Outcome:** Local dev environment in <10 minutes.
**Acceptance Criteria:**
- Docker Compose starts ONLYOFFICE in <2 minutes
- Local server handles 1-5 concurrent connections (dev mode)
- Configuration documented in README
- No license required for local development (Community Edition)

---

### BS-38: Programmatic Tool Call from External App

**Actor:** External Developer
**Use Case:** Any (domain-agnostic)
**Trigger:** Developer wants to programmatically insert content (no chatbot).

**Steps:**
1. Get editor ref: `const editorRef = useRef()`
2. Execute tool call directly:
   ```js
   const result = await editorRef.current.executeToolCall('edit_content', {
     edits: [{
       type: 'insert',
       afterNodeIndex: 5,
       content: '<h2>Generated Section</h2><p>Auto-generated content here</p>'
     }]
   })
   ```
3. Content appears with AI change highlighting
4. User can accept/reject via AIEditReviewBar
5. Developer calls `export_document` to get final .docx

**Expected Outcome:** Full programmatic control without chatbot dependency.
**Acceptance Criteria:**
- All 12 tool calls accessible via `executeToolCall()`
- Results match ChatBot-triggered tool call results
- AIEditReviewBar works for programmatic edits
- No chatbot configuration required

---

## Category 7: Document Lifecycle (5 scenarios)

### BS-39: Version History and Comparison

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** Assessor wants to compare current version with pre-DAISY version.
**Preconditions:**
- Document has 3 versions in Documents collection
- Version 1: blank template, Version 2: DAISY auto-filled, Version 3: assessor edited

**Steps:**
1. Assessor opens version history panel in editor
2. Sees 3 versions with timestamps and authors
3. Selects "Compare Version 2 vs Version 3"
4. ONLYOFFICE shows diff view (tracked changes between versions)
5. Assessor can see exactly what they changed after DAISY's auto-fill
6. Can revert to any previous version

**Expected Outcome:** Full version history with visual diff comparison.
**Acceptance Criteria:**
- All versions accessible from editor
- Diff view highlights changes between any two versions
- Revert creates a new version (doesn't destroy history)

---

### BS-40: PDF Export for Public Notification

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** Determination letter needs to be sent as PDF to applicant.
**Preconditions:**
- Determination letter finalized and signed off
- PDF required for email notification

**Steps:**
1. Assessor opens determination letter in editor
2. Clicks "Export as PDF" button
3. ONLYOFFICE generates PDF server-side (native conversion, not Puppeteer)
4. PDF preserves all formatting: tables, headings, council logo, page numbers
5. PDF uploaded to Documents collection with `securityLevel: 'public'`
6. PDF URL included in determination notification email to applicant
7. Applicant can download PDF from B2C portal

**Expected Outcome:** High-fidelity PDF matching .docx formatting.
**Acceptance Criteria:**
- PDF matches .docx rendering within 2% tolerance
- Council logo and branding preserved
- Table formatting preserved
- Page numbers correct

---

### BS-41: Document Archival After Determination

**Actor:** System (automated)
**Use Case:** Australian NSW Government Council
**Trigger:** Determination notification sent, DA workflow complete.
**Preconditions:**
- Determination sent via `/api/.../determination-notification`
- Appeal period defined (typically 6 months for DAs)

**Steps:**
1. Determination notification triggers workflow completion
2. System archives all assessment documents:
   - Assessment report (.docx)
   - Determination letter (.docx + PDF)
   - Referral letters (.docx)
   - Conditions of consent (.docx)
3. Documents tagged with `retentionPolicy: 'statutory-7-years'`
4. Archived documents set to read-only in ONLYOFFICE
5. After appeal period: documents remain accessible but locked
6. After retention period: system flags for review/deletion

**Expected Outcome:** Complete document archive with retention policy.
**Acceptance Criteria:**
- All documents archived and linked to BR
- Retention policy applied per document type
- Archived documents accessible in read-only mode
- No edits possible after archival

---

### BS-42: Document Security Levels

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** Confidential assessment report with sensitive heritage information.
**Preconditions:**
- Assessment report contains Aboriginal heritage assessment
- Document must be restricted to authorized staff only

**Steps:**
1. Assessor creates assessment report with heritage section
2. Sets `securityLevel: 'confidential'` on the document
3. Only users with `assessment` permission can view
4. B2C applicant portal shows "Restricted document" placeholder
5. Heritage section redacted in any public-facing exports
6. Audit trail logs every access to the confidential document

**Expected Outcome:** Security level enforced at document and section level.
**Acceptance Criteria:**
- Confidential documents not visible to unauthorized users
- Public exports redact sensitive sections
- Audit trail captures all access events

---

### BS-43: Modification Report After Approval

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** Approved DA requires modification (s4.55 modification).
**Preconditions:**
- Original DA approved with conditions
- Applicant requests modification
- New BR created for modification linked to original

**Steps:**
1. New modification BR created, linked to original DA
2. Assessor opens modification assessment report
3. `onlyoffice-editor` loads modification template
4. Auto-fill: DAISY reads original DA conditions from linked BR
5. DAISY uses `edit_table` to create comparison table (original vs proposed changes)
6. Assessor assesses modification against original conditions
7. DAISY drafts modified conditions (add/remove/change)
8. Report saved with cross-reference to original DA

**Expected Outcome:** Modification report with clear comparison to original approval.
**Acceptance Criteria:**
- Original DA data accessible from modification BR
- Comparison table auto-populated
- Modified conditions tracked against originals

---

## Category 8: Admin and Builder Scenarios (5 scenarios)

### BS-44: Tenant Admin Configures Document Templates

**Actor:** Tenant Admin (tenant-admin)
**Use Case:** Australian NSW Government Council
**Trigger:** New council onboards, needs to upload their branded templates.
**Preconditions:**
- New tenant created with `usecase: 'council'`
- Admin has `tenant-admin` role

**Steps:**
1. Admin navigates to Tenant Settings → Document Configuration
2. Uploads assessment report template (.docx) with council branding
3. Uploads determination letter template (.docx)
4. Uploads referral letter templates (Heritage, RFS, Traffic)
5. Templates stored in TenantData `document-configuration` with Azure Blob URLs
6. Admin configures template labels and categories
7. Templates immediately available in `onlyoffice-editor` block
8. No code deployment needed

**Expected Outcome:** Templates configured via admin UI, no code changes.
**Acceptance Criteria:**
- Upload works for .docx files up to 10MB
- Templates appear in editor template selector
- Old templates can be replaced/archived
- No deployment needed

---

### BS-45: Builder Adds Editor Block to Workflow Page

**Actor:** Workflow Builder (tenant-builder)
**Use Case:** Any (universal)
**Trigger:** Builder creating a new workflow page that needs document editing.
**Preconditions:**
- Builder has `tenant-builder` role
- Workflow exists with pages

**Steps:**
1. Builder opens workflow page editor
2. Adds `onlyoffice-editor` block from block library
3. Configures presentationConfig: height = 'full', showToolbar = true
4. Configures dataConfig: savePath = 'customData.reportUrl', autoSave = true
5. Configures businessLogic: aiToolsEnabled = true, autoFillOnLoad = true
6. Builder saves page definition
7. Staff users see ONLYOFFICE editor on that workflow page
8. No code deployment needed

**Expected Outcome:** Editor block added to any workflow page via configuration.
**Acceptance Criteria:**
- Block appears in block library without usecase filtering
- All config options available in admin UI
- Changes take effect immediately
- Works on any workflow stage/substage

---

### BS-46: Admin Manages Chatbot Prompts for Document Types

**Actor:** Tenant Admin (tenant-admin)
**Use Case:** Australian NSW Government Council
**Trigger:** Admin wants to customize auto-fill prompts for assessment reports.
**Preconditions:**
- ChatBot collection has per-tenant prompt configuration
- Admin has access to chatbot settings

**Steps:**
1. Admin navigates to ChatBot settings for their tenant
2. Edits system prompt for document editor context:
   - "When auto-filling assessment reports, use EPA Act 1979 section references"
   - "For conditions of consent, use the council's standard conditions library"
   - "Always include the assessor's recommendation justification"
3. Edits auto-fill prompt template:
   - "Read the template structure. Fill Site Description from siteDetails..."
4. Saves — ChatBot prompt cache invalidated
5. Next assessor auto-fill uses the updated prompts

**Expected Outcome:** Custom chatbot behavior per tenant via prompt configuration.
**Acceptance Criteria:**
- Prompts editable via admin UI
- Cache invalidation works (no stale prompts)
- Updated prompts used immediately
- Different tenants have different prompts

---

### BS-47: Admin Reviews Audit Trail of AI Edits

**Actor:** Tenant Admin (tenant-admin)
**Use Case:** Australian NSW Government Council
**Trigger:** Compliance audit requires proof of human review of AI-generated content.
**Preconditions:**
- Assessment report was partially AI-generated
- Audit trail captures AI edit events

**Steps:**
1. Admin opens audit trail for a specific BusinessRequest
2. Sees chronological list of document events:
   - "DAISY auto-fill started" (timestamp, user who triggered)
   - "DAISY edit: EPA table row 1 updated" (tool call details)
   - "Assessor accepted edit: EPA table row 1" (review action)
   - "Assessor rejected edit: Heritage condition" (review action)
   - "Assessor manual edit: Recommendation section" (human edit)
3. Each event links to the specific document version
4. Admin can filter by: AI edits only, human edits only, rejected edits
5. Export audit trail as CSV for compliance reporting

**Expected Outcome:** Complete AI edit accountability for government compliance.
**Acceptance Criteria:**
- Every AI edit logged with tool call details
- Accept/reject decisions logged
- Human edits distinguishable from AI edits
- Audit trail exportable

---

### BS-48: TenantSchemas Extend Editor Block

**Actor:** Tenant Admin (tenant-admin)
**Use Case:** Any (universal)
**Trigger:** Tenant needs custom fields on the ONLYOFFICE editor block.
**Preconditions:**
- TenantSchemas collection supports `schemaTarget: 'block'`
- `blockSlug: 'onlyoffice-editor'` registered

**Steps:**
1. Admin creates TenantSchema:
   ```json
   {
     "schemaTarget": "block",
     "blockSlug": "onlyoffice-editor",
     "fields": [
       { "name": "departmentCode", "type": "select", "options": ["Planning", "Engineering", "Environment"] },
       { "name": "assessmentCategory", "type": "text" }
     ]
   }
   ```
2. Block cache invalidated via `BlockCacheSingleton`
3. Editor block now shows custom fields in admin UI
4. Builder configures `departmentCode: 'Planning'` for assessment page
5. Component receives custom fields in `customData`

**Expected Outcome:** Per-tenant custom fields on editor block without code changes.
**Acceptance Criteria:**
- Custom fields appear in block admin UI
- Fields accessible in component props
- Cache invalidation works
- No code deployment needed

---

## Category 9: Referral-Specific (4 scenarios)

### BS-49: Generate Referral Letter to Traffic Department

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** DA requires traffic impact assessment, BR at Referrals substage.
**Preconditions:**
- Referral entity created: `type: 'Internal'`, `group: 'Traffic'`
- Traffic referral template in TenantData

**Steps:**
1. Assessor generates Traffic referral letter
2. `onlyoffice-editor` loads traffic referral template
3. Auto-fill: DAISY populates from `customData.assessment`:
   - Vehicle access arrangements
   - Parking provision
   - Traffic generation estimates
4. DAISY uses `edit_table` to fill traffic impact summary table
5. Assessor adds site-specific concerns (school zone proximity)
6. Letter saved and linked to referral entity

**Expected Outcome:** Traffic referral with relevant impact data.
**Acceptance Criteria:**
- Traffic-specific data populated from assessment entity
- Template different from Heritage/RFS referral templates
- Letter linked to correct referral entity

---

### BS-50: Track Referral Response in Documents

**Actor:** Referral Officer (tenant-staff with referral permissions)
**Use Case:** Australian NSW Government Council
**Trigger:** Heritage department responds to referral with conditions.
**Preconditions:**
- Referral `status: 'Sent'`, awaiting response
- Heritage officer submits response document

**Steps:**
1. Heritage officer uploads response document (.docx)
2. Document linked to referral entity via `referral.documents[]`
3. Assessor opens referral response in `onlyoffice-editor` (read-only)
4. DAISY summarizes key points from referral response
5. Assessor asks: "What conditions did Heritage recommend?"
6. DAISY extracts conditions from response document
7. Assessor says: "Add Heritage conditions to the assessment conditions list"
8. DAISY calls `edit_content` on the assessment report to insert Heritage conditions
9. Referral status updated to `'Completed'`, `decision: 'approved'`

**Expected Outcome:** Referral response tracked and integrated into assessment.
**Acceptance Criteria:**
- Response document linked to referral entity
- DAISY can read and summarize external documents
- Conditions extracted and inserted into assessment report
- Referral status updated correctly

---

### BS-51: Merge Referral Feedback into Assessment Report

**Actor:** Council Assessor + DAISY Chatbot
**Use Case:** Australian NSW Government Council
**Trigger:** All referrals complete, assessor needs to consolidate feedback.
**Preconditions:**
- 4 referrals completed (Heritage, Traffic, Water, Environment)
- Each has response documents with conditions

**Steps:**
1. Assessor: "Summarize all referral responses and add to the assessment report"
2. DAISY reads all 4 referral response documents
3. DAISY creates consolidated referral summary section
4. Uses `edit_content` (insert) to add "Referral Consultation Summary" heading
5. Uses `edit_table` to create summary table:
   | Referral | Status | Key Conditions | Recommendation |
6. For each referral, inserts detailed response summary paragraph
7. Cross-references referral conditions with proposed conditions of consent
8. Assessor reviews consolidated section, adjusts as needed

**Expected Outcome:** All referral feedback consolidated in assessment report.
**Acceptance Criteria:**
- All 4 referral responses summarized accurately
- Summary table created with correct statuses
- Conditions cross-referenced
- No referral responses missed

---

### BS-52: Handle Overdue Referral with Reminder Letter

**Actor:** Council Assessor (tenant-staff)
**Use Case:** Australian NSW Government Council
**Trigger:** External referral past due date (30-day limit).
**Preconditions:**
- Referral `status: 'Sent'`, `dueDate` has passed
- System detected overdue status

**Steps:**
1. System flags overdue referral on Referrals substage
2. Assessor clicks "Generate Reminder" for the overdue referral
3. `onlyoffice-editor` loads reminder letter template
4. Auto-fill: DAISY populates from original referral letter data
5. DAISY inserts: original send date, due date, days overdue
6. DAISY adds urgency statement per council policy
7. Assessor reviews and sends reminder to external agency
8. Referral `status` remains 'Sent' but `reminderSent: true`

**Expected Outcome:** Formal reminder letter for overdue referral.
**Acceptance Criteria:**
- Overdue status correctly detected
- Reminder template different from original referral
- Original referral data preserved
- Reminder tracking recorded

---

## Category 10: Universal Architecture Validation (6 scenarios)

### BS-53: Retail Store Manager — Inventory Report (Seed Example 3)

See seed example at `business-scenarios-seed.md` Example Scenario 3.
Same editor block, different TenantData config. Proves use-case agnosticism.

---

### BS-54: Legal Firm — Contract Draft with AI Clause Insertion

**Actor:** Legal Associate (tenant-staff, legal usecase)
**Use Case:** Legal (usecase: "legal")
**Trigger:** Client needs employment contract draft.
**Preconditions:**
- Legal tenant configured with `usecase: 'legal'`
- Contract template in tenant's TenantData `document-configuration`
- Clause library in TenantData `setup-configuration`
- Chatbot prompt: "Draft employment contract using clause library"

**Steps:**
1. Legal associate opens contract BR → Contract Drafting substage
2. `onlyoffice-editor` loads employment contract template from legal tenant's TenantData
3. Auto-fill: DAISY reads `customData.contract` (parties, terms, salary, role)
4. DAISY uses `edit_content` to populate party details, role description
5. Associate asks: "Add standard non-compete clause for NSW"
6. DAISY reads clause library, inserts non-compete clause via `edit_content`
7. Associate modifies clause duration from 12 to 6 months
8. Associate exports as .docx for client review

**Expected Outcome:** Contract drafted with SAME editor block as council — only config differs.
**Acceptance Criteria:**
- Editor loads for `usecase: 'legal'` tenant without errors
- Legal-specific template loaded (not council template)
- Clause library from legal tenant's TenantData used
- 12 tool calls work identically to council scenario
- ZERO code changes needed for legal use case

---

### BS-55: Healthcare Clinic — Patient Discharge Summary

**Actor:** Clinical Staff (tenant-staff, healthcare usecase)
**Use Case:** Healthcare (usecase: "healthcare")
**Trigger:** Patient discharge, summary document required.
**Preconditions:**
- Healthcare tenant configured with `usecase: 'healthcare'`
- Discharge summary template in TenantData
- `customData.patient` populated with diagnosis, medications, follow-up

**Steps:**
1. Clinical staff opens patient BR → Discharge substage
2. `onlyoffice-editor` loads discharge summary template
3. Auto-fill: DAISY reads `customData.patient` and populates:
   - Patient demographics
   - Diagnosis and treatment summary
   - Medication list (from `customData.patient.medications[]`)
   - Follow-up instructions
4. DAISY uses `edit_table` for medication table (drug, dose, frequency)
5. Staff reviews, adds specific discharge notes
6. Export as PDF for patient

**Expected Outcome:** Same editor block works for healthcare use case.
**Acceptance Criteria:**
- Editor works for `usecase: 'healthcare'`
- Healthcare-specific template and prompt used
- Patient data populated from healthcare customData paths
- ZERO code changes needed

---

### BS-56: New Tenant Onboarding — Zero Code Changes

**Actor:** Tenant Admin (new tenant, any usecase)
**Use Case:** New usecase (e.g., "insurance")
**Trigger:** Insurance company wants to use Configurator with document editing.
**Preconditions:**
- New tenant created with `usecase: 'insurance'`
- No insurance-specific code exists in the platform

**Steps:**
1. Insurance admin logs in, creates tenant
2. Uploads claim assessment template (.docx) to TenantData `document-configuration`
3. Configures ChatBot prompts for insurance claim assessment
4. Uses workflow builder to add `onlyoffice-editor` block to Claims Assessment page
5. Configures block: `dataConfig.loadFromPath: 'customData.claim.reportUrl'`
6. Staff user opens a claim BR → Claims Assessment page
7. Editor loads insurance claim template — auto-fill from `customData.claim`
8. All 12 tool calls work
9. Document saved to `customData.claim.reportUrl`

**Expected Outcome:** New use case works with ZERO code changes — config only.
**Acceptance Criteria:**
- No code deployment needed for insurance use case
- Template, prompts, and data paths all configured via admin UI
- Editor block works identically to council/retail/legal scenarios
- Onboarding completed in <1 hour

---

### BS-57: Victorian Council — Different Workflow Stages

**Actor:** Victorian Council Assessor (tenant-staff)
**Use Case:** Australian Victorian Government Council (usecase: "council")
**Trigger:** Victorian council has different planning framework than NSW.
**Preconditions:**
- Victorian tenant with `usecase: 'council'` but different workflow
- Victorian planning workflow: Application → Assessment → Decision (different from NSW's 6 substages)
- Victorian-specific templates in TenantData

**Steps:**
1. Victorian council configures their own workflow stages (not NSW's)
2. Workflow builder adds `onlyoffice-editor` to Victorian "Assessment" stage
3. Victorian assessment template loaded (no EPA Act references — Victorian legislation)
4. DAISY auto-fill uses Victorian-specific prompt (references Planning and Environment Act 1987)
5. Assessor drafts assessment report in Victorian format
6. Same 12 tool calls, same editor block — different templates and prompts

**Expected Outcome:** NSW and Victorian councils use SAME editor with different config.
**Acceptance Criteria:**
- Victorian workflow stages work without code changes
- Victorian templates have no NSW-specific content (EPA, SEPP, LEP)
- Auto-fill prompt references Victorian legislation
- Block is workflow-stage agnostic

---

### BS-58: Multi-UseCase Tenant — Council + Retail Hybrid

**Actor:** Tenant Admin managing hybrid tenant
**Use Case:** Combined council and retail
**Trigger:** Local government authority that also manages commercial leases.
**Preconditions:**
- Tenant has hybrid `usecase` or multiple workflows
- Both DA assessment and lease management workflows exist

**Steps:**
1. Admin configures two workflow types under one tenant
2. DA assessment workflow uses council templates and prompts
3. Lease management workflow uses retail/commercial templates and prompts
4. Same `onlyoffice-editor` block on both workflows
5. Template selection driven by workflow context (different pages, different templates)
6. Staff assessor works on DA report, switches to lease document — both use editor
7. Data isolation between workflow types maintained via BusinessRequest context

**Expected Outcome:** Single tenant uses editor for multiple business domains.
**Acceptance Criteria:**
- Different templates per workflow type within same tenant
- No cross-contamination between DA and lease documents
- Same editor block, different block configs per page
- ChatBot prompts scoped to workflow context

---

## Scenario Summary

| Category | Count | Focus |
|----------|-------|-------|
| 1. Lodgement Stage | 5 | BS-04 to BS-08 |
| 2. Assessment Substages | 8 | BS-09 to BS-16 |
| 3. Multi-Tenant Variations | 5 | BS-17 to BS-21 |
| 4. DAISY Chatbot Interactions | 6 | BS-22 to BS-27 |
| 5. Edge Cases and Errors | 6 | BS-28 to BS-33 |
| 6. External Integration | 5 | BS-34 to BS-38 |
| 7. Document Lifecycle | 5 | BS-39 to BS-43 |
| 8. Admin and Builder | 5 | BS-44 to BS-48 |
| 9. Referral-Specific | 4 | BS-49 to BS-52 |
| 10. Universal Architecture | 6 | BS-53 to BS-58 |
| **Total** | **55** | **3 seed + 52 generated** |

**Distribution**: ~42 NSW council scenarios (Categories 1-5, 7, 9) + ~6 universal
architecture validation (Category 10) + ~5 external integration (Category 6) +
~5 admin/builder (Category 8). Balance matches the "build universal, ship for
councils" directive.
