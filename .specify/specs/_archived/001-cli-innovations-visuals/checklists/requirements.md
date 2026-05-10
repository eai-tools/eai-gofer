---
feature: 'CLI Innovations + Multi-Persona Visual Artifacts'
spec: ../spec.md
research: ../research.md
proposal-review: ../proposal-review.md
created: 2026-04-25
reviewer: Claude
status: complete
---

# Specification Quality Checklist — 001-cli-innovations-visuals

Validates `spec.md` against `research.md` integration points + constraints and
against `proposal-review.md` locked decisions and the two hard invariants
(no-regression; Codex skill-budget hygiene).

---

## PART 1 — Research Integration Coverage Matrix

### Integration points (from research.md "Integration Points" §)

| Item                                                                                             | Type        | Status  | Spec Section                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------ | ----------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/0a_problem_validation` emits AS-IS value-stream + capability heatmap                           | integration | COVERED | FR-017 (AS-IS, line 215); FR-021 (capability heatmap surfaces in `/1_gofer_research`, line 223 — see note below); Research Traceability row "Integration point: `/0a_problem_validation` → ..." (line 441) explicitly reconciles the placement |
| `/1_gofer_research` emits C4 Context                                                             | integration | COVERED | FR-019 (line 219); User Story 4 Independent Test (line 88); Glossary "C4 Context / Container / Component" (line 387)                                                                                                                           |
| `/2_gofer_specify` emits Impact Canvas + TO-BE value-stream with AI-leverage overlay (HARD GATE) | integration | COVERED | FR-016 (line 213); FR-018 (line 217); Edge Case "Persona-pack completeness gate" (line 165); SC-001 (line 290); SC-010 (line 299); Glossary "Impact Canvas" / "Value-stream TO-BE" (lines 385, 389)                                            |
| `/3_gofer_plan` emits C4 Container + bounded-context map + ERD                                   | integration | COVERED | FR-020 (line 221); FR-022 (line 225); FR-023 (line 227); User Story 3 Independent Test (line 73); User Story 3 Acceptance Scenario 1 (line 77)                                                                                                 |
| `/6_gofer_validate` emits risk heatmap + ROI xychart upgrade                                     | integration | COVERED | FR-024 (line 229); FR-025 (line 231); User Story 4 Acceptance Scenario 2 (line 93)                                                                                                                                                             |
| `/7a_stakeholder_comms` assembles stakeholder-pack (+ optional Marp/mmdc)                        | integration | COVERED | FR-028 (line 239); FR-029 (line 241); FR-030 (line 243); User Story 7 Acceptance Scenarios (lines 143-144); Edge Case "mmdc absent" (line 171)                                                                                                 |

### Constraints (from research.md "Constraints & Considerations" §)

| Item                                                                                                                                                                                                                                                        | Type                 | Status  | Spec Section                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mermaid ceiling — fall back to tables if render fails                                                                                                                                                                                                       | constraint           | COVERED | NFR-010 (line 279); Edge Case "Mermaid renderer failure" (line 164); Assumption 9 (line 315)                                                                                                                                                        |
| Cross-CLI fidelity — Copilot inline render gap, mmdc export                                                                                                                                                                                                 | constraint           | COVERED | NFR-007 (line 276); FR-029 (line 241); Assumption 10 (line 316)                                                                                                                                                                                     |
| Five-copy drift — source-of-truth generator                                                                                                                                                                                                                 | constraint           | COVERED | FR-001 (line 181); FR-002 (line 183); Assumption 13 (line 319); Edge Case "Source-of-truth divergence" (line 166)                                                                                                                                   |
| EnterpriseAI constraint — market-analysis.md + business-analysis.md still produced                                                                                                                                                                          | constraint           | COVERED | FR-035 (line 255); Assumption 11 (line 317)                                                                                                                                                                                                         |
| Novice guardrail — plain-language paragraph before any diagram                                                                                                                                                                                              | constraint           | COVERED | FR-027 (line 235); Assumption 12 (line 318); reinforced in FR-016/FR-017/FR-018/FR-019/FR-020/FR-022/FR-023/FR-024                                                                                                                                  |
| No-regression invariant (every existing slash command/sub-agent/hook/template/script preserved at parity; `/gofer:*` additive only)                                                                                                                         | constraint/invariant | COVERED | Assumption 3 (line 309); FR-002 (line 183); FR-003 (line 185); FR-004 (line 187); FR-005 (line 189); SC-005 (line 294); SC-008 (line 297); Out of Scope "Renaming or removing any existing numbered slash command" (line 360)                       |
| Codex skill-budget hygiene (verified facts: no `skills_context_budget_percent` key; per-skill enable/disable is official; `.agents/skills/` not `.claude/skills/`; ≤140-char descriptions; flat non-tenanted tree; per-CLI exclusion; `gofer codex doctor`) | constraint/invariant | COVERED | Assumption 4 (line 310); FR-006 (line 191); FR-007 (line 193); FR-008 (line 195); FR-009 (line 197); FR-010 (line 199); FR-011 (line 201); SC-003 (line 292); SC-006 (line 295); SC-011 (line 300); SC-012 (line 301); User Story 6 (lines 115-130) |

### Locked decisions (from proposal-review.md "Open Questions" + Approval §)

| Item                                                                            | Type     | Status  | Spec Section                                                                                                                                          |
| ------------------------------------------------------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source-of-truth = YAML frontmatter + Markdown body (one file per stage)         | decision | COVERED | FR-001 (line 181); Assumption 5 (line 311); Key Entities "Source-of-truth file" (line 259); Glossary (line 383)                                       |
| Phase order strict 1 → 2 → 3                                                    | decision | COVERED | Overview (line 29); Assumption 6 (line 312); FRs grouped by phase (lines 179, 211, 237 headings)                                                      |
| AI-leverage taxonomy = enforced 4 verbs (Replace/Augment/Automate/Observe)      | decision | COVERED | FR-018 (line 217); FR-026 (line 233); Assumption 7 (line 313); Glossary "AI-leverage taxonomy" (line 386); Out of Scope (line 361); SC-010 (line 299) |
| Architecture A — template-and-sub-agent pipeline with source-of-truth generator | decision | COVERED | Assumption 8 (line 314); Out of Scope "Architecture options B/C/D" (line 355); Dependencies "New components" (lines 336-342)                          |
| Numbered `/0–/10` commands retained; `/gofer:*` additive                        | decision | COVERED | FR-003 (line 185); FR-005 (line 189); Assumption 3 (line 309); Out of Scope "Renaming" (line 360); Glossary (line 394)                                |

### Coverage totals

- Integration points: **6 / 6 = 100%**
- Constraints: **7 / 7 = 100%**
- Locked decisions: **5 / 5 = 100%**
- **Overall research integration: 18 / 18 = 100%**

---

## PART 2 — Quality Checklist

### A. Content Quality

- [x] **No implementation details bleeding into spec** — PASS. The spec names
      files, paths, and Mermaid construct types (e.g., `quadrantChart`,
      `xychart-beta`), but these are intentional artifact contracts, not
      implementation choices. No code, no language-level specifics, no algorithm
      details.
- [x] **User-focused acceptance criteria** — PASS. Every user story has
      Given/When/Then framed around persona observable behaviour (consultant
      reads, business owner approves, developer inspects, architect opens,
      operator types, Codex user runs `gofer codex doctor`).
- [x] **Non-technical language where possible (architect-vocab acceptable for
      this feature)** — PASS. Mermaid construct names and C4 vocabulary appear
      because they are the artifact deliverables themselves; outside those,
      language is plain-English and persona-grounded. Plain-language preamble
      requirement (FR-027) explicitly enforces accessibility.

### B. Requirement Completeness

- [x] **Every functional requirement is testable** — PASS. All 35 FRs include an
      explicit _Validation_ clause naming the test harness (regression diff
      suite, lint step, integration test, parser assertion, hook-log replay,
      repo-wide search, etc.).
- [x] **Every functional requirement is unambiguous** — PASS. Each FR uses
      MUST/SHOULD/MAY semantics, names the artifact path, the trigger stage, and
      the validation gate. No "TBD" or "NEEDS CLARIFICATION" markers found.
- [x] **Success criteria are measurable + technology-agnostic** — PASS. SC-001
      through SC-012 are numeric, gate-driven, or repo-search-based. None depend
      on a specific framework. SC-009 ("≤60 seconds for non-developer readers")
      is observable; SC-004 ("≥50% reduction") is measurable against the FR-034
      hook log.

### C. Research Integration

- [x] **All integration points addressed** — PASS. All 6 integration points map
      to FRs (see Part 1 matrix). 100% coverage.
- [x] **All constraints acknowledged** — PASS. All 7 constraints map to FR +
      NFR + Assumption + Edge Case combinations. 100% coverage.
- [x] **Both hard invariants encoded in concrete FRs + Success Criteria** —
      PASS.
  - **Invariant 1 (no-regression)**: FR-002 (byte-equivalent emit), FR-003
    (every existing command preserved), FR-004
    (sub-agents/hooks/scripts/templates preserved), FR-035 (EnterpriseAI files
    preserved), SC-005 (zero regressions), SC-008 (100% byte-equivalent
    reproduction).
  - **Invariant 2 (Codex hygiene)**: FR-006 (≤140 char), FR-007 (per-CLI
    exclusion), FR-008 (flat tree), FR-009 (`gofer codex doctor`), FR-010
    (constitution documents `.agents/skills/`), FR-011 (no
    `skills_context_budget_percent`), SC-003 (warning eliminated), SC-006
    (≤2KB), SC-011 (zero forbidden-key references), SC-012 (zero leakage).

### D. Acceptance Criteria

- [x] **Every user story has checkable Given/When/Then criteria** — PASS. All 8
      user stories include Independent Test + numbered Acceptance Scenarios in
      Given/When/Then form.
- [x] **Acceptance criteria cover the four personas (strategy consultant,
      business owner, developer, enterprise architect) plus pipeline operator +
      Codex-incident user** — PASS.
  - Strategy consultant — User Story 1
  - Business owner — User Story 2
  - Developer — User Story 3
  - Enterprise architect — User Story 4
  - Pipeline operator — User Story 5 (picker), User Story 8 (queued input)
  - Codex-incident user — User Story 6
  - Bonus: Stakeholder-pack consumer — User Story 7

---

## PART 3 — Specific Risks Called Out

### Anything in spec.md that contradicts the no-regression invariant?

**No.** The spec affirmatively reinforces invariant 1 in:

- Assumption 3 (line 309) — explicit "every existing slash command, all 36
  sub-agents, all hooks, all stage scripts, and all templates ... continue to
  function unchanged"
- FR-002, FR-003, FR-004, FR-035 — mandate parity preservation
- Out of Scope "Renaming or removing any existing numbered slash command"
  (line 360) — explicit rename prohibition
- SC-005 — zero-regression target
- Dependencies "Existing Gofer integration points (must be preserved per
  Invariant 1)" (line 326) — enumerates every preserved surface

### Anything that emits/recommends a guessed Codex config key?

**No.** The spec affirmatively forbids it:

- FR-011 (line 201) — "MUST NOT emit any reference to a
  `skills_context_budget_percent` key"
- SC-011 (line 300) — measurable target of zero such references
- Assumption 4 (line 310) — verified-fact statement that no such key exists

### Anything that suggests Codex reads `.claude/skills/`?

**No.** The spec affirmatively contradicts that misconception:

- FR-008 (line 195) — Codex emits to `.agents/skills/`
- FR-010 (line 199) — constitution documents `.agents/skills/` (and
  `~/.codex/config.toml`) — _not_ `.claude/skills/`
- Assumption 4 (line 310) — "Codex discovers `.agents/skills/`,
  user/admin/system locations, plugins, and `~/.codex/config.toml` overrides —
  not `.claude/skills/`"

### Phase order violations (e.g., visuals before generator)?

**No.** Phase order is strictly enforced:

- Overview (line 29) — Phase 1 = source-of-truth generator + Codex hygiene +
  namespace + plan/side/personality; Phase 2 = persona pack; Phase 3 = packaging
- FR sections are grouped by phase: lines 179 (Phase 1), 211 (Phase 2), 237
  (Phase 3)
- Assumption 6 (line 312) — "strict 1 → 2 → 3 with no reordering"
- FR-002 explicitly requires byte-equivalent reproduction _before any new
  commands are added_ — generator must land before visuals can attach to it

### Other observations

- **EnterpriseAI Integration Map present** — required by
  `workflowProfile=enterpriseai` and present at lines 367-377 with
  IAP-001/IAP-002/IAP-003 contract chain.
- **Edge cases comprehensive** — 8 edge cases covering Mermaid failure, gate
  failure, hand-edit drift, Codex over-budget, description overrun, exclusion
  violation, queued-input loss, mmdc absent.
- **Open questions explicitly resolved or scoped out** — Research Traceability
  table (lines 401-462) shows all open questions either resolved (assumption #)
  or moved to Out of Scope (deferred to Phase 3).

---

## Summary

| Dimension                     | Result       |
| ----------------------------- | ------------ |
| Research integration coverage | 18/18 = 100% |
| Content Quality               | 3/3 PASS     |
| Requirement Completeness      | 3/3 PASS     |
| Research Integration          | 3/3 PASS     |
| Acceptance Criteria           | 2/2 PASS     |
| Invariant 1 contradictions    | None         |
| Invariant 2 contradictions    | None         |
| Phase-order violations        | None         |

**Recommendation: PROCEED to /3_gofer_plan.** No spec.md fixes required.
