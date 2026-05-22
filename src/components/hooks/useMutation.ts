/**
 * useMutation - Custom hook for create/update/delete operations
 */

import { useState, useCallback } from 'react'
import type { ServiceError } from '../../services/contracts'

export type MutationStatus = 'idle' | 'pending' | 'success' | 'error'

export interface UseMutationState<T> {
	data: T | null
	status: MutationStatus
	error: ServiceError | null
	isLoading: boolean
}

export interface UseMutationActions<TInput, TOutput = TInput> {
	mutate: (input: TInput) => Promise<TOutput | null>
	reset: () => void
	setError: (error: ServiceError | null) => void
}

export function useMutation<TInput, TOutput = TInput>(
	mutator: (input: TInput) => Promise<TOutput>,
): [UseMutationState<TOutput>, UseMutationActions<TInput, TOutput>] {
	const [state, setState] = useState<UseMutationState<TOutput>>({
		data: null,
		status: 'idle',
		error: null,
		isLoading: false,
	})

	const mutate = useCallback(
		async (input: TInput): Promise<TOutput | null> => {
			setState({
				data: null,
				status: 'pending',
				error: null,
				isLoading: true,
			})

			try {
				const result = await mutator(input)
				setState({
					data: result,
					status: 'success',
					error: null,
					isLoading: false,
				})
				return result
			} catch (error) {
				const serviceError = error instanceof Error ? (error as any) : null
				setState({
					data: null,
					status: 'error',
					error: serviceError,
					isLoading: false,
				})
				return null
			}
		},
		[mutator],
	)

	const reset = useCallback(() => {
		setState({
			data: null,
			status: 'idle',
			error: null,
			isLoading: false,
		})
	}, [])

	const setError = useCallback((error: ServiceError | null) => {
		setState(prev => ({
			...prev,
			error,
			status: error ? 'error' : 'idle',
		}))
	}, [])

	return [
		state,
		{
			mutate,
			reset,
			setError,
		},
	]
}
