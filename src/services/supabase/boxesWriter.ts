// src/services/supabase/boxesWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types' // Need to import value, not just type
import type { EventFetchResult } from '../../core/events'
import { getSupabaseClient } from '../../config/supabase'
import { getEventArg } from './eventArgs'
import { sanitizeForSupabase, getEventArgAsString, hasEventArg } from './utils'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import { extractTimestamp } from '../../utils/extractTimestamp'
// import { getProtocolConstants } from '../../contractsConfig/ProtocolConstants'

/**
 * Handle BoxCreated event, create boxes record
 * Supports old contract (two parameters) and new contract (three parameters, includes boxInfoCID)
 * Use upsert to avoid duplicate key errors (update if box already exists)
 */
const handleBoxCreated = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
) => {


    // Use common utility to safely extract event parameters (correctly handle 0 values)
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')
    const boxInfoCID = getEventArgAsString(event, 'boxInfoCID') // New contract includes this parameter

    // Only skip if boxId or userId is undefined (0 is a valid value)
    if (boxId === undefined || userId === undefined) return

    const supabase = getSupabaseClient()

    // Extract timestamp from event
    const createTimestamp = extractTimestamp(event)

    // Create new box record
    // Note: token_id needs to be string-formatted number, cannot use BigInt (cannot serialize)
    // Note: According to supabase.config.ts, box_info_cid is a required field (can be null)
    const boxData: Record<string, unknown> = {
        network: scope.network,
        layer: scope.layer,
        id: boxId,
        token_id: boxId, // PostgreSQL BIGINT can accept string-formatted numbers
        minter_id: userId,
        owner_address: '0x0000000000000000000000000000000000000000', // Default value, will be updated via Transfer event
        status: 'Storing',
        price: '0',
        deadline: '0',
        create_timestamp: createTimestamp, // Required field: creation timestamp
        box_info_cid: null, // Required field, defaults to null
    }

    // If new contract's BoxCreated event contains boxInfoCID, also save it
    if (boxInfoCID) {
        // Sanitize CID (remove ipfs:// prefix)
        const sanitizedCid = boxInfoCID.replace(/^ipfs:\/\//, '')
        boxData.box_info_cid = sanitizedCid
    }

    // Sanitize entire object to ensure no BigInt
    const sanitizedBoxData = sanitizeForSupabase(boxData) as Record<string, unknown>
    
    // Use upsert to avoid duplicate key errors (update if box exists, otherwise insert)
    const { error } = await supabase
        .from('boxes')
        .upsert(sanitizedBoxData, {
            onConflict: 'network,layer,id', // Handle primary key conflict
        })

    if (error) {
        console.warn(`⚠️  Failed to upsert box ${boxId}:`, error.message)
    } else {
        console.log(`✅ Upserted box ${boxId}`)
    }
}

/**
 * Handle other events, update boxes record
 */
const handleBoxUpdate = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
) => {
    // const protocolConstants = getProtocolConstants(scope)

    // Use common utility to safely extract event parameters (correctly handle 0 values)
    const boxId = getEventArgAsString(event, 'boxId')
    // Only skip if boxId is undefined ('0' is a valid value)
    if (boxId === undefined) return

    const supabase = getSupabaseClient()
    const updates: Record<string, unknown> = {}

    switch (event.eventName) {
        case 'BoxStatusChanged':
            const statusRaw = getEventArg<unknown>(event, 'status')
            if (statusRaw !== undefined && statusRaw !== null) {
                const status = typeof statusRaw === 'bigint' ? Number(statusRaw) : Number(statusRaw)
                const statusMap: Record<number, string> = {
                    0: 'Storing',
                    1: 'Selling',
                    2: 'Auctioning',
                    3: 'Paid',
                    4: 'Refunding',
                    5: 'InSecrecy',
                    6: 'Published',
                    7: 'Blacklisted',
                }
                updates.status = statusMap[status] || 'Storing'

                if (status === 1 || status === 2) {
                    updates.listed_mode = statusMap[status]
                }
                if (status === 6) {
                    updates.publish_timestamp = extractTimestamp(event)
                }
            }
            break

        case 'PriceChanged':
            const price = getEventArgAsString(event, 'price')
            if (price !== undefined) {
                updates.price = price
            }
            break

        case 'DeadlineChanged':
            const deadline = getEventArgAsString(event, 'deadline')
            if (deadline !== undefined) {
                updates.deadline = deadline
            } else {
                console.warn(`⚠️  DeadlineChanged event for box ${boxId} has undefined deadline`)
            }
            break

        case 'PrivateKeyPublished':
            const privateKey = getEventArgAsString(event, 'privateKey')
            const userId = getEventArgAsString(event, 'userId')
            if (privateKey !== undefined) {
                updates.private_key = privateKey
                updates.publisher_id = userId
            } else {
                console.warn(`⚠️  PrivateKeyPublished event for box ${boxId} has undefined privateKey`)
            }
            break

        // ... 其他事件处理
    }

    if (Object.keys(updates).length > 0) {
        // Sanitize update object to ensure no BigInt
        const sanitizedUpdates = sanitizeForSupabase(updates) as Record<string, unknown>
        const { error } = await supabase
            .from('boxes')
            .update(sanitizedUpdates)
            .match({ network: scope.network, layer: scope.layer, id: boxId })

        if (error) {
            console.warn(`⚠️  Failed to update box ${boxId} (${event.eventName}):`, error.message)
        } 
    } else {
        console.warn(`⚠️  No updates to apply for box ${boxId} (${event.eventName})`)
    }
}

/**
 * Process all events to ensure boxes records exist
 * Note: Events are processed in order, no need to check if records exist
 * Optimization: Prioritize processing all BoxCreated events first, then process other update events
 * 
 * Important: Blockchain API returns events with newest first, need to reverse array to ensure oldest events are written first,
 * latest events written last, so that the final state in database is correct
 */
export const ensureBoxesExist = async (
    scope: RuntimeScope,
    contract: ContractName,
    fetchResult: EventFetchResult,
) => {
    if (contract !== ContractName.TRUTH_BOX) return // Only process TruthBox contract

    // Reverse event array: blockchain API returns newest first, we need oldest first
    // This ensures latest event data is written last, overwriting previous values
    const reversedEvents = [...fetchResult.events].reverse()

    // First step: Prioritize processing all BoxCreated events (create new records)
    for (const event of reversedEvents) {
        if (event.eventName === 'BoxCreated') {
            const boxId = getEventArgAsString(event, 'boxId')
            if (boxId) {
                await handleBoxCreated(scope, event)
            }
        }
    }

    // Second step: Process other update events (all box records should exist by now)
    for (const event of reversedEvents) {
        if (event.eventName !== 'BoxCreated') {
            const boxId = getEventArgAsString(event, 'boxId')
            if (boxId) {
                await handleBoxUpdate(scope, event)
            }
        }
    }
}