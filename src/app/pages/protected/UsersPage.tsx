
import { useEffect, useMemo, useRef, useState } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  FilterBar,
  FilterSelect,
  Pagination,
  SearchInput,
  StatusBadge,
  type DataTableColumn,
} from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import {
  EmptyState,
  LoadingState,
  PageCard,
  PageHeader,
  PageLayout,
  PageSection,
} from '../../../components/shared/page';
import { useAuth } from '../../../auth';
import UserDeleteDialog from '../../../features/users/components/UserDeleteDialog';
import UserDetailPanel from '../../../features/users/components/UserDetailPanel';
import UserFormPanel from '../../../features/users/components/UserFormPanel';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { getUserRoleLabel } from '../../../i18n/labels';
import { usePersistentState } from '../../../lib/persistent-state';
import { services } from '../../../services';
import type {
  CreateUserInput,
  ManagedUser,
  UpdateUserInput,
  UserPermission,
  UserRoleCatalogItem,
  UserRole,
} from '../../../services/contracts';
import type { PaginationMeta, SelectOption } from '../../../types/common';

type RoleFilter = UserRole | 'all';
type ActiveFilter = 'all' | 'active' | 'inactive';

const PAGE_SIZE = 8;
const DEFAULT_ORDERING = '-updated_at';

const tablePrimaryTextClassName =
  'block max-w-[140px] truncate text-sm font-semibold leading-[1.35] text-text-primary min-[640px]:max-w-[220px]';

const tableSecondaryTextClassName =
  'block max-w-[140px] truncate text-[12px] leading-[1.45] text-text-secondary min-[640px]:max-w-[220px]';

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const actionButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-card text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60';

const DEFAULT_PAGINATION_META: PaginationMeta = {
  page: 1,
  pageSize: PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: '', lastName: '' };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

function UsersPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission, hasRole, currentUser } = useAuth();

  const canManageUsers = hasPermission('can_manage_users');
  const canManageDeveloperRole = hasRole('developer');
  const currentManagedUserId = currentUser?.id ?? null;
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';

  const [search, setSearch] = usePersistentState('users:search', '');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<UserPermission[]>([]);
  const [roleCatalog, setRoleCatalog] = useState<UserRoleCatalogItem[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogLoadErrorMessage, setCatalogLoadErrorMessage] = useState<string | null>(null);
  const catalogsRequestRef = useRef<Promise<boolean> | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [reloadCursor, setReloadCursor] = useState(0);
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, activeFilter]);

  async function ensureAccessCatalogLoaded(): Promise<boolean> {
    if (!canManageUsers) {
      return false;
    }

    if (permissionCatalog.length > 0) {
      return true;
    }

    if (catalogsRequestRef.current) {
      return catalogsRequestRef.current;
    }

    setIsCatalogLoading(true);
    setCatalogLoadErrorMessage(null);

    const request = (async () => {
      const [permissionsResult, rolesResult] = await Promise.allSettled([
        services.users.listPermissions(),
        services.users.listRolesCatalog(),
      ]);

      let nextPermissions = permissionCatalog;

      if (permissionsResult.status === 'fulfilled') {
        nextPermissions = permissionsResult.value;
        setPermissionCatalog(permissionsResult.value);
      }

      if (rolesResult.status === 'fulfilled') {
        setRoleCatalog(rolesResult.value);
      }

      if (nextPermissions.length === 0) {
        setCatalogLoadErrorMessage(t('users.form.permissionsLoadError'));
        return false;
      }

      return true;
    })()
      .catch(() => {
        setCatalogLoadErrorMessage(t('users.form.permissionsLoadError'));
        return false;
      })
      .finally(() => {
        catalogsRequestRef.current = null;
        setIsCatalogLoading(false);
      });

    catalogsRequestRef.current = request;
    return request;
  }

  useEffect(() => {
    let isActive = true;

    async function loadUsers() {
      setIsLoading(true);
      setHasError(false);

      try {
        const result = await services.users.listUsers({
          page: currentPage,
          page_size: PAGE_SIZE,
          search: search.trim() || undefined,
          role: roleFilter === 'all' ? undefined : roleFilter,
          is_active:
            activeFilter === 'all'
              ? undefined
              : activeFilter === 'active',
          ordering: DEFAULT_ORDERING,
        });

        if (!isActive) {
          return;
        }

        const resultWithOptionalResults = result as unknown as {
          results?: ManagedUser[];
        };
        const usersList = Array.isArray(result.items)
          ? result.items
          : Array.isArray(resultWithOptionalResults.results)
            ? resultWithOptionalResults.results
            : [];

        const pageSize = result.page_size ?? PAGE_SIZE;
        const totalItems =
          result.total ?? result.count ?? usersList.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

        if (currentPage > totalPages) {
          setCurrentPage(totalPages);
          return;
        }

        setUsers(usersList);
        setPaginationMeta({
          page: result.page ?? currentPage,
          pageSize,
          totalItems,
          totalPages,
        });
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setUsers([]);
        setPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setHasLoadedOnce(true);
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      isActive = false;
    };
  }, [activeFilter, currentPage, reloadCursor, roleFilter, search]);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    const selectedVisible = users.some((user) => user.id === selectedUserId);
    if (!selectedVisible) {
      setSelectedUserId(null);
    }
  }, [users, selectedUserId]);

  async function openCreateForm() {
    if (!canManageUsers) {
      return;
    }

    const isCatalogReady = await ensureAccessCatalogLoaded();
    if (!isCatalogReady) {
      return;
    }

    setFormMode('create');
    setEditingUser(null);
    setFormErrorMessage(null);
    setIsFormOpen(true);
  }

  async function openEditForm(user: ManagedUser) {
    if (!canManageUsers) {
      return;
    }

    if (user.role === 'developer' && !canManageDeveloperRole) {
      return;
    }

    const isCatalogReady = await ensureAccessCatalogLoaded();
    if (!isCatalogReady) {
      return;
    }

    setFormMode('edit');
    setEditingUser(user);
    setFormErrorMessage(null);
    setIsFormOpen(true);
  }

  function requestDelete(user: ManagedUser) {
    if (!canManageUsers) {
      return;
    }

    if (user.role === 'developer' && !canManageDeveloperRole) {
      return;
    }

    setUserToDelete(user);
  }

  async function handleSaveUser(payload: CreateUserInput | UpdateUserInput) {
    setIsSaving(true);
    setFormErrorMessage(null);

    try {
      if (formMode === 'create') {
        const email = payload.email?.trim();
        const fallbackFromFullName = splitFullName(payload.full_name?.trim() ?? '');
        const firstName = (payload.first_name ?? fallbackFromFullName.firstName).trim();
        const lastName = (payload.last_name ?? fallbackFromFullName.lastName).trim();
        const role = payload.role;
        const password = payload.password;

        if (!email || !firstName || !role || !password) {
          throw new Error(t('users.form.passwordError'));
        }

        const createPayload: CreateUserInput = {
          email,
          first_name: firstName,
          last_name: lastName || undefined,
          role,
          password,
          phone: payload.phone ?? null,
          is_active: payload.is_active,
          custom_permission_ids: payload.custom_permission_ids,
        };

        await services.users.createUser(createPayload);
        setCurrentPage(1);
      } else {
        const editingUserId = editingUser?.id;
        if (!editingUserId) {
          throw new Error(t('users.form.saveError'));
        }

        const updated = await services.users.updateUser(editingUserId, payload);
        if (!updated) {
          throw new Error(t('users.form.saveError'));
        }

        setDetailRefreshToken((current) => current + 1);
      }

      setIsFormOpen(false);
      setEditingUser(null);
      setReloadCursor((current) => current + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('users.form.saveError');
      setFormErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!userToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await services.users.deleteUser(userToDelete.id);

      if (selectedUserId === userToDelete.id) {
        setSelectedUserId(null);
      }

      setUserToDelete(null);
      setReloadCursor((current) => current + 1);
    } catch {
      // Keep dialog open if deletion fails.
    } finally {
      setIsDeleting(false);
    }
  }

  const roleOptions = useMemo<SelectOption[]>(
    () => {
      const catalogOptions = roleCatalog.map((role) => ({
        value: role.key,
        label: role.label || getUserRoleLabel(t, role.key),
      }));

      if (catalogOptions.length > 0) {
        return [{ value: 'all', label: t('users.filters.allRoles') }, ...catalogOptions];
      }

      return [
        { value: 'all', label: t('users.filters.allRoles') },
        { value: 'developer', label: getUserRoleLabel(t, 'developer') },
        { value: 'admin', label: getUserRoleLabel(t, 'admin') },
        { value: 'operator', label: getUserRoleLabel(t, 'operator') },
      ];
    },
    [roleCatalog, t],
  );

  const activeOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: t('users.filters.allStatuses') },
      { value: 'active', label: t('common.active') },
      { value: 'inactive', label: t('common.inactive') },
    ],
    [t],
  );

  const columns = useMemo<DataTableColumn<ManagedUser>[]>(() => {
    const baseColumns: DataTableColumn<ManagedUser>[] = [
      {
        key: 'user',
        label: t('users.columns.user'),
        render: (user) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>{user.full_name}</span>
            <span className={tableSecondaryTextClassName}>{user.email || t('common.na')}</span>
          </div>
        ),
      },
      {
        key: 'role',
        label: t('users.columns.role'),
        render: (user) => (
          <span className={tablePrimaryTextClassName}>
            {getUserRoleLabel(t, user.role)}
          </span>
        ),
      },
      {
        key: 'phone',
        label: t('users.columns.phone'),
        render: (user) => (
          <span className={tablePrimaryTextClassName}>
            {user.phone ?? t('common.na')}
          </span>
        ),
      },
      {
        key: 'status',
        label: t('users.columns.status'),
        render: (user) => (
          <StatusBadge
            status={user.is_active ? 'active' : 'inactive'}
            tone={user.is_active ? 'success' : 'neutral'}
            label={user.is_active ? t('common.active') : t('common.inactive')}
          />
        ),
      },
      {
        key: 'permissions',
        label: t('users.columns.permissions'),
        render: (user) => (
          <span className={tablePrimaryTextClassName}>
            {user.role === 'developer'
              ? t('users.fullAccessShort')
              : t('users.permissionsCount', {
                  count:
                    (user.effective_permissions ?? user.custom_permissions ?? user.direct_permissions ?? [])
                      .length,
                })}
          </span>
        ),
      },
      {
        key: 'createdAt',
        label: t('users.columns.created'),
        render: (user) => (
          <span className={tablePrimaryTextClassName}>
            {formatLocalizedDate(user.created_at, i18n.language, {
              locale,
              withYear: true,
              shortMonth: true,
              fallback: t('common.na'),
            })}
          </span>
        ),
      },
      {
        key: 'updatedAt',
        label: t('users.columns.updated'),
        render: (user) => (
          <span className={tablePrimaryTextClassName}>
            {formatLocalizedDate(user.updated_at, i18n.language, {
              locale,
              withYear: true,
              shortMonth: true,
              fallback: t('common.na'),
            })}
          </span>
        ),
      },
    ];

    if (!canManageUsers) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        key: 'actions',
        label: t('users.columns.actions'),
        align: 'right',
        render: (user) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                void openEditForm(user);
              }}
              disabled={user.role === 'developer' && !canManageDeveloperRole}
              aria-label={`${t('users.actions.edit')} ${user.full_name}`}
            >
              <FiEdit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={actionButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                requestDelete(user);
              }}
              disabled={
                (currentManagedUserId !== null &&
                  (user.id === currentManagedUserId ||
                    user.id === `managed-${currentManagedUserId}`)) ||
                user.role === 'developer'
              }
              aria-label={`${t('users.actions.delete')} ${user.full_name}`}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ];
  }, [
    canManageDeveloperRole,
    canManageUsers,
    currentManagedUserId,
    i18n.language,
    locale,
    t,
  ]);

  const activeFilterCount =
    Number(roleFilter !== 'all') + Number(activeFilter !== 'all');

  const header = (
    <PageHeader
      eyebrow={t('users.eyebrow')}
      title={t('users.title')}
      subtitle={t('users.subtitle')}
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 min-[768px]:w-auto">
          {canManageUsers ? (
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              onClick={() => {
                void openCreateForm();
              }}
              disabled={isCatalogLoading}
            >
              <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
              {isCatalogLoading ? t('common.loading') : t('users.newUser')}
            </button>
          ) : null}
          <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
            <AppIcon name="users" className="h-3.5 w-3.5" aria-hidden="true" />
            {paginationMeta.totalItems} {t('users.records')}
          </span>
        </div>
      }
    />
  );

  if (!hasLoadedOnce && isLoading) {
    return (
      <PageLayout header={header}>
        <PageSection>
          <PageCard>
            <LoadingState
              title={t('users.loadingTitle')}
              description={t('users.loadingDescription')}
            />
          </PageCard>
        </PageSection>
      </PageLayout>
    );
  }

  if (hasError) {
    return (
      <PageLayout header={header}>
        <PageSection>
          <PageCard>
            <EmptyState
              title={t('users.errorTitle')}
              description={t('users.errorDescription')}
            />
          </PageCard>
        </PageSection>
      </PageLayout>
    );
  }

  return (
    <PageLayout header={header}>
      <PageSection>
        <FilterBar
          actions={
            <div className="flex w-full flex-wrap items-center gap-2 max-[820px]:justify-start min-[820px]:w-auto">
              <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-surface-subtle px-3 text-sm font-semibold text-text-primary">
                <AppIcon
                  name="activity"
                  className="h-4 w-4 text-text-muted"
                  aria-hidden="true"
                />
                {paginationMeta.totalItems} {t('users.records')}
              </span>
              {activeFilterCount > 0 ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary/12 px-3 text-sm font-semibold text-text-accent">
                  <AppIcon name="filter" className="h-4 w-4" aria-hidden="true" />
                  {activeFilterCount} {t('users.activeFilters')}
                </span>
              ) : null}
            </div>
          }
        >
          {catalogLoadErrorMessage ? (
            <p className="m-0 w-full rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
              {catalogLoadErrorMessage}
            </p>
          ) : null}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('users.searchPlaceholder')}
          />

          <label className="grid min-w-[min(170px,100%)] flex-[1_1_170px] gap-1.5 min-[640px]:flex-[0_1_170px]">
            <span className={labelClassName}>{t('users.filters.role')}</span>
            <FilterSelect
              value={roleFilter}
              options={roleOptions}
              onChange={(value) => setRoleFilter(value as RoleFilter)}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(170px,100%)] flex-[1_1_170px] gap-1.5 min-[640px]:flex-[0_1_170px]">
            <span className={labelClassName}>{t('users.filters.status')}</span>
            <FilterSelect
              value={activeFilter}
              options={activeOptions}
              onChange={(value) => setActiveFilter(value as ActiveFilter)}
              disabled={isLoading}
            />
          </label>
        </FilterBar>

        <PageCard>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
                {t('users.listTitle')}
              </h2>
              <span className="text-[12px] font-medium text-text-muted">
                {t('users.listHint')}
              </span>
            </div>

            <DataTable
              data={users}
              columns={columns}
              rowKey="id"
              selectedRowKey={selectedUserId}
              loading={isLoading}
              onRowClick={(user) => setSelectedUserId(user.id)}
              emptyTitle={t('users.emptyTitle')}
              emptyDescription={t('users.emptyDescription')}
            />
          </div>
        </PageCard>

        {!isLoading && paginationMeta.totalItems > 0 ? (
          <Pagination
            currentPage={Math.min(currentPage, paginationMeta.totalPages)}
            totalPages={paginationMeta.totalPages}
            totalItems={paginationMeta.totalItems}
            onPageChange={setCurrentPage}
          />
        ) : null}
      </PageSection>

      {selectedUserId ? (
        <UserDetailPanel
          userId={selectedUserId}
          refreshToken={detailRefreshToken}
          canManageUsers={canManageUsers}
          canManageDeveloperRole={canManageDeveloperRole}
          currentRole={currentUser?.role ?? null}
          currentManagedUserId={currentManagedUserId}
          onClose={() => setSelectedUserId(null)}
          onEdit={(user) => {
            void openEditForm(user);
            setSelectedUserId(null);
          }}
          onDelete={(user) => {
            requestDelete(user);
            setSelectedUserId(null);
          }}
        />
      ) : null}

      {isFormOpen ? (
        <UserFormPanel
          mode={formMode}
          user={editingUser}
          permissions={permissionCatalog}
          roleCatalog={roleCatalog}
          canManageDeveloperRole={canManageDeveloperRole}
          isSubmitting={isSaving}
          errorMessage={formErrorMessage}
          onClose={() => {
            if (!isSaving) {
              setIsFormOpen(false);
              setEditingUser(null);
              setFormErrorMessage(null);
            }
          }}
          onSubmit={handleSaveUser}
        />
      ) : null}

      {userToDelete ? (
        <UserDeleteDialog
          user={userToDelete}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setUserToDelete(null);
            }
          }}
          onConfirm={() => {
            void handleConfirmDelete();
          }}
        />
      ) : null}
    </PageLayout>
  );
}

export default UsersPage;


