import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
	FiCalendar,
	FiEdit2,
	FiImage,
	FiPause,
	FiPlay,
	FiSend,
	FiTrash2,
	FiUser,
	FiX,
} from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { ru, uz } from 'date-fns/locale'
import chatBackground from '../../../assets/chat-background.svg'
import { FilterSelect } from '../../../components/shared/data'
import AppIcon from '../../../components/shared/icons/AppIcon'
import { EmptyState, LoadingState } from '../../../components/shared/page'
import { Calendar } from '../../../components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../../../components/ui/popover'
import {
	formatLocalizedDate,
	formatUzMonthYear,
} from '../../../i18n/date-format'
import { HandmadeDateTimePicker } from '../../clients/components/HandmadeDatePickers'
import ChatUserProfilePanel from './ChatUserProfilePanel'
import { getConversationDisplayName } from '../utils/conversation-display'
import type { ChatMessage, Conversation } from '../../../types/domain'

interface ChatWorkspacePanelProps {
	session: Conversation | null
	messages: ChatMessage[]
	isLoading: boolean
	isSending: boolean
	isDeletingSession?: boolean
	isUpdatingAIState?: boolean
	isUpdatingFollowUp?: boolean
	canManageFollowUp?: boolean
	onSendMessage: (content: string) => Promise<void>
	onRequestDeleteSession?: (session: Conversation) => void
	onPauseAI?: (session: Conversation, pausedUntilIso: string) => void
	onResumeAI?: (session: Conversation) => void
	onCreateFollowUp?: (
		session: Conversation,
		input: { scheduled_for: string; message: string },
	) => Promise<void>
	onUpdateFollowUp?: (
		session: Conversation,
		input: { scheduled_for: string; message: string },
	) => Promise<void>
	onRequestCancelFollowUp?: (session: Conversation) => void
}

const PAUSE_HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => {
	const value = String(index).padStart(2, '0')
	return { value, label: value }
})

const PAUSE_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => {
	const value = String(index).padStart(2, '0')
	return { value, label: value }
})

function formatDateTime(value: string | null, language: string, fallback: string): string {
	return formatLocalizedDate(value, language, {
		locale: language === 'ru' ? 'ru-RU' : 'uz-UZ',
		withYear: true,
		withTime: true,
		shortMonth: true,
		fallback,
	})
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

	return (
		value === session.client?.id ||
		value === session.lead?.id ||
		value === session.external_id
	)
}

function getSessionTitle(session: Conversation, fallbackUnknownCustomer: string): string {
	return getConversationDisplayName(session, fallbackUnknownCustomer)
}

function getInitial(value: string): string {
	const normalized = value.trim()
	if (!normalized) {
		return '?'
	}

	return normalized.charAt(0).toUpperCase()
}

function getSessionPersonType(
	session: Conversation,
	labels: { client: string; lead: string; contact: string },
): string {
	if (session.client) {
		return labels.client
	}

	if (session.lead) {
		return labels.lead
	}

	return labels.contact
}

function isAIPaused(session: Conversation): boolean {
	if (session.operator_needed || session.is_operator_active) {
		return true
	}

	if (!session.ai_paused_until) {
		return false
	}

	return new Date(session.ai_paused_until).getTime() > Date.now()
}

function toTimeInputValue(value: Date): string {
	const hours = String(value.getHours()).padStart(2, '0')
	const minutes = String(value.getMinutes()).padStart(2, '0')
	return `${hours}:${minutes}`
}

function toLocalDateTimeInputValue(value: Date): string {
	const year = value.getFullYear()
	const month = String(value.getMonth() + 1).padStart(2, '0')
	const day = String(value.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}T${toTimeInputValue(value)}`
}

function createPauseDefaults(): { date: Date; time: string } {
	const target = new Date(Date.now() + 30 * 60 * 1000)
	return {
		date: target,
		time: toTimeInputValue(target),
	}
}

function toPauseIsoOrNull(
	date: Date | undefined,
	timeValue: string,
): string | null {
	if (!date || !timeValue) {
		return null
	}

	const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeValue)
	if (!timeMatch) {
		return null
	}

	const hours = Number(timeMatch[1])
	const minutes = Number(timeMatch[2])
	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
		return null
	}

	const parsed = new Date(date)
	parsed.setHours(hours, minutes, 0, 0)
	if (Number.isNaN(parsed.getTime())) {
		return null
	}

	return parsed.toISOString()
}

function toIsoWithOffsetOrNull(
	date: Date | undefined,
	timeValue: string,
): string | null {
	if (!date || !timeValue) {
		return null
	}

	const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeValue)
	if (!timeMatch) {
		return null
	}

	const parsed = new Date(date)
	parsed.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0)
	if (Number.isNaN(parsed.getTime())) {
		return null
	}

	const year = parsed.getFullYear()
	const month = String(parsed.getMonth() + 1).padStart(2, '0')
	const day = String(parsed.getDate()).padStart(2, '0')
	const hours = String(parsed.getHours()).padStart(2, '0')
	const minutes = String(parsed.getMinutes()).padStart(2, '0')
	const seconds = String(parsed.getSeconds()).padStart(2, '0')
	const offsetMinutes = -parsed.getTimezoneOffset()
	const sign = offsetMinutes >= 0 ? '+' : '-'
	const absoluteOffset = Math.abs(offsetMinutes)
	const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, '0')
	const offsetRestMinutes = String(absoluteOffset % 60).padStart(2, '0')
	const offset = `${sign}${offsetHours}:${offsetRestMinutes}`

	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`
}

