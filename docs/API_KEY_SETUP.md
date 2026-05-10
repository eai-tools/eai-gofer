# 🔑 Setting Your Anthropic API Key in VSCode

## For Users of Gofer Extension

When you install Gofer in any repo, each person can set their own API key in
**VSCode User Settings**. Many extension features read the manifest-backed
`gofer.*ApiKey` settings directly. Some local integrations, including MCP setup,
can also use environment-variable placeholders.

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
    - Stored in your VSCode User Settings profile
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

### Method 3: Environment Variable (For integrations that support it)

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

## Where Gofer Reads Keys

There is not one global precedence order across every Gofer surface.

1. The VS Code extension itself primarily reads the manifest-backed
   `gofer.*ApiKey` settings.
2. MCP setup writes a local `.vscode/mcp.json` entry that uses the current
   setting value when present, or `${env:ANTHROPIC_API_KEY}` when the setting is
   empty.
3. Workspace `.env` files are only for developing Gofer itself and should not be
   used as shared team configuration.

## For Teams

### Each Developer Should:

- Set their own API key in local VS Code User Settings, or use environment
  variables for integrations that support them
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
- Use environment variables or re-enter the key on each machine if you do not
  want extension settings replicated elsewhere.

**Settings Sync?**

- VSCode Settings Sync can include extension settings
- That may replicate your API key to other signed-in machines
- Only use it if you are comfortable with that trade-off; otherwise keep the
  key local or use environment variables

## Testing It Works

After setting your key:

1. Open any repo with `.specify/` folder
2. Gofer extension activates
3. Command Palette → `Gofer: Show Progress Panel`
4. MCP tools available to Claude Code / GitHub Copilot
5. No more "API key required" messages!

## Security Notes

✅ **Recommended:**

- Stored in VSCode User Settings on your machine, or provided through
  environment variables
- Never in source code
- Never in git
- Kept local unless you explicitly opt into syncing those settings
- If you run MCP setup, check the generated `.vscode/mcp.json` because it may
  contain either `${env:ANTHROPIC_API_KEY}` or a copied setting value

❌ **Never:**

- Commit API keys to git
- Share your key with others
- Put in workspace `.env` for team projects

---

**For Gofer Developers:**

If you're building Gofer itself, you also need a `.env` file in the project root
for running the orchestrator locally. See the main README.

© 2025 Enterprise AI Pty Ltd
