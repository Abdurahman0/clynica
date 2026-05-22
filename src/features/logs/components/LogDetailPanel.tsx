// @ts-nocheck

import { useEffect, useState } from 'react'
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
import type { AppLog, EntityId } from '../../../types/domain'
import { getLogTypeLabel, getLogTypeTone } from '../utils/log-format'

interface LogDetailPanelProps {
	logId: EntityId
	onClose: () => void
}

const labelClassName =
	'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'

const valueClassName =
	'text-sm font-semibold text-text-primary [overflow-wrap:anywhere]'

function formatLogDateTime(
	timestamp: string,
	language: string,
	locale: string,
): string {
	return formatLocalizedDate(timestamp, language, {
		locale,
		withYear: true,
		withTime: true,
		shortMonth: true,
		fallback: '',
	})
}

function formatMetadata(metadata: AppLog['metadata']): string {
	if (metadata == null) {
		return 'null'
	}

	if (typeof metadata === 'string') {
		const trimmed = metadata.trim()
		if (!trimmed) {
			return '""'
		}

		try {
			const parsed = JSON.parse(trimmed) as unknown
			return JSON.stringify(parsed, null, 2)
		} catch {
			return trimmed
		}
	}

	return JSON.stringify(metadata, null, 2)
}

function LogDetailPanel({ logId, onClose }: LogDetailPanelProps) {
	const { t, i18n } = useTranslation()
	const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ'
	const [log, setLog] = useState<AppLog | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)

	useEffect(() => {
		let isActive = true

		async function loadLog() {
			setIsLoading(true)
			setHasError(false)

			try {
				const nextLog = await services.logs.getApiLog(logId)
				if (!isActive) {
					return
				}

				setLog(nextLog)
			} catch {
				if (!isActive) {
					return
				}

				setHasError(true)
				setLog(null)
			} finally {
				if (isActive) {
					setIsLoading(false)
				}
			}
		}

		void loadLog()

		return () => {
			isActive = false
		}
	}, [logId])

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

	return (
		<div
			className='fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]'
			onClick={onClose}
			role='presentation'
		>
			<aside
				className='h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[620px] min-[641px]:p-5'
				onClick={event => event.stopPropagation()}
				aria-label={t('logs.detail.ariaLabel')}
			>
				<header className='mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60'>
					<div className='flex items-start justify-between gap-3'>
						<div className='min-w-0'>
							<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary'>
								{t('logs.detail.eyebrow')}
							</p>
							<h2 className='mt-1 font-display text-[1.35rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]'>
								{log?.message ?? t('logs.detail.titleFallback')}
							</h2>
						</div>
						<button
							type='button'
							className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20'
							onClick={onClose}
							aria-label={t('logs.detail.close')}
						>
							<AppIcon
								name='close'
								className='h-4.5 w-4.5'
								aria-hidden='true'
							/>
						</button>
					</div>

					{!isLoading && log ? (
						<div className='mt-3 flex flex-wrap items-center gap-2'>
							<StatusBadge
								status={log.type}
								tone={getLogTypeTone(log.type)}
								label={getLogTypeLabel(log.type)}
							/>
						</div>
					) : null}
				</header>

				<div className='grid gap-3'>
					{isLoading ? (
						<LoadingState
							title={t('logs.detail.loadingTitle')}
							description={t('logs.detail.loadingDescription')}
						/>
					) : null}

					{!isLoading && (hasError || !log) ? (
						<EmptyState
							title={t('logs.detail.errorTitle')}
							description={t('logs.detail.errorDescription')}
						/>
					) : null}

					{!isLoading && log ? (
						<>
							<PageCard>
								<div className='grid gap-2.5'>
									<div className='rounded-lg bg-surface-subtle/80 p-3'>
										<p className={labelClassName}>{t('logs.columns.type')}</p>
										<p className={`mt-1 ${valueClassName}`}>
											{getLogTypeLabel(log.type)}
										</p>
									</div>
									<div className='rounded-lg bg-surface-subtle/80 p-3'>
										<p className={labelClassName}>
											{t('logs.columns.message')}
										</p>
										<p className='mt-1 whitespace-pre-wrap text-sm leading-6 text-text-primary'>
											{log.message}
										</p>
									</div>
									<div className='rounded-lg bg-surface-subtle/80 p-3'>
										<p className={labelClassName}>
											{t('logs.columns.createdAt')}
										</p>
										<p className={`mt-1 ${valueClassName}`}>
											{formatLogDateTime(log.created_at, i18n.language, locale)}
										</p>
									</div>
								</div>
							</PageCard>

							<PageCard>
								<div className='grid gap-2.5'>
									<p className={labelClassName}>
										{t('logs.detail.metadataTitle')}
									</p>
									<pre className='m-0 max-h-[320px] overflow-auto rounded-lg bg-surface-subtle/80 p-3 text-[12px] leading-6 text-text-secondary'>
										{formatMetadata(log.metadata)}
									</pre>
								</div>
							</PageCard>
						</>
					) : null}
				</div>
			</aside>
		</div>
	)
}

export default LogDetailPanel

