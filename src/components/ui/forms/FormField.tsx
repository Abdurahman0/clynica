/**
 * FormField - Reusable form field component
 */

import React from 'react'

export interface FormFieldProps {
	name: string
	label: string
	type?: string
	value: any
	error?: string
	touched?: boolean
	placeholder?: string
	disabled?: boolean
	required?: boolean
	onChange: (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => void
	onBlur: (
		e: React.FocusEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => void
	children?: React.ReactNode
	className?: string
	helperText?: string
	multiline?: boolean
	rows?: number
	options?: Array<{ label: string; value: string | number }>
	as?: 'input' | 'textarea' | 'select'
}

const inputBaseClassName = [
	'form-field__input--nova w-full rounded-lg border bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
	'placeholder:text-text-muted outline-none transition duration-fast',
	'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
	'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

export const FormField = React.forwardRef<
	HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
	FormFieldProps
>(
	(
		{
			name,
			label,
			type = 'text',
			value,
			error,
			touched,
			placeholder,
			disabled = false,
			required = false,
			onChange,
			onBlur,
			className = '',
			helperText,
			multiline = false,
			rows = 4,
			options,
			as = 'input',
		},
		ref,
	) => {
		const borderColor =
			touched && error ? 'border-red-500' : 'border-border-soft/60'

		let inputComponent

		if (as === 'textarea') {
			inputComponent = (
				<textarea
					ref={ref as any}
					name={name}
					value={value || ''}
					onChange={onChange}
					onBlur={onBlur}
					placeholder={placeholder}
					disabled={disabled}
					rows={rows}
					className={`${inputBaseClassName} ${borderColor} ${className}`.trim()}
				/>
			)
		} else if (as === 'select') {
			inputComponent = (
				<select
					ref={ref as any}
					name={name}
					value={value || ''}
					onChange={onChange}
					onBlur={onBlur}
					disabled={disabled}
					className={`${inputBaseClassName} ${borderColor} ${className}`.trim()}
				>
					<option value=''>-- Select {label.toLowerCase()} --</option>
					{options?.map(opt => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
			)
		} else if (multiline) {
			inputComponent = (
				<textarea
					ref={ref as any}
					name={name}
					value={value || ''}
					onChange={onChange}
					onBlur={onBlur}
					placeholder={placeholder}
					disabled={disabled}
					rows={rows}
					className={`${inputBaseClassName} ${borderColor} ${className}`.trim()}
				/>
			)
		} else {
			inputComponent = (
				<input
					ref={ref as any}
					type={type}
					name={name}
					value={value || ''}
					onChange={onChange}
					onBlur={onBlur}
					placeholder={placeholder}
					disabled={disabled}
					className={`${inputBaseClassName} ${borderColor} ${className}`.trim()}
				/>
			)
		}

		return (
			<div className='form-field--nova flex flex-col gap-2'>
				{label && (
					<label className='text-sm font-semibold text-text-secondary'>
						{label}
						{required && <span className='ml-1 text-red-500'>*</span>}
					</label>
				)}
				{inputComponent}
				{touched && error && (
					<p className='text-xs font-medium text-red-500'>{error}</p>
				)}
				{helperText && !error && (
					<p className='text-xs text-text-muted'>{helperText}</p>
				)}
			</div>
		)
	},
)

FormField.displayName = 'FormField'
