# 💬 Two-Way WhatsApp Control

## Overview

SpecGofer now supports **two-way WhatsApp communication**! You can:

1. ✅ **Receive notifications** when tasks fail or need help
2. ✅ **Send commands** to control SpecGofer
3. ✅ **Answer questions** when SpecGofer gets stuck
4. ✅ **Provide guidance** to help fix issues

All while your laptop is running and SpecGofer is active!

## Commands You Can Send

### Status Check
```
You: status
```
```
SpecGofer: 📊 Status
🎯 Current Task: T011
📝 Create comprehensive Extension tests
🔄 Status: in_progress
🔢 Attempt: 2/3
```

### Control Commands
- `stop` - Pause SpecGofer
- `skip` - Skip current task and move to next
- `retry` - Reset current task and try again from scratch
- `help` - Show available commands

### Provide Guidance
When SpecGofer asks for help, you can:

**Option 1:** Choose from options
```
SpecGofer: What should I do?
Options:
1. Skip task
2. Retry
3. Provide guidance

You: 2
```

**Option 2:** Give specific guidance
```
SpecGofer: Task failed validation...

You: fix: Split the large function into smaller helpers and add proper TypeScript types
```

SpecGofer will incorporate your guidance and retry!

## How It Works

### Setup (One Time)
1. Enable in `.env`:
   ```bash
   WHATSAPP_ENABLED=true
   WHATSAPP_PHONE_NUMBER=61412345678@c.us
   ```

2. Start SpecGofer → Scan QR code with phone

3. Done! Session persists (no more QR codes)

### During Execution

**SpecGofer runs autonomously:**
- Gets next task
- Implements with Claude
- Validates against constitution
- Runs tests
- Marks complete
- Repeats

**When stuck (after 3 attempts):**
- Sends WhatsApp message with details
- Waits for your response (5 minute timeout)
- Incorporates your guidance
- Retries or skips based on your choice

**You can check in anytime:**
- Send "status" to see what's happening
- Send "stop" to pause
- Send commands without waiting for questions

## Example Conversation

```
[10:00 AM] SpecGofer: ▶️ Starting task T011...

[10:15 AM] You: status

[10:15 AM] SpecGofer: 📊 Status
🎯 Current Task: T011
📝 Create Extension tests
🔄 In progress, attempt 1/3

[10:30 AM] SpecGofer: ❌ Validation failed
Issues:
- Type 'any' not allowed
- Function exceeds 300 lines

What should I do?
1. Skip
2. Retry
3. Provide guidance

[10:31 AM] You: fix: Break down the test into smaller test functions, one per component. Use proper mocking types.

[10:31 AM] SpecGofer: ✅ Guidance noted!
Will incorporate into next attempt.

[10:45 AM] SpecGofer: ✅ Task T011 completed!
Moving to T012...
```

## Benefits

✅ **Stay in Control** - Monitor progress from anywhere  
✅ **Unblock Issues** - Provide guidance when stuck  
✅ **Save Time** - Don't wait for 3 failed attempts  
✅ **Mobile First** - Manage from your phone  
✅ **Always Available** - Works as long as laptop is running  

## Technical Details

- Uses `whatsapp-web.js` (connects to WhatsApp Web)
- Listens for incoming messages from your number only
- 5 minute timeout on questions (then marks failed)
- Session persists in `.wwebjs_auth/` folder
- Works alongside WhatsApp Desktop/Mobile

## Security

✅ Only responds to YOUR phone number  
✅ Session data stored locally  
✅ Not committed to git (`.gitignore`)  
✅ End-to-end encrypted (WhatsApp)  

## Limitations

- Laptop must be running
- SpecGofer process must be active
- Internet connection required
- WhatsApp account must be linked

## Future Ideas

- Voice message support for complex guidance
- Screenshot sharing of errors
- Group chat support for team collaboration
- Slash commands for quick actions

---

**This is the future of AI development!** 🚀

You write specs, SpecGofer builds autonomously, you guide via WhatsApp when needed!

© 2025 Enterprise AI Pty Ltd
