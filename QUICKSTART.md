# SpecGofer Quick Start Guide

## What is SpecGofer?

SpecGofer is an AI-powered development system that helps you build features from specifications. It works with Claude Code and GitHub Copilot to autonomously implement your feature specs.

## Installation

1. **Install the Extension**:
   - Download `specgofer-1.14.0.vsix` from [GitHub Releases](https://github.com/eai-tools/specgofer/releases)
   - Or install from: https://eai-tools.github.io/specgofer/releases/specgofer-1.14.0.vsix
   - In VSCode: Extensions → `...` → Install from VSIX

2. **Initialize Your Project**:
   - Open your project in VSCode
   - Command Palette (`Cmd+Shift+P`) → `SpecGofer: Initialize Repository`
   - This creates the `.specify/` folder structure

## The SpecGofer Workflow

### Step 1: Create a Feature Specification

**Option A - Using Slash Commands (Recommended)**:

```bash
# In Claude Code chat
/speckit.specify

# Then provide your feature description
"Create a user authentication system with login, logout, and password reset"
```

**Option B - Manual**:

1. Create a folder: `.specify/specs/001-your-feature/`
2. Create `spec.md` with your feature description
3. Run `/speckit.specify` to convert it to proper format

### Step 2: Generate Implementation Plan

```bash
# In Claude Code chat
/speckit.plan
```

This analyzes your spec and creates:
- `plan.md` - Technical implementation approach
- `tasks.md` - Ordered list of tasks with dependencies
- Design artifacts in `contracts/` folder

### Step 3: Let SpecGofer Implement It

```bash
# In Claude Code chat
/speckit.implement
```

This will:
- ✅ Read all tasks from `tasks.md`
- ✅ Implement them in dependency order
- ✅ Run tests after each task
- ✅ Validate against your constitution
- ✅ Update task status automatically
- ✅ Keep going until everything is done!

### Step 4: Monitor Progress

Use the **SpecGofer sidebar** in VSCode:
- See all your specs
- Track task completion
- Click on items to see details
- Refresh to see latest status

## Understanding the Slash Commands

### `/speckit.specify`
**What it does**: Creates or updates a feature specification
**When to use**: At the start of a new feature
**Input**: Natural language description of what you want to build
**Output**: Structured `spec.md` file

### `/speckit.plan`
**What it does**: Generates implementation plan from your spec
**When to use**: After you have a spec.md
**Output**: `plan.md`, `tasks.md`, contract definitions

### `/speckit.implement`
**What it does**: Autonomously implements all tasks
**When to use**: After you have tasks.md
**What happens**:
- Reads each task in dependency order
- Implements the code
- Runs tests
- Validates quality
- Marks tasks complete
- Continues until done!

### `/speckit.clarify`
**What it does**: Identifies unclear parts of your spec
**When to use**: When your spec feels incomplete
**Output**: Updated spec with clarifications

### `/speckit.analyze`
**What it does**: Checks consistency across spec, plan, and tasks
**When to use**: Before running `/speckit.implement`
**Output**: Analysis report with any issues found

## Complete Example Workflow

```bash
# 1. Start with an idea
/speckit.specify
"Build a REST API for managing blog posts with CRUD operations,
authentication, and markdown support"

# 2. Generate the plan
/speckit.plan

# 3. (Optional) Clarify anything unclear
/speckit.clarify

# 4. (Optional) Check everything looks good
/speckit.analyze

# 5. Let it build!
/speckit.implement

# SpecGofer will now:
# - Implement each task
# - Run tests
# - Fix any failures
# - Continue until complete
# - You can watch in the sidebar!
```

## How to Use in Claude Code Terminal

The key is **you don't need to manually guide each step**. Just:

1. **Start the workflow** with `/speckit.specify`
2. **Generate the plan** with `/speckit.plan`
3. **Let it run** with `/speckit.implement`

Claude Code + SpecGofer will:
- Read your tasks
- Implement them one by one
- Test each implementation
- Fix failures automatically (with retries)
- Update progress
- Keep going until done

You can monitor progress in the SpecGofer sidebar while it works!

## Tips for Success

### 1. Write Good Specifications

**Good Example**:
```markdown
## User Story
As a developer, I want to authenticate users with JWT tokens
so that I can secure API endpoints.

## Requirements
- FR-001: Users can register with email/password
- FR-002: Users can login and receive JWT token
- FR-003: Tokens expire after 1 hour
- FR-004: Protected endpoints validate tokens

## Acceptance Criteria
- [ ] Registration endpoint returns 201 on success
- [ ] Login returns valid JWT token
- [ ] Invalid credentials return 401
- [ ] Protected routes reject invalid tokens
```

### 2. Use the Constitution

Your `.specify/memory/constitution.md` contains project rules:
- Coding standards
- Architecture patterns
- Security requirements
- Testing requirements

SpecGofer validates against these automatically!

### 3. Check Progress Regularly

- Use the SpecGofer sidebar
- Click on specs to see details
- Refresh to see latest updates
- Green checkmarks = done!

### 4. Let It Handle Failures

If a task fails:
- SpecGofer retries up to 3 times
- Uses exponential backoff
- If still failing, escalates to you
- You can intervene and it continues

## Common Questions

### Q: Can I pause and resume?

**A**: Yes! SpecGofer saves task status in `tasks.md`. Stop anytime, and run `/speckit.implement` again to resume.

### Q: What if I want to change something mid-way?

**A**:
1. Stop the current run
2. Edit your `spec.md` or `tasks.md`
3. Run `/speckit.plan` to regenerate tasks
4. Run `/speckit.implement` to continue

### Q: How do I know what's happening?

**A**: Watch the SpecGofer sidebar! Tasks show:
- ⏳ Pending (gray)
- 🔄 In Progress (yellow)
- ✅ Completed (green)
- ❌ Failed (red)

### Q: Can it work on multiple features at once?

**A**: You can have multiple specs, but `/speckit.implement` works on one at a time. Run it separately for each feature.

### Q: What if tests fail?

**A**: SpecGofer will:
1. Read the test failure
2. Fix the code
3. Run tests again
4. Retry up to 3 times
5. If still failing, asks you for help

## Troubleshooting

### Commands not found

**Fix**: Make sure SpecGofer extension is installed and workspace has `.specify/` folder.

### "No spec found"

**Fix**: Run `/speckit.specify` first to create a spec.

### "No tasks found"

**Fix**: Run `/speckit.plan` to generate tasks from your spec.

### Extension not activating

**Fix**: Check VSCode version is 1.85.0+. Reload window (`Cmd+Shift+P` → Reload Window).

### Sidebar not showing

**Fix**: Click the SpecGofer icon in the Activity Bar (left side of VSCode).

## Markdown Viewing Options

SpecGofer lets you view and edit your specifications, constitution, and memory documents in different ways. By default, it uses VSCode's built-in markdown preview (read-only), but you can install WYSIWYG editors for a better editing experience.

### Available Viewers

#### 1. VSCode Preview (Default)

- **Built-in** - no installation needed
- **Read-only** viewing
- Fast and lightweight
- Good for reviewing specs

#### 2. Mark Sharp (Recommended for WYSIWYG)

- **Install**: [Mark Sharp Extension](https://marketplace.visualstudio.com/items?itemName=JonathanYeung.mark-sharp)
- **Features**: Fast WYSIWYG editor with live preview
- **Best for**: Quick edits while seeing rendered output
- **Command**: `Cmd+Shift+P` → "Mark Sharp: Switch Editor Mode"

#### 3. Markdown Editor by zaaack

- **Install**: [Markdown Editor Extension](https://marketplace.visualstudio.com/items?itemName=zaaack.markdown-editor)
- **Features**: Feature-rich WYSIWYG with formatting toolbar
- **Best for**: Complex documents with tables and formatting
- **Shortcut**: `Ctrl+Shift+Alt+M` (Windows/Linux) or `Cmd+Shift+Alt+M` (Mac)

#### 4. Markdown WYSIWYG

- **Install**: [Markdown WYSIWYG Extension](https://marketplace.visualstudio.com/items?itemName=adamerose.markdown-wysiwyg)
- **Features**: Simple WYSIWYG toggle
- **Best for**: Basic editing with visual feedback
- **Toggle**: `Ctrl+Shift+E` (Windows/Linux) or `Cmd+Shift+E` (Mac)

### How to Use

#### Set Your Default Viewer

1. Open VSCode Settings (`Cmd+,`)
2. Search for "SpecGofer Markdown Viewer"
3. Choose your preferred viewer:
   - **preview** - Built-in preview (read-only)
   - **mark-sharp** - Mark Sharp WYSIWYG
   - **markdown-editor** - Markdown Editor
   - **markdown-wysiwyg** - Markdown WYSIWYG

#### Use Context Menu for One-Time Choice

Right-click any item in the SpecGofer sidebar (Specifications, Constitution, or Memory):

- **Open with Preview** - Use VSCode's built-in preview
- **Open with Mark Sharp** - Use Mark Sharp WYSIWYG
- **Open with Markdown Editor** - Use Markdown Editor
- **Open with Markdown WYSIWYG** - Use Markdown WYSIWYG

This lets you choose a different viewer each time without changing your default setting.

### Installation Tips

**To install a WYSIWYG extension**:

1. Open Extensions view (`Cmd+Shift+X`)
2. Search for the extension name
3. Click Install
4. Reload VSCode if prompted
5. Update your SpecGofer setting or use the context menu

**If you get an error** when using a WYSIWYG viewer:

- Make sure the extension is installed
- Check that you've reloaded VSCode after installation
- Try the context menu "Open With..." option to test
- Fall back to "preview" in settings if issues persist

## Next Steps

1. **Try the example above** - Create a simple API spec and let it build
2. **Read your constitution** - `.specify/memory/constitution.md`
3. **Customize templates** - `.specify/templates/` folder
4. **Explore MCP tools** - See what's available in `.vscode/mcp.json`

## Support

- GitHub Issues: https://github.com/eai-tools/specgofer/issues
- Documentation: https://eai-tools.github.io/specgofer/

---

**Remember**: SpecGofer is autonomous. Your job is to write good specs. SpecGofer's job is to build them!
