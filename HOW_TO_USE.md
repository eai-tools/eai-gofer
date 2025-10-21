# ▶️ How to Use SpecGofer Autonomous Mode

## Quick Start: Press the Play Button! 🎮

1. **Open Command Palette** (Cmd+Shift+P on Mac, Ctrl+Shift+P on Windows/Linux)

2. **Type**: `Tasks: Run Task`

3. **Select**: `▶️ Start SpecGofer (Autonomous Mode)`

4. **Watch the magic happen!** ✨

SpecGofer will now:
- Get the next available task from your specs
- Use the Engineer Agent to implement it
- Validate code against the constitution
- Run tests automatically
- Mark tasks complete when they pass
- Move to the next task
- Repeat until all tasks are done!

## How to Stop

1. **Open Command Palette** (Cmd+Shift+P)
2. **Type**: `Tasks: Run Task`
3. **Select**: `⏹️ Stop SpecGofer`

Or just press `Ctrl+C` in the terminal.

## What You'll See

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         🚀 SpecGofer Autonomous Mode 🚀                   ║
║         Spec-Driven Development on Autopilot              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

📁 Spec directory: .specify
📁 Workspace: /Users/you/spec-driven-dev-system
🤖 Using Claude 3.7 Sonnet
📱 SMS notifications: Enabled

▶️  Starting SpecGofer Autonomous Mode...

🎯 Next Task: T011 - Create comprehensive Extension tests
🤖 Executing task with Engineer Agent...
📝 Claude Response:
...

📋 Validating against constitution...
✅ Validation passed

🧪 Running tests...
✅ All tests passed (coverage: 82%)

✅ Task completed successfully!

🎯 Next Task: T012 - Add input validation to Language Server...
```

## Keyboard Shortcuts (Optional Setup)

Add these to your `keybindings.json` for one-click control:

```json
[
  {
    "key": "cmd+shift+g cmd+shift+s",
    "command": "workbench.action.tasks.runTask",
    "args": "▶️ Start SpecGofer (Autonomous Mode)"
  },
  {
    "key": "cmd+shift+g cmd+shift+x",
    "command": "workbench.action.tasks.runTask",
    "args": "⏹️ Stop SpecGofer"
  }
]
```

Then:
- **Start**: `Cmd+Shift+G` then `Cmd+Shift+S`
- **Stop**: `Cmd+Shift+G` then `Cmd+Shift+X`

## Other Useful Tasks

The tasks.json also includes:

- **🔨 Build SpecGofer** - Compile TypeScript
- **🧪 Run Tests** - Execute test suite
- **📊 Test Coverage** - Generate coverage report

## Monitoring Progress

SpecGofer logs status every 30 seconds:

```
📊 Status: T011 - Create comprehensive Extension tests...
```

## SMS Notifications (Optional)

If you've set up Twilio credentials in `.env`, you'll get SMS alerts when:
- Tasks fail after 3 attempts
- Human intervention is needed
- Critical errors occur

## Behind the Scenes

When you hit play, SpecGofer:

1. **Gets Next Task** (`specgofer_get_next_task`)
   - Finds first task with all dependencies completed
   - Skips already completed or failed tasks

2. **Executes Task** (`specgofer_execute_task`)
   - Sends full context to Claude API
   - Claude implements following TDD
   - Updates task status to `in_progress`

3. **Validates Code** (`specgofer_validate_code`)
   - Engineer Agent checks against constitution
   - Ensures TypeScript strict, no `any`, <300 lines/function
   - Verifies security and performance principles

4. **Runs Tests** (`specgofer_run_tests`)
   - Test Agent executes Playwright + Vitest
   - Checks 80%+ coverage requirement
   - Reports pass/fail

5. **Updates Status** (`specgofer_update_task_status`)
   - Marks task `completed` on success
   - Marks `failed` after 3 attempts
   - Moves to next task

6. **Repeats** until all tasks done! 🎉

## Troubleshooting

**Task not starting?**
- Check `.specify/specs/` exists
- Ensure ANTHROPIC_API_KEY in `.env`
- Look for dependency blockers in task list

**Tests failing?**
- Check terminal output for errors
- Review constitution principles in `.specify/memory/constitution.md`
- Orchestrator will retry up to 3 times automatically

**Want to see detailed logs?**
- Output appears in the integrated terminal
- Check VSCode Output panel → "SpecGofer Language Server"

## Advanced: Manual Control

If you prefer command line:

```bash
# Start autonomous mode
npm start

# Stop (Ctrl+C or in another terminal)
pkill -f 'node dist/index.js'

# Build first
npm run build

# Check current specs
ls -la .specify/specs/
```

---

**Remember**: This is drinking our own champagne! SpecGofer is building itself using the specs you created. 🥂

© 2025 Enterprise AI Pty Ltd
