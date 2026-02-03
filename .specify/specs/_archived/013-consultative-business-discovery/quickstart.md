# Quickstart: Consultative Business Discovery

## Prerequisites

- Claude Code CLI installed
- Gofer extension active in VSCode
- Access to `.claude/commands/` directory

## Testing the Feature

### Manual Testing

#### Test 1: Full Discovery Flow (Happy Path)

1. Run `/0_business_scenario` in Claude Code
2. Select "New Feature" scenario
3. Verify AI asks about the problem you're solving
   - Should show options table with implications
   - Should show "Recommended:" option with reasoning
4. Reply "yes" to accept recommendation or select an option
5. Verify AI asks about target users
6. Continue through Value Proposition and Metrics questions
7. Verify `discovery.md` is created in feature directory
8. Verify Memory entries exist with category 'discovery'

**Expected Output**:

- `.specify/specs/{feature}/discovery.md` - Complete discovery artifact
- Memory entries with tags `#discovery`, `#feature-{id}`

#### Test 2: Skip Discovery Option

1. Run `/0_business_scenario`
2. When first question appears, select "Skip Discovery"
3. Verify routing proceeds directly to pipeline
4. Verify NO discovery.md is created

**Expected Behavior**: Standard routing with no discovery phase

#### Test 3: Adaptive Depth

1. Run `/0_business_scenario`
2. When asked about the problem, respond "I'm not sure"
3. Verify AI offers deeper exploration options
4. Accept deeper exploration
5. Verify additional clarifying questions are asked

**Expected Behavior**: Additional questions offered when uncertainty detected

#### Test 4: Recommendation Shortcuts

1. Run `/0_business_scenario`
2. At each question, respond with "yes" or "recommended"
3. Verify AI accepts the recommendation without re-asking
4. Verify discovery.md contains the recommended choices

**Expected Behavior**: Shortcuts work, flow continues smoothly

#### Test 5: Mid-Flow Abandonment

1. Run `/0_business_scenario`
2. Answer 2-3 discovery questions
3. Cancel/abandon the session
4. Check feature directory

**Expected Behavior**: Partial `discovery.md` saved with `status: incomplete`

#### Test 6: Re-run Discovery on Existing Feature

1. Complete full discovery for a feature
2. Run `/0_business_scenario` again on same feature
3. Verify prompt asks whether to merge or replace existing discovery

**Expected Behavior**: User choice to merge or replace

### Pipeline Integration Tests

#### Test 7: Research Uses Discovery Context

1. Complete discovery for a new feature
2. Run `/1_gofer_research`
3. Verify research loads discovery.md at start
4. Verify research focuses on areas identified in discovery

**Expected Behavior**: Research is informed by discovery findings

#### Test 8: Spec Auto-Populates from Discovery

1. Complete discovery for a new feature
2. Run `/2_gofer_specify`
3. Verify spec.md sections pre-filled from discovery:
   - User stories reference discovered users
   - Requirements address discovered problem
   - Success criteria match discovery metrics

**Expected Behavior**: Spec sections populated from discovery

### Memory System Tests

#### Test 9: Memory Entries Created

After completing discovery:

```typescript
// Verify via MemoryManager API or debug output
const memories = await memoryManager.load({
  category: 'discovery',
  tags: ['#feature-{id}'],
});

// Should return entries for:
// - Problem statement
// - Target users
// - Value proposition
```

#### Test 10: ContextBuilder Loads Discovery

When running pipeline stages:

```typescript
// Verify ContextBuilder includes discovery memories
const context = await contextBuilder.loadRelevantMemories(featureId);
// Should include discovery category memories
```

## Key Files

| File                                         | Purpose                     |
| -------------------------------------------- | --------------------------- |
| `.claude/commands/0_business_scenario.md`    | Primary implementation      |
| `.specify/templates/discovery-template.md`   | Discovery artifact template |
| `extension/src/autonomous/MemoryManager.ts`  | Memory persistence          |
| `extension/src/autonomous/ContextBuilder.ts` | Context loading             |

## Common Issues

### Issue 1: Discovery Questions Not Appearing

**Problem**: Orchestrator skips straight to routing without discovery
**Solution**: Check that discovery phase is enabled in command. Verify "Skip
Discovery" wasn't accidentally selected.

### Issue 2: Memory Entries Not Created

**Problem**: discovery.md created but no Memory entries **Solution**: Check
MemoryManager.save() calls in discovery phase. Verify category is 'discovery'
and tags are correct.

### Issue 3: Spec Not Auto-Populating

**Problem**: Spec doesn't include discovery findings **Solution**: Check
`/2_gofer_specify` loads discovery.md. Verify discovery.md exists in feature
directory.

### Issue 4: Bundled Command Out of Sync

**Problem**: Changes not reflected when running through extension **Solution**:
Run sync to `extension/resources/claude-commands/`. Rebuild extension.

## Verification Checklist

- [ ] Full discovery flow creates discovery.md
- [ ] Skip option bypasses discovery
- [ ] Adaptive depth offers deeper questions on uncertainty
- [ ] "yes"/"recommended" shortcuts work
- [ ] Memory entries created with correct category and tags
- [ ] Research command loads discovery context
- [ ] Specify command auto-populates from discovery
- [ ] Bundled commands stay in sync
- [ ] Partial discovery saved on abandonment
- [ ] Re-run asks merge vs replace
