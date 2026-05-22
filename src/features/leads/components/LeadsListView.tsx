/**
 * LeadsListView - Leads list with filtering and pagination
 */

import { useState, useCallback } from 'react'
import { FiPlus, FiSearch } from 'react-icons/fi'
import { useList } from '../../../components/hooks'
import { DataTable, type ColumnDef } from '../../../components/ui/tables'
import { formatLocalizedDate } from '../../../i18n/date-format'
import { services } from '../../../services'
import type { Lead, LeadsListParams } from '../../../services/contracts'

export interface LeadsListViewProps {
	onRowClick?: (lead: Lead) => void
	onCreateNew?: () => void
}

export function LeadsListView({ onRowClick, onCreateNew }: LeadsListViewProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const [filters, setFilters] = useState<LeadsListParams>({
		search: '',
		page: 1,
		page_size: 20,
	})

	const fetcher = useCallback(
		(params?: LeadsListParams) => services.leads.listLeads(params),
		[]
	)

	const [state, actions] = useList<Lead, LeadsListParams>(fetcher, {
		params: filters,
		autoFetch: true,
	})

	const columns: ColumnDef<Lead>[] = [
		{
			id: 'full_name',
			header: 'Name',
			accessorKey: 'full_name',
			cell: lead => <span className='font-medium'>{lead.full_name}</span>,
		},
		{
			id: 'phone',
			header: 'Phone',
			accessorKey: 'phone',
			cell: lead => lead.phone || '-',
		},
		{
			id: 'source',
			header: 'Source',
			accessorKey: 'source',
			cell: lead => lead.source || '-',
		},
		{
			id: 'status',
			header: 'Status',
			accessorKey: 'status',
			cell: lead => (
				<span className='inline-block rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-600'>
					{lead.status || 'New'}
				</span>
			),
		},
		{
			id: 'created_at',
			header: 'Created',
			accessorKey: 'created_at',
			cell: lead =>
				formatLocalizedDate(lead.created_at, 'uz', {
					locale: 'uz-UZ',
					withYear: true,
					withTime: false,
					shortMonth: true,
					fallback: '-',
				}),
		},
	]

	const handleSearch = (value: string) => {
		setSearchQuery(value)
		actions.setPage(1)
		setFilters(prev => ({ ...prev, search: value }))
	}

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-center justify-between gap-4'>
				<h1 className='text-xl font-bold text-text-primary'>Leads</h1>
				<button
					onClick={onCreateNew}
					className='inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-accent'
				>
					<FiPlus />
					New Lead
				</button>
			</div>

			<div className='relative'>
				<FiSearch className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted' />
				<input
					type='text'
					placeholder='Search leads...'
					value={searchQuery}
					onChange={e => handleSearch(e.target.value)}
					className='w-full rounded-lg border border-border-soft bg-surface-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20'
				/>
			</div>

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
				emptyMessage='No leads found'
				rowKey={lead => lead.id}
			/>
		</div>
	)
}
