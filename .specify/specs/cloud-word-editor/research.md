---
date: '2026-03-03T22:00:00Z'
researcher: Claude
feature: 'Cloud Word Chatbot Editor'
status: complete
---

# Research: Cloud Word Chatbot Editor

## Feature Summary

A **universal, use-case-agnostic** ONLYOFFICE Document Server editor block for
the Configurator platform that enables .docx editing with AI chatbot integration.
Built for ANY tenant type (council, retail, legal, healthcare) via the three-tier
config system — but today's delivery target is **Australian NSW government council
DA assessment workflow**.

**Critical Design Constraint**: ZERO hardcoded business logic in the block code.
All domain-specific behaviour comes from:
1. **Block config** (presentationConfig, dataConfig, businessLogic)
2. **TenantData** (per-tenant templates, prompts, branding)
3. **TenantSchemas** (dynamic field extensions per tenant)

## Codebase Analysis

### Where to Implement

| Component | Location | Purpose |
|-----------|----------|---------|
| ONLYOFFICE Block Config | `Configurator/src/blocks/OnlyofficeEditor/index.ts` | PayloadCMS block schema (presentationConfig, dataConfig, businessLogic) |
| ONLYOFFICE Block Component | `Configurator/src/blocks/OnlyofficeEditor/Component.tsx` | React client component embedding ONLYOFFICE iframe |
| Tool Translation Layer | `Configurator/src/blocks/OnlyofficeEditor/tools/` | Translates 12 tool call JSON → Document Builder macros |
| ONLYOFFICE API Routes | `Configurator/src/app/api/onlyoffice/` | JWT generation, callback handler, document management |
| Zustand Store | `Configurator/src/stores/onlyoffice-editor.store.ts` | Editor state management (per-businessRequestId) |
| Block Registration | `Configurator/src/blocks/block-components-registry.ts` | Add `'onlyoffice-editor'` → Component mapping |
| Block System | `Configurator/src/blocks/blocks-system.tsx` | Add to `STATIC_BLOCK_REGISTRY` |
| TenantData Config | TenantData `document-configuration` dataType | Per-tenant .docx templates and ONLYOFFICE server config |
| npm Package | `packages/cloud-word-editor/` (new) | Standalone package for external consumers |

### Existing Patterns to Follow

#### Pattern 1: Block Three-Tier Configuration

Found in: `Configurator/src/blocks/DocumentEditor/index.ts:1-322`

```typescript
export const DocumentEditorBlock: Block = {
  slug: 'document-editor',
  fields: [
    layoutZoneField,
    {
      name: 'presentationConfig',
      type: 'group',
      fields: [
        { name: 'height', type: 'select', defaultValue: 'full', options: [...] },
        { name: 'showToolbar', type: 'checkbox', defaultValue: true },
      ],
    },
    {
      name: 'dataConfig',
      type: 'group',
      fields: [
        { name: 'savePath', type: 'text' },      // nested customData path
        { name: 'loadFromPath', type: 'text' },   // auto-load document URL
        { name: 'autoSave', type: 'checkbox', defaultValue: true },
      ],
    },
    {
      name: 'businessLogic',
      type: 'group',
      fields: [
        { name: 'chatbotInsertEnabled', type: 'checkbox', defaultValue: false },
      ],
    },
    customDataField,
  ],
}
```

Why relevant: The new `onlyoffice-editor` block MUST follow this exact pattern.
Config groups keep presentation, data, and business logic separated. The `savePath`
and `loadFromPath` pattern enables any workflow to use the block without hardcoding
paths.

#### Pattern 2: CustomEvent Communication Bridge

Found in: `Configurator/src/blocks/DocumentEditor/Component.tsx:503-548`

```typescript
// ChatBot dispatches tool call to editor
window.dispatchEvent(new CustomEvent('document-editor-tool-call', {
  detail: { toolName, input, callbackId }
}))

// Editor executes tool, dispatches result back
window.dispatchEvent(new CustomEvent('document-editor-tool-result', {
  detail: { callbackId, result }
}))
```

