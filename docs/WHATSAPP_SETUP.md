# 💬 WhatsApp Notifications Setup

## Why WhatsApp?

✅ **Free** - No per-message costs like Twilio SMS  
✅ **Better UX** - Rich formatting, read receipts, replies  
✅ **You Already Have It** - Use your existing WhatsApp  
✅ **Desktop Integration** - Works with WhatsApp Web/Desktop  

## Quick Setup

### Step 1: Enable in `.env`

```bash
# WhatsApp notifications (RECOMMENDED)
WHATSAPP_ENABLED=true
WHATSAPP_PHONE_NUMBER=61412345678@c.us
```

**Phone Number Format:**
- Country code + number + `@c.us`
- **No** `+` or spaces
- Examples:
  - Australian mobile: `61412345678@c.us`
  - US mobile: `12125551234@c.us`
  - UK mobile: `447911123456@c.us`

### Step 2: Start Gofer

Run the task: `▶️ Start Gofer (Autonomous Mode)`

### Step 3: Scan QR Code (First Time Only)

You'll see a QR code in the terminal:

```
📱 Initializing WhatsApp...

🔐 WhatsApp QR Code - Scan with your phone:

█████████████████████████████
█████████████████████████████
████ ▄▄▄▄▄ █▀█ █▄▄▀▄ ▄▄▄▄▄ ████
[... QR code ...]

Open WhatsApp on your phone → Linked Devices → Link a Device
Scan the QR code above to authenticate.
```

### Step 4: Scan with Your Phone

1. Open **WhatsApp** on your phone
2. Tap **⋮** (menu) → **Linked Devices**
3. Tap **Link a Device**
4. Scan the QR code from your terminal
5. Done! ✅

You'll see:
```
✅ WhatsApp authenticated
✅ WhatsApp client is ready!
▶️  Starting Gofer Autonomous Mode...
```

## Two-Way Communication 💬

Gofer listens to your WhatsApp messages! You can:

### Ask for Status
Send: `status`

Receive:
```
📊 Gofer Status

🎯 Current Task: T011
📝 Create comprehensive Extension tests

📋 Spec: VSCode Extension
🔄 Status: in_progress
🔢 Attempt: 2/3

Reply with:
- "skip" to skip this task
- "retry" to retry from scratch
- "stop" to pause Gofer
```

### Control Gofer
- `stop` - Pause Gofer
- `skip` - Skip current task
- `retry` - Retry current task from scratch
- `help` - Show all commands

### Provide Guidance
When a task fails, Gofer will ask for help:

```
❓ Question from Gofer

Task "Create Extension tests" failed validation after 3 attempts.

Issues:
- Type 'any' is not allowed
- Function too long (420 lines)

What should I do?

Options:
1. Skip task
2. Retry
3. Provide guidance

💬 Reply to this message with your answer.
```

You can reply with guidance:
```
fix: Split the function into smaller helpers and add proper types
```

Gofer will incorporate your feedback and retry!

## How It Works

Gofer uses `whatsapp-web.js` which:
1. Connects to WhatsApp Web (like desktop app)
2. Authenticates once via QR code
3. Saves session in `.wwebjs_auth/` folder
4. Reconnects automatically on restart (no more QR codes!)

## Find Your Phone Number Format

Not sure about the format? Here's how to find it:

### Option 1: From WhatsApp Web
1. Open https://web.whatsapp.com
2. Open browser console (F12)
3. Type: `Store.Me.id`
4. You'll see: `"1234567890@c.us"` ← Use this!

### Option 2: From a Chat
1. Send yourself a test message on WhatsApp
2. Right-click on the chat (desktop)
3. Check the URL or contact info
4. Format will be visible

### Option 3: Manual Format
```
[Country Code][Phone Number]@c.us

Examples:
Australia (+61): 61412345678@c.us (remove the 0)
USA (+1): 12125551234@c.us
UK (+44): 447911123456@c.us (remove the 0)
```

## Troubleshooting

**QR code not showing?**
- Make sure terminal is wide enough (needs ~40 characters)
- Try running in VSCode integrated terminal

**"Authentication failed"?**
- Delete `.wwebjs_auth/` folder
- Run Gofer again
- Scan QR code fresh

**"Cannot find phone number"?**
- Check format: no `+`, no spaces, ends with `@c.us`
- Try getting it from WhatsApp Web console
- Make sure it's YOUR number (where you want notifications)

**Still using Twilio SMS?**
- Both can be enabled
- WhatsApp takes priority (cheaper!)
- Falls back to SMS if WhatsApp fails

## Session Persistence

After first QR scan:
- Session saved to `.wwebjs_auth/` folder
- Added to `.gitignore` automatically
- Next time you start: no QR code needed!
- Works like WhatsApp Desktop

## Disabling WhatsApp

Set in `.env`:
```bash
WHATSAPP_ENABLED=false
```

Falls back to:
1. Twilio SMS (if configured)
2. Console logging (no external notifications)

## Testing

Send yourself a test:
```bash
# In Gofer code, trigger a test notification
# Or manually fail a task 3 times
```

You should receive a WhatsApp message instantly!

---

**Pro Tip:** Use WhatsApp Desktop alongside VSCode for best experience. You'll see notifications pop up right next to your code!

© 2025 Enterprise AI Pty Ltd
