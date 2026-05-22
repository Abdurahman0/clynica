// @ts-nocheck

import type { ProductService } from '../core/contracts';
import type {
  EntityId,
  PaginatedResult,
  ProductCategoryListParams,
  ProductCategoryMutationInput,
  ProductCategoryPatchInput,
  ProductMutationInput,
  ProductPatchInput,
  TableQueryParams,
} from '../../types/domain';
import { apiClient } from '../../lib/api-client';
import {
  mapProductCategoryDtoToModel,
  mapProductCategoryListDtoToItems,
  mapProductDtoToModel,
  mapProductListDtoToItems,
  type ProductCategoryDto,
  type ProductDto,
} from '../adapters/product-adapter';

function isNotFoundError(error: unknown): boolean {
  const status =
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status;

  return status === 404;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toPaginatedResult<T>(
  allItems: T[],
  params?: { page?: number; pageSize?: number; page_size?: number },
  totalItemsHint?: number | null,
): PaginatedResult<T> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? params?.page_size ?? 10);
  const start = (page - 1) * pageSize;
  const hasServerPaginationHint = typeof totalItemsHint === 'number' && totalItemsHint >= 0;

  const items = hasServerPaginationHint ? allItems : allItems.slice(start, start + pageSize);
  const totalItems = hasServerPaginationHint ? totalItemsHint : allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    items,
    meta: {
      page: Math.min(page, totalPages),
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

function toMutationPayload(input: ProductMutationInput | ProductPatchInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    payload.name = input.name;
  }
  if (input.description !== undefined) {
    payload.description = input.description;
  }
  if (input.price !== undefined) {
    payload.price = input.price;
  }
  if (input.stockQuantity !== undefined) {
    payload.stock_quantity = input.stockQuantity;
  }
  if (input.minimalStock !== undefined) {
    payload.minimal_stock = input.minimalStock;
  }
  if (input.isActive !== undefined) {
    payload.is_active = input.isActive;
  }
  if (input.isRecommended !== undefined) {
    payload.is_recommended = input.isRecommended;
  }
  if (input.subsidyEnabled !== undefined) {
    payload.subsidy_enabled = input.subsidyEnabled;
  }
  if (input.categoryId !== undefined) {
    const normalizedCategoryId =
      typeof input.categoryId === 'string' ? input.categoryId.trim() : input.categoryId;
    payload.category = normalizedCategoryId;
  }
  if (input.metadata !== undefined) {
    payload.metadata = input.metadata;
  }
  return payload;
}

function toMutationFormData(input: ProductMutationInput | ProductPatchInput): FormData {
  const payload = toMutationPayload(input);
  const fd = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (key === 'metadata' && typeof value === 'object') {
      fd.append(key, JSON.stringify(value));
      return;
    }
    fd.append(key, String(value));
  });

  if (input.image instanceof File) {
    fd.append('image', input.image);
  }
  if (input.imageAltText !== undefined) {
    fd.append('image_alt_text', String(input.imageAltText ?? ''));
  }
  if (input.imageIsPrimary !== undefined) {
    fd.append('image_is_primary', input.imageIsPrimary ? 'true' : 'false');
  }

  return fd;
}

function toCategoryMutationPayload(
  input: ProductCategoryMutationInput | ProductCategoryPatchInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    payload.name = input.name;
  }
  if (input.code !== undefined) {
    payload.code = input.code;
  }
  const sortOrderCandidate = (input as ProductCategoryMutationInput).sortOrder;
  if (sortOrderCandidate !== undefined) {
    const parsedSortOrder = Number(sortOrderCandidate);
    if (Number.isFinite(parsedSortOrder)) {
      payload.sort_order = Math.max(0, Math.floor(parsedSortOrder));
    }
  }
  return payload;
}