Event names in the protocol:
- `document-editor-tool-call` — ChatBot → Editor (tool execution request)
- `document-editor-tool-result` — Editor → ChatBot (tool execution result)
- `document-editor-new-turn` — ChatBot → Editor (new conversation turn)
- `chatbot-auto-fill` — Editor → ChatBot (trigger auto-fill)
- `chatbot-auto-fill-complete` — ChatBot → Editor (auto-fill finished)
- `document-editor-export-request` — ChatBot → Editor (trigger export)

Why relevant: The ONLYOFFICE editor MUST use the SAME event protocol so the
existing ChatBot block works without modification. The `callbackId` pattern
enables request-response correlation.

#### Pattern 3: Block Component Props

Found in: `Configurator/src/blocks/DocumentEditor/Component.tsx:68-100`

```typescript
export const DocumentEditorBlock = React.memo(function DocumentEditorBlock({
  presentationConfig = {},
  dataConfig = {},
  businessLogic = {},
  businessRequestId = 'poc-demo',
  tenantId,
  tenantSlug,
  customData,
  disableInnerContainer = false,
}: DocumentEditorBlockConfig) {
  // Destructure with defaults
  const { height = 'full', showToolbar = true } = presentationConfig
  const { savePath, autoSave = false, loadFromPath } = dataConfig
  const { chatbotInsertEnabled = false } = businessLogic
  // ...
})
```

Why relevant: Every block receives these context props automatically from the
block rendering system. The ONLYOFFICE block gets `tenantId`, `tenantSlug`,
`businessRequestId` for free — use them for tenant isolation and document scoping.

#### Pattern 4: TenantData Fetching

Found in: `Configurator/src/presentation/hooks/useTenantData.ts:1-95`

```typescript
const { data: docConfig } = useTenantData<DocumentConfigData>(
  tenantId,
  'document-configuration'
)
```

Why relevant: The ONLYOFFICE block reads per-tenant templates and server config
from TenantData. Uses TanStack Query with 5-minute staleTime for automatic
caching and deduplication.

#### Pattern 5: Auto-Save to customData

Found in: `Configurator/src/blocks/DocumentEditor/useAutoSave.ts` and
`Configurator/src/app/api/document-editor/auto-save/route.ts`

```typescript
// Client: debounced save
const save = useCallback(async () => {
  await fetch('/api/document-editor/auto-save', {
    method: 'PUT',
    body: JSON.stringify({ html, savePath, businessRequestId, tenantId }),
  })
}, [editor, savePath, businessRequestId, tenantId])

// Server: nested path resolution
const pathParts = savePath.split('.')  // e.g. 'assessment.documentUrl'
let target = customData
for (const key of pathParts.slice(0, -1)) {
  target[key] ??= {}
  target = target[key]
}
target[pathParts.at(-1)] = value
```

Why relevant: ONLYOFFICE uses a callback URL pattern for saves (server pushes
to our endpoint), but the customData update pattern is the same — navigate a
dotted path to write the document URL.

#### Pattern 6: Zustand Store (Per-BusinessRequest)

Found in: `Configurator/src/stores/document-editor.store.ts:1-90`

```typescript
export const useDocumentEditorStore = create<DocumentEditorState>()(
  devtools((set) => ({
    isDirtyByRequest: {},
    draftHtmlByRequest: {},
    // Actions keyed by businessRequestId
    setDirty: (brId, dirty) => set(s => ({
      isDirtyByRequest: { ...s.isDirtyByRequest, [brId]: dirty }
    })),
  }), { name: 'DocumentEditorStore' })
)
```

Why relevant: Multi-instance support. Multiple editor blocks on different
workflow pages share state via businessRequestId keys. The ONLYOFFICE store
should track: `documentKeyByRequest`, `editingStatusByRequest`,
`lastSavedVersionByRequest`.

#### Pattern 7: Block Registration

Found in: `Configurator/src/blocks/block-components-registry.ts:141`

```typescript
export const BLOCK_COMPONENTS_MAP: Record<string, ComponentType<any>> = {
  'document-editor': DocumentEditorComponent,
  'chatbot': ChatBotComponent,
  // Add: 'onlyoffice-editor': OnlyofficeEditorComponent,
}
```

