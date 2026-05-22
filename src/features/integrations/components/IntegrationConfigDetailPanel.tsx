// @ts-nocheck

import { useEffect, useState } from 'react'
import { FiEdit2, FiEye, FiEyeOff, FiTrash2 } from 'react-icons/fi'
import { FaInstagram, FaTelegramPlane } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../../../components/shared/data'
import AppIcon from '../../../components/shared/icons/AppIcon'
import {
	EmptyState,
	LoadingState,
	PageCard,
} from '../../../components/shared/page'
import { services } from '../../../services'
import type { EntityId, IntegrationConfig } from '../../../types/domain'
import {
	formatIntegrationDateTime,
	getIntegrationProviderClassName,
	getIntegrationProviderLabel,
	maskSecretValue,
} from '../utils/integration-format'

interface IntegrationConfigDetailPanelProps {
	configId: EntityId
	refreshToken?: number
	canManage: boolean
	onClose: () => void
	onEdit: (config: IntegrationConfig) => void
	onDelete: (config: IntegrationConfig) => void
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

function ProviderIcon({
	provider,
}: {
	provider: IntegrationConfig['provider']
}) {
	if (provider === 'telegram') {
		return <FaTelegramPlane className='h-3.5 w-3.5' aria-hidden='true' />
	}

	if (provider === 'instagram') {
		return <FaInstagram className='h-3.5 w-3.5' aria-hidden='true' />
	}

	return <AppIcon name='sparkles' className='h-3.5 w-3.5' aria-hidden='true' />
}

function IntegrationConfigDetailPanel({
	configId,
	refreshToken = 0,
	canManage,
	onClose,
	onEdit,
	onDelete,
}: IntegrationConfigDetailPanelProps) {
	const { t, i18n } = useTranslation()
	const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ'
	const [config, setConfig] = useState<IntegrationConfig | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)
	const [revealSecret, setRevealSecret] = useState(false)
	const [resolvedUpdatedBy, setResolvedUpdatedBy] = useState<string | null>(
		null,
	)

	useEffect(() => {
		let isActive = true

		async function loadConfig() {
			setIsLoading(true)
			setHasError(false)

			try {
				const nextConfig = await services.integrations.getConfig(configId)
				if (!isActive) {
					return
				}

				setConfig(nextConfig)
				setRevealSecret(false)
			} catch {
				if (!isActive) {
					return
				}

				setHasError(true)
				setConfig(null)
				setResolvedUpdatedBy(null)
			} finally {
				if (isActive) {
					setIsLoading(false)
				}
			}
		}

		void loadConfig()

		return () => {
			isActive = false
		}
	}, [configId, refreshToken])

	useEffect(() => {
		function handleEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				onClose()
			}
		}

