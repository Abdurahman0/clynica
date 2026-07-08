import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../../../components/shared/dialogs/ConfirmDialog'
import { PageHeader, PageLayout } from '../../../components/shared/page'
import AppIcon from '../../../components/shared/icons/AppIcon'
import { FilterSelect, StatusBadge } from '../../../components/shared/data'
import { useAuth } from '../../../auth'
import { routePaths } from '../../../config/routes'
import { formatLocalizedDate } from '../../../i18n/date-format'
import { getChannelLabel } from '../../../i18n/labels'
import { services } from '../../../services'
import type { BookingItem } from '../../../services/contracts'
import type { SelectOption } from '../../../types/common'
import type { Conversation } from '../../../types/domain'
import { listBookingStatusColors } from '../../../services/api/booking-status-colors.service'
import {
	HandmadeDateTimePicker,
} from '../../../features/clients/components/HandmadeDatePickers'
import { RecallManagerPanel } from '../../../features/clients/components/RecallManagerPanel'

const DEFAULT_START_HOUR = 8
const DEFAULT_END_HOUR = 20
const HOUR_ROW_HEIGHT = 96
const PIXELS_PER_MINUTE = HOUR_ROW_HEIGHT / 60
const MAX_FETCH_PAGES = 30
const MAX_CLIENT_FETCH_PAGES = 20
const CHAT_LOOKUP_PAGE_SIZE = 120
const MAX_CHAT_LOOKUP_PAGES = 50

const formLabelClassName =
	'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'

const RU_WEEKDAY_NAMES = [
	'ВОСКРЕСЕНЬЕ',
	'ПОНЕДЕЛЬНИК',
	'ВТОРНИК',
	'СРЕДА',
	'ЧЕТВЕРГ',
	'ПЯТНИЦА',
	'СУББОТА',
]

const UZ_WEEKDAY_NAMES = [
	'YAKSHANBA',
	'DUSHANBA',
	'SESHANBA',
	'CHORSHANBA',
	'PAYSHANBA',
	'JUMA',
	'SHANBA',
]

interface TimelineItem extends BookingItem {
	startMinutes: number
	endMinutes: number
	lane: number
	laneCount: number
}

type BookingStatusValue =
	| 'pending'
	| 'confirmed'
	| 'came'
	| 'no_show'
	| 'cancelled'

interface ClientOption {
	id: string
	full_name: string
	phone?: string
	chatSessionId?: string
}

interface BookingFormState {
	clientId: string
	scheduledFor: string
	requestedDate: string
	status: BookingStatusValue
}

type BookingStatusColorMap = Partial<Record<BookingStatusValue, string>>

function toIsoDate(value: Date): string {
	const year = value.getFullYear()
	const month = `${value.getMonth() + 1}`.padStart(2, '0')
	const day = `${value.getDate()}`.padStart(2, '0')
	return `${year}-${month}-${day}`
}

function parseIsoDate(value: string): Date {
	const [year, month, day] = value.split('-').map(Number)
	return new Date(year, month - 1, day)
}

function parseCalendarDateTime(value: string | undefined): Date | null {
	if (!value) {
		return null
	}

	const match = value.match(
		/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/,
	)
	if (!match) {
		const parsed = new Date(value)
		return Number.isNaN(parsed.getTime()) ? null : parsed
	}

	const [, year, month, day, hour = '0', minute = '0'] = match
	return new Date(
		Number(year),
		Number(month) - 1,
		Number(day),
		Number(hour),
		Number(minute),
	)
}

function getDateKey(value: string | undefined): string {
	if (!value) {
		return ''
	}

	const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
	if (match) {
		return match[1]
	}

	const parsed = parseCalendarDateTime(value)
	return parsed ? toIsoDate(parsed) : ''
}

function getMinutesFromDate(value: string | undefined): number {
	const parsed = parseCalendarDateTime(value)
	if (!parsed) {
		return 0
	}

	return parsed.getHours() * 60 + parsed.getMinutes()
}

function shiftIsoDateByDays(value: string, days: number): string {
	const date = parseIsoDate(value)
	date.setDate(date.getDate() + days)
	return toIsoDate(date)
}

function getStartOfWeek(date: Date): Date {
	const result = new Date(date)
	const dayOffset = (result.getDay() + 6) % 7
	result.setDate(result.getDate() - dayOffset)
	result.setHours(0, 0, 0, 0)
	return result
}

function formatWeekdayName(date: Date, language: string): string {
	const day = date.getDay()
	if (language === 'ru') {
		return RU_WEEKDAY_NAMES[day] || ''
	}

	return UZ_WEEKDAY_NAMES[day] || ''
}

function formatDayNumber(date: Date, locale: string): string {
	return new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date)
}

function formatWeekRangeLabel(days: Date[], language: string, locale: string): string {
	const firstDay = days[0]
	const lastDay = days[days.length - 1]
	if (!firstDay || !lastDay) {
		return ''
	}

	const firstLabel = formatLocalizedDate(firstDay, language, {
		locale,
		withYear: false,
		withTime: false,
		shortMonth: true,
		fallback: '',
	})
	const lastLabel = formatLocalizedDate(lastDay, language, {
		locale,
		withYear: true,
		withTime: false,
		shortMonth: true,
		fallback: '',
	})

	return `${firstLabel} - ${lastLabel}`
}

function formatTimeLabel(value: string | undefined): string {
	const parsed = parseCalendarDateTime(value)
	if (!parsed) {
		return '--:--'
	}

	return new Intl.DateTimeFormat('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
	}).format(parsed)
}

function toDateTimeFieldValue(value: string | undefined): string {
	if (!value) {
		return ''
	}

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/)
		if (!match) {
			return ''
		}

		return `${match[1]}T${match[2]}`
	}

	const year = parsed.getFullYear()
	const month = `${parsed.getMonth() + 1}`.padStart(2, '0')
	const day = `${parsed.getDate()}`.padStart(2, '0')
	const hour = `${parsed.getHours()}`.padStart(2, '0')
	const minute = `${parsed.getMinutes()}`.padStart(2, '0')

	return `${year}-${month}-${day}T${hour}:${minute}`
}

