---
feature: '032-gofer-ui-first-builder'
created: '2026-05-10T09:31:57Z'
workflowProfile: enterpriseai
---

# Reuse-Before-Create Scan: 032-gofer-ui-first-builder

## Scan Scope

| Asset Type              | Search Performed                                       | Result                                                         |
| ----------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| Existing specs          | `.specify/specs/031-*` plus current command sources    | no prior feature already covers this dual-mode contract        |
| Workflows/journeys      | `.specify/commands/0/1/2/3/4/5/6`                      | reuse shared stages and extend their app-delivery rules        |
| Modules/components      | `.specify/templates/*.md`                              | extend template set for preview/approval/service-fit artifacts |
| EnterpriseAI references | existing command guidance and `eai` command references | reuse named capability-discovery commands                      |

## Decisions

| Candidate                              | Evidence                               | Decision                       | Rationale                                                                  | Owner               |
| -------------------------------------- | -------------------------------------- | ------------------------------ | -------------------------------------------------------------------------- | ------------------- |
| Shared numbered stages                 | canonical stage files                  | Extend                         | preserve non-app behavior while adding app-delivery gates                  | workflow maintainer |
| Generated mirror system                | generator + sync scripts               | Reuse                          | already the right publication path                                         | workflow maintainer |
| Preview/approval/service-fit artifacts | templates only                         | Create feature-local templates | needed to express the new app-delivery contract without new platform types | workflow maintainer |
| Vertical Template baseline             | new guidance across commands/templates | Reuse                          | matches user requirement and existing EAI delivery path                    | workflow maintainer |
