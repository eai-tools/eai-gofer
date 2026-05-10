import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  KnowledgeGraph,
  type GraphNode,
  type NodeType,
  type EdgeType,
} from '../../../extension/src/autonomous/KnowledgeGraph';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('KnowledgeGraph', () => {
  let graph: KnowledgeGraph;
  const mockWorkspace = '/test/workspace';

  beforeEach(() => {
    graph = new KnowledgeGraph(mockWorkspace);
    vi.clearAllMocks();

    // Default: no existing graph file
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);
  });

  describe('initialize', () => {
    it('should start with empty graph when no file exists', async () => {
      await graph.initialize();
      const stats = graph.stats();
      expect(stats.nodeCount).toBe(0);
      expect(stats.edgeCount).toBe(0);
    });

    it('should load graph from disk when file exists', async () => {
      // graphlib JSON format
      const serialized = {
        options: { directed: true, multigraph: false, compound: false },
        nodes: [
          { v: 'file:src/auth.ts', value: { type: 'file', name: 'auth.ts', lastSeen: 1000 } },
          {
            v: 'pattern:singleton',
            value: { type: 'pattern', name: 'Singleton', lastSeen: 1000 },
          },
        ],
        edges: [
          {
            v: 'file:src/auth.ts',
            w: 'pattern:singleton',
            value: { type: 'uses_pattern', weight: 1, lastSeen: 1000 },
          },
        ],
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(serialized));
      await graph.initialize();

      const stats = graph.stats();
      expect(stats.nodeCount).toBe(2);
      expect(stats.edgeCount).toBe(1);
    });
  });

  describe('addNode', () => {
    it('should add a new node', async () => {
      await graph.initialize();
      graph.addNode('file:src/index.ts', {
        type: 'file',
        name: 'index.ts',
        path: 'src/index.ts',
        lastSeen: Date.now(),
      });

      const node = graph.getNode('file:src/index.ts');
      expect(node).toBeTruthy();
      expect(node?.name).toBe('index.ts');
      expect(node?.type).toBe('file');
    });

    it('should update existing node and merge metadata', async () => {
      await graph.initialize();
      graph.addNode('file:src/x.ts', {
        type: 'file',
        name: 'x.ts',
        lastSeen: 1000,
        metadata: { imports: 3 },
      });
      graph.addNode('file:src/x.ts', {
        type: 'file',
        name: 'x.ts',
        lastSeen: 2000,
        metadata: { exports: 5 },
      });

      const node = graph.getNode('file:src/x.ts');
      expect(node?.metadata?.imports).toBe(3);
      expect(node?.metadata?.exports).toBe(5);
    });
  });

  describe('addEdge', () => {
    it('should add edge between existing nodes', async () => {
      await graph.initialize();
      graph.addNode('file:a.ts', { type: 'file', name: 'a.ts', lastSeen: 1 });
      graph.addNode('file:b.ts', { type: 'file', name: 'b.ts', lastSeen: 1 });
      graph.addEdge('file:a.ts', 'file:b.ts', 'imports');

      expect(graph.stats().edgeCount).toBe(1);
    });

    it('should strengthen existing edge weight', async () => {
      await graph.initialize();
      graph.addNode('file:a.ts', { type: 'file', name: 'a.ts', lastSeen: 1 });
      graph.addNode('file:b.ts', { type: 'file', name: 'b.ts', lastSeen: 1 });
      graph.addEdge('file:a.ts', 'file:b.ts', 'imports');
      graph.addEdge('file:a.ts', 'file:b.ts', 'imports');

      // Edge count should still be 1 (strengthened, not duplicated)
      expect(graph.stats().edgeCount).toBe(1);
    });

    it('should not add edge if nodes do not exist', async () => {
      await graph.initialize();
      graph.addEdge('nonexistent1', 'nonexistent2', 'calls');
      expect(graph.stats().edgeCount).toBe(0);
    });
  });

  describe('removeNode', () => {
    it('should remove node and its edges', async () => {
      await graph.initialize();
      graph.addNode('file:a.ts', { type: 'file', name: 'a.ts', lastSeen: 1 });
      graph.addNode('file:b.ts', { type: 'file', name: 'b.ts', lastSeen: 1 });
      graph.addEdge('file:a.ts', 'file:b.ts', 'imports');

      graph.removeNode('file:a.ts');

      expect(graph.getNode('file:a.ts')).toBeUndefined();
      expect(graph.stats().nodeCount).toBe(1);
      expect(graph.stats().edgeCount).toBe(0);
    });
  });

  describe('querySubgraph', () => {
    it('should return connected subgraph via BFS', async () => {
      await graph.initialize();
      graph.addNode('file:a.ts', { type: 'file', name: 'a.ts', lastSeen: 1 });
      graph.addNode('file:b.ts', { type: 'file', name: 'b.ts', lastSeen: 1 });
      graph.addNode('file:c.ts', { type: 'file', name: 'c.ts', lastSeen: 1 });
      graph.addNode('file:d.ts', { type: 'file', name: 'd.ts', lastSeen: 1 });

      graph.addEdge('file:a.ts', 'file:b.ts', 'imports');
      graph.addEdge('file:b.ts', 'file:c.ts', 'imports');
      graph.addEdge('file:c.ts', 'file:d.ts', 'imports'); // depth 3

      // BFS from a with depth 2 should find a, b, c but NOT d
      const result = graph.querySubgraph('file:a.ts', 2);
      expect(result.nodes.length).toBe(3);
      expect(result.nodes.map((n) => n.id)).toContain('file:a.ts');
      expect(result.nodes.map((n) => n.id)).toContain('file:b.ts');
      expect(result.nodes.map((n) => n.id)).toContain('file:c.ts');
    });

    it('should return empty result for nonexistent start node', async () => {
      await graph.initialize();
      const result = graph.querySubgraph('nonexistent');
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });
  });

  describe('searchNodes', () => {
    it('should find nodes by substring match', async () => {
      await graph.initialize();
      graph.addNode('file:src/auth.ts', { type: 'file', name: 'auth.ts', lastSeen: 1 });
      graph.addNode('file:src/user.ts', { type: 'file', name: 'user.ts', lastSeen: 1 });
      graph.addNode('pattern:auth-pattern', {
        type: 'pattern',
        name: 'Auth Pattern',
        lastSeen: 1,
      });

      const results = graph.searchNodes('auth');
      expect(results.length).toBe(2);
    });

    it('should filter by node type', async () => {
      await graph.initialize();
      graph.addNode('file:src/auth.ts', { type: 'file', name: 'auth.ts', lastSeen: 1 });
      graph.addNode('pattern:auth-flow', {
        type: 'pattern',
        name: 'Auth Flow',
        lastSeen: 1,
      });

      const results = graph.searchNodes('auth', 'pattern');
      expect(results.length).toBe(1);
      expect(results[0].data.type).toBe('pattern');
    });
  });

  describe('convenience methods', () => {
    it('should record file access', async () => {
      await graph.initialize();
      graph.recordFileAccess('src/index.ts');

      const node = graph.getNode('file:src/index.ts');
      expect(node).toBeTruthy();
      expect(node?.type).toBe('file');
      expect(node?.name).toBe('index.ts');
    });

    it('should record pattern with file connections', async () => {
      await graph.initialize();
      graph.recordPattern('Singleton', ['src/a.ts', 'src/b.ts']);

      const stats = graph.stats();
      expect(stats.nodeCount).toBe(3); // pattern + 2 files
      expect(stats.edgeCount).toBe(2); // 2 uses_pattern edges
    });

    it('should record decision with file connections', async () => {
      await graph.initialize();
      graph.recordDecision('Use JSONL storage', ['src/storage.ts']);

      const node = graph.getNode('decision:use-jsonl-storage');
      expect(node).toBeTruthy();
      expect(node?.type).toBe('decision');
    });

    it('should record import relationship', async () => {
      await graph.initialize();
      graph.recordImport('src/a.ts', 'src/b.ts');

      expect(graph.stats().nodeCount).toBe(2);
      expect(graph.stats().edgeCount).toBe(1);
    });
  });

  describe('save', () => {
    it('should persist graph to disk when dirty', async () => {
      await graph.initialize();
      graph.addNode('file:test.ts', { type: 'file', name: 'test.ts', lastSeen: 1 });
      await graph.save();

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.any(String),
        'utf-8'
      );
      expect(fs.rename).toHaveBeenCalled();
    });

    it('should not save when graph is clean', async () => {
      await graph.initialize();
      await graph.save();

      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('stats', () => {
    it('should return node type breakdown', async () => {
      await graph.initialize();
      graph.addNode('file:a.ts', { type: 'file', name: 'a.ts', lastSeen: 1 });
      graph.addNode('file:b.ts', { type: 'file', name: 'b.ts', lastSeen: 1 });
      graph.addNode('pattern:p1', { type: 'pattern', name: 'P1', lastSeen: 1 });

      const stats = graph.stats();
      expect(stats.nodeTypes.file).toBe(2);
      expect(stats.nodeTypes.pattern).toBe(1);
    });
  });
});
