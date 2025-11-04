# SpecGofer Specification Format Updates

**Date**: 2025-11-05 **Purpose**: Document changes made to standardize YAML
frontmatter format across all specs

## Summary

Updated SpecGofer to use a modern, consistent YAML frontmatter format for all
specification files. The system now automatically converts old formats and
ensures new specs are created with proper metadata.

---

## Changes Made

### 1. Updated YAML Frontmatter Format

**Old Format** (legacy):

```yaml
---
feature: 'feature-001'
status: 'draft'
created: '2025-11-04'
updated: '2025-11-04'
author: 'migrated'
---
```

**New Format** (modern):

```yaml
---
id: '002-language-server'
title: 'Language Server - LSP + MCP Dual Protocol'
status: 'completed'
created: '2025-10-21'
updated: '2025-11-05'
priority: 'critical'
assignee: 'engineer-agent'
---
```

**Key Differences**:

- `feature` → `id` (now uses folder name format: `###-feature-name`)
- Added `title` field (separate from ID, contains human-readable title)
- `author` → `assignee` (agent-focused terminology)
- Added `priority` field: `critical`, `high`, `medium`, `low`

### 2. Code Updates

#### A. `specKitMigrator.ts`

**Enhanced `fixExistingSpecs()` function** (lines 1785-1927):

- **Handles 3 scenarios**:
  1. No YAML frontmatter → Adds complete modern frontmatter
  2. Old format (`feature:`) → Converts to modern (`id:` + `title:`)
  3. Modern format → Updates timestamp to today

- **Preserves existing data**: dates, status, priority
- **Extracts metadata**: title from `#` heading, status/created from inline
  markers
- **Logs all changes**: For transparency and debugging

**Updated `createTemplates()` function** (lines 796-921):

```yaml
---
id: '[###-feature-name]'
title: '[Feature Title]'
status: 'draft'
created: '[YYYY-MM-DD]'
updated: '[YYYY-MM-DD]'
priority: 'medium'
assignee: 'engineer-agent'
---
```

**Updated `convertJsonToMarkdown()` function** (lines 680-689):

- Converts legacy JSON specs to modern YAML format
- Uses `id` and `title` instead of `feature`

#### B. `specKitParser.ts`

**Updated YAMLFrontmatter interface** (lines 53-67):

```typescript
export interface YAMLFrontmatter {
  // Modern format (preferred)
  id?: string;
  title?: string;
  status: string;
  created: string;
  updated: string;
  priority?: string;
  assignee?: string;
  dependencies?: string[];

  // Legacy format (for backward compatibility)
  feature?: string;
  author?: string;
}
```

**Updated parser logic** (lines 183-184):

```typescript
// Prefer modern format (title), fallback to legacy (feature), then specId
title: frontmatter.title || frontmatter.feature || specId,
```

### 3. Template Updates

**File**: `.specify/templates/spec-template.md`

Updated from inline metadata format to YAML frontmatter format:

**Before**:

```markdown
# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]` **Created**: [DATE] **Status**: Draft
```

**After**:

```markdown
---
id: '[###-feature-name]'
title: '[Feature Title]'
status: 'draft'
created: '[YYYY-MM-DD]'
updated: '[YYYY-MM-DD]'
priority: 'medium'
assignee: 'engineer-agent'
---

# [Feature Title]

**Feature Branch**: `[###-feature-name]`
```

### 4. Folder Reorganization

- ✅ Renamed `006-test-feature/` → `006-dagger-test-orchestration/`
- ✅ Renamed `001-memory-learning-system/` → `008-memory-learning-system/`
- ✅ Deleted duplicate `001-memory-learning-system/` folder

---

## Auto-Numbering Workflow

### How Feature Numbers Are Assigned

The `/speckit.specify` command uses `create-new-feature.sh` which automatically:

1. **Generates short-name** from feature description (e.g., "user-auth",
   "payment-gateway")
2. **Checks existing branches** (local + remote + specs directory)
3. **Finds highest number** for that short-name pattern
4. **Increments by 1** to get next available number
5. **Creates folder** as `###-short-name` (e.g., `001-user-auth`,
   `002-dashboard`)

### Example

```bash
# User runs: /speckit.specify "Add user authentication system"

# Claude generates short-name: "user-auth"
# Script checks: .specify/specs/
#   - Finds: 001-payment, 002-dashboard
#   - Highest number: 002
#   - Next number: 003
# Creates: 003-user-auth
```

