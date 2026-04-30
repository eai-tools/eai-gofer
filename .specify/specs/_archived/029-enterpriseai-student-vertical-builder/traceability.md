# Requirement Traceability: EnterpriseAI Student Vertical Builder

Validation status: **VALIDATION PASSED**

## Language-server Impact

- Explicitly validated as **none** for this feature scope; no `language-server/`
  code changes are required (T112).

## 1) Spec -> Plan -> Tasks Mapping

| Spec ID | Requirement                                                | Plan Reference(s)                  | Task(s)                                                                                                                                                                |
| ------- | ---------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-001  | EnterpriseAI Vertical App Discovery                        | P1.4, P3.1, P3.5, P5.3             | T005, T036, T037, T038, T039, T040, T041, T044, T045, T046, T054, T109, T111                                                                                           |
| US-002  | EnterpriseAI Architecture and Plan Generation              | P1.5, P2.3, P3.2, P3.3, P5.6       | T006, T017, T044, T045, T046, T050, T062, T063, T073, T110, T111                                                                                                       |
| US-003  | Marp Presentation Artifact Generation                      | P2.4, P3.4, P3.6, P5.2             | T018, T040, T041, T042, T043, T051, T052, T054, T055, T056, T058, T059, T068, T069, T070, T071, T074, T075, T077, T078, T086, T087, T095, T096, T108                   |
| US-004  | EnterpriseAI Deployment Guidance                           | P1.3, P2.2, P3.2, P3.3, P5.6, P5.7 | T004, T016, T044, T045, T046, T050, T062, T063, T064, T065, T066, T067, T068, T069, T070, T073, T110, T111                                                             |
| US-005  | Competitive and Market Analysis for Student Positioning    | P2.4, P3.1, P3.2, P3.6, P5.2       | T018, T036, T037, T040, T041, T042, T043, T044, T045, T051, T052, T055, T058, T059, T068, T069, T070, T071, T073, T074, T075, T077, T078, T086, T087, T095, T096, T108 |
| US-006  | All-Platform Artifact Parity After EAI Profile Updates     | P4.1, P4.2, P5.1, P5.2, P5.3       | T040, T041, T042, T043, T051, T052, T058, T059, T068, T069, T070, T077, T078, T079, T080, T081, T086, T087, T088, T095, T096, T108, T109, T111                         |
| US-007  | Existing Gofer Functionality Fully Preserved               | P1.6, P2.9, P4.3, P4.4, P5.3, P5.4 | T007, T008, T022, T053, T081, T082, T083, T087, T089, T090, T095, T096, T097, T109, T111                                                                               |
| FR-001  | EnterpriseAI Workflow Profile Activation                   | P1.1, P1.2, P4.4, P5.3             | T001, T002, T003, T082, T083, T096, T109, T111                                                                                                                         |
| FR-002  | EAI CLI and Vertical Template as First-Class Task Inputs   | P1.5, P2.3, P3.3, P5.6             | T006, T017, T045, T046, T050, T062, T063, T110, T111                                                                                                                   |
| FR-003  | Business and Competitive Analysis Artifact Generation      | P2.4, P3.1, P3.2, P3.6, P5.2       | T018, T036, T037, T040, T041, T042, T043, T044, T045, T051, T052, T055, T058, T059, T068, T069, T070, T071, T073, T074, T075, T077, T078, T086, T087, T095, T096, T108 |
| FR-004  | Marp Presentation Artifact Output                          | P2.4, P3.4, P5.2                   | T018, T040, T041, T042, T043, T051, T052, T054, T056, T058, T059, T068, T069, T070, T071, T074, T075, T077, T078, T086, T087, T095, T096, T108                         |
| FR-005  | Architecture Decision One-By-One Approval Loop             | P1.4, P3.5                         | T005, T036, T038, T039, T044, T045, T046, T054                                                                                                                         |
| FR-006  | Canonical-to-Mirror Artifact Propagation                   | P4.1, P4.2, P5.1, P5.3             | T079, T080, T081, T086, T088, T109, T111                                                                                                                               |
| FR-007  | Deployment Repository Convention Guidance                  | P1.3, P3.2, P3.3, P5.6, P5.7       | T004, T044, T045, T046, T050, T062, T063, T065, T067, T068, T069, T073, T110, T111                                                                                     |
| FR-008  | No Capability Removal Without Explicit Approval            | P1.4, P1.6, P2.9, P4.4, P5.4       | T005, T007, T008, T022, T038, T039, T053, T082, T083, T089, T090, T095, T096, T097                                                                                     |
| FR-009  | EnterpriseAI-Focused Extension Positioning                 | P1.2, P4.5, P5.2                   | T003, T040, T041, T042, T043, T051, T052, T058, T059, T068, T069, T070, T077, T078, T086, T087, T092, T095, T096, T099, T100, T108                                     |
| FR-010  | Graceful Fallback for Inaccessible External EAI References | P1.3, P2.2, P4.6, P5.2             | T004, T016, T040, T041, T042, T043, T051, T052, T058, T059, T064, T066, T068, T069, T070, T077, T078, T086, T087, T095, T096, T108                                     |