export const apiProductService: ProductService = {
  async list(params) {
    return apiProductService.listProducts(params);
  },

  async getById(id) {
    return apiProductService.getProductById(id);
  },

  async listProducts(params) {
    const ordering =
      params?.ordering ??
      (params?.sortBy
        ? `${params?.sortDirection === 'desc' ? '-' : ''}${params.sortBy}`
        : undefined);

    const sort =
      ordering === 'price'
        ? 'price_asc'
        : ordering === '-price'
          ? 'price_desc'
          : ordering === 'cheap_first'
            ? 'cheap_first'
            : ordering === 'expensive_first'
              ? 'expensive_first'
              : undefined;

    const { data } = await apiClient.get<unknown>('/api/products/', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? params?.page_size,
        search: params?.search,
        ordering: sort ? undefined : ordering,
        sort,
      },
    });

    const items = mapProductListDtoToItems(data);
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null;
    const totalItemsHint = readNumber(payload?.count);

    return toPaginatedResult(items, params, totalItemsHint);
  },

  async getProductById(id) {
    const { data } = await apiClient.get<ProductDto>(`/api/products/${id}/`);
    return mapProductDtoToModel(data);
  },

  async create(input) {
    return apiProductService.createProduct(input);
  },

  async createProduct(input) {
    const payload =
      input?.image instanceof File || input?.imageAltText !== undefined || input?.imageIsPrimary !== undefined
        ? toMutationFormData(input)
        : toMutationPayload(input);
    const { data } = await apiClient.post<ProductDto>('/api/products/', payload);
    return mapProductDtoToModel(data);
  },

  async update(id, input) {
    return apiProductService.updateProduct(id, input);
  },

  async updateProduct(id, input) {
    const hasImage = input?.image instanceof File;
    const { data } = await apiClient.patch<ProductDto>(
      `/api/products/${id}/`,
      hasImage ? toMutationFormData(input) : toMutationPayload(input),
    );
    return mapProductDtoToModel(data);
  },

  async patch(id, input) {
    return apiProductService.patchProduct(id, input);
  },

  async patchProduct(id, input) {
    const hasImage = input?.image instanceof File;
    const { data } = await apiClient.patch<ProductDto>(
      `/api/products/${id}/`,
      hasImage ? toMutationFormData(input) : toMutationPayload(input),
    );
    return mapProductDtoToModel(data);
  },

  async delete(id) {
    return apiProductService.deleteProduct(id);
  },

  async deleteProduct(id: EntityId) {
    await apiClient.delete(`/api/products/${id}/`);
    return true;
  },

  async deleteProductImage(productId: EntityId, imageId: EntityId) {
    const { data } = await apiClient.delete<unknown>(
      `/api/products/${productId}/images/${imageId}/`,
    );

    const payload = toRecord(data);
    const nested = payload ? toRecord(payload.data) : null;
    const deletedId = readString(nested?.deleted_image_id) || readString(payload?.deleted_image_id);

    return deletedId || imageId;
  },

  async listProductCategories(params?: ProductCategoryListParams) {
    const { data } = await apiClient.get<unknown>('/api/products/categories/', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? params?.page_size,
        search: params?.search,
        ordering: params?.ordering,
      },
    });

    const items = mapProductCategoryListDtoToItems(data);
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null;
    const totalItemsHint = readNumber(payload?.count);

    return toPaginatedResult(items, params, totalItemsHint);
  },

  async getProductCategoryById(id) {
    const { data } = await apiClient.get<ProductCategoryDto>(`/api/products/categories/${id}/`);
    return mapProductCategoryDtoToModel(data);
  },

  async createProductCategory(input) {
    const { data } = await apiClient.post<ProductCategoryDto>(
      '/api/products/categories/',
      toCategoryMutationPayload(input),
    );
    return mapProductCategoryDtoToModel(data);
  },

  async updateProductCategory(id, input) {
    const { data } = await apiClient.patch<ProductCategoryDto>(
      `/api/products/categories/${id}/`,
      toCategoryMutationPayload(input),
    );
    return mapProductCategoryDtoToModel(data);
  },

  async patchProductCategory(id, input) {
    const { data } = await apiClient.patch<ProductCategoryDto>(
      `/api/products/categories/${id}/`,
      toCategoryMutationPayload(input),
    );
    return mapProductCategoryDtoToModel(data);
  },

  async deleteProductCategory(id: EntityId) {
    await apiClient.delete(`/api/products/categories/${id}/`);
    return true;
  },

};
