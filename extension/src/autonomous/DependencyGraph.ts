/**
 * DependencyGraph - Manages spec relationships and dependencies
 *
 * Responsibilities:
 * - Track dependencies between specs
 * - Detect circular dependencies
 * - Provide topological ordering
 * - Generate impact analysis reports
 * - Persist graph state
 */

import { Graph, alg } from 'graphlib';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  DependencyGraph as IDependencyGraph,
  SpecDependency,
  SpecNode,
  SpecNodeMetadata,
  SpecDependencyMetadata,
  DependencyGraphData,
  ImpactReport,
  DependencyCycle,
  DependencyGraphValidation,
} from './dependencies';
import { Logger } from '../utils/logger';

/**
 * DependencyGraph implementation using graphlib.
 *
 * Features:
 * - Directed acyclic graph (DAG) enforcement
 * - Cycle detection before adding edges
 * - Topological sorting for execution order
 * - Impact analysis for dependency tracking
 * - JSON persistence
 */
export class DependencyGraph implements IDependencyGraph {
  private readonly graph: Graph;
  private readonly workspaceRoot: string;
  private dependencies: Map<string, SpecDependency> = new Map();
  private readonly logger: Logger;

  /**
   * Creates a new DependencyGraph instance.
   *
   * @param workspaceRoot - Absolute path to workspace root
   */
  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.graph = new Graph({ directed: true });
    this.logger = Logger.for('DependencyGraph');
    this.logger.debug('DependencyGraph initialized', { workspaceRoot });
  }

  /**
   * Add a spec node to the graph.
   *
   * @param specId - Spec identifier
   * @param metadata - Optional metadata
   */
  addSpec(specId: string, metadata?: SpecNodeMetadata): void {
    const node: SpecNode = {
      specId,
      status: 'pending',
      metadata,
    };

    this.graph.setNode(specId, node);
  }

  /**
   * Remove a spec from the graph.
   * Also removes all associated dependency edges.
   *
   * @param specId - Spec identifier
   */
  removeSpec(specId: string): void {
    // Remove all edges connected to this node
    const inEdges = this.graph.inEdges(specId) || [];
    const outEdges = this.graph.outEdges(specId) || [];

    for (const edge of [...inEdges, ...outEdges]) {
      const key = `${edge.v}->${edge.w}`;
      this.dependencies.delete(key);
    }

    // Remove the node itself
    this.graph.removeNode(specId);
  }

  /**
   * Add a dependency between two specs.
   *
   * @param from - Dependent spec ID
   * @param to - Dependency spec ID
   * @param type - Type of dependency
   * @param metadata - Optional metadata
   * @throws Error if this would create a cycle
   */
  addDependency(
    from: string,
    to: string,
    type: 'required_by' | 'uses_api_from' | 'blocks',
    metadata?: SpecDependencyMetadata
  ): void {
    this.logger.debug('Adding dependency', { from, to, type });

    // Check if this would create a cycle
    if (this.wouldCreateCycle(from, to)) {
      this.logger.warn(
        'Cycle detected, dependency not added',
        undefined,
        new Error(`Cannot add dependency from ${from} to ${to}: would create a cycle`)
      );
      throw new Error(`Cannot add dependency from ${from} to ${to}: would create a cycle`);
    }

    // Ensure both nodes exist
    if (!this.graph.hasNode(from)) {
      this.addSpec(from);
    }
    if (!this.graph.hasNode(to)) {
      this.addSpec(to);
    }

    // Add edge to graph
    this.graph.setEdge(from, to);

    // Store dependency metadata
    const dependency: SpecDependency = {
      fromSpecId: from,
      toSpecId: to,
      dependencyType: type,
      declared: metadata !== undefined,
      metadata,
    };

    const key = `${from}->${to}`;
    this.dependencies.set(key, dependency);
  }

  /**
   * Remove a dependency between two specs.
   *
   * @param from - Dependent spec ID
   * @param to - Dependency spec ID
   */
  removeDependency(from: string, to: string): void {
    this.graph.removeEdge(from, to);
    const key = `${from}->${to}`;
    this.dependencies.delete(key);
  }

  /**
   * Get direct dependencies of a spec.
   *
   * @param specId - Spec identifier
   * @returns Array of spec IDs this spec depends on
   */
  getDependencies(specId: string): string[] {
    if (!this.graph.hasNode(specId)) {
      return [];
    }

    return this.graph.successors(specId) || [];
  }

  /**
   * Get direct dependents of a spec.
   *
   * @param specId - Spec identifier
   * @returns Array of spec IDs that depend on this spec
   */
  getDependents(specId: string): string[] {
    if (!this.graph.hasNode(specId)) {
      return [];
    }

    return this.graph.predecessors(specId) || [];
  }

  /**
   * Check if a dependency would create a cycle.
   *
   * @param from - Dependent spec ID
   * @param to - Dependency spec ID
   * @returns True if adding this dependency would create a cycle
   */
  wouldCreateCycle(from: string, to: string): boolean {
    // Temporarily add the edge
    const hadFrom = this.graph.hasNode(from);
    const hadTo = this.graph.hasNode(to);

    if (!hadFrom) {
      this.graph.setNode(from, { specId: from, status: 'pending' });
    }
    if (!hadTo) {
      this.graph.setNode(to, { specId: to, status: 'pending' });
    }

    this.graph.setEdge(from, to);

    // Check for cycles
    const cycles = alg.findCycles(this.graph);
    const hasCycle = cycles.length > 0;

    // Rollback
    this.graph.removeEdge(from, to);
    if (!hadFrom) {
      this.graph.removeNode(from);
    }
    if (!hadTo) {
      this.graph.removeNode(to);
    }

    return hasCycle;
  }

  /**
   * Detect cycles in the graph.
   *
   * @returns Array of cycles, or null if no cycles
   */
  detectCycles(): DependencyCycle[] | null {
    const cycles = alg.findCycles(this.graph);

    if (cycles.length === 0) {
      return null;
    }

    return cycles.map((cycle) => ({
      path: cycle,
      description: `Circular dependency: ${cycle.join(' → ')} → ${cycle[0]}`,
    }));
  }

  /**
   * Get topologically sorted execution order for specs.
   *
   * @param specIds - Array of spec IDs to sort (if empty, sorts all specs)
   * @returns Linearized order respecting all dependencies
   * @throws Error if cycles exist
   */
  getExecutionOrder(specIds?: string[]): string[] {
    // Check for cycles first
    const cycles = this.detectCycles();
    if (cycles && cycles.length > 0) {
      throw new Error(
        `Cannot determine execution order: cycles detected\n${cycles
          .map((c) => c.description)
          .join('\n')}`
      );
    }

    // Get all nodes if no specific IDs provided
    const nodesToSort = specIds || this.graph.nodes();

    // Topological sort (graphlib returns in reverse order, so reverse it)
    let order = alg.topsort(this.graph).reverse();

    // If specific IDs provided, filter to requested IDs
    if (specIds && specIds.length > 0) {
      order = order.filter((id) => specIds.includes(id));
    }

    return order;
  }

  /**
   * Generate impact report for a spec.
   *
   * @param specId - Spec identifier
   * @returns Detailed impact analysis
   */
  getImpactReport(specId: string): ImpactReport {
    if (!this.graph.hasNode(specId)) {
      throw new Error(`Spec ${specId} not found in graph`);
    }

    // Direct dependencies and dependents
    const directDependencies = this.getDependencies(specId);
    const directDependents = this.getDependents(specId);

    // Transitive dependencies (specs this one depends on, recursively)
    const transitiveDependencies = this.getTransitiveDependencies(specId);

    // Transitive dependents (specs that depend on this one, recursively)
    const transitiveDependents = this.getTransitiveDependents(specId);

    // Calculate impact score (0-100)
    // Based on number of dependents (more dependents = higher impact)
    const totalDependents = directDependents.length + transitiveDependents.length;
    const impactScore = Math.min(100, totalDependents * 10);

    return {
      specId,
      directDependencies,
      directDependents,
      transitiveDependencies,
      transitiveDependents,
      impactScore,
    };
  }

  /**
   * Get transitive dependencies (recursive).
   *
   * @param specId - Spec identifier
   * @returns Array of all transitive dependency IDs
   */
  private getTransitiveDependencies(specId: string): string[] {
    const visited = new Set<string>();
    const queue: string[] = [specId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const deps = this.getDependencies(current);

      for (const dep of deps) {
        if (!visited.has(dep) && dep !== specId) {
          visited.add(dep);
          queue.push(dep);
        }
      }
    }

    return Array.from(visited);
  }

  /**
   * Get transitive dependents (recursive).
   *
   * @param specId - Spec identifier
   * @returns Array of all transitive dependent IDs
   */
  private getTransitiveDependents(specId: string): string[] {
    const visited = new Set<string>();
    const queue: string[] = [specId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const dependents = this.getDependents(current);

      for (const dependent of dependents) {
        if (!visited.has(dependent) && dependent !== specId) {
          visited.add(dependent);
          queue.push(dependent);
        }
      }
    }

    return Array.from(visited);
  }

  /**
   * Get all specs in the graph.
   *
   * @returns Array of all spec IDs
   */
  getAllSpecs(): string[] {
    return this.graph.nodes();
  }

  /**
   * Get dependency edge between two specs.
   *
   * @param from - Dependent spec ID
   * @param to - Dependency spec ID
   * @returns SpecDependency if exists, undefined otherwise
   */
  getDependency(from: string, to: string): SpecDependency | undefined {
    const key = `${from}->${to}`;
    return this.dependencies.get(key);
  }

  /**
   * Check if a dependency exists.
   *
   * @param from - Dependent spec ID
   * @param to - Dependency spec ID
   * @returns True if dependency exists
   */
  hasDependency(from: string, to: string): boolean {
    return this.graph.hasEdge(from, to);
  }

  /**
   * Update spec status.
   *
   * @param specId - Spec identifier
   * @param status - New status
   */
  updateStatus(specId: string, status: SpecNode['status']): void {
    const node = this.graph.node(specId) as SpecNode | undefined;
    if (node) {
      node.status = status;
      this.graph.setNode(specId, node);
    }
  }

  /**
   * Get spec node data.
   *
   * @param specId - Spec identifier
   * @returns SpecNode if exists, undefined otherwise
   */
  getSpec(specId: string): SpecNode | undefined {
    return this.graph.node(specId) as SpecNode | undefined;
  }

  /**
   * Validate graph integrity.
   *
   * Checks for orphaned edges, cycles, and other inconsistencies.
   *
   * @returns Validation result
   */
  validate(): DependencyGraphValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const orphanedEdges: SpecDependency[] = [];

    // Check for cycles
    const cycles = this.detectCycles() || [];

    // Check for orphaned edges (edges referencing non-existent nodes)
    for (const [key, dependency] of this.dependencies.entries()) {
      if (!this.graph.hasNode(dependency.fromSpecId)) {
        errors.push(`Orphaned edge: ${key} references non-existent node ${dependency.fromSpecId}`);
        orphanedEdges.push(dependency);
      }
      if (!this.graph.hasNode(dependency.toSpecId)) {
        errors.push(`Orphaned edge: ${key} references non-existent node ${dependency.toSpecId}`);
        orphanedEdges.push(dependency);
      }
    }

    // Check for isolated nodes (no dependencies either way)
    const nodes = this.graph.nodes();
    for (const node of nodes) {
      const deps = this.getDependencies(node);
      const dependents = this.getDependents(node);

      if (deps.length === 0 && dependents.length === 0) {
        warnings.push(`Isolated spec: ${node} has no dependencies or dependents`);
      }
    }

    const valid = errors.length === 0 && cycles.length === 0;

    return {
      valid,
      errors,
      warnings,
      cycles,
      orphanedEdges,
    };
  }

  /**
   * Export graph data for serialization.
   *
   * @returns Serializable graph data
   */
  export(): DependencyGraphData {
    const nodes: Record<string, SpecNode> = {};

    for (const specId of this.graph.nodes()) {
      const node = this.graph.node(specId) as SpecNode;
      nodes[specId] = node;
    }

    const edges = Array.from(this.dependencies.values());

    return {
      version: 1,
      lastModified: Date.now(),
      nodes,
      edges,
    };
  }

  /**
   * Import graph data.
   *
   * @param data - Graph data to import
   */
  import(data: DependencyGraphData): void {
    // Clear existing graph
    this.graph.setGraph({});
    this.dependencies.clear();

    // Import nodes
    for (const [specId, node] of Object.entries(data.nodes)) {
      this.graph.setNode(specId, node);
    }

    // Import edges
    for (const edge of data.edges) {
      this.graph.setEdge(edge.fromSpecId, edge.toSpecId);
      const key = `${edge.fromSpecId}->${edge.toSpecId}`;
      this.dependencies.set(key, edge);
    }
  }

  /**
   * Save graph to file.
   *
   * @param filePath - Path to save file (defaults to .specify/memory/dependency-graph.json)
   */
  async save(filePath?: string): Promise<void> {
    const savePath =
      filePath || path.join(this.workspaceRoot, '.specify', 'memory', 'dependency-graph.json');

    const data = this.export();
    const json = JSON.stringify(data, null, 2);

    // Ensure directory exists
    await fs.mkdir(path.dirname(savePath), { recursive: true });

    // Write file
    await fs.writeFile(savePath, json, 'utf-8');
  }

  /**
   * Load graph from file.
   *
   * @param workspaceRoot - Workspace root path
   * @param filePath - Path to load from
   * @returns DependencyGraph instance
   */
  static async load(workspaceRoot: string, filePath?: string): Promise<DependencyGraph> {
    const loadPath =
      filePath || path.join(workspaceRoot, '.specify', 'memory', 'dependency-graph.json');

    const json = await fs.readFile(loadPath, 'utf-8');
    const data = JSON.parse(json) as DependencyGraphData;

    const graph = new DependencyGraph(workspaceRoot);
    graph.import(data);

    return graph;
  }

  /**
   * Get underlying graphlib Graph instance.
   *
   * @returns graphlib Graph object (for advanced operations)
   */
  getGraph(): Graph {
    return this.graph;
  }
}
