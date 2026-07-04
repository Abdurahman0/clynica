import { useEffect, useMemo, useState } from 'react'
import AppIcon from '../../../components/shared/icons/AppIcon'
import { formatLocalizedDate } from '../../../i18n/date-format'
import {
	createRecall,
	deleteRecall,
	listRecalls,
	updateRecall,
	type CrmRecall,
} from '../../../services/api/recalls.service'
import { ClientRecallScheduleField } from './ClientRecallSchedule'

interface RecallManagerPanelProps {
	clientId?: string | number | null
	language: string
	locale: string
	title?: string
	subtitle?: string
	showHistory?: boolean
	showEditor?: boolean
}

function getLabels(language: string) {
	const isRu = language.toLowerCase().startsWith('ru')

	return isRu
		? {
				title: 'Повторный звонок',
				subtitle: 'Запланируйте напоминание для клиента.',
				save: 'Сохранить',
				clear: 'Очистить',
				loading: 'Загрузка...',
				saving: 'Сохранение...',
				empty: 'Выберите время для повторного звонка.',
				saved: 'Напоминание сохранено.',
				cleared: 'Напоминание удалено.',
				failed: 'Не удалось сохранить напоминание.',
				history: 'Добавленные напоминания',
				remindAt: 'Напомнить',
				sent: 'Отправлено',
				pending: 'Активно',
			}
		: {
				title: "Qayta qo'ng'iroq",
				subtitle: 'Mijoz uchun eslatma vaqtini belgilang.',
				save: 'Saqlash',
				clear: 'Tozalash',
				loading: 'Yuklanmoqda...',
				saving: 'Saqlanmoqda...',
				empty: "Qayta qo'ng'iroq vaqtini tanlang.",
				saved: 'Eslatma saqlandi.',
				cleared: "Eslatma o'chirildi.",
				failed: "Eslatmani saqlab bo'lmadi.",
				history: "Qo'shilgan eslatmalar",
				remindAt: 'Eslatish',
			sent: 'Yuborilgan',
				pending: 'Faol',
			}
}

function sortRecallsForClient(clientId: string, recalls: CrmRecall[]): CrmRecall[] {
	return recalls
		.filter(item => item.client_id === clientId)
		.sort((left, right) => {
			if (left.is_active !== right.is_active) {
				return Number(right.is_active) - Number(left.is_active)
			}

			return (
				new Date(right.scheduled_for).getTime() -
				new Date(left.scheduled_for).getTime()
			)
		})
}