## 2) Acceptance Criteria Detail

| ID         | Criterion                                                                                                                                                                                                     | Task(s)                            | Phase                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------- |
| US-001.AC1 | The business scenario and discovery stage commands produce artifact content that references EnterpriseAI platform patterns and terminology as the primary delivery context.                                   | T036, T037, T040, T041             | Phase 3                       |
| US-001.AC2 | Discovery output includes a structured problem statement, target user persona, and value proposition shaped around EAI vertical app outcomes.                                                                 | T037, T040, T042, T043             | Phase 3                       |
| US-001.AC3 | No discovery stage output recommends or describes alternative non-EAI platform deployments as primary options.                                                                                                | T036, T040, T041                   | Phase 3                       |
| US-001.AC4 | A student running the full discovery flow completes it without external platform knowledge and arrives at an EAI-ready problem statement.                                                                     | T004, T042, T043, T108             | Phase 1, Phase 3, Final Phase |
| US-001.AC5 | The one-by-one architecture decision loop is presented to the student before any platform lock-in decisions are finalized.                                                                                    | T005, T038, T039, T098             | Phase 1, Phase 3, Phase 9     |
| US-002.AC1 | Plan artifacts reference EAI CLI commands and Vertical Template scaffolding steps as primary implementation guidance.                                                                                         | T045, T046, T050, T051, T052       | Phase 4                       |
| US-002.AC2 | Architecture outputs include an explicit EnterpriseAI integration map showing connections between the vertical app, EAI services, and deployment target.                                                      | T044, T045, T051                   | Phase 4                       |
| US-002.AC3 | Task breakdown (`tasks.md`) contains EAI-specific tasks ordered to produce a locally runnable and platform-deployable app.                                                                                    | T046, T063, T068                   | Phase 4, Phase 6              |
| US-002.AC4 | Competitive/market analysis artifact is generated during the research stage and referenced in the plan.                                                                                                       | T050, T051, T052, T071, T073, T077 | Phase 4, Phase 7              |
| US-002.AC5 | All generated artifacts remain consistent with the canonical command sources and do not drift from them across Copilot, Codex, and Gemini platform mirrors.                                                   | T079, T080, T086, T104             | Phase 8, Final Phase          |
| US-002.AC6 | Existing Gofer plan and architecture capabilities remain fully operational for non-EAI runs.                                                                                                                  | T053, T095, T096, T109             | Phase 4, Phase 9, Final Phase |
| US-003.AC1 | Stakeholder comms stage produces a Marp-compatible slide deck artifact (`.md` with Marp frontmatter) in the spec directory.                                                                                   | T054, T056, T058, T059             | Phase 5                       |
| US-003.AC2 | Deck content is populated from prior pipeline artifacts (discovery, spec, plan, implementation summary) without requiring manual copy-paste.                                                                  | T056, T060, T061                   | Phase 5                       |
| US-003.AC3 | Deck structure includes: problem statement, EnterpriseAI solution overview, architecture diagram reference, demo script summary, and measurable success criteria.                                             | T055, T060                         | Phase 5                       |
| US-003.AC4 | Marp output generation is opt-in per run (not forced on non-EAI or legacy runs) but is prominently featured as the default for EAI profile runs.                                                              | T054, T061                         | Phase 5                       |
| US-003.AC5 | Existing release notes and demo script outputs from the stakeholder comms stage are preserved and continue to function correctly.                                                                             | T056, T060, T061                   | Phase 5                       |
| US-004.AC1 | Task breakdown includes at least one explicit EAI CLI deployment task with the correct command syntax or a clearly referenced local guidance document.                                                        | T063, T065, T068                   | Phase 6                       |
| US-004.AC2 | Vertical Template scaffolding steps are included in the task breakdown before deployment tasks, in correct dependency order.                                                                                  | T063, T068                         | Phase 6                       |
| US-004.AC3 | Deployment tasks reference the EnterpriseAI deployment repository conventions (branch naming, environment targeting).                                                                                         | T045, T063, T068, T110             | Phase 4, Phase 6, Final Phase |
| US-004.AC4 | If EAI CLI docs are not accessible at runtime, the pipeline gracefully references local vendored guidance and informs the student of the limitation.                                                          | T064, T066, T070                   | Phase 6                       |
| US-004.AC5 | Implementation stage validates that deployment-required files (e.g., manifest, config) are present before marking deployment tasks complete.                                                                  | T062, T065, T067, T069             | Phase 6                       |
| US-005.AC1 | Research stage produces a structured competitive/market analysis artifact when the EAI profile is active.                                                                                                     | T071, T072, T077                   | Phase 7                       |
| US-005.AC2 | The analysis includes a comparison of at least three alternative approaches or tools.                                                                                                                         | T074, T077                         | Phase 7                       |
| US-005.AC3 | The analysis explicitly positions EnterpriseAI vertical app delivery as the chosen direction and states why.                                                                                                  | T071, T072, T075, T077             | Phase 7                       |
| US-005.AC4 | The artifact is referenced in both the spec and the plan as a supporting input when competitive analysis is enabled.                                                                                          | T073, T074, T077                   | Phase 7                       |
| US-005.AC5 | Competitive analysis depth can be disabled per run via a stage flag without breaking other pipeline stages; when disabled, the market-analysis artifact is still generated as a baseline traceability output. | T071, T072, T078                   | Phase 7                       |
| US-006.AC1 | The command generation workflow propagates EAI-profile content from canonical sources to all platform mirrors without manual editing of mirror files.                                                         | T079, T080, T084, T088             | Phase 8                       |
| US-006.AC2 | Parity integration tests pass after any canonical command update.                                                                                                                                             | T086, T104, T109, T111             | Phase 8, Final Phase          |
| US-006.AC3 | Runtime resource synchronization copies updated EAI-profile resources to runtime destinations on extension activation.                                                                                        | T081, T087                         | Phase 8                       |
| US-006.AC4 | No manual edits to mirror files are required or expected; all authoring happens in canonical sources.                                                                                                         | T079, T080, T088                   | Phase 8                       |
| US-006.AC5 | Existing cross-platform routing and provider behavior is preserved and no provider code paths are removed.                                                                                                    | T082, T083, T096                   | Phase 8, Phase 9              |
| US-007.AC1 | All existing unit and integration tests pass without modification after EAI profile changes.                                                                                                                  | T007, T008, T095, T096, T109       | Phase 1, Phase 9, Final Phase |
| US-007.AC2 | Cross-platform command parity tests pass for all supported platforms.                                                                                                                                         | T086, T104, T109                   | Phase 8, Final Phase          |
| US-007.AC3 | No existing provider, routing, or CLI detection code path is removed or disabled.                                                                                                                             | T082, T083, T096                   | Phase 8, Phase 9              |
| US-007.AC4 | Existing command outputs for non-EAI pipeline runs are identical to pre-update outputs.                                                                                                                       | T053, T095, T109                   | Phase 4, Phase 9, Final Phase |
| US-007.AC5 | No version upgrade triggers a deprecation or removal of any existing feature without an explicit, one-by-one user approval on record.                                                                         | T022, T089, T090, T094, T097       | Phase 2, Phase 9              |

