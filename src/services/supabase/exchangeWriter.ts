// src/services/supabase/exchangeWriter.ts
import type { RuntimeContractSyncResult } from '../../core/sync/runtimeContractSyncer'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isSupabaseConfigured } from '../../config/supabase'
import { ensureUsersExist } from './usersWriter'
import { getSupabaseClient } from '../../config/supabase'
import { getEventArgAsString, sanitizeForSupabase } from './utils'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import { extractTimestamp } from '../../utils/extractTimestamp'

/**
 * Handle BoxListed event
 * Update boxes table: listed_mode, accepted_token, listed_timestamp, seller_id
 */
const handleBoxListed = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')
    const acceptedToken = getEventArgAsString(event, 'acceptedToken')

    if (!boxId || !userId) return

    const supabase = getSupabaseClient()
    const timestamp = extractTimestamp(event)

    const updates: Record<string, unknown> = {
        seller_id: userId,
        listed_timestamp: timestamp,
    }

    if (acceptedToken) {
        updates.accepted_token = acceptedToken.toLowerCase()
    }

    // Determine listed_mode based on current status
    // If status is 'Selling', then listed_mode is 'Selling'
    // If status is 'Auctioning', then listed_mode is 'Auctioning'
    // Here we assume that when BoxListed event is triggered, status has already been updated to 'Selling' or 'Auctioning' via BoxStatusChanged
    // If needed, can query current status here

    const { error } = await supabase
        .from('boxes')
        .update(sanitizeForSupabase(updates) as Record<string, unknown>)
        .match({ network: scope.network, layer: scope.layer, id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for BoxListed:`, error.message)
    }
}

/**
 * Handle BoxPurchased event
 * Update boxes table: buyer_id, purchase_timestamp
 */
const handleBoxPurchased = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')

    if (!boxId || !userId) return

    const supabase = getSupabaseClient()
    const timestamp = extractTimestamp(event)

    const updates = sanitizeForSupabase({
        buyer_id: userId,
        purchase_timestamp: timestamp,
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('boxes')
        .update(updates)
        .match({ network: scope.network, layer: scope.layer, id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for BoxPurchased:`, error.message)
    }
}

/**
 * Handle BidPlaced event
 * Insert into box_bidders table
 * Note: Primary key of box_bidders table is (network, layer, id, bidder_id)
 * Multiple bids from the same bidder for the same box will only keep one record
 * Note: Assumes box already exists (created by TruthBox contract events), if not exists will be handled by database foreign key constraint
 */
const handleBidPlaced = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')
    const timestamp = extractTimestamp(event)

    // Only skip if boxId or userId is undefined (0 is a valid value)
    if (boxId === undefined || userId === undefined) {
        console.warn(`⚠️  BidPlaced event missing boxId or userId:`, { boxId, userId })
        return
    }

    const supabase = getSupabaseClient()

    // Use upsert to handle duplicate bids (ignore on primary key conflict)
    // Note: id and bidder_id need to be string-formatted numbers (PostgreSQL NUMERIC type)
    // Note: Assumes box already exists (created by TruthBox contract events), if not exists will be handled by database foreign key constraint
    const bidderData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: boxId,
        bidder_id: userId,
    }) as Record<string, unknown>

    // First insert bidder record
    const { error: bidderError } = await supabase
        .from('box_bidders')
        .upsert(bidderData, {
            onConflict: 'network,layer,id,bidder_id',
        })

    if (bidderError) {
        // If foreign key constraint error, box doesn't exist
        if (bidderError.code === '23503') {
            console.warn(`⚠️  Box ${boxId} does not exist (foreign key constraint), skipping BidPlaced event for bidder ${userId}`)
            return
        } else {
            console.error(`❌ Failed to upsert bidder ${userId} for box ${boxId}:`, bidderError.message)
            console.error(`   Error details:`, JSON.stringify(bidderError, null, 2))
            console.error(`   Insert data:`, JSON.stringify(bidderData, null, 2))
            return
        }
    }

    // Update box's purchase_timestamp (update when there's a bid)
    const boxUpdates = sanitizeForSupabase({
        purchase_timestamp: timestamp,
    }) as Record<string, unknown>

    const { error: boxUpdateError } = await supabase
        .from('boxes')
        .update(boxUpdates)
        .match({ network: scope.network, layer: scope.layer, id: boxId })

    if (boxUpdateError) {
        console.warn(`⚠️  Failed to update purchase_timestamp for box ${boxId}:`, boxUpdateError.message)
    }
}

