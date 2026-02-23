/**
 * Dependency Injection Container
 *
 * Centralized service registration and lifecycle management using TSyringe.
 *
 * Usage:
 * ```typescript
 * import { registerServices, getContainer, resetContainer } from './di/container';
 *
 * // During extension activation
 * registerServices();
 *
 * // Resolve services
 * const logger = getContainer().resolve(Logger);
 *
 * // For testing
 * resetContainer();
 * ```
 */

import { container } from 'tsyringe';
import 'reflect-metadata';
import { Logger } from '../services/Logger';

/**
 * Register all injectable services in the DI container.
 *
 * This function should be called once during extension activation,
 * before any services are resolved.
 *
 * Services are registered as singletons to maintain state across
 * the extension lifecycle.
 */
export function registerServices(): void {
  // Phase 1: Core infrastructure services
  container.registerSingleton(Logger);

  // Phase 2: Cache and performance services
  // Cache services will be registered here in Phase 2
  // Phase 3: Extension.ts extracted services
  // CommandRegistry, EventHandlers, InitializationService, DisposalService
  // will be registered here in Phase 3
  // Phase 4: GoferMigrator.ts extracted services
  // VersionDetector, UpgradeService, ResourceSyncer, PathMigrator
  // will be registered here in Phase 4
}

/**
 * Get the global DI container instance.
 *
 * Use this to manually resolve services when needed.
 *
 * @returns The TSyringe container instance
 */
export function getContainer(): typeof container {
  return container;
}

/**
 * Reset the DI container by clearing all registrations.
 *
 * **WARNING**: This should only be used in tests to ensure
 * a clean state between test runs.
 *
 * Do NOT call this in production code.
 */
export function resetContainer(): void {
  container.clearInstances();
}