		window.addEventListener('keydown', handleEscape)
		return () => {
			window.removeEventListener('keydown', handleEscape)
		}
	}, [onClose])

	useEffect(() => {
		let isActive = true

		async function resolveUpdatedBy() {
			const updatedByName = config?.updated_by_name ?? null
			if (updatedByName && !isUuidLike(updatedByName)) {
				setResolvedUpdatedBy(updatedByName)
				return
			}

			const updatedById = config?.updated_by ?? null
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

		void resolveUpdatedBy()

		return () => {
			isActive = false
		}
	}, [config?.updated_by, config?.updated_by_name])

	return (
		<div
			className='fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]'
			onClick={onClose}
			role='presentation'
		>
			<aside
				className='h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[600px] min-[641px]:p-5'
				onClick={event => event.stopPropagation()}
				aria-label={t('integrations.configDetail.ariaLabel')}
			>
				<header className='mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60'>
					<div className='flex items-start justify-between gap-3'>
						<div className='min-w-0'>
							<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary'>
								{t('integrations.configDetail.eyebrow')}
							</p>
							<h2 className='mt-1 font-display text-[1.35rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]'>
								{config?.label ?? t('integrations.configDetail.titleFallback')}
							</h2>
							{!isLoading && config ? (
								<p className='mt-1 text-sm text-text-secondary [overflow-wrap:anywhere]'>
									{config.key}
								</p>
							) : null}
						</div>
						<button
							type='button'
							className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20'
							onClick={onClose}
							aria-label={t('integrations.configDetail.close')}
						>
							<AppIcon
								name='close'
								className='h-4.5 w-4.5'
								aria-hidden='true'
							/>
						</button>
					</div>

					{!isLoading && config ? (
						<div className='mt-3 flex flex-wrap items-center gap-2'>
							<span
								className={[
									'inline-flex min-h-7 items-center gap-1.5 rounded-pill px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
									getIntegrationProviderClassName(config.provider),
								].join(' ')}
							>
								<ProviderIcon provider={config.provider} />
								{getIntegrationProviderLabel(config.provider)}
							</span>
							<StatusBadge
								status={config.is_active ? 'active' : 'inactive'}
								tone={config.is_active ? 'success' : 'neutral'}
								label={
									config.is_active ? t('common.active') : t('common.inactive')
								}
							/>
						</div>
					) : null}
				</header>

				<div className='grid gap-3'>
					{isLoading ? (
						<LoadingState
							title={t('integrations.configDetail.loadingTitle')}
							description={t('integrations.configDetail.loadingDescription')}
						/>
					) : null}

					{!isLoading && (hasError || !config) ? (
						<EmptyState
							title={t('integrations.configDetail.errorTitle')}
							description={t('integrations.configDetail.errorDescription')}
						/>
					) : null}

					{!isLoading && config ? (
						<>
							<PageCard>
								<div className='grid gap-3'>
									<div className='grid gap-1'>
										<h3 className='m-0 text-[1rem] font-semibold text-text-primary'>
											{t('integrations.configDetail.configTitle')}
										</h3>
										<p className='m-0 text-sm text-text-secondary'>
											{t('integrations.configDetail.configDescription')}
										</p>
									</div>

									<div className='grid gap-2.5 sm:grid-cols-2'>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('integrations.configFields.provider')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{getIntegrationProviderLabel(config.provider)}
											</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('integrations.configFields.key')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>{config.key}</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('integrations.configFields.isSecret')}
											</p>
											<p className={`mt-1 ${valueClassName}`}>
												{config.is_secret
													? t('integrations.secret')
													: t('integrations.public')}
											</p>
										</div>
										<div className='rounded-lg bg-surface-subtle/80 p-3'>
											<p className={labelClassName}>
												{t('integrations.configFields.updatedBy')}
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
									<div className='flex items-center justify-between gap-3'>
										<h3 className='m-0 text-[1rem] font-semibold text-text-primary'>
											{t('integrations.configFields.value')}
										</h3>
										{config.is_secret ? (
											<button
												type='button'
												className='inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-surface-subtle px-2.5 text-xs font-semibold text-text-secondary transition duration-fast hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25'
												onClick={() => setRevealSecret(current => !current)}
											>
												{revealSecret ? (
													<FiEyeOff className='h-3.5 w-3.5' />
												) : (
													<FiEye className='h-3.5 w-3.5' />
												)}
												{revealSecret
													? t('integrations.hideValue')
													: t('integrations.revealValue')}
											</button>
										) : null}
									</div>
									<div className='max-h-[220px] overflow-y-auto rounded-lg bg-surface-subtle/80 p-3'>
										<p className='m-0 whitespace-pre-wrap text-sm leading-6 text-text-primary'>
											{config.is_secret && !revealSecret
												? maskSecretValue(config.value)
												: config.value}
										</p>
									</div>
								</div>
							</PageCard>

							<PageCard>
								<dl className='m-0 grid gap-2'>
									<div className='flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5'>
										<dt className={labelClassName}>
											{t('integrations.configFields.createdAt')}
										</dt>
										<dd className={`m-0 ${valueClassName}`}>
											{formatIntegrationDateTime(
												config.created_at,
												i18n.language,
												locale,
												t('common.na'),
											)}
										</dd>
									</div>
									<div className='flex items-center justify-between gap-3 rounded-lg bg-surface-subtle/80 px-3 py-2.5'>
										<dt className={labelClassName}>
											{t('integrations.configFields.updatedAt')}
										</dt>
										<dd className={`m-0 ${valueClassName}`}>
											{formatIntegrationDateTime(
												config.updated_at,
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
											onClick={() => onEdit(config)}
										>
											<FiEdit2 className='h-4 w-4' />
											{t('integrations.actions.edit')}
										</button>
										<button
											type='button'
											className='inline-flex min-h-10 items-center gap-2 rounded-lg bg-danger-bg px-4 text-sm font-semibold text-danger transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30'
											onClick={() => onDelete(config)}
										>
											<FiTrash2 className='h-4 w-4' />
											{t('integrations.actions.delete')}
										</button>
									</div>
								) : (
									<p className='m-0 rounded-lg bg-surface-subtle/90 px-3 py-2.5 text-sm text-text-secondary'>
										{t('integrations.configDetail.readOnlyHint')}
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

export default IntegrationConfigDetailPanel