function createDefaultScheduledFor(dateKey: string): string {
	return `${dateKey}T11:00`
}

function formatBookingDateValue(
	value: string | undefined,
	language: string,
	locale: string,
	withTime: boolean,
): string {
	const parsed = parseCalendarDateTime(value)
	if (!parsed) {
		return value || ''
	}

	return formatLocalizedDate(parsed, language, {
		locale,
		withYear: true,
		withTime,
		shortMonth: true,
		fallback: value || '',
	})
}

function formatDurationLabel(
	minutes: number | undefined,
	t: ReturnType<typeof useTranslation>['t'],
): string {
	if (!minutes) {
		return t('common.na')
	}

	return t('bookings.page.durationValue', {
		count: minutes,
		defaultValue: `${minutes} min`,
	})
}

function isHexColor(value: string | undefined): value is string {
	return Boolean(value && /^#?[0-9a-f]{6}$/i.test(value))
}

function normalizeHexColor(value: string | undefined, fallback: string): string {
	if (!isHexColor(value)) {
		return fallback
	}

	return value.startsWith('#') ? value : `#${value}`
}

function hexToRgba(hexColor: string, alpha: number): string {
	const normalized = hexColor.replace('#', '')
	const r = Number.parseInt(normalized.slice(0, 2), 16)
	const g = Number.parseInt(normalized.slice(2, 4), 16)
	const b = Number.parseInt(normalized.slice(4, 6), 16)
	return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getBookingStatusLabel(
	status: string | undefined,
	t: ReturnType<typeof useTranslation>['t'],
): string {
	const normalized = String(status || 'pending').toLowerCase()

	if (normalized === 'confirmed') {
		return t('tasks.bookingStatuses.confirmed')
	}
	if (normalized === 'came') {
		return t('tasks.bookingStatuses.came')
	}
	if (normalized === 'no_show') {
		return t('tasks.bookingStatuses.noShow')
	}
	if (normalized === 'cancelled') {
		return t('tasks.bookingStatuses.cancelled')
	}

	return t('tasks.bookingStatuses.pending')
}

function getBookingStatusTone(
	status: string | undefined,
): 'warning' | 'success' | 'danger' | 'info' | 'neutral' {
	const normalized = String(status || 'pending').toLowerCase()

	if (normalized === 'confirmed') {
		return 'info'
	}
	if (normalized === 'came') {
		return 'success'
	}
	if (normalized === 'no_show' || normalized === 'cancelled') {
		return 'danger'
	}

	return 'warning'
}

function getBookingCardClassName(status: string | undefined, isActive: boolean): string {
	const selectedState = isActive
		? 'ring-2 ring-primary/35 shadow-[0_22px_40px_-26px_rgba(99,102,241,0.58)]'
		: 'shadow-[0_14px_28px_-24px_rgba(15,23,42,0.32)] hover:shadow-[0_18px_34px_-24px_rgba(99,102,241,0.28)]'

	return `text-text-primary ${selectedState}`
}

function getBookingCardStyle(statusColor: string | undefined, isActive: boolean) {
	const color = normalizeHexColor(statusColor, '#8b5cf6')

	return {
		borderColor: hexToRgba(color, isActive ? 0.48 : 0.28),
		background: `linear-gradient(180deg, ${hexToRgba(color, 0.18)}, ${hexToRgba(color, 0.07)})`,
		boxShadow: isActive
			? `0 22px 40px -26px ${hexToRgba(color, 0.55)}`
			: `0 18px 34px -26px ${hexToRgba(color, 0.28)}`,
	}
}

function resolveBookingStatusColor(
	status: string | undefined,
	statusColor: string | undefined,
	statusColors: BookingStatusColorMap,
): string | undefined {
	if (statusColor) {
		return statusColor
	}

	const normalized = String(status || 'pending').toLowerCase() as BookingStatusValue
	return statusColors[normalized]
}

function resolveTimelineHours(
	_bookings: BookingItem[],
): { startHour: number; endHour: number } {
	return {
		startHour: DEFAULT_START_HOUR,
		endHour: DEFAULT_END_HOUR,
	}
}

function buildTimelineItems(bookings: BookingItem[]): TimelineItem[] {
	const sorted = [...bookings].sort((left, right) => {
		const startDiff =
			getMinutesFromDate(left.scheduled_for) - getMinutesFromDate(right.scheduled_for)
		if (startDiff !== 0) {
			return startDiff
		}

		return String(left.id).localeCompare(String(right.id))
	})

	const clusters: Array<Array<TimelineItem & { clusterEnd: number }>> = []

	for (const booking of sorted) {
		const startMinutes = getMinutesFromDate(booking.scheduled_for)
		const endMinutes = Math.max(
			startMinutes + 15,
			booking.ends_at
				? getMinutesFromDate(booking.ends_at)
				: startMinutes + (booking.duration_minutes || 30),
		)

		const item: TimelineItem & { clusterEnd: number } = {
			...booking,
			startMinutes,
			endMinutes,
			lane: 0,
			laneCount: 1,
			clusterEnd: endMinutes,
		}

		const currentCluster = clusters[clusters.length - 1]
		if (!currentCluster) {
			clusters.push([item])
			continue
		}

		const clusterEnd = Math.max(...currentCluster.map(entry => entry.clusterEnd))
		if (startMinutes < clusterEnd) {
			currentCluster.push(item)
			continue
		}

		clusters.push([item])
	}

	return clusters.flatMap(cluster => {
		const active: Array<{ lane: number; endMinutes: number }> = []
		let laneCount = 1

		for (const item of cluster) {
			for (let index = active.length - 1; index >= 0; index -= 1) {
				if (active[index]!.endMinutes <= item.startMinutes) {
					active.splice(index, 1)
				}
			}

			const usedLanes = new Set(active.map(entry => entry.lane))
			let lane = 0
			while (usedLanes.has(lane)) {
				lane += 1
			}

			item.lane = lane
			active.push({ lane, endMinutes: item.endMinutes })
			laneCount = Math.max(laneCount, active.length)
		}

		return cluster.map(({ clusterEnd: _clusterEnd, ...item }) => ({
			...item,
			laneCount,
		}))
	})
}

async function fetchAllBookings(): Promise<BookingItem[]> {
	const allItems: BookingItem[] = []

	for (let page = 1; page <= MAX_FETCH_PAGES; page += 1) {
		const response = await (services.clients as any).listBookings?.({
			page,
			page_size: 100,
		})

		if (!response) {
			return allItems
		}

		allItems.push(...response.items)

		if (!response.next || response.items.length === 0) {
			break
		}
	}

	return allItems
}

async function fetchAllClientOptions(): Promise<ClientOption[]> {
	const items: ClientOption[] = []
	const seen = new Set<string>()

	for (let page = 1; page <= MAX_CLIENT_FETCH_PAGES; page += 1) {
		const response = await services.clients.listClients({
			page,
			page_size: 100,
			ordering: '-updated_at',
		})

		for (const client of response.items) {
			if (!client.id || !client.full_name || seen.has(client.id)) {
				continue
			}

			seen.add(client.id)
			items.push({
				id: client.id,
				full_name: client.full_name,
				phone: client.phone,
				chatSessionId: client.chat_session_id || undefined,
			})
		}

		if (!response.next || response.items.length === 0) {
			break
		}
	}

	return items
}

async function findChatSessionIdForClient(clientId: string): Promise<string | null> {
	const normalizedClientId = String(clientId)

	for (let page = 1; page <= MAX_CHAT_LOOKUP_PAGES; page += 1) {
		const response = await services.chat.listSessions({
			page,
			pageSize: CHAT_LOOKUP_PAGE_SIZE,
			ordering: '-last_message_at',
		})

		const matchedSession = response.items.find(
			(session: Conversation) =>
				String(session.client?.id || '') === normalizedClientId,
		)
		if (matchedSession?.id) {
			return String(matchedSession.id)
		}

		const resolvedPageSize = Math.max(
			1,
			response.page_size ?? CHAT_LOOKUP_PAGE_SIZE,
		)
		const resolvedTotal = Math.max(
			response.items.length,
			response.count ?? response.total ?? response.items.length,
		)
		const hasMore =
			Boolean(response.next) || page * resolvedPageSize < resolvedTotal

		if (!hasMore || response.items.length === 0) {
			break
		}
	}

	return null
}

function BookingsPage() {
	const { t, i18n } = useTranslation()
	const navigate = useNavigate()
	const { hasPermission } = useAuth()
	const isRu = i18n.language === 'ru'
	const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ'
	const canOpenClient = hasPermission('can_view_clients')
	const canOpenChat =
		hasPermission('can_access_chats') ||
		hasPermission('can_view_conversations') ||
		hasPermission('can_manage_conversations')
	const canManageBookings = hasPermission('can_manage_bookings')
	const [bookings, setBookings] = useState<BookingItem[]>([])
	const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()))
	const [activeBooking, setActiveBooking] = useState<BookingItem | null>(null)
	const [loading, setLoading] = useState(true)
	const [hasError, setHasError] = useState(false)
	const [refreshKey, setRefreshKey] = useState(0)
	const [clientOptions, setClientOptions] = useState<ClientOption[]>([])
	const [clientsLoading, setClientsLoading] = useState(false)
	const [bookingFormMode, setBookingFormMode] = useState<'create' | 'edit' | null>(null)
	const [editingBooking, setEditingBooking] = useState<BookingItem | null>(null)
	const [bookingForm, setBookingForm] = useState<BookingFormState>({
		clientId: '',
		scheduledFor: createDefaultScheduledFor(toIsoDate(new Date())),
		requestedDate: toIsoDate(new Date()),
		status: 'pending',
	})
	const [bookingFormError, setBookingFormError] = useState<string | null>(null)
	const [submittingBooking, setSubmittingBooking] = useState(false)
	const [pendingDeleteBookingId, setPendingDeleteBookingId] = useState<string | null>(null)
	const [deletingBooking, setDeletingBooking] = useState(false)
	const [activeBookingChatSessionId, setActiveBookingChatSessionId] = useState<string | null>(null)
	const [bookingStatusColors, setBookingStatusColors] = useState<BookingStatusColorMap>({})
	const bookingClientChatCacheRef = useRef<Record<string, string | null>>({})

	useEffect(() => {
		let active = true

		async function loadBookings() {
			setLoading(true)
			setHasError(false)

			try {
				const nextBookings = await fetchAllBookings()
				if (!active) {
					return
				}

				nextBookings.sort((left, right) => {
					const leftTime = parseCalendarDateTime(left.scheduled_for)?.getTime() ?? 0
					const rightTime = parseCalendarDateTime(right.scheduled_for)?.getTime() ?? 0
					const timeDiff = leftTime - rightTime
					if (timeDiff !== 0) {
						return timeDiff
					}

					return String(left.id).localeCompare(String(right.id))
				})

				setBookings(nextBookings)
			} catch {
				if (!active) {
					return
				}

				setHasError(true)
			} finally {
				if (active) {
					setLoading(false)
				}
			}
		}

		void loadBookings()

		return () => {
			active = false
		}
	}, [refreshKey])

	useEffect(() => {
		let active = true

		async function loadBookingStatusColors() {
			try {
				const items = await listBookingStatusColors()
				if (!active) {
					return
				}

				setBookingStatusColors(
					items.reduce<BookingStatusColorMap>((accumulator, item) => {
						const key = item.status as BookingStatusValue
						if (item.color) {
							accumulator[key] = item.color
						}
						return accumulator
					}, {}),
				)
			} catch {
				if (!active) {
					return
				}

				setBookingStatusColors({})
			}
		}

		void loadBookingStatusColors()

		return () => {
			active = false
		}
	}, [])

	useEffect(() => {
		if (!canManageBookings && !canOpenChat) {
			return
		}

		let active = true

		async function loadClients() {
			setClientsLoading(true)

			try {
				const nextClients = await fetchAllClientOptions()
				if (!active) {
					return
				}

				setClientOptions(nextClients)
			} finally {
				if (active) {
					setClientsLoading(false)
				}
			}
		}

		void loadClients()

		return () => {
			active = false
		}
	}, [canManageBookings, canOpenChat])

	useEffect(() => {
		if (!canOpenChat) {
			setActiveBookingChatSessionId(null)
			return
		}

		const activeClientId = activeBooking?.client?.id || activeBooking?.client_id
		if (!activeClientId) {
			setActiveBookingChatSessionId(null)
			return
		}
		const resolvedClientId = activeClientId

		const cachedChatSessionId =
			bookingClientChatCacheRef.current[resolvedClientId] ||
			clientOptions.find(option => option.id === resolvedClientId)?.chatSessionId ||
			null
		setActiveBookingChatSessionId(cachedChatSessionId)
		if (cachedChatSessionId) {
			return
		}

		let cancelled = false

		async function loadActiveBookingClientChat() {
			try {
				const nextChatSessionId = await findChatSessionIdForClient(resolvedClientId)
				if (cancelled) {
					return
				}

				if (nextChatSessionId) {
					bookingClientChatCacheRef.current[resolvedClientId] = nextChatSessionId
				}
				setActiveBookingChatSessionId(nextChatSessionId)
				setClientOptions(current =>
					current.map(option =>
						option.id === resolvedClientId
							? { ...option, chatSessionId: nextChatSessionId || undefined }
							: option,
					),
				)
			} catch {
				if (cancelled) {
					return
				}

				setActiveBookingChatSessionId(null)
			}
		}

		void loadActiveBookingClientChat()

		return () => {
			cancelled = true
		}
	}, [activeBooking, canOpenChat])

	const selectedDateObject = useMemo(() => parseIsoDate(selectedDate), [selectedDate])
	const weekStartDate = useMemo(
		() => getStartOfWeek(selectedDateObject),
		[selectedDateObject],
	)
	const weekDays = useMemo(
		() =>
			Array.from({ length: 7 }, (_, index) => {
				const day = new Date(weekStartDate)
				day.setDate(weekStartDate.getDate() + index)
				return day
			}),
		[weekStartDate],
	)
	const weekDateKeys = useMemo(() => weekDays.map(day => toIsoDate(day)), [weekDays])
	const weekDateKeySet = useMemo(() => new Set(weekDateKeys), [weekDateKeys])
	const weekBookings = useMemo(
		() => bookings.filter(item => weekDateKeySet.has(getDateKey(item.scheduled_for))),
		[bookings, weekDateKeySet],
	)
	const timelineHours = useMemo(() => resolveTimelineHours(weekBookings), [weekBookings])
	const timelineHeight =
		(timelineHours.endHour - timelineHours.startHour + 1) * HOUR_ROW_HEIGHT
	const weekRangeLabel = useMemo(
		() => formatWeekRangeLabel(weekDays, i18n.language, locale),
		[weekDays, i18n.language, locale],
	)
	const columns = useMemo(
		() =>
			weekDays.map(day => {
				const dateKey = toIsoDate(day)
				return {
					date: day,
					dateKey,
					items: buildTimelineItems(
						weekBookings.filter(item => getDateKey(item.scheduled_for) === dateKey),
					),
				}
			}),
		[weekDays, weekBookings],
	)
	const bookingStatusOptions = useMemo<SelectOption[]>(
		() => [
			{
				value: 'pending',
				label: t('tasks.bookingStatuses.pending'),
				color: bookingStatusColors.pending,
			},
			{
				value: 'confirmed',
				label: t('tasks.bookingStatuses.confirmed'),
				color: bookingStatusColors.confirmed,
			},
			{
				value: 'came',
				label: t('tasks.bookingStatuses.came'),
				color: bookingStatusColors.came,
			},
			{
				value: 'no_show',
				label: t('tasks.bookingStatuses.noShow'),
				color: bookingStatusColors.no_show,
			},
			{
				value: 'cancelled',
				label: t('tasks.bookingStatuses.cancelled'),
				color: bookingStatusColors.cancelled,
			},
		],
		[bookingStatusColors, t],
	)
	const clientSelectOptions = useMemo<SelectOption[]>(
		() => [
			{
				value: '',
				label: clientsLoading
					? isRu
						? 'Загрузка клиентов...'
						: 'Mijozlar yuklanmoqda...'
					: isRu
						? 'Выберите клиента'
						: 'Mijozni tanlang',
			},
			...clientOptions.map(option => ({
				value: option.id,
				label: `${option.full_name}${option.phone ? ` • ${option.phone}` : ''}`,
			})),
		],
		[clientOptions, clientsLoading, isRu],
	)
	const activeClientOption = useMemo(() => {
		if (!editingBooking?.client?.id) {
			return null
		}

		return (
			clientOptions.find(option => option.id === editingBooking.client?.id) ?? {
				id: editingBooking.client.id,
				full_name: editingBooking.client.full_name,
				phone: editingBooking.client.phone,
			}
		)
	}, [clientOptions, editingBooking])

	function resetBookingForm(nextDate = selectedDate) {
		setBookingForm({
			clientId: '',
			scheduledFor: createDefaultScheduledFor(nextDate),
			requestedDate: nextDate,
			status: 'pending',
		})
		setEditingBooking(null)
		setBookingFormMode(null)
		setBookingFormError(null)
	}

	function openCreateBookingModal() {
		setActiveBooking(null)
		setEditingBooking(null)
		setBookingForm({
			clientId: '',
			scheduledFor: createDefaultScheduledFor(selectedDate),
			requestedDate: selectedDate,
			status: 'pending',
		})
		setBookingFormError(null)
		setBookingFormMode('create')
	}

	function openEditBookingModal(booking: BookingItem) {
		setActiveBooking(null)
		setEditingBooking(booking)
		setBookingForm({
			clientId: booking.client?.id || booking.client_id || '',
			scheduledFor: toDateTimeFieldValue(booking.scheduled_for),
			requestedDate: booking.requested_date || getDateKey(booking.scheduled_for),
			status: (booking.status as BookingStatusValue) || 'pending',
		})
		setBookingFormError(null)
		setBookingFormMode('edit')
	}

	async function handleBookingFormSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		if (bookingFormMode === 'create' && !bookingForm.clientId) {
			setBookingFormError(
				isRu ? 'Выберите клиента.' : "Mijozni tanlang.",
			)
			return
		}

		if (!bookingForm.scheduledFor) {
			setBookingFormError(
				isRu ? 'Выберите время визита.' : 'Tashrif vaqtini tanlang.',
			)
			return
		}

		setSubmittingBooking(true)
		setBookingFormError(null)

		try {
			const derivedRequestedDate =
				getDateKey(bookingForm.scheduledFor) || bookingForm.requestedDate || null
			const payload = {
				scheduled_for: new Date(bookingForm.scheduledFor).toISOString(),
				status: bookingForm.status,
				requested_date: derivedRequestedDate,
			}

			if (bookingFormMode === 'edit' && editingBooking) {
				await (services.clients as any).updateClientBooking?.(editingBooking.id, payload)
			} else {
				await (services.clients as any).createClientBooking?.(bookingForm.clientId, {
					...payload,
					requested_date: derivedRequestedDate || undefined,
				})
			}

			setSelectedDate(getDateKey(bookingForm.scheduledFor) || selectedDate)
			resetBookingForm(getDateKey(bookingForm.scheduledFor) || selectedDate)
			setRefreshKey(current => current + 1)
		} catch (error) {
			setBookingFormError(
				error instanceof Error
					? error.message
					: isRu
						? 'Не удалось сохранить бронирование.'
						: "Bronni saqlab bo'lmadi.",
			)
		} finally {
			setSubmittingBooking(false)
		}
	}

	async function handleDeleteBooking() {
		if (!pendingDeleteBookingId) {
			return
		}

		setDeletingBooking(true)

		try {
			await (services.clients as any).deleteClientBooking?.(pendingDeleteBookingId)
			if (activeBooking?.id === pendingDeleteBookingId) {
				setActiveBooking(null)
			}
			if (editingBooking?.id === pendingDeleteBookingId) {
				resetBookingForm(selectedDate)
			}
			setPendingDeleteBookingId(null)
			setRefreshKey(current => current + 1)
		} catch (error) {
			setBookingFormError(
				error instanceof Error
					? error.message
					: isRu
						? 'Не удалось удалить бронирование.'
						: "Bronni o'chirib bo'lmadi.",
			)
		} finally {
			setDeletingBooking(false)
		}
	}

	const header = (
		<PageHeader
			eyebrow={t('bookings.page.eyebrow')}
			title={t('bookings.page.title')}
			subtitle={t('bookings.page.subtitle')}
			actions={
				<div className='flex w-full flex-wrap items-center gap-2 min-[768px]:w-auto'>
					{canManageBookings ? (
						<button
							type='button'
							className='inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent'
							onClick={openCreateBookingModal}
						>
							<AppIcon name='plus' className='h-4 w-4' aria-hidden='true' />
							{isRu ? 'Создать бронь' : 'Bron yaratish'}
						</button>
					) : null}
					<button
						type='button'
						className='inline-flex min-h-9 items-center gap-2 rounded-lg border border-border-soft/70 bg-surface-card px-3.5 text-sm font-semibold text-text-primary transition duration-fast hover:border-primary/35 hover:bg-surface-subtle'
						onClick={() => setSelectedDate(toIsoDate(new Date()))}
					>
						<AppIcon name='calendar' className='h-4 w-4' aria-hidden='true' />
						{t('bookings.page.today')}
					</button>
					<button
						type='button'
						className='inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent'
						onClick={() => setRefreshKey(current => current + 1)}
						disabled={loading}
					>
						<AppIcon name='refresh-cw' className='h-4 w-4' aria-hidden='true' />
						{t('bookings.page.refresh')}
					</button>
				</div>
			}
		/>
	)

	if (loading && bookings.length === 0) {
		return (
			<PageLayout header={header}>
				<section className='rounded-xl bg-surface-card p-6 shadow-sm ring-1 ring-border-soft/40'>
					<p className='m-0 text-sm font-semibold text-text-secondary'>
						{t('bookings.page.loading')}
					</p>
				</section>
			</PageLayout>
		)
	}

	if (hasError && bookings.length === 0) {
		return (
			<PageLayout header={header}>
				<section className='rounded-xl bg-surface-card p-6 shadow-sm ring-1 ring-border-soft/40'>
					<h2 className='m-0 text-lg font-semibold text-text-primary'>
						{t('bookings.page.errorTitle')}
					</h2>
					<p className='mt-2 text-sm text-text-secondary'>
						{t('bookings.page.errorDescription')}
					</p>
				</section>
			</PageLayout>
		)
	}

	return (
		<>
			<PageLayout header={header}>
				<section className='overflow-hidden rounded-[24px] bg-surface-card ring-1 ring-border-soft/45'>
					<div className='flex flex-wrap items-center justify-between gap-3 border-b border-border-soft/60 px-3 py-3 min-[768px]:px-4'>
						<div className='flex min-w-0 items-center gap-2'>
							<button
								type='button'
								className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-soft/70 bg-surface-card text-lg font-semibold text-text-secondary transition duration-fast hover:border-primary/35 hover:text-text-primary'
								onClick={() => setSelectedDate(current => shiftIsoDateByDays(current, -7))}
								aria-label={t('bookings.page.previous', { defaultValue: 'Previous week' })}
							>
								{'<'}
							</button>
							<button
								type='button'
								className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-soft/70 bg-surface-card text-lg font-semibold text-text-secondary transition duration-fast hover:border-primary/35 hover:text-text-primary'
								onClick={() => setSelectedDate(current => shiftIsoDateByDays(current, 7))}
								aria-label={t('bookings.page.next', { defaultValue: 'Next week' })}
							>
								{'>'}
							</button>
							<p className='m-0 truncate font-display text-[1.3rem] font-extrabold tracking-[-0.03em] text-text-primary'>
								{weekRangeLabel}
							</p>
						</div>
						{loading ? (
							<span className='inline-flex min-h-8 items-center gap-2 rounded-pill bg-surface-subtle px-3 text-[12px] font-semibold text-text-secondary ring-1 ring-border-soft/60'>
								<AppIcon name='activity' className='h-3.5 w-3.5' aria-hidden='true' />
								{t('common.loading')}
							</span>
						) : null}
					</div>

					{hasError ? (
						<p className='m-4 rounded-lg bg-warning-bg px-3 py-2 text-sm font-medium text-warning'>
							{t('bookings.page.errorInline')}
						</p>
					) : null}

					<div className='overflow-auto'>
						<div className='min-w-[1220px]'>
							<div className='grid grid-cols-[60px_repeat(7,minmax(160px,1fr))]'>
								<div className='border-r border-border-soft/70 bg-surface-card' />
								{columns.map(column => {
									const isSelected = column.dateKey === selectedDate

									return (
										<button
											key={column.dateKey}
											type='button'
											onClick={() => setSelectedDate(column.dateKey)}
											className={[
												'min-h-[88px] border-r border-border-soft/70 px-3 py-3 text-center last:border-r-0',
												isSelected
													? 'bg-[linear-gradient(145deg,rgba(99,102,241,0.16),rgba(20,184,166,0.12)_58%,rgba(15,23,42,0.02))] text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-primary/20 dark:bg-[linear-gradient(145deg,#0f172a,_#172554_58%,_#0f766e)] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:ring-white/10'
													: 'bg-surface-card text-text-primary',
											].join(' ')}
										>
											<p
												className={[
													'm-0 text-[10px] font-semibold uppercase tracking-[0.18em]',
													isSelected ? 'text-primary dark:text-white/55' : 'text-text-muted',
												].join(' ')}
											>
												{formatWeekdayName(column.date, i18n.language)}
											</p>
											<div className='mt-3 flex justify-center'>
												<span
													className={[
														'inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-extrabold',
														isSelected
															? 'bg-primary text-primary-foreground shadow-[0_10px_24px_-10px_rgba(99,102,241,0.45)] dark:bg-[#14b8a6] dark:text-white dark:shadow-[0_10px_24px_-10px_rgba(20,184,166,0.85)]'
															: 'text-text-primary',
													].join(' ')}
												>
													{formatDayNumber(column.date, locale)}
												</span>
											</div>
										</button>
									)
								})}
							</div>

							<div className='grid grid-cols-[60px_repeat(7,minmax(160px,1fr))]'>
								<div className='relative border-r border-border-soft/70 bg-surface-card'>
									{Array.from(
										{ length: timelineHours.endHour - timelineHours.startHour + 1 },
										(_, index) => {
											const hour = timelineHours.startHour + index
											return (
												<div
													key={hour}
													className='relative text-center text-[10px] font-semibold text-text-muted'
													style={{ height: `${HOUR_ROW_HEIGHT}px` }}
												>
													<span className='absolute left-0 right-0 top-2'>
														{`${String(hour).padStart(2, '0')}:00`}
													</span>
												</div>
											)
										},
									)}
								</div>

								{columns.map(column => {
									const isSelected = column.dateKey === selectedDate

									return (
										<div
											key={column.dateKey}
											className={[
												'relative border-r border-border-soft/70 last:border-r-0',
												isSelected
													? 'bg-[linear-gradient(180deg,rgba(20,184,166,0.10),rgba(15,23,42,0.02))]'
													: 'bg-surface-card',
											].join(' ')}
											style={{ height: `${timelineHeight}px` }}
										>
											{Array.from(
												{ length: timelineHours.endHour - timelineHours.startHour + 1 },
												(_, index) => (
													<div
														key={`major-${column.dateKey}-${index}`}
														className='absolute left-0 right-0 border-t border-border-soft/70'
														style={{ top: `${index * HOUR_ROW_HEIGHT}px` }}
													/>
												),
											)}
											{Array.from(
												{ length: timelineHours.endHour - timelineHours.startHour },
												(_, index) => (
													<div
														key={`minor-${column.dateKey}-${index}`}
														className='absolute left-0 right-0 border-t border-border-soft/35'
														style={{
															top: `${index * HOUR_ROW_HEIGHT + HOUR_ROW_HEIGHT / 2}px`,
														}}
													/>
												),
											)}

											{column.items.map(item => {
												const top =
													(item.startMinutes - timelineHours.startHour * 60) *
													PIXELS_PER_MINUTE
												const height = Math.max(
													50,
													(item.endMinutes - item.startMinutes) * PIXELS_PER_MINUTE,
												)
												const left = `calc(${(item.lane / item.laneCount) * 100}% + 4px)`
												const width = `calc(${100 / item.laneCount}% - 8px)`
												const isActive = item.id === activeBooking?.id
												const resolvedStatusColor = resolveBookingStatusColor(
													item.status,
													item.status_color,
													bookingStatusColors,
												)

												return (
													<button
														key={item.id}
														type='button'
														onClick={() => setActiveBooking(item)}
														className={[
															'absolute overflow-hidden rounded-[12px] border px-2.5 py-2 text-left transition duration-fast',
															getBookingCardClassName(item.status, isActive),
														].join(' ')}
														style={{
															top: `${top}px`,
															left,
															width,
															height: `${height}px`,
															...getBookingCardStyle(resolvedStatusColor, isActive),
														}}
													>
														<span
															className='absolute inset-x-0 top-0 h-1 rounded-t-[12px]'
															style={{
																backgroundColor: normalizeHexColor(
																	resolvedStatusColor,
																	'#8b5cf6',
																),
															}}
															aria-hidden='true'
														/>
														<p className='m-0 truncate text-[12px] font-bold text-text-primary'>
															{item.client?.full_name || t('common.notAvailable')}
														</p>
														<p className='mt-1 line-clamp-2 text-[10px] font-medium text-text-secondary'>
															{item.client?.ai_summary ||
																item.client?.phone ||
																t('common.notAvailable')}
														</p>
														<p className='mt-2 text-[10px] font-semibold text-text-secondary'>
															{formatTimeLabel(item.scheduled_for)} - {formatTimeLabel(item.ends_at)}
														</p>
													</button>
												)
											})}
										</div>
									)
								})}
							</div>
						</div>
					</div>
				</section>
			</PageLayout>

			{activeBooking ? (
				<div
					className='fixed inset-0 z-[1200] flex items-end bg-background-overlay/72 p-3 backdrop-blur-[3px] sm:items-start sm:justify-center sm:px-4 sm:pb-4 sm:pt-24'
					role='presentation'
					onClick={() => setActiveBooking(null)}
				>
					<div
						className='flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[520px] flex-col overflow-hidden rounded-[28px] bg-surface-card p-5 text-text-primary shadow-[0_40px_110px_-42px_rgba(15,23,42,0.42)] ring-1 ring-border-soft/50 sm:max-h-[calc(100dvh-8rem)]'
						onClick={event => event.stopPropagation()}
					>
						<div className='flex items-start justify-between gap-3'>
							<div className='min-w-0'>
								<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary'>
									{t('bookings.page.detailsEyebrow')}
								</p>
								<h2 className='mt-1 truncate font-display text-[1.45rem] font-extrabold tracking-[-0.03em] text-text-primary'>
									{activeBooking.client?.full_name || t('common.notAvailable')}
								</h2>
								<p className='mt-1 text-sm text-text-secondary'>
									{formatBookingDateValue(
										activeBooking.scheduled_for,
										i18n.language,
										locale,
										true,
									)}
								</p>
							</div>
							<button
								type='button'
								className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-text-secondary transition duration-fast hover:bg-surface-muted hover:text-text-primary'
								onClick={() => setActiveBooking(null)}
							>
								<AppIcon name='close' className='h-4 w-4' aria-hidden='true' />
							</button>
						</div>

						<div className='mt-4 min-h-0 overflow-y-auto pr-1'>
							<div className='flex flex-wrap gap-2'>
								<StatusBadge
									status={activeBooking.status || 'pending'}
									label={getBookingStatusLabel(activeBooking.status, t)}
									tone={getBookingStatusTone(activeBooking.status)}
									color={resolveBookingStatusColor(
										activeBooking.status,
										activeBooking.status_color,
										bookingStatusColors,
									)}
								/>
								<span className='inline-flex min-h-7 items-center rounded-pill bg-surface-subtle px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary ring-1 ring-border-soft/50'>
									{formatDurationLabel(activeBooking.duration_minutes, t)}
								</span>
							</div>

							<div className='mt-5 flex flex-wrap items-center gap-2'>
								{canOpenClient && activeBooking.client?.id ? (
									<button
										type='button'
										className='inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent'
										onClick={() => {
											navigate(routePaths.clients, {
												state: { clientId: activeBooking.client?.id },
											})
											setActiveBooking(null)
										}}
									>
										<AppIcon name='user' className='h-4 w-4' aria-hidden='true' />
										{t('bookings.page.openClient')}
									</button>
								) : null}
								{canOpenChat && activeBookingChatSessionId ? (
									<button
										type='button'
										className='inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-surface-subtle px-4 text-sm font-semibold text-text-primary ring-1 ring-border-soft/45 transition duration-fast hover:bg-surface-muted'
										onClick={() => {
											navigate(routePaths.chats, {
												state: { sessionId: activeBookingChatSessionId },
											})
											setActiveBooking(null)
										}}
									>
										<AppIcon name='chat' className='h-4 w-4' aria-hidden='true' />
										{t('bookings.page.openChat')}
									</button>
								) : null}
							</div>

							<div className='mt-5 grid gap-4 sm:grid-cols-2'>
							<div className='grid gap-1.5'>
								<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'>
									{t('bookings.page.fields.phone')}
								</p>
								<p className='m-0 text-sm font-semibold text-text-primary'>
									{activeBooking.client?.phone || t('common.notAvailable')}
								</p>
							</div>
							<div className='grid gap-1.5'>
								<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'>
									{t('bookings.page.fields.source')}
								</p>
								<p className='m-0 text-sm font-semibold text-text-primary'>
									{activeBooking.client?.source
										? getChannelLabel(
												t,
												activeBooking.client.source,
												activeBooking.client.source,
											)
										: t('common.notAvailable')}
								</p>
							</div>
							<div className='grid gap-1.5'>
								<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'>
									{t('bookings.page.fields.requestedDate')}
								</p>
								<p className='m-0 text-sm font-semibold text-text-primary'>
									{activeBooking.requested_date
										? formatBookingDateValue(
												activeBooking.requested_date,
												i18n.language,
												locale,
												false,
											)
										: t('common.notAvailable')}
								</p>
							</div>
							</div>

							{activeBooking.client?.ai_summary ? (
								<div className='mt-5 rounded-2xl border border-border-soft/50 bg-surface-subtle p-4'>
									<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'>
										{t('bookings.page.fields.summary')}
									</p>
									<p className='mt-2 text-sm leading-6 text-text-secondary'>
									{activeBooking.client.ai_summary}
									</p>
								</div>
							) : null}

							{activeBooking.client?.id ? (
								<div className='mt-5'>
									<RecallManagerPanel
										clientId={activeBooking.client.id}
										language={i18n.language}
										locale={locale}
										showHistory
										showEditor={false}
									/>
								</div>
							) : null}

						</div>

						<div className='mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border-soft/50 pt-4'>
							{canManageBookings ? (
								<>
									<button
										type='button'
										className='inline-flex min-h-10 items-center justify-center rounded-xl bg-surface-subtle px-4 text-sm font-semibold text-text-primary ring-1 ring-border-soft/45 transition duration-fast hover:bg-surface-muted'
										onClick={() => openEditBookingModal(activeBooking)}
									>
										{isRu ? 'Редактировать' : 'Tahrirlash'}
									</button>
									<button
										type='button'
										className='inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-danger px-4 text-sm font-semibold text-white transition duration-fast hover:brightness-95'
										onClick={() => setPendingDeleteBookingId(activeBooking.id)}
									>
										<AppIcon name='trash' className='h-4 w-4' aria-hidden='true' />
										{isRu ? 'Удалить' : "O'chirish"}
									</button>
								</>
							) : null}
							<button
								type='button'
								className='inline-flex min-h-10 items-center justify-center rounded-xl bg-surface-subtle px-4 text-sm font-semibold text-text-primary ring-1 ring-border-soft/45 transition duration-fast hover:bg-surface-muted'
								onClick={() => setActiveBooking(null)}
							>
								{isRu ? 'Отмена' : 'Bekor qilish'}
							</button>
						</div>
					</div>
				</div>
			) : null}

			{bookingFormMode ? (
				<div
					className='fixed inset-0 z-[1200] flex items-end bg-background-overlay/72 p-3 backdrop-blur-[3px] sm:items-start sm:justify-center sm:px-4 sm:pb-4 sm:pt-24'
					role='presentation'
					onClick={() => {
						if (!submittingBooking) {
							resetBookingForm(selectedDate)
						}
					}}
				>
					<div
						className='flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-[28px] bg-surface-card p-5 text-text-primary shadow-[0_40px_110px_-42px_rgba(15,23,42,0.42)] ring-1 ring-border-soft/50 sm:max-h-[calc(100dvh-8rem)]'
						onClick={event => event.stopPropagation()}
					>
						<div className='flex items-start justify-between gap-3'>
							<div className='min-w-0'>
								<p className='m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary'>
									{bookingFormMode === 'edit'
										? isRu
											? 'Редактировать'
											: 'Tahrirlash'
										: isRu
											? 'Создание'
											: 'Yaratish'}
								</p>
								<h2 className='mt-1 font-display text-[1.45rem] font-extrabold tracking-[-0.03em] text-text-primary'>
									{bookingFormMode === 'edit'
										? isRu
											? 'Редактировать бронь'
											: 'Bronni tahrirlash'
										: isRu
											? 'Создать бронь'
											: 'Bron yaratish'}
								</h2>
							</div>
							<button
								type='button'
								className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-text-secondary transition duration-fast hover:bg-surface-muted hover:text-text-primary'
								onClick={() => resetBookingForm(selectedDate)}
								disabled={submittingBooking}
							>
								<AppIcon name='close' className='h-4 w-4' aria-hidden='true' />
							</button>
						</div>

						<form className='mt-5 flex min-h-0 flex-1 flex-col' onSubmit={handleBookingFormSubmit}>
							<div className='grid min-h-0 gap-4 overflow-y-auto pr-1'>
							<div className='grid gap-1.5'>
								<label className={formLabelClassName}>
									{isRu ? 'Клиент' : 'Mijoz'}
								</label>
								<FilterSelect
									value={bookingForm.clientId}
									options={
										bookingFormMode === 'edit'
											? [
													{
														value: bookingForm.clientId,
														label: activeClientOption
															? `${activeClientOption.full_name}${activeClientOption.phone ? ` • ${activeClientOption.phone}` : ''}`
															: activeBooking?.client?.full_name || t('common.notAvailable'),
													},
												]
											: clientSelectOptions
									}
									onChange={value =>
										setBookingForm(current => ({
											...current,
											clientId: value,
										}))
									}
									disabled={
										submittingBooking ||
										clientsLoading ||
										bookingFormMode === 'edit'
									}
								/>
							</div>

							<div className='grid gap-4 sm:grid-cols-2'>
								<div className='grid gap-1.5'>
									<label className={formLabelClassName}>
										{isRu ? 'Время визита' : 'Tashrif vaqti'}
									</label>
									<HandmadeDateTimePicker
										value={bookingForm.scheduledFor}
										onChange={value =>
											setBookingForm(current => ({
												...current,
												scheduledFor: value,
												requestedDate:
													getDateKey(value) || current.requestedDate,
											}))
										}
										placeholder={
											isRu ? 'Выберите дату и время' : 'Sana va vaqtni tanlang'
										}
										locale={locale}
										disabled={submittingBooking}
									/>
								</div>
							</div>

							<div className='grid gap-1.5'>
								<label className={formLabelClassName}>
									{isRu ? 'Статус' : 'Holat'}
								</label>
								<FilterSelect
									value={bookingForm.status}
									options={bookingStatusOptions}
									onChange={value =>
										setBookingForm(current => ({
											...current,
											status: value as BookingStatusValue,
										}))
									}
									disabled={submittingBooking}
								/>
							</div>

							{bookingForm.clientId ? (
								<RecallManagerPanel
									clientId={bookingForm.clientId}
									language={i18n.language}
									locale={locale}
									showHistory
								/>
							) : null}

							{bookingFormError ? (
								<p className='m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger'>
									{bookingFormError}
								</p>
							) : null}
							</div>

							<div className='mt-5 flex flex-wrap items-center gap-2 border-t border-border-soft/50 pt-4'>
								<button
									type='button'
									className='inline-flex min-h-10 items-center justify-center rounded-xl bg-surface-subtle px-4 text-sm font-semibold text-text-primary ring-1 ring-border-soft/45 transition duration-fast hover:bg-surface-muted'
									onClick={() => resetBookingForm(selectedDate)}
									disabled={submittingBooking}
								>
									{isRu ? 'Отмена' : 'Bekor qilish'}
								</button>
								<button
									type='submit'
									className='ml-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#14b8a6] px-4 text-sm font-semibold text-white transition duration-fast hover:bg-[#0f9f94] disabled:cursor-not-allowed disabled:opacity-60'
									disabled={submittingBooking || (bookingFormMode === 'create' && clientsLoading)}
								>
									<AppIcon
										name={bookingFormMode === 'edit' ? 'calendar' : 'plus'}
										className='h-4 w-4'
										aria-hidden='true'
									/>
									{bookingFormMode === 'edit'
										? isRu
											? 'Сохранить изменения'
											: "O'zgarishlarni saqlash"
										: isRu
											? 'Создать бронь'
											: 'Bron yaratish'}
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}

			{canManageBookings && pendingDeleteBookingId ? (
				<ConfirmDialog
					eyebrow={isRu ? 'Удаление' : "O'chirish"}
					title={
						isRu
							? 'Удалить бронирование?'
							: "Bronni o'chirasizmi?"
					}
					description={
						isRu
							? 'Это действие нельзя отменить.'
							: "Bu amalni bekor qilib bo'lmaydi."
					}
					cancelLabel={isRu ? 'Отмена' : 'Bekor qilish'}
					confirmLabel={isRu ? 'Удалить' : "O'chirish"}
					isBusy={deletingBooking}
					confirmTone='danger'
					onCancel={() => {
						if (!deletingBooking) {
							setPendingDeleteBookingId(null)
						}
					}}
					onConfirm={() => {
						void handleDeleteBooking()
					}}
					ariaLabel={isRu ? 'Удалить бронирование' : "Bronni o'chirish"}
				/>
			) : null}
		</>
	)
}

export default BookingsPage
