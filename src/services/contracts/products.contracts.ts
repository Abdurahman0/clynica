/**
 * Products service contract
 */

import type {
	BaseEntity,
	CreateInput,
	ListParams,
	PaginatedResponse,
	UpdateInput,
} from './common.contracts'

export interface ProductCategory extends BaseEntity {
	name: string
	slug?: string
	description?: string
	image_url?: string
	parent_id?: string
	children?: ProductCategory[]
}

export interface Product extends BaseEntity {
	name: string
	slug?: string
	description?: string
	category_id?: string
	category?: ProductCategory
	price: number
	currency?: string
	sku?: string
	stock_quantity?: number
	image_url?: string
	images?: string[]
	status?: 'active' | 'inactive' | 'discontinued'
	is_featured?: boolean
	metadata?: Record<string, unknown>
}

export interface CreateProductInput extends CreateInput<Product> {
	name: string
	price: number
}

export interface UpdateProductInput extends UpdateInput<Product> {}

export interface CreateCategoryInput extends CreateInput<ProductCategory> {
	name: string
}

export interface UpdateCategoryInput extends UpdateInput<ProductCategory> {}

export interface ProductsListParams extends ListParams {
	category?: string
	search?: string
	price_from?: number
	price_to?: number
	status?: string
}

export interface CategoriesListParams extends ListParams {
	parent_id?: string
	search?: string
}

export interface IProductsService {
	// Products
	listProducts(params?: ProductsListParams): Promise<PaginatedResponse<Product>>
	getProduct(id: string): Promise<Product>
	createProduct(input: CreateProductInput): Promise<Product>
	updateProduct(id: string, input: UpdateProductInput): Promise<Product>
	deleteProduct(id: string): Promise<void>

	// Categories
	listCategories(
		params?: CategoriesListParams,
	): Promise<PaginatedResponse<ProductCategory>>
	getCategory(id: string): Promise<ProductCategory>
	createCategory(input: CreateCategoryInput): Promise<ProductCategory>
	updateCategory(
		id: string,
		input: UpdateCategoryInput,
	): Promise<ProductCategory>
	deleteCategory(id: string): Promise<void>

	// Bulk operations
	bulkUpdateProducts(
		ids: string[],
		input: UpdateProductInput,
	): Promise<Product[]>
	bulkDeleteProducts(ids: string[]): Promise<void>
}
