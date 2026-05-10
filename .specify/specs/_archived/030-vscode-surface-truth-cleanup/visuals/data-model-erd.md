# Data Model — Entity Relationship Diagram

This feature does not introduce new runtime or user-facing persistence.
Instead, the model captures planning and audit artifacts used to track
truth-alignment work across repository surfaces. `DriftFinding` represents a
stable cleanup problem area, `TruthSurface` represents a concrete repo surface
that must be authoritative or checked against authority, and `CleanupAction`
connects the two as a task-ready work item. Together, the diagram shows how
findings are applied to specific surfaces, how one finding can produce multiple
actions, and how one surface can participate in multiple cleanup efforts.

## Entities

```mermaid
erDiagram
    DriftFinding ||--o{ CleanupAction : drives
    TruthSurface ||--o{ CleanupAction : targets

    DriftFinding {
        string id PK
        enum category
        string description
        enum status
        string | null owner
        string reviewCadence
    }

    TruthSurface {
        string id PK
        string[] repoPaths
        enum surfaceType
        string authoritySource
        boolean userFacing
        enum trustState
    }

    CleanupAction {
        string id PK
        string | null contractRef
        string findingId FK
        string surfaceId FK
        enum actionType
        string[] specRefs
        string[] validationRefs
        enum status
        string | null notes
    }
```

## Notes

- `DriftFinding` -> `CleanupAction` is 1:N: one finding category can produce
  multiple task-ready cleanup actions.
- `TruthSurface` -> `CleanupAction` is 1:N: one surface can require multiple
  actions across phases.
- `DriftFinding` <-> `TruthSurface` is M:N via `CleanupAction`.
- This is a file-system-backed planning model only; it does not add database
  tables, indexes, migrations, or runtime records.
- `CleanupAction.findingId` references `DriftFinding.id`.
- `CleanupAction.surfaceId` references `TruthSurface.id`.
- Field names and types are copied from `data-model.md` without adding new
  fields.
