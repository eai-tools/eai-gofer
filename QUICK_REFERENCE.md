# Quick Reference Guide

## 🚀 Getting Started (5 Minutes)

```bash
# 1. Install orchestrator
npm install && npm run build

# 2. Install extension
cd extension && npm install && npm run compile

# 3. Open in VSCode and press F5

# 4. In new window: Cmd+Shift+P → "Spec Orchestrator: Start"
```

---

## 📋 Creating a Spec

Minimum viable spec in `.specify/my-feature.json`:

```json
{
  "id": "unique-id",
  "title": "Feature Name",
  "description": "What this does",
  "tasks": [
    {
      "id": "task-001",
      "description": "What to build",
      "deliveryPrompt": "Detailed instructions for Claude",
      "status": "pending",
      "dependencies": []
    }
  ],
  "acceptanceCriteria": [
    {
      "id": "ac-001",
      "description": "Test description",
      "testType": "playwright",
      "testPath": "tests/my-test.spec.ts"
    }
  ]
}
```

---

## 🎯 Task Statuses

- `pending` - Not started yet
- `in_progress` - Claude is working on it
- `testing` - Playwright tests running
- `completed` - ✅ Tests passed
- `failed` - ❌ Exceeded 3 retry attempts

---

## 📁 Important Files

### In Your Workspace

| File | Purpose | Who Writes |
|------|---------|------------|
| `.claude-input.txt` | Task prompts | Orchestrator |
| `.claude-output.txt` | Implementations | Extension |
| `.claude-history.json` | Conversation context | Extension |
| `.claude-question.txt` | Questions from Claude | Extension |

### Configuration

| File | Purpose |
|------|---------|
| `.env` | API keys and settings |
| `.specify/*.json` | Your specifications |
| `tests/*.spec.ts` | Playwright tests |

---

## 🔧 VSCode Commands

| Command | Keyboard | Purpose |
|---------|----------|---------|
| `Spec Orchestrator: Start` | - | Start automation |
| `Spec Orchestrator: Stop` | - | Stop automation |
| `Spec Orchestrator: Show Progress Panel` | - | Open tree view |
| `Spec Orchestrator: Refresh Specs` | - | Reload specs |
| Command Palette | `Cmd+Shift+P` | Open commands |

---

## 📊 Monitoring

### View Logs

1. **Orchestrator Output**:
   - `Cmd+Shift+U` → Select "Spec Orchestrator"

2. **Extension Logs**:
   - Help → Toggle Developer Tools → Console

3. **Progress Tree**:
   - Explorer sidebar → "Spec Orchestrator" panel

---

## 🐛 Common Issues

### Extension won't start
```bash
# Check .specify folder exists
ls -la .specify

# Reload window
Cmd+Shift+P → "Developer: Reload Window"
```

### API key error
```bash
# Add to .env
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env

# Or set in VSCode settings
# Search: "Spec Orchestrator"
```

### Tests not running
```bash
# Install Playwright
npx playwright install

# Run manually to test
npx playwright test
```

### File monitor stuck
```bash
# Check files exist
ls -la .claude-*.txt

# Restart orchestrator
# Stop → Start in VSCode
```

---

## 🎨 Spec Best Practices

### ✅ Good Spec

```json
{
  "deliveryPrompt": "Create a LoginButton component:\n- Blue background (#0066CC)\n- White text, 16px\n- Rounded 8px corners\n- Disabled state: gray (#CCCCCC)\n- Loading state: spinner icon\n- onClick handler prop"
}
```

### ❌ Bad Spec

```json
{
  "deliveryPrompt": "Make a button"
}
```

---

## 🔄 Workflow Loop

```
Spec → Task → Claude → Code → Tests → Pass?
                                         ↓ YES: Next task
                                         ↓ NO: Fix (retry up to 3x)
                                         ↓ Still failing: SMS alert
```

---

## 📞 SMS Notifications

You'll receive SMS when:
- ❓ Question can't be answered from spec
- ❌ Task fails after 3 attempts
- ⚠️ Manual intervention needed

Configure in `.env`:
```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
YOUR_PHONE_NUMBER=+1234567890
```

---

## 🧪 Writing Tests

Example Playwright test:

```typescript
import { test, expect } from '@playwright/test';

test('login form works', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Fill form
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');

  // Submit
  await page.click('button[type="submit"]');

  // Verify
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

---

## 🔍 Debugging

### View what Claude received
```bash
cat .claude-input.txt
```

### View what Claude responded
```bash
cat .claude-output.txt
```

### View conversation history
```bash
cat .claude-history.json | jq
```

### Check current task
Look at tree view in VSCode Explorer

---

## ⚡ Pro Tips

1. **Break tasks into small chunks** - Easier for Claude to implement
2. **Write tests first** - Know what success looks like
3. **Use dependencies** - Control execution order
4. **Add QA rules** - Answer common questions upfront
5. **Monitor progress** - Watch the tree view
6. **Review generated code** - Learn Claude's patterns
7. **Iterate on specs** - Improve based on results

---

## 🎓 Learning Resources

- [README.md](README.md) - Full documentation
- [SETUP.md](SETUP.md) - Complete setup guide
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - How it works
- [extension/README.md](extension/README.md) - Extension details
- `.specify/example-spec.json` - Example spec

---

## 📊 Status Icons

| Icon | Status | Meaning |
|------|--------|---------|
| ⚪ | Pending | Waiting to start |
| 🔄 | In Progress | Claude working |
| 🧪 | Testing | Tests running |
| ✅ | Completed | Success! |
| ❌ | Failed | Needs attention |

---

## 🚨 Emergency Stop

If something goes wrong:

```
1. Stop orchestrator: Cmd+Shift+P → "Spec Orchestrator: Stop"
2. Check logs: Output channel → "Spec Orchestrator"
3. Clear communication files: rm .claude-*.txt .claude-*.json
4. Restart: Cmd+Shift+P → "Spec Orchestrator: Start"
```

---

## 🎯 Success Checklist

After starting, verify:

- [ ] "Spec Orchestrator" panel visible in Explorer
- [ ] Status bar shows "Orchestrator Running"
- [ ] Output channel shows orchestrator logs
- [ ] `.claude-input.txt` created in workspace
- [ ] Tree view shows your specs
- [ ] No errors in output channel

---

## 💡 Example Session

```bash
# 1. Create spec
cat > .specify/button.json << 'EOF'
{
  "id": "btn-001",
  "title": "Primary Button",
  "tasks": [{
    "id": "t1",
    "description": "Create button component",
    "deliveryPrompt": "Create a React button component...",
    "status": "pending",
    "dependencies": []
  }],
  "acceptanceCriteria": [{
    "id": "ac1",
    "testType": "playwright",
    "testPath": "tests/button.spec.ts"
  }]
}
EOF

# 2. Create test
mkdir -p tests
cat > tests/button.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';
test('button renders', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('button')).toBeVisible();
});
EOF

# 3. Start in VSCode
# Cmd+Shift+P → "Spec Orchestrator: Start"

# 4. Watch it work!
# Tree view shows progress in real-time
```

---

## 🎬 What Happens Next

1. Extension reads your spec ✓
2. Claude implements the button ✓
3. Tests run automatically ✓
4. If tests pass → Done! ✓
5. If tests fail → Fix automatically ✓
6. Repeat until success ✓

**You just watch!**

---

Need more help? See [SETUP.md](SETUP.md) for detailed instructions.
