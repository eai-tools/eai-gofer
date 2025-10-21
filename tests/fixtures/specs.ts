/**
 * Test Fixtures - Sample Specifications
 * 
 * These are sample specs used for testing the SpecKit loader and parser.
 */

export const validSpecMarkdown = `---
id: "test-001"
title: "Test Calculator Function"
status: "in_progress"
created: "2025-10-21"
updated: "2025-10-21"
priority: "high"
---

# Test Calculator Function

## Overview

Build a simple calculator function for testing purposes.

## Tasks

- [x] #T001 Create add function (deps: none)
- [x] #T002 Create subtract function (deps: none)
- [ ] #T003 Create multiply function (deps: T001, T002)
- [ ] #T004 Write tests (deps: T003)

## Acceptance Criteria

### AC1: Addition Works
- **Given** two numbers
- **When** add function is called
- **Then** returns sum correctly
`;

export const validSpecWithDependencies = `---
id: "test-002"
title: "Feature with Dependencies"
status: "pending"
created: "2025-10-21"
---

# Feature with Dependencies

## Tasks

- [ ] #T001 Setup database (deps: none)
- [ ] #T002 Create models (deps: T001)
- [ ] #T003 Create API routes (deps: T002)
- [ ] #T004 Add authentication (deps: T001)
- [ ] #T005 Add authorization (deps: T004, T003)
`;

export const invalidSpecMissingFrontmatter = `# Invalid Spec

This spec is missing YAML frontmatter.

## Tasks

- [ ] #T001 Some task
`;

export const invalidSpecMalformedYAML = `---
id: test-003
title: Missing quotes
status: invalid
this is malformed yaml
---

# Invalid Spec
`;

export const legacyJSONSpec = {
  id: 'legacy-001',
  title: 'Legacy Format Spec',
  status: 'pending',
  tasks: [
    {
      id: 'T001',
      description: 'First task',
      status: 'pending',
      dependencies: [],
    },
    {
      id: 'T002',
      description: 'Second task',
      status: 'pending',
      dependencies: ['T001'],
    },
  ],
  acceptanceCriteria: [
    {
      id: 'AC1',
      description: 'Some criteria',
      testType: 'playwright',
      testPath: 'tests/example.spec.ts',
    },
  ],
};

export const constitutionSample = `# Project Constitution

## Article I: Code Quality

- TypeScript strict mode required
- No \`any\` types allowed
- Maximum 300 lines per file
- ESLint must pass with zero warnings

## Article II: Testing Standards

- 80% minimum code coverage
- TDD workflow required
- Playwright for E2E tests
`;

export const createMockSpec = (overrides = {}) => ({
  id: 'mock-001',
  title: 'Mock Specification',
  status: 'in_progress',
  description: 'A mock spec for testing',
  tasks: [
    {
      id: 'T001',
      description: 'Task 1',
      status: 'completed',
      dependencies: [],
      attempts: 0,
    },
    {
      id: 'T002',
      description: 'Task 2',
      status: 'in_progress',
      dependencies: ['T001'],
      attempts: 1,
    },
    {
      id: 'T003',
      description: 'Task 3',
      status: 'pending',
      dependencies: ['T002'],
      attempts: 0,
    },
  ],
  acceptanceCriteria: [],
  ...overrides,
});
