import { useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { FilterSelect, StatusBadge } from '../../../components/shared/data'
import AppIcon from '../../../components/shared/icons/AppIcon'
import {
	EmptyState,
	LoadingState,
	PageCard,
} from '../../../components/shared/page'
import { formatLocalizedDate } from '../../../i18n/date-format'
import { getChannelLabel, getLeadStatusLabel } from '../../../i18n/labels'
import { services } from '../../../services'
import type { Lead } from '../../../services/contracts'
import type { SelectOption } from '../../../types/common'

interface LeadDetailPanelProps {
	leadId: string
	refreshToken?: number
	canManageLeads: boolean
	resolveOperatorName?: (
		operatorId: string,
		fallbackName?: string,
	) => string | undefined
	onClose: () => void
	onEdit: (lead: Lead) => void
	onDelete: (lead: Lead) => void
	onStatusChange: (id: string, status: string) => Promise<Lead | null>
}

const labelClassName =
	'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'

const valueClassName =
	'text-sm font-semibold text-text-primary [overflow-wrap:anywhere]'

function isUuidLike(value: string | undefined): boolean {
	if (!value) {
		return false
	}

	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		value.trim(),
	)
}

function getLeadStatusTone(
	status: string,
): 'info' | 'warning' | 'accent' | 'success' | 'danger' {
	switch (status) {
		case 'new':
			return 'info'
		case 'contacted':
			return 'warning'
		case 'qualified':
			return 'accent'
		case 'lost':
			return 'danger'
		default:
			return 'info'
	}
}