function toUtcIsoFromDateTimeInputOrNull(value: string): string | null {
	const trimmed = value.trim()
	if (!trimmed) {
		return null
	}

	const localMatch =
		/^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/.exec(trimmed)
	if (!localMatch) {
		const parsed = new Date(trimmed)
		if (Number.isNaN(parsed.getTime())) {
			return null
		}
		return parsed.toISOString()
	}

	const parsed = new Date(
		Number(localMatch[1]),
		Number(localMatch[2]) - 1,
		Number(localMatch[3]),
		Number(localMatch[4]),
		Number(localMatch[5]),
		0,
		0,
	)

	if (Number.isNaN(parsed.getTime())) {
		return null
	}

	return parsed.toISOString()
}

function splitTimeValue(value: string): { hour: string; minute: string } {
	const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
	if (!match) {
		return { hour: '00', minute: '00' }
	}

	return {
		hour: match[1],
		minute: match[2],
	}
}

function getAttachmentGridClassName(count: number): string {
	if (count <= 1) {
		return 'grid grid-cols-1 gap-2'
	}

	return 'grid grid-cols-2 gap-2'
}

function getAttachmentTileClassName(count: number, index: number): string {
	const baseClassName =
		'group relative overflow-hidden rounded-xl bg-surface-card/55 ring-1 ring-border-soft/45'

	if (count === 1) {
		return `${baseClassName} aspect-[4/3]`
	}

	if (count === 2) {
		return `${baseClassName} aspect-[4/3]`
	}

	if (count === 3 && index === 0) {
		return `${baseClassName} col-span-2 aspect-[16/9]`
	}

	return `${baseClassName} aspect-square`
}

function getAttachmentWrapperClassName(count: number): string {
	if (count <= 1) {
		return 'w-full max-w-[240px]'
	}

	if (count === 2) {
		return 'w-full max-w-[290px]'
	}

	return 'w-full max-w-[330px]'
}

