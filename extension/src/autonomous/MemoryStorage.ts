/**
 * JSONL-based Memory Storage Backend
 *
 * Replaces the local.json full-rewrite approach with append-only JSONL writes.
 * Uses an in-memory index for fast queries, rebuilt from JSONL on startup.
 *
 * Design inspired by Beads (Steve Yegge): JSONL as source of truth,
 * in-memory index for speed, git-friendly append-only format.
 *
 * @see spec.md US3: Structured Memory Storage
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import type { Memory, MemoryType, MemoryQuery, StoredMemories } from './memory';

// ============================================================================
// Constants
// ============================================================================

const JSONL_FILENAME = 'memories.jsonl';
const ARCHIVE_FILENAME = 'archive.jsonl';
const LEGACY_FILENAME = 'local.json';
const MAX_JSONL_SIZE_BYTES = 8 * 1024 * 1024; // 8MB triggers compaction warning

// ============================================================================
// Types
// ============================================================================

/** In-memory index entry for fast lookups */
interface IndexEntry {
  id: string;
  type?: MemoryType;
  category: string;
  tags: string[];
  scope: 'local' | 'global';
  content: string;
  priorityIndex: number;
  usedCount: number;
  created: number;
  lastUsed: number;
  stale: boolean;
  agentId?: string;
  /** Full memory object reference */
  memory: Memory;
}

// ============================================================================
// MemoryStorage Class
// ============================================================================

export class MemoryStorage {
  private readonly jsonlPath: string;
  private readonly archivePath: string;
  private readonly legacyPath: string;
  private readonly memoryDir: string;

  /** In-memory index: id -> IndexEntry */
  private index: Map<string, IndexEntry> = new Map();

  /** Whether the index has been loaded from disk */
  private initialized = false;

  constructor(workspaceRoot: string) {
    this.memoryDir = path.join(workspaceRoot, '.specify', 'memory');
    this.jsonlPath = path.join(this.memoryDir, JSONL_FILENAME);
    this.archivePath = path.join(this.memoryDir, ARCHIVE_FILENAME);
    this.legacyPath = path.join(this.memoryDir, LEGACY_FILENAME);
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Initialize storage: migrate from legacy if needed, build index from JSONL.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await fs.mkdir(this.memoryDir, { recursive: true });

    // Check if JSONL exists
    const jsonlExists = await this.fileExists(this.jsonlPath);

    if (!jsonlExists) {
      // Try migrating from legacy local.json
      await this.migrateFromLegacy();
    }

    // Build index from JSONL
    await this.rebuildIndex();
    this.initialized = true;
  }

  /**
   * Migrate memories from legacy local.json to JSONL format.
   */
  private async migrateFromLegacy(): Promise<void> {
    try {
      const content = await fs.readFile(this.legacyPath, 'utf-8');
      const parsed = JSON.parse(content);

      let memories: Memory[] = [];
      if (Array.isArray(parsed)) {
        memories = parsed;
      } else if (parsed && Array.isArray(parsed.memories)) {
        memories = (parsed as StoredMemories).memories;
      }

      if (memories.length === 0) return;

      // Write each memory as a JSONL line
      const lines = memories.map((m) => JSON.stringify(m)).join('\n') + '\n';
      await fs.writeFile(this.jsonlPath, lines, 'utf-8');

      console.log(`[MemoryStorage] Migrated ${memories.length} memories from local.json to JSONL`);
    } catch {
      // No legacy file or parse error — start fresh
    }
  }

  /**
   * Rebuild the in-memory index by reading the entire JSONL file.
   * Last-writer-wins for duplicate IDs (handles updates).
   */
  async rebuildIndex(): Promise<void> {
    this.index.clear();

    try {
      const content = await fs.readFile(this.jsonlPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim().length > 0);

      for (const line of lines) {
        try {
          const record = JSON.parse(line) as Record<string, unknown>;
          if (!record.id) continue;

          // Handle tombstone records (deleted memories)
          if (record._deleted) {
            this.index.delete(record.id as string);
            continue;
          }

          this.indexMemory(record as unknown as Memory);
        } catch {
          // Skip invalid lines — don't crash on corruption
          console.warn('[MemoryStorage] Skipping invalid JSONL line');
        }
      }
    } catch {
      // File doesn't exist yet — empty index is fine
    }
  }

