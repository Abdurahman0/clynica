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
	FiUser,
	FiX,
} from 'react-icons/fi'
import { PageLayout } from '../../../components/shared/page'

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
		badge: 'bg-[#2563eb]/15 text-[#93c5fd]',
		add: 'hover:bg-[#2563eb]/10 hover:text-[#93c5fd]',
	},
	cyan: {
		top: 'border-t-[#06b6d4]',
		badge: 'bg-[#06b6d4]/15 text-[#67e8f9]',
		add: 'hover:bg-[#06b6d4]/10 hover:text-[#67e8f9]',
	},
	green: {
		top: 'border-t-[#22c55e]',
		badge: 'bg-[#22c55e]/15 text-[#86efac]',
		add: 'hover:bg-[#22c55e]/10 hover:text-[#86efac]',
	},
	amber: {
		top: 'border-t-[#f59e0b]',
		badge: 'bg-[#f59e0b]/15 text-[#fcd34d]',
		add: 'hover:bg-[#f59e0b]/10 hover:text-[#fcd34d]',
	},
	rose: {
		top: 'border-t-[#ef4444]',
		badge: 'bg-[#ef4444]/15 text-[#fca5a5]',
		add: 'hover:bg-[#ef4444]/10 hover:text-[#fca5a5]',
	},
}

