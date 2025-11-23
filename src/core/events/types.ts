import type { ContractName } from '../../contractsConfig/types'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'

export interface RuntimeContractEventSource {
  scope: RuntimeScope
  contract: ContractName
  eventNames?: readonly string[]
  eventFilters?: Record<string, string>
  limit?: number
  offset?: number
  batchSize?: number
  maxPages?: number
  fromRound?: number
  toRound?: number
  fromTimestamp?: number
  toTimestamp?: number
  useEvmSignatureFilter?: boolean
}

export interface EventFetchResult<TArgs = Record<string, unknown>> {
  scope: RuntimeScope
  contract: ContractName
  events: DecodedRuntimeEvent<TArgs>[]
  rawEvents: RuntimeEvent[]
  contractAddress?: `0x${string}`
  pagesFetched: number
  totalFetched: number
  metadata: {
    limit: number
    offset: number
    eventFilters?: Record<string, string>
    eventNames?: readonly string[]
  }
}
