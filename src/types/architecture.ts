export type AppRole = 'developer' | 'admin' | 'operator';

export type ModuleCategory =
  | 'operational'
  | 'intelligence'
  | 'personal'
  | 'system';

export type ModulePriority =
  | 'foundation'
  | 'high'
  | 'medium'
  | 'low';

export type AccessStrategy = 'static-role-based' | 'permission-based';

export type PageKind =
  | 'overview'
  | 'list'
  | 'detail'
  | 'create'
  | 'edit'
  | 'analytics'
  | 'configuration'
  | 'queue'
  | 'log';

export interface AppPage {
  id: string;
  label: string;
  kind: PageKind;
  path: string;
  notes?: string;
}

export interface AppModule {
  id: string;
  label: string;
  description: string;
  category: ModuleCategory;
  priority: ModulePriority;
  priorityOrder: number;
  allowedRoles: AppRole[];
  accessStrategy: AccessStrategy;
  pages: AppPage[];
  notes?: string;
}
