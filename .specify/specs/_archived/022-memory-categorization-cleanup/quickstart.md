# Quickstart: Memory System Categorization Cleanup

## Prerequisites

- Node.js 20.x
- npm dependencies installed (`npm install`)

## Testing the Feature

### Manual Testing

1. Open the Gofer sidebar in VSCode
2. **Memory panel**: Should show only 2 root sections — Memories and Decisions
   (no Observations, no Checkpoints)
3. **Memory panel title bar**: Should show only the Refresh button (no
   Constitution button)
4. **Specifications panel title bar**: Should show Constitution button alongside
   Refresh and Update
5. **Context Window panel**: "Memories & Hints" label (not "Memories/Hints")
6. **Command Palette**: `Gofer: Show Constitution Panel` still works

### Automated Tests

```bash
# Run all tests
npm test

# Run specific affected tests
npx vitest run tests/unit/memoryProvider.test.ts
npx vitest run tests/unit/autonomous/ContextBuilder.test.ts
npx vitest run tests/unit/autonomous/MemoryLayerManager.test.ts
```

## Key Files

| File                                             | Purpose                                 |
| ------------------------------------------------ | --------------------------------------- |
| `extension/src/memoryProvider.ts`                | Memory panel tree view (2 sections now) |
| `extension/src/autonomous/ContextBuilder.ts`     | Budget with separate `constitution` key |
| `extension/src/autonomous/MemoryLayerManager.ts` | Core memory without constitution        |
| `extension/src/config.ts`                        | Accurate VIEWS constant                 |
| `extension/src/contextWindowProvider.ts`         | Renamed category label                  |
| `extension/package.json`                         | Menu button placement                   |

## Common Issues

### Constitution button missing from Specifications panel

**Problem**: Button doesn't appear after the change **Solution**: Check
`package.json` menu entry has `when: "view == goferProgress"` and the
`gofer.showConstitution` command is still registered in extension.ts

### Budget tests fail

**Problem**: Tests expect old `memory` budget to include constitution tokens
**Solution**: Update test assertions to check for separate `constitution` key in
usage object
