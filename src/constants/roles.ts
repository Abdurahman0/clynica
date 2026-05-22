import type { SelectOption } from '../types/common';
import type { AppRole } from '../types/architecture';

export const APP_ROLES = [
  'developer',
  'admin',
  'operator',
] as const satisfies readonly AppRole[];

export const ROLE_LABELS: Record<AppRole, string> = {
  developer: 'Developer',
  admin: 'Admin',
  operator: 'Operator',
};

export const ROLE_OPTIONS: SelectOption[] = [
  { value: 'developer', label: ROLE_LABELS.developer },
  { value: 'admin', label: ROLE_LABELS.admin },
  { value: 'operator', label: ROLE_LABELS.operator },
];
