---
date: 2026-04-08T01:46:30.000Z
researcher: Copilot
feature: 'EnterpriseAI Student Vertical Builder'
status: complete
---

# Research: EnterpriseAI Student Vertical Builder

## Feature Summary

Reposition Gofer to focus on building vertical, business-process-driven,
AI-augmented solutions on the EnterpriseAI platform for university and
business-student users, while preserving all existing functionality and
requiring explicit one-by-one approval before any removals.

## Business Scenario Analysis

### Scenario Options Considered

| Scenario                                                    | User/Business Fit                                                                             | Delivery Trade-off                                                   | Recommendation |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------- |
| EnterpriseAI profile overlay on existing Gofer pipeline     | High: preserves current power while retuning guidance and outputs for students/business users | Requires profile-aware command/template updates and regression tests | **Adopt**      |
| Hard EnterpriseAI fork by removing non-EAI capabilities     | Medium: strongest messaging purity                                                            | Violates non-removal constraint and introduces high regression risk  | **Defer**      |
| Keep current multi-platform focus with minor wording tweaks | Low: does not meet requested product direction                                                | Minimal code effort but misses core objective                        | **Defer**      |

### Recommended Scenario

Adopt a **profile-based EnterpriseAI focus**: keep existing capabilities intact,
retune defaults/content/workflows toward EnterpriseAI vertical app delivery, and
add business-analysis + architecture + presentation artifacts.

## Codebase Analysis

### Where to Implement

| Component                             | Location                                                                                                    | Purpose                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Pipeline source commands              | `.claude/commands/*.md`                                                                                     | Canonical stage behavior and artifact contracts                    |
| Generated command artifacts           | `.github/prompts/*.prompt.md`, `.system/skills/*/SKILL.md`, `.agents/skills/*/SKILL.md`                     | Platform-specific mirrors that must stay in parity                 |
| Generator and sync                    | `scripts/generate-commands.ts`, `extension/src/services/migration/ResourceSyncer.ts`                        | Propagates canonical command changes to runtime resources          |
| Command routing and provider behavior | `extension/src/council/CrossPlatformCommandRouter.ts`, `extension/src/council/providers/ProviderFactory.ts` | Controls platform routing and CLI/provider selection               |
| Extension UX and positioning          | `extension/package.json`, `extension/README.md`, `README.md`                                                | Product framing, onboarding, command labels, welcome messaging     |
| Student/business comms outputs        | `.claude/commands/7a_stakeholder_comms.md`                                                                  | Existing path for release notes, demo scripts, and success metrics |

### Existing Patterns to Follow

#### Pattern 1: Canonical-to-generated command parity

Found in:

- `scripts/generate-commands.ts:6`
- `scripts/generate-commands.ts:86`
- `scripts/generate-commands.ts:88`

Why relevant: command behavior should be authored once (Claude command source)
and propagated to Copilot/Codex/Gemini artifacts, avoiding drift.

#### Pattern 2: Runtime resource synchronization for Codex/Gemini/Copilot CLI

Found in:

- `extension/src/services/migration/ResourceSyncer.ts:325`
- `extension/src/services/migration/ResourceSyncer.ts:339`
- `extension/src/services/migration/ResourceSyncer.ts:348`
- `extension/src/services/migration/ResourceSyncer.ts:366`
- `extension/src/services/migration/ResourceSyncer.ts:377`

Why relevant: EnterpriseAI-focused updates must be copied/synced into all
runtime resource destinations.

#### Pattern 3: Existing business/stakeholder output stage

Found in:

- `.claude/commands/7a_stakeholder_comms.md:3`
- `.claude/commands/7a_stakeholder_comms.md:117`
- `.claude/commands/7a_stakeholder_comms.md:156`

Why relevant: business metrics and presentation-oriented outputs already exist
and can be extended to support student/business delivery outcomes.

#### Pattern 4: One-by-one architecture decision loop

Found in:

- `.claude/commands/0_business_scenario.md:628`
- `.claude/commands/0_business_scenario.md:629`

Why relevant: required interaction model for architecture decisions already
exists and should remain mandatory in the EnterpriseAI-focused flow.

### Integration Points

1. **Command content retuning**: update `.claude/commands/*` to enforce
   EnterpriseAI-first guidance and new artifact requirements.
2. **Artifact propagation**: regenerate and sync `.github/prompts`,
   `.system/skills`, `.agents/skills`, and `extension/resources/*`.
3. **Provider/routing safety**: preserve existing platform/provider code paths
   while adding EnterpriseAI workflow profile logic.
4. **Documentation alignment**: unify extension and repo docs around
   EnterpriseAI vertical app workflows with student/business framing.
5. **External platform workflows**: add explicit research/plan/tasks guidance
   for EAI CLI, Vertical Template, deployment, and Marp outputs.

### Related Code

- `extension/package.json:3-4` — EnterpriseAI-focused displayName/description
  already present.
- `extension/src/council/CrossPlatformCommandRouter.ts:30` — search priority
  across claude/codex/copilot assets.
- `extension/src/council/CrossPlatformCommandRouter.ts:157` — platform path
  mapping.
- `extension/src/council/CrossPlatformCommandRouter.ts:287` — platform search
  order.
- `extension/src/council/providers/ProviderFactory.ts:396` — CLI auto-detection
  entrypoint.
- `extension/src/council/providers/ProviderFactory.ts:401` — `gofer.defaultCLI`
  handling (`claude|copilot|codex|auto`).
- `extension/src/council/providers/ProviderFactory.ts:493` — autonomous provider
  preference (`gofer.cliProvider`).

## Technology Decisions

### Decision 1: EnterpriseAI focus without capability removal

- **Choice**: Introduce workflow-profile-driven behavior/content and keep
  existing provider/platform capabilities intact.
