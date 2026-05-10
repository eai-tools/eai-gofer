# AI Coding CLI Comparison (February 2026)

## Tool Overview

|                | **Claude Code** (Anthropic)                     | **Codex CLI** (OpenAI)                            | **Copilot CLI** (GitHub) | **Gemini CLI** (Google)    |
| -------------- | ----------------------------------------------- | ------------------------------------------------- | ------------------------ | -------------------------- |
| Built in       | TypeScript/Node.js                              | Rust                                              | Shell wrapper            | TypeScript/Node.js         |
| Open source    | Yes                                             | Yes                                               | Yes                      | Yes (Apache 2.0)           |
| Default model  | Claude Sonnet 4.5                               | GPT-5.3-Codex                                     | Claude Sonnet 4.5        | Gemini 2.5 Pro             |
| Other models   | Opus 4.6, Haiku 4.5                             | GPT-5.3-Codex-Spark                               | Claude Sonnet 4, GPT-5   | Gemini 3 Flash, 3 Pro      |
| Context window | 200k tokens                                     | Not published                                     | Auto-compacts at 95%     | 1M tokens                  |
| Free tier      | No                                              | No (ChatGPT sub)                                  | No (Copilot sub)         | Yes (60 req/min, 1000/day) |
| Config file    | CLAUDE.md                                       | .codex/ config.toml                               | copilot-instructions.md  | GEMINI.md                  |
| Surfaces       | Terminal, VS Code, JetBrains, Desktop, Web, iOS | Terminal, VS Code, Cursor, Windsurf, Desktop, Web | Terminal                 | Terminal                   |

## Feature-by-Feature Comparison

| **Capability**               | **Claude Code**                       | **Codex CLI**                  | **Copilot CLI**                   | **Gemini CLI**             |
| ---------------------------- | ------------------------------------- | ------------------------------ | --------------------------------- | -------------------------- |
| **Core Operations**          |                                       |                                |                                   |                            |
| File read/write/edit         | Native tools (Read, Write, Edit)      | Via sandbox                    | File operations                   | File system operations     |
| Codebase search (grep/glob)  | Dedicated Grep/Glob tools             | Via shell                      | Grep/Glob tools                   | Via shell                  |
| Shell command execution      | Bash tool with guardrails             | Sandboxed execution            | With approval                     | Shell commands             |
| Git operations               | Full git via Bash                     | Full git                       | Native git + GitHub               | Via shell                  |
| Web search                   | WebSearch tool                        | Live or cached                 | Not built-in                      | Google Search grounding    |
| Image/screenshot input       | Read tool (multimodal)                | Via `-i` flag                  | Image analysis                    | Multimodal (PDFs, images)  |
| **Custom Workflows**         |                                       |                                |                                   |                            |
| Custom slash commands        | `.claude/commands/`                   | `.codex/skills/`               | Slash commands                    | Custom commands            |
| Project instructions file    | CLAUDE.md                             | config.toml                    | copilot-instructions.md           | GEMINI.md                  |
| Hooks (pre/post actions)     | Full hook system                      | Approval policies              | Hooks for validation/logging      | Limited                    |
| MCP (Model Context Protocol) | Full support                          | Full support                   | Ships w/ GitHub MCP server        | Full support               |
| **Agent Architecture**       |                                       |                                |                                   |                            |
| Sub-agents / multi-agent     | Task tool (up to 7 concurrent)        | Experimental multi-agent       | Custom agents + /delegate         | Limited                    |
| Specialized agent types      | 12+ types (Explore, Plan, Bash, etc.) | Configurable roles             | Custom domain agents              | Not available              |
| Background agent execution   | run_in_background parameter           | codex cloud                    | /delegate background              | Not available              |
| Agent-to-agent coordination  | Main agent orchestrates sub-agents    | Experimental                   | Limited                           | Not available              |
| **Session & Context**        |                                       |                                |                                   |                            |
| Multi-turn conversations     | Full history preserved                | Interactive TUI                | Interactive chat                  | Conversational             |
| Session save/resume          | Via custom commands                   | `codex resume --last`          | Auto-compaction only              | Conversation checkpointing |
| Context compression          | Automatic + observation masking       | Not documented                 | Auto-compaction at 95% + /compact | Token caching              |
| Persistent memory            | Auto memory directory                 | Not available                  | Copilot Memory                    | Not available              |
| **Approval & Safety**        |                                       |                                |                                   |                            |
| Approval modes               | Permission mode system                | untrusted / on-request / never | Preview before execution          | Sandbox + approval modes   |
| Sandboxing                   | Permission-based                      | OS-level (Landlock/Seatbelt)   | Trusted directory scoping         | Sandboxing                 |
| Full-auto mode               | --dangerously-skip-permissions        | `--full-auto` / `--yolo`       | `--allow-all-tools`               | Limited                    |
| **Task Management**          |                                       |                                |                                   |                            |
| Built-in task tracking       | TaskCreate/Update/List/Get            | Not built-in                   | Not built-in                      | Not built-in               |
| Task dependencies            | blocks/blockedBy                      | Not available                  | Not available                     | Not available              |
| Task status workflow         | pending / in_progress / completed     | Not available                  | Not available                     | Not available              |
| **Validation & QA**          |                                       |                                |                                   |                            |
| Custom validation rubrics    | Via agent architecture                | Code review agent              | Not built-in                      | Not built-in               |
| Parallel validation agents   | 6 concurrent specialists              | Experimental multi-agent       | Custom agents                     | Not available              |
| Code review                  | Via conversation                      | Dedicated review agent         | PR review                         | Via conversation           |
| **Automation & CI**          |                                       |                                |                                   |                            |
| Non-interactive / scripting  | `claude -p` flag                      | `codex exec` with JSON output  | `-p` flag, headless mode          | Non-interactive mode       |
| GitHub Actions integration   | Via @claude on PRs                    | Via codex cloud                | Native GitHub integration         | GitHub Action integration  |
| Cloud execution              | Web sessions                          | `codex cloud` tasks            | Not available                     | Not available              |
| **GitHub Ecosystem**         |                                       |                                |                                   |                            |
| Native issue/PR management   | Via gh CLI in Bash                    | Not available                  | Deep native integration           | Not available              |
| Repository browsing          | Via gh CLI                            | Not available                  | Natural language queries          | Not available              |
| **IDE Integration**          |                                       |                                |                                   |                            |
| VS Code                      | Extension + terminal                  | Extension                      | Terminal only                     | Terminal only              |
| JetBrains                    | Plugin                                | Not available                  | Not available                     | Not available              |
| Desktop app                  | Standalone app                        | macOS app                      | Not available                     | Not available              |
| Web interface                | claude.ai/code                        | chatgpt.com/codex              | Not available                     | Not available              |
| **Advanced**                 |                                       |                                |                                   |                            |
| Extended thinking/reasoning  | Enabled by default                    | Adjustable reasoning levels    | Model-dependent                   | Model-dependent            |
| Multi-directory context      | Via --add-dir                         | Via --add-dir                  | Via trusted dirs                  | --include-directories      |
| Plan mode                    | EnterPlanMode tool                    | Not built-in                   | Plan mode                         | Not built-in               |

