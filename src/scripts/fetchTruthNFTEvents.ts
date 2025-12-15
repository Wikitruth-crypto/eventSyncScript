import { ContractName } from '../contractsConfig/types'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { syncRuntimeContractEvents } from '../core/sync'
import { DEFAULT_SCOPE, EVENT_QUERY_CONFIG } from '../config/sync'
import { persistTruthNFTSync } from '../services/supabase/truthNFTWriter'
import { saveEventDataToFile, shouldSaveEventDataToFile } from '../utils/saveEventDataToFile'
import { decodeContractEvents } from '../utils/decodeEvents'
import { updateSyncStatus } from '../core/state'

export interface FetchTruthNFTEventsResult {
  outputPath: string | null
  block_number: number
}

/**
 * Fetch TruthNFT contract events
 * @param scope - Runtime scope
 * @param lastSyncedBlock - Last synced block height (optional), if not provided, uses contract config's startBlock
 * @param syncToSupabase - Whether to sync to Supabase database
 * @param updateSyncBlock - Whether to update sync status (default true)
 */
export async function fetchTruthNFTEvents(
  scope: RuntimeScope = DEFAULT_SCOPE,
  lastSyncedBlock?: number,
  syncToSupabase: boolean = true,
  updateSyncBlock: boolean = true
): Promise<FetchTruthNFTEventsResult> {
  console.log(`🌐 Querying TruthNFT events: network=${scope.network}, layer=${scope.layer}`)

  const fromRoundOverride = process.env.EVENT_SYNC_FROM_BLOCK
    ? Number(process.env.EVENT_SYNC_FROM_BLOCK)
    : lastSyncedBlock !== undefined
      ? lastSyncedBlock + 1
      : undefined

  const syncResult = await syncRuntimeContractEvents({
    scope,
    contract: ContractName.TRUTH_NFT,
    limit: Number(process.env.EVENT_SYNC_LIMIT ?? EVENT_QUERY_CONFIG.DEFAULT_LIMIT),
    batchSize: Number(process.env.EVENT_SYNC_BATCH_SIZE ?? EVENT_QUERY_CONFIG.DEFAULT_BATCH_SIZE),
    fromRound: fromRoundOverride,
  })

  // Decode events using unified decoding utility function
  const decodedEvents = decodeContractEvents(
    syncResult.fetchResult.rawEvents,
    ContractName.TRUTH_NFT,
    scope,
  )

  console.log(`✅ Fetched ${decodedEvents.length} decoded events (total ${syncResult.fetchResult.totalFetched} raw events, fetched ${syncResult.fetchResult.pagesFetched} pages)`)

  const syncResultWithDecodedEvents = {
    ...syncResult,
    fetchResult: {
      ...syncResult.fetchResult,
      events: decodedEvents,
    },
  }

  // ✅ Write to database
  if(syncToSupabase){
    await persistTruthNFTSync(scope, ContractName.TRUTH_NFT, syncResultWithDecodedEvents)
  }

  let outputPath: string | null = null
  if (shouldSaveEventDataToFile()) {
    outputPath = await saveEventDataToFile(scope, ContractName.TRUTH_NFT, syncResult)
  }

  console.log(`📊 Sync status: from block ${syncResult.cursorBefore.lastBlock} to ${syncResult.cursorAfter.lastBlock}`)

  const block_number = syncResult.cursorAfter.lastBlock

  // Update sync status
  if (updateSyncBlock && syncToSupabase) {
    await updateSyncStatus(scope, ContractName.TRUTH_NFT, block_number)
  }

  return {
    outputPath,
    block_number,
  }
}