And in: `Configurator/src/blocks/blocks-system.tsx:125`

```typescript
export const STATIC_BLOCK_REGISTRY: Block[] = [
  DocumentEditorBlock,
  ChatBotBlock,
  // Add: OnlyofficeEditorBlock,
]
```

Why relevant: Two-step registration — config schema in STATIC_BLOCK_REGISTRY,
React component in BLOCK_COMPONENTS_MAP. The block slug must match exactly.

### Integration Points

1. **ChatBot ↔ ONLYOFFICE Editor** (CustomEvent bridge):
   - Reuse the SAME 6 event names from the existing protocol
   - ChatBot doesn't need to know whether it's talking to TipTap or ONLYOFFICE
   - The tool translation layer converts tool call JSON → Document Builder macros

2. **Azure Blob Storage** (document persistence):
   - Existing pattern: `doc.fileInfo.dataLakeUrl` for download URLs
   - Upload via: `POST /api/admin/documents/upload` or direct Blob SAS URL
   - ONLYOFFICE callback saves the edited .docx back to Blob Storage

3. **Documents Collection** (metadata and versioning):
   - Store edited .docx as Document records linked to BusinessRequest
   - Security levels: public, internal, confidential, restricted
   - Existing hooks: `linkToBusinessRequest`, `updateBusinessRequestDocumentValidation`

4. **BusinessRequest.customData** (workflow state):
   - Assessment entity stores `documentUrl` at `customData.assessment.documentUrl`
   - Determination letter at `customData.determinationLetter`
   - Pattern: `savePath` config points to the customData location

5. **Workflow Pages** (pageDefinitionUtils.ts):
   - Assessment Assessments page (line 6456): Currently uses DocumentEditor
   - Determination page (line 3694): Uses `rfi-draft-message` for letter
   - ONLYOFFICE block can be placed on ANY workflow page via builder config

6. **TenantData** (per-tenant configuration):
   - `document-configuration` dataType: stores document type definitions
   - Will store: ONLYOFFICE server URL, JWT secret, .docx templates per tenant
   - ChatBot collection: stores per-tenant auto-fill prompts

7. **Entra ID Authentication** (token flow):
   - B2C token in `token` cookie → `getMeUser()` → API routes
   - ONLYOFFICE JWT is separate — generated server-side for editor auth
   - User identity from Entra flows to audit trail on document saves

8. **TenantSchemas** (dynamic field extensions):
   - Block schemas (`schemaTarget: 'block'`, `blockSlug: 'onlyoffice-editor'`)
   - Allow per-tenant custom fields on the editor block
   - Cache invalidation via `BlockCacheSingleton` on schema change

### Related Code

**DocumentEditor Block (existing TipTap):**
- `Configurator/src/blocks/DocumentEditor/index.ts` — Block config (322 lines)
- `Configurator/src/blocks/DocumentEditor/Component.tsx` — Main component (600+ lines)
- `Configurator/src/blocks/DocumentEditor/tools/toolSchemas.ts` — 12 tool schemas
- `Configurator/src/blocks/DocumentEditor/tools/toolExecutor.ts` — Tool registry + dispatch
- `Configurator/src/blocks/DocumentEditor/tools/contentRunner.ts` — edit_content runner
- `Configurator/src/blocks/DocumentEditor/tools/tableRunner.ts` — edit_table runner (600 lines)
- `Configurator/src/blocks/DocumentEditor/components/AIEditReviewBar.tsx` — Accept/reject AI edits
- `Configurator/src/blocks/DocumentEditor/useAutoFillService.ts` — Background auto-fill (550 lines)
- `Configurator/src/blocks/DocumentEditor/useAutoSave.ts` — Debounced auto-save
- `Configurator/src/blocks/DocumentEditor/docx/export.ts` — TipTap → .docx (400 lines)
- `Configurator/src/blocks/DocumentEditor/docx/import.ts` — .docx → HTML (600 lines)

**ChatBot Block:**
- `Configurator/src/blocks/ChatBot/index.ts` — Block config (1300 lines)
- `Configurator/src/blocks/ChatBot/Component.tsx` — Main component (800+ lines)
- `Configurator/src/collections/ChatBot/index.ts` — ChatBot collection (64+ fields)

