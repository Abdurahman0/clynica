/**
 * Form - Wrapper component for forms
 */

import React from 'react'
import { FiLoader } from 'react-icons/fi'

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
	onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>
	isSubmitting?: boolean
	submitLabel?: string
	cancelLabel?: string
	onCancel?: () => void
	showActions?: boolean
	children: React.ReactNode
	layout?: 'vertical' | 'grid'
	columns?: number
}

export function Form({
	onSubmit,
	isSubmitting = false,
	submitLabel = 'Submit',
	cancelLabel = 'Cancel',
	onCancel,
	showActions = true,
	children,
	layout = 'vertical',
	columns = 2,
	className = '',
	...props
}: FormProps) {
	return (
		<form
			onSubmit={onSubmit}
			className={`flex flex-col gap-6 ${className}`.trim()}
			{...props}
		>
			{layout === 'grid' ? (
				<div className={`grid gap-4 md:grid-cols-${columns}`}>{children}</div>
			) : (
				<div className='space-y-4'>{children}</div>
			)}

			{showActions && (
				<div className='flex gap-3 pt-2'>
					<button
						type='submit'
						disabled={isSubmitting}
						className={[
							'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold',
							'transition duration-fast',
							isSubmitting
								? 'cursor-not-allowed bg-primary/50 text-primary-foreground'
								: 'bg-primary text-primary-foreground hover:bg-primary-accent',
						].join(' ')}
					>
						{isSubmitting && <FiLoader className='animate-spin' />}
						{submitLabel}
					</button>
					{onCancel && (
						<button
							type='button'
							onClick={onCancel}
							disabled={isSubmitting}
							className={[
								'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold',
								'bg-surface-card text-text-secondary shadow-sm ring-1 ring-border-soft/40',
								'transition duration-fast hover:bg-surface-subtle',
								'disabled:opacity-50',
							].join(' ')}
						>
							{cancelLabel}
						</button>
					)}
				</div>
			)}
		</form>
	)
}
