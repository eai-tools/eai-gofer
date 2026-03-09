# Quick Start

Get Gofer installed and run your first AI-powered pipeline in under 5 minutes.

## Prerequisites

- **VS Code** (version 1.85 or later)
- **Claude Code** or **GitHub Copilot** with MCP support
- A project repository you want to work in

## Step 1: Download Gofer

Download the latest `.vsix` extension file from the
[Releases page](releases.html).

Or use the GitHub CLI:

```bash
gh release download --repo eai-tools/gofer --pattern "*.vsix"
```

## Step 2: Install the Extension

1. Open VS Code
2. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
3. Type **"Extensions: Install from VSIX"**
4. Select the downloaded `.vsix` file
5. Restart VS Code

## Step 3: Initialize Your Project

1. Open your project folder in VS Code
2. Open the Command Palette (`Cmd/Ctrl+Shift+P`)
3. Run: **"Gofer: Initialize Repository"**

This creates a `.specify/` folder in your project with the Gofer configuration
and templates.

You should now see a **Gofer panel** in the VS Code sidebar (look for the
notebook icon in the activity bar).

## Step 4: Run Your First Pipeline

Open Claude Code (or GitHub Copilot) and run a single command:

```text
/0_business_scenario Add a user preferences page with dark mode toggle
```

Gofer will automatically chain through all 6 stages:

| Stage        | What Happens                                               | Output                 |
| ------------ | ---------------------------------------------------------- | ---------------------- |
| 1. Research  | Explores your codebase for patterns and integration points | `research.md`          |
| 2. Specify   | Creates a feature specification with user stories          | `spec.md`              |
| 3. Plan      | Designs technical architecture and implementation plan     | `plan.md`              |
| 4. Tasks     | Breaks down into ordered, executable tasks                 | `tasks.md`             |
| 5. Implement | Executes each task, writing actual code                    | Source files           |
| 6. Validate  | Verifies implementation against specification              | `validation-report.md` |

All artifacts are saved to `.specify/specs/{feature-name}/`.

## What to Expect

- The pipeline will ask you a few questions during the **specify** stage (to
  confirm requirements)
- Tasks are presented for your **approval** before implementation begins
- You can interrupt at any time with `/7_gofer_save` to save progress
- Resume later with `/8_gofer_resume`

## Running Individual Stages

You can also run pipeline stages individually:

```text
/1_gofer_research Explore how authentication works in this codebase
```

```text
/2_gofer_specify Create a spec for the search feature
```

See the [Pipeline documentation](pipeline/README.md) for details on each stage.

## Next Steps

- [Learn how the pipeline works](pipeline/README.md)
- [Configure extension settings](guides/configuration.md)
- [Explore auxiliary commands](guides/auxiliary-commands.md)
