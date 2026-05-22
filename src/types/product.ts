import type { AuditInfo, CurrencyCode, EntityId } from './common';

export type ProductStatus = 'draft' | 'active' | 'out-of-stock' | 'archived';
export type ProductStockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductCategory extends AuditInfo {
  id: EntityId;
  name: string;
  code: string;
  sortOrder: number;
  description?: string;
  image?: string | null;
  imageUrl?: string;
  isActive: boolean;
}

export interface ProductCategoryListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
  isActive?: boolean;
  is_active?: boolean;
}

export interface ProductCategoryMutationInput {
  name: string;
  code: string;
  sortOrder?: number;
  description?: string;
  image?: File | null;
  isActive?: boolean;
}

export interface ProductCategoryPatchInput
  extends Partial<ProductCategoryMutationInput> {}

export interface ProductImage extends AuditInfo {
  id: EntityId;
  sortOrder: number;
  image?: string | null;
  imageUrl: string;
}

export interface ProductSummary {
  id: EntityId;
  name: string;
  sku?: string;
  price: number;
  currency: CurrencyCode;
  imageUrl?: string;
}

export interface Product extends AuditInfo {
  id: EntityId;
  name: string;
  sku?: string;
  description?: string;
  categoryId?: EntityId;
  categoryName?: string;
  category?: ProductCategory;
  price: number;
  isRecommended: boolean;
  subsidyEnabled: boolean;
  subsidyAmount: number;
  priceAfterSubsidy: number;
  promoPrice?: number;
  currency: CurrencyCode;
  stockQuantity?: number;
  minimalStock?: number;
  isLowStock?: boolean;
  stockStatus?: ProductStockStatus;
  reviewsEnabled: boolean;
  isActive: boolean;
  embedding?: number[] | null;
  metadata?: Record<string, string | number | boolean | null> | null;
  status: ProductStatus;
  imageUrl?: string;
  images: ProductImage[];
}

export interface ProductMutationInput {
  name: string;
  sku?: string;
  description: string;
  categoryId?: EntityId | null;
  price: number;
  isRecommended?: boolean;
  subsidyEnabled?: boolean;
  currency?: CurrencyCode;
  stockQuantity: number;
  minimalStock: number;
  reviewsEnabled?: boolean;
  isActive: boolean;
  // Image can be supplied with the product mutation via multipart/form-data.
  image?: File | null;
  imageAltText?: string;
  imageIsPrimary?: boolean;
}

export interface ProductPatchInput extends Partial<ProductMutationInput> {}