const priorityClasses: Record<TaskPriority, string> = {
	low: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
	medium: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
	high: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
	urgent: 'border-rose-400/40 bg-rose-400/10 text-rose-200',
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
	const { t } = useTranslation()
	const initialBoard = useMemo(() => createInitialBoard(t), [t])
	const [board, setBoard] = useState<TaskBoard>(() => readStoredBoard() ?? initialBoard)
	const [draftColumnId, setDraftColumnId] = useState<string | null>(null)
	const [draftTitle, setDraftTitle] = useState('')
	const [newListTitle, setNewListTitle] = useState('')
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

	const handleAddTask = (event: FormEvent<HTMLFormElement>, columnId: string) => {
		event.preventDefault()
		const title = draftTitle.trim()
		if (!title) {
			return
		}

		const cardId = createId('task')
		const card: TaskCard = {
			id: cardId,
			title,
			description: '',
			priority: 'medium',
			assignee: '',
			dueDate: '',
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
		setDraftTitle('')
		setDraftColumnId(null)
	}

	const handleAddList = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const title = newListTitle.trim()
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
					tone: toneCycle[current.columns.length % toneCycle.length],
					cardIds: [],
				},
			],
		}))
		setNewListTitle('')
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
			<section className='overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0f16] text-white shadow-[0_28px_80px_rgba(0,0,0,0.32)]'>
				<div className='relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(37,99,235,0.26),transparent_34%),linear-gradient(135deg,#111827_0%,#151923_52%,#101117_100%)] px-5 py-5 sm:px-8 sm:py-7'>
					<div className='absolute right-0 top-0 h-32 w-72 rounded-full bg-primary/10 blur-3xl' />
					<div className='relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between'>
						<div className='flex min-w-0 items-start gap-4'>
							<div className='grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-lg font-black shadow-inner'>
								RC
							</div>
							<div className='min-w-0'>
								<p className='mb-1 text-xs font-bold uppercase tracking-[0.28em] text-white/45'>
									{t('tasks.eyebrow')}
								</p>
								<h1 className='truncate font-display text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl'>
									{t('tasks.title')}
								</h1>
								<p className='mt-2 max-w-3xl text-sm leading-6 text-white/62'>
									{t('tasks.subtitle')}
								</p>
							</div>
						</div>

						<div className='flex flex-wrap items-center gap-2 text-xs font-bold text-white/80'>
							<span className='rounded-full border border-white/10 bg-white/10 px-3 py-2'>
								{t('tasks.stats.lists')}:{' '}
								{board.columns.length}
							</span>
							<span className='rounded-full border border-white/10 bg-white/10 px-3 py-2'>
								{t('tasks.stats.tasks')}: {totalCards}
							</span>
							<span className='rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-emerald-100'>
								{t('tasks.stats.done')}: {completedCards}
							</span>
							<button
								type='button'
								className='grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10'
								aria-label={t('tasks.actions.boardMenu')}
							>
								<FiMoreHorizontal className='h-5 w-5' />
							</button>
						</div>
					</div>
				</div>

				<div className='border-b border-white/10 bg-[#11141c]/95 px-5 py-4 sm:px-8'>
					<div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
						<div className='flex flex-wrap items-center gap-3'>
							<div className='rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(37,99,235,0.28)]'>
								{t('tasks.boardName')}
							</div>
							<div className='h-8 w-px bg-white/10' />
							<div className='flex items-center gap-2'>
								<span className='text-xs font-bold uppercase tracking-[0.22em] text-white/38'>
									{t('tasks.members')}
								</span>
								<div className='flex -space-x-2'>
									{['AR', 'MK', 'SA'].map(member => (
										<span
											key={member}
											className='grid h-8 w-8 place-items-center rounded-full border-2 border-[#11141c] bg-gradient-to-br from-primary/90 to-rose-500/80 text-[10px] font-black text-white'
										>
											{member}
										</span>
									))}
								</div>
							</div>
						</div>

						<form
							onSubmit={handleAddList}
							className='flex w-full flex-col gap-2 sm:flex-row lg:w-auto'
						>
							<input
								value={newListTitle}
								onChange={event => setNewListTitle(event.target.value)}
								placeholder={t('tasks.placeholders.newList')}
								className='min-h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/32 focus:border-primary/60 focus:bg-white/[0.07]'
							/>
							<button
								type='submit'
								className='inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15'
							>
								<FiPlus className='h-4 w-4' />
								{t('tasks.actions.newList')}
							</button>
						</form>
					</div>
				</div>

				<div className='overflow-x-auto bg-[#0c0d13] p-5 [scrollbar-color:rgba(255,255,255,0.34)_rgba(255,255,255,0.05)] sm:p-7'>
					<div className='flex min-h-[520px] w-max gap-4 pb-3'>
						{board.columns.map(column => {
							const tone = columnToneClasses[column.tone]

							return (
								<div
									key={column.id}
									onDragOver={event => event.preventDefault()}
									onDrop={event => handleColumnDrop(event, column.id)}
									className={`flex max-h-[66vh] w-[290px] shrink-0 flex-col rounded-[22px] border border-white/10 border-t-4 ${tone.top} bg-[#17181f]/94 shadow-[0_18px_44px_rgba(0,0,0,0.24)] sm:w-[320px]`}
								>
									<div className='flex items-center justify-between gap-3 border-b border-white/8 px-4 py-4'>
										<div className='flex min-w-0 items-center gap-2'>
											<h2 className='truncate text-sm font-black text-white'>
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
											className='grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/55 transition hover:bg-white/10 hover:text-white'
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
													className={`cursor-grab rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-3 text-left shadow-[0_14px_32px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.075] active:cursor-grabbing ${
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
													<h3 className='line-clamp-3 text-sm font-black leading-5 text-white'>
														{card.title}
													</h3>
													{card.description ? (
														<p className='mt-2 line-clamp-2 text-xs leading-5 text-white/48'>
															{card.description}
														</p>
													) : null}
													<div className='mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-[11px] font-bold text-white/45'>
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
																<span className='grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[10px] text-white'>
																	{card.assignee}
																</span>
															) : null}
														</div>
													</div>
												</article>
											)
										})}
									</div>

									<div className='mt-auto border-t border-white/8 p-3'>
										{draftColumnId === column.id ? (
											<form
												onSubmit={event => handleAddTask(event, column.id)}
												className='grid gap-2'
											>
												<textarea
													value={draftTitle}
													onChange={event => setDraftTitle(event.target.value)}
													placeholder={t('tasks.placeholders.taskTitle')}
													rows={3}
													autoFocus
													className='resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/32 focus:border-primary/60 focus:bg-white/[0.07]'
												/>
												<div className='flex gap-2'>
													<button
														type='submit'
														className='inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-primary px-3 text-xs font-black text-white transition hover:bg-primary-hover'
													>
														{t('tasks.actions.addTask')}
													</button>
													<button
														type='button'
														onClick={() => {
															setDraftColumnId(null)
															setDraftTitle('')
														}}
														className='grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white'
														aria-label={t('common.cancel')}
													>
														<FiX className='h-4 w-4' />
													</button>
												</div>
											</form>
										) : (
											<button
												type='button'
												onClick={() => setDraftColumnId(column.id)}
												className={`inline-flex h-11 w-full items-center gap-2 rounded-2xl px-3 text-sm font-bold text-white/52 transition ${tone.add}`}
											>
												<FiPlus className='h-4 w-4' />
												{t('tasks.actions.addTask')}
											</button>
										)}
									</div>
								</div>
							)
						})}
					</div>
				</div>
			</section>

			{selectedCard ? (
				<div
					className='fixed inset-0 z-[900] flex items-end bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6'
					onMouseDown={event => {
						if (event.target === event.currentTarget) {
							closeCard()
						}
					}}
				>
					<form
						onSubmit={handleSaveCard}
						className='w-full max-w-xl rounded-[28px] border border-white/12 bg-[#11141c] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.42)] sm:p-6'
					>
						<div className='mb-5 flex items-start justify-between gap-4'>
							<div>
								<p className='text-xs font-black uppercase tracking-[0.22em] text-primary'>
									{t('tasks.modal.eyebrow')}
								</p>
								<h2 className='mt-1 text-xl font-black tracking-[-0.03em] text-white'>
									{t('tasks.modal.title')}
								</h2>
							</div>
							<button
								type='button'
								onClick={closeCard}
								className='grid h-10 w-10 place-items-center rounded-2xl border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white'
								aria-label={t('common.cancel')}
							>
								<FiX className='h-5 w-5' />
							</button>
						</div>

						<div className='grid gap-3'>
							<label className='grid gap-1.5'>
								<span className='text-[11px] font-black uppercase tracking-[0.16em] text-white/42'>
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
									className='min-h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white outline-none transition focus:border-primary/60 focus:bg-white/[0.07]'
								/>
							</label>

							<label className='grid gap-1.5'>
								<span className='text-[11px] font-black uppercase tracking-[0.16em] text-white/42'>
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
									className='resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-primary/60 focus:bg-white/[0.07]'
								/>
							</label>

							<div className='grid gap-3 sm:grid-cols-3'>
								<label className='grid gap-1.5'>
									<span className='text-[11px] font-black uppercase tracking-[0.16em] text-white/42'>
										{t('tasks.fields.priority')}
									</span>
									<select
										value={editDraft.priority}
										onChange={event =>
											setEditDraft(current => ({
												...current,
												priority: event.target.value as TaskPriority,
											}))
										}
										className='min-h-12 rounded-2xl border border-white/10 bg-[#151923] px-4 text-sm font-semibold text-white outline-none transition focus:border-primary/60'
									>
										{(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(
											priority => (
												<option key={priority} value={priority}>
													{t(`tasks.priorities.${priority}`)}
												</option>
											),
										)}
									</select>
								</label>

								<label className='grid gap-1.5'>
									<span className='text-[11px] font-black uppercase tracking-[0.16em] text-white/42'>
										{t('tasks.fields.assignee')}
									</span>
									<div className='relative'>
										<FiUser className='pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35' />
										<input
											value={editDraft.assignee}
											onChange={event =>
												setEditDraft(current => ({
													...current,
													assignee: event.target.value,
												}))
											}
											maxLength={3}
											className='min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 pl-10 text-sm font-semibold uppercase text-white outline-none transition focus:border-primary/60 focus:bg-white/[0.07]'
										/>
									</div>
								</label>

								<label className='grid gap-1.5'>
									<span className='text-[11px] font-black uppercase tracking-[0.16em] text-white/42'>
										{t('tasks.fields.dueDate')}
									</span>
									<input
										type='date'
										value={editDraft.dueDate}
										onChange={event =>
											setEditDraft(current => ({
												...current,
												dueDate: event.target.value,
											}))
										}
										className='min-h-12 rounded-2xl border border-white/10 bg-[#151923] px-4 text-sm font-semibold text-white outline-none transition focus:border-primary/60'
									/>
								</label>
							</div>
						</div>

						<div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between'>
							<button
								type='button'
								onClick={handleDeleteCard}
								className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 text-sm font-black text-rose-100 transition hover:bg-rose-400/18'
							>
								<FiTrash2 className='h-4 w-4' />
								{t('tasks.actions.deleteTask')}
							</button>
							<button
								type='submit'
								className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white transition hover:bg-primary-hover'
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
