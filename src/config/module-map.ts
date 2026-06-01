import type { AppModule } from '../types/architecture';

// Renaissance Clinic Admin Dashboard Modules
export const moduleMap: AppModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Live KPI and operational metrics overview.',
    category: 'operational',
    priority: 'foundation',
    priorityOrder: 1,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'dashboard-home',
        label: 'Dashboard',
        kind: 'overview',
        path: '/dashboard',
        notes: 'Main KPI dashboard with date filters.',
      },
    ],
    notes: 'Main operational dashboard for all roles.',
  },
  {
    id: 'clients',
    label: 'Clients',
    description: 'Client records and relationship history.',
    category: 'operational',
    priority: 'high',
    priorityOrder: 2,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'clients-list',
        label: 'Clients',
        kind: 'list',
        path: '/clients',
      },
      {
        id: 'clients-detail',
        label: 'Client Detail',
        kind: 'detail',
        path: '/clients/:id',
      },
      {
        id: 'clients-create',
        label: 'Create Client',
        kind: 'create',
        path: '/clients/new',
      },
    ],
    notes: 'Client management (converted leads).',
  },
  {
    id: 'chats',
    label: 'Chats',
    description: 'Client communication and messaging.',
    category: 'operational',
    priority: 'medium',
    priorityOrder: 3,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'chats-list',
        label: 'Chat Sessions',
        kind: 'list',
        path: '/chats',
      },
      {
        id: 'chats-detail',
        label: 'Chat Window',
        kind: 'detail',
        path: '/chats/:id',
      },
    ],
    notes: 'Real-time client messaging with WebSocket support.',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    description: 'Team tasks and kanban workflow.',
    category: 'operational',
    priority: 'medium',
    priorityOrder: 4,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'tasks-board',
        label: 'Tasks',
        kind: 'list',
        path: '/tasks',
      },
    ],
    notes: 'Internal task board for operational work.',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Third-party integrations and API setup.',
    category: 'system',
    priority: 'low',
    priorityOrder: 5,
    allowedRoles: ['developer'],
    accessStrategy: 'static-role-based',
    pages: [
      {
        id: 'integrations-list',
        label: 'Integrations',
        kind: 'configuration',
        path: '/integrations',
      },
    ],
    notes: 'Developer-only module for managing integrations.',
  },
  {
    id: 'users',
    label: 'Users',
    description: 'Team members, roles, and permissions management.',
    category: 'system',
    priority: 'low',
    priorityOrder: 6,
    allowedRoles: ['developer', 'admin'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'users-list',
        label: 'Users',
        kind: 'list',
        path: '/users',
      },
    ],
    notes: 'User administration for privileged roles.',
  },
  {
    id: 'ai-settings',
    label: 'AI Settings',
    description: 'AI agent configuration and behavior.',
    category: 'intelligence',
    priority: 'low',
    priorityOrder: 7,
    allowedRoles: ['developer'],
    accessStrategy: 'static-role-based',
    pages: [
      {
        id: 'ai-settings-overview',
        label: 'AI Settings',
        kind: 'configuration',
        path: '/ai-settings',
      },
    ],
    notes: 'Developer-only AI configuration.',
  },
];

export const crossSystemCapabilities = [
  'Authentication & Authorization',
  'Global Notifications',
  'Responsive Admin Shell',
  'Role-Based Navigation',
  'Permission-Based Route Guards',
] as const;

export const implementationOrder = [...moduleMap].sort(
  (left, right) => left.priorityOrder - right.priorityOrder,
);
