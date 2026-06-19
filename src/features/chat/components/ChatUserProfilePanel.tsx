import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMapPin, FiPhone, FiTag } from 'react-icons/fi'
import { createPortal } from 'react-dom'
import AppIcon from '../../../components/shared/icons/AppIcon'
import { formatLocalizedDate } from '../../../i18n/date-format'
import type { Conversation } from '../../../types/domain'

interface ChatUserProfilePanelProps {
	session: Conversation | null
	isOpen: boolean
	onClose: () => void
}

interface SessionStateStructuredExtraction {
	name?: string | null
	phone?: string | null
	address?: string | null
}

interface SessionStatePayload {
	customer_name?: string | null
	phone?: string | null
	address?: string | null
	selected_product_name?: string | null
	structured_extraction?: SessionStateStructuredExtraction | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null
	}

	return value as Record<string, unknown>
}

function asText(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null
	}

	const trimmed = value.trim()
	return trimmed.length ? trimmed : null
}

function isUuidLike(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		value,
	)
}

function isLikelyIdValue(value: string, session: Conversation): boolean {
	if (!value) {
		return false
	}

	if (isUuidLike(value)) {
		return true
	}

	if (
		value === session.client?.id ||
		value === session.lead?.id ||
		value === session.external_id
	) {
		return true
	}

	return false
}

function resolveDisplayName(
	session: Conversation,
	statePayload: SessionStatePayload | null,
	fallbackUnknown: string,
): string {
	const candidates: Array<string | null> = [
		statePayload?.customer_name ?? null,
		statePayload?.structured_extraction?.name ?? null,
		session.client?.fullName ?? null,
		session.lead?.fullName ?? null,
	]

	for (const candidate of candidates) {
		if (!candidate) {
			continue
		}

		const normalized = candidate.trim()
		if (!normalized) {
			continue
		}

		if (isLikelyIdValue(normalized, session)) {
			continue
		}

		return normalized
	}

	return fallbackUnknown
}

function resolveStatePayload(
	session: Conversation,
): SessionStatePayload | null {
	const rawStateCandidates: unknown[] = [
		session.state_data,
		typeof session.state === 'object' ? session.state : null,
	]

	for (const candidate of rawStateCandidates) {
		const record = asRecord(candidate)
		if (!record) {
			continue
		}

		const structuredExtractionRecord = asRecord(record.structured_extraction)

		return {
			customer_name: asText(record.customer_name),
			phone: asText(record.phone),
			address: asText(record.address),
			selected_product_name: asText(record.selected_product_name),
			structured_extraction: structuredExtractionRecord
				? {
						name: asText(structuredExtractionRecord.name),
						phone: asText(structuredExtractionRecord.phone),
						address: asText(structuredExtractionRecord.address),
					}
				: null,
		}
	}

	return null
}

function formatDateTime(
	value: string | null,
	language: string,
	locale: string,
): string | null {
	if (!value) {
		return null
	}

	return formatLocalizedDate(value, language, {
		locale,
		withYear: true,
		withTime: true,
		shortMonth: true,
		fallback: '',
	})
}

function getInitial(name: string): string {
	const trimmed = name.trim()
	if (!trimmed) {
		return '?'
	}

	return trimmed.charAt(0).toUpperCase()
}