**Assessment Workflow:**
- `Configurator/src/domain/entities/assessment.entity.ts` — Assessment entity
- `Configurator/src/domain/entities/referral.entity.ts` — Referral entity
- `Configurator/src/domain/entities/review.entity.ts` — Review entity
- `Configurator/src/domain/entities/determination.entity.ts` — Determination entity
- `Configurator/src/domain/entities/business-request-entity.ts:44-85` — customData interface
- `Configurator/src/app/api/custom-business-requests/[id]/assessment/route.ts` — Assessment API
- `Configurator/src/app/api/custom-business-requests/[id]/referrals/route.ts` — Referrals CRUD
- `Configurator/src/app/api/custom-business-requests/[id]/reviews/route.ts` — Reviews CRUD
- `Configurator/src/app/api/custom-business-requests/[id]/determination-letter/route.ts` — Letter API
- `Configurator/src/app/api/custom-business-requests/[id]/determination-notification/route.ts` — Notification
- `Configurator/src/app/api/custom-business-requests/[id]/workflow-progress/route.ts` — Stage transitions

**Multi-Tenant:**
- `Configurator/src/collections/Tenants/index.ts` — Tenant collection (usecase field at lines 201-226)
- `Configurator/src/collections/TenantData/index.ts` — 18+ dataTypes, `document-configuration`
- `Configurator/src/collections/TenantSchemas/index.ts` — Dynamic field extensions
- `Configurator/src/presentation/hooks/useTenantData.ts` — TanStack Query hook

**Infrastructure:**
- `Configurator/src/utilities/pageDefinitionUtils.ts` — Workflow page definitions (9500+ lines)
- `Configurator/src/blocks/block-components-registry.ts` — Block → Component mapping
- `Configurator/src/blocks/blocks-system.tsx` — Block registry + rendering
- `Configurator/src/stores/document-editor.store.ts` — Zustand state management

## Technology Decisions

### Decision 1: ONLYOFFICE Document Server (Self-Hosted)

- **Choice**: ONLYOFFICE Document Server Developer Edition
- **Rationale**: Best .docx fidelity (~95%), most Word-like UI (ribbon interface),
  real-time collaboration, self-hosted for data residency, Azure Marketplace
  availability, Document Builder API for programmatic editing
- **Alternatives considered**: 12 options evaluated (see `deep-research-reference.md`):
  - Syncfusion (90% fidelity, npm install, but no ribbon UI, toolbar-based)
  - Collabora Online (85%, LibreOffice engine, government deployments)
  - Apryse (85%, best WCAG, $30-100K/yr premium)
  - CKEditor 5 (70%, HTML-based, NOT native DOCX)
  - docx-js-editor (75%, MIT license, v0.0.x maturity)
  - SharePoint Embedded (100% fidelity, but opens in NEW TAB, not embedded)
  - Microsoft Word Online (CSP blocks embedding — IMPOSSIBLE)
- **Architecture**: OnlyOffice is a **stateless editing engine** — it does NOT
  store files (unlike SharePoint). Files remain in Azure Blob Storage. The
  Document Server fetches docs via URL, renders the editor UI, and POSTs
  modified files back to your callback URL.
- **Product Selection**: OnlyOffice offers 5 products — only **Docs Developer
  Edition** is designed for embedding into custom applications:

  | Product | Type | Embed Into Your App? | Why / Why Not |
  |---------|------|---------------------|---------------|
  | Docs Community | Self-hosted | No (AGPL viral license) | AGPL requires open-sourcing your app |
  | Docs Enterprise | Self-hosted | No (DMS connectors only) | Designed for Nextcloud/Moodle/etc, not custom apps |
  | **Docs Developer** | **Self-hosted** | **Yes (perpetual license)** | **Only product with embedding rights** |
  | DocSpace | SaaS/Self-hosted | No (standalone rooms platform) | Separate collaboration platform, not an embeddable editor |
  | Workspace | Self-hosted | No (full office suite) | CRM+mail+projects+docs — complete suite, not component |

