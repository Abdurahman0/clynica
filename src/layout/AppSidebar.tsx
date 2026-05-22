import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { navigationConfig } from '../config/navigation'
import AppIcon from '../components/shared/icons/AppIcon'
import { useAuth } from '../auth'

interface AppSidebarProps {
	isOpen: boolean
	onClose: () => void
}

const closeButtonClassName = [
	'inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-surface-card/80 text-text-secondary transition',
	'duration-fast hover:bg-primary/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0',
	'min-[960px]:hidden',
].join(' ')

const groupLabelClassName =
	'mb-2 mt-1 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted/90'

const navLinkBaseClassName = [
	'group block rounded-xl px-3 py-2.5 text-text-secondary no-underline transition duration-fast',
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0',
].join(' ')

const navLinkInactiveClassName = [
	'hover:bg-surface-card/85 hover:text-text-primary',
].join(' ')

const navLinkActiveClassName = [
	'bg-primary/10 text-text-accent shadow-sm ring-1 ring-primary/20',
].join(' ')

function resolveTranslationId(id: string): string {
	if (id === 'chats') {
		return 'chat'
	}

	return id
}

function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
	const { t, i18n } = useTranslation()
	const isRu = i18n.language === 'ru'
	const { canAccessRoute } = useAuth()

	const visibleNavigationGroups = useMemo(
		() =>
			navigationConfig
				.map(group => ({
					...group,
					items: group.items.filter(item => canAccessRoute(item.id)),
				}))
				.filter(group => group.items.length > 0),
		[canAccessRoute],
	)

	return (
		<aside
			className={[
				'fixed inset-y-0 left-0 z-50 flex w-[84vw] max-w-sidebar flex-col overflow-hidden',
				'bg-background-subtle/95 px-3 pb-4 pt-4 text-text-primary shadow-[18px_0_42px_-30px_rgba(25,28,30,0.22)] backdrop-blur-shell transition-transform duration-base',
				isOpen ? 'translate-x-0' : '-translate-x-full',
				'min-[960px]:sticky min-[960px]:top-0 min-[960px]:self-start min-[960px]:h-[100dvh] min-[960px]:w-sidebar min-[960px]:max-w-none min-[960px]:shrink-0 min-[960px]:translate-x-0',
			].join(' ')}
		>
			<div className='flex min-h-topbar items-center justify-between gap-3 py-3'>
				<div className='flex items-center gap-2.5'>
					<span className='inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm'>
						<AppIcon
							name='dashboard'
							className='h-[17px] w-[17px]'
							aria-hidden='true'
						/>
					</span>
					<div>
						<h1 className='m-0 font-display text-[1.36rem] font-extrabold leading-none tracking-[-0.03em]'>
							{t('common.appName')}
						</h1>
						<p className='mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted'>
							CRM
						</p>
					</div>
				</div>
				<button
					type='button'
					className={closeButtonClassName}
					onClick={onClose}
					aria-label={isRu ? 'Навигацияни ёпиш' : 'Navigatsiyani yopish'}
				>
					<AppIcon name='close' className='h-4.5 w-4.5' aria-hidden='true' />
				</button>
			</div>

			<div className='flex-1 overflow-y-auto pr-1 pt-4'>
				{visibleNavigationGroups.map(group => (
					<section key={group.id} className='mt-0 first:mt-0 [&+&]:mt-5'>
						<p className={groupLabelClassName}>
							{t(`navigation.groups.${group.id}`, {
								defaultValue: group.label,
							})}
						</p>
						<nav
							aria-label={t(`navigation.groups.${group.id}`, {
								defaultValue: group.label,
							})}
							className='grid gap-1.5'
						>
							{group.items.map(item => {
								const translationId = resolveTranslationId(item.id)

								return (
									<NavLink
										key={item.id}
										to={item.path}
										end
										className={({ isActive }) =>
											[
												navLinkBaseClassName,
												isActive
													? navLinkActiveClassName
													: navLinkInactiveClassName,
											].join(' ')
										}
									>
										{({ isActive }) => (
											<span className='flex items-center gap-3'>
												<span
													aria-hidden='true'
													className={[
														'relative inline-flex h-9 min-w-9 items-center justify-center rounded-lg transition duration-fast',
														isActive
															? 'bg-primary/20 text-text-accent'
															: 'bg-background-elevated/90 text-text-secondary group-hover:bg-primary/10 group-hover:text-text-primary',
													].join(' ')}
												>
													<AppIcon
														name={item.iconKey}
														className='h-[17px] w-[17px]'
													/>
												</span>
												<span className='grid min-w-0 gap-[3px]'>
													<span className='font-semibold [overflow-wrap:anywhere]'>
														{t(`routes.${translationId}.title`, {
															defaultValue: item.label,
														})}
													</span>
													<small className='text-[11px] tracking-[0.02em] text-text-muted [overflow-wrap:anywhere]'>
														{t(`navigation.captions.${translationId}`, {
															defaultValue: item.label,
														})}
													</small>
												</span>
											</span>
										)}
									</NavLink>
								)
							})}
						</nav>
					</section>
				))}
			</div>
		</aside>
	)
}

export default AppSidebar