function ChatUserProfilePanel({
	session,
	isOpen,
	onClose,
}: ChatUserProfilePanelProps) {
	const { i18n } = useTranslation()
	const isRu = i18n.language === 'ru'
	const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ'
	const labels = {
		profile: isRu ? 'Профиль клиента' : 'Mijoz profili',
		closeProfile: isRu ? 'Закрыть панель профиля' : 'Profil panelini yopish',
		mainInfo: isRu ? 'Основная информация' : "Asosiy ma'lumot",
		phone: isRu ? 'Телефон' : 'Telefon',
		address: isRu ? 'Адрес' : 'Manzil',
		lastActivity: isRu ? 'Последняя активность' : 'Oxirgi faollik',
		context: isRu ? 'Контекст' : 'Kontekst',
		selectedProduct: isRu ? 'Выбранный продукт' : 'Tanlangan mahsulot',
		noData: isRu ? 'Данные не найдены' : "Ma'lumot topilmadi",
		unknownCustomer: isRu ? 'Неизвестный клиент' : "Noma'lum mijoz",
		unknownChannel: isRu ? 'Неизвестно' : "Noma'lum",
		manual: isRu ? 'Вручную' : "Qo'lda",
		web: isRu ? 'Веб' : 'Veb',
	}

	useEffect(() => {
		if (!isOpen) {
			return undefined
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				onClose()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isOpen, onClose])

	const profileData = useMemo(() => {
		if (!session) {
			return null
		}

		const statePayload = resolveStatePayload(session)

		const name = resolveDisplayName(session, statePayload, labels.unknownCustomer)

		const phone =
			statePayload?.phone ??
			statePayload?.structured_extraction?.phone ??
			session.client?.phone ??
			session.lead?.phone ??
			null

		const address =
			statePayload?.address ??
			statePayload?.structured_extraction?.address ??
			null

		const selectedProduct = statePayload?.selected_product_name ?? null
		const lastActivity = formatDateTime(
			session.last_message_at,
			i18n.language,
			locale,
		)

		return {
			name,
			phone,
			address,
			selectedProduct,
			channelLabel:
				session.channel === 'manual'
					? labels.manual
					: session.channel === 'web'
						? labels.web
						: session.channel === 'telegram'
							? 'Telegram'
							: session.channel === 'instagram'
								? 'Instagram'
								: labels.unknownChannel,
			lastActivity,
		}
	}, [i18n.language, labels.manual, labels.unknownChannel, labels.unknownCustomer, labels.web, locale, session])

	const panel = (
		<div
			className={[
				'fixed inset-0 z-[260] transition-opacity duration-base',
				isOpen
					? 'pointer-events-auto opacity-100'
					: 'pointer-events-none opacity-0',
			].join(' ')}
			aria-hidden={!isOpen}
		>
			<div
				className='absolute inset-0 bg-background-default'
				onClick={onClose}
				role='presentation'
			/>
			<aside
				className={[
					'absolute inset-y-0 right-0 flex h-full w-full max-w-full flex-col bg-surface-card p-4 shadow-[-18px_0_42px_-30px_rgba(25,28,30,0.36)] ring-1 ring-border-soft/55 transition-transform duration-base min-[640px]:max-w-[360px] min-[640px]:p-5',
					isOpen ? 'translate-x-0' : 'translate-x-full',
				].join(' ')}
				aria-label={labels.profile}
			>
				<header className='mb-4 flex items-center justify-between gap-3'>
					<h2 className='m-0 text-[1rem] font-semibold text-text-primary'>
						{labels.profile}
					</h2>
					<button
						type='button'
						className='inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-card text-text-primary ring-1 ring-border-soft/55 transition duration-fast hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
						onClick={onClose}
						aria-label={labels.closeProfile}
					>
						<AppIcon name='close' className='h-4.5 w-4.5' aria-hidden='true' />
					</button>
				</header>

				<div className='chat-profile-scroll--nova grid min-h-0 gap-3 overflow-y-auto pr-1'>
					{profileData ? (
						<>
							<section className='rounded-xl bg-surface-card p-4 ring-1 ring-border-soft/45'>
								<div className='flex items-start gap-3'>
									<span className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[15px] font-bold text-white'>
										{getInitial(profileData.name)}
									</span>
									<div className='min-w-0'>
										<p className='m-0 truncate text-[1rem] font-semibold text-text-primary'>
											{profileData.name}
										</p>
										{profileData.phone ? (
											<p className='m-0 mt-1 text-sm text-text-secondary'>
												{profileData.phone}
											</p>
										) : null}
										<span className='mt-2 inline-flex min-h-6 items-center rounded-pill bg-success-bg px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-success'>
											{profileData.channelLabel}
										</span>
									</div>
								</div>
							</section>

							<section className='rounded-xl bg-surface-card p-4 ring-1 ring-border-soft/45'>
								<h3 className='m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'>
									{labels.mainInfo}
								</h3>
								<div className='mt-3 grid gap-2.5'>
									{profileData.phone ? (
										<div className='flex items-start gap-2.5 rounded-lg bg-surface-subtle/75 px-3 py-2.5'>
											<FiPhone className='mt-0.5 h-4 w-4 text-text-muted' />
											<div className='min-w-0'>
												<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted'>
													{labels.phone}
												</p>
												<p className='m-0 mt-0.5 text-sm font-semibold text-text-primary'>
													{profileData.phone}
												</p>
											</div>
										</div>
									) : null}

									{profileData.address ? (
										<div className='flex items-start gap-2.5 rounded-lg bg-surface-subtle/75 px-3 py-2.5'>
											<FiMapPin className='mt-0.5 h-4 w-4 text-text-muted' />
											<div className='min-w-0'>
												<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted'>
													{labels.address}
												</p>
												<p className='m-0 mt-0.5 text-sm font-semibold text-text-primary [overflow-wrap:anywhere]'>
													{profileData.address}
												</p>
											</div>
										</div>
									) : null}

									{profileData.lastActivity ? (
										<div className='rounded-lg bg-surface-subtle/75 px-3 py-2.5'>
											<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted'>
												{labels.lastActivity}
											</p>
											<p className='m-0 mt-0.5 text-sm font-semibold text-text-primary'>
												{profileData.lastActivity}
											</p>
										</div>
									) : null}
								</div>
							</section>

							{profileData.selectedProduct ? (
								<section className='rounded-xl bg-surface-card p-4 ring-1 ring-border-soft/45'>
									<h3 className='m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'>
										{labels.context}
									</h3>
									<div className='mt-3 flex items-start gap-2.5 rounded-lg bg-surface-subtle/75 px-3 py-2.5'>
										<FiTag className='mt-0.5 h-4 w-4 text-text-muted' />
										<div className='min-w-0'>
											<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted'>
												{labels.selectedProduct}
											</p>
											<p className='m-0 mt-0.5 text-sm font-semibold text-text-primary [overflow-wrap:anywhere]'>
												{profileData.selectedProduct}
											</p>
										</div>
									</div>
								</section>
							) : null}
						</>
					) : (
						<section className='rounded-xl bg-surface-card p-4 ring-1 ring-border-soft/45'>
							<p className='m-0 text-sm font-medium text-text-secondary'>
								{labels.noData}
							</p>
						</section>
					)}
				</div>
			</aside>
		</div>
	)

	if (typeof document === 'undefined') {
		return null
	}

	return createPortal(panel, document.body)
}

export default ChatUserProfilePanel
