---
id: cloud-word-editor-option-5
optionNumber: 5
name: Innovative
efficiencyScore: 20
innovationScore: 95
complexityTarget: high
estimatedEffort: "1-2 months"
created: '2026-03-04T00:00:00Z'
---

# Sequence Diagram Option 5: Innovative

## Overview

Cutting-edge implementation that pushes the boundaries of AI-assisted document
editing. DAISY operates as a semi-autonomous agent that can draft entire
documents independently, with multi-modal input (voice commands, image analysis
for site photos), continuous learning from user behaviour, and an AI copilot
sidebar that anticipates needs before the user asks.

The goal is a next-generation document intelligence platform, not just an editor.

## Characteristics

- Everything in Option 4, plus:
- Autonomous document drafting (DAISY creates entire first draft independently)
- Multi-modal input: voice commands for editing, image analysis for site photos
- AI copilot sidebar with contextual suggestions, compliance warnings, and
  similar precedent documents
- Continuous learning: per-user and per-tenant models that improve over time
- Semantic document understanding (knows what a "conditions of consent" section
  should contain for a given DA type)
- Cross-document intelligence (references previous DAs for similar properties)
- Natural language editing ("Make the third paragraph more formal")
- Automated compliance checking against EPA/SEPP/LEP requirements
- Smart conflict resolution for real-time collaboration
- Document quality scoring (completeness, compliance, clarity)

## Actors

| Actor | Role | System/Human |
|-------|------|--------------|
| Assessor | Reviews AI-drafted documents, refines | Human |
| Senior Planner | Reviews with AI-assisted quality scoring | Human |
| Applicant | Views determination with plain-language summary | Human |
| External Developer | Integrates via npm package + AI SDK | Human |
| DAISY Chatbot | Semi-autonomous drafting agent | AI Agent |
| AI Copilot | Sidebar with proactive suggestions | AI Agent |
| Compliance Engine | Automated regulatory checking | AI System |
| Learning Service | Per-user/tenant behaviour models | AI System |
| Document Intelligence | Cross-document analysis | AI System |
| Editor Block | React component with full AI integration | System |
| ONLYOFFICE | Document editing + collaboration engine | System |
| Blob Storage | .docx file storage | System |
| Payload CMS | Metadata, versioning, analytics, precedents | System |
| TenantData | Templates, prompts, models, preferences | System |
| Entra ID | JWT auth + user profile for personalization | System |

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant A as Assessor
    participant EB as Editor Block
    participant CP as AI Copilot<br>Sidebar
    participant OO as ONLYOFFICE<br>(iframe)
    participant D as DAISY Agent
    participant CE as Compliance<br>Engine
    participant DI as Document<br>Intelligence
    participant BS as Blob Storage
    participant P as Payload CMS

    Note over A,DI: Phase 1: Intelligent Document Creation
    A->>EB: Open assessment substage
    EB->>DI: Analyze DA (type, zoning, property, history)
    DI->>P: Query similar past DAs for this property type
    DI-->>EB: Recommended template + precedent docs

    rect rgb(200, 220, 255)
        Note over D: Gen AI: Autonomous First Draft
        EB->>D: "Draft complete assessment report for DA-2026-1234"
        D->>D: Read all customData (assessment, referrals, reviews)
        D->>DI: Get relevant precedent sections
        DI-->>D: Similar DA excerpts + conditions
        D->>EB: Batch tool calls (20+ operations)
        EB->>OO: RunMacro batch (site desc, proposal, controls, assessment, conditions, recommendation)
        OO-->>EB: All results
        EB->>D: Batch results
        D->>EB: chatbot-auto-fill-complete (complete first draft)
    end

    EB->>EB: AIEditReviewBar ("AI drafted complete report — 6 sections")
    CP->>A: "I've drafted the full report. Key areas to review: Conditions (3 non-standard), Recommendation (approval with conditions)"

    Note over A,CE: Phase 2: AI-Guided Refinement
    A->>OO: Review and edit AI draft
    rect rgb(200, 220, 255)
        Note over CP: Gen AI: Copilot Suggestions
        CP->>A: "The heritage overlay section is missing a reference to DCP 2014 Clause 5.10"
        CP->>A: "Similar DA (DA-2024-890) included stormwater conditions — relevant here?"
    end

    A->>D: Voice: "Make the recommendation more concise"
    rect rgb(200, 220, 255)
        Note over D: Gen AI: Natural Language Editing
        D->>EB: tool-call: edit_content (rewrite recommendation)
        EB->>OO: RunMacro: replace section
    end

    rect rgb(255, 220, 200)
        Note over CE: Gen AI: Compliance Check
        CE->>OO: Scan document against EPA/SEPP/LEP requirements
        CE-->>CP: 2 warnings: missing BASIX reference, incomplete bushfire assessment
        CP->>A: "Compliance warnings: BASIX cert not referenced (SEPP Building Sustainability), Bushfire assessment incomplete (Planning for Bushfire Protection 2019)"
    end

    A->>OO: Address compliance warnings
    EB->>EB: Auto-save with quality score update
    EB->>CP: Document quality: 87% (completeness: 92%, compliance: 85%, clarity: 84%)

    Note over A,OO: Phase 3: Intelligent Review
    A->>EB: Submit for review
    rect rgb(200, 220, 255)
        Note over DI: Gen AI: Pre-Review Analysis
        DI->>DI: Compare against quality benchmarks
        DI-->>CP: Review summary for senior planner
    end

    participant SP as Senior Planner
    SP->>EB: Open report for review
    CP->>SP: "AI review summary: 6 sections complete, 2 compliance items addressed, 1 non-standard condition flagged for attention"
    SP->>OO: Review with AI-highlighted attention areas
    SP->>EB: Approve with minor edits

    Note over A,BS: Phase 4: Intelligent Output
    A->>EB: Generate determination letter
    rect rgb(200, 220, 255)
        Note over D: Gen AI: Letter + Plain Language
        D->>EB: Draft determination letter from approved conditions
        D->>EB: Generate plain-language summary for applicant
    end
    A->>EB: Export branded PDF + .docx
    EB->>BS: Upload all versions
    EB->>P: Record with quality score, compliance status, AI contribution metrics
