# 🔑 Setting Your Anthropic API Key in VSCode

## For Users of Gofer Extension

When you install Gofer in any repo, each person can set their own API key in
**VSCode User Settings**. This is secure, per-user, and works across all repos!

## How to Set It Up

### Method 1: VSCode Settings UI (Easiest)

1. **Open Settings**
   - Press `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)
   - Or: Menu → Code → Settings → Settings

2. **Search for "anthropic"**
   - Type `anthropic` in the search box
   - You'll see: **Gofer: Anthropic Api Key**

3. **Paste Your Key**
   - Click in the text field
   - Paste your key: `sk-ant-api03-xxxxx...`
   - It auto-saves!

4. **Done!** ✅
   - Works in ALL repos where you use Gofer
   - Stored securely in VSCode's settings
   - Never committed to git

### Method 2: Settings JSON (Advanced)

1. Open Command Palette (`Cmd+Shift+P`)
2. Type: `Preferences: Open User Settings (JSON)`
3. Add this line:

```json
{
  "gofer.anthropicApiKey": "OPENAI_API_KEY_REDACTED"
}
```

### Method 3: Environment Variable (System-Wide)

Add to `~/.zshrc` (or `~/.bashrc` if using bash):

```bash
export ANTHROPIC_API_KEY="OPENAI_API_KEY_REDACTED"
```

Then reload:

```bash
source ~/.zshrc
```

## Where to Get Your API Key

1. Go to: https://console.anthropic.com/settings/keys
2. Sign in or create account
3. Click **Create Key**
4. Copy the key (starts with `sk-ant-`)
5. Paste it in VSCode settings!

## Priority Order

Gofer checks for your API key in this order:

1. **VSCode User Settings** (`gofer.anthropicApiKey`) ← **Recommended!**
2. Environment Variable (`ANTHROPIC_API_KEY`)
3. Workspace `.env` file (only for developing Gofer itself)

## For Teams

### Each Developer Should:

- Set their own API key in their VSCode User Settings
- Never share their API key
- Never commit API keys to git

### Team Lead Should:

- Tell team to install Gofer extension
- Share this guide
- Verify everyone has their API key set up

## Troubleshooting

**"API key required" message?**

- Check VSCode Settings → search "anthropic"
- Ensure key starts with `sk-ant-`
- Reload VSCode window after setting

**Using multiple machines?**

- Need to set the key on each machine
- Use Settings Sync to sync across machines automatically!

**Settings Sync?**

- VSCode Settings Sync includes extension settings
- Your API key syncs to your other machines
- Still secure (encrypted by Microsoft)

## Testing It Works

After setting your key:

1. Open any repo with `.specify/` folder
2. Gofer extension activates
3. Command Palette → `Gofer: Show Progress Panel`
4. MCP tools available to Claude Code / GitHub Copilot
5. No more "API key required" messages!

## Security Notes

✅ **Safe:**

- Stored in VSCode User Settings (encrypted)
- Never in source code
- Never in git
- Private to your machine

❌ **Never:**

- Commit API keys to git
- Share your key with others
- Put in workspace `.env` for team projects

---

**For Gofer Developers:**

If you're building Gofer itself, you also need a `.env` file in the project root
for running the orchestrator locally. See the main README.

© 2025 Enterprise AI Pty Ltd