function ChatWorkspacePanel({
	session,
	messages,
	isLoading,
	isSending,
	isDeletingSession = false,
	isUpdatingAIState = false,
	isUpdatingFollowUp = false,
	canManageFollowUp = false,
	onSendMessage,
	onRequestDeleteSession,
	onPauseAI,
	onResumeAI,
	onCreateFollowUp,
	onUpdateFollowUp,
	onRequestCancelFollowUp,
}: ChatWorkspacePanelProps) {
	const { t, i18n } = useTranslation()
	const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ'
	const calendarLocale = i18n.language === 'ru' ? ru : uz
	const senderLabels: Record<ChatMessage['sender_type'], string> = {
		customer: t('chatPage.workspace.sender.customer'),
		ai: t('chatPage.workspace.sender.ai'),
		operator: t('chatPage.workspace.sender.operator'),
		system: t('chatPage.workspace.sender.system'),
		follow_up: t('chatPage.workspace.sender.followUp'),
	}
	const labels = {
		selectDate: t('chatPage.workspace.selectDate'),
		invalidTime: t('chatPage.workspace.invalidTime'),
		futureTime: t('chatPage.workspace.futureTime'),
		resumeAi: t('chatPage.workspace.resumeAi'),
		pauseAiTime: t('chatPage.workspace.pauseAiTime'),
		deleteSession: t('chatPage.workspace.deleteSession'),
		pauseUntil: t('chatPage.workspace.pauseUntil'),
		cancel: t('chatPage.workspace.cancel'),
		minuteShort: t('chatPage.workspace.minuteShort'),
		messageLabel: t('chatPage.workspace.messageLabel'),
		attachedImages: t('chatPage.workspace.attachedImages'),
		attachedImage: t('chatPage.workspace.attachedImage'),
		close: t('chatPage.workspace.close'),
		emptyChatTitle: t('chatPage.workspace.emptyChatTitle'),
		emptyChatDescription: t('chatPage.workspace.emptyChatDescription'),
		openProfile: t('chatPage.workspace.openProfile'),
		aiOnAction: t('chatPage.workspace.aiOnAction'),
		aiOffAction: t('chatPage.workspace.aiOffAction'),
		aiPausedStatus: t('chatPage.workspace.aiPausedStatus'),
		operatorRequested: t('chatPage.workspace.operatorRequested'),
		followUpTitle: t('chatPage.workspace.followUp.title'),
		followUpSet: t('chatPage.workspace.followUp.set'),
		followUpEdit: t('chatPage.workspace.followUp.edit'),
		followUpCancel: t('chatPage.workspace.followUp.cancel'),
		followUpSave: t('chatPage.workspace.followUp.save'),
		followUpUpdate: t('chatPage.workspace.followUp.update'),
		followUpMessage: t('chatPage.workspace.followUp.message'),
		followUpMessagePlaceholder: t('chatPage.workspace.followUp.messagePlaceholder'),
		followUpDateTime: t('chatPage.workspace.followUp.dateTime'),
		followUpScheduledAt: t('chatPage.workspace.followUp.scheduledAt'),
		followUpValidationMessage: t('chatPage.workspace.followUp.validationMessage'),
		followUpNoData: t('chatPage.workspace.followUp.noData'),
		saveLoading: t('chatPage.workspace.saveLoading'),
		pauseSubmit: t('chatPage.workspace.pauseSubmit'),
		loadingMessagesTitle: t('chatPage.workspace.loadingMessagesTitle'),
		loadingMessagesDescription: t('chatPage.workspace.loadingMessagesDescription'),
		noMessagesTitle: t('chatPage.workspace.noMessagesTitle'),
		noMessagesDescription: t('chatPage.workspace.noMessagesDescription'),
		messagePlaceholder: t('chatPage.workspace.messagePlaceholder'),
		sendAria: t('chatPage.workspace.sendAria'),
		timeUnavailable: t('chatPage.workspace.timeUnavailable'),
		personClient: t('chatPage.workspace.person.client'),
		personLead: t('chatPage.workspace.person.lead'),
		personContact: t('chatPage.workspace.person.contact'),
		unknownCustomer: t('chatPage.workspace.unknownCustomer'),
	}
	const [draftMessage, setDraftMessage] = useState('')
	const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false)
	const [isPauseEditorOpen, setIsPauseEditorOpen] = useState(false)
	const [isPauseCalendarOpen, setIsPauseCalendarOpen] = useState(false)
	const [pauseDate, setPauseDate] = useState<Date | undefined>(undefined)
	const [pauseTimeInput, setPauseTimeInput] = useState('')
	const [pauseInputError, setPauseInputError] = useState<string | null>(null)
	const [isFollowUpEditorOpen, setIsFollowUpEditorOpen] = useState(false)
	const [followUpDateTimeInput, setFollowUpDateTimeInput] = useState('')
	const [followUpMessage, setFollowUpMessage] = useState('')
	const [followUpInputError, setFollowUpInputError] = useState<string | null>(null)
	const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
	const messagesContainerRef = useRef<HTMLDivElement | null>(null)
	const lastScrollSignatureRef = useRef('')
	const shouldForceBottomOnOpenRef = useRef(false)
	const previousFollowUpIdRef = useRef<string | null>(null)

	const canSend = useMemo(
		() => draftMessage.trim().length > 0 && !isSending && Boolean(session),
		[draftMessage, isSending, session],
	)

	useEffect(() => {
		const defaults = createPauseDefaults()
		setIsProfilePanelOpen(false)
		setIsPauseEditorOpen(false)
		setIsPauseCalendarOpen(false)
		setPauseInputError(null)
		setPauseDate(defaults.date)
		setPauseTimeInput(defaults.time)
		setIsFollowUpEditorOpen(false)
		setFollowUpDateTimeInput(toLocalDateTimeInputValue(defaults.date))
		setFollowUpMessage('')
		setFollowUpInputError(null)
		setPreviewImageUrl(null)
		lastScrollSignatureRef.current = ''
		shouldForceBottomOnOpenRef.current = true
		previousFollowUpIdRef.current = null
	}, [session?.id])

	useLayoutEffect(() => {
		if (!session || isLoading || !shouldForceBottomOnOpenRef.current) {
			return
		}

		const container = messagesContainerRef.current
		if (!container) {
			return
		}

		container.scrollTop = container.scrollHeight
		shouldForceBottomOnOpenRef.current = false
	}, [session?.id, isLoading, messages.length])

	useEffect(() => {
		const container = messagesContainerRef.current
		if (!container || !session) {
			return
		}

		const lastMessageId = messages[messages.length - 1]?.id ?? 'empty'
		const signature = `${session.id}:${messages.length}:${lastMessageId}`
		if (lastScrollSignatureRef.current === signature) {
			return
		}

		lastScrollSignatureRef.current = signature

		container.scrollTo({
			top: container.scrollHeight,
			behavior: 'auto',
		})
	}, [messages, session])

	async function submitMessage() {
		if (!canSend) {
			return
		}

		await onSendMessage(draftMessage.trim())
		setDraftMessage('')
	}

	function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault()
			void submitMessage()
		}
	}

	const activeFollowUp = session?.active_follow_up ?? null
	const shouldShowFollowUpPanel = Boolean(activeFollowUp || canManageFollowUp)
	const sessionTitle = session
		? getSessionTitle(session, labels.unknownCustomer)
		: labels.unknownCustomer
	const aiPaused = session ? isAIPaused(session) : false
	const pauseDateLabel = pauseDate
		? formatLocalizedDate(pauseDate, i18n.language, {
				locale,
				withYear: true,
				shortMonth: true,
				fallback: '',
			})
		: labels.selectDate
	const pauseTimeParts = splitTimeValue(pauseTimeInput)

	useEffect(() => {
		const previousFollowUpId = previousFollowUpIdRef.current

		if (!activeFollowUp) {
			if (previousFollowUpId && isFollowUpEditorOpen) {
				setIsFollowUpEditorOpen(false)
				setFollowUpInputError(null)
			}
			previousFollowUpIdRef.current = null
			return
		}

		previousFollowUpIdRef.current = activeFollowUp.id

		const parsed = new Date(activeFollowUp.scheduled_for)
		if (!Number.isNaN(parsed.getTime())) {
			setFollowUpDateTimeInput(toLocalDateTimeInputValue(parsed))
		}
		setFollowUpMessage(activeFollowUp.message || '')
	}, [
		activeFollowUp?.id,
		activeFollowUp?.scheduled_for,
		activeFollowUp?.message,
		isFollowUpEditorOpen,
	])

	if (!session) {
		return (
			<div className='grid h-full min-h-0 place-items-center p-1'>
				<EmptyState
					title={labels.emptyChatTitle}
					description={labels.emptyChatDescription}
				/>
			</div>
		)
	}

	const activeSession = session

	function handleQuickPause(minutes: number) {
		const target = new Date(Date.now() + minutes * 60 * 1000)
		setPauseDate(target)
		setPauseTimeInput(toTimeInputValue(target))
		setPauseInputError(null)
	}

	function handlePauseSubmit() {
		if (!onPauseAI) {
			return
		}

		const pauseIso = toPauseIsoOrNull(pauseDate, pauseTimeInput)
		if (!pauseIso) {
			setPauseInputError(labels.invalidTime)
			return
		}

		if (new Date(pauseIso).getTime() <= Date.now()) {
			setPauseInputError(labels.futureTime)
			return
		}

		setPauseInputError(null)
		onPauseAI(activeSession, pauseIso)
		setIsPauseEditorOpen(false)
	}

	function openFollowUpEditor() {
		const defaults = createPauseDefaults()
		if (activeFollowUp) {
			const parsed = new Date(activeFollowUp.scheduled_for)
			setFollowUpDateTimeInput(
				toLocalDateTimeInputValue(
					Number.isNaN(parsed.getTime()) ? defaults.date : parsed,
				),
			)
			setFollowUpMessage(activeFollowUp.message || '')
		} else {
			setFollowUpDateTimeInput(toLocalDateTimeInputValue(defaults.date))
			setFollowUpMessage('')
		}
		setFollowUpInputError(null)
		setIsFollowUpEditorOpen(true)
	}

	function closeFollowUpEditor() {
		setIsFollowUpEditorOpen(false)
		setFollowUpInputError(null)
	}

	async function submitFollowUp() {
		if (!canManageFollowUp) {
			return
		}

		const scheduledFor = toUtcIsoFromDateTimeInputOrNull(followUpDateTimeInput)
		if (!scheduledFor) {
			setFollowUpInputError(labels.invalidTime)
			return
		}

		if (new Date(scheduledFor).getTime() <= Date.now()) {
			setFollowUpInputError(labels.futureTime)
			return
		}

		const message = followUpMessage.trim()
		if (!message) {
			setFollowUpInputError(labels.followUpValidationMessage)
			return
		}

		setFollowUpInputError(null)

		if (activeFollowUp) {
			await onUpdateFollowUp?.(activeSession, {
				scheduled_for: scheduledFor,
				message,
			})
		} else {
			await onCreateFollowUp?.(activeSession, {
				scheduled_for: scheduledFor,
				message,
			})
		}

		closeFollowUpEditor()
	}

	const followUpPanel = shouldShowFollowUpPanel ? (
		<div className='relative rounded-xl bg-surface-card/90 p-2.5 ring-1 ring-border-soft/55'>
			<div className='flex min-h-9 items-center justify-between gap-2'>
				<div className='min-w-0'>
					<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted'>
						{labels.followUpTitle}
					</p>
					{activeFollowUp ? (
						<p className='m-0 truncate text-[12px] font-semibold text-text-primary'>
							{formatDateTime(activeFollowUp.scheduled_for, i18n.language, labels.timeUnavailable)}
						</p>
					) : null}
				</div>

				<div className='flex shrink-0 items-center gap-1.5'>
					{!activeFollowUp && canManageFollowUp ? (
						<button
							type='button'
							className='inline-flex min-h-8 items-center rounded-lg bg-primary/12 px-3 text-xs font-semibold text-primary transition duration-fast hover:bg-primary/18 disabled:cursor-not-allowed disabled:opacity-60'
							onClick={openFollowUpEditor}
							disabled={isUpdatingFollowUp}
						>
							{labels.followUpSet}
						</button>
					) : null}

					{activeFollowUp && canManageFollowUp ? (
						<>
							<button
								type='button'
								className='inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-subtle/75 text-text-secondary transition duration-fast hover:bg-surface-subtle hover:text-text-primary'
								onClick={openFollowUpEditor}
								disabled={isUpdatingFollowUp}
								aria-label={labels.followUpEdit}
								title={labels.followUpEdit}
							>
								<FiEdit2 className='h-3.5 w-3.5' />
							</button>
							<button
								type='button'
								className='inline-flex h-8 w-8 items-center justify-center rounded-md bg-danger-bg/70 text-danger transition duration-fast hover:bg-danger-bg disabled:cursor-not-allowed disabled:opacity-60'
								onClick={() => {
									onRequestCancelFollowUp?.(activeSession)
								}}
								disabled={isUpdatingFollowUp}
								aria-label={labels.followUpCancel}
								title={labels.followUpCancel}
							>
								<FiX className='h-3.5 w-3.5' />
							</button>
						</>
					) : null}
				</div>
			</div>

			{isFollowUpEditorOpen ? (
				<div className='absolute left-1/2 top-[calc(100%+0.5rem)] z-40 grid w-[min(92vw,520px)] -translate-x-1/2 gap-2 rounded-xl bg-surface-card p-3 text-left shadow-[0_22px_52px_-28px_rgba(15,23,42,0.55)] ring-1 ring-border-soft/70'>
					<div className='grid gap-1.5'>
						<label className='text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted'>
							{labels.followUpDateTime}
						</label>
						<HandmadeDateTimePicker
							value={followUpDateTimeInput}
							onChange={value => {
								setFollowUpDateTimeInput(value)
								setFollowUpInputError(null)
							}}
							placeholder={labels.selectDate}
							locale={locale}
							disabled={isUpdatingFollowUp}
						/>
					</div>

					<div className='grid gap-1.5'>
						<label className='text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted'>
							{labels.followUpMessage}
						</label>
						<textarea
							value={followUpMessage}
							onChange={event => {
								setFollowUpMessage(event.target.value)
								setFollowUpInputError(null)
							}}
							rows={3}
							className='w-full resize-y rounded-xl border border-border-soft/60 bg-surface-card px-3 py-2.5 text-sm text-text-primary outline-none transition duration-fast focus:border-primary/45 focus:ring-2 focus:ring-primary/20'
							placeholder={labels.followUpMessagePlaceholder}
							disabled={isUpdatingFollowUp}
						/>
					</div>

					{followUpInputError ? (
						<p className='m-0 text-[12px] font-medium text-danger'>
							{followUpInputError}
						</p>
					) : null}

					<div className='flex items-center justify-end gap-2'>
						<button
							type='button'
							className='inline-flex min-h-9 items-center rounded-lg bg-surface-subtle px-3 text-xs font-semibold text-text-secondary transition duration-fast hover:bg-surface-muted'
							onClick={closeFollowUpEditor}
							disabled={isUpdatingFollowUp}
						>
							{labels.cancel}
						</button>
						<button
							type='button'
							className='inline-flex min-h-9 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60'
							onClick={() => {
								void submitFollowUp()
							}}
							disabled={isUpdatingFollowUp}
						>
							{isUpdatingFollowUp
								? labels.saveLoading
								: activeFollowUp
									? labels.followUpUpdate
									: labels.followUpSave}
						</button>
					</div>
				</div>
			) : null}
		</div>
	) : null

	return (
		<div className='flex h-full min-h-0 flex-col gap-3 bg-background-default text-text-primary'>
			<div className='w-full rounded-xl bg-background-subtle/80 p-3.5 text-left ring-1 ring-border-soft/50'>
				<div className='flex flex-wrap items-start gap-3'>
					<button
						type='button'
						className='flex min-w-0 flex-1 items-center gap-3 rounded-lg border-0 bg-transparent p-0 text-left outline-none transition duration-fast cursor-pointer hover:opacity-95 focus-visible:ring-2 focus-visible:ring-primary/35 min-[980px]:max-w-[40%]'
						onClick={() => setIsProfilePanelOpen(true)}
						title={labels.openProfile}
					>
						<span className='inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[16px] font-bold text-white shadow-[0_12px_28px_-20px_rgba(16,185,129,0.85)]'>
							{getInitial(sessionTitle)}
						</span>
						<div className='min-w-0'>
							<h3 className='m-0 truncate text-[1rem] font-semibold text-text-primary'>
								{sessionTitle}
							</h3>
							<p className='m-0 mt-0.5 text-sm font-medium text-text-secondary'>
								{getSessionPersonType(session, {
									client: labels.personClient,
									lead: labels.personLead,
									contact: labels.personContact,
								})}
							</p>
						</div>
					</button>
					<div className='hidden min-w-0 flex-1 min-[980px]:block'>
						{followUpPanel}
					</div>

					<div className='flex shrink-0 items-center gap-2'>
						{aiPaused ? (
							<button
								type='button'
								className='inline-flex h-10 items-center gap-1.5 rounded-full bg-success-bg px-3 text-success transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30 disabled:cursor-not-allowed disabled:opacity-60'
								onClick={event => {
									event.stopPropagation()
									onResumeAI?.(activeSession)
								}}
								disabled={isUpdatingAIState}
								aria-label={labels.resumeAi}
								title={labels.resumeAi}
							>
								<FiPlay className='h-4 w-4' />
								<span className='text-xs font-semibold uppercase tracking-[0.08em]'>
									{isUpdatingAIState ? '...' : labels.aiOnAction}
								</span>
							</button>
						) : (
							<button
								type='button'
								className='inline-flex h-10 items-center gap-1.5 rounded-full bg-primary/15 px-3 text-primary transition duration-fast hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60'
								onClick={event => {
									event.stopPropagation()
									setIsPauseEditorOpen(current => !current)
								}}
								disabled={isUpdatingAIState}
								aria-label={labels.pauseAiTime}
								title={labels.pauseAiTime}
							>
								<FiPause className='h-4 w-4' />
								<span className='text-xs font-semibold uppercase tracking-[0.08em]'>
									{isUpdatingAIState ? '...' : labels.aiOffAction}
								</span>
							</button>
						)}
						{onRequestDeleteSession ? (
							<button
								type='button'
								className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/35 disabled:cursor-not-allowed disabled:opacity-60'
								onClick={event => {
									event.stopPropagation()
									onRequestDeleteSession(activeSession)
								}}
								disabled={isDeletingSession}
								aria-label={labels.deleteSession}
								title={labels.deleteSession}
							>
								<FiTrash2 className='h-4 w-4' />
							</button>
						) : null}
					</div>
				</div>
				<div className='mt-2 min-[980px]:hidden'>{followUpPanel}</div>

				{aiPaused && session.ai_paused_until ? (
					<p className='m-0 mt-2 text-[12px] font-medium text-warning'>
						{labels.aiPausedStatus}: {formatDateTime(activeSession.ai_paused_until, i18n.language, labels.timeUnavailable)}
					</p>
				) : null}

				{activeSession.operator_needed ? (
					<p className='m-0 mt-2 text-[12px] font-medium text-warning'>
						{labels.operatorRequested}
					</p>
				) : null}

				{!aiPaused && isPauseEditorOpen ? (
					<div className='mt-2 grid gap-2 rounded-xl bg-surface-card/90 p-3 ring-1 ring-border-soft/55'>
						<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted'>
							{labels.pauseUntil}
						</p>
						<div className='grid gap-2 min-[520px]:grid-cols-[minmax(0,1fr)_196px]'>
							<Popover
								open={isPauseCalendarOpen}
								onOpenChange={setIsPauseCalendarOpen}
							>
								<PopoverTrigger asChild>
									<button
										type='button'
										className='inline-flex h-10 w-full items-center justify-between gap-2 rounded-pill border border-border-soft/70 bg-gradient-to-b from-surface-card to-surface-subtle/80 px-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary shadow-[0_15px_26px_-22px_rgba(16,185,129,0.55)] transition duration-fast hover:border-success/45 hover:text-text-primary'
										aria-label={labels.selectDate}
									>
										<span className='inline-flex items-center gap-2 truncate'>
											<AppIcon
												name='calendar'
												className='h-3.5 w-3.5 text-success'
												aria-hidden='true'
											/>
											<span className='truncate'>{pauseDateLabel}</span>
										</span>
										<AppIcon
											name='chevron-down'
											className={[
												'h-3.5 w-3.5 shrink-0 transition duration-fast',
												isPauseCalendarOpen
													? 'rotate-180 text-success'
													: 'text-text-muted',
											].join(' ')}
											aria-hidden='true'
										/>
									</button>
								</PopoverTrigger>
								<PopoverContent className='w-auto p-3' align='start'>
									<Calendar
										mode='single'
										selected={pauseDate}
										defaultMonth={pauseDate ?? new Date()}
										locale={calendarLocale}
										formatters={
											i18n.language === 'uz'
												? {
														formatCaption: date =>
															formatUzMonthYear(date, false),
													}
												: undefined
										}
										onSelect={value => {
											setPauseDate(value ?? undefined)
											setPauseInputError(null)
											setIsPauseCalendarOpen(false)
										}}
									/>
								</PopoverContent>
							</Popover>

							<div className='grid grid-cols-2 gap-2 rounded-pill bg-surface-subtle/70 p-1 ring-1 ring-border-soft/45'>
								<FilterSelect
									value={pauseTimeParts.hour}
									options={PAUSE_HOUR_OPTIONS}
									onChange={nextHour => {
										setPauseTimeInput(`${nextHour}:${pauseTimeParts.minute}`)
										setPauseInputError(null)
									}}
									disabled={isUpdatingAIState}
									size='compact'
								/>
								<FilterSelect
									value={pauseTimeParts.minute}
									options={PAUSE_MINUTE_OPTIONS}
									onChange={nextMinute => {
										setPauseTimeInput(`${pauseTimeParts.hour}:${nextMinute}`)
										setPauseInputError(null)
									}}
									disabled={isUpdatingAIState}
									size='compact'
								/>
							</div>
						</div>
						<div className='flex flex-wrap gap-1.5'>
							{[15, 30, 60, 120].map(minutes => (
								<button
									key={minutes}
									type='button'
									className='inline-flex min-h-7 items-center rounded-pill bg-surface-subtle px-2.5 text-[11px] font-semibold text-text-secondary ring-1 ring-border-soft/45 transition duration-fast hover:bg-surface-muted hover:text-text-primary'
									onClick={() => handleQuickPause(minutes)}
								>
									{minutes} {labels.minuteShort}
								</button>
							))}
						</div>
						{pauseInputError ? (
							<p className='m-0 text-[12px] font-medium text-danger'>
								{pauseInputError}
							</p>
						) : null}
						<div className='flex items-center justify-end gap-2'>
							<button
								type='button'
								className='inline-flex min-h-9 items-center rounded-lg bg-surface-subtle px-3 text-xs font-semibold text-text-secondary transition duration-fast hover:bg-surface-muted'
								onClick={() => {
									setIsPauseEditorOpen(false)
									setIsPauseCalendarOpen(false)
									setPauseInputError(null)
								}}
							>
								{labels.cancel}
							</button>
							<button
								type='button'
								className='inline-flex min-h-9 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60'
								onClick={handlePauseSubmit}
								disabled={isUpdatingAIState}
							>
								{isUpdatingAIState ? labels.saveLoading : labels.pauseSubmit}
							</button>
						</div>
					</div>
				) : null}

			</div>

			<div
				ref={messagesContainerRef}
				className='relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl ring-1 ring-border-soft/50'
				style={{
					backgroundImage: `url(${chatBackground})`,
					backgroundSize: 'cover',
					backgroundPosition: 'center',
					backgroundRepeat: 'no-repeat',
				}}
			>
				<div
					className='absolute inset-0 bg-background-default/56 dark:bg-background-default/78'
					aria-hidden='true'
				/>
				<div className='relative grid gap-3 p-3'>
					{isLoading ? (
						<LoadingState
							title={labels.loadingMessagesTitle}
							description={labels.loadingMessagesDescription}
						/>
					) : messages.length ? (
						<div className='grid gap-3'>
							{messages.map(message => {
								const outgoing = message.direction === 'outgoing'
								const hasTextContent = message.content.trim().length > 0
								const imageUrls = message.image_urls
								const hasImages = imageUrls.length > 0
								const attachedImagesLabel = labels.attachedImages
								const attachmentWrapperClassName = [
									'mt-2',
									getAttachmentWrapperClassName(imageUrls.length),
									outgoing ? 'ml-auto' : '',
								].join(' ')
								const attachmentCardClassName = [
									'mt-2 w-fit max-w-full rounded-2xl p-2.5 ring-1',
									outgoing
										? 'ml-auto bg-white/10 ring-white/25'
										: 'bg-background-subtle/90 ring-border-soft/55',
								].join(' ')

								return (
									<div
										key={message.id}
										className={[
											'flex items-end gap-2.5',
											outgoing ? 'justify-end' : 'justify-start',
										].join(' ')}
									>
										{!outgoing ? (
											<span className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-card/92 text-text-secondary ring-1 ring-border-soft/55 dark:bg-surface-subtle/92'>
												<FiUser className='h-4 w-4' />
											</span>
										) : null}

										<article
											className={[
												'max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ring-1',
												outgoing
													? 'bg-[linear-gradient(160deg,rgb(16_185_129),rgb(13_148_136))] text-white ring-success/35 shadow-[0_20px_40px_-28px_rgba(16,185,129,0.85)]'
													: 'bg-surface-card/95 text-text-primary ring-border-soft/60 dark:bg-surface-subtle/92',
											].join(' ')}
										>
											<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80'>
												{senderLabels[message.sender_type]}
											</p>
											{hasImages ? (
												<div className={attachmentCardClassName}>
													<p
														className={[
															'm-0 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap',
															outgoing
																? 'text-white/85'
																: 'text-text-secondary',
														].join(' ')}
													>
														<FiImage className='h-3 w-3' />
														{attachedImagesLabel}
													</p>
													<div
														className={`${attachmentWrapperClassName} ${getAttachmentGridClassName(imageUrls.length)}`}
													>
														{imageUrls.map((imageUrl, index) => (
															<div
																key={`${message.id}-image-${index}`}
																className={getAttachmentTileClassName(
																	imageUrls.length,
																	index,
																)}
															>
																<button
																	type='button'
																	className='h-full w-full cursor-zoom-in'
																	onClick={() => setPreviewImageUrl(imageUrl)}
																	aria-label={attachedImagesLabel}
																>
																	<img
																		src={imageUrl}
																		alt={`${attachedImagesLabel} ${index + 1}`}
																		className='h-full w-full object-cover transition duration-fast group-hover:scale-[1.015]'
																		loading='lazy'
																	/>
																</button>
															</div>
														))}
													</div>
												</div>
											) : null}
											{hasTextContent ? (
												<p className='m-0 mt-1 whitespace-pre-wrap text-sm leading-6'>
													{message.content}
												</p>
											) : null}
											<p
												className={[
													'm-0 mt-2 text-[11px]',
													outgoing ? 'text-white/80' : 'text-text-muted',
												].join(' ')}
											>
												{formatDateTime(message.created_at, i18n.language, labels.timeUnavailable)}
											</p>
										</article>
									</div>
								)
							})}
						</div>
					) : (
						<EmptyState
							title={labels.noMessagesTitle}
							description={labels.noMessagesDescription}
						/>
					)}
				</div>
			</div>

			<div className='rounded-xl bg-background-subtle/80 p-3 ring-1 ring-border-soft/55 dark:bg-surface-card/92'>
				<label className='sr-only' htmlFor='chat-message-input'>
					{labels.messageLabel}
				</label>
				<div className='flex items-end gap-2'>
					<textarea
						id='chat-message-input'
						value={draftMessage}
						onChange={event => setDraftMessage(event.target.value)}
						onKeyDown={handleComposerKeyDown}
						className='min-h-[56px] max-h-[132px] w-full flex-1 resize-y rounded-xl border-0 bg-surface-card/85 px-3 py-3 text-sm text-text-primary outline-none transition duration-fast placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-primary/35 dark:bg-background-subtle/85'
						placeholder={labels.messagePlaceholder}
						disabled={isSending}
					/>
					<button
						type='button'
						className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60'
						onClick={() => {
							void submitMessage()
						}}
						disabled={!canSend}
						aria-label={labels.sendAria}
					>
						<FiSend
							className={['h-4.5 w-4.5', isSending ? 'animate-pulse' : ''].join(
								' ',
							)}
						/>
					</button>
				</div>
			</div>

			<ChatUserProfilePanel
				session={activeSession}
				isOpen={isProfilePanelOpen}
				onClose={() => setIsProfilePanelOpen(false)}
			/>

			{previewImageUrl ? (
				<div
					className='fixed inset-0 z-[180] flex items-center justify-center bg-background-overlay/86 p-3 backdrop-blur-[3px] min-[640px]:p-6'
					onClick={event => {
						event.stopPropagation()
						setPreviewImageUrl(null)
					}}
					role='presentation'
				>
					<div
						className='relative flex w-full max-w-[980px] items-center justify-center rounded-2xl bg-surface-card/95 p-2 shadow-xl ring-1 ring-border-soft/55 min-[640px]:p-3'
						onClick={event => event.stopPropagation()}
					>
						<img
							src={previewImageUrl}
							alt={
								labels.attachedImage
							}
							className='max-h-[82vh] w-full rounded-xl object-contain'
						/>

						<button
							type='button'
							className='absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-subtle/92 text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20'
							onClick={() => setPreviewImageUrl(null)}
							aria-label={labels.close}
						>
							<AppIcon
								name='close'
								className='h-4.5 w-4.5'
								aria-hidden='true'
							/>
						</button>
					</div>
				</div>
			) : null}
		</div>
	)
}

export default ChatWorkspacePanel