## 3) Plan Phase Coverage

| Plan Phase                  | Plan Items | Mapped Items | Coverage | Unique Task Count | Missing Plan Items |
| --------------------------- | ---------- | ------------ | -------- | ----------------- | ------------------ |
| Phase 1 Setup/Foundation    | 6          | 6            | 100.0%   | 15                | None               |
| Phase 2 Data Layer          | 10         | 10           | 100.0%   | 32                | None               |
| Phase 3 Business Logic      | 7          | 7            | 100.0%   | 25                | None               |
| Phase 4 API/Interface Layer | 7          | 7            | 100.0%   | 16                | None               |
| Phase 5 Polish/Integration  | 8          | 8            | 100.0%   | 41                | None               |

## 4) Data Entity Coverage

| Data Entity                     | Task(s)                      | Phase(s)                           | Status  |
| ------------------------------- | ---------------------------- | ---------------------------------- | ------- |
| WorkflowProfileConfig           | T001, T002, T011             | Phase 1, Phase 2                   | Covered |
| PipelineRun                     | T011, T039, T091             | Phase 2, Phase 3, Phase 9          | Covered |
| EaiReferenceSource              | T012, T016, T064             | Phase 2, Phase 6                   | Covered |
| ArchitectureDecision            | T012, T038, T048, T049, T098 | Phase 2, Phase 3, Phase 4, Phase 9 | Covered |
| ArtifactRecord                  | T013, T018, T071             | Phase 2, Phase 7                   | Covered |
| TaskItem                        | T013, T046, T063, T068       | Phase 2, Phase 4, Phase 6          | Covered |
| MirrorPropagationRecord         | T014, T084, T085, T086       | Phase 2, Phase 8                   | Covered |
| CapabilityRemovalApprovalRecord | T014, T022, T089, T097       | Phase 2, Phase 9                   | Covered |

