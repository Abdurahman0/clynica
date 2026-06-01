import type { DragEvent, FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	FiCheckCircle,
	FiClock,
	FiMoreHorizontal,
	FiPaperclip,
	FiPlus,
	FiTrash2,
	FiX,
} from 'react-icons/fi'
import { PageLayout } from '../../../components/shared/page'
import { FilterSelect } from '../../../components/shared/data'
import { HandmadeDatePicker } from '../../../features/clients/components/HandmadeDatePickers'
import type { SelectOption } from '../../../types/common'

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
type ColumnTone = 'blue' | 'cyan' | 'green' | 'amber' | 'rose'

interface TaskCard {
	id: string
	title: string
	description: string
	priority: TaskPriority
	assignee: string
	dueDate: string
	attachments: number
	comments: number
	createdAt: string
}

interface TaskColumn {
	id: string
	title: string
	tone: ColumnTone
	cardIds: string[]
}

interface TaskBoard {
	columns: TaskColumn[]
	cards: Record<string, TaskCard>
}

type Translate = (key: string) => string

const STORAGE_KEY = 'renaissance.tasks.board.v1'

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
	urgent: 'border-danger/30 bg-danger-bg text-danger',
}

const toneCycle: ColumnTone[] = ['blue', 'cyan', 'green', 'amber', 'rose']

