// @ts-nocheck


import type { Product, ProductCategory, ProductImage, ProductStockStatus } from '../../types/domain';

export type ProductDto = Record<string, unknown>;
export type ProductImageDto = Record<string, unknown>;
export type ProductCategoryDto = Record<string, unknown>;

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return fallback;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function readInteger(value: unknown, fallback = 0): number {
  return Math.floor(readNumber(value, fallback));
}

function readBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return value == null ? fallback : Boolean(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function normalizeMetadataValue(
  value: unknown,
): string | number | boolean | null {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function mapMetadata(
  value: unknown,
): Product['metadata'] {
  if (!value) {
    return undefined;
  }

  const record = toRecord(value);
  if (!record) {
    return undefined;
  }

  const mapped: Record<string, string | number | boolean | null> = {};
  for (const [key, metadataValue] of Object.entries(record)) {
    mapped[key] = normalizeMetadataValue(metadataValue);
  }

  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function resolveProductStatus(
  isActive: boolean,
  stockQuantity: number,
): Product['status'] {
  if (!isActive) {
    return 'archived';
  }

  if (stockQuantity <= 0) {
    return 'out-of-stock';
  }

  return 'active';
}

function resolveStockStatus(
  stockQuantity: number,
  minimalStock: number,
  rawStatus?: string,
): ProductStockStatus {
  if (rawStatus === 'in_stock' || rawStatus === 'low_stock' || rawStatus === 'out_of_stock') {
    return rawStatus;
  }

  if (stockQuantity <= 0) {
    return 'out_of_stock';
  }

  if (stockQuantity <= minimalStock) {
    return 'low_stock';
  }

  return 'in_stock';
}

export function mapProductImageDtoToModel(
  dto: ProductImageDto,
  index = 0,
): ProductImage {
  const nowIso = new Date().toISOString();
  const imageUrl = readString(dto.image) || readString(dto.image_url);

  return {
    id: readString(dto.id) || `product-image-${nowIso}-${index}`,
    createdAt: readString(dto.created_at, nowIso),
    updatedAt: readString(dto.updated_at, nowIso),
    sortOrder: readInteger(dto.sort_order, index),
    image: readString(dto.image) || null,
    imageUrl,
  };
}

function mapImages(
  value: unknown,
): ProductImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toRecord(item))
    .filter((item): item is ProductImageDto => item !== null)
    .map((item, index) => mapProductImageDtoToModel(item, index))
    .filter((image) => image.imageUrl.length > 0);
}

export function mapProductDtoToModel(dto: ProductDto): Product {
  const nowIso = new Date().toISOString();
  const price = readNumber(dto.price, 0);
  const subsidyEnabled = readBoolean(dto.subsidy_enabled ?? dto.subsidyEnabled, true);
  const subsidyAmount = readNumber(dto.subsidy_amount ?? dto.subsidyAmount, 0);
  const priceAfterSubsidy = readNumber(dto.price_after_subsidy ?? dto.priceAfterSubsidy, price);
  const stockQuantity = readInteger(dto.stock_quantity, 0);
  const minimalStock = readInteger(dto.minimal_stock, 0);
  const stockStatus = resolveStockStatus(
    stockQuantity,
    minimalStock,
    readString(dto.stock_status) || undefined,
  );
  const isLowStock =
    readBoolean(dto.is_low_stock, stockStatus === 'low_stock');
  const isActive = readBoolean(dto.is_active);
  const reviewsEnabled = readBoolean(dto.reviews_enabled ?? dto.reviewsEnabled);
  const metadata = mapMetadata(dto.metadata);
  const images = mapImages(dto.images);
  const firstImageUrl =
    readString(dto.primary_image_url) ||
    images[0]?.imageUrl ||
    readString(dto.image) ||
    readString(dto.image_url) ||
    undefined;

  // Category mapping
  const categoryRecord = toRecord(dto.category);
  const categoryIdFromDto = readString(dto.category_id);
  const categoryIdFromObject = readString(categoryRecord?.id);
  const categoryNameFromDto = readString(dto.category_name);
  const categoryNameFromObject = readString(categoryRecord?.name);
  const categoryFromDto = readString(dto.category);
  const categoryIdFromRaw = isUuid(categoryFromDto) ? categoryFromDto : '';

  const categoryId = categoryIdFromDto || categoryIdFromObject || categoryIdFromRaw || undefined;
  const categoryName =
    categoryNameFromDto ||
    categoryNameFromObject ||
    (categoryFromDto && !isUuid(categoryFromDto) ? categoryFromDto : '') ||
    undefined;

  const category = categoryRecord
    ? mapProductCategoryDtoToModel(categoryRecord as ProductCategoryDto)
    : undefined;

  return {
    id: readString(dto.id) || `product-${nowIso}`,
    name: readString(dto.name) || "Noma'lum mahsulot",
    sku: readString(dto.sku) || undefined,
    description: readString(dto.description) || undefined,
    categoryId,
    categoryName,
    category,
    price,
    isRecommended: readBoolean(dto.is_recommended ?? dto.isRecommended, false),
    subsidyEnabled,
    subsidyAmount: subsidyEnabled ? subsidyAmount : 0,
    priceAfterSubsidy: subsidyEnabled ? priceAfterSubsidy : price,
    promoPrice: undefined,
    currency: readString(dto.currency, 'UZS'),
    stockQuantity,
    minimalStock,
    stockStatus,
    isLowStock,
    reviewsEnabled,
    isActive,
    embedding: null,
    metadata,
    status: resolveProductStatus(isActive, stockQuantity),
    imageUrl: firstImageUrl,
    images: images,
    createdAt: readString(dto.created_at, nowIso),
    updatedAt: readString(dto.updated_at, nowIso),
  };
}

export function mapProductListDtoToItems(value: unknown): Product[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is ProductDto => item !== null)
      .map((item) => mapProductDtoToModel(item));
  }

  const payload = toRecord(value);
  if (!payload) {
    return [];
  }

  const results = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.data)
      ? payload.data
    : Array.isArray(payload.items)
      ? payload.items
      : [];

  return results
    .map((item) => toRecord(item))
    .filter((item): item is ProductDto => item !== null)
    .map((item) => mapProductDtoToModel(item));
}

export function mapProductCategoryDtoToModel(
  dto: ProductCategoryDto,
): ProductCategory {
  const nowIso = new Date().toISOString();

  const imageUrl = readString(dto.image_url) || readString(dto.image) || undefined;

  return {
    id: readString(dto.id) || `product-category-${nowIso}`,
    name: readString(dto.name),
    code: readString(dto.code),
    sortOrder: readInteger(dto.sort_order, 0),
    description: readString(dto.description) || undefined,
    image: readString(dto.image) || null,
    imageUrl,
    isActive: readBoolean(dto.is_active, true),
    createdAt: readString(dto.created_at, nowIso),
    updatedAt: readString(dto.updated_at, nowIso),
  };
}

export function mapProductCategoryListDtoToItems(value: unknown): ProductCategory[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is ProductCategoryDto => item !== null)
      .map((item) => mapProductCategoryDtoToModel(item));
  }

  const payload = toRecord(value);
  if (!payload) {
    return [];
  }

  const results = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.data)
      ? payload.data
    : Array.isArray(payload.items)
      ? payload.items
      : [];

  return results
    .map((item) => toRecord(item))
    .filter((item): item is ProductCategoryDto => item !== null)
    .map((item) => mapProductCategoryDtoToModel(item));
}

