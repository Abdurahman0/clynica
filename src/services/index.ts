/**
 * Services module - Main export point
 */

export * from './contracts'
export type * from './core/contracts'
export * from './registry'
export * from './adapters/implementations'
export * from './service'

// Re-export service registry for convenient access
export {
	createServiceRegistry,
	initializeServices,
	getServices,
} from './registry'
export type { ServiceRegistry } from './registry'
