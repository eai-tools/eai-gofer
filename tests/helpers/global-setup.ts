import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting SpecGofer E2E Test Suite Global Setup');

  // Setup test environment
  process.env.NODE_ENV = 'test';
  process.env.WORKSPACE_DIR = '/tmp/specgofer-e2e-test';
  process.env.SPEC_DIR = '/tmp/specgofer-e2e-test/.specify';

  // Ensure test workspace exists
  const fs = require('fs').promises;
  const path = require('path');
  
  const workspaceDir = process.env.WORKSPACE_DIR;
  const specDir = process.env.SPEC_DIR;

  try {
    await fs.mkdir(path.join(specDir, 'specs'), { recursive: true });
    await fs.mkdir(path.join(specDir, 'memory'), { recursive: true });
    await fs.mkdir(path.join(workspaceDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(workspaceDir, 'tests'), { recursive: true });
    
    console.log('✅ Test workspace created');
  } catch (error) {
    console.error('❌ Failed to create test workspace:', error);
    throw error;
  }

  // Create basic package.json for test workspace
  const packageJson = {
    name: 'specgofer-e2e-test',
    version: '1.0.0',
    private: true,
    scripts: {
      test: 'vitest',
      build: 'tsc'
    },
    devDependencies: {
      '@types/node': '^18.0.0',
      'typescript': '^5.0.0',
      'vitest': '^1.0.0'
    }
  };

  try {
    await fs.writeFile(
      path.join(workspaceDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    console.log('✅ Test package.json created');
  } catch (error) {
    console.error('❌ Failed to create package.json:', error);
    throw error;
  }

  // Create TypeScript config for test workspace
  const tsConfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true
    },
    include: ['src/**/*', 'tests/**/*']
  };

  try {
    await fs.writeFile(
      path.join(workspaceDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );
    console.log('✅ Test tsconfig.json created');
  } catch (error) {
    console.error('❌ Failed to create tsconfig.json:', error);
    throw error;
  }

  // Create constitution file for constitutional validation tests
  const constitutionContent = `# SpecGofer Development Constitution

## Code Quality Standards
- **No \`any\` types** in TypeScript - Use proper typing always
- **Maximum function length**: 50 lines - Keep functions focused and readable
- **JSDoc required** for all public functions - Self-documenting code
- **Test coverage minimum**: 80% - Ensure reliability through testing
- **No \`console.log\`** in production code - Use proper logging

## Security Requirements
- **No hardcoded credentials** - Use environment variables or secure storage
- **All user input validated** - Prevent injection attacks
- **HTTPS for external APIs** - Encrypt data in transit
- **JWT expiry < 1 hour** - Minimize token exposure window
- **Input sanitization** - Prevent XSS and other attacks

## Performance Requirements
- **API response time < 500ms p95** - Keep user experience snappy
- **Memory usage < 100MB per process** - Efficient resource utilization
- **Database queries < 100ms p95** - Optimize data access
- **UI response time < 100ms** - Immediate user feedback
- **Bundle size optimization** - Minimize client-side payload

## Architecture Requirements
- **Single Responsibility Principle** - Each module has one clear purpose
- **Dependency Injection** - Testable and modular design
- **Error boundaries** - Graceful failure handling
- **Immutable data structures** - Predictable state management
- **Event-driven architecture** - Loose coupling between components

## Testing Requirements
- **Test-Driven Development (TDD)** - Write tests before implementation
- **Unit test isolation** - No external dependencies in unit tests
- **Integration test coverage** - Test component interactions
- **E2E test critical paths** - Validate complete user journeys
- **Performance testing** - Ensure scalability requirements

## Documentation Requirements
- **API documentation** - Clear interface contracts
- **Architecture decisions recorded** - ADRs for major choices
- **Setup instructions** - Easy onboarding for new developers
- **Troubleshooting guides** - Common issues and solutions
- **Code examples** - Practical usage demonstrations

---
*This constitution is enforced automatically by the SpecGofer autonomous development system.*
`;

  try {
    await fs.writeFile(
      path.join(specDir, 'memory', 'constitution.md'),
      constitutionContent
    );
    console.log('✅ Constitution file created');
  } catch (error) {
    console.error('❌ Failed to create constitution:', error);
    throw error;
  }

  console.log('🎯 Global setup completed successfully');
}

export default globalSetup;