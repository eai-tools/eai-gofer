# Feature 026 - Provider API Usage Tracking: Quickstart Testing Guide

**Last Updated**: 2026-03-15 | **Feature Status**: Draft | **Test Scope**:
Provider billing API integration, UI panel display, configuration, and graceful
degradation

---

## Prerequisites

### System & IDE Setup

- [ ] **VSCode 1.80+** installed and running
- [ ] **Node.js 18+** installed (`node --version`)
- [ ] **Gofer extension** installed in VSCode (or running locally via
      `npm run compile` in `extension/` directory)
- [ ] **Network connectivity** to `api.anthropic.com` and `api.openai.com`
      (verify: `curl https://api.anthropic.com/v1/ping 2>/dev/null`)

### Provider Admin API Keys (REQUIRED for meaningful testing)

**Anthropic Admin Key:**

- Navigate to [Anthropic Console](https://console.anthropic.com/)
- Click **"API Keys"** in left sidebar
- Click **"Create Key"** → Select **"Admin"** role (NOT "User")
- Copy the key (format: `sk-ant-admin-...`)
- **Store securely** (you'll need it for test scenarios)

**OpenAI Admin Key:**

- Navigate to [OpenAI Platform](https://platform.openai.com/)
- Click **"API Keys"** in left sidebar
- Click **"Create new secret key"** → Select **"Admin"** scope
- Copy the key (format varies, typically starts with `sk-`)
- **Store securely** (you'll need it for test scenarios)

### Optional: Prepared Test Data

- Ensure your Anthropic organization has **recent API usage** (within last 24
  hours) for testing. If new account with zero usage, you'll see `$0.00` (valid
  result, not a failure).
- Ensure your OpenAI organization has **recent API usage** (within last 24
  hours). Same caveat: new accounts show zero.

---

## Setup: Configure Admin API Keys in VSCode

### Option A: Settings UI (Recommended)

1. **Open VSCode Settings**:
   - Mac: `⌘,` | Windows/Linux: `Ctrl+,`

2. **Search for "gofer admin"**:
   - Search box enters: `gofer admin`
   - You should see two settings:
     - `gofer.anthropicAdminApiKey`
     - `gofer.openaiAdminApiKey`

3. **Configure Anthropic Admin Key**:
   - Click the `gofer.anthropicAdminApiKey` setting
   - Click **"Edit in settings.json"** or the pencil icon
   - Paste your admin key: `sk-ant-admin-...`
   - **DO NOT** check "Require authentication for external requests" unless you
     have a proxy

4. **Configure OpenAI Admin Key** (optional for independent testing):
   - Click the `gofer.openaiAdminApiKey` setting
   - Click **"Edit in settings.json"** or the pencil icon
   - Paste your admin key
   - Save settings (`⌘S` or auto-save)

5. **Verify in settings.json**:
   - Open Command Palette: `⌘Shift+P` → `Preferences: Open Settings (JSON)`
   - Look for:
     ```json
     {
       "gofer.anthropicAdminApiKey": "sk-ant-admin-...",
       "gofer.openaiAdminApiKey": "sk-..."
     }
     ```

### Option B: Direct settings.json Edit

1. Open Command Palette: `⌘Shift+P`
2. Search: `Preferences: Open Settings (JSON)`
3. Add to the JSON object:
   ```json
   "gofer.anthropicAdminApiKey": "sk-ant-admin-YOUR_KEY_HERE",
   "gofer.openaiAdminApiKey": "sk-YOUR_OPENAI_KEY_HERE"
   ```
4. Save and close

### Verify Configuration Loaded

1. Open Gofer's **AI Usage panel**:
   - Click the Gofer icon in the VSCode activity bar (left sidebar)
   - Click **"AI Usage"** tab in the Gofer view
2. If keys are recognized, you should see:
   - Anthropic section with status "Fetching..." or "Last updated: [timestamp]"
   - OpenAI section with status "Fetching..." or "Last updated: [timestamp]"
   - (Don't worry if you see loading spinners — API calls take 2-5 seconds)

---

## Manual Test Scenarios

### Scenario 1: Basic Anthropic Usage Display (P1 Feature Test)

**Objective**: Verify real Anthropic billing data appears in the AI Usage panel.

**Precondition**: `gofer.anthropicAdminApiKey` configured with valid admin key.

**Steps**:

1. Close and reopen VSCode (or reload window: `⌘Shift+P` → "Developer: Reload
   Window")
2. Open Gofer view → **AI Usage** tab
3. Wait 3-5 seconds for initial API fetch to complete
4. Observe the **Anthropic** section:
   - [ ] **Period dropdown** shows "Today" or "Week" (if configurable)
   - [ ] **Token counts displayed**: "Input: 12,500 | Output: 3,400 | Cached:
         4,500"
   - [ ] **Cost displayed**: "Cost: $0.25" (or actual amount; $0.00 if no usage)
   - [ ] **Model names shown**: "claude-opus-4", "claude-3-sonnet", etc. (if
         multiple models used)
   - [ ] **Timestamp visible**: "Last updated: 10:45 AM" or similar

**Expected Result**:

- ✅ Real usage data appears (non-placeholder values or explicit "$0.00 - No
  usage yet today")
- ✅ No error messages (or actionable errors only if API is down)
- ✅ Panel remains responsive (no freezing)

**Failure Indicators**:

- ❌ Shows "$0.00" with no explanation (should say "No usage yet" or show actual
  data)
- ❌ Spinning loader indefinitely (>10 seconds)
- ❌ Error: "Admin API key required" (when key IS configured)
- ❌ Blank values or "undefined"

---

### Scenario 2: Basic OpenAI Usage Display (P1 Feature Test)

**Objective**: Verify real OpenAI billing data appears independently.

**Precondition**: `gofer.openaiAdminApiKey` configured with valid admin key
(Anthropic key can be empty for isolated test).

**Steps**:

1. Leave only `gofer.openaiAdminApiKey` configured (optionally unset Anthropic
   key)
2. Reload window: `⌘Shift+P` → "Developer: Reload Window"
3. Open Gofer view → **AI Usage** tab
4. Wait 3-5 seconds
5. Observe the **OpenAI** section:
   - [ ] **Token counts displayed**: "Input: 8,500 | Output: 2,100"
   - [ ] **Cost displayed**: "Cost: $1.85" (or actual amount)
   - [ ] **Model names shown**: "gpt-4", "gpt-4-turbo", etc.
   - [ ] **Status timestamp visible**

**Expected Result**:

- ✅ OpenAI section shows real data independent of Anthropic
- ✅ Anthropic section shows "Configure admin key" message (if not configured)

**Failure Indicators**:

- ❌ OpenAI data missing or combined with Anthropic (should be separate
  sections)
- ❌ Error referencing Anthropic when only OpenAI is configured

---

### Scenario 3: Both Providers Configured Simultaneously (P1 Feature Test)

**Objective**: Verify both Anthropic and OpenAI data appear side-by-side without
interference.

**Precondition**: Both `gofer.anthropicAdminApiKey` and
`gofer.openaiAdminApiKey` configured.

**Steps**:

1. Verify both keys are set in settings
2. Reload window
3. Open AI Usage panel
4. Observe panel layout:
   - [ ] **Two distinct sections visible**: One for Anthropic, one for OpenAI
   - [ ] **Anthropic section shows**: Token counts + cost + models
   - [ ] **OpenAI section shows**: Token counts + cost + models
   - [ ] **Each section has independent status/timestamp**: "Anthropic last
         updated 10:45 AM" | "OpenAI last updated 10:46 AM"
   - [ ] **Data values are different** (not duplicated or mixed)

**Expected Result**:

- ✅ Both providers render simultaneously without errors
- ✅ User can distinguish which data belongs to which provider

**Failure Indicators**:

- ❌ Only one provider displays
- ❌ Data values identical across sections (indicates copy/paste error)
- ❌ Headers labeled ambiguously or overwrite each other

---

### Scenario 4: Missing Admin Key - Graceful Fallback (P2 Feature Test)

**Objective**: Verify panel shows actionable guidance when admin key is not
configured.

**Precondition**: Both `gofer.anthropicAdminApiKey` and
`gofer.openaiAdminApiKey` are **empty/unconfigured**.

**Steps**:

1. Clear both admin key settings (set to empty string or delete the keys)
2. Reload window
3. Open AI Usage panel
4. Observe both Anthropic and OpenAI sections:
   - [ ] **Message displayed**: "Not configured" or "Configure admin API key to
         view billing data"
   - [ ] **Help link visible**: Should link to settings or documentation (if
         provided)
   - [ ] **No errors or crashes**: Panel remains stable and readable

**Expected Result**:

- ✅ User sees clear, friendly guidance on next steps
- ✅ No error logs or exceptions

**Failure Indicators**:

- ❌ Blank panel with no guidance
- ❌ Console errors or exceptions
- ❌ Misleading messages ("Admin key required" when not set)

---

### Scenario 5: Invalid Admin Key - Error Recovery (P2 Feature Test)

**Objective**: Verify panel handles invalid/expired keys gracefully.

**Precondition**: `gofer.anthropicAdminApiKey` set to an **invalid key** (e.g.,
`sk-ant-admin-invalid1234`).

**Steps**:

1. Set Anthropic admin key to an intentionally invalid value
2. Reload window
3. Open AI Usage panel
4. Wait 5-10 seconds for API call to fail
5. Observe the panel:
   - [ ] **Error message displayed**: "Unable to fetch usage data: Invalid API
         key"
   - [ ] **Last known data shown** (if available from previous successful fetch)
   - [ ] **Panel remains visible** (doesn't blank out or crash)
   - [ ] **No red error badges** on VSCode itself (errors contained in panel)

**Expected Result**:

- ✅ User understands the configuration is wrong and can fix it
- ✅ Panel doesn't crash or disappear

**Failure Indicators**:

- ❌ Generic error like "undefined error"
- ❌ Panel disappears entirely
- ❌ Extension crashes (red X on VSCode status bar)

---

### Scenario 6: Configuration Change Detection (P2 Feature Test)

**Objective**: Verify panel detects admin key changes and re-fetches within 5
seconds.

**Precondition**: `gofer.anthropicAdminApiKey` currently configured with valid
key showing real data.

**Steps**:

1. Observe current data in AI Usage panel (note the timestamp and values)
2. Open Command Palette: `⌘Shift+P` → "Preferences: Open Settings (JSON)"
3. Change the Anthropic admin key to a new valid key (or toggle to invalid and
   back)
4. Save settings (`⌘S`)
5. Watch the Anthropic section for re-fetch:
   - [ ] **Panel updates within 5 seconds**: Timestamp changes or shows
         "Fetching..."
   - [ ] **New data appears** (if key changed to different valid key) or **error
         message** (if changed to invalid)
   - [ ] **No manual reload required**: Change is detected automatically

**Expected Result**:

- ✅ Configuration changes trigger immediate re-fetch without user intervention

**Failure Indicators**:

- ❌ Panel doesn't update (requires manual reload)
- ❌ Takes longer than 5 seconds to re-fetch
- ❌ Still shows stale data from previous key

---

### Scenario 7: Period Selection - Today vs Week (P1 Feature Test)

**Objective**: Verify period dropdown changes granularity of returned data.

**Precondition**: Valid Anthropic admin key configured and initial data
displayed.

**Steps**:

1. Observe current panel showing "Today" data (hourly granularity)
2. Click **period dropdown** in Anthropic section (if available)
3. Select **"Week"**
4. Wait 2-3 seconds for API re-fetch
5. Observe the data:
   - [ ] **Bucket granularity changes**: "Today" shows hourly buckets (12:00 AM,
         1:00 AM, ...), "Week" shows daily buckets (Mon, Tue, ...)
   - [ ] **Date range extends**: "Today" shows 24 hours, "Week" shows 7 days
   - [ ] **Token counts are aggregates**: "Week" values are sum of daily usage,
         larger than "Today"

**Expected Result**:

- ✅ Period selector updates data correctly without errors

**Failure Indicators**:

- ❌ Period dropdown is missing or non-functional
- ❌ Data doesn't change when period changes
- ❌ Granularity is wrong (hourly buckets for "Week", etc.)

---

### Scenario 8: Refresh Button / Manual Trigger (P3 Feature Test)

**Objective**: Verify user can manually trigger a data refresh.

**Precondition**: AI Usage panel open with Anthropic data displayed.

**Steps**:

1. Note the current "Last updated" timestamp
2. Look for a **Refresh button** or **swirl icon** in the panel header (if
   provided)
3. Click it
4. Wait 2-3 seconds for new API call
5. Observe:
   - [ ] **Timestamp updates**: "Last updated" shows new time
   - [ ] **Data may change** (if new usage occurred)
   - [ ] **No errors appear**

**Expected Result**:

- ✅ Manual refresh works on demand

**Note**: If no refresh button is visible, this scenario is not applicable
(polling-only design is acceptable per spec).

---

### Scenario 9: API Rate Limiting - Exponential Backoff (P2 Feature Test)

**Objective**: Verify panel recovers gracefully when hitting provider API rate
limits.

**Precondition**: Valid admin key configured. (This scenario requires a helper
script or manual API throttling.)

**Steps**:

1. Run a helper script that makes rapid requests to exhaust rate limit
   (simulates many calls from other users):
   ```bash
   for i in {1..50}; do
     curl -s -H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
       "https://api.openai.com/v1/organization/usage/completions?start_date=2026-03-14&end_date=2026-03-15" \
     &
   done
   ```
2. Immediately open AI Usage panel in VSCode while rate limit is active
3. Observe:
   - [ ] **Status message**: "Rate limited, retrying in 2s" or similar
   - [ ] **Automatic retry**: After backoff, panel re-fetches
   - [ ] **No user intervention needed**: Retry is automatic

**Expected Result**:

- ✅ Rate limiting is handled transparently with backoff

**Failure Indicators**:

- ❌ Permanent error without retry indication
- ❌ User must manually retry
- ❌ Backoff timing is wrong (immediate retry instead of exponential backoff)

**Note**: This test is optional and requires helper scripts. Mark as SKIP if not
testing rate limits.

---

### Scenario 10: Regular API Key vs Admin Key - Validation (P2 Feature Test)

**Objective**: Verify system distinguishes between regular and admin API keys.

**Precondition**: You have both a regular API key and an admin API key for
Anthropic.

**Steps**:

1. Set `gofer.anthropicAdminApiKey` to a **regular API key** (format:
   `sk-ant-...`, NOT `sk-ant-admin-...`)
2. Reload window
3. Open AI Usage panel
4. Observe:
   - [ ] **Error message**: "Admin API key required for billing data" or
         "Invalid admin key format"
   - [ ] **Clear guidance**: Message explains the difference or links to docs
   - [ ] **Panel doesn't crash**

**Expected Result**:

- ✅ System validates key format and rejects regular keys with clear messaging

**Failure Indicators**:

- ❌ Regular key is accepted without error (should fail)
- ❌ Generic "unauthorized" error without guidance
- ❌ Crashes or exceptions

---

### Scenario 11: No Usage in Time Period (Edge Case)

**Objective**: Verify panel handles zero usage gracefully.

**Precondition**: Valid admin key configured for an organization/period with
zero usage.

**Steps**:

1. If you have a test account with zero usage, use it; otherwise, set the period
   to a date before your first API call
2. Observe the panel:
   - [ ] **Shows explicitly**: "No usage in this period" or "$0.00"
   - [ ] **Not blank or confusing**: User understands this is expected, not an
         error

**Expected Result**:

- ✅ Zero usage is clearly indicated, not presented as a failure

**Failure Indicators**:

- ❌ Blank panel (looks like loading failed)
- ❌ Error message for valid zero-usage scenario
- ❌ No distinction between zero usage and missing data

---

### Scenario 12: Google/Gemini Provider - API Unavailable (P2 Feature Test)

**Objective**: Verify panel gracefully indicates Google Gemini has no billing
API.

**Precondition**: If your council is configured to use Google Gemini as a
provider (requires separate feature configuration).

**Steps**:

1. Configure Gofer to use Google Gemini (if applicable)
2. Open AI Usage panel
3. Observe Google section (if visible):
   - [ ] **Message**: "Billing API not available for Google"
   - [ ] **Explanation**: "Google Cloud requires BigQuery export for usage
         tracking"
   - [ ] **No misleading errors**: User understands this is a platform
         limitation

**Expected Result**:

- ✅ Google provider degrades gracefully with clear messaging

**Note**: This test only applies if Google provider support is integrated. Mark
as SKIP if not using Google.

---

### Scenario 13: Extension Reload / Window Reload (System Test)

**Objective**: Verify extension survives reload and data persists.

**Precondition**: Valid admin keys configured, AI Usage panel showing real data.

**Steps**:

1. Note the current data and timestamp
2. Reload VSCode window: `⌘Shift+P` → "Developer: Reload Window"
3. Wait 5 seconds for extension to re-activate
4. Open AI Usage panel again
5. Observe:
   - [ ] **Panel reappears without errors**: No crashes or missing data
   - [ ] **Data is visible** (may be from cache or fresh fetch)
   - [ ] **No stale data persists** (or if cached, clearly labeled)

**Expected Result**:

- ✅ Extension reloads gracefully and resumes polling

**Failure Indicators**:

- ❌ Panel doesn't reappear
- ❌ Error on reload
- ❌ Polling doesn't resume (data doesn't update)

---

## Automated Test Commands

### Run Full Test Suite

```bash
cd /Users/douglaswross/Code/eai-gofer
npm test
```

**Expected Output**:

- All tests pass (✓)
- No new skipped tests (unless marked with `.skip` intentionally)
- Coverage report shows unit test coverage > 80% for API client code

### Run Tests for Feature 026 Specifically

```bash
npm test -- --grep "026|UsageApiClient|AdminApiKey|AIUsageMonitor"
```

**Expected Output**:

- Tests for `UsageApiClient` (HTTP client for provider APIs)
- Tests for `AdminApiKeyConfig` (settings reading)
- Tests for `AIUsageMonitor` integration with new API client
- All pass without errors

### Run Linting

```bash
npm run lint
```

**Expected Output**:

- No new linting errors introduced by Feature 026 code
- Code follows project style guidelines

### Run Type Checking

```bash
cd extension && npx tsc --noEmit
```

**Expected Output**:

- No TypeScript compilation errors
- Admin key settings types match VSCode settings schema

### Build Extension

```bash
cd extension && npm run compile
```

**Expected Output**:

- Webpack bundle succeeds
- No warnings or errors
- Output: `extension/dist/extension.js`

### Package for Distribution

```bash
./release-auto.sh patch "Add Provider API Usage Tracking support"
```

**Expected Output**:

- Version bumped in `package.json`
- Git tag created
- `.vsix` package generated in `extension/` directory
- All tests pass before release

---

## Key Files Reference Table

| File                                                 | Purpose                               | Modified? | Role in Feature                                                          |
| ---------------------------------------------------- | ------------------------------------- | --------- | ------------------------------------------------------------------------ |
| `.specify/specs/026-provider-api-usage/spec.md`      | Feature specification                 | ✓         | Requirements source (this quickstart derives from it)                    |
| `extension/src/autonomous/UsageApiClient.ts`         | HTTP client for provider billing APIs | ✓ NEW     | Core implementation: calls Anthropic/OpenAI APIs                         |
| `extension/src/autonomous/AIUsageMonitor.ts`         | Data monitor and polling orchestrator | ✓         | Refactored to use `UsageApiClient` instead of `UsageLogger`              |
| `extension/package.json`                             | VSCode extension config               | ✓         | Adds `gofer.anthropicAdminApiKey` and `gofer.openaiAdminApiKey` settings |
| `extension/src/extension.ts`                         | Extension entry point                 | ✓         | Wires `UsageApiClient` into `AIUsageMonitor` (lines 538-565)             |
| `extension/src/types/aiUsage.ts`                     | Type definitions                      | —         | `UsageSummary` interface (unchanged contract)                            |
| `extension/src/council/providers/ProviderFactory.ts` | Provider detection logic              | —         | Reference pattern for `AdminApiKeyConfig.getAdminKeys()`                 |
| `extension/src/council/UsageLogger.ts`               | Local JSONL usage logging             | —         | Preserved (not replaced; API client supplements it)                      |
| `extension/src/ui/AIUsageProvider.ts`                | Tree view data provider               | —         | NO CHANGES (consumes `AIUsageData` events from monitor)                  |
| `extension/src/ui/AIUsageStatusBar.ts`               | Status bar display                    | —         | NO CHANGES (consumes `AIUsageData` events from monitor)                  |
| `extension/test/UsageApiClient.test.ts`              | Unit tests for HTTP client            | ✓ NEW     | Tests API call formats, error handling, retry logic                      |
| `extension/test/AIUsageMonitor.integration.test.ts`  | Integration tests                     | ✓         | Tests monitor with mocked HTTP client                                    |
| `.github/workflows/test.yml`                         | CI/CD pipeline                        | —         | Runs `npm test` before release                                           |

---

## Common Issues & Troubleshooting

### Issue 1: "Admin API key required for billing data" (When Key IS Configured)

**Symptoms**:

- Error message persists even after setting the key in settings
- Panel shows actionable link to settings

**Causes & Fixes**:

1. **Settings not saved**: Ensure you pressed `⌘S` after editing settings.json
2. **Extension not reloaded**: Run `⌘Shift+P` → "Developer: Reload Window"
3. **Key format wrong**: Verify Anthropic key starts with `sk-ant-admin-`, not
   `sk-ant-`
   - Anthropic **admin** key: `sk-ant-admin-...` (from Console API Keys, admin
     role)
   - Anthropic **regular** key: `sk-ant-...` (from Console API Keys, user role)
   - They are different! Use the admin key.
4. **Settings scope issue**: If using VSCode multi-workspace, ensure settings
   are in workspace settings, not user settings (or both, depending on your
   setup)

**Verification**:

```bash
# Check settings via command line (macOS/Linux)
cat ~/.config/Code/User/settings.json | grep "gofer.anthropicAdminApiKey"
```

---

### Issue 2: Panel Shows "$0.00" with No Explanation

**Symptoms**:

- Anthropic or OpenAI section displays "Cost: $0.00"
- No indication whether this is "no usage" or "loading incomplete"
- User unsure if it's working or not

**Causes & Fixes**:

1. **Genuinely zero usage**: This is valid! Verify by checking the provider
   console directly (Anthropic Console, OpenAI Platform). If console also shows
   $0, the feature is working correctly.
2. **Data not loaded yet**: Panel may still be fetching. Wait 5-10 seconds for
   API call to complete.
3. **API silently failed**: Check VSCode debug console for errors:
   - `⌘Shift+P` → "Developer: Toggle Developer Tools"
   - Look for red error messages
   - If you see API error, apply Issue 1 or Issue 3 fixes

**Verification**:

```bash
# Manually test API call to verify usage exists
curl -s -H "x-api-key: $ANTHROPIC_ADMIN_KEY" \
  -H "anthropic-version: 2023-06-01" \
  "https://api.anthropic.com/v1/organizations/usage_report/messages?start_date=2026-03-14&end_date=2026-03-15&granularity=1h" \
  | jq '.data'
# If you see data with non-zero token counts, API is working and feature is displaying correctly
```

---

### Issue 3: "Unable to fetch usage data: [error]" - Persistent Error

**Symptoms**:

- Error message shows code like `401`, `403`, `429`, or `500`
- User wants to know what to do next

**Common Error Codes & Fixes**:

| Error Code                  | Meaning                         | Fix                                                                                                                     |
| --------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `401 Unauthorized`          | API key is invalid or expired   | 1. Verify key format (matches provider format) 2. Regenerate key from provider console 3. Copy full key (not truncated) |
| `403 Forbidden`             | API key lacks admin permissions | Regenerate key with **Admin** role, not User/Read-only                                                                  |
| `429 Rate Limited`          | Too many requests from this org | Wait 1-2 minutes; panel auto-retries with exponential backoff                                                           |
| `500 Server Error`          | Provider API is down            | Wait 5-10 minutes and try refresh; shows "Service unavailable, retrying..."                                             |
| `ENOTFOUND` / Network Error | Network blocked or DNS fails    | Check firewall/proxy allows `api.anthropic.com` and `api.openai.com`                                                    |

**Detailed Troubleshooting**:

```bash
# Test API connectivity manually
curl -v -H "x-api-key: $ANTHROPIC_ADMIN_KEY" \
  "https://api.anthropic.com/v1/organizations/usage_report/messages" 2>&1 | head -20
# Look for "200 OK" or error code in response

# If 401: Key is wrong
# If 403: Key lacks admin scope
# If network error: Check `curl https://api.anthropic.com` (no auth needed for connectivity test)
```

---

### Issue 4: API Rate Limits - Frequent "Rate limited, retrying in..." Messages

**Symptoms**:

- Panel repeatedly shows "Rate limited" status
- Backoff times increase (2s → 4s → 8s → 60s max)
- Data is stale because retries keep failing

**Causes & Fixes**:

1. **High usage**: Your organization is making many API calls elsewhere (other
   integrations, applications, etc.), causing rate limit from provider
   - **Fix**: Contact provider support to increase rate limit
   - **Workaround**: Increase polling interval in settings:
     `"gofer.aiUsage.api.pollingInterval": 300` (5 minutes instead of 60
     seconds)

2. **Multiple VSCode windows**: Each VSCode instance polls independently,
   multiplying requests
   - **Fix**: Close extra VSCode windows if you don't need them
   - **Workaround**: Only configure admin key in one VSCode instance

3. **Test environment exhaustion**: If you're testing with same key across many
   machines/tests
   - **Fix**: Use different test accounts for parallel testing, or sequence
     tests

**Verification**:

```bash
# Check provider's current rate limit status
# Anthropic: Limits shown in Console > API Keys > Key details
# OpenAI: Limits shown in Platform > API Keys > Key details (if displayed)
```

---

### Issue 5: Data Delays - Panel Shows Old Data

**Symptoms**:

- Panel shows "Last updated: 11:00 AM" but current time is 11:45 AM
- New API calls in the last hour don't appear
- User thinks feature is broken

**Causes & Fixes**:

1. **Expected API latency**: Anthropic has **5-10 minute** built-in delay before
   usage appears in billing API. This is by design.
   - **Expectation**: Data shown in panel is 5-10 minutes old. Not a bug.
   - **Verification**: Check Anthropic Console directly; it shows same delayed
     data
   - **Message**: Panel should show "Data as of 11:35 AM" (timestamp of API
     response) so user understands latency

2. **OpenAI near-real-time**: OpenAI data is nearly live (< 1 minute latency)
   - **Expectation**: OpenAI data should be current
   - **If delayed**: Check for rate limiting (Issue 4) or API errors (Issue 3)

3. **Polling interval too long**: If `gofer.aiUsage.api.pollingInterval` is set
   to 300+ seconds (5+ minutes), panel won't update frequently
   - **Fix**: Check settings: `⌘Shift+P` → "Preferences: Open Settings (JSON)"
   - **If not set**: Default is 60 seconds

**Verification**:

```bash
# Verify expected latency by checking provider console directly
# Anthropic Console > Billing > Current Billing Period
# Compare timestamp with VSCode panel timestamp
# If panel is 5-10 min behind, this is EXPECTED, not a bug
```

---

### Issue 6: Wrong Admin Key Type - OpenAI Format

**Symptoms**:

- Anthropic key works fine, but OpenAI key gives error
- Error message: "Invalid API key" or similar
- User has valid OpenAI API key but not sure if it's admin

**Causes & Fixes**:

1. **OpenAI: Identifying Key Type**:
   - Go to [OpenAI Platform](https://platform.openai.com/api/keys)
   - Click "Create new secret key"
   - Select **"Admin"** in the permission scope dropdown
   - **Admin keys are created per-session** (not persisted in the UI like
     Anthropic)
   - Once created, copy the key immediately (you can't see it again)

2. **Wrong scope**: If you selected "Read-only" or "Restricted", it won't work
   for billing APIs
   - **Fix**: Delete the old key and create new one with "Admin" scope

3. **Key format check**: OpenAI admin keys typically start with `sk-` (same as
   regular keys)
   - **To verify scope**: Use the key to call billing API (don't call regular
     completion API)
   - If `401 Forbidden` → key lacks billing permissions; regenerate with Admin
     scope

---

### Issue 7: VSCode Settings Not Taking Effect

**Symptoms**:

- Changed admin key in settings, but old key is still being used
- Reloaded window, still using old key
- New key never tried

**Causes & Fixes**:

1. **Multiple settings scopes**: VSCode has User settings and Workspace
   settings. Both may be loaded.
   - **Fix**: Check which scope is active:
     - `⌘Shift+P` → "Preferences: Open User Settings"
     - `⌘Shift+P` → "Preferences: Open Workspace Settings"
     - **Recommendation**: Use only one scope for admin keys (suggest Workspace
       for team consistency)

2. **Settings not actually saved**: File editor shows change, but file not
   flushed to disk
   - **Fix**: Ensure auto-save is on (`"files.autoSave": "afterDelay"`) or
     manually press `⌘S`

3. **Extension caching**: Extension cached the old value before reload
   - **Fix**: Close all VSCode windows, wait 5 seconds, reopen
   - If still persists: Delete VSCode cache (advanced troubleshooting):
     ```bash
     rm -rf ~/.vscode/extensions/*/
     # WARNING: This removes all extensions. Re-install afterwards.
     ```

---

### Issue 8: Network Proxy / Firewall Blocks API Calls

**Symptoms**:

- Panel shows error: "getaddrinfo ENOTFOUND api.anthropic.com"
- Or: "connect EACCES 443"
- Network calls fail even with valid keys

**Causes & Fixes**:

1. **Corporate proxy**: Your network routes HTTPS through a proxy that VSCode
   doesn't know about
   - **Fix**: Configure VSCode proxy in settings:
     ```json
     "http.proxy": "http://proxy.company.com:8080",
     "http.proxyStrictSSL": false
     ```
   - Contact your IT department for proxy URL and credentials

2. **Firewall blocks external APIs**: Network firewall policy prevents outbound
   HTTPS to `api.anthropic.com` or `api.openai.com`
   - **Fix**: Request IT to whitelist:
     - `api.anthropic.com` (port 443)
     - `api.openai.com` (port 443)

3. **DNS resolution fails**: DNS can't resolve provider domain names
   - **Test connectivity**:
     ```bash
     ping api.anthropic.com
     nslookup api.anthropic.com
     ```
   - If fails: Likely DNS/firewall issue; contact IT

---

### Issue 9: TypeError or Undefined Errors in Console

**Symptoms**:

- VSCode shows error in debug console:
  `TypeError: Cannot read property 'data' of undefined`
- Or: `Cannot read property 'totalCost' of null`
- Panel is blank or shows error

**Causes & Fixes**:

1. **API response format unexpected**: Provider API returned a format different
   from what code expects
   - **Fix**: This indicates a bug in feature 026 code. Report via GitHub issue
     with:
     - API endpoint used (e.g., `GET /v1/organizations/usage_report/messages`)
     - Full error message and stack trace
     - Provider (Anthropic or OpenAI)

2. **Missing null check in code**: Code didn't validate API response before
   accessing properties
   - **Workaround**: Reload window; if persists, raise GitHub issue with error
     details

3. **Outdated provider API response format**: Provider changed API response
   structure
   - **Workaround**: Check provider's API documentation for latest response
     format
   - **Report**: File GitHub issue with details; maintainers will update code

---

### Issue 10: Running Multiple VSCode Instances

**Symptoms**:

- Have 2+ VSCode windows open, each with admin keys configured
- Wondering if this causes duplicate API calls or interference

**Expected Behavior**:

- ✅ Each window polls independently (stateless HTTPS calls)
- ✅ Minor inefficiency: 2 windows = 2x API calls every 60 seconds (acceptable)
- ✅ No data corruption or interference between windows

**Optimization** (if concerned about API quotas):

- Close extra VSCode windows when not in use, or
- Disable admin key in extra windows: Set to empty string in workspace settings

---

## Validation Checklist

Use this checklist to validate Feature 026 before marking complete:

### Functional Completeness

- [ ] Anthropic billing API integration works (real usage data displayed)
- [ ] OpenAI billing API integration works (real usage data displayed)
- [ ] Both providers can be configured simultaneously
- [ ] Admin API key configuration available in VSCode settings UI
- [ ] Three-tier fallback works (admin key → no admin key → not configured)
- [ ] Configuration changes detected within 5 seconds
- [ ] Polling runs every 60 seconds (default, configurable)
- [ ] Manual refresh available (if implemented) or auto-polling sufficient
- [ ] API rate limiting handled with exponential backoff
- [ ] Last successful data cached and shown during temporary failures

### Error Handling & Recovery

- [ ] Invalid key shows actionable error message
- [ ] Expired key shows recovery instructions
- [ ] Network errors handled with retry + backoff
- [ ] Provider API down (5xx errors) handled gracefully
- [ ] Rate limited (429 errors) handled with backoff
- [ ] Response parsing errors logged with detail (no API key exposure)

### UI & UX

- [ ] Separate sections for each provider (not mixed)
- [ ] Data displayed with clear labels (input tokens, output tokens, cost,
      model)
- [ ] Timestamp visible ("Last updated: HH:MM AM/PM")
- [ ] Period selector works (Today → Week → Month if implemented)
- [ ] No placeholder values (either real data or "Not configured" message)
- [ ] Help links provided to guide users to admin key setup

### Performance & Resources

- [ ] Initial panel load < 5 seconds
- [ ] API calls don't block UI thread
- [ ] API requests timeout after 10 seconds (no hanging)
- [ ] Polling stops when panel is not visible (resource optimization)
- [ ] Memory usage increase < 5MB

### Code Quality

- [ ] No new npm dependencies added (uses Node.js https module)
- [ ] Existing UI components unchanged (AIUsageProvider, AIUsageStatusBar)
- [ ] UsageLogger preserved (not deleted)
- [ ] Unit tests pass (>80% coverage for API client)
- [ ] Integration tests pass
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compilation succeeds
- [ ] No console warnings or errors in normal operation

### Documentation & Release

- [ ] This quickstart guide complete and tested
- [ ] Spec.md reflects final implementation
- [ ] Code comments explain integration points
- [ ] Release notes include Feature 026 summary
- [ ] Git tag created and pushed (via `./release-auto.sh`)

---

## Test Execution Summary Template

Copy this template and fill it out after running all tests:

```
FEATURE 026 - PROVIDER API USAGE TRACKING: TEST EXECUTION SUMMARY

Date: _____________
Tester: _____________

Manual Test Scenarios Passed: ___/12 (specify which passed/skipped)
Automated Tests Passed: ___/100% coverage
Linting: ✓ / ✗
Type Checking: ✓ / ✗
Build: ✓ / ✗
Performance: ✓ / ✗ (panel load time: ___ ms)

Issues Found: ___
  - Issue #1: _____________
  - Issue #2: _____________

Ready for Release: ✓ / ✗
Release Notes: [Summary of changes for users]

Sign-off: _________________ (tester name)
```

---

## Next Steps

1. **Before Testing**: Ensure you have valid admin API keys from Anthropic and
   OpenAI (see Prerequisites section)
2. **Start with Manual Tests**: Run scenarios 1-7 first (core functionality)
3. **Run Automated Tests**: `npm test` to verify unit/integration test coverage
4. **Advanced Tests**: Run scenarios 8-13 if time permits (edge cases and system
   integration)
5. **Document Issues**: Use the troubleshooting section to resolve blockers
6. **Sign Off**: Complete the test execution summary template above
7. **Release**: Use
   `./release-auto.sh patch "Add Provider API Usage Tracking support"` when all
   tests pass

---

**Feature 026 Quickstart Guide Generated**: 2026-03-15 **Specification
Reference**:
`/Users/douglaswross/Code/eai-gofer/.specify/specs/026-provider-api-usage/spec.md`
