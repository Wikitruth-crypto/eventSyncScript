import { RuntimeScope } from '../../types/searchScope'
import { ContractName, SupportedChainId } from '../../../contractsConfig/types'
import { NETWORK_CONTRACTS } from '../../../contractsConfig/contracts'
import { getContractEventSignatures } from '../../../contractsConfig/eventSignatures'
import {
  DecodedRuntimeEvent,
  RuntimeEventFormatterConfig,
  decodeRuntimeEvents,
} from '../services/events'
import {
  fetchRuntimeEventsWithFilters,
  RuntimeEventsFetchFilters,
} from '../services/nexus/runtimeAccountFetcher'
import type { RuntimeEvent } from '../../oasis-nexus/api'

interface UseRuntimeContractEventsParams {
  scope: RuntimeScope
  contract: ContractName
  limit?: number
  offset?: number
  eventNames?: readonly string[]
  eventFilters?: Record<string, string>
  enabled?: boolean
  batchSize?: number
  maxPages?: number
  fromRound?: number
  toRound?: number
  fromTimestamp?: number
  toTimestamp?: number
  useEvmSignatureFilter?: boolean
}

export interface RuntimeContractEventsResult<TArgs> {
  address?: `0x${string}`
  events: DecodedRuntimeEvent<TArgs>[]
  pagesFetched: number
  totalFetched: number
  rawEvents: RuntimeEvent[]
}

const networkToChainId: Partial<Record<RuntimeScope['network'], SupportedChainId>> = {
  testnet: SupportedChainId.SAPPHIRE_TESTNET,
  mainnet: SupportedChainId.SAPPHIRE_MAINNET,
}

const resolveContractAddress = (scope: RuntimeScope, contract: ContractName) => {
  const chainId = networkToChainId[scope.network]
  if (!chainId) return undefined
  return NETWORK_CONTRACTS[chainId]?.[contract]?.address
}

const applyEventFilters = <TArgs>(events: DecodedRuntimeEvent<TArgs>[], filters?: Record<string, string>) => {
  if (!filters || Object.keys(filters).length === 0) {
    return events
  }
  return events.filter(event =>
    Object.entries(filters).every(([key, value]) => {
      const argValue = (event.args as Record<string, unknown> | undefined)?.[key]
      return argValue !== undefined && String(argValue) === value
    }),
  )
}

const sliceEvents = <TArgs>(events: DecodedRuntimeEvent<TArgs>[], offset: number, limit: number) => {
  if (!events.length) return events
  const start = Math.max(0, offset)
  const end = Math.max(start, start + limit)
  return events.slice(start, end)
}

export const useRuntimeContractEvents = async <TArgs = Record<string, unknown>>({
  scope,
  contract,
  limit = 50,
  offset = 0,
  eventNames,
  eventFilters,
  enabled = true,
  batchSize = 100,
  maxPages,
  fromRound,
  toRound,
  fromTimestamp,
  toTimestamp,
  useEvmSignatureFilter = false,
}: UseRuntimeContractEventsParams): Promise<RuntimeContractEventsResult<TArgs>> => {
  const contractAddress = resolveContractAddress(scope, contract)
  const signatures = getContractEventSignatures(contract)

  if (!enabled || !contractAddress || !signatures?.length) {
    return { address: contractAddress, events: [], pagesFetched: 0, totalFetched: 0, rawEvents: [] }
  }

  const targetResultCount = Math.max(200, offset + limit)
  const effectiveBatchSize = Math.max(1, Math.min(500, Math.floor(batchSize)))

  const fetchOptions: RuntimeEventsFetchFilters = {
    network: scope.network,
    layer: scope.layer,
    address: contractAddress,
    pageSize: effectiveBatchSize,
    maxPages,
    maxResults: targetResultCount > 0 ? targetResultCount : undefined,
    eventNames,
    eventSignatures: signatures,
    fromRound,
    toRound,
    fromTimestamp,
    toTimestamp,
    useEvmSignatureFilter,
  }

  const fetchResult = await fetchRuntimeEventsWithFilters(fetchOptions, console)
  const formatterConfig: RuntimeEventFormatterConfig = {
    contractAddress,
    eventSignatures: signatures,
    allowEvents: eventNames,
  }
  const decoded = decodeRuntimeEvents<TArgs>(fetchResult.events ?? [], formatterConfig)
  const filtered = applyEventFilters(decoded, eventFilters)
  const sliced = sliceEvents(filtered, offset, limit)

  return {
    address: contractAddress,
    events: sliced,
    pagesFetched: fetchResult.pagesFetched ?? 0,
    totalFetched: filtered.length,
    rawEvents: fetchResult.events ?? [],
  }
}