- **Docs Developer Edition pricing** (one-time perpetual, NOT subscription):
  - Basic: $2,390 (1 server, 20 connections, 5 support incidents)
  - Plus: $4,290 (1 server, 20 connections, 10 support incidents)
  - Premium: $5,590 (1 server, 20 connections, 20 support incidents)
  - All tiers: updates included for 1 year, then ~$1,000/yr renewal optional

- **Other editions for reference**:
  - Enterprise: $2,400-$4,200/yr (annual subscription, for DMS integration)
  - DocSpace: Free (up to 12 users), $12/admin/month (Business), $15/admin/month (Enterprise)
  - Workspace: $5-$8/user/month

- **Cost estimate**: Developer Edition Basic $2,390 one-time + ~$600-$1,200/yr
  Azure App Service hosting. Community Edition (free, AGPL) for dev/testing.

### Decision 2: Document Builder API for Tool Call Translation

- **Choice**: ONLYOFFICE Document Builder macros via `executeMethod('RunMacro')`
- **Rationale**: The 12 existing tool call schemas (`edit_content`, `edit_table`,
  etc.) operate on TipTap-specific concepts (nodeIndex, JSON content tree). For
  ONLYOFFICE, we need a translation layer that converts these JSON schemas into
  Document Builder JavaScript macros that operate on the OOXML document model.
- **Approach**: Macro Translation Layer:
  1. ChatBot dispatches `{ toolName: 'edit_content', input: { edits: [...] } }`
  2. Translation layer converts to Document Builder script
  3. `executeMethod('RunMacro', { Macro: script })` executes in ONLYOFFICE
  4. Result mapped back to `ToolResult` format for ChatBot
- **Alternative**: ONLYOFFICE JS API (`connector.callCommand()`) for simpler ops

### Decision 3: Coexistence with Existing TipTap Editor

- **Choice**: New block (`onlyoffice-editor`) alongside existing `document-editor`
- **Rationale**: The TipTap editor handles rich text editing well for non-.docx
  use cases (HTML content, inline editing). ONLYOFFICE is specifically for native
  .docx round-tripping. Both blocks share the same ChatBot protocol.
- **Migration**: Workflow builders choose which editor to place on each page.
  No forced migration — both coexist permanently.

### Decision 4: Azure App Service Container Deployment (Per-Region)

- **Choice**: Docker containers on Azure App Service (Container), one instance
  per region. AKS is overkill unless 100+ concurrent editing sessions needed.
- **Rationale**: Fits the existing Azure ecosystem (App Services, SWA already
  in use). Data residency requires document processing in the customer's Azure
  region. ONLYOFFICE available on Azure Marketplace.
- **Architecture**:
  ```
  ┌─────────────────────────────────────────────────────┐
  │                      Azure                           │
  │                                                      │
  │  ┌──────────────┐       ┌──────────────────────┐    │
  │  │ SWA / App    │       │ App Service          │    │
  │  │ Service      │──────▶│ (OnlyOffice Docker)  │    │
  │  │ (Your App)   │       │ (private VNet)       │    │
  │  └──────┬───────┘       └──────────┬───────────┘    │
  │         │                          │                 │
  │         │   callback URL           │ fetches file    │
  │         │◀─────────────────────────┘ (SAS URL)      │
  │         │                                            │
  │         ▼                                            │
  │  ┌──────────────┐                                    │
  │  │ Azure Blob   │                                    │
  │  │ Storage      │                                    │
  │  └──────────────┘                                    │
  └─────────────────────────────────────────────────────┘
  ```
- **Hosting options**: App Service Container (~$50-100/mo, recommended),
  Container Instance (~$50-100/mo, simplest), AKS (only for high concurrency).
- **Networking**: Private VNet, Managed Identity for Blob access.

### Decision 4b: Document Save Flow (Forcesave Pattern)

- **Choice**: Server-side forcesave on a 2-3 minute timer + manual Ctrl+S
- **Rationale**: OnlyOffice does NOT support direct autosave to Azure Blob.
  All saves flow through: Editor → Document Server cache → callback/forcesave →
  backend → Azure Blob. Built-in autosave only caches internally.
