/**
 * ResearchGraphBuilder - Parses research.md for entity names and populates KnowledgeGraph
 *
 * Scans research documents for:
 * - Section headers (## patterns, ## entities)
 * - Bold terms (**EntityName**)
 * - Code references (`path/to/file.ts`)
 * - File paths in tables
 *
 * Creates graph nodes for discovered entities and links them to mentioned files.
 *
 * @see spec 017 T064: Research→graph integration
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

/** Duck-typed interface for KnowledgeGraph dependency */
export interface KnowledgeGraphLike {
  addNode(id: string, data: { type: string; name: string; path?: string; lastSeen: number; metadata?: Record<string, unknown> }): void;
  addEdge(source: string, target: string, type: string): void;
  recordFileAccess(filePath: string): void;
  recordPattern(patternName: string, files: string[]): void;
}

/** Extracted entity from research */
export interface ResearchEntity {
  name: string;
  type: 'pattern' | 'decision' | 'class' | 'function' | 'file';
  source: string; // section where found
  relatedFiles: string[];
}

/** Result of graph building */
export interface GraphBuildResult {
  entitiesFound: number;
  nodesCreated: number;
  edgesCreated: number;
  entities: ResearchEntity[];
}

// ============================================================================
// ResearchGraphBuilder
// ============================================================================

export class ResearchGraphBuilder {
  private readonly workspaceRoot: string;
  private readonly logger: Logger;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.logger = Logger.for('ResearchGraphBuilder');
  }

  /**
   * Parse a research.md file and populate the knowledge graph with entities.
   *
   * @param researchPath - Path to research.md file
   * @param graph - KnowledgeGraph to populate
   * @returns Build result with statistics
   */
  buildFromResearch(researchPath: string, graph: KnowledgeGraphLike): GraphBuildResult {
    let content: string;
    try {
      content = fs.readFileSync(researchPath, 'utf-8');
    } catch {
      this.logger.warn('Research file not found', { researchPath });
      return { entitiesFound: 0, nodesCreated: 0, edgesCreated: 0, entities: [] };
    }

    const entities = this.extractEntities(content);
    let nodesCreated = 0;
    let edgesCreated = 0;

    for (const entity of entities) {
      // Create node for entity
      const nodeId = `${entity.type}:${entity.name.toLowerCase().replace(/\s+/g, '-')}`;
      graph.addNode(nodeId, {
        type: entity.type === 'class' || entity.type === 'function' ? entity.type : entity.type,
        name: entity.name,
        lastSeen: Date.now(),
        metadata: { source: entity.source, fromResearch: true },
      });
      nodesCreated++;

      // Link to related files
      for (const filePath of entity.relatedFiles) {
        graph.recordFileAccess(filePath);
        graph.addEdge(`file:${filePath}`, nodeId, entity.type === 'pattern' ? 'uses_pattern' : 'imports');
        edgesCreated++;
      }
    }

    this.logger.info('Research graph built', {
      researchPath,
      entitiesFound: entities.length,
      nodesCreated,
      edgesCreated,
    });

    return { entitiesFound: entities.length, nodesCreated, edgesCreated, entities };
  }

  /**
   * Build graph from all research files in a spec directory.
   */
  buildFromSpec(specId: string, graph: KnowledgeGraphLike): GraphBuildResult {
    const researchPath = path.join(this.workspaceRoot, '.specify', 'specs', specId, 'research.md');
    return this.buildFromResearch(researchPath, graph);
  }

  // --------------------------------------------------------------------------
  // Entity Extraction
  // --------------------------------------------------------------------------

  private extractEntities(content: string): ResearchEntity[] {
    const entities: ResearchEntity[] = [];
    const seen = new Set<string>();

    const lines = content.split('\n');
    let currentSection = '';

    for (const line of lines) {
      // Track current section
      const headerMatch = line.match(/^#+\s+(.+)/);
      if (headerMatch) {
        currentSection = headerMatch[1].trim();
      }

      // Extract bold terms as entities (pattern/decision names)
      const boldMatches = line.matchAll(/\*\*([A-Z][A-Za-z0-9\s]+)\*\*/g);
      for (const match of boldMatches) {
        const name = match[1].trim();
        if (name.length >= 3 && name.length <= 50 && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());

          // Determine type from context
          let type: ResearchEntity['type'] = 'pattern';
          if (currentSection.toLowerCase().includes('decision')) {type = 'decision';}
          else if (name.match(/Service|Manager|Handler|Provider|Factory/)) {type = 'class';}
          else if (name.match(/^(get|set|create|update|delete|load|save|init)/i)) {type = 'function';}

          // Find related file paths nearby
          const relatedFiles = this.extractNearbyFilePaths(content, content.indexOf(match[0]));

          entities.push({ name, type, source: currentSection, relatedFiles });
        }
      }

      // Extract code references as file entities
      const codeRefMatches = line.matchAll(/`([a-zA-Z0-9_/.]+\.(ts|js|tsx|jsx|md|json))`/g);
      for (const match of codeRefMatches) {
        const filePath = match[1];
        if (!seen.has(filePath)) {
          seen.add(filePath);
          entities.push({
            name: path.basename(filePath),
            type: 'file',
            source: currentSection,
            relatedFiles: [filePath],
          });
        }
      }

      // Extract table file paths (common in research.md "Where to Implement" tables)
      const tablePathMatch = line.match(/\|\s*`?([a-zA-Z0-9_/.-]+\.(ts|js|tsx|jsx))`?\s*\|/);
      if (tablePathMatch) {
        const filePath = tablePathMatch[1];
        if (!seen.has(filePath)) {
          seen.add(filePath);
          entities.push({
            name: path.basename(filePath),
            type: 'file',
            source: currentSection,
            relatedFiles: [filePath],
          });
        }
      }
    }

    return entities;
  }

  private extractNearbyFilePaths(content: string, position: number): string[] {
    // Look within ~500 chars of the entity for file paths
    const start = Math.max(0, position - 250);
    const end = Math.min(content.length, position + 250);
    const snippet = content.slice(start, end);

    const paths: string[] = [];
    const pathMatches = snippet.matchAll(/`([a-zA-Z0-9_/.]+\.(ts|js|tsx|jsx))`/g);
    for (const match of pathMatches) {
      paths.push(match[1]);
    }

    return paths;
  }
}