function normalizeLeadSource(source?: string): string {
	if (!source) {
		return 'manual'
	}

	return source
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

function LeadDetailPanel({
	leadId,
	refreshToken = 0,
	canManageLeads,
	resolveOperatorName,
	onClose,
	onEdit,
	onDelete,
	onStatusChange,
}: LeadDetailPanelProps) {
	const { t, i18n } = useTranslation()
	const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ'
	const [lead, setLead] = useState<Lead | null>(null)
	const [resolvedOperatorName, setResolvedOperatorName] = useState<
		string | null
	>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)
	const [isStatusUpdating, setIsStatusUpdating] = useState(false)
	const [actionError, setActionError] = useState<string | null>(null)

	const statusOptions = useMemo<SelectOption[]>(
		() => [
			{ value: 'new', label: getLeadStatusLabel(t, 'new' as any) },
			{ value: 'contacted', label: getLeadStatusLabel(t, 'contacted' as any) },
			{ value: 'qualified', label: getLeadStatusLabel(t, 'qualified' as any) },
			{ value: 'lost', label: getLeadStatusLabel(t, 'lost' as any) },
		],
		[t],
	)

	useEffect(() => {
		let isActive = true

		async function loadLead() {
			setIsLoading(true)
			setHasError(false)
			setActionError(null)

			try {
				const nextLead = await services.leads.getLead(leadId)

				if (!isActive) {
					return
				}

				setLead(nextLead)
			} catch {
				if (!isActive) {
					return
				}

				setHasError(true)
				setLead(null)
				setResolvedOperatorName(null)
			} finally {
				if (isActive) {
					setIsLoading(false)
				}
			}
		}

		void loadLead()

		return () => {
			isActive = false
		}
	}, [leadId, refreshToken])

	useEffect(() => {
		let isActive = true

		async function resolveOwnerName() {
			const managerId = lead?.manager
			if (!managerId) {
				setResolvedOperatorName(null)
				return
			}

			const resolvedFromParent = resolveOperatorName?.(managerId) ?? null

			if (resolvedFromParent && !isUuidLike(resolvedFromParent)) {
				setResolvedOperatorName(resolvedFromParent)
				return
			}

			try {
				const operator = await services.users.getUserById(managerId)
				if (!isActive) {
					return
				}

				setResolvedOperatorName(operator?.full_name ?? null)
			} catch {
				if (isActive) {
					setResolvedOperatorName(null)
				}
			}
		}

		void resolveOwnerName()

		return () => {
			isActive = false
		}
	}, [
		lead?.manager,
		resolveOperatorName,
	])

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

	async function handleStatusChange(nextStatus: string) {
		if (!lead || lead.status === nextStatus || isStatusUpdating) {
			return
		}

		setActionError(null)
		setIsStatusUpdating(true)

		try {
			const updated = await onStatusChange(lead.id, nextStatus)
			if (!updated) {
				throw new Error()
			}

			setLead(updated)
		} catch {
			setActionError(t('leads.actions.statusUpdateError'))
		} finally {
			setIsStatusUpdating(false)
		}
	}

	return (
		<div
			className='fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]'
			onClick={onClose}
			role='presentation'
		>
			<aside
				className='h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[560px] min-[641px]:p-5'
				onClick={event => event.stopPropagation()}
				aria-label={t('leads.detail.ariaLabel')}
			>
				<header className='mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60'>
					<div className='flex items-start justify-between gap-3'>
						<div className='min-w-0'>
							<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary'>
								{t('leads.detail.profile')}
							</p>
							<h2 className='mt-1 font-display text-[1.55rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]'>
								{lead?.full_name ?? t('leads.detail.titleFallback')}
							</h2>
							{!isLoading && lead ? (
								<p className='mt-1 text-sm text-text-secondary [overflow-wrap:anywhere]'>
									{lead.ai_summary ?? t('leads.detail.noNotes')}
								</p>
							) : null}
						</div>

						<button
							type='button'
							className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20'
							onClick={onClose}
							aria-label={t('leads.detail.close')}
						>
							<AppIcon
								name='close'
								className='h-4.5 w-4.5'
								aria-hidden='true'
							/>
						</button>
					</div>

					{!isLoading && lead ? (
						<div className='mt-3 flex flex-wrap items-center gap-2'>
							{(() => {
								const source = normalizeLeadSource(lead.source)
								return (
									<span className='inline-flex min-h-7 items-center gap-1.5 rounded-pill bg-info-bg px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-info'>
										<AppIcon
											name='chat'
											className='h-3.5 w-3.5'
											aria-hidden='true'
										/>
										{getChannelLabel(t, source)}
									</span>
								)
							})()}
							<StatusBadge
								status={lead.status ?? 'new'}
								label={getLeadStatusLabel(t, (lead.status ?? 'new') as any)}
								tone={getLeadStatusTone((lead.status ?? 'new') as any)}
							/>
						</div>
					) : null}
				</header>

				<div className='grid gap-3'>
					{isLoading ? (
						<LoadingState
							title={t('leads.detail.loadingTitle')}
							description={t('leads.detail.loadingDescription')}
						/>
					) : null}

					{!isLoading && (hasError || !lead) ? (
						<EmptyState
							title={t('leads.detail.errorTitle')}
							description={t('leads.detail.errorDescription')}
						/>
					) : null}

					{!isLoading && lead ? (
						<>
							<PageCard>
								<div className='grid gap-4'>
									<div className='grid gap-1'>
										<h3 className='m-0 text-[1rem] font-semibold text-text-primary'>
											{t('leads.detail.contactTitle')}
										</h3>
										<p className='m-0 text-sm text-text-secondary'>
											{t('leads.detail.contactDescription')}
										</p>
									</div>

									<div className='grid gap-2.5 sm:grid-cols-2'>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('leads.detail.phone')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{lead.phone ?? t('common.na')}
											</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('leads.detail.instagram')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{lead.source === 'instagram'
													? t('common.active')
													: t('common.na')}
											</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('leads.detail.telegram')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{lead.source === 'telegram'
													? t('common.active')
													: t('common.na')}
											</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('leads.detail.source')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{getChannelLabel(t, normalizeLeadSource(lead.source))}
											</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('leads.detail.owner')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{resolvedOperatorName ??
													lead.manager_username ??
													t('common.unassigned')}
											</p>
										</div>
									</div>
								</div>
							</PageCard>

							<PageCard>
								<div className='grid gap-4'>
									<div className='grid gap-1'>
										<h3 className='m-0 text-[1rem] font-semibold text-text-primary'>
											{t('leads.detail.activityTitle')}
										</h3>
										<p className='m-0 text-sm text-text-secondary'>
											{t('leads.detail.activityDescription')}
										</p>
									</div>

									<dl className='m-0 grid gap-2'>
										<div className='flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5'>
											<dt className={labelClassName}>
												{t('leads.detail.created')}
											</dt>
											<dd className={`m-0 ${valueClassName}`}>
												{formatDateTime(
													lead.created_at,
													i18n.language,
													locale,
													t('common.na'),
												)}
											</dd>
										</div>
										<div className='flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5'>
											<dt className={labelClassName}>
												{t('leads.detail.updated')}
											</dt>
											<dd className={`m-0 ${valueClassName}`}>
												{formatDateTime(
													lead.updated_at,
													i18n.language,
													locale,
													t('common.na'),
												)}
											</dd>
										</div>
										<div className='flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5'>
											<dt className={labelClassName}>
												{t('leads.detail.lastContact')}
											</dt>
											<dd className={`m-0 ${valueClassName}`}>
												{formatDateTime(
													lead.updated_at,
													i18n.language,
													locale,
													t('common.na'),
												)}
											</dd>
										</div>
										<div className='flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5'>
											<dt className={labelClassName}>
												{t('leads.detail.lastMessage')}
											</dt>
											<dd className={`m-0 ${valueClassName}`}>
												{formatDateTime(
													lead.updated_at,
													i18n.language,
													locale,
													t('common.na'),
												)}
											</dd>
										</div>
									</dl>
								</div>
							</PageCard>

							<PageCard>
								<div className='grid gap-3'>
									<h3 className='m-0 text-[1rem] font-semibold text-text-primary'>
										{t('leads.detail.notesTitle')}
									</h3>
									<div className='rounded-lg bg-surface-subtle/80 p-3.5'>
										<p className='m-0 text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]'>
											{lead.ai_summary ?? t('leads.detail.noNotes')}
										</p>
									</div>
								</div>
							</PageCard>

							{actionError ? (
								<p className='m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger'>
									{actionError}
								</p>
							) : null}

							<PageCard allowOverflow>
								<div className='grid gap-3'>
									{canManageLeads ? (
										<div className='grid gap-1.5'>
											<span className={labelClassName}>
												{t('leads.detail.statusControl')}
											</span>
											<FilterSelect
												value={lead.status ?? 'new'}
												options={statusOptions}
												onChange={value =>
													void handleStatusChange(value)
												}
												disabled={isStatusUpdating}
											/>
										</div>
									) : (
										<p className='m-0 rounded-lg bg-surface-subtle/90 px-3 py-2.5 text-sm text-text-secondary'>
											{t('leads.detail.readOnlyHint')}
										</p>
									)}

									{canManageLeads ? (
										<div className='flex flex-wrap items-center gap-2'>
											<button
												type='button'
												className='inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35'
												onClick={() => onEdit(lead)}
											>
												<FiEdit2 className='h-4 w-4' />
												{t('leads.actions.edit')}
											</button>
											<button
												type='button'
												className='inline-flex min-h-10 items-center gap-2 rounded-lg bg-danger-bg px-4 text-sm font-semibold text-danger transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30'
												onClick={() => onDelete(lead)}
											>
												<FiTrash2 className='h-4 w-4' />
												{t('leads.actions.delete')}
											</button>
										</div>
									) : null}
								</div>
							</PageCard>
						</>
					) : null}
				</div>
			</aside>
		</div>
	)
}

export default LeadDetailPanel

