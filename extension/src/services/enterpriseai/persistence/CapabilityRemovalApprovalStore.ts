import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import {
  type CapabilityRemovalApprovalRecord,
  buildCapabilityRemovalApprovalKey,
  validateCapabilityRemovalApprovalRecord,
} from '../models/Propagation';

function isNodeErrorWithCode(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function parseApprovalRecord(rawValue: string): CapabilityRemovalApprovalRecord {
  const parsed = JSON.parse(rawValue) as CapabilityRemovalApprovalRecord;
  const validation = validateCapabilityRemovalApprovalRecord(parsed);

  if (!validation.valid) {
    throw new Error(`Invalid capability removal approval record: ${validation.errors.join('; ')}`);
  }

  return parsed;
}

export class CapabilityRemovalApprovalStore {
  private static readonly MAX_CACHED_RECORDS = 2000;
  private static readonly MAX_LOOKUP_CACHE_ENTRIES = 256;
  private cachedRecords: CapabilityRemovalApprovalRecord[] | null = null;
  private cachedApprovalKeys: Set<string> | null = null;
  private cachedByRunId = new Map<string, CapabilityRemovalApprovalRecord[]>();
  private cachedByChangeSetId = new Map<string, CapabilityRemovalApprovalRecord[]>();
  private cachedByApprovalKey = new Map<string, CapabilityRemovalApprovalRecord | null>();

  constructor(
    private readonly storageFilePath: string = path.join(
      process.cwd(),
      '.specify',
      'memory',
      'capability-removal-approvals.jsonl'
    )
  ) {}

  public getStorageFilePath(): string {
    return this.storageFilePath;
  }

  public async save(record: CapabilityRemovalApprovalRecord): Promise<void> {
    const validation = validateCapabilityRemovalApprovalRecord(record);
    if (!validation.valid) {
      throw new Error(`Invalid approval record: ${validation.errors.join('; ')}`);
    }

    if (!this.cachedApprovalKeys) {
      await this.list();
    }

    const approvalKey = this.buildApprovalKey(record.changeSetId, record.capabilityAffected);
    if (this.cachedApprovalKeys?.has(approvalKey)) {
      throw new Error(
        `Approval record already exists for ${buildCapabilityRemovalApprovalKey(record.changeSetId, record.capabilityAffected)}.`
      );
    }

    await this.ensureStorageDirectory();
    await fs.appendFile(this.storageFilePath, `${JSON.stringify(record)}\n`, 'utf8');
    this.cachedApprovalKeys?.add(approvalKey);
    if (
      this.cachedRecords &&
      this.cachedRecords.length < CapabilityRemovalApprovalStore.MAX_CACHED_RECORDS
    ) {
      this.cachedRecords.push(record);
    } else {
      this.cachedRecords = null;
    }
    if (this.cachedByRunId.has(record.runId)) {
      const existing = this.cachedByRunId.get(record.runId) ?? [];
      this.setLookupCache(this.cachedByRunId, record.runId, [...existing, record]);
    }
    if (this.cachedByChangeSetId.has(record.changeSetId)) {
      const existing = this.cachedByChangeSetId.get(record.changeSetId) ?? [];
      this.setLookupCache(this.cachedByChangeSetId, record.changeSetId, [...existing, record]);
    }
    this.setLookupCache(this.cachedByApprovalKey, approvalKey, record);
  }

  public async list(): Promise<CapabilityRemovalApprovalRecord[]> {
    if (this.cachedRecords) {
      return [...this.cachedRecords];
    }

    const records = await this.scanRecords(
      (_record: CapabilityRemovalApprovalRecord): boolean => true,
      false
    );
    this.cachedApprovalKeys = new Set(
      records.map((record: CapabilityRemovalApprovalRecord): string =>
        this.buildApprovalKey(record.changeSetId, record.capabilityAffected)
      )
    );
    this.cachedByRunId.clear();
    this.cachedByChangeSetId.clear();
    this.cachedByApprovalKey.clear();
    this.cachedRecords =
      records.length <= CapabilityRemovalApprovalStore.MAX_CACHED_RECORDS ? records : null;
    return [...records];
  }

  public async listByRunId(runId: string): Promise<CapabilityRemovalApprovalRecord[]> {
    if (this.cachedRecords) {
      return this.cachedRecords.filter((record: CapabilityRemovalApprovalRecord): boolean => {
        return record.runId === runId;
      });
    }

    const cached = this.cachedByRunId.get(runId);
    if (cached) {
      return [...cached];
    }

    const records = await this.scanRecords(
      (record: CapabilityRemovalApprovalRecord): boolean => record.runId === runId,
      false
    );
    this.setLookupCache(this.cachedByRunId, runId, records);
    return [...records];
  }

  public async listByChangeSetId(changeSetId: string): Promise<CapabilityRemovalApprovalRecord[]> {
    if (this.cachedRecords) {
      return this.cachedRecords.filter((record: CapabilityRemovalApprovalRecord): boolean => {
        return record.changeSetId === changeSetId;
      });
    }

    const cached = this.cachedByChangeSetId.get(changeSetId);
    if (cached) {
      return [...cached];
    }

    const records = await this.scanRecords(
      (record: CapabilityRemovalApprovalRecord): boolean => record.changeSetId === changeSetId,
      false
    );
    this.setLookupCache(this.cachedByChangeSetId, changeSetId, records);
    return [...records];
  }

  public async find(
    changeSetId: string,
    capabilityAffected: string
  ): Promise<CapabilityRemovalApprovalRecord | null> {
    const targetKey = buildCapabilityRemovalApprovalKey(changeSetId, capabilityAffected);

    if (this.cachedRecords) {
      for (const record of this.cachedRecords) {
        const key = buildCapabilityRemovalApprovalKey(
          record.changeSetId,
          record.capabilityAffected
        );
        if (key === targetKey) {
          return record;
        }
      }
      return null;
    }

    if (this.cachedByApprovalKey.has(targetKey)) {
      return this.cachedByApprovalKey.get(targetKey) ?? null;
    }

    const records = await this.listByChangeSetId(changeSetId);
    const matchedRecord =
      records.find((record: CapabilityRemovalApprovalRecord): boolean => {
        const key = buildCapabilityRemovalApprovalKey(
          record.changeSetId,
          record.capabilityAffected
        );
        return key === targetKey;
      }) ?? null;
    this.setLookupCache(this.cachedByApprovalKey, targetKey, matchedRecord);
    return matchedRecord;
  }

  private async ensureStorageDirectory(): Promise<void> {
    await fs.mkdir(path.dirname(this.storageFilePath), { recursive: true });
  }

  private buildApprovalKey(changeSetId: string, capabilityAffected: string): string {
    return buildCapabilityRemovalApprovalKey(changeSetId, capabilityAffected);
  }

  private setLookupCache<T>(cache: Map<string, T>, key: string, value: T): void {
    if (cache.has(key)) {
      cache.delete(key);
    }
    cache.set(key, value);
    if (cache.size <= CapabilityRemovalApprovalStore.MAX_LOOKUP_CACHE_ENTRIES) {
      return;
    }

    const firstKey = cache.keys().next().value;
    if (typeof firstKey === 'string') {
      cache.delete(firstKey);
    }
  }

  private async scanRecords(
    predicate: (record: CapabilityRemovalApprovalRecord) => boolean,
    stopAfterFirstMatch: boolean
  ): Promise<CapabilityRemovalApprovalRecord[]> {
    const matches: CapabilityRemovalApprovalRecord[] = [];
    const stream = createReadStream(this.storageFilePath, { encoding: 'utf8' });
    const lineReader = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    try {
      for await (const line of lineReader) {
        const normalizedLine = line.trim();
        if (!normalizedLine) {
          continue;
        }

        const record = parseApprovalRecord(normalizedLine);
        if (!predicate(record)) {
          continue;
        }

        matches.push(record);
        if (stopAfterFirstMatch) {
          lineReader.close();
          break;
        }
      }
    } catch (error) {
      if (isNodeErrorWithCode(error) && error.code === 'ENOENT') {
        return [];
      }

      throw error;
    }

    return matches;
  }
}
