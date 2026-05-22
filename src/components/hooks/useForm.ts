/**
 * useForm - Custom hook for form state management
 */

import { useState, useCallback, useEffect } from 'react'

export interface UseFormOptions<T> {
	initialValues: T
	validate?: (values: T) => Partial<Record<keyof T, string>>
	onSubmit?: (values: T) => void | Promise<void>
}

export interface UseFormState<T> {
	values: T
	errors: Partial<Record<keyof T, string>>
	touched: Partial<Record<keyof T, boolean>>
	isDirty: boolean
	isSubmitting: boolean
	isValid: boolean
}

export interface UseFormActions<T> {
	setValue: (field: keyof T, value: any) => void
	setValues: (values: Partial<T>) => void
	setError: (field: keyof T, error: string) => void
	setTouched: (field: keyof T, touched: boolean) => void
	reset: () => void
	validate: () => Partial<Record<keyof T, string>>
	handleChange: (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => void
	handleBlur: (
		e: React.FocusEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => void
	handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
}

export function useForm<T extends Record<string, any>>(
	options: UseFormOptions<T>,
): [UseFormState<T>, UseFormActions<T>] {
	const [values, setValuesState] = useState<T>(options.initialValues)
	const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
	const [touched, setTouchedState] = useState<
		Partial<Record<keyof T, boolean>>
	>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	const isDirty =
		Object.keys(options.initialValues).some(
			key => values[key as keyof T] !== options.initialValues[key as keyof T],
		) || Object.keys(touched).length > 0

	const isValid = Object.keys(errors).length === 0

	const validate = useCallback((): Partial<Record<keyof T, string>> => {
		if (!options.validate) return {}
		return options.validate(values)
	}, [values, options.validate])

	const setValue = useCallback((field: keyof T, value: any) => {
		setValuesState(prev => ({ ...prev, [field]: value }))
	}, [])

	const setValues = useCallback((newValues: Partial<T>) => {
		setValuesState(prev => ({ ...prev, ...newValues }))
	}, [])

	const setError = useCallback((field: keyof T, error: string) => {
		setErrors(prev => ({ ...prev, [field]: error }))
	}, [])

	const setTouched = useCallback((field: keyof T, touched: boolean) => {
		setTouchedState(prev => ({ ...prev, [field]: touched }))
	}, [])

	const reset = useCallback(() => {
		setValuesState(options.initialValues)
		setErrors({})
		setTouchedState({})
		setIsSubmitting(false)
	}, [options.initialValues])

	const handleChange = useCallback(
		(
			e: React.ChangeEvent<
				HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
			>,
		) => {
			const { name, value, type } = e.target
			const field = name as keyof T

			let finalValue: any = value
			if (type === 'checkbox') {
				finalValue = (e.target as HTMLInputElement).checked
			} else if (type === 'number') {
				finalValue = value ? Number(value) : ''
			}

			setValue(field, finalValue)
		},
		[setValue],
	)

	const handleBlur = useCallback(
		(
			e: React.FocusEvent<
				HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
			>,
		) => {
			const { name } = e.target
			const field = name as keyof T
			setTouched(field, true)
		},
		[setTouched],
	)

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()

			const formErrors = validate()
			setErrors(formErrors)

			if (Object.keys(formErrors).length === 0) {
				setIsSubmitting(true)
				try {
					await options.onSubmit?.(values)
				} finally {
					setIsSubmitting(false)
				}
			}
		},
		[validate, options, values],
	)

	// Validate on values change
	useEffect(() => {
		const newErrors = validate()
		setErrors(newErrors)
	}, [validate])

	return [
		{
			values,
			errors,
			touched,
			isDirty,
			isSubmitting,
			isValid,
		},
		{
			setValue,
			setValues,
			setError,
			setTouched,
			reset,
			validate,
			handleChange,
			handleBlur,
			handleSubmit,
		},
	]
}
