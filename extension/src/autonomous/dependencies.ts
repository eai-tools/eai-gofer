/**
 * Memory and Learning System - Dependencies Contracts
 *
 * Defines interfaces for SpecDependency and DependencyGraph.
 * These contracts specify the API for spec relationship tracking and impact analysis.
 *
 * @see data-model.md for detailed entity schemas
 */

import { Graph } from 'graphlib';

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Represents a directed dependency edge between two specs.
 */
export interface SpecDependency {
  /** Dependent spec ID (e.g., "002-user-profile") */
  fromSpecId: string;

  /** Dependency spec ID (e.g., "001-authentication") */
  toSpecId: string;

  /** Type of dependency relationship */
  dependencyType: 'required_by' | 'uses_api_from' | 'blocks';

  /** Whether declared in frontmatter (true) or inferred (false) */
  declared: boolean;

  /** Optional metadata */
  metadata?: SpecDependencyMetadata;
}

/**
 * Metadata for a spec dependency.
 */
export interface SpecDependencyMetadata {
  /** Human-readable reason for dependency */
  reason?: string;

  /** When dependency was added (Unix milliseconds) */
  addedAt?: number;

  /** Who added the dependency */
  addedBy?: string;
}

/**
 * Node in the dependency graph.
 */
export interface SpecNode {
  /** Spec identifier */
  specId: string;

  /** Current status of the spec */
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';

  /** Optional metadata */
  metadata?: SpecNodeMetadata;
}

/**
 * Metadata for a spec node.
 */
export interface SpecNodeMetadata {
  /** Spec title */
  title?: string;

  /** Creation timestamp */
  createdAt?: number;

  /** Last modification timestamp */
  modifiedAt?: number;
}

// ============================================================================
// Graph Storage
// ============================================================================

/**
 * Serializable format for dependency graph storage.
 */
export interface DependencyGraphData {
  /** Schema version for migrations */
  version: number;

  /** Last modification timestamp */
  lastModified: number;

  /** Map of spec ID to node data */
  nodes: Record<string, SpecNode>;

  /** Array of dependency edges */
  edges: SpecDependency[];
}

// ============================================================================
// Impact Analysis
// ============================================================================

/**
 * Result of impact analysis for a spec.
 */
export interface ImpactReport {
  /** Spec being analyzed */
  specId: string;

  /** Direct dependents (specs that directly depend on this one) */
  directDependents: string[];

  /** Transitive dependents (specs that indirectly depend on this one) */
  transitiveDependents: string[];

  /** Direct dependencies (specs this one directly depends on) */
  directDependencies: string[];

  /** Transitive dependencies (specs this one indirectly depends on) */
  transitiveDependencies: string[];

  /** Files potentially affected (if available) */
  affectedFiles?: string[];

  /** APIs potentially affected (if available) */
  affectedAPIs?: string[];

  /** Total impact score (0-100, higher = more impact) */
  impactScore: number;
}

/**
 * Cycle detected in dependency graph.
 */
export interface DependencyCycle {
  /** Array of spec IDs forming the cycle */
  path: string[];

  /** Human-readable description */
  description: string;
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * DependencyGraph service interface.
 *
 * Provides graph operations for managing spec relationships.
 * Enforces acyclic constraint and provides analysis tools.
 */
export interface DependencyGraph {
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
  ): void;

  /**
   * Remove a dependency between two specs.
   *
   * @param from - Dependent spec ID
   * @param to - Dependency spec ID
   */
  removeDependency(from: string, to: string): void;

  /**
   * Add a spec node to the graph.
   *
   * @param specId - Spec identifier
   * @param metadata - Optional metadata
   */
  addSpec(specId: string, metadata?: SpecNodeMetadata): void;

  /**
   * Remove a spec from the graph.
   * Also removes all associated dependency edges.
   *
   * @param specId - Spec identifier
   */
  removeSpec(specId: string): void;

  /**
   * Get direct dependents of a spec.
   *
   * @param specId - Spec identifier
   * @returns Array of spec IDs that depend on this spec
   */
  getDependents(specId: string): string[];

  /**
   * Get direct dependencies of a spec.
   *
   * @param specId - Spec identifier
   * @returns Array of spec IDs this spec depends on
   */
  getDependencies(specId: string): string[];

  /**
   * Detect cycles in the graph.
   *
   * @returns Array of cycles (each cycle is array of spec IDs), or null if no cycles
   */
  detectCycles(): DependencyCycle[] | null;