function createId(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 8)}`
}

function createInitialBoard(t: Translate): TaskBoard {
	const cards: Record<string, TaskCard> = {
		'task-client-flow': {
			id: 'task-client-flow',
			title: t('tasks.samples.clientFlow'),
			description: t('tasks.samples.clientFlowDescription'),
			priority: 'medium',
			assignee: 'AR',
			dueDate: '2026-06-04',
			attachments: 1,
			comments: 2,
			createdAt: new Date().toISOString(),
		},
		'task-follow-ups': {
			id: 'task-follow-ups',
			title: t('tasks.samples.followUps'),
			description: t('tasks.samples.followUpsDescription'),
			priority: 'high',
			assignee: 'MK',
			dueDate: '2026-06-02',
			attachments: 0,
			comments: 3,
			createdAt: new Date().toISOString(),
		},
		'task-status-colors': {
			id: 'task-status-colors',
			title: t('tasks.samples.statusColors'),
			description: t('tasks.samples.statusColorsDescription'),
			priority: 'medium',
			assignee: 'SA',
			dueDate: '',
			attachments: 0,
			comments: 1,
			createdAt: new Date().toISOString(),
		},
		'task-dashboard-chart': {
			id: 'task-dashboard-chart',
			title: t('tasks.samples.dashboardChart'),
			description: t('tasks.samples.dashboardChartDescription'),
			priority: 'low',
			assignee: 'AR',
			dueDate: '2026-06-06',
			attachments: 1,
			comments: 0,
			createdAt: new Date().toISOString(),
		},
	}

	return {
		cards,
		columns: [
			{
				id: 'todo',
				title: t('tasks.columns.todo'),
				tone: 'blue',
				cardIds: ['task-client-flow'],
			},
			{
				id: 'doing',
				title: t('tasks.columns.doing'),
				tone: 'cyan',
				cardIds: ['task-follow-ups'],
			},
			{
				id: 'review',
				title: t('tasks.columns.review'),
				tone: 'amber',
				cardIds: ['task-status-colors'],
			},
			{
				id: 'done',
				title: t('tasks.columns.done'),
				tone: 'green',
				cardIds: ['task-dashboard-chart'],
			},
			{
				id: 'blocked',
				title: t('tasks.columns.blocked'),
				tone: 'rose',
				cardIds: [],
			},
		],
	}
}

function readStoredBoard(): TaskBoard | null {
	if (typeof window === 'undefined') {
		return null
	}

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY)
		if (!raw) {
			return null
		}

		const parsed = JSON.parse(raw) as TaskBoard
		if (!Array.isArray(parsed.columns) || !parsed.cards) {
			return null
		}

		return parsed
	} catch {
		return null
	}
}

function writeStoredBoard(board: TaskBoard): void {
	if (typeof window === 'undefined') {
		return
	}

	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
}

function formatDueDate(value: string, fallback: string): string {
	if (!value) {
		return fallback
	}

	return new Intl.DateTimeFormat(undefined, {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(new Date(`${value}T00:00:00`))
}

function TasksPage() {
	const { i18n, t } = useTranslation()
	const initialBoard = useMemo(() => createInitialBoard(t), [t])
	const [board, setBoard] = useState<TaskBoard>(() => readStoredBoard() ?? initialBoard)
	const [draftColumnId, setDraftColumnId] = useState<string | null>(null)
	const [createDraft, setCreateDraft] = useState({
		title: '',
		description: '',
		priority: 'medium' as TaskPriority,
		assignee: '',
		dueDate: '',
	})
	const [isListModalOpen, setIsListModalOpen] = useState(false)
	const [listDraft, setListDraft] = useState({
		title: '',
		tone: 'blue' as ColumnTone,
	})
	const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
	const [editDraft, setEditDraft] = useState({
		title: '',
		description: '',
		priority: 'medium' as TaskPriority,
		assignee: '',
		dueDate: '',
	})
	const draggingRef = useRef<{ cardId: string; fromColumnId: string } | null>(
		null,
	)
	const [draggingCardId, setDraggingCardId] = useState<string | null>(null)

	useEffect(() => {
		writeStoredBoard(board)
	}, [board])

	const totalCards = Object.keys(board.cards).length
	const completedCards =
		board.columns.find(column => column.id === 'done')?.cardIds.length ?? 0
	const selectedCard = selectedCardId ? board.cards[selectedCardId] : null
	const priorityOptions = useMemo<SelectOption[]>(
		() =>
			(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(priority => ({
				value: priority,
				label: t(`tasks.priorities.${priority}`),
			})),
		[t],
	)
	const assigneeOptions = useMemo<SelectOption[]>(() => {
		const assignees = new Set(['AR', 'MK', 'SA'])
		Object.values(board.cards).forEach(card => {
			if (card.assignee) {
				assignees.add(card.assignee)
			}
		})

		return [
			{ value: '', label: t('tasks.assignees.unassigned') },
			...Array.from(assignees).map(assignee => ({
				value: assignee,
				label: assignee,
			})),
		]
	}, [board.cards, t])
	const listToneOptions = useMemo<SelectOption[]>(
		() =>
			toneCycle.map(tone => ({
				value: tone,
				label: t(`tasks.colors.${tone}`),
			})),
		[t],
	)

	const moveCard = useCallback(
		(cardId: string, targetColumnId: string, targetIndex?: number) => {
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
				}
			})
		},
		[],
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
			dueDate: '',
		})
	}

	const handleAddTask = (event: FormEvent<HTMLFormElement>, columnId: string) => {
		event.preventDefault()
		const title = createDraft.title.trim()
		if (!title) {
			return
		}

		const cardId = createId('task')
		const card: TaskCard = {
			id: cardId,
			title,
			description: createDraft.description.trim(),
			priority: createDraft.priority,
			assignee: createDraft.assignee.trim().toUpperCase(),
			dueDate: createDraft.dueDate,
			attachments: 0,
			comments: 0,
			createdAt: new Date().toISOString(),
		}

		setBoard(current => ({
			cards: {
				...current.cards,
				[cardId]: card,
			},
			columns: current.columns.map(column =>
				column.id === columnId
					? { ...column, cardIds: [...column.cardIds, cardId] }
					: column,
			),
		}))
		closeCreateModal()
	}

	const closeListModal = () => {
		setIsListModalOpen(false)
		setListDraft({
			title: '',
			tone: 'blue',
		})
	}

	const handleAddList = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const title = listDraft.title.trim()
		if (!title) {
			return
		}

		setBoard(current => ({
			...current,
			columns: [
				...current.columns,
				{
					id: createId('column'),
					title,
					tone: listDraft.tone,
					cardIds: [],
				},
			],
		}))
		closeListModal()
	}

	const openCard = (card: TaskCard) => {
		setSelectedCardId(card.id)
		setEditDraft({
			title: card.title,
			description: card.description,
			priority: card.priority,
			assignee: card.assignee,
			dueDate: card.dueDate,
		})
	}

	const closeCard = () => {
		setSelectedCardId(null)
	}

	const handleSaveCard = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!selectedCard) {
			return
		}

		const title = editDraft.title.trim()
		if (!title) {
			return
		}

		setBoard(current => ({
			...current,
			cards: {
				...current.cards,
				[selectedCard.id]: {
					...selectedCard,
					title,
					description: editDraft.description.trim(),
					priority: editDraft.priority,
					assignee: editDraft.assignee.trim().toUpperCase(),
					dueDate: editDraft.dueDate,
				},
			},
		}))
		closeCard()
	}

	const handleDeleteCard = () => {
		if (!selectedCard) {
			return
		}

		setBoard(current => {
			const { [selectedCard.id]: _removed, ...nextCards } = current.cards
			return {
				cards: nextCards,
				columns: current.columns.map(column => ({
					...column,
					cardIds: column.cardIds.filter(id => id !== selectedCard.id),
				})),
			}
		})
		closeCard()
	}

	return (
		<PageLayout>
			<section className='overflow-hidden rounded-[28px] bg-surface-card text-text-primary shadow-sm ring-1 ring-border-soft/50'>
				<div className='border-b border-border-soft/50 bg-surface-subtle/70 px-5 py-4 sm:px-8'>
					<div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
						<div className='flex flex-wrap items-center gap-3'>
							<div className='rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-sm'>
								{t('tasks.boardName')}
							</div>
							<div className='h-8 w-px bg-border-soft' />
							<div className='flex items-center gap-2'>
								<span className='text-xs font-bold uppercase tracking-[0.22em] text-text-muted'>
									{t('tasks.members')}
								</span>
								<div className='flex -space-x-2'>
									{['AR', 'MK', 'SA'].map(member => (
										<span
											key={member}
											className='grid h-8 w-8 place-items-center rounded-full border-2 border-surface-subtle bg-gradient-to-br from-primary to-success text-[10px] font-black text-primary-foreground'
										>
											{member}
										</span>
									))}
								</div>
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
							<button
								type='button'
								onClick={() => setIsListModalOpen(true)}
								className='inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-surface-card px-4 text-sm font-black text-text-primary shadow-sm ring-1 ring-border-soft/50 transition hover:bg-surface-muted'
							>
								<FiPlus className='h-4 w-4' />
								{t('tasks.actions.newList')}
							</button>
							<button
								type='button'
								className='grid h-10 w-10 place-items-center rounded-2xl bg-surface-card text-text-secondary shadow-sm ring-1 ring-border-soft/50 transition hover:bg-surface-subtle hover:text-text-primary'
								aria-label={t('tasks.actions.boardMenu')}
							>
								<FiMoreHorizontal className='h-5 w-5' />
							</button>
						</div>
					</div>
				</div>

				<div className='overflow-x-auto bg-background-subtle p-5 sm:p-7'>
					<div className='flex min-h-[520px] w-max gap-4 pb-3'>
						{board.columns.map(column => {
							const tone = columnToneClasses[column.tone]

							return (
								<div
									key={column.id}
									onDragOver={event => event.preventDefault()}
									onDrop={event => handleColumnDrop(event, column.id)}
									className={`flex max-h-[66vh] w-[290px] shrink-0 flex-col rounded-[22px] border border-border-soft/55 border-t-4 ${tone.top} bg-surface-card shadow-sm ring-1 ring-border-soft/25 sm:w-[320px]`}
								>
									<div className='flex items-center justify-between gap-3 border-b border-border-soft/45 px-4 py-4'>
										<div className='flex min-w-0 items-center gap-2'>
											<h2 className='truncate text-sm font-black text-text-primary'>
												{column.title}
											</h2>
											<span
												className={`rounded-full px-2 py-0.5 text-[11px] font-black ${tone.badge}`}
											>
												{column.cardIds.length}
											</span>
										</div>
										<button
											type='button'
											className='grid h-8 w-8 place-items-center rounded-xl bg-surface-subtle text-text-muted transition hover:bg-surface-muted hover:text-text-primary'
											aria-label={t('tasks.actions.listMenu')}
										>
											<FiMoreHorizontal className='h-4 w-4' />
										</button>
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
													draggable
													onClick={() => openCard(card)}
													onDragStart={event =>
														handleDragStart(event, card.id, column.id)
													}
													onDragEnd={handleDragEnd}
													onDragOver={event => event.preventDefault()}
													onDrop={event => handleCardDrop(event, column, card.id)}
													className={`cursor-grab rounded-2xl bg-surface-subtle/75 p-3 text-left shadow-sm ring-1 ring-border-soft/45 transition hover:-translate-y-0.5 hover:bg-surface-card hover:ring-border-soft/80 active:cursor-grabbing ${
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
													<div className='mt-4 flex items-center justify-between border-t border-border-soft/45 pt-3 text-[11px] font-bold text-text-muted'>
														<div className='flex items-center gap-2'>
															<span className='inline-flex items-center gap-1'>
																<FiClock className='h-3.5 w-3.5' />
																{formatDueDate(
																	card.dueDate,
																	t('tasks.noDueDate'),
																)}
															</span>
														</div>
														<div className='flex items-center gap-2'>
															{card.attachments > 0 ? (
																<span className='inline-flex items-center gap-1'>
																	<FiPaperclip className='h-3.5 w-3.5' />
																	{card.attachments}
																</span>
															) : null}
															{card.assignee ? (
																<span className='grid h-6 w-6 place-items-center rounded-full bg-primary/12 text-[10px] text-text-accent'>
																	{card.assignee}
																</span>
															) : null}
														</div>
													</div>
												</article>
											)
										})}
									</div>

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
								</div>
							)
						})}
					</div>
				</div>
			</section>

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
						className='w-full max-w-lg rounded-[28px] bg-surface-card p-5 text-text-primary shadow-xl ring-1 ring-border-soft/50 sm:p-6'
					>
						<div className='mb-5 flex items-start justify-between gap-4'>
							<div>
								<p className='text-xs font-black uppercase tracking-[0.22em] text-primary'>
									{t('tasks.modal.listEyebrow')}
								</p>
								<h2 className='mt-1 text-xl font-black tracking-[-0.03em] text-text-primary'>
									{t('tasks.modal.listTitle')}
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

						<div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
							<button
								type='button'
								onClick={closeListModal}
								className='inline-flex h-11 items-center justify-center rounded-2xl bg-surface-subtle px-4 text-sm font-black text-text-secondary transition hover:bg-surface-muted hover:text-text-primary'
							>
								{t('common.cancel')}
							</button>
							<button
								type='submit'
								className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground transition hover:bg-primary-accent'
							>
								<FiPlus className='h-4 w-4' />
								{t('tasks.actions.newList')}
							</button>
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
						className='w-full max-w-xl rounded-[28px] bg-surface-card p-5 text-text-primary shadow-xl ring-1 ring-border-soft/50 sm:p-6'
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
									{
										board.columns.find(column => column.id === draftColumnId)
											?.title
									}
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

							<div className='grid gap-3 sm:grid-cols-3'>
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
									<HandmadeDatePicker
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
								className='inline-flex h-11 items-center justify-center rounded-2xl bg-surface-subtle px-4 text-sm font-black text-text-secondary transition hover:bg-surface-muted hover:text-text-primary'
							>
								{t('common.cancel')}
							</button>
							<button
								type='submit'
								className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground transition hover:bg-primary-accent'
							>
								<FiPlus className='h-4 w-4' />
								{t('tasks.actions.addTask')}
							</button>
						</div>
					</form>
				</div>
			) : null}

			{selectedCard ? (
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
						className='w-full max-w-xl rounded-[28px] bg-surface-card p-5 text-text-primary shadow-xl ring-1 ring-border-soft/50 sm:p-6'
					>
						<div className='mb-5 flex items-start justify-between gap-4'>
							<div>
								<p className='text-xs font-black uppercase tracking-[0.22em] text-primary'>
									{t('tasks.modal.eyebrow')}
								</p>
								<h2 className='mt-1 text-xl font-black tracking-[-0.03em] text-text-primary'>
									{t('tasks.modal.title')}
								</h2>
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

							<div className='grid gap-3 sm:grid-cols-3'>
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
									<HandmadeDatePicker
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

						<div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between'>
							<button
								type='button'
								onClick={handleDeleteCard}
								className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-danger-bg px-4 text-sm font-black text-danger transition hover:brightness-95'
							>
								<FiTrash2 className='h-4 w-4' />
								{t('tasks.actions.deleteTask')}
							</button>
							<button
								type='submit'
								className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground transition hover:bg-primary-accent'
							>
								<FiCheckCircle className='h-4 w-4' />
								{t('common.save')}
							</button>
						</div>
					</form>
				</div>
			) : null}
		</PageLayout>
	)
}

export default TasksPage
