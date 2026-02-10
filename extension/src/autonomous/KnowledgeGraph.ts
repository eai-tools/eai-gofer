/**
 * Code Entity Knowledge Graph
 *
 * Tracks relationships between code entities (files, classes, functions,
 * patterns, decisions) using graphlib. Enables multi-step reasoning about
 * the codebase — "what files implement auth?" returns a connected subgraph,
 * not keyword-matched strings.
 *
 * Inspired by Graphiti (Zep) for temporal awareness and FalkorDB for
 * graph-based agent memory. Uses graphlib (already a dependency) for the
 * initial implementation with migration path to TinyGraphDB/Kùzu if needed.
 *
 * @see spec.md US8: Entity Knowledge Graph
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Graph, json as graphJson } from 'graphlib';

// ============================================================================
// Types
// ============================================================================

export type NodeType = 'file' | 'class' | 'function' | 'pattern' | 'decision';

export type EdgeType =
  | 'calls'
  | 'imports'
  | 'extends'
  | 'implements'
  | 'uses_pattern'
  | 'decided_by'
  | 'modified_in';

export interface GraphNode {
  type: NodeType;
  name: string;
  path?: string;
  lastSeen: number;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  type: EdgeType;
  weight: number;
  lastSeen: number;
}

export interface SubgraphResult {
  nodes: Array<{ id: string; data: GraphNode }>;
  edges: Array<{ source: string; target: string; data: GraphEdge }>;
}

// ============================================================================
// Constants
// ============================================================================

const GRAPH_FILENAME = 'knowledge-graph.json';
const MAX_NODES = 5000;
const MAX_EDGES = 20000;
const DEFAULT_BFS_DEPTH = 2;

// ============================================================================
// KnowledgeGraph Class
// ============================================================================

export class KnowledgeGraph {
  private graph: Graph;
  private readonly graphPath: string;
  private dirty = false;

  constructor(workspaceRoot: string) {
    this.graphPath = path.join(workspaceRoot, '.specify', 'memory', GRAPH_FILENAME);
    this.graph = new Graph({ directed: true, multigraph: false });
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Load graph from disk, or start with an empty graph.
   */
  async initialize(): Promise<void> {
    try {
      const content = await fs.readFile(this.graphPath, 'utf-8');
      const serialized = JSON.parse(content);
      this.graph = graphJson.read(serialized);
      console.log(
        `[KnowledgeGraph] Loaded: ${this.graph.nodeCount()} nodes, ${this.graph.edgeCount()} edges`
      );
    } catch {
      this.graph = new Graph({ directed: true, multigraph: false });
      console.log('[KnowledgeGraph] Starting with empty graph');
    }
  }

  /**
   * T049: Get basic graph statistics.
   */
  getStats(): { nodeCount: number; edgeCount: number } {
    return {
      nodeCount: this.graph.nodeCount(),
      edgeCount: this.graph.edgeCount(),
    };
  }

  /**
   * Persist graph to disk.
   */
  async save(): Promise<void> {
    if (!this.dirty) return;

    const dir = path.dirname(this.graphPath);
    await fs.mkdir(dir, { recursive: true });

    const serialized = graphJson.write(this.graph);
    const tempPath = this.graphPath + '.tmp';
    await fs.writeFile(tempPath, JSON.stringify(serialized, null, 2), 'utf-8');
    await fs.rename(tempPath, this.graphPath);

    this.dirty = false;
    console.log(
      `[KnowledgeGraph] Saved: ${this.graph.nodeCount()} nodes, ${this.graph.edgeCount()} edges`
    );
  }

  // --------------------------------------------------------------------------
  // Node Operations
  // --------------------------------------------------------------------------

  /**
   * Add or update a node in the graph.
   * If the node already exists, update lastSeen and merge metadata.
   */
  addNode(id: string, data: GraphNode): void {
    this.evictIfNeeded();

    const existing = this.graph.node(id) as GraphNode | undefined;
    if (existing) {
      // Merge: update lastSeen and metadata
      this.graph.setNode(id, {
        ...existing,
        ...data,
        lastSeen: Date.now(),
        metadata: { ...existing.metadata, ...data.metadata },
      });
    } else {
      this.graph.setNode(id, { ...data, lastSeen: Date.now() });
    }

    this.dirty = true;
  }

  /**
   * Get a node by ID.
   */
  getNode(id: string): GraphNode | undefined {
    return this.graph.node(id) as GraphNode | undefined;
  }

  /**
   * Remove a node and all its edges.
   */
  removeNode(id: string): void {
    if (this.graph.hasNode(id)) {
      this.graph.removeNode(id);
      this.dirty = true;
    }
  }

  // --------------------------------------------------------------------------
  // Edge Operations
  // --------------------------------------------------------------------------

  /**
   * Add or strengthen an edge between two nodes.
   * If the edge exists, increment weight. Otherwise create with weight 1.
   */
  addEdge(source: string, target: string, type: EdgeType): void {
    if (!this.graph.hasNode(source) || !this.graph.hasNode(target)) {
      return; // Both nodes must exist
    }

    if (this.graph.edgeCount() >= MAX_EDGES && !this.graph.hasEdge(source, target)) {
      return; // Edge limit reached, only strengthen existing edges
    }

    const existing = this.graph.edge(source, target) as GraphEdge | undefined;
    if (existing) {
      this.graph.setEdge(source, target, {
        ...existing,
        type: existing.type === type ? type : existing.type, // Don't change type
        weight: existing.weight + 1,
        lastSeen: Date.now(),
      });
    } else {
      this.graph.setEdge(source, target, {
        type,
        weight: 1,
        lastSeen: Date.now(),
      });
    }

    this.dirty = true;
  }

  // --------------------------------------------------------------------------
  // Query Operations
  // --------------------------------------------------------------------------

  /**
   * Depth-limited BFS from a starting node. Returns connected subgraph.
   */
  querySubgraph(startNodeId: string, maxDepth: number = DEFAULT_BFS_DEPTH): SubgraphResult {
    const result: SubgraphResult = { nodes: [], edges: [] };
    if (!this.graph.hasNode(startNodeId)) return result;

    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: startNodeId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const nodeData = this.graph.node(id) as GraphNode;
      if (nodeData) {
        result.nodes.push({ id, data: nodeData });
      }

      if (depth >= maxDepth) continue;

      // Follow outgoing edges
      const successors = this.graph.successors(id);
      if (successors) {
        for (const succ of successors) {
          const edgeData = this.graph.edge(id, succ) as GraphEdge;
          if (edgeData) {
            result.edges.push({ source: id, target: succ, data: edgeData });
          }
          if (!visited.has(succ)) {
            queue.push({ id: succ, depth: depth + 1 });
          }
        }
      }

      // Follow incoming edges
      const predecessors = this.graph.predecessors(id);
      if (predecessors) {
        for (const pred of predecessors) {
          const edgeData = this.graph.edge(pred, id) as GraphEdge;
          if (edgeData) {
            result.edges.push({ source: pred, target: id, data: edgeData });
          }
          if (!visited.has(pred)) {
            queue.push({ id: pred, depth: depth + 1 });
          }
        }
      }
    }

    return result;
  }

  /**
   * Search for nodes by name (substring match, case-insensitive).
   */
  searchNodes(query: string, nodeType?: NodeType): Array<{ id: string; data: GraphNode }> {
    const lowerQuery = query.toLowerCase();
    const results: Array<{ id: string; data: GraphNode }> = [];

    for (const id of this.graph.nodes()) {
      const data = this.graph.node(id) as GraphNode;
      if (!data) continue;

      if (nodeType && data.type !== nodeType) continue;

      if (data.name.toLowerCase().includes(lowerQuery) || id.toLowerCase().includes(lowerQuery)) {
        results.push({ id, data });
      }
    }

    return results;
  }

  /**
   * Get graph statistics.
   */
  stats(): { nodeCount: number; edgeCount: number; nodeTypes: Record<string, number> } {
    const nodeTypes: Record<string, number> = {};
    for (const id of this.graph.nodes()) {
      const data = this.graph.node(id) as GraphNode;
      if (data?.type) {
        nodeTypes[data.type] = (nodeTypes[data.type] || 0) + 1;
      }
    }
    return {
      nodeCount: this.graph.nodeCount(),
      edgeCount: this.graph.edgeCount(),
      nodeTypes,
    };
  }

  // --------------------------------------------------------------------------
  // Convenience: Entity Extraction Helpers
  // --------------------------------------------------------------------------

  /**
   * Record that a file was accessed during a session.
   */
  recordFileAccess(filePath: string): void {
    const id = `file:${filePath}`;
    const name = path.basename(filePath);
    this.addNode(id, { type: 'file', name, path: filePath, lastSeen: Date.now() });
  }

  /**
   * Record a pattern discovery.
   */
  recordPattern(patternName: string, files: string[]): void {
    const patternId = `pattern:${patternName.toLowerCase().replace(/\s+/g, '-')}`;
    this.addNode(patternId, { type: 'pattern', name: patternName, lastSeen: Date.now() });

    for (const filePath of files) {
      const fileId = `file:${filePath}`;
      this.recordFileAccess(filePath);
      this.addEdge(fileId, patternId, 'uses_pattern');
    }
  }

  /**
   * Record a decision and the files it affects.
   */
  recordDecision(decisionName: string, files: string[]): void {
    const decisionId = `decision:${decisionName.toLowerCase().replace(/\s+/g, '-')}`;
    this.addNode(decisionId, { type: 'decision', name: decisionName, lastSeen: Date.now() });

    for (const filePath of files) {
      const fileId = `file:${filePath}`;
      this.recordFileAccess(filePath);
      this.addEdge(fileId, decisionId, 'decided_by');
    }
  }

  /**
   * Record that one file imports another.
   */
  recordImport(sourceFile: string, targetFile: string): void {
    const sourceId = `file:${sourceFile}`;
    const targetId = `file:${targetFile}`;
    this.recordFileAccess(sourceFile);
    this.recordFileAccess(targetFile);
    this.addEdge(sourceId, targetId, 'imports');
  }

  // --------------------------------------------------------------------------
  // 018 T058: AST-aware import extraction
  // --------------------------------------------------------------------------

  /**
   * Extract and record import relationships from file content.
   * Parses import/require statements for TypeScript/JavaScript files.
   */
  extractImportsFromContent(filePath: string, content: string): void {
    const importPatterns = [
      // ES6: import { foo } from './bar'
      /import\s+(?:(?:\{[^}]*\}|[\w*]+)\s+from\s+)?['"]([^'"]+)['"]/g,
      // CommonJS: require('./bar')
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      // Dynamic import: import('./bar')
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];

    for (const pattern of importPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath) {
          this.recordImport(filePath, importPath);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 018 T059: Entity deduplication
  // --------------------------------------------------------------------------

  /**
   * Deduplicate graph nodes that represent the same entity.
   * Merges nodes with matching names but different IDs (e.g., file:./foo and file:foo).
   */
  deduplicateEntities(): number {
    const nodesByName = new Map<string, string[]>();

    for (const id of this.graph.nodes()) {
      const data = this.graph.node(id) as GraphNode;
      if (!data) continue;
      const key = `${data.type}:${data.name}`;
      const existing = nodesByName.get(key) || [];
      existing.push(id);
      nodesByName.set(key, existing);
    }

    let mergedCount = 0;
    for (const [, ids] of nodesByName) {
      if (ids.length <= 1) continue;

      // Keep the node with the most recent lastSeen
      const sorted = ids.map(id => ({
        id,
        data: this.graph.node(id) as GraphNode,
      })).sort((a, b) => (b.data?.lastSeen ?? 0) - (a.data?.lastSeen ?? 0));

      const primary = sorted[0].id;

      // Merge edges from duplicates into primary
      for (let i = 1; i < sorted.length; i++) {
        const dupId = sorted[i].id;
        // Redirect inbound edges
        for (const edge of this.graph.inEdges(dupId) || []) {
          const edgeData = this.graph.edge(edge.v, edge.w) as GraphEdge;
          if (!this.graph.hasEdge(edge.v, primary)) {
            this.graph.setEdge(edge.v, primary, edgeData);
          }
        }
        // Redirect outbound edges
        for (const edge of this.graph.outEdges(dupId) || []) {
          const edgeData = this.graph.edge(edge.v, edge.w) as GraphEdge;
          if (!this.graph.hasEdge(primary, edge.w)) {
            this.graph.setEdge(primary, edge.w, edgeData);
          }
        }
        this.graph.removeNode(dupId);
        mergedCount++;
      }
    }

    if (mergedCount > 0) {
      this.dirty = true;
    }
    return mergedCount;
  }

  // --------------------------------------------------------------------------
  // LRU Eviction
  // --------------------------------------------------------------------------

  /**
   * Evict least-recently-used nodes when the graph exceeds MAX_NODES.
   */
  private evictIfNeeded(): void {
    if (this.graph.nodeCount() < MAX_NODES) return;

    // Collect all nodes with lastSeen
    const nodes: Array<{ id: string; lastSeen: number }> = [];
    for (const id of this.graph.nodes()) {
      const data = this.graph.node(id) as GraphNode;
      nodes.push({ id, lastSeen: data?.lastSeen ?? 0 });
    }

    // Sort by lastSeen ascending (oldest first)
    nodes.sort((a, b) => a.lastSeen - b.lastSeen);

    // Evict oldest 10%
    const evictCount = Math.ceil(MAX_NODES * 0.1);
    for (let i = 0; i < evictCount && i < nodes.length; i++) {
      this.graph.removeNode(nodes[i].id);
    }

    this.dirty = true;
    console.log(`[KnowledgeGraph] Evicted ${evictCount} LRU nodes`);
  }
}
