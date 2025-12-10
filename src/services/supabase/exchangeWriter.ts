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
 * 处理 BoxListed 事件
 * 更新 boxes 表的 listed_mode, accepted_token, listed_timestamp, seller_id
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

    // 根据当前状态确定 listed_mode
    // 如果 status 是 'Selling'，则 listed_mode 为 'Selling'
    // 如果 status 是 'Auctioning'，则 listed_mode 为 'Auctioning'
    // 这里假设 BoxListed 事件触发时，status 已经通过 BoxStatusChanged 更新为 'Selling' 或 'Auctioning'
    // 如果需要，可以在这里查询当前状态

    const { error } = await supabase
        .from('boxes')
        .update(sanitizeForSupabase(updates) as Record<string, unknown>)
        .match({ network: scope.network, layer: scope.layer, id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for BoxListed:`, error.message)
    }
}

/**
 * 处理 BoxPurchased 事件
 * 更新 boxes 表的 buyer_id, purchase_timestamp
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
 * 处理 BidPlaced 事件
 * 插入 box_bidders 表
 */
const handleBidPlaced = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')

    if (!boxId || !userId) return

    const supabase = getSupabaseClient()

    // 事件按顺序处理，直接插入（如果重复会由数据库约束处理）
    const bidderData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: boxId,
        bidder_id: userId,
    }) as Record<string, unknown>

    const { error } = await supabase.from('box_bidders').insert(bidderData)

    if (error) {
        console.warn(`⚠️  Failed to insert bidder ${userId} for box ${boxId}:`, error.message)
    }
}

/**
 * 处理 CompleterAssigned 事件
 * 更新 boxes 表的 completer_id, complete_timestamp
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
 * 处理 RequestDeadlineChanged 事件
 * 更新 boxes 表的 request_refund_deadline
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
 * 处理 ReviewDeadlineChanged 事件
 * 更新 boxes 表的 review_deadline
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
 * 处理 RefundPermitChanged 事件
 * 更新 boxes 表的 refund_permit
 */
const handleRefundPermitChanged = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    if (!boxId) return

    const supabase = getSupabaseClient()

    // permission 是布尔值，从事件参数中直接获取
    const permissionRaw = (event.args as Record<string, unknown>)?.permission
    if (permissionRaw === undefined || permissionRaw === null) return

    // 处理布尔值（可能是 boolean、number、string）
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
 * 处理 Exchange 合约事件并写入 Supabase
 */
export const persistExchangeSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    syncResult: RuntimeContractSyncResult,
): Promise<void> => {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未配置，跳过数据库写入')
        return
    }

    if (contract !== ContractName.EXCHANGE) return // 只处理 Exchange 合约

    // ✅ 先确保 users 记录存在（处理所有事件中的 userId）
    await ensureUsersExist(scope, syncResult.fetchResult)

    // 反转事件数组：区块链API返回的是最新的在前，我们需要最旧的在前面
    // 这样确保最新的事件数据最后写入，覆盖之前的值
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

