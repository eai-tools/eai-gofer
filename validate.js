#!/usr/bin/env node
/**
 * Validation Script - Uses Engineer Agent to validate Gofer implementation
 * against constitution and specifications
 */

import { EngineerAgent } from './dist/agents/EngineerAgent.js';
import { TestAgent } from './dist/agents/TestAgent.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
}

async function validateImplementation() {
  
  const engineerAgent = new EngineerAgent(API_KEY);
  const testAgent = new TestAgent(__dirname);
  
  // Read constitution
  const constitutionPath = path.join(__dirname, '.specify/memory/constitution.md');
  const constitution = fs.readFileSync(constitutionPath, 'utf-8');
  
  // Read specs
  const specsDir = path.join(__dirname, '.specify/specs');
  const specFolders = fs.readdirSync(specsDir).filter(f => 
    fs.statSync(path.join(specsDir, f)).isDirectory()
  );
  
  
  for (const folder of specFolders) {
    const specPath = path.join(specsDir, folder, 'spec.md');
    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, 'utf-8');
      const titleMatch = specContent.match(/title:\s*"([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : folder;
    }
  }
  
  // Validate key components
  
  const componentsToValidate = [
    {
      name: 'Extension Entry Point',
      path: 'extension/src/extension.ts',
      spec: '001-vscode-extension'
    },
    {
      name: 'Language Server',
      path: 'language-server/src/server.ts',
      spec: '002-language-server'
    },
    {
      name: 'Orchestrator',
      path: 'src/orchestrator/Orchestrator.ts',
      spec: '003-orchestrator-agents'
    },
    {
      name: 'Engineer Agent',
      path: 'src/agents/EngineerAgent.ts',
      spec: '003-orchestrator-agents'
    },
    {
      name: 'Test Agent',
      path: 'src/agents/TestAgent.ts',
      spec: '003-orchestrator-agents'
    }
  ];
  
  const results = [];
  
  for (const component of componentsToValidate) {
    
    const filePath = path.join(__dirname, component.path);
    
    if (!fs.existsSync(filePath)) {
      results.push({ component: component.name, status: 'missing' });
      continue;
    }
    
    const code = fs.readFileSync(filePath, 'utf-8');
    const lines = code.split('\n').length;
    
    
    // Check against constitution
    const constitutionChecks = {
      hasAnyType: code.includes(': any') || code.includes('<any>'),
      tooLarge: lines > 300,
      hasTests: fs.existsSync(filePath.replace('/src/', '/tests/').replace('.ts', '.test.ts')),
      hasDocumentation: code.includes('/**') || code.includes('*/')
    };
    
    
    const isCompliant = !constitutionChecks.hasAnyType && 
                       !constitutionChecks.tooLarge && 
                       constitutionChecks.hasDocumentation;
    
    if (isCompliant) {
      results.push({ component: component.name, status: 'passed', needsTests: !constitutionChecks.hasTests });
    } else {
      results.push({ component: component.name, status: 'needs-work', needsTests: !constitutionChecks.hasTests });
    }
  }
  
  // Summary
  
  const passed = results.filter(r => r.status === 'passed').length;
  const needsWork = results.filter(r => r.status === 'needs-work').length;
  const missing = results.filter(r => r.status === 'missing').length;
  const needsTests = results.filter(r => r.needsTests).length;
  
  
  if (needsWork > 0 || missing > 0) {
    results.forEach(r => {
      if (r.status === 'needs-work') {
      }
      if (r.status === 'missing') {
      }
    });
  }
  
  if (needsTests > 0) {
    results.forEach(r => {
      if (r.needsTests) {
      }
    });
  }
  
  
  const overallStatus = (needsWork === 0 && missing === 0) ? 'READY' : 'IN PROGRESS';
  
  if (needsTests > 0) {
  }
  
}

validateImplementation().catch(console.error);
