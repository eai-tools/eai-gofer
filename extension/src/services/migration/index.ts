/**
 * Migration Services Module
 *
 * Exports migration-related services extracted from goferMigrator.ts
 * Engineering Remediation Phase 4 - T026-T030
 */

export { VersionDetector, type FormatType, type VersionInfo } from './VersionDetector';
export { UpgradeService, type IResourceOperations } from './UpgradeService';
// ResourceSyncer, PathMigrator will be added in T028-T029