  /**
   * Add or update a memory in the in-memory index.
   */
  private indexMemory(memory: Memory): void {
    this.index.set(memory.id, {
      id: memory.id,
      type: memory.type,
      category: memory.category,
      tags: memory.tags || [],
      scope: memory.scope,
      content: memory.content,
      priorityIndex: memory.priorityIndex ?? 0,
      usedCount: memory.usedCount ?? 0,
      created: memory.created,
      lastUsed: memory.lastUsed,
      stale: memory.stale ?? false,
      agentId: memory.agentId,
      memory,
    });
  }

  // --------------------------------------------------------------------------
  // Write Operations
  // --------------------------------------------------------------------------

  /**
   * Append a memory to the JSONL file and update the index.
   * Returns the memory with a generated hash-based ID.
   */
  async append(memory: Omit<Memory, 'id' | 'created'>): Promise<Memory> {
    await this.ensureInitialized();

    const now = Date.now();
    const id = this.generateId(memory.content, now);

    const fullMemory: Memory = {
      ...memory,
      id,
      created: now,
      lastUsed: memory.lastUsed || now,
      usedCount: memory.usedCount ?? 0,
    };

    // Append to JSONL (atomic for small payloads on POSIX)
    const line = JSON.stringify(fullMemory) + '\n';
    await fs.appendFile(this.jsonlPath, line, 'utf-8');

    // Update index
    this.indexMemory(fullMemory);

    return fullMemory;
  }

  /**
   * Update a memory by appending a new version (last-writer-wins).
   */
  async update(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    await this.ensureInitialized();

    const existing = this.index.get(id);
    if (!existing) return null;

    const updated: Memory = {
      ...existing.memory,
      ...updates,
      id, // Preserve original ID
    };

    // Append updated version to JSONL
    const line = JSON.stringify(updated) + '\n';
    await fs.appendFile(this.jsonlPath, line, 'utf-8');

    // Update index
    this.indexMemory(updated);

    return updated;
  }

