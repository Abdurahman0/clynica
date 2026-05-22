import type { SelectOption, SortDirection, TableQueryParams } from '../types/common';

export const DEFAULT_PAGE_SIZE = 20;

export const ALL_OPTION_VALUE = 'all';

export const ALL_SELECT_OPTION: SelectOption = {
  value: ALL_OPTION_VALUE,
  label: 'All',
};

export const SORT_DIRECTIONS = [
  'asc',
  'desc',
] as const satisfies readonly SortDirection[];

export const SORT_DIRECTION_LABELS: Record<SortDirection, string> = {
  asc: 'Ascending',
  desc: 'Descending',
};

export const SORT_DIRECTION_OPTIONS: SelectOption[] = [
  { value: 'asc', label: SORT_DIRECTION_LABELS.asc },
  { value: 'desc', label: SORT_DIRECTION_LABELS.desc },
];

export const TABLE_PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

export const DEFAULT_TABLE_QUERY_PARAMS: TableQueryParams = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sortDirection: 'desc',
};