/**
 * Handle CompleterAssigned event
 * Update boxes table: completer_id, complete_timestamp
 */
const handleCompleterAssigned = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')

    if (!boxId || !userId) return

    const supabase = getSupabaseClient()
    const timestamp = extractTimestamp(event)

    const updates = sanitizeForSupabase({
        completer_id: userId,
        complete_timestamp: timestamp,
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('boxes')
        .update(updates)
        .match({ network: scope.network, layer: scope.layer, id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for CompleterAssigned:`, error.message)
    }
}

/**
 * Handle RequestDeadlineChanged event
 * Update boxes table: request_refund_deadline
 */
const handleRequestDeadlineChanged = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const deadline = getEventArgAsString(event, 'deadline')

    if (!boxId || !deadline) return

    const supabase = getSupabaseClient()

    const updates = sanitizeForSupabase({
        request_refund_deadline: deadline,
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('boxes')
        .update(updates)
        .match({ network: scope.network, layer: scope.layer, id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for RequestDeadlineChanged:`, error.message)
    }
}

/**
 * Handle ReviewDeadlineChanged event
 * Update boxes table: review_deadline
 */
const handleReviewDeadlineChanged = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const deadline = getEventArgAsString(event, 'deadline')

    if (!boxId || !deadline) return

    const supabase = getSupabaseClient()

    const updates = sanitizeForSupabase({
        review_deadline: deadline,
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('boxes')
        .update(updates)
        .match({ network: scope.network, layer: scope.layer, id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for ReviewDeadlineChanged:`, error.message)
    }
}

/**
 * Handle RefundPermitChanged event
 * Update boxes table: refund_permit
 */
const handleRefundPermitChanged = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    if (!boxId) return

    const supabase = getSupabaseClient()

    // permission is a boolean value, get directly from event args
    const permissionRaw = (event.args as Record<string, unknown>)?.permission
    if (permissionRaw === undefined || permissionRaw === null) return

    // Handle boolean value (could be boolean, number, string)
    let permission: boolean
    if (typeof permissionRaw === 'boolean') {
        permission = permissionRaw
    } else if (typeof permissionRaw === 'number') {
        permission = permissionRaw !== 0
    } else {
        const permissionStr = String(permissionRaw).toLowerCase()
        permission = permissionStr === 'true' || permissionStr === '1'
    }

    const updates = sanitizeForSupabase({
        refund_permit: permission,
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('boxes')
        .update(updates)
        .match({ network: scope.network, layer: scope.layer, id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for RefundPermitChanged:`, error.message)
    }
}

/**
 * Process Exchange contract events and write to Supabase
 */
export const persistExchangeSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    syncResult: RuntimeContractSyncResult,
): Promise<void> => {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured, skipping database write')
        return
    }

    if (contract !== ContractName.EXCHANGE) return // Only process Exchange contract

    // ✅ First ensure users records exist (process userId from all events)
    await ensureUsersExist(scope, syncResult.fetchResult)

    // Reverse event array: blockchain API returns newest first, we need oldest first
    // This ensures latest event data is written last, overwriting previous values
    const reversedEvents = [...syncResult.fetchResult.events].reverse()

    // first stage: handle listed events
    for (const event of reversedEvents) {
        switch (event.eventName) {
            case 'BoxListed':
                await handleBoxListed(scope, event)
                break
        }
    }

    // second stage: handle purchased events
    for (const event of reversedEvents) {
        switch (event.eventName) {
            case 'BoxPurchased':
                await handleBoxPurchased(scope, event)
                break
            case 'BidPlaced':
                await handleBidPlaced(scope, event)
                break
        }
    }
    // third stage: handle assigned events
    for (const event of reversedEvents) {
        switch (event.eventName) {
            case 'CompleterAssigned':
                await handleCompleterAssigned(scope, event)
                break
            case 'RequestDeadlineChanged':
                await handleRequestDeadlineChanged(scope, event)
                break
            case 'ReviewDeadlineChanged':
                await handleReviewDeadlineChanged(scope, event)
                break
            case 'RefundPermitChanged':
                await handleRefundPermitChanged(scope, event)
                break
        }
    }
}

