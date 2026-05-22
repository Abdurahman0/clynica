import { useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../../../components/shared/data'
import AppIcon from '../../../components/shared/icons/AppIcon'
import {
	EmptyState,
	LoadingState,
	PageCard,
} from '../../../components/shared/page'
import { formatLocalizedDate } from '../../../i18n/date-format'
import { getUserPermissionLabel, getUserRoleLabel } from '../../../i18n/labels'
import { services } from '../../../services'
import type {
	ManagedUser,
	UserPermission,
	UserRole,
} from '../../../services/contracts'

interface UserDetailPanelProps {
	userId: string
	refreshToken?: number
	canManageUsers: boolean
	canManageDeveloperRole: boolean
	currentRole: UserRole | null
	currentManagedUserId: string | null
	onClose: () => void
	onEdit: (user: ManagedUser) => void
	onDelete: (user: ManagedUser) => void
}

const labelClassName =
	'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'

const valueClassName =
	'text-sm font-semibold text-text-primary [overflow-wrap:anywhere]'

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuidLike(value: string | null | undefined): boolean {
	if (!value) {
		return false
	}

	return UUID_PATTERN.test(value)
}

function formatDateTime(
	timestamp: string | undefined,
	language: string,
	locale: string,
	fallback: string,
): string {
	return formatLocalizedDate(timestamp, language, {
		locale,
		withYear: true,
		withTime: true,
		shortMonth: true,
		fallback,
	})
}

function canManageTarget(
	actorRole: UserRole | null,
	targetRole: UserRole,
	canManageDeveloperRole: boolean,
): boolean {
	if (!actorRole) {
		return false
	}

	if (targetRole === 'developer' && !canManageDeveloperRole) {
		return false
	}

	return true
}

function UserDetailPanel({
	userId,
	refreshToken = 0,
	canManageUsers,
	canManageDeveloperRole,
	currentRole,
	currentManagedUserId,
	onClose,
	onEdit,
	onDelete,
}: UserDetailPanelProps) {
	const { t, i18n } = useTranslation()
	const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ'
	const [user, setUser] = useState<ManagedUser | null>(null)
	const [permissions, setPermissions] = useState<UserPermission[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)

	useEffect(() => {
		let isActive = true

		async function loadUserDetail() {
			setIsLoading(true)
			setHasError(false)

			try {
				const [nextUser, nextPermissions] = await Promise.all([
					services.users.getUserById(userId),
					services.users.listUserPermissions(userId),
				])

				if (!isActive) {
					return
				}

				setUser(nextUser)
				setPermissions(nextPermissions)
			} catch {
				if (!isActive) {
					return
				}

				setHasError(true)
				setUser(null)
			} finally {
				if (isActive) {
					setIsLoading(false)
				}
			}
		}

		void loadUserDetail()

		return () => {
			isActive = false
		}
	}, [refreshToken, userId])

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				onClose()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [onClose])

	const permissionNames = useMemo(() => {
		if (!user) {
			return []
		}

		return (user.custom_permissions ?? [])
			.map(permissionId =>
				permissions.find(permission => permission.id === permissionId),
			)
			.filter((permission): permission is UserPermission => Boolean(permission))
			.map(permission =>
				getUserPermissionLabel(t, permission.code, permission.name),
			)
	}, [permissions, t, user])

	const targetManageable = user
		? canManageTarget(currentRole, user.role, canManageDeveloperRole)
		: false
	const isCurrentManagedUser = Boolean(
		user &&
		currentManagedUserId &&
		(user.id === currentManagedUserId ||
			user.id === `managed-${currentManagedUserId}`),
	)

	return (
		<div
			className='fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]'
			onClick={onClose}
			role='presentation'
		>
			<aside
				className='h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[560px] min-[641px]:p-5'
				onClick={event => event.stopPropagation()}
				aria-label={t('users.detail.ariaLabel')}
			>
				<header className='mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60'>
					<div className='flex items-start justify-between gap-3'>
						<div className='min-w-0'>
							<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary'>
								{t('users.detail.profile')}
							</p>
							<h2 className='mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]'>
								{user?.full_name ?? t('users.detail.titleFallback')}
							</h2>
							{!isLoading && user ? (
								<p className='mt-1 text-sm text-text-secondary [overflow-wrap:anywhere]'>
									{user.email || t('common.na')}
								</p>
							) : null}
						</div>
						<button
							type='button'
							className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20'
							onClick={onClose}
							aria-label={t('users.detail.close')}
						>
							<AppIcon
								name='close'
								className='h-4.5 w-4.5'
								aria-hidden='true'
							/>
						</button>
					</div>

					{!isLoading && user ? (
						<div className='mt-3 flex flex-wrap items-center gap-2'>
							<StatusBadge
								status={user.is_active ? 'active' : 'inactive'}
								label={
									user.is_active ? t('common.active') : t('common.inactive')
								}
								tone={user.is_active ? 'success' : 'neutral'}
							/>
							<span className='inline-flex min-h-7 items-center rounded-pill bg-info-bg px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-info'>
								{getUserRoleLabel(t, user.role)}
							</span>
						</div>
					) : null}
				</header>

				<div className='grid gap-3'>
					{isLoading ? (
						<LoadingState
							title={t('users.detail.loadingTitle')}
							description={t('users.detail.loadingDescription')}
						/>
					) : null}

					{!isLoading && (hasError || !user) ? (
						<EmptyState
							title={t('users.detail.errorTitle')}
							description={t('users.detail.errorDescription')}
						/>
					) : null}

					{!isLoading && user ? (
						<>
							<PageCard>
								<div className='grid gap-4'>
									<div className='grid gap-1'>
										<h3 className='m-0 text-[1rem] font-semibold text-text-primary'>
											{t('users.detail.accountTitle')}
										</h3>
										<p className='m-0 text-sm text-text-secondary'>
											{t('users.detail.accountDescription')}
										</p>
									</div>

									<div className='grid gap-2.5 sm:grid-cols-2'>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('users.detail.phone')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{user.phone ?? t('common.na')}
											</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>{t('users.detail.role')}</p>
											<p className={`mt-1 ${valueClassName}`}>
												{getUserRoleLabel(t, user.role)}
											</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('users.detail.createdBy')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{user.created_by_name ??
													(user.created_by && !isUuidLike(user.created_by)
														? user.created_by
														: t('common.na'))}
											</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('users.detail.status')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{user.is_active
													? t('common.active')
													: t('common.inactive')}
											</p>
										</div>
									</div>
								</div>
							</PageCard>

							<PageCard>
								<div className='grid gap-4'>
									<h3 className='m-0 text-[1rem] font-semibold text-text-primary'>
										{t('users.detail.permissions')}
									</h3>
									{user.role === 'developer' ? (
										<div className='rounded-lg bg-info-bg/80 px-3.5 py-3 text-sm text-info'>
											{t('users.detail.developerPermissionsHint')}
										</div>
									) : permissionNames.length > 0 ? (
										<div className='flex max-h-[220px] flex-wrap gap-2 overflow-y-auto pr-1'>
											{permissionNames.map(permissionName => (
												<span
													key={permissionName}
													className='inline-flex min-h-7 items-center rounded-pill bg-primary/8 px-3 text-[11px] font-semibold tracking-[0.04em] text-text-accent'
												>
													{permissionName}
												</span>
											))}
										</div>
									) : (
										<div className='rounded-lg bg-surface-subtle/80 px-3.5 py-3 text-sm text-text-secondary'>
											{t('users.detail.noPermissions')}
										</div>
									)}
								</div>
							</PageCard>

							<PageCard>
								<dl className='m-0 grid gap-2'>
									<div className='flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5'>
										<dt className={labelClassName}>
											{t('users.detail.createdAt')}
										</dt>
										<dd className={`m-0 ${valueClassName}`}>
											{formatDateTime(
												user.created_at,
												i18n.language,
												locale,
												t('common.na'),
											)}
										</dd>
									</div>
									<div className='flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5'>
										<dt className={labelClassName}>
											{t('users.detail.updatedAt')}
										</dt>
										<dd className={`m-0 ${valueClassName}`}>
											{formatDateTime(
												user.updated_at,
												i18n.language,
												locale,
												t('common.na'),
											)}
										</dd>
									</div>
								</dl>
							</PageCard>

							<PageCard>
								{canManageUsers && targetManageable ? (
									<div className='flex flex-wrap items-center gap-2'>
										<button
											type='button'
											className='inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35'
											onClick={() => onEdit(user)}
										>
											<FiEdit2 className='h-4 w-4' />
											{t('users.actions.edit')}
										</button>
										<button
											type='button'
											className='inline-flex min-h-10 items-center gap-2 rounded-lg bg-danger-bg px-4 text-sm font-semibold text-danger transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 disabled:cursor-not-allowed disabled:opacity-60'
											onClick={() => onDelete(user)}
											disabled={
												isCurrentManagedUser || user.role === 'developer'
											}
										>
											<FiTrash2 className='h-4 w-4' />
											{t('users.actions.delete')}
										</button>
									</div>
								) : (
									<p className='m-0 rounded-lg bg-surface-subtle/90 px-3 py-2.5 text-sm text-text-secondary'>
										{t('users.detail.readOnlyHint')}
									</p>
								)}
							</PageCard>
						</>
					) : null}
				</div>
			</aside>
		</div>
	)
}

export default UserDetailPanel

