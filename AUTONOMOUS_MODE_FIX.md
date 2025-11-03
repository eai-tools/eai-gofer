# Autonomous Mode Issue - Root Cause Analysis

## Current Status

✅ **The "Play Button" IS Working** - The autonomous orchestrator started
successfully  
❌ **It's Stuck Waiting** - Waiting for Claude Code response in
`.claude-output.txt`  
🔍 **Root Cause**: File-based communication requires manual intervention

## What's Happening

When you press "Play" (run the task), SpecGofer:

1. ✅ Loads specs from `.specify/specs/`
2. ✅ Builds task queue with dependencies
3. ✅ Selects next task: `task-001 - Create login UI component`
4. ✅ Writes task to `.claude-input.txt`
5. ⏳ **WAITS INDEFINITELY** for `.claude-output.txt` to have content
6. ❌ Times out after 5 minutes if no response

## The Problem

The orchestrator uses **file-based communication** (`.claude-input.txt` ↔
`.claude-output.txt`) which was designed for:

- Manual Claude Code integration
- External AI agent coordination
- Human-in-the-loop workflows

But it **doesn't automatically implement code** - it just writes the task prompt
and waits.

## Why This Happened

Looking at the code in `dist/orchestrator/AutonomousOrchestrator.js`:

```javascript
// Line 68-72: Sends task to Claude Code
await this.sendTaskToClaudeCode(nextTask);

// Line 74-75: Waits for response (BLOCKING)
console.log('⏳ Waiting for Claude Code response...');
const response = await this.waitForClaudeResponse();
```

The `waitForClaudeResponse()` function:

```javascript
async waitForClaudeResponse(timeout = 300000) {
    // Polls .claude-output.txt for 5 minutes
    while (Date.now() - startTime < timeout) {
        const content = await fs.readFile('.claude-output.txt', 'utf-8');
        if (content.trim()) {
            return content;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Response timeout');
}
```

This is a **polling loop** that checks every second for a response file.

## What Should Happen Instead

### Option A: Use MCP Tools (Proper Solution)

The orchestrator should use the **Language Server MCP tools** to directly invoke
Claude:

```typescript
// Instead of file watching
await this.sendTaskToClaudeCode(nextTask);
await this.waitForClaudeResponse();

// Should use MCP tools
const response = await this.mcpClient.call('specgofer_execute_task', {
  specId: spec.id,
  taskId: task.id,
});
```

This would directly call Claude via the MCP protocol and get immediate
responses.

### Option B: Direct Claude API (Current Partial Implementation)

The `EngineerAgent` already has Anthropic SDK integration but only for
validation:

```typescript
// In EngineerAgent.ts
async validate(task, implementation, testResult) {
    const response = await this.anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        // ... validates code
    });
}
```

We could extend this to **generate the implementation** directly:

```typescript
async implement(task) {
    const response = await this.anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        messages: [{
            role: 'user',
            content: `Implement this task: ${task.description}\n\n${task.deliveryPrompt}`
        }],
        // ... generate code
    });
    return response.content;
}
```

## Why It's Not Working for Dagger Feature

For the **006-test-feature (Dagger)** specifically:

1. The spec is in "Draft" status
2. The orchestrator picked up a different spec's task (`task-001` from another
   spec)
3. Even if it picked up Dagger tasks, it would still be stuck waiting for
   responses

## How to Fix

### Immediate Fix: Manual Response

You can manually test it by writing to `.claude-output.txt`:

```bash
# Write a response
echo "Login component created successfully" > .claude-output.txt

# The orchestrator will pick it up and continue
```

### Proper Fix: Implement Direct Claude Integration

Modify the orchestrator to call Claude API directly instead of file watching:

```typescript
// In AutonomousOrchestrator.ts
async executeTaskWithClaude(task: Task): Promise<string> {
    const response = await this.anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 8000,
        messages: [{
            role: 'user',
            content: `You are a senior software engineer implementing this task:

Task: ${task.id}
Description: ${task.description}
Delivery Prompt: ${task.deliveryPrompt}

Please provide the implementation with:
1. Code files to create/modify
2. Explanations of your approach
3. Any assumptions made

Respond in a structured format.`
        }]
    });

    return response.content[0].text;
}
```

Then in the main loop:

```typescript
// Replace this:
await this.sendTaskToClaudeCode(nextTask);
const response = await this.waitForClaudeResponse();

// With this:
const response = await this.executeTaskWithClaude(nextTask);
```

### Alternative: Use Anthropic Computer Use API

For actual file creation/modification, use Claude's computer use feature:

```typescript
const response = await this.anthropic.messages.create({
  model: 'claude-3-7-sonnet-20250219',
  max_tokens: 8000,
  tools: [
    {
      type: 'computer_20241022',
      name: 'computer',
      display_width_px: 1024,
      display_height_px: 768,
    },
  ],
  messages: [
    /* ... */
  ],
});
```

## Summary

**The autonomous mode IS working** - the code is running correctly. But it's
designed as a **coordinator** that waits for external agents to respond via
files, not as a **fully autonomous implementation engine**.

To make it truly autonomous for the Dagger feature (or any feature), you need
to:

1. ✅ Keep the task orchestration logic (it's good!)
2. ❌ Remove file-watching communication
3. ✅ Add direct Claude API calls for implementation
4. ✅ Use MCP tools or Anthropic SDK directly
5. ✅ Implement actual file creation/modification

## Next Steps

Would you like me to:

1. **Fix the orchestrator** to use direct Claude API calls?
2. **Manually implement** the Dagger feature tasks?
3. **Create a hybrid approach** that uses both MCP tools and direct API?

The current "play button" starts the process, but you need to choose how the
actual implementation happens.
