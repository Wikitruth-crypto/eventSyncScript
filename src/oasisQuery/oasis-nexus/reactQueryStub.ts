export type QueryKey = readonly unknown[] | string | number | symbol | null | undefined

export type QueryFunction<T = unknown, TPageParam = unknown> = (context: {
  queryKey: QueryKey
  pageParam?: TPageParam
  signal?: AbortSignal
}) => Promise<T>

export type UseQueryOptions<TQueryFnData = unknown, TError = unknown, TData = TQueryFnData> = {
  queryKey?: QueryKey
  queryFn?: () => Promise<TQueryFnData>
  enabled?: boolean
  initialData?: TData
  refetchInterval?: number | false
  staleTime?: number
  useErrorBoundary?: boolean
}

export type UseQueryResult<TData = unknown, TError = unknown> = {
  data?: TData
  error?: TError
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  dataUpdatedAt: number
  fetchStatus?: 'idle' | 'fetching' | 'paused'
  isPaused?: boolean
  isFetched?: boolean
  isSuccess?: boolean
  isInitialLoading?: boolean
  status?: 'idle' | 'loading' | 'success' | 'error'
}

export const useQuery = <TQueryFnData = unknown, TError = unknown, TData = TQueryFnData>(
  _options: UseQueryOptions<TQueryFnData, TError, TData>,
): UseQueryResult<TData, TError> => {
  throw new Error('react-query hooks are not supported in this Node runtime build.')
}
