/**
 * Products service adapter implementation
 */

import { BaseCrudAdapter } from './base-crud.adapter'
import { ApiRequestor } from './api-requestor'
import type {
	CreateCategoryInput,
	CreateProductInput,
	IProductsService,
	PaginatedResponse,
	Product,
	ProductCategory,
	ProductsListParams,
	UpdateCategoryInput,
	UpdateProductInput,
	CategoriesListParams,
} from '../../contracts'

export class ProductsAdapter
	extends BaseCrudAdapter<
		Product,
		ProductsListParams,
		CreateProductInput,
		UpdateProductInput
	>
	implements IProductsService
{
	private categoryRequestor: ApiRequestor

	constructor(baseUrl: string) {
		super({
			endpoint: '/api/products/',
			baseUrl,
		})
		this.categoryRequestor = new ApiRequestor(baseUrl)
	}

	// Products
	async listProducts(
		params?: ProductsListParams,
	): Promise<PaginatedResponse<Product>> {
		return this.list(params)
	}

	async getProduct(id: string): Promise<Product> {
		return this.get(id)
	}

	async createProduct(input: CreateProductInput): Promise<Product> {
		return this.create(input)
	}

	async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
		return this.update(id, input)
	}

	async deleteProduct(id: string): Promise<void> {
		return this.delete(id)
	}

	// Categories
	async listCategories(
		params?: CategoriesListParams,
	): Promise<PaginatedResponse<ProductCategory>> {
		return this.categoryRequestor.get<PaginatedResponse<ProductCategory>>(
			'/api/products/categories/',
			params as Record<string, unknown>,
		)
	}

	async getCategory(id: string): Promise<ProductCategory> {
		return this.categoryRequestor.get<ProductCategory>(
			`/api/products/categories/${id}/`,
		)
	}

	async createCategory(input: CreateCategoryInput): Promise<ProductCategory> {
		return this.categoryRequestor.post<ProductCategory>(
			'/api/products/categories/',
			input,
		)
	}

	async updateCategory(
		id: string,
		input: UpdateCategoryInput,
	): Promise<ProductCategory> {
		return this.categoryRequestor.patch<ProductCategory>(
			`/api/products/categories/${id}/`,
			input,
		)
	}

	async deleteCategory(id: string): Promise<void> {
		await this.categoryRequestor.delete(`/api/products/categories/${id}/`)
	}

	// Bulk operations
	async bulkUpdateProducts(
		ids: string[],
		input: UpdateProductInput,
	): Promise<Product[]> {
		return Promise.all(ids.map(id => this.updateProduct(id, input)))
	}

	async bulkDeleteProducts(ids: string[]): Promise<void> {
		await Promise.all(ids.map(id => this.deleteProduct(id)))
	}
}
