import type {
  AISetting,
  AISettingMutationInput,
  AISettingPatchInput,
  AISettingsListParams,
  IntegrationConfig,
  IntegrationConfigListParams,
  IntegrationConfigMutationInput,
  IntegrationConfigPatchInput,
  IntegrationEvent,
  IntegrationEventListParams,
  AppLog,
  AppNotification,
  AppUser,
  ChatMessage,
  Conversation,
  EntityId,
  Lead,
  LeadMutationInput,
  LeadPatchInput,
  MessageListParams,
  NotificationListParams,
  PaginatedResult,
  Product,
  ProductMutationInput,
  ProductPatchInput,
  SendMessageInput,
  SessionListParams,
  TableQueryParams,
  ManagedUser,
  LogCleanupSettingsPatchInput,
  LogListParams,
  SystemHealth,
  UserListParams,
  UserMutationInput,
  UserPatchInput,
  UserPermission,
} from '../../types/domain';

export type ServiceModuleKey =
  | 'dashboard'
  | 'leads'
  | 'clients'
  | 'products'
  | 'contracts'
  | 'conversations'
  | 'notifications'
  | 'integrations'
  | 'logs'
  | 'aiSettings'
  | 'users';

export interface DashboardDateRange {
  date_from: string;
  date_to: string;
  interval: string;
  label_format: string;
  timezone: string;
}

export interface DashboardBreakdownItem {
  key: string;
  label: string;
  count: number;
}

export interface DashboardTopProduct {
  product_id?: string;
  key: string;
  label: string;
  count: number;
  revenue?: string;
}

export interface DashboardRegionDemandItem {
  region: string;
  total: number;
}

export interface DashboardManagerPerformanceItem {
  manager_id: string | null;
  manager_username: string;
  total: number;
  won: number;
  lost: number;
}

export interface DashboardFilteredSummary {
  leads: number;
  new_leads: number;
  converted_leads: number;
  clients: number;
  new_customers?: number;
  new_clients: number;
  total_contracts: number;
  active_contracts: number;
  completed_orders?: number;
  total_chat_sessions?: number;
  active_chat_sessions?: number;
  pending_payment_amount?: string;
  revenue: string;
  collected_amount: string;
  average_order_value?: string;
  average_contract_value: string;
  order_completion_rate?: string;
  lead_conversion_rate: string;
  contract_renewal_rate: string;
}

export interface DashboardBreakdowns {
  leads_by_status: DashboardBreakdownItem[];
  leads_by_source: DashboardBreakdownItem[];
  contracts_by_status: DashboardBreakdownItem[];
  orders_by_status?: DashboardBreakdownItem[];
  payments_by_status?: DashboardBreakdownItem[];
  products_by_category: DashboardBreakdownItem[];
  chats_by_channel: DashboardBreakdownItem[];
  top_products: DashboardTopProduct[];
}

export interface DashboardTimeSeriesPoint {
  bucket_start: string;
  bucket_end: string;
  label: string;
  leads: number;
  chats: number;
  clients: number;
  contracts: number;
  revenue: string;
  collected_amount: string;
}

export interface DashboardOverview {
  leads: number;
  clients: number;
  instagram_leads?: number;
  telegram_leads?: number;
  manual_leads?: number;
  closed_sales?: number;
  lost_leads?: number;
  installations?: number;
  products?: number;
  chats?: number;
  notifications?: number;
  customers?: number;
  orders?: number;
  pending_payments?: number;
  contracts: number;
  unread_messages: number;
  revenue: string;
  collected_amount?: string;
  pipeline_amount?: string;
  delivered_amount?: string;
  subsidy_amount?: string;
  date_range: DashboardDateRange;
  filtered_summary: DashboardFilteredSummary;
  breakdowns: DashboardBreakdowns;
  time_series: DashboardTimeSeriesPoint[];
  region_demand?: DashboardRegionDemandItem[];
  manager_performance?: DashboardManagerPerformanceItem[];
}

export type DashboardInterval = 'day' | 'week' | 'month';

export interface DashboardOverviewParams {
  date_from?: string;
  date_to?: string;
  interval?: DashboardInterval;
}

export interface DashboardService {
  getOverview(params?: DashboardOverviewParams): Promise<DashboardOverview>;
}

export interface LeadService {
  list(params?: TableQueryParams): Promise<PaginatedResult<Lead>>;
  getById(id: EntityId): Promise<Lead | null>;
  listLeads(params?: TableQueryParams): Promise<PaginatedResult<Lead>>;
  getLeadById(id: EntityId): Promise<Lead | null>;
  create(input: LeadMutationInput): Promise<Lead>;
  createLead(input: LeadMutationInput): Promise<Lead>;
  update(id: EntityId, input: LeadMutationInput): Promise<Lead | null>;
  updateLead(id: EntityId, input: LeadMutationInput): Promise<Lead | null>;
  patch(id: EntityId, input: LeadPatchInput): Promise<Lead | null>;
  patchLead(id: EntityId, input: LeadPatchInput): Promise<Lead | null>;
  delete(id: EntityId): Promise<boolean>;
  deleteLead(id: EntityId): Promise<boolean>;
}

