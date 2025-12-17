// src/services/supabase/fundManagerWriter.ts
import type { RuntimeContractSyncResult } from '../../core/sync/runtimeContractSyncer'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isSupabaseConfigured } from '../../config/supabase'
import { ensureUsersExist } from './usersWriter'
import { getSupabaseClient } from '../../config/supabase'
import { getEventArgAsString, sanitizeForSupabase } from './utils'
import { getEventArg } from './eventArgs'
import { normalizeHash } from './eventArgs'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import { extractTimestamp } from '../../utils/extractTimestamp'

/**
 * Generate record ID: transaction_hash-log_index
 */
const generateRecordId = (event: DecodedRuntimeEvent<Record<string, unknown>>): string => {
    const txHash = normalizeHash(event.raw.tx_hash ?? event.raw.eth_tx_hash)
    const logIndex = (event.raw.body as Record<string, unknown>)?.log_index ?? event.raw.tx_index ?? 0
    
    // Use the data
    const data = event.raw.body?.data as string | undefined
    const dataHash = data ? data.slice(-8) : 'unknown'
    
    return `${txHash}-${logIndex}-${dataHash}`
}

/**
 * Convert transaction hash to BYTEA
 */
const hashToBytea = (hash: string): Uint8Array => {
    // Remove 0x prefix
    const hex = hash.startsWith('0x') ? hash.slice(2) : hash
    // Convert to Uint8Array
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
    }
    return bytes
}

/**
 * Handle OrderAmountPaid event
 * Insert into payments table
 */
const handleOrderAmountPaid = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')
    const token = getEventArgAsString(event, 'token')
    const amount = getEventArgAsString(event, 'amount')

    if (!boxId || !userId || !token || !amount) return

    const supabase = getSupabaseClient()
    const timestamp = extractTimestamp(event)
    const recordId = generateRecordId(event)
    const txHash = normalizeHash(event.raw.tx_hash ?? event.raw.eth_tx_hash)
    const blockNumber = event.raw.round ?? 0

    if (!txHash) return

    const paymentData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: recordId,
        box_id: boxId,
        user_id: userId,
        token: token.toLowerCase(),
        amount: amount,
        timestamp: timestamp,
        transaction_hash: hashToBytea(txHash),
        block_number: String(blockNumber),
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('payments')
        .upsert(paymentData, {
            onConflict: 'network,layer,id'
        })

    if (error) {
        console.error(`❌ Failed to insert payment for box ${boxId}:`, error.message)
        console.error(`   Error info:`, JSON.stringify(error, null, 2))
    }
}

/**
 * Handle OrderAmountWithdraw event
 * Insert into withdraw table
 */
const handleOrderAmountWithdraw = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const listRaw = getEventArg<unknown>(event, 'list')
    const token = getEventArgAsString(event, 'token')
    const userId = getEventArgAsString(event, 'userId')
    const amount = getEventArgAsString(event, 'amount')
    const fundsTypeRaw = getEventArg<unknown>(event, 'fundsType')

    if (!listRaw || !token || !userId || !amount || fundsTypeRaw === undefined) return

    // list 是 uint256[] 数组
    const boxList = Array.isArray(listRaw)
        ? listRaw.map(item => String(item))
        : [String(listRaw)]

    // fundsType is uint8，0 = Order, 1 = Refund
    const fundsType = typeof fundsTypeRaw === 'bigint' ? Number(fundsTypeRaw) : Number(fundsTypeRaw)
    const withdrawType = fundsType === 0 ? 'Order' : 'Refund'

    const supabase = getSupabaseClient()
    const timestamp = extractTimestamp(event)
    const recordId = generateRecordId(event)
    const txHash = normalizeHash(event.raw.tx_hash ?? event.raw.eth_tx_hash)
    const blockNumber = event.raw.round ?? 0

    if (!txHash) return

    const withdrawData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: recordId,
        token: token.toLowerCase(),
        box_list: boxList,
        user_id: userId,
        amount: amount,
        timestamp: timestamp,
        withdraw_type: withdrawType,
        transaction_hash: hashToBytea(txHash),
        block_number: String(blockNumber),
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('withdraws')
        .upsert(withdrawData, {
            onConflict: 'network,layer,id'
        })

    if (error) {
        console.error(`❌ Failed to insert withdraw for user ${userId} (${withdrawType}):`, error.message)
        console.error(`   Error info:`, JSON.stringify(error, null, 2))
    }
}
/**
 * Handle RewardsAdded event
 * Insert into rewards_addeds table
 */
const handleRewardsAdded = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const token = getEventArgAsString(event, 'token')
    const amount = getEventArgAsString(event, 'amount')
    const rewardTypeRaw = getEventArg<unknown>(event, 'rewardType')

    if (!boxId || !token || !amount || rewardTypeRaw === undefined) return

    const rewardTypeNum = typeof rewardTypeRaw === 'bigint' ? Number(rewardTypeRaw) : Number(rewardTypeRaw)
    console.log ('reward_uint8:',rewardTypeNum)
    const rewardTypeMap: Record<number, 'Minter' | 'Seller' | 'Completer' | 'Total'> = {
        0: 'Minter',
        1: 'Seller',
        2: 'Completer',
        3: 'Total',
    }
    let rewardType
    if (rewardTypeNum === 0) {
        rewardType = 'Minter'
    } else {
        rewardType = rewardTypeMap[rewardTypeNum] || 'Total'
    }

    const supabase = getSupabaseClient()
    const timestamp = extractTimestamp(event)
    const recordId = generateRecordId(event)
    const txHash = normalizeHash(event.raw.tx_hash ?? event.raw.eth_tx_hash)
    const blockNumber = event.raw.round ?? 0

    if (!txHash) return

    const rewardData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: recordId,
        box_id: boxId,
        token: token.toLowerCase(),
        amount: amount,
        reward_type: rewardType,
        timestamp: timestamp,
        transaction_hash: hashToBytea(txHash),
        block_number: String(blockNumber),
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('rewards_addeds')
        .upsert(rewardData, {
            onConflict: 'network,layer,id'
        })

    if (error) {
        console.error(`❌ Failed to insert reward for box ${boxId} (${rewardType}):`, error.message)
        console.error(`   Error info:`, JSON.stringify(error, null, 2))
    }
}