- **Rationale**: Meets direction/focus goal while respecting explicit no-removal
  constraint.
- **Alternatives considered**: hard removal/fork of non-EAI paths (rejected).

### Decision 2: EnterpriseAI external integration knowledge sources

- **Choice**: Treat EAI CLI, Vertical Template, and EnterpriseAI deployment
  repository as first-class research/plan/task inputs.
- **Rationale**: Required for local-to-platform execution and accurate
  architecture guidance.
- **Alternatives considered**: generic cloud/deployment guidance (insufficient).

### Decision 3: Presentation output standardization

- **Choice**: Add Marp-compatible presentation artifact output to
  stakeholder/business communication flow.
- **Rationale**: Supports business student delivery outcomes and demo/readout
  needs.
- **Alternatives considered**: plain markdown summaries only (lower presentation
  utility).

## Recommended Architecture Direction

### Recommended Architecture

Use a **non-destructive EnterpriseAI workflow profile** layered onto existing
Gofer orchestration:

- EnterpriseAI-first prompts, templates, and outputs
- additional business/competitive/architecture/presentation artifacts
- retained compatibility paths for existing command/platform/provider
  capabilities
- explicit user approval checkpoint before any removal/deprecation work

### Architecture Options Considered

| Option                          | Why choose it                                                           | Why not choose it now                                        |
| ------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| Profile overlay (recommended)   | Safe migration, preserves current behavior, allows targeted focus shift | Requires broader template/test updates                       |
| Hard EnterpriseAI-only codepath | Strongest enforcement                                                   | Breaks compatibility and violates non-removal constraint     |
| Documentation-only retune       | Fastest                                                                 | Does not enforce behavioral focus through pipeline execution |

## Constraints & Considerations

- **No functionality loss**: removals require explicit one-by-one approval from
  user.
- **Generated artifact parity**: updates must remain synchronized across all
  command/skill mirrors.
- **Context health**: current context check reports critical usage; keep stage
  outputs concise and deterministic.
- **External repositories access**: provided external URLs returned 404 in this
  runtime; implementation must support repository-local references and
  optionally user-provided docs.
- **Behavioral safety**: avoid changing default runtime provider behavior
  without explicit approval.

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type                      | Description                                                      | Impact on Implementation                                       |
| ------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Existing cross-platform architecture | Router/provider layers support multiple CLIs/platforms           | Must retune focus without deleting compatibility code          |
| Generated artifact system            | Multiple mirrored outputs from canonical commands                | Requires regeneration + parity validation after source edits   |
| Migration/runtime sync coupling      | ResourceSyncer and upgrade paths copy packaged resources         | Changes must be compatible for existing users/workspaces       |
| Test coupling                        | Many tests assert command-generation parity and routing behavior | Requires test updates aligned to EnterpriseAI profile strategy |

### Technical Debt to Avoid

| Pattern                                  | Found In                                                             | Why Avoid                                         | Use Instead                                                       |
| ---------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| Manual edits to generated mirrors        | `.github/prompts/*`, `.system/skills/*`, `.agents/skills/*`          | Causes drift and brittle behavior                 | Edit canonical `.claude/commands/*` then regenerate               |
| Removing provider/routing paths directly | `extension/src/council/providers/*`, `CrossPlatformCommandRouter.ts` | Violates no-removal constraint and risks breakage | Add profile gates/priority rules and preserve fallback capability |

### Areas Requiring Extra Caution

- **Provider selection behavior** (`ProviderFactory`): changing defaults can
  unexpectedly alter autonomous execution.
- **Command generation semantics** (`scripts/generate-commands.ts` +
  `CommandGenerator`): wording changes can break integration tests.
- **Resource migration** (`ResourceSyncer`): packaging and runtime sync must
  remain coherent.

### Integration Requirements

| Existing Service                   | Integration Method                                | Notes                                                                                                                        |
| ---------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| EAI CLI                            | Command/task guidance + executable workflow steps | Repository docs not fetchable in current runtime; require local references or user-provided docs for exact command contracts |
| Vertical Template                  | Research/plan/tasks scaffolding pattern           | Must map into stage artifacts and generated task breakdown                                                                   |
| EnterpriseAI deployment repository | Architecture/deployment guidance references       | Use as deployment pattern source; validate access and branch/path conventions                                                |
| Marp                               | Markdown-to-slide generation artifact flow        | Add artifact template and command guidance for deck generation/export                                                        |

### Downstream Dependencies

- `extension/resources/claude-commands/*` depends on command source updates.
- `.github/prompts/*`, `.system/skills/*`, `.agents/skills/*` depend on
  generator parity.
- `tests/integration/command-generation.test.ts` depends on exact generated
  wording/sections.
- `tests/integration/cross-platform-parity.test.ts` depends on
  routing/availability behavior.

## Open Questions

- [ ] Should EnterpriseAI profile become the default mode immediately, or remain
      opt-in for one release?
- [ ] For EAI CLI/Vertical Template/deployment references, should we vendor
      minimal local guidance docs into this repo for deterministic usage?
- [ ] Should Marp presentation generation be mandatory for all business/student
      flows, or optional via stage flag?
- [ ] Should competitive analysis be always-on for this profile, or optional per
      feature run?

## Recommendations

1. Implement EnterpriseAI profile overlays across command content and templates
   first (no removals).
2. Add explicit artifacts for business analysis, market/competitive analysis,
   technology architecture, and Marp presentation outputs.
3. Keep existing provider/platform paths intact and introduce profile-based
   preference/routing logic.
4. Regenerate and sync all command artifacts from canonical source; enforce
   parity tests.
5. Gate any future removal/deprecation with explicit one-by-one user approval.