  /**
   * Get topologically sorted execution order for specs.
   *
   * @param specIds - Array of spec IDs to sort (if empty, sorts all specs)
   * @returns Linearized order respecting all dependencies
   * @throws Error if cycles exist
   */
  getExecutionOrder(specIds?: string[]): string[];

  /**
   * Generate impact report for a spec.
   *
   * @param specId - Spec identifier
   * @returns Detailed impact analysis
   */
  getImpactReport(specId: string): ImpactReport;

  /**
   * Check if a dependency would create a cycle.
   *
   * @param from - Dependent spec ID
   * @param to - Dependency spec ID
   * @returns True if adding this dependency would create a cycle
   */
  wouldCreateCycle(from: string, to: string): boolean;

  /**
   * Get all specs in the graph.
   *
   * @returns Array of all spec IDs
   */
  getAllSpecs(): string[];

  /**
   * Get dependency edge between two specs.
   *
   * @param from - Dependent spec ID
   * @param to - Dependency spec ID
   * @returns SpecDependency if exists, undefined otherwise
   */
  getDependency(from: string, to: string): SpecDependency | undefined;

  /**
   * Check if a dependency exists.
   *
   * @param from - Dependent spec ID
   * @param to - Dependency spec ID
   * @returns True if dependency exists
   */
  hasDependency(from: string, to: string): boolean;

  /**
   * Update spec status.
   *
   * @param specId - Spec identifier
   * @param status - New status
   */
  updateStatus(specId: string, status: SpecNode['status']): void;

  /**
   * Get spec node data.
   *
   * @param specId - Spec identifier
   * @returns SpecNode if exists, undefined otherwise
   */
  getSpec(specId: string): SpecNode | undefined;

  /**
   * Validate graph integrity.
   *
   * Checks for orphaned edges, cycles, and other inconsistencies.
   *
   * @returns Validation result
   */
  validate(): DependencyGraphValidation;

  /**
   * Save graph to file.
   *
   * @param filePath - Path to save file (defaults to .specify/memory/dependency-graph.json)
   */
  save(filePath?: string): Promise<void>;

  /**
   * Export graph data for serialization.
   *
   * @returns Serializable graph data
   */
  export(): DependencyGraphData;

  /**
   * Import graph data.
   *
   * @param data - Graph data to import
   */
  import(data: DependencyGraphData): void;

  /**
   * Get underlying graphlib Graph instance.
   *
   * @returns graphlib Graph object (for advanced operations)
   */
  getGraph(): Graph;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Result of dependency graph validation.
 */
export interface DependencyGraphValidation {
  /** Whether graph is valid */
  valid: boolean;

  /** Array of errors (blocking issues) */
  errors: string[];

  /** Array of warnings (non-blocking issues) */
  warnings: string[];

  /** Detected cycles */
  cycles: DependencyCycle[];

  /** Orphaned edges (reference non-existent nodes) */
  orphanedEdges: SpecDependency[];
}

// ============================================================================
// Query & Filter
// ============================================================================

/**
 * Options for filtering dependencies.
 */
export interface DependencyFilterOptions {
  /** Filter by dependency type */
  type?: 'required_by' | 'uses_api_from' | 'blocks';

  /** Filter by declared status */
  declared?: boolean;

  /** Filter by spec status */
  status?: SpecNode['status'];

  /** Include transitive dependencies */
  includeTransitive?: boolean;
}

/**
 * Result of dependency query.
 */
export interface DependencyQueryResult {
  /** Matching dependencies */
  dependencies: SpecDependency[];

  /** Count of matches */
  count: number;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Events emitted by DependencyGraph.
 */
export interface DependencyGraphEvents {
  /** Emitted when a dependency is added */
  onDependencyAdded: (dependency: SpecDependency) => void;

  /** Emitted when a dependency is removed */
  onDependencyRemoved: (from: string, to: string) => void;

  /** Emitted when a spec is added */
  onSpecAdded: (specId: string) => void;

  /** Emitted when a spec is removed */
  onSpecRemoved: (specId: string) => void;

  /** Emitted when spec status changes */
  onStatusChanged: (specId: string, newStatus: SpecNode['status']) => void;

  /** Emitted when cycle is detected */
  onCycleDetected: (cycle: DependencyCycle) => void;

  /** Emitted when graph is saved */
  onGraphSaved: (filePath: string) => void;
}
