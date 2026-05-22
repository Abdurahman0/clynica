// @ts-nocheck

import { useEffect, useState } from 'react'
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
import { services } from '../../../services'
import type { AISetting, EntityId } from '../../../types/domain'

interface AISettingDetailPanelProps {
	settingId: EntityId
	refreshToken?: number
	canManage: boolean
	onClose: () => void
	onEdit: (setting: AISetting) => void
	onDelete: (setting: AISetting) => void
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

function AISettingDetailPanel({
	settingId,
	refreshToken = 0,
	canManage,
	onClose,
	onEdit,
	onDelete,
}: AISettingDetailPanelProps) {
	const { t, i18n } = useTranslation()
	const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ'
	const [setting, setSetting] = useState<AISetting | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)
	const [resolvedUpdatedBy, setResolvedUpdatedBy] = useState<string | null>(
		null,
	)

	useEffect(() => {
		let isActive = true

		async function loadSetting() {
			setIsLoading(true)
			setHasError(false)

			try {
				const nextSetting = await services.aiSettings.getSetting(settingId)
				if (!isActive) {
					return
				}

				setSetting(nextSetting)
			} catch {
				if (!isActive) {
					return
				}

				setHasError(true)
				setSetting(null)
				setResolvedUpdatedBy(null)
			} finally {
				if (isActive) {
					setIsLoading(false)
				}
			}
		}

		void loadSetting()

		return () => {
			isActive = false
		}
	}, [refreshToken, settingId])

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

	useEffect(() => {
		let isActive = true

		async function resolveUpdatedByName() {
			const updatedByName = setting?.updated_by_name ?? null
			if (updatedByName && !isUuidLike(updatedByName)) {
				setResolvedUpdatedBy(updatedByName)
				return
			}

			const updatedById = setting?.updated_by ?? null
			if (!updatedById) {
				setResolvedUpdatedBy(null)
				return
			}

			if (!isUuidLike(updatedById)) {
				setResolvedUpdatedBy(updatedById)
				return
			}

			try {
				const user = await services.users.getUserById(updatedById)
				if (!isActive) {
					return
				}

				const fullName = user?.full_name ?? null
				setResolvedUpdatedBy(
					fullName && !isUuidLike(fullName) ? fullName : null,
				)
			} catch {
				if (isActive) {
					setResolvedUpdatedBy(null)
				}
			}
		}

		void resolveUpdatedByName()

		return () => {
			isActive = false
		}
	}, [setting?.updated_by, setting?.updated_by_name])

