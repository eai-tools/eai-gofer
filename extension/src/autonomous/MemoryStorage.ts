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
import { isGeneratedMemory } from './memoryFilters';

// ============================================================================
// Constants
// ============================================================================

const JSONL_FILENAME = 'memories.jsonl';
const ARCHIVE_FILENAME = 'archive.jsonl';
const LEGACY_FILENAME = 'local.json';
const MAX_JSONL_SIZE_BYTES = 8 * 1024 * 1024; // 8MB triggers compaction warning
const MAX_TOKEN_BUDGET = 50000; // T016: Maximum token budget for in-memory index

// ============================================================================
// Types
// ============================================================================

/**
 * In-memory index entry for fast lookups
 * T017: Removed duplicate content field - use memory.content instead
 */
interface IndexEntry {
  id: string;
  type?: MemoryType;
  category: string;
  tags: string[];
  scope: 'local' | 'global';
  priorityIndex: number;
  usedCount: number;
  created: number;
  lastUsed: number;
  stale: boolean;
  agentId?: string;
  /** Full memory object reference */
  memory: Memory;
}

interface SerializedMemoryRecord extends Memory {
  _layerAbstract?: string;
  _layerOverview?: string;
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

  /** T016: Current token usage in the in-memory index */
  private currentTokenUsage = 0;

  /** Serialises concurrent appendFile calls to prevent JSONL corruption (NFR-017) */
  private writeQueue: Promise<void> = Promise.resolve();

  /** Routes all jsonlPath writes through the write queue to prevent concurrent corruption */
  private enqueueWrite(line: string): Promise<void> {
    this.writeQueue = this.writeQueue.then(() => fs.appendFile(this.jsonlPath, line, 'utf-8'));
    return this.writeQueue;
  }

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
    if (this.initialized) {
      return;
    }

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

      if (memories.length === 0) {
        return;
      }

