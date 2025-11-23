import { ContractName } from '../../contractsConfig/types'
import { useRuntimeContractEvents } from '../../oasisQuery/app/hooks/useRuntimeContractEvents'
import type { RuntimeContractEventSource, EventFetchResult } from './types'
import { EVENT_QUERY_CONFIG } from '../../config/sync'

export async function fetchRuntimeContractEvents<TArgs = Record<string, unknown>>(
  source: RuntimeContractEventSource,
): Promise<EventFetchResult<TArgs>> {
  const {
    scope,
    contract,
    eventNames,
    eventFilters,
    limit = EVENT_QUERY_CONFIG.DEFAULT_LIMIT,
    offset = 0,
    batchSize = EVENT_QUERY_CONFIG.DEFAULT_BATCH_SIZE,
    maxPages,
    fromRound,
    toRound,
    fromTimestamp,
    toTimestamp,
    useEvmSignatureFilter = false,
  } = source

  if (!Object.values(ContractName).includes(contract)) {
    throw new Error(`Unsupported contract ${String(contract)}`)
  }

  const result = await useRuntimeContractEvents<TArgs>({
    scope,
    contract,
    limit,
    offset,
    eventNames,
    eventFilters,
    batchSize,
    maxPages,
    fromRound,
    toRound,
    fromTimestamp,
    toTimestamp,
    useEvmSignatureFilter,
  })

  return {
    scope,
    contract,
    events: result.events,
    rawEvents: result.rawEvents,
    contractAddress: result.address,
    pagesFetched: result.pagesFetched,
    totalFetched: result.totalFetched,
    metadata: {
      limit,
      offset,
      eventFilters,
      eventNames,
    },
  }
}
