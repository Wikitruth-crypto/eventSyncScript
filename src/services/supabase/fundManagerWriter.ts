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
 * 生成记录 ID：transaction_hash-log_index
 */
const generateRecordId = (event: DecodedRuntimeEvent<Record<string, unknown>>): string => {
    const txHash = normalizeHash(event.raw.tx_hash ?? event.raw.eth_tx_hash)
    const logIndex = (event.raw.body as Record<string, unknown>)?.log_index ?? event.raw.tx_index ?? 0
    return `${txHash}-${logIndex}`
}

/**
 * 将交易哈希转换为 BYTEA
 */
const hashToBytea = (hash: string): Uint8Array => {
    // 移除 0x 前缀
    const hex = hash.startsWith('0x') ? hash.slice(2) : hash
    // 转换为 Uint8Array
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
    }
    return bytes
}

/**
 * 处理 OrderAmountPaid 事件
 * 插入 payments 表
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

    const { error } = await supabase.from('payments').insert(paymentData)

    if (error) {
        console.warn(`⚠️  Failed to insert payment for box ${boxId}:`, error.message)
    }
}

/**
 * 处理 OrderAmountWithdraw 事件
 * 插入 withdraws 表（withdraw_type: 'Order'）
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

    // fundsType 是 uint8，0 = Order, 1 = Refund
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

    const { error } = await supabase.from('withdraws').insert(withdrawData)

    if (error) {
        console.warn(`⚠️  Failed to insert withdraw for user ${userId}:`, error.message)
    }
}

/**
 * 处理 RewardAmountAdded 事件
 * 插入 rewards_addeds 表
 */
const handleRewardAmountAdded = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const token = getEventArgAsString(event, 'token')
    const amount = getEventArgAsString(event, 'amount')
    const rewardTypeRaw = getEventArg<unknown>(event, 'rewardType')

    if (!boxId || !token || !amount || rewardTypeRaw === undefined) return

    // rewardType 是 uint8，需要映射到字符串
    const rewardTypeNum = typeof rewardTypeRaw === 'bigint' ? Number(rewardTypeRaw) : Number(rewardTypeRaw)
    const rewardTypeMap: Record<number, 'Minter' | 'Seller' | 'Completer' | 'Total'> = {
        0: 'Minter',
        1: 'Seller',
        2: 'Completer',
        3: 'Total',
    }
    const rewardType = rewardTypeMap[rewardTypeNum] || 'Total'

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

    const { error } = await supabase.from('rewards_addeds').insert(rewardData)

    if (error) {
        console.warn(`⚠️  Failed to insert reward for box ${boxId}:`, error.message)
    }
}

/**
 * 处理 HelperRewrdsWithdraw 事件
 * 插入 withdraws 表（withdraw_type: 'Helper'）
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
        box_list: [], // Helper 和 Minter 奖励提取不涉及 box
        user_id: userId,
        amount: amount,
        timestamp: timestamp,
        withdraw_type: 'Helper',
        transaction_hash: hashToBytea(txHash),
        block_number: String(blockNumber),
    }) as Record<string, unknown>

    const { error } = await supabase.from('withdraws').insert(withdrawData)

    if (error) {
        console.warn(`⚠️  Failed to insert helper reward withdraw for user ${userId}:`, error.message)
    }
}

/**
 * 处理 MinterRewardsWithdraw 事件
 * 插入 withdraws 表（withdraw_type: 'Minter'）
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
        box_list: [], // Helper 和 Minter 奖励提取不涉及 box
        user_id: userId,
        amount: amount,
        timestamp: timestamp,
        withdraw_type: 'Minter',
        transaction_hash: hashToBytea(txHash),
        block_number: String(blockNumber),
    }) as Record<string, unknown>

    const { error } = await supabase.from('withdraws').insert(withdrawData)

    if (error) {
        console.warn(`⚠️  Failed to insert minter reward withdraw for user ${userId}:`, error.message)
    }
}

/**
 * 处理 FundManager 合约事件并写入 Supabase
 */
export const persistFundManagerSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    syncResult: RuntimeContractSyncResult,
): Promise<void> => {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未配置，跳过数据库写入')
        return
    }

    if (contract !== ContractName.FUND_MANAGER) return // 只处理 FundManager 合约

    // ✅ 先确保 users 记录存在
    await ensureUsersExist(scope, syncResult.fetchResult)

    // 反转事件数组：区块链API返回的是最新的在前，我们需要最旧的在前面
    // 这样确保最新的事件数据最后写入，覆盖之前的值
    const reversedEvents = [...syncResult.fetchResult.events].reverse()

    // first stage: handle payment and reward added events
    for (const event of reversedEvents) {
        switch (event.eventName) {
            case 'OrderAmountPaid':
                await handleOrderAmountPaid(scope, event)
                break
            case 'RewardAmountAdded':
                await handleRewardAmountAdded(scope, event)
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

