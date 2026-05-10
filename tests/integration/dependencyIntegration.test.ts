/**
 * Integration Tests for Dependency Tracking
 *
 * Tests the complete dependency workflow:
 * - Declaring dependencies in spec frontmatter
 * - Detecting cycles
 * - Topological ordering for execution
 * - Impact analysis
 *
 * T120: Write integration test for complete dependency workflow
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import { SpecLoader } from '../../extension/src/autonomous/SpecLoader';
import { DependencyGraph } from '../../extension/src/autonomous/DependencyGraph';

// Unmock fs for this integration test (needs real file system)
vi.unmock('fs');
vi.unmock('fs/promises');

// Import fs after unmocking
import * as fs from 'fs';

describe('Dependency Integration Tests', () => {
  const testWorkspaceRoot = path.join(__dirname, 'test-workspace-deps');
  const specsDir = path.join(testWorkspaceRoot, '.specify', 'specs');
  let specLoader: SpecLoader;
  let dependencyGraph: DependencyGraph;

  beforeEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspaceRoot)) {
      fs.rmSync(testWorkspaceRoot, { recursive: true });
    }
    fs.mkdirSync(specsDir, { recursive: true });

    // Create test specs with dependencies
    createTestSpec('001-authentication', [], 'completed');
    createTestSpec('002-user-profile', ['001-authentication'], 'in_progress');
    createTestSpec('003-admin-panel', ['001-authentication', '002-user-profile'], 'pending');
    createTestSpec('004-api-integration', ['001-authentication'], 'pending');
    createTestSpec('005-dashboard', ['002-user-profile', '004-api-integration'], 'pending');

    // Initialize services
    specLoader = new SpecLoader(testWorkspaceRoot);
    dependencyGraph = new DependencyGraph(testWorkspaceRoot);
  });

  afterEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspaceRoot)) {
      fs.rmSync(testWorkspaceRoot, { recursive: true });
    }
  });

  /**
   * Helper function to create a test spec with frontmatter
   */
  function createTestSpec(
    specId: string,
    dependencies: string[],
    status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  ): void {
    const specDir = path.join(specsDir, specId);
    fs.mkdirSync(specDir, { recursive: true });

    const frontmatter = `---
title: ${specId.split('-').slice(1).join(' ')}
status: ${status}
priority: P1
depends_on: ${dependencies.length > 0 ? `\n${dependencies.map((d) => `  - ${d}`).join('\n')}` : '[]'}
---

# ${specId.split('-').slice(1).join(' ')}

Test specification for integration tests.
`;

    fs.writeFileSync(path.join(specDir, 'spec.md'), frontmatter, 'utf-8');
  }

  describe('Dependency Declaration and Loading', () => {
    it('should load dependencies from spec frontmatter', () => {
      const spec = specLoader.loadSpec('002-user-profile');

      expect(spec.frontmatter.depends_on).toBeDefined();
      expect(spec.frontmatter.depends_on).toContain('001-authentication');
      expect(spec.frontmatter.depends_on?.length).toBe(1);
    });

    it('should load multiple dependencies', () => {
      const spec = specLoader.loadSpec('003-admin-panel');

      expect(spec.frontmatter.depends_on).toBeDefined();
      expect(spec.frontmatter.depends_on).toContain('001-authentication');
      expect(spec.frontmatter.depends_on).toContain('002-user-profile');
      expect(spec.frontmatter.depends_on?.length).toBe(2);
    });

    it('should handle specs with no dependencies', () => {
      const spec = specLoader.loadSpec('001-authentication');

      // YAML parser returns [] for empty array, not undefined
      expect(spec.frontmatter.depends_on).toEqual([]);
    });

    it('should discover all specs', () => {
      const allSpecs = specLoader.discoverSpecs();

      expect(allSpecs).toHaveLength(5);
      expect(allSpecs).toContain('001-authentication');
      expect(allSpecs).toContain('002-user-profile');
      expect(allSpecs).toContain('003-admin-panel');
      expect(allSpecs).toContain('004-api-integration');
      expect(allSpecs).toContain('005-dashboard');
    });
  });

  describe('Dependency Validation', () => {
    it('should validate valid dependencies', () => {
      const result = specLoader.validateDependencies('002-user-profile');

      expect(result.valid).toBe(true);
      expect(result.missingSpecs).toHaveLength(0);
      expect(result.invalidFormats).toHaveLength(0);
    });

    it('should detect missing dependencies', () => {
      // Create spec with non-existent dependency
      createTestSpec('999-invalid-deps', ['888-non-existent'], 'pending');

      const result = specLoader.validateDependencies('999-invalid-deps');

      expect(result.valid).toBe(false);
      expect(result.missingSpecs).toContain('888-non-existent');
    });

    it('should detect invalid dependency formats', () => {
      // Create spec with invalid dependency format (missing numeric prefix)
      // Create directory first, then file
      fs.mkdirSync(path.join(specsDir, '999-invalid-format'), { recursive: true });
      fs.writeFileSync(
        path.join(specsDir, '999-invalid-format', 'spec.md'),
        `---
title: Invalid Format Test
depends_on:
  - invalid-format-no-number
---

# Invalid Format Test
`,
        'utf-8'
      );

      const result = specLoader.validateDependencies('999-invalid-format');

      expect(result.valid).toBe(false);
      expect(result.invalidFormats).toContain('invalid-format-no-number');
    });
  });

  describe('Dependency Graph Building', () => {
    it('should populate graph from spec frontmatter', () => {
      const allDependencies = specLoader.getAllDependencies();

      for (const [specId, dependencies] of allDependencies.entries()) {
        dependencyGraph.addSpec(specId);

        for (const depId of dependencies) {
          if (allDependencies.has(depId)) {
            dependencyGraph.addDependency(specId, depId, 'required_by');
          }
        }
      }

      // Verify nodes
      const allSpecs = dependencyGraph.getAllSpecs();
      expect(allSpecs).toHaveLength(5);

      // Verify edges
      expect(dependencyGraph.hasDependency('002-user-profile', '001-authentication')).toBe(true);
      expect(dependencyGraph.hasDependency('003-admin-panel', '001-authentication')).toBe(true);
      expect(dependencyGraph.hasDependency('003-admin-panel', '002-user-profile')).toBe(true);
    });

    it('should get direct dependencies', () => {
      const allDependencies = specLoader.getAllDependencies();

      for (const [specId, dependencies] of allDependencies.entries()) {
        dependencyGraph.addSpec(specId);

        for (const depId of dependencies) {
          if (allDependencies.has(depId)) {
            dependencyGraph.addDependency(specId, depId, 'required_by');
          }
        }
      }

      const deps = dependencyGraph.getDependencies('003-admin-panel');
      expect(deps).toContain('001-authentication');
      expect(deps).toContain('002-user-profile');
      expect(deps).toHaveLength(2);
    });

    it('should get direct dependents', () => {
      const allDependencies = specLoader.getAllDependencies();

      for (const [specId, dependencies] of allDependencies.entries()) {
        dependencyGraph.addSpec(specId);

        for (const depId of dependencies) {
          if (allDependencies.has(depId)) {
            dependencyGraph.addDependency(specId, depId, 'required_by');
          }
        }
      }

      const dependents = dependencyGraph.getDependents('001-authentication');
      expect(dependents).toContain('002-user-profile');
      expect(dependents).toContain('003-admin-panel');
      expect(dependents).toContain('004-api-integration');
      expect(dependents).toHaveLength(3);
    });
  });

  describe('Cycle Detection', () => {
    it('should prevent cycles when adding edges', () => {
      dependencyGraph.addSpec('001-authentication');
      dependencyGraph.addSpec('002-user-profile');

      // Add A -> B
      dependencyGraph.addDependency('002-user-profile', '001-authentication', 'required_by');

      // Try to add B -> A (would create cycle)
      expect(() => {
        dependencyGraph.addDependency('001-authentication', '002-user-profile', 'required_by');
      }).toThrow(/would create a cycle/);
    });

    it('should detect cycles in existing graph', () => {
      // Manually create a cycle by bypassing safety checks
      createTestSpec('901-cycle-a', ['902-cycle-b'], 'pending');
      createTestSpec('902-cycle-b', ['903-cycle-c'], 'pending');
      createTestSpec('903-cycle-c', ['901-cycle-a'], 'pending');

      const tempGraph = new DependencyGraph(testWorkspaceRoot);
      tempGraph.addSpec('901-cycle-a');
      tempGraph.addSpec('902-cycle-b');
      tempGraph.addSpec('903-cycle-c');

      // Force add edges (simulating corrupted data)
      tempGraph.getGraph().setEdge('901-cycle-a', '902-cycle-b');
      tempGraph.getGraph().setEdge('902-cycle-b', '903-cycle-c');
      tempGraph.getGraph().setEdge('903-cycle-c', '901-cycle-a');

      const cycles = tempGraph.detectCycles();
      expect(cycles).not.toBeNull();
      expect(cycles!.length).toBeGreaterThan(0);
    });

    it('should return null when no cycles exist', () => {
      const allDependencies = specLoader.getAllDependencies();

      for (const [specId, dependencies] of allDependencies.entries()) {
        dependencyGraph.addSpec(specId);

        for (const depId of dependencies) {
          if (allDependencies.has(depId)) {
            dependencyGraph.addDependency(specId, depId, 'required_by');
          }
        }
      }

      const cycles = dependencyGraph.detectCycles();
      expect(cycles).toBeNull();
    });
  });

  describe('Topological Ordering', () => {
    it('should return execution order respecting dependencies', () => {
      const allDependencies = specLoader.getAllDependencies();

      for (const [specId, dependencies] of allDependencies.entries()) {
        dependencyGraph.addSpec(specId);

        for (const depId of dependencies) {
          if (allDependencies.has(depId)) {
            dependencyGraph.addDependency(specId, depId, 'required_by');
          }
        }
      }

      const executionOrder = dependencyGraph.getExecutionOrder();

      // Verify dependencies come before dependents
      const authIndex = executionOrder.indexOf('001-authentication');
      const profileIndex = executionOrder.indexOf('002-user-profile');
      const adminIndex = executionOrder.indexOf('003-admin-panel');
      const apiIndex = executionOrder.indexOf('004-api-integration');
      const dashboardIndex = executionOrder.indexOf('005-dashboard');

      // 001 must come before 002, 003, 004
      expect(authIndex).toBeLessThan(profileIndex);
      expect(authIndex).toBeLessThan(adminIndex);
      expect(authIndex).toBeLessThan(apiIndex);

      // 002 must come before 003, 005
      expect(profileIndex).toBeLessThan(adminIndex);
      expect(profileIndex).toBeLessThan(dashboardIndex);

      // 004 must come before 005
      expect(apiIndex).toBeLessThan(dashboardIndex);
    });

    it('should order subset of specs', () => {
      const allDependencies = specLoader.getAllDependencies();

      for (const [specId, dependencies] of allDependencies.entries()) {
        dependencyGraph.addSpec(specId);

        for (const depId of dependencies) {
          if (allDependencies.has(depId)) {
            dependencyGraph.addDependency(specId, depId, 'required_by');
          }
        }
      }

      // Order only pending specs
      const pendingSpecs = ['003-admin-panel', '004-api-integration', '005-dashboard'];
      const executionOrder = dependencyGraph.getExecutionOrder(pendingSpecs);

      // Should only include requested specs
      expect(executionOrder).toHaveLength(3);
      expect(executionOrder).toContain('003-admin-panel');
      expect(executionOrder).toContain('004-api-integration');
      expect(executionOrder).toContain('005-dashboard');

      // Verify relative ordering
      const apiIndex = executionOrder.indexOf('004-api-integration');
      const dashboardIndex = executionOrder.indexOf('005-dashboard');

      // 004 must come before 005
      expect(apiIndex).toBeLessThan(dashboardIndex);
    });

    it('should throw error if cycles exist', () => {
      // Create graph with cycle
      const tempGraph = new DependencyGraph(testWorkspaceRoot);
      tempGraph.addSpec('901-cycle-a');
      tempGraph.addSpec('902-cycle-b');

      tempGraph.getGraph().setEdge('901-cycle-a', '902-cycle-b');
      tempGraph.getGraph().setEdge('902-cycle-b', '901-cycle-a');

      expect(() => {
        tempGraph.getExecutionOrder();
      }).toThrow(/cycles detected/);
    });
  });

  describe('Impact Analysis', () => {
    it('should calculate impact report', () => {
      const allDependencies = specLoader.getAllDependencies();

      for (const [specId, dependencies] of allDependencies.entries()) {
        dependencyGraph.addSpec(specId);

        for (const depId of dependencies) {
          if (allDependencies.has(depId)) {
            dependencyGraph.addDependency(specId, depId, 'required_by');
          }
        }
      }

      const impactReport = dependencyGraph.getImpactReport('001-authentication');

      // Direct dependents: 002, 003, 004
      expect(impactReport.directDependents).toHaveLength(3);
      expect(impactReport.directDependents).toContain('002-user-profile');
      expect(impactReport.directDependents).toContain('003-admin-panel');
      expect(impactReport.directDependents).toContain('004-api-integration');

      // Transitive dependents: 005 (depends on 002 and 004)
      expect(impactReport.transitiveDependents).toContain('005-dashboard');

      // No dependencies for root node
      expect(impactReport.directDependencies).toHaveLength(0);
      expect(impactReport.transitiveDependencies).toHaveLength(0);

      // Impact score should be high (many dependents)
      expect(impactReport.impactScore).toBeGreaterThan(0);
    });

    it('should calculate impact for leaf node', () => {
      const allDependencies = specLoader.getAllDependencies();

      for (const [specId, dependencies] of allDependencies.entries()) {
        dependencyGraph.addSpec(specId);

        for (const depId of dependencies) {
          if (allDependencies.has(depId)) {
            dependencyGraph.addDependency(specId, depId, 'required_by');
          }
        }
      }

      const impactReport = dependencyGraph.getImpactReport('005-dashboard');

      // Direct dependencies: 002, 004
      expect(impactReport.directDependencies).toHaveLength(2);
      expect(impactReport.directDependencies).toContain('002-user-profile');
      expect(impactReport.directDependencies).toContain('004-api-integration');

      // Transitive dependencies: 001 (via 002 and 004)
      expect(impactReport.transitiveDependencies).toContain('001-authentication');

      // No dependents (leaf node)
      expect(impactReport.directDependents).toHaveLength(0);
      expect(impactReport.transitiveDependents).toHaveLength(0);

      // Impact score should be low (no dependents)
      expect(impactReport.impactScore).toBe(0);
    });
  });

  describe('Graph Persistence', () => {
    it('should save and load graph', async () => {
      const allDependencies = specLoader.getAllDependencies();

      for (const [specId, dependencies] of allDependencies.entries()) {
        dependencyGraph.addSpec(specId);

        for (const depId of dependencies) {
          if (allDependencies.has(depId)) {
            dependencyGraph.addDependency(specId, depId, 'required_by', {
              reason: 'Test dependency',
              addedAt: Date.now(),
            });
          }
        }
      }

      // Save graph
      await dependencyGraph.save();

      // Verify file exists
      const graphPath = path.join(testWorkspaceRoot, '.specify', 'memory', 'dependency-graph.json');
      expect(fs.existsSync(graphPath)).toBe(true);

      // Load into new graph instance
      const loadedGraph = await DependencyGraph.load(testWorkspaceRoot);

      // Verify data
      expect(loadedGraph.getAllSpecs()).toHaveLength(5);
      expect(loadedGraph.hasDependency('002-user-profile', '001-authentication')).toBe(true);

      const dep = loadedGraph.getDependency('002-user-profile', '001-authentication');
      expect(dep).toBeDefined();
      expect(dep?.dependencyType).toBe('required_by');
      expect(dep?.metadata?.reason).toBe('Test dependency');
    });
  });

  describe('Complete Workflow', () => {
    it('should handle complete declare-detect-order workflow', async () => {
      // STEP 1: Declare dependencies in spec frontmatter (already done in beforeEach)
      const allDependencies = specLoader.getAllDependencies();
      expect(allDependencies.size).toBe(5);

      // STEP 2: Build dependency graph from declarations
      for (const [specId, dependencies] of allDependencies.entries()) {
        dependencyGraph.addSpec(specId, {
          title: specId.split('-').slice(1).join(' '),
        });

        for (const depId of dependencies) {
          if (allDependencies.has(depId)) {
            dependencyGraph.addDependency(specId, depId, 'required_by', {
              reason: 'Declared in spec frontmatter',
              addedAt: Date.now(),
            });
          }
        }
      }

      // STEP 3: Validate no cycles
      const cycles = dependencyGraph.detectCycles();
      expect(cycles).toBeNull();

      // STEP 4: Get topological execution order
      const executionOrder = dependencyGraph.getExecutionOrder();
      expect(executionOrder).toHaveLength(5);

      // Verify order respects dependencies
      const positions = Object.fromEntries(executionOrder.map((id, index) => [id, index]));

      expect(positions['001-authentication']).toBeLessThan(positions['002-user-profile']);
      expect(positions['001-authentication']).toBeLessThan(positions['003-admin-panel']);
      expect(positions['002-user-profile']).toBeLessThan(positions['003-admin-panel']);

      // STEP 5: Calculate impact for changes
      const authImpact = dependencyGraph.getImpactReport('001-authentication');
      expect(
        authImpact.directDependents.length + authImpact.transitiveDependents.length
      ).toBeGreaterThan(0);

      // STEP 6: Persist graph
      await dependencyGraph.save();
      const graphPath = path.join(testWorkspaceRoot, '.specify', 'memory', 'dependency-graph.json');
      expect(fs.existsSync(graphPath)).toBe(true);

      // STEP 7: Reload and verify
      const reloadedGraph = await DependencyGraph.load(testWorkspaceRoot);
      const reloadedOrder = reloadedGraph.getExecutionOrder();
      expect(reloadedOrder).toEqual(executionOrder);
    });
  });
});