export function RecallManagerPanel({
	clientId,
	language,
	locale,
	title,
	subtitle,
	showHistory = false,
	showEditor = true,
}: RecallManagerPanelProps) {
	const labels = useMemo(() => getLabels(language), [language])
	const normalizedClientId = clientId == null ? '' : String(clientId)
	const [recallId, setRecallId] = useState<number | null>(null)
	const [scheduledFor, setScheduledFor] = useState<string | null>(null)
	const [initialSnapshot, setInitialSnapshot] = useState<{
		scheduledFor: string | null
	}>({ scheduledFor: null })
	const [clientRecalls, setClientRecalls] = useState<CrmRecall[]>([])
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
		null,
	)

	useEffect(() => {
		if (!normalizedClientId) {
			setRecallId(null)
			setScheduledFor(null)
			setInitialSnapshot({ scheduledFor: null })
			setClientRecalls([])
			return
		}

		let active = true
		setLoading(true)
		setMessage(null)

		void (async () => {
			try {
				const recalls = await listRecalls()
				if (!active) {
					return
				}

				const matchedRecalls = sortRecallsForClient(normalizedClientId, recalls)
				const matched = matchedRecalls[0] ?? null
				setClientRecalls(matchedRecalls)
				setRecallId(matched?.id ?? null)
				setScheduledFor(matched?.scheduled_for ?? null)
				setInitialSnapshot({
					scheduledFor: matched?.scheduled_for ?? null,
				})
			} catch {
				if (!active) {
					return
				}
				setMessage({ type: 'error', text: labels.failed })
			} finally {
				if (active) {
					setLoading(false)
				}
			}
		})()

		return () => {
			active = false
		}
	}, [labels.failed, normalizedClientId])

	if (!normalizedClientId) {
		return null
	}

	if (!showEditor && !loading && (!showHistory || clientRecalls.length === 0)) {
		return null
	}

	async function handleSave() {
		if (!scheduledFor) {
			setMessage({ type: 'error', text: labels.empty })
			return
		}

		const isUntouched =
			scheduledFor === initialSnapshot.scheduledFor

		if (isUntouched) {
			return
		}

		setSaving(true)
		setMessage(null)

		try {
			const payload = {
				client_id: Number(normalizedClientId),
				scheduled_for: new Date(scheduledFor).toISOString(),
				is_active: true,
			}

			const saved = recallId
				? await updateRecall(recallId, payload)
				: await createRecall(payload)

			const nextRecalls = sortRecallsForClient(normalizedClientId, [
				saved,
				...clientRecalls.filter(item => item.id !== saved.id),
			])

			setClientRecalls(nextRecalls)
			setRecallId(saved.id)
			setScheduledFor(saved.scheduled_for)
			setInitialSnapshot({ scheduledFor: saved.scheduled_for })
			setMessage({ type: 'success', text: labels.saved })
		} catch {
			setMessage({ type: 'error', text: labels.failed })
		} finally {
			setSaving(false)
		}
	}

	async function handleClear() {
		setSaving(true)
		setMessage(null)

		try {
			if (recallId) {
				await deleteRecall(recallId)
			}

			const nextRecalls = clientRecalls.filter(item => item.id !== recallId)
			const nextLatest = nextRecalls[0] ?? null

			setClientRecalls(nextRecalls)
			setRecallId(nextLatest?.id ?? null)
			setScheduledFor(nextLatest?.scheduled_for ?? null)
			setInitialSnapshot({
				scheduledFor: nextLatest?.scheduled_for ?? null,
			})
			setMessage({ type: 'success', text: labels.cleared })
		} catch {
			setMessage({ type: 'error', text: labels.failed })
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className='rounded-2xl bg-surface-card/90 p-4 shadow-sm ring-1 ring-border-soft/40'>
			<div className='mb-3 flex items-start justify-between gap-3'>
				<div className='min-w-0'>
					<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary'>
						{title ?? labels.title}
					</p>
					<p className='mt-1 text-sm text-text-secondary'>
						{subtitle ?? labels.subtitle}
					</p>
				</div>
				<span className='inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary'>
					<AppIcon name='calendar' className='h-4.5 w-4.5' aria-hidden='true' />
				</span>
			</div>

			{loading ? (
				<p className='m-0 rounded-xl bg-surface-subtle px-3 py-2 text-sm font-medium text-text-secondary'>
					{labels.loading}
				</p>
			) : (
				<div className='grid gap-3'>
					{showEditor ? (
						<ClientRecallScheduleField
							value={scheduledFor}
							onChange={setScheduledFor}
							language={language}
							locale={locale}
							disabled={saving}
						/>
					) : null}

					{showHistory && clientRecalls.length > 0 ? (
						<div className='grid gap-2'>
							<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'>
								{labels.history}
							</p>
							<div className='grid gap-2'>
								{clientRecalls.map(item => (
									<div
										key={item.id}
										className='rounded-xl bg-surface-subtle/80 px-3 py-3 ring-1 ring-border-soft/35'
									>
										<div className='flex flex-wrap items-start justify-between gap-2'>
											<div className='min-w-0'>
												<p className='m-0 text-sm font-semibold text-text-primary'>
													{formatLocalizedDate(item.scheduled_for, language, {
														locale,
														withYear: true,
														withTime: true,
														shortMonth: true,
														fallback: '-',
													})}
												</p>
												<p className='mt-1 text-[12px] text-text-muted'>
													{labels.remindAt}:{' '}
													{formatLocalizedDate(item.remind_at, language, {
														locale,
														withYear: true,
														withTime: true,
														shortMonth: true,
														fallback: '-',
													})}
												</p>
											</div>
											<span className='inline-flex min-h-7 items-center rounded-pill bg-primary/10 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary'>
												{item.reminder_sent_at ? labels.sent : labels.pending}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					) : null}

					{showEditor ? (
						<>
							{message ? (
								<p
									className={[
										'm-0 rounded-xl px-3 py-2 text-sm font-medium',
										message.type === 'success'
											? 'bg-success-bg text-success'
											: 'bg-danger-bg text-danger',
									].join(' ')}
								>
									{message.text}
								</p>
							) : null}

							<div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
								<button
									type='button'
									onClick={handleClear}
									disabled={saving}
									className='inline-flex min-h-10 items-center justify-center rounded-2xl bg-surface-subtle px-4 text-sm font-semibold text-text-secondary transition hover:bg-surface-muted hover:text-text-primary disabled:opacity-60'
								>
									{labels.clear}
								</button>
								<button
									type='button'
									onClick={() => void handleSave()}
									disabled={saving}
									className='inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary-accent disabled:opacity-60'
								>
									<AppIcon name='calendar' className='h-4 w-4' aria-hidden='true' />
									{saving ? labels.saving : labels.save}
								</button>
							</div>
						</>
					) : null}
				</div>
			)}
		</div>
	)
}
