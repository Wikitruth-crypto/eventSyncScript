import { ContractName } from '../contractsConfig/types'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { syncRuntimeContractEvents } from '../core/sync'
import { DEFAULT_SCOPE, EVENT_QUERY_CONFIG } from '../config/sync'
import { persistTruthBoxSync } from '../services/supabase/truthBoxWriter'
import { saveEventDataToFile, shouldSaveEventDataToFile } from '../utils/saveEventDataToFile'
import { decodeContractEvents } from '../utils/decodeEvents'
import { updateSyncStatus } from '../core/state'

export interface FetchTruthBoxEventsResult {
  outputPath: string | null 
  block_number: number 
}

/**
 * Fetch TruthBox contract events
 * @param scope - Runtime scope
 * @param lastSyncedBlock - Last synced block height (optional), if not provided, uses contract config's startBlock
 * @param syncToSupabase - Whether to sync to Supabase database
 * @param updateSyncBlock - Whether to update sync status (default true)
 * @returns Result containing output path and latest event block height
 */
export async function fetchTruthBoxEvents(
  scope: RuntimeScope = DEFAULT_SCOPE,
  lastSyncedBlock?: number,
  syncToSupabase: boolean = true,
  updateSyncBlock: boolean = true
): Promise<FetchTruthBoxEventsResult> {
  console.log(`🌐 Querying TruthBox: network=${scope.network}, layer=${scope.layer}`)

  // Determine starting block height
  // Priority: environment variable > passed lastSyncedBlock
  const fromRoundOverride = process.env.EVENT_SYNC_FROM_BLOCK
    ? Number(process.env.EVENT_SYNC_FROM_BLOCK)
    : lastSyncedBlock !== undefined
      ? lastSyncedBlock + 1 // Start querying from lastSyncedBlock + 1
      : undefined

  const syncResult = await syncRuntimeContractEvents({
    scope,
    contract: ContractName.TRUTH_BOX,
    limit: Number(process.env.EVENT_SYNC_LIMIT ?? EVENT_QUERY_CONFIG.DEFAULT_LIMIT),
    batchSize: Number(process.env.EVENT_SYNC_BATCH_SIZE ?? EVENT_QUERY_CONFIG.DEFAULT_BATCH_SIZE),
    fromRound: fromRoundOverride,
  })

  // Decode events using unified decoding utility function (does not depend on underlying oasisQuery module's decoding results)
  const decodedEvents = decodeContractEvents(
    syncResult.fetchResult.rawEvents,
    ContractName.TRUTH_BOX,
    scope,
  )

  // console.log("decodedEvents:",decodedEvents)

  console.log(`✅ Fetched ${decodedEvents.length} decoded events (total ${syncResult.fetchResult.totalFetched} raw events, fetched ${syncResult.fetchResult.pagesFetched} pages)`)

  // Create result object containing decoded events
  const syncResultWithDecodedEvents = {
    ...syncResult,
    fetchResult: {
      ...syncResult.fetchResult,
      events: decodedEvents, // Events decoded using unified decoding utility
    },
  }

  // ✅ Write to database and fetch IPFS metadata
  if(syncToSupabase) {
    await persistTruthBoxSync(scope, ContractName.TRUTH_BOX, syncResultWithDecodedEvents)
  }
  // Optional: Save raw event data to file (for debugging)
  // Enable via environment variable EVENT_SYNC_SAVE_JSON=true
  let outputPath: string | null = null
  if (shouldSaveEventDataToFile()) {
    outputPath = await saveEventDataToFile(scope, ContractName.TRUTH_BOX, syncResult)
  }

  console.log(`📊 Sync status: from block ${syncResult.cursorBefore.lastBlock} to ${syncResult.cursorAfter.lastBlock}`)

  // Return latest event block height
  const block_number = syncResult.cursorAfter.lastBlock

  // Update sync status
  if (updateSyncBlock && syncToSupabase) {
    await updateSyncStatus(scope, ContractName.TRUTH_BOX, block_number)
  }

  return {
    outputPath,
    block_number,
  }
}
