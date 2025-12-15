// src/services/supabase/usersWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import type { EventFetchResult } from '../../core/events'
import { getSupabaseClient } from '../../config/supabase'
import { sanitizeForSupabase, getEventArgAsString } from './utils'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'

/**
 * Process all events to ensure users records exist
 * Note: Events are processed in order, use batch upsert for better performance
 * 
 * Important: Although we're only collecting userId here, for consistency, we also reverse the event array
 * Blockchain API returns events with newest first
 */
export const ensureUsersExist = async (
    scope: RuntimeScope,
    fetchResult: EventFetchResult,
) => {
    const userIds = new Set<string>()

    // Reverse event array: blockchain API returns newest first
    const reversedEvents = [...fetchResult.events].reverse()

    // Collect userId from all events (use common utility, correctly handle 0 values)
    for (const event of reversedEvents) {
        const userId = getEventArgAsString(event, 'userId')
        if (userId) {
            userIds.add(userId)
        }
    }

    if (userIds.size === 0) return

    const supabase = getSupabaseClient()
    
    // Batch upsert to avoid multiple queries
    const userRecords = Array.from(userIds).map(userId => ({
        network: scope.network,
        layer: scope.layer,
        id: userId,
    }))
    
    // Sanitize objects to ensure no BigInt
    const sanitizedUserRecords = userRecords.map(record => 
        sanitizeForSupabase(record) as Record<string, unknown>
    )
    
    const { error } = await supabase
        .from('users')
        .upsert(sanitizedUserRecords, {
            onConflict: 'network,layer,id',
        })

    if (error) {
        console.warn(`⚠️  Failed to upsert users:`, error.message)
    }
}

