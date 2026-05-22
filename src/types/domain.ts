// ===== Common =====
export interface CommonEntity {
	id: string
	createdAt: Date
	updatedAt?: Date
}

// Export individual domain modules
export type * from './common'
export type * from './user'
export type * from './lead'
export type * from './client'
export type * from './product'
export type * from './contract'
export type * from './chat'
export type * from './notification'
export type * from './ai-setting'
export type * from './integration'
export type * from './log'
export type * from './operator-statistics'
