import axios from 'axios'
import type { GetRuntimeEventsParams } from '../../oasis-nexus/generated/api'
import type { RuntimeEvent } from '../../oasis-nexus/api'
import { buildRuntimeEndpoint } from '../services/nexus/endpoints'
import type { RuntimeScope } from '../../types/searchScope'

export interface UsePaginatedRuntimeEventsParams {
  scope: RuntimeScope
  limit?: number
  offset?: number
  rel?: `0x${string}`
  contractAddress?: `0x${string}`
  runtimeContractAddress?: string
  evmLogSignature?: `0x${string}`
  round?: number
  txIndex?: number
  txHash?: `0x${string}`
  params?: Partial<GetRuntimeEventsParams>
  enabled?: boolean
}

export interface PaginatedRuntimeEventsResult {
  success: boolean
  params: GetRuntimeEventsParams
  events: RuntimeEvent[]
  totalCount?: number
  error?: string
}

const normalizeHex = (value?: `0x${string}` | string) =>
  value ? (value.startsWith('0x') ? (value.slice(2) as `0x${string}`) : (value as `0x${string}`)) : undefined

const buildRequestParams = ({
  limit,
  offset,
  rel,
  contractAddress,
  runtimeContractAddress,
  evmLogSignature,
  round,
  txIndex,
  txHash,
  params = {},
}: UsePaginatedRuntimeEventsParams): GetRuntimeEventsParams => {
  const relParam = rel ?? contractAddress
  const signature = normalizeHex(evmLogSignature)
  const normalizedTxHash = normalizeHex(txHash)

  return {
    limit,
    offset,
    ...(relParam ? { rel: relParam } : {}),
    ...(runtimeContractAddress ? { contract_address: runtimeContractAddress } : {}),
    ...(signature ? { evm_log_signature: signature } : {}),
    ...(typeof round === 'number' ? { block: round } : {}),
    ...(typeof txIndex === 'number' ? { tx_index: txIndex } : {}),
    ...(normalizedTxHash ? { tx_hash: normalizedTxHash } : {}),
    ...params,
  }
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)

export const usePaginatedRuntimeEvents = async (
  input: UsePaginatedRuntimeEventsParams,
): Promise<PaginatedRuntimeEventsResult> => {
  const { scope, enabled = true, limit = 20, offset = 0 } = input
  const requestParams = buildRequestParams({ ...input, limit, offset })

  if (!enabled) {
    return { success: false, events: [], params: requestParams, error: 'Query disabled' }
  }

  try {
    const url = buildRuntimeEndpoint(scope.network, scope.layer, '/events')
    const response = await axios.get(url, { params: requestParams })
    const payload = response.data?.data ?? response.data
    return {
      success: true,
      events: (payload?.events as RuntimeEvent[]) ?? [],
      params: requestParams,
      totalCount: payload?.total_count ?? payload?.count,
    }
  } catch (error) {
    return { success: false, events: [], params: requestParams, error: toErrorMessage(error) }
  }
}
