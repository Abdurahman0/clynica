/**
 * useDetail - Custom hook for single item data fetching and management
 */

import { useEffect, useState, useCallback } from 'react'
import type { ServiceError } from '../../services/contracts'

export interface UseDetailOptions {
	autoFetch?: boolean
	refetchInterval?: number
}

export interface UseDetailState<T> {
	data: T | null
	isLoading: boolean
	error: ServiceError | null
	isDirty: boolean
}

export interface UseDetailActions<T> {
	fetch: () => Promise<void>
	update: (item: Partial<T>) => void
	reset: () => void
	setError: (error: ServiceError | null) => void
	setLoading: (loading: boolean) => void
}

export function useDetail<T extends { id?: string } = any>(
	fetcher: () => Promise<T>,
	options?: UseDetailOptions,
): [UseDetailState<T>, UseDetailActions<T>] {
	const [state, setState] = useState<UseDetailState<T>>({
		data: null,
		isLoading: false,
		error: null,
		isDirty: false,
	})

	const [original, setOriginal] = useState<T | null>(null)

	const fetch = useCallback(async () => {
		setState(prev => ({ ...prev, isLoading: true, error: null }))
		try {
			const data = await fetcher()
			setState(prev => ({ ...prev, data, isDirty: false }))
			setOriginal(data)
		} catch (error) {
			setState(prev => ({
				...prev,
				error: error instanceof Error ? (error as any) : null,
			}))
		} finally {
			setState(prev => ({ ...prev, isLoading: false }))
		}
	}, [fetcher])

	const update = useCallback(
		(item: Partial<T>) => {
			setState(prev => ({
				...prev,
				data: prev.data ? { ...prev.data, ...item } : null,
				isDirty:
					original != null &&
					JSON.stringify({ ...original, ...item }) !== JSON.stringify(original),
			}))
		},
		[original],
	)

	const reset = useCallback(() => {
		setState({
			data: original,
			isLoading: false,
			error: null,
			isDirty: false,
		})
	}, [original])

	const setError = useCallback((error: ServiceError | null) => {
		setState(prev => ({ ...prev, error }))
	}, [])

	const setLoading = useCallback((loading: boolean) => {
		setState(prev => ({ ...prev, isLoading: loading }))
	}, [])

	// Auto-fetch on mount
	useEffect(() => {
		if (options?.autoFetch !== false) {
			fetch()
		}
		// Only run once on mount
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Setup refetch interval  
	useEffect(() => {
		if (!options?.refetchInterval) return

		const interval = setInterval(() => {
			fetch()
		}, options.refetchInterval)

		return () => clearInterval(interval)
		// Only depend on interval, not fetch function
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [options?.refetchInterval])

	return [
		state,
		{
			fetch,
			update,
			reset,
			setError,
			setLoading,
		},
	]
}
