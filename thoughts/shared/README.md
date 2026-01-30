# Persistent Context Storage

This directory stores research findings, implementation plans, and session
summaries that persist across Claude Code sessions.

## Directory Structure

```
thoughts/
└── shared/
    ├── research/     # Codebase research documents
    │   └── NNN_topic.md
    ├── plans/        # Implementation plans (RPI workflow)
    │   └── feature_name.md
    ├── sessions/     # Work session checkpoints
    │   └── NNN_feature.md
    └── cloud/        # Cloud infrastructure analysis
        └── platform_*.md
```

## Usage

### Research (`/1_research_codebase`)

- Deep codebase exploration using parallel agents
- Findings saved to `research/NNN_topic.md`
- Accumulates as organizational knowledge

### Plans (`/2_create_plan`)

- Detailed implementation plans with phases
- Saved to `plans/feature_name.md`
- Tracks progress with checkboxes

### Sessions (`/5_save_progress`, `/6_resume_work`)

- Work session checkpoints
- Enables resuming across Claude sessions
- Preserves context and next steps

### Cloud (`/7_research_cloud`)

- Cloud infrastructure analysis (read-only)
- Documents existing deployments

## Relationship to Gofer

This `thoughts/` directory complements the `.specify/` directory:

| thoughts/          | .specify/              |
| ------------------ | ---------------------- |
| Ad-hoc research    | Feature specifications |
| General plans      | Feature-specific plans |
| Session management | Spec lifecycle         |
| Exploratory work   | Structured development |

Use `thoughts/` for:

- Exploring unfamiliar codebases
- General-purpose research
- Session management
- Cloud infrastructure analysis

Use `.specify/` for:

- Feature specifications
- Implementation plans
- Task breakdowns
- Checklists

## File Naming

- Research: `NNN_descriptive_topic.md` (001, 002, etc.)
- Plans: `feature_name.md` (snake_case)
- Sessions: `NNN_feature.md` (001, 002, etc.)

## Integration with Commands

| Command                | Creates            | Location    |
| ---------------------- | ------------------ | ----------- |
| `/1_research_codebase` | Research doc       | `research/` |
| `/2_create_plan`       | Plan doc           | `plans/`    |
| `/5_save_progress`     | Session checkpoint | `sessions/` |
| `/7_research_cloud`    | Cloud analysis     | `cloud/`    |
