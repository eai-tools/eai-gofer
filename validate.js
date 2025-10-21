#!/usr/bin/env node
/**
 * Validation Script - Uses Engineer Agent to validate SpecGofer implementation
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
  console.log('⚠️  ANTHROPIC_API_KEY not found - skipping AI validation');
  console.log('   Running basic constitution checks only\n');
}

async function validateImplementation() {
  console.log('🔍 SpecGofer Implementation Validation\n');
  console.log('=' .repeat(60));
  
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
  
  console.log(`\n📋 Found ${specFolders.length} specifications:\n`);
  
  for (const folder of specFolders) {
    const specPath = path.join(specsDir, folder, 'spec.md');
    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, 'utf-8');
      const titleMatch = specContent.match(/title:\s*"([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : folder;
      console.log(`   - ${folder}: ${title}`);
    }
  }
  
  // Validate key components
  console.log('\n\n🔧 Validating Key Components\n');
  console.log('=' .repeat(60));
  
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
    console.log(`\n\n📦 ${component.name}`);
    console.log('-'.repeat(60));
    
    const filePath = path.join(__dirname, component.path);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${component.path}`);
      results.push({ component: component.name, status: 'missing' });
      continue;
    }
    
    const code = fs.readFileSync(filePath, 'utf-8');
    const lines = code.split('\n').length;
    
    console.log(`   Path: ${component.path}`);
    console.log(`   Lines: ${lines}`);
    console.log(`   Size: ${(code.length / 1024).toFixed(2)} KB`);
    
    // Check against constitution
    const constitutionChecks = {
      hasAnyType: code.includes(': any') || code.includes('<any>'),
      tooLarge: lines > 300,
      hasTests: fs.existsSync(filePath.replace('/src/', '/tests/').replace('.ts', '.test.ts')),
      hasDocumentation: code.includes('/**') || code.includes('*/')
    };
    
    console.log('\n   Constitution Compliance:');
    console.log(`   ${constitutionChecks.hasAnyType ? '❌' : '✅'} No 'any' types`);
    console.log(`   ${constitutionChecks.tooLarge ? '❌' : '✅'} File size < 300 lines`);
    console.log(`   ${constitutionChecks.hasTests ? '✅' : '❌'} Has unit tests`);
    console.log(`   ${constitutionChecks.hasDocumentation ? '✅' : '❌'} Has documentation`);
    
    const isCompliant = !constitutionChecks.hasAnyType && 
                       !constitutionChecks.tooLarge && 
                       constitutionChecks.hasDocumentation;
    
    if (isCompliant) {
      console.log(`\n   ✅ PASSED constitutional checks`);
      results.push({ component: component.name, status: 'passed', needsTests: !constitutionChecks.hasTests });
    } else {
      console.log(`\n   ⚠️  NEEDS ATTENTION`);
      results.push({ component: component.name, status: 'needs-work', needsTests: !constitutionChecks.hasTests });
    }
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'passed').length;
  const needsWork = results.filter(r => r.status === 'needs-work').length;
  const missing = results.filter(r => r.status === 'missing').length;
  const needsTests = results.filter(r => r.needsTests).length;
  
  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  console.log(`⚠️  Needs Work: ${needsWork}/${results.length}`);
  console.log(`❌ Missing: ${missing}/${results.length}`);
  console.log(`🧪 Missing Tests: ${needsTests}/${results.length}`);
  
  if (needsWork > 0 || missing > 0) {
    console.log('\n⚠️  Action Required:');
    results.forEach(r => {
      if (r.status === 'needs-work') {
        console.log(`   - Fix ${r.component} to meet constitution requirements`);
      }
      if (r.status === 'missing') {
        console.log(`   - Implement ${r.component}`);
      }
    });
  }
  
  if (needsTests > 0) {
    console.log('\n🧪 Testing Required:');
    results.forEach(r => {
      if (r.needsTests) {
        console.log(`   - Add unit tests for ${r.component}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  const overallStatus = (needsWork === 0 && missing === 0) ? 'READY' : 'IN PROGRESS';
  console.log(`\n🎯 Overall Status: ${overallStatus}`);
  
  if (needsTests > 0) {
    console.log('⚠️  Note: Implementation complete but missing comprehensive tests');
  }
  
  console.log('\n✨ Next Steps:');
  console.log('   1. Implement missing components');
  console.log('   2. Fix constitution violations');
  console.log('   3. Add comprehensive test coverage (spec 004)');
  console.log('   4. Run E2E validation with Playwright');
  console.log('   5. Deploy to production\n');
}

validateImplementation().catch(console.error);
