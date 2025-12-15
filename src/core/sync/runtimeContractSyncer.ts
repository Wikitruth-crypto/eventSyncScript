import type { ContractName } from '../../contractsConfig/types'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'
import { fetchRuntimeContractEvents } from '../events'
import type { EventFetchResult } from '../events/types'
import { getSyncCursor, updateSyncCursor } from '../state'
import type { ContractSyncKey, SyncCursor } from '../state'

export interface RuntimeContractSyncOptions {
  scope: RuntimeScope
  contract: ContractName
  fromRound?: number
  toRound?: number
  limit?: number
  batchSize?: number
  maxPages?: number
  eventNames?: readonly string[]
  eventFilters?: Record<string, string>
}

export interface RuntimeContractSyncResult<TArgs = Record<string, unknown>> {
  cursorBefore: SyncCursor
  cursorAfter: SyncCursor
  fetchResult: EventFetchResult<TArgs>
}

const buildCursorKey = (scope: RuntimeScope, contract: ContractName): ContractSyncKey => ({
  network: scope.network,
  layer: scope.layer,
  contract,
})

const getEventOrderingMetrics = (event: RuntimeEvent) => {
  const round = event.round ?? 0
  const logIndex =
    (event.body as Record<string, unknown> | undefined)?.log_index ??
    event.tx_index ??
    (event.body as Record<string, unknown> | undefined)?.index ??
    0
  const timestamp = event.timestamp
  const eventId = event.tx_hash ?? event.eth_tx_hash ?? event.evm_log_name
  return { round, logIndex: Number(logIndex) || 0, timestamp, eventId }
}

const selectLatestEvent = (events: RuntimeEvent[]) => {
  return events.reduce<RuntimeEvent | undefined>((latest, current) => {
    if (!latest) return current
    const a = getEventOrderingMetrics(latest)
    const b = getEventOrderingMetrics(current)
    if (b.round > a.round) return current
    if (b.round === a.round && b.logIndex > a.logIndex) return current
    return latest
  }, undefined)
}

export const syncRuntimeContractEvents = async <TArgs = Record<string, unknown>>({
  scope,
  contract,
  fromRound,
  toRound,
  limit,
  batchSize,
  maxPages,
  eventNames,
  eventFilters,
}: RuntimeContractSyncOptions): Promise<RuntimeContractSyncResult<TArgs>> => {
  const cursorKey = buildCursorKey(scope, contract)
  const cursor = await getSyncCursor(cursorKey)

  // Determine starting block for query
  // If fromRound is specified, use it; otherwise use last saved block height + 1
  const startRound = fromRound ?? cursor.lastBlock + 1

  const fetchResult = await fetchRuntimeContractEvents<TArgs>({
    scope,
    contract,
    fromRound: startRound,
    toRound,
    limit,
    batchSize,
    maxPages,
    eventNames,
    eventFilters,
    useEvmSignatureFilter: true,
  })

  const latestRawEvent = selectLatestEvent(fetchResult.rawEvents)

  // Update cursor: use the latest event actually processed
  const nextCursor: SyncCursor = latestRawEvent
    ? {
        lastBlock: Math.max(cursor.lastBlock, latestRawEvent.round ?? cursor.lastBlock),
        lastLogIndex: getEventOrderingMetrics(latestRawEvent).logIndex,
        lastTimestamp: latestRawEvent.timestamp,
        lastEventId: getEventOrderingMetrics(latestRawEvent).eventId,
      }
    : cursor

  // Only update cursor if events were actually processed
  if (latestRawEvent) {
    await updateSyncCursor(cursorKey, nextCursor)
  }

  return {
    cursorBefore: cursor, // Return cursor before script started
    cursorAfter: nextCursor, // Return cursor after script finished
    fetchResult,
  }
}
