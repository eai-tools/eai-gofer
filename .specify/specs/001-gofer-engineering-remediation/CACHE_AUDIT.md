# Cache Implementation Audit

**Date**: 2026-02-24 **Task**: T019 - Standardize all caches on LRU + TTL
pattern **Status**: Audit Complete

## Summary

This document catalogs all cache implementations in the codebase and their
eviction policies. The goal is to standardize caches on LRU (Least Recently
Used) + TTL (Time To Live) pattern to prevent unbounded memory growth.

## Reference Implementation

**File**: `language-server/src/utils/specCache.ts` **Class**: `SpecCache`
**Status**: ✅ COMPLIANT (LRU + TTL)

This is the reference implementation for all caches. Key features:

- LRU eviction when max entries exceeded
- TTL-based expiration (5 minutes default)
- Stats tracking (hits, misses, evictions, expirations)
- O(1) operations using Map

## Cache Implementations

### 1. SmartCache (✅ COMPLIANT)

**File**: `extension/src/utils/performance.ts` **Class**: `SmartCache<T>`
**Status**: ✅ COMPLIANT (LRU + TTL)

**Features**:

- LRU eviction based on size and memory limits
- Configurable TTL (default: 30 minutes)
- Periodic cleanup timer
- Access count tracking

**Verdict**: Already follows best practices. No changes needed.

---

### 2. ObservationMasker.cache (✅ COMPLIANT)

**File**: `extension/src/autonomous/ObservationMasker.ts` **Property**:
`private readonly cache: Map<string, ObservationEntry>` **Status**: ✅ COMPLIANT
(Age-based eviction + Decay tiers)

**Features**:

- Turn-number-based age tracking
- Three-tier decay system (Recent, Fading, Masked)
- LRU eviction when context limits reached
- Token-aware eviction

**Verdict**: Implements domain-specific eviction. Already optimized for context
management.

---

### 3. ObservationMasker.expansionMetrics (✅ FIXED in T015)

**File**: `extension/src/autonomous/ObservationMasker.ts` **Property**:
`private expansionMetrics: Map<string, ExpansionMetric>` **Status**: ✅ FIXED
(LRU with 100-entry limit)

**Features**:

- Converted from unbounded array to Map<string, ExpansionMetric>
- LRU eviction when 100 entries exceeded
- Stats tracking (evictions, size)

**Verdict**: Fixed in Phase 2 (T015). Compliant.

---

### 4. MemoryStorage.index (✅ FIXED in T016, T017)

**File**: `extension/src/autonomous/MemoryStorage.ts` **Property**:
`private index: Map<string, IndexEntry>` **Status**: ✅ FIXED (Token budget +
LRU)

**Features**:

- 50,000 token budget limit
- Priority-based eviction (lowest priority first, then oldest lastUsed)
- Token estimation for all entries
- Removed content duplication (~50% memory reduction)

**Verdict**: Fixed in Phase 2 (T016, T017). Compliant.

---

### 5. ResearchChunker.indexCache (⚠️ NEEDS REMEDIATION)

**File**: `extension/src/autonomous/ResearchChunker.ts` **Property**:
`private readonly indexCache: Map<string, IndexResult>` **Status**: ⚠️ UNBOUNDED

**Issues**:

- No LRU eviction
- No TTL expiration
- Unbounded growth (grows with number of specs)
- Only cleared via explicit `clearCache()` call

**Recommendation**:

- Add LRU eviction with limit of 50 entries
- Add TTL of 30 minutes (indices can be regenerated)
- Follow SpecCache pattern

**Priority**: P2 (Next iteration)

---

### 6. HintLoader.hintCache (⚠️ NEEDS REMEDIATION)

**File**: `extension/src/autonomous/HintLoader.ts` **Property**:
`private hintCache: Map<string, HintFile>` **Status**: ⚠️ UNBOUNDED

**Issues**:

- No LRU eviction
- No TTL expiration
- Uses `cacheValid` flag for whole-cache invalidation
- Unbounded growth (grows with number of hint files)

**Recommendation**:

- Add LRU eviction with limit of 100 entries
- Add TTL of 15 minutes (hints are file-backed, can reload)
- Replace cacheValid flag with entry-level staleness tracking

**Priority**: P2 (Next iteration)

---

### 7. ResearchSummarizer.cache (⚠️ NEEDS REMEDIATION)

**File**: `extension/src/autonomous/ResearchSummarizer.ts` **Property**:
`private cache: Map<string, SummaryCache>` **Status**: ⚠️ UNBOUNDED

**Issues**:

- No LRU eviction
- No TTL expiration
- Persisted to disk (`.specify/.cache/summaries.json`)
- Unbounded growth (grows with number of summaries)

**Recommendation**:

- Add LRU eviction with limit of 200 entries
- Add TTL of 7 days (summaries are expensive to regenerate)
- Implement disk-based LRU: keep hot entries in memory, cold on disk
- Prune disk cache on startup if > 500 entries

