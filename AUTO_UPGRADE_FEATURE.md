# Automatic .specify Folder Detection and Upgrade

## Overview

The extension now **automatically detects** existing `.specify` folders and **upgrades them** if they're in the old JSON format.

## How It Works

### When You Open a Repository

```
1. Extension activates
2. Checks for .specify folder
3. Detects format:
   - None: Offers to initialize
   - Legacy JSON: Offers to upgrade
   - Spec Kit: Ready to use
   - Mixed: Offers to complete migration
```

### Format Detection

The extension can detect 4 states:

#### 1. **None** - No .specify folder
```
.specify/  ← Does not exist
```

**Action**: Offer to initialize

#### 2. **Legacy JSON** - Old format
```
.specify/
├── spec-schema.json
├── example-spec.json          ← JSON files
└── feature-001.json           ← JSON files
```

**Action**: Offer to upgrade to Spec Kit format

#### 3. **Spec Kit** - New format (GitHub standard)
```
.specify/
├── memory/
│   └── constitution.md        ← Spec Kit structure
├── specs/
│   └── 001-feature-name/
│       └── spec.md            ← Markdown specs
└── templates/
```

**Action**: Ready to use!

#### 4. **Mixed** - Has both formats
```
.specify/
├── old-spec.json              ← Legacy
├── memory/                    ← Spec Kit
└── specs/                     ← Spec Kit
```

**Action**: Offer to complete migration

## Upgrade Process

### What Happens During Upgrade

```
1. Creates Spec Kit folder structure:
   - .specify/memory/
   - .specify/scripts/bash/
   - .specify/specs/
   - .specify/templates/

2. Converts JSON specs to Markdown:
   - Reads each .json file
   - Converts to spec.md with YAML frontmatter
   - Creates numbered directories (001-feature-name/)

3. Creates constitution.md:
   - Copies from template
   - Or creates minimal version

4. Creates templates:
   - spec-template.md
   - plan-template.md
   - tasks-template.md

5. Backs up originals:
   - Moves JSON files to _backup/
   - Keeps them for reference
```

### Example Conversion

**Before (JSON):**
```json
{
  "id": "feature-001",
  "title": "User Login",
  "description": "Implement user authentication",
  "tasks": [
    {
      "id": "task-001",
      "description": "Create login form",
      "status": "pending"
    }
  ],
  "acceptanceCriteria": [
    {
      "id": "ac-001",
      "description": "User can log in successfully"
    }
  ]
}
```

**After (Markdown):**
```markdown
---
feature: "001-user-login"
status: "draft"
created: "2025-10-19"
updated: "2025-10-19"
author: "migrated"
---

# Feature Overview

Implement user authentication

## Functional Requirements

1. **FR-001**: Create login form

## Success Criteria

- User can log in successfully

## Key Entities

[To be defined based on implementation]

## Assumptions

- Standard web browser environment
- Users have necessary permissions
```

## User Experience

### Scenario 1: New Repository (No .specify)

```
1. Open repo in VSCode
2. Extension shows notification:
   "No Spec Kit found. Initialize now?"
   [Yes] [No] [Don't ask again]

3. Click "Yes"
4. Extension creates .specify structure
5. Shows welcome message
6. Ready to create specs!
```

### Scenario 2: Repository with Old JSON Format

```
1. Open repo in VSCode
2. Extension detects JSON files
3. Shows notification:
   "📦 Old .specify format detected (JSON)

   Upgrade to GitHub Spec Kit format (Markdown)?"
   [Upgrade Now] [Later] [Learn More]

4. Click "Upgrade Now"
5. Progress notification shows:
   "Upgrading to Spec Kit format...
   ✓ Creating folder structure...
   ✓ Migrating specifications...
   ✓ Creating templates..."

6. Shows success:
   "✅ Upgraded to Spec Kit format!"
   [View Constitution]

7. Tree view now shows Markdown specs
```

### Scenario 3: Repository with Spec Kit Format

```
1. Open repo in VSCode
2. Extension detects Spec Kit format
3. Status bar shows: "$(notebook) Spec Kit ready"
4. Tree view loads all specs
5. Ready to work!
```