- **Save approaches**:
  | Approach | Trigger | Latency to Blob |
  |----------|---------|-----------------|
  | Default callback | Last user closes doc | Minutes after close |
  | Server-side forcesave cron | Timer (every 2-3 min) | 2-3 min |
  | Client-side event → API → forcesave | User Ctrl+S | Seconds |
  | `onRequestSave` editor event | Editor internal save | ~2 min |

### Decision 4c: Scaling & Multi-Tenancy

- **Choice**: Tenant-agnostic OnlyOffice with existing multi-tenant plugin
- **Rationale**: OnlyOffice is tenant-agnostic — just edits files. All tenant
  isolation handled by existing `@payloadcms/plugin-multi-tenant` and OPA ACL.
- **Scaling by concurrent editors**:
  | Concurrent Editors | OnlyOffice Setup | Azure Hosting |
  |--------------------|-----------------|---------------|
  | 1-20 | Community Edition | App Service B2 |
  | 20-250 | Developer Edition | App Service P1v3 |
  | 250-1000 | Multiple containers + LB | App Service + Front Door |
  | 1000+ | Kubernetes cluster | AKS |
- **Key insight**: 10,000 tenants ≠ 10,000 concurrent editors. At 2-5%
  simultaneous editing, that's 200-500 connections — single Developer Edition.
- **Risk**: Callback reliability — dead-letter queue or retry on callback endpoint.

### Decision 5: npm Package for External Integration

- **Choice**: `@eai/cloud-word-editor` npm package with React component + web component
- **Rationale**: External consumers (DAISY repo, third-party businesses) need
  drop-in integration without Configurator knowledge. Package wraps ONLYOFFICE
  iframe + tool call API in a framework-agnostic component.
- **API surface**: <5 required props: `documentUrl`, `authToken`, `onSave`,
  optional `chatbotApi`, `theme`

### Decision 6: JWT Authentication for ONLYOFFICE

- **Choice**: Server-generated JWT tokens per document session
- **Rationale**: ONLYOFFICE Document Server validates JWT on every request.
  JWT contains document key, user info, permissions (edit/view), callback URL.
  Generated by a new API route (`/api/onlyoffice/token`) using the Entra ID
  user context.
- **Token flow**:
  1. User opens editor → client calls `/api/onlyoffice/token`
  2. Server verifies Entra session, generates JWT with document permissions
  3. JWT sent to ONLYOFFICE Document Server iframe via config
  4. ONLYOFFICE validates JWT on load + on each callback

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type | Description | Impact on Implementation |
|-----------------|-------------|--------------------------|
| Framework | PayloadCMS 3.75 (strict compatibility), Next.js 16, ES modules only | All new code must follow PayloadCMS block patterns |
| Database | MongoDB (single `customData` JSON field pattern) | Document URLs stored as strings in customData, not separate collection |
| API Compatibility | 12 existing tool call schemas used by ChatBot | Must maintain identical schema interfaces; translation happens internally |
| Performance | Editor load <3 seconds on 10 Mbps | ONLYOFFICE iframe + JS SDK must load within budget |
| Multi-tenant | 10,000+ tenants with `usecase` field isolation | Block registered WITHOUT usecase filter; available to ALL tenants |
| Accessibility | WCAG 2.1 AA (government requirement) | ONLYOFFICE lacks formal WCAG cert — may need remediation |
| CustomEvent Protocol | 6 event names used by ChatBot ↔ Editor bridge | Must reuse exact same events for ChatBot compatibility |

### Technical Debt to Avoid

| Pattern | Found In | Why Avoid | Use Instead |
|---------|----------|-----------|-------------|
| mammoth.js import | DocumentEditor/docx/import.ts | ~85% fidelity, HTML intermediary | ONLYOFFICE native .docx (95%) |
| `docx` npm export | DocumentEditor/docx/export.ts | ~90% fidelity, TipTap→OOXML conversion | ONLYOFFICE native save (95%) |
| Server-side Puppeteer PDF | api/document-editor/export-pdf | Heavy, slow, Node dependency | ONLYOFFICE built-in PDF export |
| HTML-based document model | TipTap internal representation | Lossy .docx round-trip | OOXML-native editing |