/**
 * Handle HelperRewrdsWithdraw event
 * Insert into withdraws table (withdraw_type: 'Helper')
 */
const handleHelperRewardsWithdraw = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const userId = getEventArgAsString(event, 'userId')
    const token = getEventArgAsString(event, 'token')
    const amount = getEventArgAsString(event, 'amount')

    if (!userId || !token || !amount) return

    const supabase = getSupabaseClient()
    const timestamp = extractTimestamp(event)
    const recordId = generateRecordId(event)
    const txHash = normalizeHash(event.raw.tx_hash ?? event.raw.eth_tx_hash)
    const blockNumber = event.raw.round ?? 0

    if (!txHash) return

    const withdrawData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: recordId,
        token: token.toLowerCase(),
        box_list: [], // Helper and Minter is not list
        user_id: userId,
        amount: amount,
        timestamp: timestamp,
        withdraw_type: 'Helper',
        transaction_hash: hashToBytea(txHash),
        block_number: String(blockNumber),
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('withdraws')
        .upsert(withdrawData, {
            onConflict: 'network,layer,id'
        })

    if (error) {
        console.error(`❌ Failed to insert helper reward withdraw for user ${userId}:`, error.message)
        console.error(`   Error info:`, JSON.stringify(error, null, 2))
    }
}


/**
 * Handle MinterRewardsWithdraw event
 * Insert into withdraws table (withdraw_type: 'Minter')
 */
const handleMinterRewardsWithdraw = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const userId = getEventArgAsString(event, 'userId')
    const token = getEventArgAsString(event, 'token')
    const amount = getEventArgAsString(event, 'amount')

    if (!userId || !token || !amount) return

    const supabase = getSupabaseClient()
    const timestamp = extractTimestamp(event)
    const recordId = generateRecordId(event)
    const txHash = normalizeHash(event.raw.tx_hash ?? event.raw.eth_tx_hash)
    const blockNumber = event.raw.round ?? 0

    if (!txHash) return

    const withdrawData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: recordId,
        token: token.toLowerCase(),
        box_list: [], 
        user_id: userId,
        amount: amount,
        timestamp: timestamp,
        withdraw_type: 'Minter',
        transaction_hash: hashToBytea(txHash),
        block_number: String(blockNumber),
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('withdraws')
        .upsert(withdrawData, {
            onConflict: 'network,layer,id'
        })

    if (error) {
        console.error(`❌ Failed to insert minter reward withdraw for user ${userId}:`, error.message)
        console.error(`   Error info:`, JSON.stringify(error, null, 2))
    }
}

/**
 * Ensure fund_manager_state record exists
 * This is required by token_total_amounts table foreign key constraint
 */
const ensureFundManagerStateExists = async (scope: RuntimeScope): Promise<void> => {
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
        .from('fund_manager_state')
        .upsert(
            {
                network: scope.network,
                layer: scope.layer,
                id: 'fundManager',
            },
            {
                onConflict: 'network,layer,id',
            }
        )

    if (error) {
        console.warn(`⚠️  Failed to ensure fund_manager_state exists:`, error.message)
    }
}

/**
 * Process FundManager contract events and write to Supabase
 */
export const persistFundManagerSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    syncResult: RuntimeContractSyncResult,
): Promise<void> => {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured, skipping database write')
        return
    }

    if (contract !== ContractName.FUND_MANAGER) return // Only process FundManager contract

    // ✅ First ensure fund_manager_state record exists (required by payments trigger)
    await ensureFundManagerStateExists(scope)

    // ✅ Then ensure users records exist
    await ensureUsersExist(scope, syncResult.fetchResult)

    // Reverse event array: blockchain API returns newest first, we need oldest first
    // This ensures latest event data is written last, overwriting previous values
    const reversedEvents = [...syncResult.fetchResult.events].reverse()

    // first stage: handle payment and reward added events
    for (const event of reversedEvents) {
        switch (event.eventName) {
            case 'OrderAmountPaid':
                await handleOrderAmountPaid(scope, event)
                break
            case 'RewardsAdded':
                await handleRewardsAdded(scope, event)
                break
        }
    }
    // second stage: handle withdraw events
    for (const event of reversedEvents) {
        switch (event.eventName) {
            case 'OrderAmountWithdraw':
                await handleOrderAmountWithdraw(scope, event)
                break
            case 'HelperRewrdsWithdraw':
                await handleHelperRewardsWithdraw(scope, event)
                break
            case 'MinterRewardsWithdraw':
                await handleMinterRewardsWithdraw(scope, event)
                break
        }
    }
}

