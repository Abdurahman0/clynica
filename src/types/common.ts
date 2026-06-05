export type EntityId = string;

export type TimestampString = string;

export type CurrencyCode = string;

export type SortDirection = 'asc' | 'desc';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface DateRange {
  from?: TimestampString;
  to?: TimestampString;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  color?: string;
  disabled?: boolean;
}

export interface ApiState {
  status: AsyncStatus;
  errorMessage?: string;
}

export interface BaseFilterParams {
  search?: string;
  dateRange?: DateRange;
}

export interface TableQueryParams extends BaseFilterParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: SortDirection;
  assignedOperator?: EntityId;
  assigned_operator?: EntityId;
  category?: EntityId;
  category_id?: EntityId;
  currency?: CurrencyCode;
  isActive?: boolean;
  is_active?: boolean;
  status?: string;
  source?: string;
  aiGenerated?: boolean;
  ai_generated?: boolean;
  reviewsEnabled?: boolean;
  reviews_enabled?: boolean;
  ordering?: string;
  brand?: EntityId;
  fulfillmentMethod?: string;
  fulfillment_method?: string;
}

export interface AuditInfo {
  createdAt: TimestampString;
  updatedAt: TimestampString;
  createdById?: EntityId;
  updatedById?: EntityId;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  username?: string;
}

export interface AddressInfo {
  line1: string;
  line2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

export type PlatformChannel =
  | 'instagram'
  | 'telegram'
  | 'manual'
  | 'web'
  | 'whatsapp'
  | 'facebook'
  | 'website'
  | 'marketplace'
  | 'webchat'
  | 'referral'
  | 'other';