### Areas Requiring Extra Caution

- **pageDefinitionUtils.ts** (9500+ lines): Complex, fragile. When adding ONLYOFFICE
  block to assessment pages, modify carefully. Each page definition function is
  self-contained but shares utility helpers.
- **CustomEvent timing**: ChatBot expects `document-editor-tool-result` within
  the same event loop tick or shortly after. ONLYOFFICE macro execution is async —
  ensure the promise resolution dispatches the result event correctly.
- **ONLYOFFICE callback URL**: The Document Server POSTs to a callback URL on
  save/close. This URL must be accessible from the App Service Container to the
  Configurator app. In local dev, requires tunneling (ngrok or similar).
- **Autosave to Blob is NOT direct**: OnlyOffice's built-in autosave only caches
  internally in the Document Server. To persist to Azure Blob, use forcesave API
  (server-side timer every 2-3 min recommended) or default callback (on close).
- **Callback tenant isolation**: OnlyOffice callback sends edited file to ONE URL.
  Your callback handler must parse tenantId + documentId from document key, verify
  tenant ACL via Payload access control, then save to tenant-scoped blob path.
- **BlockCacheSingleton awareness**: When document saved back from OnlyOffice, hooks
  depending on cached data (Assessment, Retention, Classification blocks) must be
  triggered correctly.
- **JWT secret management**: ONLYOFFICE JWT secret must be per-tenant (stored in
  TenantData) or per-environment. Never hardcode.

### Integration Requirements

| Existing Service | Integration Method | Notes |
|------------------|-------------------|-------|
| ChatBot Block | CustomEvent protocol (6 events) | Zero changes to ChatBot needed |
| Azure Blob Storage | REST API (SAS URL upload/download) | Per-region blob containers |
| Documents Collection | Payload API (create/update) | Link .docx docs to BusinessRequests |
| Entra ID | Cookie-based session (`getMeUser()`) | JWT generated from Entra user context |
| TenantData | `useTenantData()` hook | Read templates, server config per tenant |
| Workflow Progress | Existing API routes | No changes — editor is workflow-agnostic |
| Audit Logs | Existing `AuditService.log()` | Log document open/save/export events |

### Downstream Dependencies

Code that depends on areas we're modifying:

- `Configurator/src/blocks/blocks-system.tsx` — Adding new block to registry affects all page rendering
- `Configurator/src/blocks/block-components-registry.ts` — New import affects client bundle size
- `Configurator/src/utilities/pageDefinitionUtils.ts` — Adding ONLYOFFICE to assessment pages
- `Configurator/src/collections/TenantData/index.ts` — Adding new dataType option

## Constraints & Considerations

- **Microsoft Word Online CANNOT be embedded** — CSP frame-ancestors restriction,
  confirmed by Microsoft, no roadmap to change. This is why we need ONLYOFFICE.
- **ONLYOFFICE is a stateless editing engine** — does NOT store files (unlike
  SharePoint). Files remain in Azure Blob. Document Server only renders/edits.
- **ONLYOFFICE Community Edition** is AGPL-licensed (viral — requires open-sourcing
  your app) and capped at 20 concurrent connections. The Developer Edition
  ($2,390+ one-time) provides embedding rights and same 20 connections per server.
- **ONLYOFFICE lacks formal WCAG 2.1 AA certification** — may need accessibility
  remediation for government procurement. CKEditor 5 and Apryse have formal VPATs.
- **Document Builder macros execute asynchronously** — tool call response latency
  will be higher than TipTap's synchronous DOM operations (~50-200ms vs ~5ms).
- **ONLYOFFICE iframe is cross-origin** — communication via postMessage API, not
  direct DOM access. Tool call translation MUST use the official JS API connector.
- **No direct autosave to Azure Blob** — all saves go through Document Server
  cache first, then callback/forcesave to your backend. Forcesave on 2-3 min
  timer recommended.
- **Multi-region**: Each Azure region needs its own ONLYOFFICE Document Server
  App Service Container. Client-side alternatives (Syncfusion, Apryse) avoid this.