```

## Gen AI Touchpoints

- **Autonomous First Draft**: DAISY reads all workflow data and drafts a
  complete assessment report independently. Assessor reviews rather than writes.

- **AI Copilot Sidebar**: Always-on contextual assistant that surfaces relevant
  information, flags potential issues, and suggests improvements proactively.

- **Natural Language Editing**: Voice and text commands for editing in natural
  language ("Make this more formal", "Add a reference to SEPP 65").

- **Automated Compliance Checking**: Scans document against regulatory
  requirements (EPA Act, SEPPs, LEPs, DCPs) and flags omissions or
  inconsistencies.

- **Cross-Document Intelligence**: References previous DAs for similar property
  types to suggest conditions, identify precedents, and ensure consistency.

- **Document Quality Scoring**: Real-time scoring across completeness,
  compliance, and clarity dimensions. Helps both authors and reviewers.

- **Plain-Language Generation**: Automatically generates an applicant-friendly
  summary of complex determination documents.

## Scores

| Metric | Score |
|--------|-------|
| Efficiency | 20% |
| Innovation | 95% |
| Complexity | High |

## Estimated Effort

1-2 months

## Risks

- Autonomous drafting quality depends heavily on training data and prompt
  engineering — poor results could erode trust
- Multi-modal input (voice) requires additional infrastructure and browser APIs
- Compliance engine needs domain-specific knowledge base per jurisdiction
  (NSW now, but must be configurable per tenant)
- Continuous learning raises privacy and data governance concerns
- Cross-document intelligence requires access to historical data (may be
  incomplete for new tenants)
- Quality scoring calibration needs human validation
- Significant increase in AI API costs (more tokens per document lifecycle)
- Technology risk: bleeding-edge features may not work reliably at scale
- User adoption uncertainty: some users may distrust autonomous AI drafting

## Trade-offs

**Gain**: Transforms document editing from a manual task to an AI-guided
workflow. Assessors review instead of write. Compliance checking reduces
regulatory risk. Cross-document intelligence ensures consistency. Quality
scoring provides objective governance metrics. The editor becomes a document
intelligence platform.

**Lose**: 1-2 months vs 1-2 weeks for Standard. Significantly more complex
infrastructure. Higher AI API costs. Risk of features that users don't trust
or don't use. Compliance engine requires ongoing maintenance as regulations
change. Universal architecture must ensure all AI features are configurable
per tenant — no hardcoded NSW logic.