export interface ProductService {
  list(params?: TableQueryParams): Promise<PaginatedResult<Product>>;
  getById(id: EntityId): Promise<Product | null>;
  listProducts(params?: TableQueryParams): Promise<PaginatedResult<Product>>;
  getProductById(id: EntityId): Promise<Product | null>;
  create(input: ProductMutationInput): Promise<Product>;
  createProduct(input: ProductMutationInput): Promise<Product>;
  update(id: EntityId, input: ProductMutationInput): Promise<Product | null>;
  updateProduct(id: EntityId, input: ProductMutationInput): Promise<Product | null>;
  patch(id: EntityId, input: ProductPatchInput): Promise<Product | null>;
  patchProduct(id: EntityId, input: ProductPatchInput): Promise<Product | null>;
  delete(id: EntityId): Promise<boolean>;
  deleteProduct(id: EntityId): Promise<boolean>;
}

export interface ConversationService {
  listConversations(params?: SessionListParams): Promise<PaginatedResult<Conversation>>;
  getConversationById(id: EntityId): Promise<Conversation | null>;
  listMessages(conversationId: EntityId, params?: MessageListParams): Promise<PaginatedResult<ChatMessage>>;
  getMessageById(conversationId: EntityId, messageId: EntityId): Promise<ChatMessage | null>;
  sendMessage(conversationId: EntityId, input: SendMessageInput): Promise<ChatMessage>;
}

export interface NotificationService {
  listNotifications(params?: NotificationListParams): Promise<PaginatedResult<AppNotification>>;
  getNotificationById(id: EntityId): Promise<AppNotification | null>;
  markAsRead(id: EntityId): Promise<AppNotification | null>;
  markAllAsRead(): Promise<boolean>;
  delete(id: EntityId): Promise<boolean>;
}

export interface IntegrationsService {
  listConfigs(params?: IntegrationConfigListParams): Promise<PaginatedResult<IntegrationConfig>>;
  getConfigById(id: EntityId): Promise<IntegrationConfig | null>;
  createConfig(input: IntegrationConfigMutationInput): Promise<IntegrationConfig>;
  updateConfig(id: EntityId, input: IntegrationConfigMutationInput): Promise<IntegrationConfig | null>;
  patchConfig(id: EntityId, input: IntegrationConfigPatchInput): Promise<IntegrationConfig | null>;
  deleteConfig(id: EntityId): Promise<boolean>;
  listEvents(params?: IntegrationEventListParams): Promise<PaginatedResult<IntegrationEvent>>;
}

export interface AISettingsService {
  listSettings(params?: AISettingsListParams): Promise<PaginatedResult<AISetting>>;
  getSettingById(id: EntityId): Promise<AISetting | null>;
  createSetting(input: AISettingMutationInput): Promise<AISetting>;
  updateSetting(id: EntityId, input: AISettingMutationInput): Promise<AISetting | null>;
  patchSetting(id: EntityId, input: AISettingPatchInput): Promise<AISetting | null>;
  deleteSetting(id: EntityId): Promise<boolean>;
}

export interface LogsService {
  listLogs(params?: LogListParams): Promise<PaginatedResult<AppLog>>;
  getLogById(id: EntityId): Promise<AppLog | null>;
  getSystemHealth(): Promise<SystemHealth>;
  updateLogCleanupSettings(input: LogCleanupSettingsPatchInput): Promise<AppLog | null>;
}

export interface UserService {
  list(params?: UserListParams): Promise<PaginatedResult<ManagedUser>>;
  getById(id: EntityId): Promise<ManagedUser | null>;
  listUsers(params?: UserListParams): Promise<PaginatedResult<ManagedUser>>;
  getUserById(id: EntityId): Promise<ManagedUser | null>;
  getManagedUser(id: EntityId): Promise<ManagedUser | null>;
  createUser(input: UserMutationInput): Promise<ManagedUser>;
  updateUser(id: EntityId, input: UserMutationInput): Promise<ManagedUser | null>;
  patchUser(id: EntityId, input: UserPatchInput): Promise<ManagedUser | null>;
  deleteUser(id: EntityId): Promise<boolean>;
  listUserPermissions(userId: EntityId): Promise<UserPermission[]>;
  getUserPermissions(userId: EntityId): Promise<UserPermission[]>;
}

export type AllServices = {
  dashboard: DashboardService;
  leads: LeadService;
  products: ProductService;
  conversations: ConversationService;
  notifications: NotificationService;
  integrations: IntegrationsService;
  aiSettings: AISettingsService;
  logs: LogsService;
  users: UserService;
};

