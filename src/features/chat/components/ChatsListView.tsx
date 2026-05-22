/**
 * ChatsListView - Chat sessions list with status filtering
 */

import { useState, useCallback } from 'react'
import { FiSearch, FiMessageSquare } from 'react-icons/fi'
import { useList } from '../../../components/hooks'
import { FilterSelect } from '../../../components/shared/data'
import { DataTable, type ColumnDef } from '../../../components/ui/tables'
import { services } from '../../../services'
import type {
	ChatSession,
	ChatSessionsListParams,
} from '../../../services/contracts'

export interface ChatsListViewProps {
	onRowClick?: (session: ChatSession) => void
}

export function ChatsListView({ onRowClick }: ChatsListViewProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('')
	const [filters, setFilters] = useState<ChatSessionsListParams>({
		search: '',
		status: '',
		page: 1,
		page_size: 20,
	})

	const fetcher = useCallback(
		(params?: ChatSessionsListParams) => services.chat.listSessions(params) as any,
		[]
	)

	const [state, actions] = useList<ChatSession, ChatSessionsListParams>(
		fetcher,
		{
			params: filters,
			autoFetch: true,
			pollInterval: 30000, // Refresh every 30 seconds
		},
	)

	const columns: ColumnDef<ChatSession>[] = [
		{
			id: 'external_id',
			header: 'Chat ID',
			cell: session => (
				<div className='flex items-center gap-2'>
					<FiMessageSquare className='h-4 w-4 text-text-muted' />
					<span className='font-medium'>
						{session.external_id || session.id}
					</span>
				</div>
			),
		},
		{
			id: 'platform',
			header: 'Platform',
			cell: session => (
				<span className='inline-block rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600 capitalize'>
					{session.platform || 'Direct'}
				</span>
			),
		},
		{
			id: 'status',
			header: 'Status',
			cell: session => {
				const statusColors = {
					active: 'bg-green-500/20 text-green-600',
					closed: 'bg-gray-500/20 text-gray-600',
					archived: 'bg-blue-500/20 text-blue-600',
				}
				const color =
					statusColors[session.status as keyof typeof statusColors] ||
					statusColors.active
				return (
					<span
						className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${color}`}
					>
						{session.status || 'Active'}
					</span>
				)
			},
		},
		{
			id: 'messages_count',
			header: 'Messages',
			cell: session => (
				<span className='font-medium text-text-secondary'>
					{session.messages_count || 0}
				</span>
			),
		},
		{
			id: 'last_message_at',
			header: 'Last Message',
			cell: session => {
				if (!session.last_message_at) return '—'
				const date = new Date(session.last_message_at)
				const now = new Date()
				const diff = now.getTime() - date.getTime()
				const mins = Math.floor(diff / 60000)
				const hours = Math.floor(diff / 3600000)
				const days = Math.floor(diff / 86400000)

				if (mins < 1) return 'Just now'
				if (mins < 60) return `${mins}m ago`
				if (hours < 24) return `${hours}h ago`
				return `${days}d ago`
			},
		},
	]

	const handleSearch = (value: string) => {
		setSearchQuery(value)
		actions.setPage(1)
		setFilters(prev => ({ ...prev, search: value }))
	}

	const handleStatusChange = (status: string) => {
		setStatusFilter(status)
		actions.setPage(1)
		setFilters(prev => ({ ...prev, status: status || undefined }))
	}

	return (
		<div className='flex flex-col gap-4'>
			{/* Header */}
			<div className='flex items-center justify-between gap-4'>
				<h1 className='text-xl font-bold text-text-primary'>Chat Sessions</h1>
			</div>

			{/* Filters */}
			<div className='flex flex-col gap-3 md:flex-row'>
				<div className='relative flex-1'>
					<FiSearch className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted' />
					<input
						type='text'
						placeholder='Search chats...'
						value={searchQuery}
						onChange={e => handleSearch(e.target.value)}
						className='w-full rounded-lg border border-border-soft bg-surface-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20'
					/>
				</div>

				<div className='min-w-[190px]'>
					<FilterSelect
						value={statusFilter}
						onChange={handleStatusChange}
						options={[
							{ value: '', label: 'All Status' },
							{ value: 'active', label: 'Active' },
							{ value: 'closed', label: 'Closed' },
							{ value: 'archived', label: 'Archived' },
						]}
					/>
				</div>
			</div>

			{/* Table */}
			<DataTable
				columns={columns}
				data={state.items}
				isLoading={state.isLoading}
				currentPage={state.pageInfo.page || 1}
				pageSize={state.pageInfo.pageSize || 20}
				totalItems={state.total}
				onRowClick={onRowClick}
				onPageChange={page => {
					actions.setPage(page)
					setFilters(prev => ({ ...prev, page }))
				}}
				onPageSizeChange={pageSize => {
					actions.setPageSize(pageSize)
					setFilters(prev => ({ ...prev, page_size: pageSize }))
				}}
				emptyMessage='No chat sessions found'
				rowKey={session => session.id}
			/>
		</div>
	)
}
