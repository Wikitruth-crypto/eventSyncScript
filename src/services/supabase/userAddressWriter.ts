// src/services/supabase/userIdWriter.ts
import type { RuntimeContractSyncResult } from '../../core/sync/runtimeContractSyncer'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isSupabaseConfigured } from '../../config/supabase'
import { getSupabaseClient } from '../../config/supabase'
import { getEventArgAsString, sanitizeForSupabase } from './utils'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'

/**
 * Handle Blacklist event
 * Update user_addresses table is_blacklisted field
 */
const handleBlacklist = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const user = getEventArgAsString(event, 'user')
    const statusRaw = (event.args as Record<string, unknown>)?.status

    if (!user || statusRaw === undefined || statusRaw === null) return

    const supabase = getSupabaseClient()

    // Handle boolean value
    let isBlacklisted: boolean
    if (typeof statusRaw === 'boolean') {
        isBlacklisted = statusRaw
    } else if (typeof statusRaw === 'number') {
        isBlacklisted = statusRaw !== 0
    } else {
        const statusStr = String(statusRaw).toLowerCase()
        isBlacklisted = statusStr === 'true' || statusStr === '1'
    }

    // First ensure user address exists (use upsert)
    const addressData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: user.toLowerCase(),
        is_blacklisted: isBlacklisted,
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('user_addresses')
        .upsert(addressData, {
            onConflict: 'network,layer,id',
        })

    if (error) {
        console.warn(`⚠️  Failed to update blacklist status for user ${user}:`, error.message)
    }
}

/**
 * Process UserId contract events and write to Supabase
 */
export const persistUserAddressSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    syncResult: RuntimeContractSyncResult,
): Promise<void> => {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured, skipping database write')
        return
    }

    if (contract !== ContractName.USER_ID) return // Only process UserId contract

    // Reverse event array: blockchain API returns newest first, we need oldest first
    // This ensures latest event data is written last, overwriting previous values (e.g., is_blacklisted)
    const reversedEvents = [...syncResult.fetchResult.events].reverse()

    // Process all Blacklist events
    for (const event of reversedEvents) {
        if (event.eventName === 'Blacklist') {
            await handleBlacklist(scope, event)
        }
    }
}

