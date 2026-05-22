import type {
	AuditInfo,
	ContactInfo,
	EntityId,
} from './common'

export type LeadSource = 'telegram' | 'instagram' | 'manual'

export type LeadStatus =
	| 'new'
	| 'contacted'
	| 'qualified'
	| 'lost'

export type LeadMetadataValue = string | number | boolean | null

export type LeadMetadata = Record<string, LeadMetadataValue>

export interface LeadSummary {
	id: EntityId
	name?: string // Alias for fullName
	fullName: string
	status: LeadStatus
	phone?: string
	username?: string
}

export interface Lead extends AuditInfo {
	id: EntityId
	fullName: string
	contact: ContactInfo
	source: LeadSource
	status: LeadStatus
	managerId?: EntityId
	managerUsername?: string
	aiSummary?: string
	metadata?: LeadMetadata | null
}

export interface LeadMutationInput {
	full_name?: string
	phone?: string | null
	source?: LeadSource
	status?: LeadStatus
	manager?: EntityId | null
	ai_summary?: string | null
	metadata?: LeadMetadata | null
}

export type LeadPatchInput = Partial<LeadMutationInput>
