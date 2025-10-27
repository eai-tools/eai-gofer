# Documentation Fixes - SpecGofer Extension README

**Date**: 2025-10-28  
**Issue**: Incorrect/misleading information in extension README about markdown viewer settings

## Problems Fixed

### 1. Incorrect Search Term for Settings ❌ → ✅

**Before (Incorrect):**
```
2. Search for "SpecGofer Markdown Viewer"
```

**After (Correct):**
```
2. Search for `specKit.markdownViewer` or just `markdown viewer`
3. In the "Speckit: Markdown Viewer" dropdown, choose your preferred viewer:
   - `preview` - VSCode's built-in preview (default)
   - `mark-sharp` - Mark Sharp WYSIWYG editor
   - `markdown-editor` - Markdown Editor by zaaack
   - `markdown-wysiwyg` - Markdown WYSIWYG by adamerose
```

**Explanation**: 
- The setting key in VSCode is `specKit.markdownViewer` (defined in package.json line 341)
- Searching for "SpecGofer Markdown Viewer" would not find the setting
- Now users are given the exact setting key and clear dropdown options

### 2. Broken Mark Sharp Extension Link ❌ → ✅

**Before (Potentially Broken):**
```markdown
- **Install**: [Mark Sharp Extension](https://marketplace.visualstudio.com/items?itemName=JonathanYeung.mark-sharp)
```

**After (More Reliable):**
```markdown
- **Install**: Search "Mark Sharp" in VSCode Extensions or install via Command Palette: `ext install JonathanYeung.mark-sharp`
- **Note**: If the extension is not available, you may need to search for alternative markdown WYSIWYG editors in the marketplace
```

**Explanation**:
- The marketplace link may not work if the extension is unavailable
- Added alternative installation methods
- Added note about finding alternatives if needed

### 3. Fixed Markdown Linting Issues ✅

**Added blank lines around headings and lists to comply with markdownlint rules:**
- MD022: Headings now surrounded by blank lines
- MD032: Lists now surrounded by blank lines

## Verification

The setting **DOES EXIST** and is properly configured:

```json
// extension/package.json (lines 341-358)
"specKit.markdownViewer": {
  "type": "string",
  "enum": [
    "preview",
    "mark-sharp",
    "markdown-editor",
    "markdown-wysiwyg"
  ],
  "default": "preview",
  "description": "Choose how to view markdown files when clicking tree view items"
}
```

## How to Use (Corrected Instructions)

1. **Open VSCode Settings**: `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)
2. **Search for**: `specKit.markdownViewer` OR `markdown viewer`
3. **Select from dropdown**:
   - `preview` (default) - Built-in VSCode preview
   - `mark-sharp` - Requires Mark Sharp extension
   - `markdown-editor` - Requires Markdown Editor extension  
   - `markdown-wysiwyg` - Requires Markdown WYSIWYG extension

4. **Alternative**: Right-click any item in SpecGofer sidebar and choose "Open with..." option

## Files Modified

- `extension/README.md` - Lines 99-144 (Markdown Viewing Options section)

## Impact

✅ Users can now correctly find and configure the markdown viewer setting  
✅ Clear instructions for all 4 viewer options  
✅ Markdown linting errors resolved  
✅ More robust installation instructions with fallbacks
