// src/services/supabase/truthNFTWriter.ts
import type { RuntimeContractSyncResult } from '../../core/sync/runtimeContractSyncer'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isSupabaseConfigured } from '../../config/supabase'
import { getSupabaseClient } from '../../config/supabase'
import { getEventArgAsString, sanitizeForSupabase } from './utils'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'

/**
 * Create or update user address record
 * Note: user_addresses table only has basic fields, no other data, use upsert directly
 */
const ensureUserAddressExists = async (
  scope: RuntimeScope,
  address: string,
): Promise<void> => {
  if (!address) return

  const supabase = getSupabaseClient()

  // Use upsert directly, won't error even if already exists
  const addressData = sanitizeForSupabase({
    network: scope.network,
    layer: scope.layer,
    id: address.toLowerCase(),
    is_blacklisted: false,
  }) as Record<string, unknown>

  const { error } = await supabase
    .from('user_addresses')
    .upsert(addressData, {
      onConflict: 'network,layer,id',
    })

  if (error) {
    console.warn(`⚠️  Failed to upsert user address ${address}:`, error.message)
  }
}

/**
 * Handle Transfer event, update boxes table owner_address
 */
const handleTransfer = async (
  scope: RuntimeScope,
  event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
  const tokenId = getEventArgAsString(event, 'tokenId')
  const to = getEventArgAsString(event, 'to')

  if (!tokenId || !to) return

  const supabase = getSupabaseClient()

  // Ensure user address exists
  await ensureUserAddressExists(scope, to)

  // Update boxes table owner_address
  const { error } = await supabase
    .from('boxes')
    .update({ owner_address: to.toLowerCase() })
    .match({ network: scope.network, layer: scope.layer, id: tokenId })

  if (error) {
    console.warn(`⚠️  Failed to update box ${tokenId} owner_address:`, error.message)
  }
}

/**
 * Process TruthNFT contract events and write to Supabase
 */
export const persistTruthNFTSync = async (
  scope: RuntimeScope,
  contract: ContractName,
  syncResult: RuntimeContractSyncResult,
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured, skipping database write')
    return
  }

  if (contract !== ContractName.TRUTH_NFT) return // Only process TruthNFT contract

  // Reverse event array: blockchain API returns newest first, we need oldest first
  // This ensures latest event data is written last, overwriting previous values (e.g., owner_address)
  const reversedEvents = [...syncResult.fetchResult.events].reverse()

  // Process all Transfer events
  for (const event of reversedEvents) {
    if (event.eventName === 'Transfer') {
      await handleTransfer(scope, event)
    }
  }
}

