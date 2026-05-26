import type { SelectOption } from '../types/common'
import type { LeadStatus } from '../types/lead'
import type { ProductStatus } from '../types/product'
import type { MessageDeliveryStatus, MessageSenderType } from '../types/chat'
import type { UserStatus } from '../types/user'

export const LEAD_STATUSES = [
	'new',
	'contacted',
	'qualified',
	'lost',
] as const satisfies readonly LeadStatus[]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
	new: 'New',
	contacted: 'Contacted',
	qualified: 'Qualified',
	lost: 'Lost',
}

export const LEAD_STATUS_OPTIONS: SelectOption[] = [
	{ value: 'new', label: LEAD_STATUS_LABELS.new },
	{ value: 'contacted', label: LEAD_STATUS_LABELS.contacted },
	{ value: 'qualified', label: LEAD_STATUS_LABELS.qualified },
	{ value: 'lost', label: LEAD_STATUS_LABELS.lost },
]

export const PRODUCT_STATUSES = [
	'draft',
	'active',
	'out-of-stock',
	'archived',
] as const satisfies readonly ProductStatus[]

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
	draft: 'Draft',
	active: 'Active',
	'out-of-stock': 'Out of Stock',
	archived: 'Archived',
}

export const PRODUCT_STATUS_OPTIONS: SelectOption[] = [
	{ value: 'draft', label: PRODUCT_STATUS_LABELS.draft },
	{ value: 'active', label: PRODUCT_STATUS_LABELS.active },
	{ value: 'out-of-stock', label: PRODUCT_STATUS_LABELS['out-of-stock'] },
	{ value: 'archived', label: PRODUCT_STATUS_LABELS.archived },
]

export const USER_STATUSES = [
	'active',
	'inactive',
	'invited',
] as const satisfies readonly UserStatus[]

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
	active: 'Active',
	inactive: 'Inactive',
	invited: 'Invited',
}

export const USER_STATUS_OPTIONS: SelectOption[] = [
	{ value: 'active', label: USER_STATUS_LABELS.active },
	{ value: 'inactive', label: USER_STATUS_LABELS.inactive },
	{ value: 'invited', label: USER_STATUS_LABELS.invited },
]

export const MESSAGE_SENDER_TYPES = [
	'customer',
	'ai',
	'operator',
	'system',
	'follow_up',
] as const satisfies readonly MessageSenderType[]

export const MESSAGE_SENDER_TYPE_LABELS: Record<MessageSenderType, string> = {
	customer: 'Customer',
	ai: 'AI',
	operator: 'Operator',
	system: 'System',
	follow_up: 'Follow-up',
}

export const MESSAGE_SENDER_TYPE_OPTIONS: SelectOption[] = [
	{ value: 'customer', label: MESSAGE_SENDER_TYPE_LABELS.customer },
	{ value: 'ai', label: MESSAGE_SENDER_TYPE_LABELS.ai },
	{ value: 'operator', label: MESSAGE_SENDER_TYPE_LABELS.operator },
	{ value: 'system', label: MESSAGE_SENDER_TYPE_LABELS.system },
	{ value: 'follow_up', label: MESSAGE_SENDER_TYPE_LABELS.follow_up },
]

export const MESSAGE_DELIVERY_STATUSES = [
	'pending',
	'sent',
	'delivered',
	'read',
	'failed',
] as const satisfies readonly MessageDeliveryStatus[]

export const MESSAGE_DELIVERY_STATUS_LABELS: Record<
	MessageDeliveryStatus,
	string
> = {
	pending: 'Pending',
	sent: 'Sent',
	delivered: 'Delivered',
	read: 'Read',
	failed: 'Failed',
}

export const MESSAGE_DELIVERY_STATUS_OPTIONS: SelectOption[] = [
	{ value: 'pending', label: MESSAGE_DELIVERY_STATUS_LABELS.pending },
	{ value: 'sent', label: MESSAGE_DELIVERY_STATUS_LABELS.sent },
	{ value: 'delivered', label: MESSAGE_DELIVERY_STATUS_LABELS.delivered },
	{ value: 'read', label: MESSAGE_DELIVERY_STATUS_LABELS.read },
	{ value: 'failed', label: MESSAGE_DELIVERY_STATUS_LABELS.failed },
]