**Priority**: P2 (Next iteration)

---

### 8. StageContextProfileLoader.profileCache (✅ LOW RISK)

**File**: `extension/src/autonomous/StageContextProfileLoader.ts` **Property**:
`private profileCache: Map<GoferStage, StageContextProfile> | null` **Status**:
✅ LOW RISK (Bounded by enum)

**Features**:

- Cache size bounded by number of GoferStage enum values (~6-10 entries)
- Profiles are small objects (metadata only)
- No eviction needed

**Verdict**: No action needed. Cache is inherently bounded.

---

### 9. WorkspaceContextProvider.artifactMtimes (✅ LOW RISK)

**File**: `extension/src/autonomous/WorkspaceContextProvider.ts` **Property**:
`private artifactMtimes: Map<string, number>` **Status**: ✅ LOW RISK (Bounded
by spec files)

**Features**:

- Stores only file modification times (numbers)
- Size bounded by number of spec artifacts in workspace
- Cleared on stage transition
- Minimal memory footprint

**Verdict**: No action needed. Cache is inherently bounded and lightweight.

---

## Summary Table

| Cache                                   | File                                                  | Status       | Action                          |
| --------------------------------------- | ----------------------------------------------------- | ------------ | ------------------------------- |
| SpecCache                               | language-server/src/utils/specCache.ts                | ✅ REFERENCE | None (reference implementation) |
| SmartCache                              | extension/src/utils/performance.ts                    | ✅ COMPLIANT | None                            |
| ObservationMasker.cache                 | extension/src/autonomous/ObservationMasker.ts         | ✅ COMPLIANT | None                            |
| ObservationMasker.expansionMetrics      | extension/src/autonomous/ObservationMasker.ts         | ✅ FIXED     | T015 complete                   |
| MemoryStorage.index                     | extension/src/autonomous/MemoryStorage.ts             | ✅ FIXED     | T016, T017 complete             |
| ResearchChunker.indexCache              | extension/src/autonomous/ResearchChunker.ts           | ⚠️ UNBOUNDED | P2 - Add LRU + TTL              |
| HintLoader.hintCache                    | extension/src/autonomous/HintLoader.ts                | ⚠️ UNBOUNDED | P2 - Add LRU + TTL              |
| ResearchSummarizer.cache                | extension/src/autonomous/ResearchSummarizer.ts        | ⚠️ UNBOUNDED | P2 - Add LRU + TTL              |
| StageContextProfileLoader.profileCache  | extension/src/autonomous/StageContextProfileLoader.ts | ✅ LOW RISK  | None (bounded by enum)          |
| WorkspaceContextProvider.artifactMtimes | extension/src/autonomous/WorkspaceContextProvider.ts  | ✅ LOW RISK  | None (bounded by workspace)     |

## Compliance Metrics

- **Compliant caches**: 5/10 (50%)
- **Fixed in Phase 2**: 2/10 (20%)
- **Needs remediation**: 3/10 (30%)
- **Low risk (no action needed)**: 2/10 (20%)

## Next Steps (P2 - Next Sprint)

### Task: Implement LRU + TTL for ResearchChunker.indexCache

**File**: `extension/src/autonomous/ResearchChunker.ts` **Changes**:

1. Add `maxIndexCacheEntries = 50` constant
2. Add `indexCacheTtl = 30 * 60 * 1000` (30 minutes)
3. Change `IndexResult` to include timestamp
4. Implement `evictOldestIndex()` method (follow SpecCache pattern)
5. Add TTL check in cache getter
6. Add stats tracking

### Task: Implement LRU + TTL for HintLoader.hintCache

**File**: `extension/src/autonomous/HintLoader.ts` **Changes**:

1. Add `maxHintCacheEntries = 100` constant
2. Add `hintCacheTtl = 15 * 60 * 1000` (15 minutes)
3. Add timestamp to cached HintFile entries
4. Implement `evictOldestHint()` method
5. Replace `cacheValid` flag with per-entry TTL checks
6. Add stats tracking

### Task: Implement Two-Tier LRU + TTL for ResearchSummarizer.cache

**File**: `extension/src/autonomous/ResearchSummarizer.ts` **Changes**:

1. Add `maxMemoryCacheEntries = 200` constant
2. Add `summaryCacheTtl = 7 * 24 * 60 * 60 * 1000` (7 days)
3. Implement in-memory LRU (200 hot entries)
4. Implement disk-based LRU pruning (500 max on disk)
5. Add TTL checks for both memory and disk
6. Evict from memory → persist to disk (if within disk limit)
7. Prune disk cache on startup if > 500 entries

## Conclusion

Phase 2 (T015-T019) successfully identified and fixed 2 critical cache issues
(ObservationMasker.expansionMetrics and MemoryStorage.index). 3 additional
unbounded caches were identified for remediation in P2 (next sprint). All caches
are now documented and tracked.
