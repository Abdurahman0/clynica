/**
 * ProductsListView - Products list with category filtering and pagination
 */

import { useState, useEffect, useCallback } from 'react'
import { FiPlus, FiSearch } from 'react-icons/fi'
import { useList } from '../../../components/hooks'
import { FilterSelect } from '../../../components/shared/data'
import { DataTable, type ColumnDef } from '../../../components/ui/tables'
import { services } from '../../../services'
import type {
	PaginatedResponse,
	Product,
	ProductCategory,
	ProductsListParams,
} from '../../../services/contracts'

export interface ProductsListViewProps {
	onRowClick?: (product: Product) => void
	onCreateNew?: () => void
}

export function ProductsListView({
	onRowClick,
	onCreateNew,
}: ProductsListViewProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedCategory, setSelectedCategory] = useState('')
	const [filters, setFilters] = useState<ProductsListParams>({
		search: '',
		category: '',
		page: 1,
		page_size: 20,
	})

	// Load categories
	const [categories, setCategories] = useState<ProductCategory[]>([])
	useEffect(() => {
		services.products
			.listCategories({ page_size: 100 })
			.then((res: PaginatedResponse<ProductCategory>) => {
			setCategories(res.items)
			})
	}, [])

	// Memoize the fetcher to prevent infinite loops
	const fetcher = useCallback(
		(params?: ProductsListParams) =>
			services.products.listProducts(
				params,
			) as Promise<PaginatedResponse<Product>>,
		[],
	)

	const [state, actions] = useList(
		fetcher,
		{
			params: filters,
			autoFetch: true,
		},
	)

	const columns: ColumnDef<Product>[] = [
		{
			id: 'name',
			header: 'Product Name',
			accessorKey: 'name',
			cell: product => <span className='font-medium'>{product.name}</span>,
		},
		{
			id: 'category',
			header: 'Category',
			cell: product => product.category?.name || '—',
		},
		{
			id: 'sku',
			header: 'SKU',
			accessorKey: 'sku',
			cell: product => product.sku || '—',
		},
		{
			id: 'price',
			header: 'Price',
			cell: product => (
				<span className='font-semibold'>
					{product.currency || '$'} {product.price?.toFixed(2) || '0.00'}
				</span>
			),
		},
		{
			id: 'stock',
			header: 'Stock',
			cell: product => {
				const stock = product.stock_quantity ?? 0
				const color =
					stock > 10
						? 'text-green-600'
						: stock > 0
							? 'text-yellow-600'
							: 'text-red-600'
				return <span className={color}>{stock} units</span>
			},
		},
		{
			id: 'status',
			header: 'Status',
			cell: product => {
				const statusColor =
					product.status === 'active'
						? 'bg-green-500/20 text-green-600'
						: 'bg-gray-500/20 text-gray-600'
				return (
					<span
						className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor}`}
					>
						{product.status || 'Active'}
					</span>
				)
			},
		},
	]

	const handleSearch = (value: string) => {
		setSearchQuery(value)
		actions.setPage(1)
		setFilters(prev => ({ ...prev, search: value }))
	}

	const handleCategoryChange = (category: string) => {
		setSelectedCategory(category)
		actions.setPage(1)
		setFilters(prev => ({ ...prev, category: category || undefined }))
	}

	return (
		<div className='flex flex-col gap-4'>
			{/* Header */}
			<div className='flex items-center justify-between gap-4'>
				<h1 className='text-xl font-bold text-text-primary'>Products</h1>
				<button
					onClick={onCreateNew}
					className='inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-accent'
				>
					<FiPlus />
					New Product
				</button>
			</div>

			{/* Filters */}
			<div className='flex flex-col gap-3 md:flex-row'>
				<div className='relative flex-1'>
					<FiSearch className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted' />
					<input
						type='text'
						placeholder='Search products...'
						value={searchQuery}
						onChange={e => handleSearch(e.target.value)}
						className='w-full rounded-lg border border-border-soft bg-surface-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20'
					/>
				</div>

				<div className='min-w-[220px]'>
					<FilterSelect
						value={selectedCategory}
						onChange={handleCategoryChange}
						options={[
							{ value: '', label: 'All Categories' },
							...categories.map(cat => ({
								value: String(cat.id),
								label: cat.name,
							})),
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
				emptyMessage='No products found'
				rowKey={product => product.id}
			/>
		</div>
	)
}
