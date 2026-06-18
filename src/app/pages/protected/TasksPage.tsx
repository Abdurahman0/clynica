import type { DragEvent, FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	FiCheckCircle,
	FiClock,
	FiEdit2,
	FiPaperclip,
	FiPlus,
	FiTrash2,
	FiX,
} from 'react-icons/fi'
import ConfirmDialog from '../../../components/shared/dialogs/ConfirmDialog'
import { PageLayout } from '../../../components/shared/page'
import { FilterSelect } from '../../../components/shared/data'
import { HandmadeDateTimePicker } from '../../../features/clients/components/HandmadeDatePickers'
import type { SelectOption } from '../../../types/common'
import { useAuth } from '../../../auth'
import { services } from '../../../services'
import type { Client, ClientBookingItem } from '../../../services/contracts'
import { listUsers } from '../../../services/api/users.service'
import {
	createTask,
	createTaskStatus,
	deleteTask,
	deleteTaskStatus,
	listTasks,
	listTaskStatuses,
	moveTask,
	updateTask,
	updateTaskStatus,
	type CrmTask,
	type CrmTaskStatus,
	type TaskPriority,
} from '../../../services/api/tasks.service'

type ColumnTone = 'blue' | 'cyan' | 'green' | 'amber' | 'rose'

interface TaskCard {
	id: string
	title: string
	description: string
	priority: TaskPriority
	statusId: string
	assignee: string
	assignedTo: string
	assigneeName: string
	dueDate: string
	clientId: string
	clientName: string
	clientPhone: string
	kind: string
	bookingId: string
	bookingScheduledFor: string
	attachments: number
	comments: number
	createdAt: string
}

interface TaskColumn {
	id: string
	title: string
	color: string
	tone: ColumnTone
	cardIds: string[]
}

interface TaskBoard {
	columns: TaskColumn[]
	cards: Record<string, TaskCard>
}

const columnToneClasses: Record<
	ColumnTone,
	{ top: string; badge: string; add: string }
> = {
	blue: {
		top: 'border-t-[#2563eb]',
		badge: 'bg-primary/12 text-text-accent',
		add: 'hover:bg-primary/10 hover:text-text-accent',
	},
	cyan: {
		top: 'border-t-[#06b6d4]',
		badge: 'bg-info-bg text-info',
		add: 'hover:bg-info-bg hover:text-info',
	},
	green: {
		top: 'border-t-[#22c55e]',
		badge: 'bg-success-bg text-success',
		add: 'hover:bg-success-bg hover:text-success',
	},
	amber: {
		top: 'border-t-[#f59e0b]',
		badge: 'bg-warning-bg text-warning',
		add: 'hover:bg-warning-bg hover:text-warning',
	},
	rose: {
		top: 'border-t-[#ef4444]',
		badge: 'bg-danger-bg text-danger',
		add: 'hover:bg-danger-bg hover:text-danger',
	},
}

const priorityClasses: Record<TaskPriority, string> = {
	low: 'border-success/30 bg-success-bg text-success',
	medium: 'border-info/30 bg-info-bg text-info',
	high: 'border-warning/30 bg-warning-bg text-warning',
}

const toneCycle: ColumnTone[] = ['blue', 'cyan', 'green', 'amber', 'rose']

const taskDateMonths = {
	uz: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
	ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
	en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

function getTaskDateLanguage(locale: string): keyof typeof taskDateMonths {
	const normalized = locale.toLowerCase()
	if (normalized.startsWith('ru')) {
		return 'ru'
	}
	if (normalized.startsWith('uz')) {
		return 'uz'
	}
	return 'en'
}

function formatDueDate(value: string, fallback: string, locale: string): string {
	if (!value) {
		return fallback
	}

	const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
	if (Number.isNaN(date.getTime())) {
		return fallback
	}

	const months = taskDateMonths[getTaskDateLanguage(locale)]
	const day = String(date.getDate()).padStart(2, '0')
	const month = months[date.getMonth()]
	const year = date.getFullYear()
	const dateText = `${day} ${month} ${year}`

	if (!value.includes('T')) {
		return dateText
	}

	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	return `${dateText}, ${hours}:${minutes}`
}

function getBookingStatusKey(status: string | undefined): string {
	switch (status) {
		case 'confirmed':
			return 'confirmed'
		case 'came':
			return 'came'
		case 'no_show':
			return 'noShow'
		case 'cancelled':
			return 'cancelled'
		case 'pending':
		default:
			return 'pending'
	}
}

function getInitials(value: string): string {
	const normalized = value.trim()
	if (!normalized) {
		return ''
	}
	return normalized
		.split(/\s+/)
		.slice(0, 2)
		.map(part => part.charAt(0).toUpperCase())
		.join('')
}

function resolveToneFromColor(color: string): ColumnTone {
	const normalized = color.toLowerCase()
	if (normalized.includes('16a34a') || normalized.includes('22c55e')) {
		return 'green'
	}
	if (normalized.includes('f59e0b') || normalized.includes('eab308')) {
		return 'amber'
	}
	if (normalized.includes('ef4444') || normalized.includes('dc2626')) {
		return 'rose'
	}
	if (normalized.includes('06b6d4') || normalized.includes('0891b2')) {
		return 'cyan'
	}
	return 'blue'
}

function toColumn(status: CrmTaskStatus, tasks: CrmTask[]): TaskColumn {
	return {
		id: String(status.id),
		title: status.name,
		color: status.color,
		tone: resolveToneFromColor(status.color),
		cardIds: tasks
			.filter(task => task.status === status.id)
			.map(task => String(task.id)),
	}
}

function toCard(task: CrmTask): TaskCard {
	const assigneeName = task.assigned_to_name ?? ''
	return {
		id: String(task.id),
		title: task.title,
		description: task.description,
		statusId: String(task.status),
		priority: task.priority,
		assignedTo: task.assigned_to ? String(task.assigned_to) : '',
		assigneeName,
		assignee: getInitials(assigneeName),
		dueDate: task.due_at,
		clientId: task.client ? String(task.client) : '',
		clientName: task.client_name,
		clientPhone: task.client_phone,
		kind: task.kind,
		bookingId: task.booking ? String(task.booking) : '',
		bookingScheduledFor: task.booking_scheduled_for,
		attachments: task.booking ? 1 : 0,
		comments: task.client ? 1 : 0,
		createdAt: task.created_at,
	}
}

function toApiDateTime(value: string): string | null {
	if (!value) {
		return null
	}
	if (/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) {
		return value
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return `${value}T09:00:00+05:00`
	}
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
		return `${value}:00+05:00`
	}
	return value
}