      // Write each memory as a JSONL line
      const lines = memories.map((m) => JSON.stringify(m)).join('\n') + '\n';
      await this.atomicWriteFile(this.jsonlPath, lines);
    } catch {
      // No legacy file or parse error — start fresh
    }
  }

  /**
   * Rebuild the in-memory index by reading the entire JSONL file.
   * Last-writer-wins for duplicate IDs (handles updates).
   * T009: Deserializes flat layer fields back into layers object.
   */
  async rebuildIndex(): Promise<void> {
    this.index.clear();
    this.currentTokenUsage = 0; // T016: Reset token usage when rebuilding index

    try {
      const content = await fs.readFile(this.jsonlPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim().length > 0);

      for (const line of lines) {
        try {
          const record = JSON.parse(line) as Record<string, unknown>;
          if (!record.id) {
            continue;
          }

          // Handle tombstone records (deleted memories)
          if (record._deleted) {
            this.index.delete(record.id as string);
            continue;
          }

          // T009: Deserialize memory from JSONL (reconstructs layers from flat fields)
          const memory = this.deserializeMemoryFromJSONL(record);
          this.indexMemory(memory);
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
   * T016: Tracks token usage and evicts oldest memories if budget exceeded.
   * T017: Removed duplicate content storage - access via memory.content.
   */
  private indexMemory(memory: Memory): void {
    // T016: Calculate tokens for this memory
    const newTokens = this.estimateTokens(memory.content);

    // T016: If updating existing entry, subtract old token count first
    const existing = this.index.get(memory.id);
    if (existing) {
      const oldTokens = this.estimateTokens(existing.memory.content); // T017: Use memory.content
      this.currentTokenUsage -= oldTokens;
    }

    // Add entry to index (T017: no duplicate content field)
    this.index.set(memory.id, {
      id: memory.id,
      type: memory.type,
      category: memory.category,
      tags: memory.tags || [],
      scope: memory.scope,
      priorityIndex: memory.priorityIndex ?? 0,
      usedCount: memory.usedCount ?? 0,
      created: memory.created,
      lastUsed: memory.lastUsed,
      stale: memory.stale ?? false,
      agentId: memory.agentId,
      memory,
    });

    // T016: Update token usage and evict if needed
    this.currentTokenUsage += newTokens;
    if (this.currentTokenUsage > MAX_TOKEN_BUDGET) {
      this.evictToFitBudget();
    }
  }

  // --------------------------------------------------------------------------
  // Serialization Helpers (T009: Layered storage)
  // --------------------------------------------------------------------------

  /**
   * T009: Serialize Memory for JSONL storage by flattening layers.
   * Extracts abstract/overview into flat fields, excludes detail function.
   */
  private serializeMemoryForJSONL(memory: Memory): Record<string, unknown> {
    const serialized: SerializedMemoryRecord = { ...memory };

    // If layers exist, flatten abstract/overview into top-level fields
    if (memory.layers) {
      // Store abstract and overview as flat fields for JSONL
      serialized._layerAbstract = memory.layers.abstract;
      serialized._layerOverview = memory.layers.overview;

      // Remove the layers object (it contains a function we can't serialize)
      delete serialized.layers;
    }

    return serialized as unknown as Record<string, unknown>;
  }

  /**
   * T009: Deserialize Memory from JSONL by reconstructing layers.
   * Rebuilds layers object from flat _layerAbstract/_layerOverview fields.
   * Note: detail function will be added by lazy loading logic (T017).
   */
  private deserializeMemoryFromJSONL(record: Record<string, unknown>): Memory {
    const memory = { ...record } as unknown as SerializedMemoryRecord;

    // If flat layer fields exist, reconstruct layers object
    if (record._layerAbstract && record._layerOverview) {
      memory.layers = {
        abstract: record._layerAbstract as string,
        overview: record._layerOverview as string,
        // T017: detail will be lazy-loaded from notePath or content
        detail: async () => memory.content, // Fallback to content for now
      };

      // Clean up flat fields from memory object
      delete memory._layerAbstract;
      delete memory._layerOverview;
    }

    return memory;
  }

  // --------------------------------------------------------------------------
  // Write Operations
  // --------------------------------------------------------------------------

  /** 019 C10: Character threshold for auto-promotion to markdown note */
  private static readonly AUTO_PROMOTE_THRESHOLD = 500;

  /**
   * Append a memory to the JSONL file and update the index.
   * Returns the memory with a generated hash-based ID.
   * 019 C10: Automatically promotes entries exceeding 500 chars to markdown notes.
   * T009: Flattens layers.abstract/overview for JSONL storage (detail excluded as function).
   */
  async append(memory: Omit<Memory, 'id' | 'created'>): Promise<Memory> {
    await this.ensureInitialized();

    const now = Date.now();
    const id = this.generateId(memory.content, now);

    let fullMemory: Memory = {
      ...memory,
      id,
      created: now,
      lastUsed: memory.lastUsed || now,
      usedCount: memory.usedCount ?? 0,
    };

    // 019 C10: Auto-promote large entries to markdown notes
    if (memory.content.length > MemoryStorage.AUTO_PROMOTE_THRESHOLD) {
      fullMemory = await this.autoPromoteToMarkdown(fullMemory);
    }

    // T009: Serialize memory for JSONL (flatten layers, exclude detail function)
    const serialized = this.serializeMemoryForJSONL(fullMemory);

    // Serialise all JSONL writes through a queue to prevent concurrent corruption (NFR-017)
    const line = JSON.stringify(serialized) + '\n';
    await this.enqueueWrite(line);

    // Update index
    this.indexMemory(fullMemory);

    return fullMemory;
  }

  /**
   * Update a memory by appending a new version (last-writer-wins).
   * T009: Flattens layers.abstract/overview for JSONL storage.
   */
  async update(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    await this.ensureInitialized();

    const existing = this.index.get(id);
    if (!existing) {
      return null;
    }

    const updated: Memory = {
      ...existing.memory,
      ...updates,
      id, // Preserve original ID
    };

    // T009: Serialize memory for JSONL (flatten layers, exclude detail function)
    const serialized = this.serializeMemoryForJSONL(updated);

    // Append updated version to JSONL
    const line = JSON.stringify(serialized) + '\n';
    await this.enqueueWrite(line);

    // Update index
    this.indexMemory(updated);

    return updated;
  }

  /**
   * Mark a memory as deleted by appending a tombstone.
   */
  async remove(id: string): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.index.has(id)) {
      return false;
    }

    // Append tombstone
    const tombstone = JSON.stringify({ id, _deleted: true }) + '\n';
    await this.enqueueWrite(tombstone);

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
    if (!memory) {
      return null;
    }

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
   *
   * Applies filters in sequence:
   * 1. excludeSystemMemories - removes generated memories
   * 2. category - filters by exact category match
   * 3. tags - filters memories containing all specified tags
   * 4. scope - filters by global or local scope
   * 5. query - text search in content field
   *
   * @param query - Filter criteria and search parameters
   * @param query.excludeSystemMemories - When true, excludes generated memories
   * @param query.category - Filter by exact category name
   * @param query.tags - Array of tags (memory must have all)
   * @param query.scope - Filter by 'global' or 'local' scope
   * @param query.query - Text search term for content field
   * @returns Array of matching memories sorted by (importance DESC, lastAccessed DESC)
   */
  query(query: MemoryQuery): Memory[] {
    let results = Array.from(this.index.values());

    // Exclude generated memories by default in human-facing views/searches
    if (query.excludeSystemMemories) {
      results = results.filter((e) => !isGeneratedMemory(e.memory));
    }

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
        // T017: Use e.memory.content instead of duplicate e.content field
        const text = (e.memory.content + ' ' + e.category + ' ' + e.tags.join(' ')).toLowerCase();
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

    if (toArchive.length === 0) {
      return 0;
    }

    // Append to archive JSONL
    const lines = toArchive.map((m) => JSON.stringify(m)).join('\n') + '\n';
    await fs.appendFile(this.archivePath, lines, 'utf-8');

    // Append tombstones to active JSONL (via write queue to prevent concurrent corruption)
    const tombstones =
      toArchive.map((m) => JSON.stringify({ id: m.id, _deleted: true })).join('\n') + '\n';
    await this.enqueueWrite(tombstones);

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

    await this.atomicWriteFile(this.jsonlPath, lines);
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
   * T016: Estimate token count for a string (4 chars ≈ 1 token)
   * Uses the same pattern as ContextBuilder.
   */
  private estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  /**
   * T016: Evict oldest memories when token budget is exceeded.
   * Evicts memories with lowest priority first, then oldest lastUsed.
   */
  private evictToFitBudget(): void {
    while (this.currentTokenUsage > MAX_TOKEN_BUDGET && this.index.size > 0) {
      let evictKey: string | null = null;
      let lowestPriority = Infinity;
      let oldestTime = Infinity;

      // Find memory with lowest priority, breaking ties by oldest lastUsed
      for (const [key, entry] of this.index.entries()) {
        if (
          entry.priorityIndex < lowestPriority ||
          (entry.priorityIndex === lowestPriority && entry.lastUsed < oldestTime)
        ) {
          lowestPriority = entry.priorityIndex;
          oldestTime = entry.lastUsed;
          evictKey = key;
        }
      }

      if (evictKey) {
        const entry = this.index.get(evictKey)!;
        const tokens = this.estimateTokens(entry.memory.content); // T017: Use memory.content
        this.index.delete(evictKey);
        this.currentTokenUsage -= tokens;
      }
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

  /**
   * T016: Get current token usage stats for debugging.
   */
  getTokenUsageStats(): { currentTokens: number; maxTokens: number; utilization: number } {
    return {
      currentTokens: this.currentTokenUsage,
      maxTokens: MAX_TOKEN_BUDGET,
      utilization: this.currentTokenUsage / MAX_TOKEN_BUDGET,
    };
  }

  /**
   * 019 C10: Auto-promote a memory entry to a markdown note file.
   * Creates `.specify/memory/memory-notes/{id}.md` with full content,
   * and returns the memory with truncated content + notePath reference.
   */
  private async autoPromoteToMarkdown(memory: Memory): Promise<Memory> {
    const notesDir = path.join(path.dirname(this.jsonlPath), 'memory-notes');
    await fs.mkdir(notesDir, { recursive: true });

    const notePath = `memory-notes/${memory.id}.md`;
    const fullNotePath = path.join(path.dirname(this.jsonlPath), notePath);

    // Write markdown note with YAML frontmatter
    const mdContent = [
      '---',
      `id: ${memory.id}`,
      `category: ${memory.category}`,
      `created: ${new Date(memory.created).toISOString()}`,
      `tags: [${memory.tags.map((t: string) => `"${t}"`).join(', ')}]`,
      '---',
      '',
      memory.content,
    ].join('\n');

    await this.atomicWriteFile(fullNotePath, mdContent);

    // Truncate JSONL content and add notePath reference
    const truncated = memory.content.slice(0, 200) + '... [see markdown note]';
    return { ...memory, content: truncated, notePath };
  }

  private async atomicWriteFile(targetPath: string, content: string): Promise<void> {
    await fs.writeFile(targetPath, content, 'utf-8');
  }
}