- **External integration complexity**: npm package consumers need access to an
  ONLYOFFICE Document Server instance. Unlike a pure client-side SDK, this adds
  infrastructure requirements for external consumers.

## Open Questions

- [x] ~~ONLYOFFICE Developer Edition licensing: per-server or per-connection pricing?~~
  **RESOLVED**: One-time purchase. Basic $1,950, Plus $3,500, Premium $4,500.
  20 concurrent connections per server. Cloud: $12/user/month.
- [ ] WCAG remediation scope: What specific accessibility gaps exist in ONLYOFFICE
  and how much effort to remediate for government procurement?
- [ ] External consumer deployment: Should the npm package include a Docker Compose
  for spinning up ONLYOFFICE Document Server, or assume consumers BYO server?

## Recommendations

1. **Register `onlyoffice-editor` block WITHOUT `usecase` filter** — available to
   ALL tenant types. Domain-specific behaviour comes entirely from TenantData
   templates and ChatBot prompts.

2. **Reuse the existing CustomEvent protocol verbatim** — the ChatBot block should
   work with both `document-editor` and `onlyoffice-editor` without modification.
   The editor block slug in the event names is already generic.

3. **Build the Macro Translation Layer as a standalone module** — maps the 12 tool
   call schemas to Document Builder scripts. This is the core technical challenge
   and should be independently testable.

4. **Store ONLYOFFICE server config in TenantData** — `document-configuration`
   dataType already exists. Add `onlyofficeServerUrl`, `onlyofficeJwtSecret`,
   and template references per tenant.

5. **Create the npm package as a thin wrapper** — `@eai/cloud-word-editor` wraps
   the ONLYOFFICE iframe config + tool call API. Domain-agnostic — no council,
   retail, or any business concepts in the package API.

6. **Deploy ONLYOFFICE on Azure App Service (Container)** — fits existing Azure
   ecosystem. One App Service Container instance per Azure region for data
   residency. AKS is overkill unless 100+ concurrent editing sessions needed.
   Put on private VNet, use Managed Identity for Blob access.

7. **Coexist with TipTap DocumentEditor** — don't replace it. Workflow builders
   choose which editor to place on each page. TipTap for HTML content, ONLYOFFICE
   for .docx documents.

8. **Use server-side forcesave on 2-3 minute timer** — OnlyOffice has no direct
   autosave to Blob. Combine forcesave cron with Ctrl+S for immediate saves.

9. **Start with Docs Developer Edition** — the ONLY product designed for
   embedding into custom apps. Basic tier ($2,390 one-time) covers 20 concurrent
   connections. Use Community Edition (free, AGPL) for dev/testing only.
   Enterprise and DocSpace are NOT suitable (wrong product category).

## Innovation Insights (from Industry Variants)

### Top Innovations to Consider

| Industry | Innovation | Application Potential |
|----------|------------|----------------------|
| Healthcare | Clinical document templates with mandatory sections | Enforced template structure via Document Builder — ensure assessors fill all required sections |
| Legal | Contract clause libraries with version tracking | Conditions of consent library with versioned clauses — reusable across DAs |
| Finance | Audit trail with per-character change attribution | Every AI edit attributed to DAISY with timestamp — full accountability for government use |
| Retail | Batch document generation from data | Generate 50+ determination letters from template + data array — batch processing via Document Builder |
| Education | Collaborative annotations with instructor feedback | Senior planner review comments with structured feedback categories — not just free-text |
| Manufacturing | Quality gate documents with sign-off workflows | Assessment review gates with mandatory checklist completion before sign-off |
| Logistics | Multi-language document generation | Multilingual determination letters for culturally diverse applicant base |

### Cross-Industry Pattern: Template + Data + AI = Document

Every industry follows the same pattern:
1. **Template** (from TenantData) defines document structure
2. **Data** (from BusinessRequest.customData) provides field values
3. **AI** (from ChatBot with tenant-specific prompts) drafts content
4. **Human** reviews, edits, approves

This validates the universal architecture: the block handles steps 1-3 generically,
the tenant configuration determines the specific template, data paths, and prompts.