	return (
		<div
			className='fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]'
			onClick={onClose}
			role='presentation'
		>
			<aside
				className='h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[640px] min-[641px]:p-5'
				onClick={event => event.stopPropagation()}
				aria-label={t('aiSettings.detail.ariaLabel')}
			>
				<header className='mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60'>
					<div className='flex items-start justify-between gap-3'>
						<div className='min-w-0'>
							<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary'>
								{t('aiSettings.detail.eyebrow')}
							</p>
							<h2 className='mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]'>
								{setting?.name ?? t('aiSettings.detail.titleFallback')}
							</h2>
							{!isLoading && setting ? (
								<p className='mt-1 text-sm text-text-secondary [overflow-wrap:anywhere]'>
									{setting.model_name}
								</p>
							) : null}
						</div>
						<button
							type='button'
							className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20'
							onClick={onClose}
							aria-label={t('aiSettings.detail.close')}
						>
							<AppIcon
								name='close'
								className='h-4.5 w-4.5'
								aria-hidden='true'
							/>
						</button>
					</div>

					{!isLoading && setting ? (
						<div className='mt-3 flex flex-wrap items-center gap-2'>
							<StatusBadge
								status={setting.is_active ? 'active' : 'inactive'}
								tone={setting.is_active ? 'success' : 'neutral'}
								label={
									setting.is_active ? t('common.active') : t('common.inactive')
								}
							/>
							<span className='inline-flex min-h-7 items-center rounded-pill bg-info-bg px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-info'>
								{setting.auto_order_enabled
									? t('aiSettings.autoOrderOn')
									: t('aiSettings.autoOrderOff')}
							</span>
							<span className='inline-flex min-h-7 items-center rounded-pill bg-info-bg px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-info'>
								{setting.resume_after_operator_minutes > 0
									? `${t('aiSettings.followUpOn')} (${setting.resume_after_operator_minutes}m)`
									: t('aiSettings.followUpOff')}
							</span>
						</div>
					) : null}
				</header>

				<div className='grid gap-3'>
					{isLoading ? (
						<LoadingState
							title={t('aiSettings.detail.loadingTitle')}
							description={t('aiSettings.detail.loadingDescription')}
						/>
					) : null}

					{!isLoading && (hasError || !setting) ? (
						<EmptyState
							title={t('aiSettings.detail.errorTitle')}
							description={t('aiSettings.detail.errorDescription')}
						/>
					) : null}

					{!isLoading && setting ? (
						<>
							<PageCard>
								<div className='grid gap-4'>
									<div className='grid gap-1'>
										<h3 className='m-0 text-[1rem] font-semibold text-text-primary'>
											{t('aiSettings.detail.behaviorTitle')}
										</h3>
										<p className='m-0 text-sm text-text-secondary'>
											{t('aiSettings.detail.behaviorDescription')}
										</p>
									</div>

									<div className='grid gap-2.5 sm:grid-cols-2'>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('aiSettings.form.modelName')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{setting.model_name}
											</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('aiSettings.form.temperature')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{setting.temperature.toFixed(2)}
											</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('aiSettings.form.orderConfidenceThreshold')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{setting.order_confidence_threshold.toFixed(2)}
											</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('aiSettings.form.followUpMinutes')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{setting.resume_after_operator_minutes > 0
													? setting.resume_after_operator_minutes
													: t('aiSettings.followUpOff')}
											</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3 sm:col-span-2'>
											<p className={labelClassName}>
												{t('aiSettings.detail.updatedBy')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{resolvedUpdatedBy ?? t('common.na')}
											</p>
										</div>
									</div>
								</div>
							</PageCard>

							<PageCard>
								<div className='grid gap-3'>
									<h3 className='m-0 text-[1rem] font-semibold text-text-primary'>
										{t('aiSettings.form.systemPrompt')}
									</h3>
									<div className='max-h-[320px] overflow-y-auto rounded-lg bg-surface-subtle/80 p-3'>
										<p className='m-0 whitespace-pre-wrap text-sm leading-6 text-text-primary'>
											{setting.system_prompt}
										</p>
									</div>
								</div>
							</PageCard>

							<PageCard>
								<div className='grid gap-3'>
									<h3 className='m-0 text-[1rem] font-semibold text-text-primary'>
										{t('aiSettings.form.followUpMessage')}
									</h3>
									<div className='max-h-[220px] overflow-y-auto rounded-lg bg-surface-subtle/80 p-3'>
										<p className='m-0 whitespace-pre-wrap text-sm leading-6 text-text-primary'>
											{setting.follow_up_message?.trim()?.length
												? setting.follow_up_message
												: t('common.na')}
										</p>
									</div>
								</div>
							</PageCard>

							<PageCard>
								<dl className='m-0 grid gap-2'>
									<div className='flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5'>
										<dt className={labelClassName}>
											{t('aiSettings.detail.createdAt')}
										</dt>
										<dd className={`m-0 ${valueClassName}`}>
											{formatDateTime(
												setting.created_at,
												i18n.language,
												locale,
												t('common.na'),
											)}
										</dd>
									</div>
									<div className='flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5'>
										<dt className={labelClassName}>
											{t('aiSettings.detail.updatedAt')}
										</dt>
										<dd className={`m-0 ${valueClassName}`}>
											{formatDateTime(
												setting.updated_at,
												i18n.language,
												locale,
												t('common.na'),
											)}
										</dd>
									</div>
								</dl>
							</PageCard>

							<PageCard>
								{canManage ? (
									<div className='flex flex-wrap items-center gap-2'>
										<button
											type='button'
											className='inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35'
											onClick={() => onEdit(setting)}
										>
											<FiEdit2 className='h-4 w-4' />
											{t('aiSettings.actions.edit')}
										</button>
										<button
											type='button'
											className='inline-flex min-h-10 items-center gap-2 rounded-lg bg-danger-bg px-4 text-sm font-semibold text-danger transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 disabled:cursor-not-allowed disabled:opacity-60'
											onClick={() => onDelete(setting)}
											disabled={setting.is_active}
										>
											<FiTrash2 className='h-4 w-4' />
											{t('aiSettings.actions.delete')}
										</button>
									</div>
								) : (
									<p className='m-0 rounded-lg bg-surface-subtle/90 px-3 py-2.5 text-sm text-text-secondary'>
										{t('aiSettings.detail.readOnlyHint')}
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

export default AISettingDetailPanel