## Unique Strengths

| Tool            | Unique Strength                                                                       | Primary Weakness                                         |
| --------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Claude Code** | Richest agent architecture (12+ agent types, built-in task management, custom skills) | Single model family                                      |
| **Codex CLI**   | OS-level sandboxing (Landlock/Seatbelt), fastest execution (Rust), cloud tasks        | No built-in task management, experimental multi-agent    |
| **Copilot CLI** | Deepest GitHub integration, model choice (Claude + GPT-5), ACP protocol               | Terminal-only, no built-in task tracking, no desktop/web |
| **Gemini CLI**  | 1M token context, free tier, Google Search grounding, open source                     | Weakest multi-agent support, no built-in task management |

## Gofer Pipeline Feasibility

| Gofer Requirement                  | Claude Code                    | Codex CLI                       | Copilot CLI                     | Gemini CLI                      |
| ---------------------------------- | ------------------------------ | ------------------------------- | ------------------------------- | ------------------------------- |
| 12+ custom slash commands          | Native                         | Via skills (less mature)        | Limited slash commands          | Custom commands (less mature)   |
| 9 parallel specialized agents      | Task tool w/ typed agents      | Experimental multi-agent        | Custom agents + /delegate       | No multi-agent                  |
| Built-in task tracking (CRUD)      | TaskCreate/Update/List/Get     | Would need custom solution      | Would need custom solution      | Would need custom solution      |
| Session save/resume across windows | Native                         | codex resume                    | Auto-compaction only            | Checkpointing                   |
| Context window management          | Observation masking + profiles | Not available                   | Auto-compaction                 | 1M context (less need)          |
| 6-stage auto-chaining pipeline     | Via skill invocation           | Possible but no native chaining | Possible but no native chaining | Possible but no native chaining |
| Persistent cross-session memory    | MEMORY.md auto-loaded          | Not available                   | Copilot Memory                  | Not available                   |
| **Overall Gofer Feasibility**      | **Full support**               | **Partial (60-70%)**            | **Partial (50-60%)**            | **Limited (30-40%)**            |

## Sources

- [OpenAI Codex CLI](https://github.com/openai/codex)
- [Codex CLI Features](https://developers.openai.com/codex/cli/features/)
- [Codex CLI Reference](https://developers.openai.com/codex/cli/reference/)
- [GitHub Copilot CLI](https://github.com/github/copilot-cli)
- [About GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)
- [Copilot CLI Enhanced Agents (Jan 2026)](https://github.blog/changelog/2026-01-14-github-copilot-cli-enhanced-agents-context-management-and-new-ways-to-install/)
- [Copilot CLI Agentic Workflows](https://github.blog/ai-and-ml/github-copilot/power-agentic-workflows-in-your-terminal-with-github-copilot-cli/)
- [ACP Support in Copilot CLI (Jan 2026)](https://github.blog/changelog/2026-01-28-acp-support-in-copilot-cli-is-now-in-public-preview/)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- [Gemini CLI Docs](https://developers.google.com/gemini-code-assist/docs/gemini-cli)
- [Claude Code Overview](https://code.claude.com/docs/en/overview)
- [2026 Guide to Coding CLI Tools: 15 AI Agents Compared](https://www.tembo.io/blog/coding-cli-tools-comparison)
- [Codex vs Claude Code](https://www.builder.io/blog/codex-vs-claude-code)
