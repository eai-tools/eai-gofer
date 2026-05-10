#!/usr/bin/env node
/**
 * Quick test to validate Anthropic API key
 */
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

async function testApiKey(apiKey) {
  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }]
    });

    return true;
  } catch (error) {
    console.error('❌ FAILED: API key test failed');
    console.error(`   Error: ${error.message}`);
    if (error.status) {
      console.error(`   HTTP Status: ${error.status}`);
    }
    return false;
  }
}

// Read API key from workspace settings
const settingsPath = path.join(__dirname, '..', '.vscode', 'settings.json');
if (!fs.existsSync(settingsPath)) {
  console.error('❌ No settings.json found');
  process.exit(1);
}

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const apiKey = settings['gofer.anthropicApiKey'];

if (!apiKey || apiKey.trim() === '') {
  console.error('❌ No API key found in settings');
  process.exit(1);
}


testApiKey(apiKey).then(success => {
  process.exit(success ? 0 : 1);
});