## 5) API/Contract Coverage

| Contract ID | Type         | Task(s)                                        | Phase(s)                               | Status  |
| ----------- | ------------ | ---------------------------------------------- | -------------------------------------- | ------- |
| EVT-001     | Event        | T030, T031, T047, T104, T106                   | Phase 2, Phase 4, Final Phase          | Covered |
| EVT-002     | Event        | T030, T031, T048, T104, T106                   | Phase 2, Phase 4, Final Phase          | Covered |
| EVT-003     | Event        | T030, T031, T049, T098, T104, T106             | Phase 2, Phase 4, Phase 9, Final Phase | Covered |
| EVT-004     | Event        | T030, T031, T066, T070, T104, T106             | Phase 2, Phase 6, Final Phase          | Covered |
| EVT-005     | Event        | T030, T031, T076, T077, T078, T104, T106       | Phase 2, Phase 7, Final Phase          | Covered |
| EVT-006     | Event        | T030, T031, T050, T051, T052, T104, T106       | Phase 2, Phase 4, Final Phase          | Covered |
| EVT-007     | Event        | T030, T031, T056, T057, T058, T059, T104, T106 | Phase 2, Phase 5, Final Phase          | Covered |
| EVT-008     | Event        | T030, T031, T085, T086, T087, T104, T106       | Phase 2, Phase 8, Final Phase          | Covered |
| EVT-009     | Event        | T030, T031, T092, T100, T104, T106             | Phase 2, Phase 9, Final Phase          | Covered |
| EVT-010     | Event        | T030, T031, T093, T095, T096, T104, T106       | Phase 2, Phase 9, Final Phase          | Covered |
| EVT-011     | Event        | T030, T031, T094, T097, T104, T106             | Phase 2, Phase 9, Final Phase          | Covered |
| EVT-012     | Event        | T030, T031, T067, T068, T069, T104, T106       | Phase 2, Phase 6, Final Phase          | Covered |
| EXT-001     | External API | T026, T034, T035, T105, T106                   | Phase 2, Final Phase                   | Covered |
| IAP-001     | Internal API | T001, T002, T047, T082, T105, T106             | Phase 1, Phase 4, Phase 8, Final Phase | Covered |
| IAP-002     | Internal API | T048, T098, T105, T106                         | Phase 4, Phase 9, Final Phase          | Covered |
| IAP-003     | Internal API | T049, T097, T098, T105, T106                   | Phase 4, Phase 9, Final Phase          | Covered |
| IAP-004     | Internal API | T064, T070, T105, T106                         | Phase 6, Final Phase                   | Covered |
| IAP-005     | Internal API | T071, T077, T078, T105, T106                   | Phase 7, Final Phase                   | Covered |
| IAP-006     | Internal API | T050, T051, T052, T105, T106                   | Phase 4, Final Phase                   | Covered |
| IAP-007     | Internal API | T056, T058, T059, T060, T105, T106             | Phase 5, Final Phase                   | Covered |
| IAP-008     | Internal API | T084, T085, T086, T087, T105, T106             | Phase 8, Final Phase                   | Covered |
| IAP-009     | Internal API | T092, T099, T100, T105, T106                   | Phase 9, Final Phase                   | Covered |
| IAP-010     | Internal API | T091, T093, T095, T096, T105, T106             | Phase 9, Final Phase                   | Covered |
| IAP-011     | Internal API | T065, T067, T069, T105, T106                   | Phase 6, Final Phase                   | Covered |

## 6) Language-Server Impact Validation (T112)

- Language-server impact for this feature is **none**.
- Phase 2 implementation scope is limited to:
  - `extension/src/services/enterpriseai/**`
  - `extension/src/services/EAIReferenceResolver.ts`
  - `extension/src/test/suite/enterpriseai/**`
  - `tests/integration/enterpriseai/**`
  - `.specify/templates/{spec-template.md,plan-template.md,tasks-template.md}`
- No files under `language-server/` were changed for T011-T035/T112.
- Result: feature remains extension/root test focused with language-server
  behavior unchanged.

## 7) Coverage Summary

- Spec -> Plan -> Tasks coverage (US + FR): **17/17 (100.0%)**
- Acceptance criteria coverage: **36/36 (100.0%)**
- Plan item coverage: **38/38 (100.0%)**
- Plan phase full-coverage rate: **5/5 (100.0%)**
- Data entity coverage: **8/8 (100.0%)**
- API/contract coverage: **24/24 (100.0%)**
- Overall weighted coverage: **123/123 (100.0%)**

**Status: VALIDATION PASSED**

### MISSING Items

- None