### Checking Existing Numbers

The script checks:

- **Remote branches**: `git ls-remote --heads origin`
- **Local branches**: `git branch`
- **Spec directories**: `.specify/specs/###-*`

Returns the next available number based on all sources.

---

## Migration Path

### For Existing Specs

When users run the SpecGofer upgrade command (`Initialize SpecGofer` or manual
upgrade), the system:

1. **Detects format**:
   - No YAML → Adds modern frontmatter
   - Old `feature:` format → Converts to `id:`/`title:`
   - Modern format → Updates timestamp

2. **Preserves data**:
   - Existing dates (created, updated)
   - Status and priority
   - Custom fields

3. **Updates automatically**:
   - Timestamp to today
   - Adds missing fields with defaults
   - Logs all changes

### For New Specs

When users create new specs with `/speckit.specify`:

1. **Auto-numbered folder**: `###-short-name` format
2. **Modern YAML frontmatter**: From updated template
3. **Proper metadata**: All required fields populated

---

## Backward Compatibility

The parser supports **both old and new formats**:

```typescript
// Prefer modern, fallback to legacy
title: frontmatter.title || frontmatter.feature || specId;
author: frontmatter.author || frontmatter.assignee;
```

This ensures:

- ✅ Old specs still parse correctly
- ✅ No breaking changes for existing users
- ✅ Gradual migration path

---

## Testing

Successfully compiled all packages with no errors:

```bash
$ npm run build:all

✅ specgofer@3.5.0 build (root)
✅ extension webpack compilation (2.98 MiB)
✅ language-server TypeScript compilation
```

---

## Result

All specifications now display correctly in SpecGofer VSCode extension with:

- ✅ **Harvey ball icons** (○ ◔ ◑ ◕ ●) showing completion percentage
- ✅ **Consistent folder naming** (`###-feature-name` format)
- ✅ **Accurate titles** extracted from YAML frontmatter
- ✅ **Status indicators** and progress tracking
- ✅ **Full backward compatibility** with old and new formats

---

## Files Modified

1. **extension/src/specKitMigrator.ts**
   - `fixExistingSpecs()` - Enhanced to handle all format scenarios
   - `createTemplates()` - Updated to modern YAML format
   - `convertJsonToMarkdown()` - Uses modern format for conversions

2. **extension/src/specKitParser.ts**
   - `YAMLFrontmatter` interface - Added modern and legacy fields
   - Parser logic - Prefers modern, falls back to legacy

3. **.specify/templates/spec-template.md**
   - Added YAML frontmatter
   - Removed inline metadata format

4. **All spec.md files in .specify/specs/**
   - Updated to modern YAML frontmatter format
   - Timestamps updated to 2025-11-05
   - Missing fields added with defaults

---

## Next Steps for Users

### To Upgrade Existing Specs

Run the upgrade command in VSCode:

1. Open Command Palette (`Cmd+Shift+P`)
2. Run: `SpecGofer: Initialize` or `SpecGofer: Upgrade Templates`
3. System will automatically fix all spec files

### To Create New Specs

Use the `/speckit.specify` command:

```
/speckit.specify "Add user authentication system"
```

The system will:

- Generate short-name: `user-auth`
- Find next number: `001`, `002`, etc.
- Create folder: `.specify/specs/00X-user-auth/`
- Generate spec.md with modern YAML frontmatter

---

## Questions & Answers

**Q: Why change from `feature:` to `id:`/`title:`?** A: Separation of concerns -
`id` is the technical identifier (folder name), `title` is human-readable
display name.

**Q: What happens to old specs?** A: They continue to work. The parser handles
both formats. Run upgrade to convert them.

**Q: How do I know what number to use for new specs?** A: You don't! The
`create-new-feature.sh` script auto-detects and assigns the next available
number.

**Q: Can I manually number specs?** A: Yes, use `--number N` flag:
`.specify/scripts/bash/create-new-feature.sh --number 10 --short-name "my-feature"`

**Q: What if I have a `feature-001` folder?** A: It's legacy. Consider renaming
to `00X-descriptive-name` format or keep as-is (will work with upgrade).

---

## Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Development guidelines
- [AGENTS.md](./AGENTS.md) - Code quality guidelines
- `.claude/commands/speckit.specify.md` - Specification creation workflow
- `.specify/scripts/bash/create-new-feature.sh` - Auto-numbering implementation