function TasksPage() {
	const { i18n, t } = useTranslation()
	const { currentUser, hasPermission } = useAuth()
	const canViewTasks = hasPermission('can_view_tasks')
	const canManageTaskMoves = hasPermission('can_manage_tasks')
	const canManageManualTasks =
		hasPermission('can_manage_tasks') && currentUser?.role !== 'operator'
	const canManageTaskStatuses =
		hasPermission('can_manage_task_statuses') && currentUser?.role !== 'operator'
	const canViewClients = hasPermission('can_view_clients')
	const canViewBookings = hasPermission('can_view_bookings')
	const [board, setBoard] = useState<TaskBoard>({ columns: [], cards: {} })
	const [statuses, setStatuses] = useState<CrmTaskStatus[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [errorMessage, setErrorMessage] = useState('')
	const [isSaving, setIsSaving] = useState(false)
	const [reloadKey, setReloadKey] = useState(0)
	const [draftColumnId, setDraftColumnId] = useState<string | null>(null)
	const [createDraft, setCreateDraft] = useState({
		title: '',
		description: '',
		priority: 'medium' as TaskPriority,
		assignee: '',
		client: '',
		booking: '',
		dueDate: '',
	})
	const [isListModalOpen, setIsListModalOpen] = useState(false)
	const [listDraft, setListDraft] = useState({
		id: '',
		title: '',
		tone: 'blue' as ColumnTone,
	})
	const [assigneeOptionsFromApi, setAssigneeOptionsFromApi] = useState<SelectOption[]>([])
	const [clientOptionsFromApi, setClientOptionsFromApi] = useState<SelectOption[]>([])
	const [bookingOptionsFromApi, setBookingOptionsFromApi] = useState<SelectOption[]>([])
	const [editBookingOptionsFromApi, setEditBookingOptionsFromApi] = useState<SelectOption[]>([])
	const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
	const [pendingDeleteCardId, setPendingDeleteCardId] = useState<string | null>(null)
	const [editDraft, setEditDraft] = useState({
		title: '',
		description: '',
		status: '',
		priority: 'medium' as TaskPriority,
		assignee: '',
		client: '',
		booking: '',
		dueDate: '',
	})
	const draggingRef = useRef<{ cardId: string; fromColumnId: string } | null>(
		null,
	)
	const [draggingCardId, setDraggingCardId] = useState<string | null>(null)

	useEffect(() => {
		let isMounted = true

		async function loadBoard() {
			if (!canViewTasks) {
				setIsLoading(false)
				return
			}

			setIsLoading(true)
			setErrorMessage('')
			try {
				const [nextStatuses, nextTasks] = await Promise.all([
					listTaskStatuses(),
					listTasks({ page_size: 200, ordering: 'status__position' }),
				])
				if (!isMounted) {
					return
				}

				const activeStatuses = nextStatuses.filter(status => status.is_active)
				const cards = Object.fromEntries(
					nextTasks.map(task => [String(task.id), toCard(task)]),
				)
				setStatuses(nextStatuses)
				setBoard({
					cards,
					columns: activeStatuses.map(status => toColumn(status, nextTasks)),
				})
			} catch (error) {
				if (isMounted) {
					setErrorMessage(
						error instanceof Error ? error.message : t('tasks.errors.loadFailed'),
					)
				}
			} finally {
				if (isMounted) {
					setIsLoading(false)
				}
			}
		}

		void loadBoard()

		return () => {
			isMounted = false
		}
	}, [canViewTasks, reloadKey, t])

	useEffect(() => {
		let isMounted = true

		async function loadAssignees() {
			try {
				const result = await listUsers({ page: 1, pageSize: 200 })
				if (!isMounted) {
					return
				}
				setAssigneeOptionsFromApi(
					result.items.map(user => ({
						value: String(user.id),
						label:
							user.full_name ||
							user.email ||
							String(user.id),
					})),
				)
			} catch {
				if (isMounted) {
					setAssigneeOptionsFromApi([])
				}
			}
		}

		void loadAssignees()

		return () => {
			isMounted = false
		}
	}, [])

	useEffect(() => {
		let isMounted = true

		async function loadClients() {
			if (!canViewClients) {
				setClientOptionsFromApi([])
				return
			}

			try {
				const result = await services.clients.listClients({
					page: 1,
					page_size: 200,
					ordering: '-created_at',
				})
				if (!isMounted) {
					return
				}
				setClientOptionsFromApi(
					result.items.map((client: Client) => ({
						value: String(client.id),
						label: [
							client.full_name || client.phone || String(client.id),
							client.phone && client.full_name ? client.phone : '',
						]
							.filter(Boolean)
							.join(' - '),
					})),
				)
			} catch {
				if (isMounted) {
					setClientOptionsFromApi([])
				}
			}
		}

		void loadClients()

		return () => {
			isMounted = false
		}
	}, [canViewClients])

	useEffect(() => {
		let isMounted = true
		const clientId = createDraft.client

		setCreateDraft(current =>
			current.booking ? { ...current, booking: '' } : current,
		)

		async function loadBookings() {
			if (!clientId || !canViewBookings || !services.clients.listClientBookings) {
				setBookingOptionsFromApi([])
				return
			}

			try {
				const bookings = await services.clients.listClientBookings(clientId)
				if (!isMounted) {
					return
				}
				setBookingOptionsFromApi(
					bookings.map((booking: ClientBookingItem) => {
						const dateLabel = formatDueDate(
							booking.scheduled_for || '',
							t('tasks.bookings.noDate'),
							i18n.language,
						)
						const statusLabel = t(
							`tasks.bookingStatuses.${getBookingStatusKey(booking.status)}`,
						)
						return {
							value: String(booking.id),
							label: `${dateLabel} - ${statusLabel}`,
						}
					}),
				)
			} catch {
				if (isMounted) {
					setBookingOptionsFromApi([])
				}
			}
		}

		void loadBookings()

		return () => {
			isMounted = false
		}
	}, [canViewBookings, createDraft.client, i18n.language, t])

	useEffect(() => {
		let isMounted = true
		const clientId = editDraft.client

		async function loadEditBookings() {
			if (!clientId || !canViewBookings || !services.clients.listClientBookings) {
				setEditBookingOptionsFromApi([])
				return
			}

			try {
				const bookings = await services.clients.listClientBookings(clientId)
				if (!isMounted) {
					return
				}
				setEditBookingOptionsFromApi(
					bookings.map((booking: ClientBookingItem) => {
						const dateLabel = formatDueDate(
							booking.scheduled_for || '',
							t('tasks.bookings.noDate'),
							i18n.language,
						)
						const statusLabel = t(
							`tasks.bookingStatuses.${getBookingStatusKey(booking.status)}`,
						)
						return {
							value: String(booking.id),
							label: `${dateLabel} - ${statusLabel}`,
						}
					}),
				)
			} catch {
				if (isMounted) {
					setEditBookingOptionsFromApi([])
				}
			}
		}

		void loadEditBookings()

		return () => {
			isMounted = false
		}
	}, [canViewBookings, editDraft.client, i18n.language, t])

	const totalCards = Object.keys(board.cards).length
	const completedCards =
		board.columns.find(column => column.id === 'done')?.cardIds.length ?? 0
	const selectedCard = selectedCardId ? board.cards[selectedCardId] : null
	const pendingDeleteCard = pendingDeleteCardId ? board.cards[pendingDeleteCardId] : null
	const priorityOptions = useMemo<SelectOption[]>(
		() =>
			(['low', 'medium', 'high'] as TaskPriority[]).map(priority => ({
				value: priority,
				label: t(`tasks.priorities.${priority}`),
			})),
		[t],
	)
	const assigneeOptions = useMemo<SelectOption[]>(() => {
		const options = new Map<string, string>()
		assigneeOptionsFromApi.forEach(option => options.set(option.value, option.label))
		if (currentUser?.id) {
			options.set(
				String(currentUser.id),
				currentUser.fullName || currentUser.email || String(currentUser.id),
			)
		}
		Object.values(board.cards).forEach(card => {
			if (card.assignedTo) {
				options.set(card.assignedTo, card.assigneeName || card.assignedTo)
			}
		})

		return [
			{ value: '', label: t('tasks.assignees.unassigned') },
			...Array.from(options.entries()).map(([value, label]) => ({
				value,
				label,
			})),
		]
	}, [assigneeOptionsFromApi, board.cards, currentUser, t])
	const assigneeNameById = useMemo(() => {
		const map = new Map<string, string>()
		assigneeOptions.forEach(option => {
			if (option.value) {
				map.set(option.value, option.label)
			}
		})
		return map
	}, [assigneeOptions])
	const clientOptions = useMemo<SelectOption[]>(
		() => [
			{ value: '', label: t('tasks.clients.none') },
			...clientOptionsFromApi,
		],
		[clientOptionsFromApi, t],
	)
	const bookingOptions = useMemo<SelectOption[]>(
		() => [
			{ value: '', label: t('tasks.bookings.none') },
			...bookingOptionsFromApi,
		],
		[bookingOptionsFromApi, t],
	)
	const editBookingOptions = useMemo<SelectOption[]>(
		() => [
			{ value: '', label: t('tasks.bookings.none') },
			...editBookingOptionsFromApi,
		],
		[editBookingOptionsFromApi, t],
	)
	const statusOptions = useMemo<SelectOption[]>(
		() =>
			board.columns.map(column => ({
				value: column.id,
				label: column.title,
				color: column.color,
			})),
		[board.columns],
	)
	const selectedCardAssigneeLabel =
		selectedCard?.assignedTo
			? assigneeNameById.get(selectedCard.assignedTo) ||
				selectedCard.assigneeName ||
				selectedCard.assignedTo
			: t('tasks.assignees.unassigned')
	const isEditingList = Boolean(listDraft.id)
	const listToneOptions = useMemo<SelectOption[]>(
		() =>
			toneCycle.map(tone => ({
				value: tone,
				label: t(`tasks.colors.${tone}`),
				color: {
					blue: '#2563eb',
					cyan: '#06b6d4',
					green: '#16a34a',
					amber: '#f59e0b',
					rose: '#ef4444',
				}[tone],
			})),
		[t],
	)

	const moveCard = useCallback(
		(cardId: string, targetColumnId: string, targetIndex?: number) => {
			if (!canManageTaskMoves) {
				return
			}
			setBoard(current => {
				if (!current.cards[cardId]) {
					return current
				}

				const nextColumns = current.columns.map(column => ({
					...column,
					cardIds: column.cardIds.filter(id => id !== cardId),
				}))
				const targetColumn = nextColumns.find(column => column.id === targetColumnId)
				if (!targetColumn) {
					return current
				}

				const safeIndex =
					typeof targetIndex === 'number'
						? Math.max(0, Math.min(targetIndex, targetColumn.cardIds.length))
						: targetColumn.cardIds.length
				targetColumn.cardIds.splice(safeIndex, 0, cardId)

				return {
					...current,
					columns: nextColumns,
					cards: {
						...current.cards,
						[cardId]: {
							...current.cards[cardId],
							statusId: targetColumnId,
						},
					},
				}
			})
			void moveTask(Number(cardId), Number(targetColumnId))
				.then(updatedTask => {
					setBoard(current => ({
						...current,
						cards: {
							...current.cards,
							[String(updatedTask.id)]: toCard(updatedTask),
						},
					}))
				})
				.catch(() => setReloadKey(current => current + 1))
		},
		[canManageTaskMoves],
	)

	const handleDragStart = (
		event: DragEvent<HTMLElement>,
		cardId: string,
		columnId: string,
	) => {
		draggingRef.current = { cardId, fromColumnId: columnId }
		setDraggingCardId(cardId)
		event.dataTransfer.effectAllowed = 'move'
		event.dataTransfer.setData('text/plain', cardId)
	}

	const handleDragEnd = () => {
		draggingRef.current = null
		setDraggingCardId(null)
	}

	const handleColumnDrop = (
		event: DragEvent<HTMLDivElement>,
		targetColumnId: string,
	) => {
		event.preventDefault()
		const dragging = draggingRef.current
		if (!dragging) {
			return
		}

		moveCard(dragging.cardId, targetColumnId)
		handleDragEnd()
	}

	const handleCardDrop = (
		event: DragEvent<HTMLElement>,
		targetColumn: TaskColumn,
		targetCardId: string,
	) => {
		event.preventDefault()
		event.stopPropagation()
		const dragging = draggingRef.current
		if (!dragging || dragging.cardId === targetCardId) {
			return
		}

		const sourceColumn = board.columns.find(column =>
			column.cardIds.includes(dragging.cardId),
		)
		const sourceIndex = sourceColumn?.cardIds.indexOf(dragging.cardId) ?? -1
		const targetIndex = targetColumn.cardIds.indexOf(targetCardId)
		const adjustedTargetIndex =
			sourceColumn?.id === targetColumn.id &&
			sourceIndex >= 0 &&
			sourceIndex < targetIndex
				? targetIndex - 1
				: targetIndex

		moveCard(dragging.cardId, targetColumn.id, adjustedTargetIndex)
		handleDragEnd()
	}

	const closeCreateModal = () => {
		setDraftColumnId(null)
		setCreateDraft({
			title: '',
			description: '',
			priority: 'medium',
			assignee: '',
			client: '',
			booking: '',
			dueDate: '',
		})
	}

	const handleAddTask = (event: FormEvent<HTMLFormElement>, columnId: string) => {
		event.preventDefault()
		const title = createDraft.title.trim()
		if (!title || !canManageManualTasks) {
			return
		}

		setIsSaving(true)
		void createTask({
			title,
			description: createDraft.description.trim(),
			status: Number(columnId),
			priority: createDraft.priority,
			due_at: toApiDateTime(createDraft.dueDate),
			client: createDraft.client ? Number(createDraft.client) : null,
			booking: createDraft.booking ? Number(createDraft.booking) : null,
			assigned_to: createDraft.assignee ? Number(createDraft.assignee) : null,
		})
			.then(task => {
				const card = toCard(task)
				setBoard(current => ({
					cards: {
						...current.cards,
						[card.id]: card,
					},
					columns: current.columns.map(column =>
						column.id === String(task.status)
							? { ...column, cardIds: [...column.cardIds, card.id] }
							: column,
					),
				}))
				closeCreateModal()
			})
			.catch(error => {
				setErrorMessage(
					error instanceof Error ? error.message : t('tasks.errors.saveFailed'),
				)
			})
			.finally(() => setIsSaving(false))
	}

	const closeListModal = () => {
		setIsListModalOpen(false)
		setListDraft({
			id: '',
			title: '',
			tone: 'blue',
		})
	}

	const handleAddList = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const title = listDraft.title.trim()
		if (!title || !canManageTaskStatuses) {
			return
		}
		const color = {
			blue: '#2563eb',
			cyan: '#06b6d4',
			green: '#16a34a',
			amber: '#f59e0b',
			rose: '#ef4444',
		}[listDraft.tone]
		setIsSaving(true)
		const request = listDraft.id
			? updateTaskStatus(Number(listDraft.id), { name: title, color, is_active: true })
			: createTaskStatus({
					name: title,
					color,
					position: statuses.length,
					is_active: true,
				})
		void request
			.then(() => {
				closeListModal()
				setReloadKey(current => current + 1)
			})
			.catch(error => {
				setErrorMessage(
					error instanceof Error ? error.message : t('tasks.errors.saveFailed'),
				)
			})
			.finally(() => setIsSaving(false))
	}

	const openCard = (card: TaskCard) => {
		setSelectedCardId(card.id)
		setEditDraft({
			title: card.title,
			description: card.description,
			status: card.statusId,
			priority: card.priority,
			assignee: card.assignedTo,
			client: card.clientId,
			booking: card.bookingId,
			dueDate: card.dueDate,
		})
	}

	const openStatusEditor = (column: TaskColumn) => {
		if (!canManageTaskStatuses) {
			return
		}
		setListDraft({
			id: column.id,
			title: column.title,
			tone: column.tone,
		})
		setIsListModalOpen(true)
	}

	const closeCard = () => {
		setPendingDeleteCardId(null)
		setSelectedCardId(null)
	}

	const handleSaveCard = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!selectedCard || !canManageManualTasks) {
			return
		}

		const title = editDraft.title.trim()
		if (!title) {
			return
		}

		setIsSaving(true)
		void updateTask(Number(selectedCard.id), {
			title,
			description: editDraft.description.trim(),
			status: Number(editDraft.status),
			priority: editDraft.priority,
			due_at: toApiDateTime(editDraft.dueDate),
			client: editDraft.client ? Number(editDraft.client) : null,
			booking: editDraft.booking ? Number(editDraft.booking) : null,
			assigned_to: editDraft.assignee ? Number(editDraft.assignee) : null,
		})
			.then(task => {
				const card = toCard(task)
				setBoard(current => ({
					...current,
					cards: {
						...current.cards,
						[card.id]: card,
					},
				}))
				closeCard()
			})
			.catch(error => {
				setErrorMessage(
					error instanceof Error ? error.message : t('tasks.errors.saveFailed'),
				)
			})
			.finally(() => setIsSaving(false))
	}

	const handleDeleteStatus = () => {
		if (!listDraft.id || !canManageTaskStatuses) {
			return
		}
		setIsSaving(true)
		void deleteTaskStatus(Number(listDraft.id))
			.then(() => {
				closeListModal()
				setReloadKey(current => current + 1)
			})
			.catch(error => {
				setErrorMessage(
					error instanceof Error ? error.message : t('tasks.errors.deleteFailed'),
				)
			})
			.finally(() => setIsSaving(false))
	}

	const handleDeleteCard = () => {
		if (!pendingDeleteCard || !canManageManualTasks) {
			return
		}
		const cardId = pendingDeleteCard.id
		setIsSaving(true)
		void deleteTask(Number(cardId))
			.then(() => {
				setBoard(current => {
					const { [cardId]: _removed, ...nextCards } = current.cards
					return {
						cards: nextCards,
						columns: current.columns.map(column => ({
							...column,
							cardIds: column.cardIds.filter(id => id !== cardId),
						})),
					}
				})
				closeCard()
			})
			.catch(error => {
				setErrorMessage(
					error instanceof Error ? error.message : t('tasks.errors.deleteFailed'),
				)
			})
			.finally(() => {
				setPendingDeleteCardId(null)
				setIsSaving(false)
			})
	}

	return (
		<PageLayout>
			{errorMessage ? (
				<div className='rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger'>
					{errorMessage}
				</div>
			) : null}
			{isLoading ? (
				<div className='grid min-h-[360px] place-items-center rounded-[28px] bg-surface-card p-8 text-center text-sm font-semibold text-text-secondary ring-1 ring-border-soft/50'>
					{t('tasks.loading')}
				</div>
			) : null}
			{!isLoading && board.columns.length === 0 ? (
				<div className='grid min-h-[360px] place-items-center rounded-[28px] bg-surface-card p-8 text-center text-sm font-semibold text-text-secondary ring-1 ring-border-soft/50'>
					{t('tasks.empty')}
				</div>
			) : null}
			{!isLoading && board.columns.length > 0 ? (
			<section className='tasks-board--nova overflow-hidden rounded-[28px] bg-surface-card text-text-primary shadow-sm ring-1 ring-border-soft/50'>
				<div className='tasks-board-header--nova border-b border-border-soft/50 bg-surface-subtle/70 px-5 py-4 sm:px-8'>
					<div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
						<div className='flex flex-wrap items-center gap-3'>
							<div className='border-l-4 border-primary pl-4'>
								<p className='m-0 text-[11px] font-black uppercase tracking-[0.22em] text-text-muted'>
									{t('tasks.eyebrow')}
								</p>
								<h2 className='m-0 mt-1 text-lg font-black tracking-[-0.03em] text-text-primary'>
									{t('tasks.boardName')}
								</h2>
							</div>
						</div>

						<div className='flex flex-wrap items-center gap-2 text-xs font-bold text-text-secondary'>
							<span className='rounded-full bg-surface-card px-3 py-2 shadow-sm ring-1 ring-border-soft/50'>
								{t('tasks.stats.lists')}:{' '}
								{board.columns.length}
							</span>
							<span className='rounded-full bg-surface-card px-3 py-2 shadow-sm ring-1 ring-border-soft/50'>
								{t('tasks.stats.tasks')}: {totalCards}
							</span>
							<span className='rounded-full bg-success-bg px-3 py-2 text-success shadow-sm ring-1 ring-success/15'>
								{t('tasks.stats.done')}: {completedCards}
							</span>
							{canManageTaskStatuses ? (
								<button
									type='button'
									onClick={() => setIsListModalOpen(true)}
									className='inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-surface-card px-4 text-sm font-black text-text-primary shadow-sm ring-1 ring-border-soft/50 transition hover:bg-surface-muted'
								>
									<FiPlus className='h-4 w-4' />
									{t('tasks.actions.newList')}
								</button>
							) : null}
						</div>
					</div>
				</div>

				<div className='tasks-board-canvas--nova overflow-x-auto bg-background-subtle p-5 sm:p-7'>
					<div className='flex min-h-[520px] w-max gap-4 pb-3'>
						{board.columns.map(column => {
							const tone = columnToneClasses[column.tone]

							return (
								<div
									key={column.id}
									onDragOver={event => event.preventDefault()}
									onDrop={event => handleColumnDrop(event, column.id)}
									className='task-column--nova flex max-h-[66vh] w-[290px] shrink-0 flex-col rounded-[22px] border border-border-soft/55 border-t-4 bg-surface-card shadow-sm ring-1 ring-border-soft/25 sm:w-[320px]'
									style={{ borderTopColor: column.color }}
								>
									<div className='flex items-center justify-between gap-3 border-b border-border-soft/45 px-4 py-4'>
										<div className='flex min-w-0 items-center gap-2'>
											<span
												className='h-3 w-3 shrink-0 rounded-full ring-4 ring-border-soft/35'
												style={{ backgroundColor: column.color }}
												aria-hidden='true'
											/>
											<h2 className='truncate text-sm font-black text-text-primary'>
												{column.title}
											</h2>
											<span
												className={`rounded-full px-2 py-0.5 text-[11px] font-black ${tone.badge}`}
											>
												{column.cardIds.length}
											</span>
										</div>
										{canManageTaskStatuses ? (
											<button
												type='button'
												onClick={() => openStatusEditor(column)}
												className='grid h-8 w-8 place-items-center rounded-xl bg-surface-subtle text-text-muted transition hover:bg-surface-muted hover:text-text-primary'
												aria-label={t('common.edit')}
											>
												<FiEdit2 className='h-4 w-4' />
											</button>
										) : null}
									</div>

									<div className='grid gap-3 overflow-y-auto px-3 py-3 [scrollbar-color:rgba(255,255,255,0.28)_transparent]'>
										{column.cardIds.map(cardId => {
											const card = board.cards[cardId]
											if (!card) {
												return null
											}

											return (
												<article
													key={card.id}
													draggable={canManageTaskMoves}
													onClick={() => openCard(card)}
													onDragStart={event =>
														handleDragStart(event, card.id, column.id)
													}
													onDragEnd={handleDragEnd}
													onDragOver={event => event.preventDefault()}
													onDrop={event => handleCardDrop(event, column, card.id)}
													className={`task-card--nova ${canManageTaskMoves ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} rounded-2xl bg-surface-subtle/75 p-3 text-left shadow-sm ring-1 ring-border-soft/45 transition hover:-translate-y-0.5 hover:bg-surface-card hover:ring-border-soft/80 ${
														draggingCardId === card.id
															? 'scale-[0.98] opacity-45 ring-2 ring-primary/50'
															: ''
													}`}
												>
													<div
														className={`mb-3 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-black ${priorityClasses[card.priority]}`}
													>
														{t(`tasks.priorities.${card.priority}`)}
													</div>
													<h3 className='line-clamp-3 text-sm font-black leading-5 text-text-primary'>
														{card.title}
													</h3>
													{card.description ? (
														<p className='mt-2 line-clamp-2 text-xs leading-5 text-text-secondary'>
															{card.description}
														</p>
													) : null}
													{card.clientName || card.clientPhone ? (
														<div className='mt-3 rounded-xl bg-surface-card px-3 py-2 text-xs font-semibold text-text-secondary ring-1 ring-border-soft/40'>
															<p className='m-0 truncate text-text-primary'>
																{card.clientName || card.clientPhone}
															</p>
															{card.clientPhone ? (
																<p className='m-0 mt-0.5 truncate'>{card.clientPhone}</p>
															) : null}
														</div>
													) : null}
													{card.bookingScheduledFor ? (
														<div className='mt-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold text-text-accent ring-1 ring-primary/15'>
															<span className='text-text-muted'>
																{t('tasks.fields.booking')}:{' '}
															</span>
															{formatDueDate(
																card.bookingScheduledFor,
																t('tasks.bookings.noDate'),
																i18n.language,
															)}
														</div>
													) : null}
													<div className='mt-4 flex items-center justify-between border-t border-border-soft/45 pt-3 text-[11px] font-bold text-text-muted'>
														<div className='flex items-center gap-2'>
															<span className='inline-flex items-center gap-1'>
																<FiClock className='h-3.5 w-3.5' />
																{formatDueDate(
																	card.dueDate,
																	t('tasks.noDueDate'),
																	i18n.language,
																)}
															</span>
														</div>
														<div className='flex items-center gap-2'>
															{card.kind !== 'manual' ? (
																<span className='rounded-full bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-text-accent'>
																	{t([
																		`tasks.kinds.${card.kind}`,
																		'tasks.kinds.unknown',
																	])}
																</span>
															) : null}
															{card.attachments > 0 ? (
																<span className='inline-flex items-center gap-1'>
																	<FiPaperclip className='h-3.5 w-3.5' />
																	{card.attachments}
																</span>
															) : null}
															{card.assignedTo || card.assigneeName ? (
																<span
																	className='inline-flex max-w-[96px] items-center rounded-full bg-primary/12 px-2 py-1 text-[10px] text-text-accent'
																	title={
																		card.assignedTo
																			? assigneeNameById.get(card.assignedTo) ||
																				card.assigneeName ||
																				card.assignedTo
																			: card.assigneeName
																	}
																>
																	<span className='truncate'>
																		{card.assignedTo
																			? assigneeNameById.get(card.assignedTo) ||
																				card.assigneeName ||
																				card.assignedTo
																			: card.assigneeName}
																	</span>
																</span>
															) : null}
														</div>
													</div>
												</article>
											)
										})}
									</div>

									{canManageManualTasks ? (
									<div className='mt-auto border-t border-border-soft/50 p-3'>
										<button
											type='button'
											onClick={() => setDraftColumnId(column.id)}
											className={`inline-flex h-11 w-full items-center gap-2 rounded-2xl px-3 text-sm font-bold text-text-secondary transition ${tone.add}`}
										>
											<FiPlus className='h-4 w-4' />
											{t('tasks.actions.addTask')}
										</button>
									</div>
									) : null}
								</div>
							)
						})}
					</div>
				</div>
			</section>
			) : null}

			{isListModalOpen ? (
				<div
					className='fixed inset-0 z-[900] flex items-end bg-background-overlay/72 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6'
					onMouseDown={event => {
						if (event.target === event.currentTarget) {
							closeListModal()
						}
					}}
				>
					<form
						onSubmit={handleAddList}
						className='task-modal--nova max-h-[calc(100dvh-1.5rem)] w-full max-w-lg touch-pan-y overflow-y-auto overscroll-contain rounded-[28px] bg-surface-card p-5 text-text-primary shadow-xl ring-1 ring-border-soft/50 sm:max-h-[calc(100dvh-3rem)] sm:p-6'
					>
						<div className='mb-5 flex items-start justify-between gap-4'>
							<div>
								<p className='text-xs font-black uppercase tracking-[0.22em] text-primary'>
									{t(
										isEditingList
											? 'tasks.modal.editListEyebrow'
											: 'tasks.modal.listEyebrow',
									)}
								</p>
								<h2 className='mt-1 text-xl font-black tracking-[-0.03em] text-text-primary'>
									{t(
										isEditingList
											? 'tasks.modal.editListTitle'
											: 'tasks.modal.listTitle',
									)}
								</h2>
							</div>
							<button
								type='button'
								onClick={closeListModal}
								className='grid h-10 w-10 place-items-center rounded-2xl bg-surface-subtle text-text-secondary transition hover:bg-surface-muted hover:text-text-primary'
								aria-label={t('common.cancel')}
							>
								<FiX className='h-5 w-5' />
							</button>
						</div>

						<div className='grid gap-3'>
							<label className='grid gap-1.5'>
								<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
									{t('tasks.fields.listTitle')}
								</span>
								<input
									value={listDraft.title}
									onChange={event =>
										setListDraft(current => ({
											...current,
											title: event.target.value,
										}))
									}
									autoFocus
									placeholder={t('tasks.placeholders.newList')}
									className='min-h-12 rounded-2xl border border-border-soft/60 bg-surface-subtle px-4 text-sm font-semibold text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary/50 focus:bg-surface-card focus:ring-2 focus:ring-primary/20'
								/>
							</label>

							<label className='grid gap-1.5'>
								<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
									{t('tasks.fields.color')}
								</span>
								<FilterSelect
									value={listDraft.tone}
									onChange={value =>
										setListDraft(current => ({
											...current,
											tone: value as ColumnTone,
										}))
									}
									options={listToneOptions}
								/>
							</label>

							<div
								className={`rounded-2xl border border-border-soft/55 border-t-4 ${columnToneClasses[listDraft.tone].top} bg-surface-subtle p-4`}
							>
								<p className='m-0 text-sm font-black text-text-primary'>
									{listDraft.title || t('tasks.placeholders.newList')}
								</p>
								<p className='m-0 mt-1 text-xs font-semibold text-text-secondary'>
									{t(`tasks.colors.${listDraft.tone}`)}
								</p>
							</div>
						</div>

						<div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between'>
							<div className='flex flex-col-reverse gap-2 sm:flex-row'>
								<button
									type='button'
									onClick={closeListModal}
									disabled={isSaving}
									className='inline-flex h-11 items-center justify-center rounded-2xl bg-surface-subtle px-4 text-sm font-black text-text-secondary transition hover:bg-surface-muted hover:text-text-primary'
								>
									{t('common.cancel')}
								</button>
								<button
									type='submit'
									disabled={isSaving}
									className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground transition hover:bg-primary-accent'
								>
									{isEditingList ? (
										<FiCheckCircle className='h-4 w-4' />
									) : (
										<FiPlus className='h-4 w-4' />
									)}
									{t(isEditingList ? 'tasks.actions.saveList' : 'tasks.actions.newList')}
								</button>
							</div>
							{listDraft.id ? (
								<button
									type='button'
									onClick={handleDeleteStatus}
									disabled={isSaving}
									className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-danger-bg px-4 text-sm font-black text-danger transition hover:brightness-95 disabled:opacity-60'
								>
									<FiTrash2 className='h-4 w-4' />
									{t('tasks.actions.deleteList')}
								</button>
							) : null}
						</div>
					</form>
				</div>
			) : null}

			{draftColumnId ? (
				<div
					className='fixed inset-0 z-[900] flex items-end bg-background-overlay/72 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6'
					onMouseDown={event => {
						if (event.target === event.currentTarget) {
							closeCreateModal()
						}
					}}
				>
					<form
						onSubmit={event => handleAddTask(event, draftColumnId)}
						className='task-modal--nova max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl touch-pan-y overflow-y-auto overscroll-contain rounded-[28px] bg-surface-card p-5 text-text-primary shadow-xl ring-1 ring-border-soft/50 sm:max-h-[calc(100dvh-3rem)] sm:p-6'
					>
						<div className='mb-5 flex items-start justify-between gap-4'>
							<div>
								<p className='text-xs font-black uppercase tracking-[0.22em] text-primary'>
									{t('tasks.modal.createEyebrow')}
								</p>
								<h2 className='mt-1 text-xl font-black tracking-[-0.03em] text-text-primary'>
									{t('tasks.modal.createTitle')}
								</h2>
								<p className='mt-1 text-sm font-semibold text-text-secondary'>
									{board.columns.find(column => column.id === draftColumnId)?.title}
								</p>
							</div>
							<button
								type='button'
								onClick={closeCreateModal}
								className='grid h-10 w-10 place-items-center rounded-2xl bg-surface-subtle text-text-secondary transition hover:bg-surface-muted hover:text-text-primary'
								aria-label={t('common.cancel')}
							>
								<FiX className='h-5 w-5' />
							</button>
						</div>

						<div className='grid gap-3'>
							<label className='grid gap-1.5'>
								<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
									{t('tasks.fields.title')}
								</span>
								<input
									value={createDraft.title}
									onChange={event =>
										setCreateDraft(current => ({
											...current,
											title: event.target.value,
										}))
									}
									autoFocus
									placeholder={t('tasks.placeholders.taskTitle')}
									className='min-h-12 rounded-2xl border border-border-soft/60 bg-surface-subtle px-4 text-sm font-semibold text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary/50 focus:bg-surface-card focus:ring-2 focus:ring-primary/20'
								/>
							</label>

							<label className='grid gap-1.5'>
								<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
									{t('tasks.fields.description')}
								</span>
								<textarea
									value={createDraft.description}
									onChange={event =>
										setCreateDraft(current => ({
											...current,
											description: event.target.value,
										}))
									}
									rows={4}
									placeholder={t('tasks.placeholders.description')}
									className='resize-none rounded-2xl border border-border-soft/60 bg-surface-subtle px-4 py-3 text-sm font-semibold text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary/50 focus:bg-surface-card focus:ring-2 focus:ring-primary/20'
								/>
							</label>

							<div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
								<label className='grid gap-1.5'>
									<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
										{t('tasks.fields.priority')}
									</span>
									<FilterSelect
										value={createDraft.priority}
										onChange={event =>
											setCreateDraft(current => ({
												...current,
												priority: event as TaskPriority,
											}))
										}
										options={priorityOptions}
									/>
								</label>

								{canViewClients ? (
									<label className='grid gap-1.5'>
										<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
											{t('tasks.fields.client')}
										</span>
										<FilterSelect
											value={createDraft.client}
											onChange={value =>
											setCreateDraft(current => ({
												...current,
												client: value,
												booking: '',
											}))
										}
										options={clientOptions}
									/>
								</label>
							) : null}

								{canViewBookings && createDraft.client ? (
									<label className='grid gap-1.5'>
										<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
											{t('tasks.fields.booking')}
										</span>
										<FilterSelect
											value={createDraft.booking}
											onChange={value =>
												setCreateDraft(current => ({
													...current,
													booking: value,
												}))
											}
											options={bookingOptions}
										/>
									</label>
								) : null}

								<label className='grid gap-1.5'>
									<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
										{t('tasks.fields.assignee')}
									</span>
									<FilterSelect
										value={createDraft.assignee}
										onChange={value =>
											setCreateDraft(current => ({
												...current,
												assignee: value,
											}))
										}
										options={assigneeOptions}
									/>
								</label>

								<label className='grid gap-1.5'>
									<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
										{t('tasks.fields.dueDate')}
									</span>
									<HandmadeDateTimePicker
										value={createDraft.dueDate}
										onChange={event =>
											setCreateDraft(current => ({
												...current,
												dueDate: event,
											}))
										}
										placeholder={t('tasks.placeholders.dueDate')}
										locale={i18n.language}
									/>
								</label>
							</div>
						</div>

						<div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
							<button
								type='button'
								onClick={closeCreateModal}
								disabled={isSaving}
								className='inline-flex h-11 items-center justify-center rounded-2xl bg-surface-subtle px-4 text-sm font-black text-text-secondary transition hover:bg-surface-muted hover:text-text-primary'
							>
								{t('common.cancel')}
							</button>
							<button
								type='submit'
								disabled={isSaving}
								className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground transition hover:bg-primary-accent'
							>
								<FiPlus className='h-4 w-4' />
								{t('tasks.actions.addTask')}
							</button>
						</div>
					</form>
				</div>
			) : null}

			{selectedCard && !canManageManualTasks ? (
				<div
					className='fixed inset-0 z-[900] flex items-end bg-background-overlay/72 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6'
					onMouseDown={event => {
						if (event.target === event.currentTarget) {
							closeCard()
						}
					}}
				>
					<section
						className='task-modal--nova max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl touch-pan-y overflow-y-auto overscroll-contain rounded-[28px] bg-surface-card p-5 text-text-primary shadow-xl ring-1 ring-border-soft/50 sm:max-h-[calc(100dvh-3rem)] sm:p-6'
						aria-label={t('tasks.modal.viewTitle')}
					>
						<div className='mb-5 flex items-start justify-between gap-4'>
							<div>
								<p className='text-xs font-black uppercase tracking-[0.22em] text-primary'>
									{t('tasks.modal.eyebrow')}
								</p>
								<h2 className='mt-1 text-xl font-black tracking-[-0.03em] text-text-primary'>
									{t('tasks.modal.viewTitle')}
								</h2>
								<p className='mt-1 text-sm font-semibold text-text-secondary'>
									{selectedCardAssigneeLabel}
								</p>
							</div>
							<button
								type='button'
								onClick={closeCard}
								className='grid h-10 w-10 place-items-center rounded-2xl bg-surface-subtle text-text-secondary transition hover:bg-surface-muted hover:text-text-primary'
								aria-label={t('common.cancel')}
							>
								<FiX className='h-5 w-5' />
							</button>
						</div>

						<div className='grid gap-3'>
							<div className='rounded-2xl bg-surface-subtle p-4 ring-1 ring-border-soft/45'>
								<p className='m-0 text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
									{t('tasks.fields.title')}
								</p>
								<p className='m-0 mt-2 text-base font-black text-text-primary'>
									{selectedCard.title || t('common.na')}
								</p>
							</div>

							<div className='rounded-2xl bg-surface-subtle p-4 ring-1 ring-border-soft/45'>
								<p className='m-0 text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
									{t('tasks.fields.description')}
								</p>
								<p className='m-0 mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-text-secondary'>
									{selectedCard.description || t('common.na')}
								</p>
							</div>

							{canManageTaskMoves ? (
								<label className='grid gap-1.5 rounded-2xl bg-surface-subtle p-4 ring-1 ring-border-soft/45'>
									<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
										{t('tasks.fields.status')}
									</span>
									<FilterSelect
										value={selectedCard.statusId}
										onChange={value => moveCard(selectedCard.id, value)}
										options={statusOptions}
										disabled={isSaving}
									/>
								</label>
							) : null}

							<div className='grid gap-3 sm:grid-cols-2'>
								{[
									...(!canManageTaskMoves
										? [
												{
													label: t('tasks.fields.status'),
													value:
														board.columns.find(
															column => column.id === selectedCard.statusId,
														)?.title || t('common.na'),
													color: board.columns.find(
														column => column.id === selectedCard.statusId,
													)?.color,
												},
											]
										: []),
									{
										label: t('tasks.fields.priority'),
										value: t(`tasks.priorities.${selectedCard.priority}`),
									},
									{
										label: t('tasks.fields.assignee'),
										value: selectedCardAssigneeLabel,
									},
									{
										label: t('tasks.fields.dueDate'),
										value: formatDueDate(
											selectedCard.dueDate,
											t('tasks.noDueDate'),
											i18n.language,
										),
									},
									{
										label: t('tasks.fields.client'),
										value:
											selectedCard.clientName ||
											selectedCard.clientPhone ||
											t('common.na'),
									},
									{
										label: t('tasks.fields.clientPhone'),
										value: selectedCard.clientPhone || t('common.na'),
									},
									{
										label: t('tasks.fields.booking'),
										value: selectedCard.bookingScheduledFor
											? formatDueDate(
													selectedCard.bookingScheduledFor,
													t('tasks.bookings.noDate'),
													i18n.language,
												)
											: t('common.na'),
									},
									{
										label: t('tasks.fields.kind'),
										value: t([
											`tasks.kinds.${selectedCard.kind}`,
											'tasks.kinds.unknown',
										]),
									},
									{
										label: t('tasks.fields.createdAt'),
										value: formatDueDate(
											selectedCard.createdAt,
											t('common.na'),
											i18n.language,
										),
									},
								].map(item => (
									<div
										key={item.label}
										className='rounded-2xl bg-surface-subtle px-4 py-3 ring-1 ring-border-soft/45'
									>
										<p className='m-0 text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
											{item.label}
										</p>
										<div className='mt-1 flex items-center gap-2'>
											{'color' in item && item.color ? (
												<span
													className='h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-border-soft/60'
													style={{ backgroundColor: item.color }}
													aria-hidden='true'
												/>
											) : null}
											<p className='m-0 break-words text-sm font-bold text-text-primary'>
												{item.value}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					</section>
				</div>
			) : null}

			{selectedCard && canManageManualTasks ? (
				<div
					className='fixed inset-0 z-[900] flex items-end bg-background-overlay/72 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6'
					onMouseDown={event => {
						if (event.target === event.currentTarget) {
							closeCard()
						}
					}}
				>
					<form
						onSubmit={handleSaveCard}
						className='task-modal--nova max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl touch-pan-y overflow-y-auto overscroll-contain rounded-[28px] bg-surface-card p-5 text-text-primary shadow-xl ring-1 ring-border-soft/50 sm:max-h-[calc(100dvh-3rem)] sm:p-6'
					>
						<div className='mb-5 flex items-start justify-between gap-4'>
							<div>
								<p className='text-xs font-black uppercase tracking-[0.22em] text-primary'>
									{t('tasks.modal.eyebrow')}
								</p>
								<h2 className='mt-1 text-xl font-black tracking-[-0.03em] text-text-primary'>
									{t('tasks.modal.title')}
								</h2>
								<p className='mt-1 text-sm font-semibold text-text-secondary'>
									{selectedCardAssigneeLabel}
								</p>
							</div>
							<button
								type='button'
								onClick={closeCard}
								className='grid h-10 w-10 place-items-center rounded-2xl bg-surface-subtle text-text-secondary transition hover:bg-surface-muted hover:text-text-primary'
								aria-label={t('common.cancel')}
							>
								<FiX className='h-5 w-5' />
							</button>
						</div>

						<div className='grid gap-3'>
							<label className='grid gap-1.5'>
								<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
									{t('tasks.fields.title')}
								</span>
								<input
									value={editDraft.title}
									onChange={event =>
										setEditDraft(current => ({
											...current,
											title: event.target.value,
										}))
									}
									className='min-h-12 rounded-2xl border border-border-soft/60 bg-surface-subtle px-4 text-sm font-semibold text-text-primary outline-none transition focus:border-primary/50 focus:bg-surface-card focus:ring-2 focus:ring-primary/20'
								/>
							</label>

							<label className='grid gap-1.5'>
								<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
									{t('tasks.fields.description')}
								</span>
								<textarea
									value={editDraft.description}
									onChange={event =>
										setEditDraft(current => ({
											...current,
											description: event.target.value,
										}))
									}
									rows={4}
									className='resize-none rounded-2xl border border-border-soft/60 bg-surface-subtle px-4 py-3 text-sm font-semibold text-text-primary outline-none transition focus:border-primary/50 focus:bg-surface-card focus:ring-2 focus:ring-primary/20'
								/>
							</label>

							<div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-6'>
								<label className='grid gap-1.5'>
									<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
										{t('tasks.fields.status')}
									</span>
									<FilterSelect
										value={editDraft.status}
										onChange={value => {
											setEditDraft(current => ({
												...current,
												status: value,
											}))
											moveCard(selectedCard.id, value)
										}}
										options={statusOptions}
										disabled={isSaving}
									/>
								</label>

								<label className='grid gap-1.5'>
									<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
										{t('tasks.fields.priority')}
									</span>
									<FilterSelect
										value={editDraft.priority}
										onChange={event =>
											setEditDraft(current => ({
												...current,
												priority: event as TaskPriority,
											}))
										}
										options={priorityOptions}
									/>
								</label>

								{canViewClients ? (
									<label className='grid gap-1.5'>
										<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
											{t('tasks.fields.client')}
										</span>
										<FilterSelect
											value={editDraft.client}
											onChange={value =>
												setEditDraft(current => ({
													...current,
													client: value,
													booking: '',
												}))
											}
											options={clientOptions}
										/>
									</label>
								) : null}

								{canViewBookings && editDraft.client ? (
									<label className='grid gap-1.5'>
										<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
											{t('tasks.fields.booking')}
										</span>
										<FilterSelect
											value={editDraft.booking}
											onChange={value =>
												setEditDraft(current => ({
													...current,
													booking: value,
												}))
											}
											options={editBookingOptions}
										/>
									</label>
								) : null}

								<label className='grid gap-1.5'>
									<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
										{t('tasks.fields.assignee')}
									</span>
									<FilterSelect
										value={editDraft.assignee}
										onChange={value =>
											setEditDraft(current => ({
												...current,
												assignee: value,
											}))
										}
										options={assigneeOptions}
									/>
								</label>

								<label className='grid gap-1.5'>
									<span className='text-[11px] font-black uppercase tracking-[0.16em] text-text-muted'>
										{t('tasks.fields.dueDate')}
									</span>
									<HandmadeDateTimePicker
										value={editDraft.dueDate}
										onChange={event =>
											setEditDraft(current => ({
												...current,
												dueDate: event,
											}))
										}
										placeholder={t('tasks.placeholders.dueDate')}
										locale={i18n.language}
									/>
								</label>
							</div>
						</div>

						<div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between'>
							<button
								type='submit'
								disabled={isSaving}
								className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground transition hover:bg-primary-accent'
							>
								<FiCheckCircle className='h-4 w-4' />
								{t('common.save')}
							</button>
							<button
								type='button'
								onClick={() => {
									if (selectedCard) {
										setPendingDeleteCardId(selectedCard.id)
									}
								}}
								disabled={isSaving}
								className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-danger-bg px-4 text-sm font-black text-danger transition hover:brightness-95'
							>
								<FiTrash2 className='h-4 w-4' />
								{t('tasks.actions.deleteTask')}
							</button>
						</div>
					</form>
				</div>
			) : null}

			{pendingDeleteCard ? (
				<ConfirmDialog
					eyebrow={t('tasks.deleteDialog.eyebrow')}
					title={t('tasks.deleteDialog.title', {
						title: pendingDeleteCard.title,
					})}
					description={t('tasks.deleteDialog.description')}
					cancelLabel={t('common.cancel')}
					confirmLabel={t('tasks.actions.deleteTask')}
					confirmTone='danger'
					isBusy={isSaving}
					onCancel={() => {
						if (!isSaving) {
							setPendingDeleteCardId(null)
						}
					}}
					onConfirm={handleDeleteCard}
					ariaLabel={t('tasks.deleteDialog.ariaLabel')}
				/>
			) : null}
		</PageLayout>
	)
}

export default TasksPage