  /**
   * Mark a memory as deleted by appending a tombstone.
   */
  async remove(id: string): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.index.has(id)) return false;

    // Append tombstone
    const tombstone = JSON.stringify({ id, _deleted: true }) + '\n';
    await fs.appendFile(this.jsonlPath, tombstone, 'utf-8');

    // Remove from index
    this.index.delete(id);

    return true;
  }

  // --------------------------------------------------------------------------
  // Read Operations
  // --------------------------------------------------------------------------

  /**
   * Get a memory by ID.
   */
  get(id: string): Memory | null {
    const entry = this.index.get(id);
    return entry ? entry.memory : null;
  }

  /**
   * 018 T031: Get a memory with full content restored from markdown note if truncated.
   */
  async getWithFullContent(id: string): Promise<Memory | null> {
    const memory = this.get(id);
    if (!memory) return null;

    // If memory has a notePath and content looks truncated, read from markdown
    if (memory.notePath && memory.content.endsWith('[see markdown note]')) {
      const notePath = path.join(this.memoryDir, memory.notePath);
      try {
        const mdContent = await fs.readFile(notePath, 'utf-8');
        // Strip YAML frontmatter if present
        const frontmatterEnd = mdContent.indexOf('---', 4);
        const content = frontmatterEnd > 0 ? mdContent.slice(frontmatterEnd + 4).trim() : mdContent;
        return { ...memory, content };
      } catch {
        // Markdown file missing, return JSONL version
        return memory;
      }
    }
    return memory;
  }

  /**
   * Query memories with filters. Returns matching memories sorted by priority.
   */
  query(query: MemoryQuery): Memory[] {
    let results = Array.from(this.index.values());

    // Filter by type
    if (query.type) {
      results = results.filter((e) => e.type === query.type);
    }

    // Filter by scope
    if (query.scope && query.scope !== 'both') {
      results = results.filter((e) => e.scope === query.scope);
    }

    // Filter by category
    if (query.category) {
      results = results.filter((e) => e.category === query.category);
    }

    // Filter by tags (OR logic)
    if (query.tags && query.tags.length > 0) {
      const queryTags = new Set(query.tags);
      results = results.filter((e) => e.tags.some((t) => queryTags.has(t)));
    }

    // Filter by keywords
    if (query.keywords) {
      const keywords = query.keywords.toLowerCase().split(/\s+/);
      results = results.filter((e) => {
        const text = (e.content + ' ' + e.category + ' ' + e.tags.join(' ')).toLowerCase();
        return keywords.some((kw) => text.includes(kw));
      });
    }

    // Filter by agent ID
    if (query.agentId) {
      results = results.filter((e) => e.agentId === query.agentId);
    }

    // Exclude stale
    if (query.excludeStale) {
      results = results.filter((e) => !e.stale);
    }

    // Filter by date range
    if (query.dateRange) {
      results = results.filter(
        (e) => e.created >= query.dateRange!.start && e.created <= query.dateRange!.end
      );
    }

    // Sort by priority index (descending)
    if (query.sortByPriority) {
      results.sort((a, b) => b.priorityIndex - a.priorityIndex);
    }

    return results.map((e) => e.memory);
  }

  /**
   * Get all memories (optionally filtered by scope).
   */
  getAll(scope?: 'local' | 'global' | 'both'): Memory[] {
    let entries = Array.from(this.index.values());
    if (scope && scope !== 'both') {
      entries = entries.filter((e) => e.scope === scope);
    }
    return entries.map((e) => e.memory);
  }

  /**
   * Get the count of memories in the index.
   */
  count(): number {
    return this.index.size;
  }

  // --------------------------------------------------------------------------
  // Archive & Compaction
  // --------------------------------------------------------------------------

  /**
   * Archive memories by moving them from the active JSONL to archive.
   */
  async archive(ids: string[]): Promise<number> {
    await this.ensureInitialized();

    const toArchive: Memory[] = [];
    for (const id of ids) {
      const entry = this.index.get(id);
      if (entry) {
        toArchive.push(entry.memory);
        this.index.delete(id);
      }
    }

    if (toArchive.length === 0) return 0;

    // Append to archive JSONL
    const lines = toArchive.map((m) => JSON.stringify(m)).join('\n') + '\n';
    await fs.appendFile(this.archivePath, lines, 'utf-8');

    // Append tombstones to active JSONL
    const tombstones = toArchive.map((m) => JSON.stringify({ id: m.id, _deleted: true })).join('\n') + '\n';
    await fs.appendFile(this.jsonlPath, tombstones, 'utf-8');

    return toArchive.length;
  }

  /**
   * Check if the JSONL file size exceeds the compaction threshold.
   */
  async shouldCompact(): Promise<boolean> {
    try {
      const stat = await fs.stat(this.jsonlPath);
      return stat.size > MAX_JSONL_SIZE_BYTES;
    } catch {
      return false;
    }
  }

  /**
   * Compact the JSONL file by rewriting only active memories.
   * Removes tombstones and old versions of updated memories.
   */
  async compact(): Promise<void> {
    await this.ensureInitialized();

    const activeMemories = Array.from(this.index.values()).map((e) => e.memory);
    const lines = activeMemories.map((m) => JSON.stringify(m)).join('\n') + '\n';

    // Atomic write: write to temp, then rename
    const tempPath = this.jsonlPath + '.tmp';
    await fs.writeFile(tempPath, lines, 'utf-8');
    await fs.rename(tempPath, this.jsonlPath);

    console.log(`[MemoryStorage] Compacted JSONL: ${activeMemories.length} active memories`);
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  /**
   * Generate a hash-based ID from content and timestamp.
   * First 8 characters of SHA-256 — collision-resistant for practical purposes.
   */
  private generateId(content: string, timestamp: number): string {
    const hash = crypto.createHash('sha256');
    hash.update(content + String(timestamp) + String(Math.random()));
    return hash.digest('hex').substring(0, 8);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get the path to the JSONL file (for external consumers like hook scripts).
   */
  getJsonlPath(): string {
    return this.jsonlPath;
  }

  /**
   * Get the path to the archive file.
   */
  getArchivePath(): string {
    return this.archivePath;
  }
}