### Scenario 4: Mixed Formats

```
1. Open repo in VSCode
2. Extension detects both JSON and Markdown
3. Shows notification:
   "Mixed .specify formats detected.
   Complete migration to Spec Kit?"
   [Migrate] [Later]

4. Click "Migrate"
5. Migrates remaining JSON files
6. Ready to use!
```

## Commands

### Manual Commands Available

**Command Palette (Cmd+Shift+P):**

- `Spec Kit: Initialize Repository` - Create .specify structure
- `Spec Kit: Upgrade to Spec Kit Format` - Convert JSON → Markdown
- `Spec Kit: Check Version` - Show current format status
- `Spec Kit: Refresh Specifications` - Reload from disk

### Automatic Behavior

**On Workspace Open:**
- Automatically detects format
- Offers upgrade if needed
- Configurable via `specKit.autoInitialize` setting

## Settings

```json
{
  "specKit.autoInitialize": true,  // Auto-offer initialization
  "specKit.autoValidate": true,    // Validate against constitution
  "specKit.showWelcome": true      // Show welcome on init
}
```

## Backward Compatibility

### The extension supports BOTH formats:

**Legacy JSON (still works):**
- Reads from .specify/*.json
- Works with old orchestrator
- Can be upgraded anytime

**Spec Kit Markdown (new standard):**
- Reads from .specify/specs/###-name/spec.md
- Follows GitHub Spec Kit standards
- Constitutional validation
- Better for humans to read/edit

### Migration is Safe

- ✅ Original JSON files backed up to `_backup/`
- ✅ Can review before committing changes
- ✅ Git will show all changes for review
- ✅ Non-destructive process

## Implementation Files

**New TypeScript Files:**

1. **`src/specKitMigrator.ts`** ✅ Created
   - Detects format
   - Handles upgrade
   - Converts JSON → Markdown
   - Creates Spec Kit structure

2. **`src/extension-new.ts`** ✅ Created
   - Updated activation logic
   - Automatic detection
   - Upgrade prompts
   - Command registration

**To Use:**
```bash
# Replace old extension.ts with new one
mv extension/src/extension.ts extension/src/extension-old.ts
mv extension/src/extension-new.ts extension/src/extension.ts

# Rebuild
cd extension
npm run compile

# Repackage
npx @vscode/vsce package

# Reinstall
code --install-extension spec-kit-orchestrator-1.0.0.vsix
```

## Testing the Upgrade

### Test with Existing Repo

1. Find a repo with old .specify folder (JSON format)
2. Open in VSCode
3. Extension should detect and offer upgrade
4. Click "Upgrade Now"
5. Verify new structure created
6. Check that specs were converted
7. Review _backup/ folder has originals

### Test with New Repo

1. Open repo without .specify
2. Extension offers to initialize
3. Click "Yes"
4. Verify structure created
5. Check constitution.md exists
6. Check templates created

## Benefits

1. **Seamless Migration** - One-click upgrade
2. **Non-Destructive** - Keeps backups
3. **GitHub Standard** - Aligns with Spec Kit
4. **Better Readability** - Markdown vs JSON
5. **Quality Gates** - Constitution validation
6. **Automatic Detection** - No manual work

## What Gets Migrated

| Old JSON Field | New Markdown Section |
|----------------|---------------------|
| `id` | `feature:` in YAML frontmatter |
| `title` | Feature Overview heading |
| `description` | Feature Overview content |
| `status` | `status:` in YAML frontmatter |
| `tasks[]` | Functional Requirements list |
| `acceptanceCriteria[]` | Success Criteria list |
| `qaRules[]` | Clarifications section |

## Future Enhancements

Potential improvements:
- [ ] Preserve task status during migration
- [ ] Generate plan.md from existing data
- [ ] Create initial tasks.md breakdown
- [ ] Import test files references
- [ ] Migrate custom fields
- [ ] Batch migration for multiple repos

---

**Your .specify folder now automatically upgrades itself!** 🚀
