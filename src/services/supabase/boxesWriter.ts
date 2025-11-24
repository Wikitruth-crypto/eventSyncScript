// src/services/supabase/boxesWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types' // 需要导入值，不只是类型
import type { EventFetchResult } from '../../core/events'
import { getSupabaseClient } from '../../config/supabase'
import { getEventArg } from './eventArgs'
import { sanitizeForSupabase, getEventArgAsString, hasEventArg } from './utils'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import { extractTimestamp } from '../../utils/extractTimestamp'

/**
 * 处理 BoxCreated 事件，创建 boxes 记录
 * 支持旧合约（两个参数）和新合约（三个参数，包含 boxInfoCID）
 */
const handleBoxCreated = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
) => {
    // 使用通用工具安全地提取事件参数（正确处理 0 值）
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')
    const boxInfoCID = getEventArgAsString(event, 'boxInfoCID') // 新合约包含此参数

    // 只有当 boxId 或 userId 不存在（undefined）时才跳过（0 是有效值）
    if (boxId === undefined || userId === undefined) return

    const supabase = getSupabaseClient()

    // 从事件中提取时间戳
    const createTimestamp = extractTimestamp(event)

    // 创建新的 box 记录
    // 注意：token_id 需要是字符串形式的数字，不能使用 BigInt（无法序列化）
    // 注意：根据 supabase.config.ts，box_info_cid 是必填字段（可以是 null）
    const boxData: Record<string, unknown> = {
        network: scope.network,
        layer: scope.layer,
        id: boxId,
        token_id: boxId, // PostgreSQL BIGINT 可以接受字符串形式的数字
        minter_id: userId,
        owner_address: '0x0000000000000000000000000000000000000000', // 默认值，后续通过 Transfer 事件更新
        status: 'Storing',
        price: '0',
        deadline: '0',
        create_timestamp: createTimestamp, // 必填字段：创建时间戳
        box_info_cid: null, // 必填字段，默认为 null
    }

    // 如果新合约的 BoxCreated 事件包含 boxInfoCID，也保存它
    if (boxInfoCID) {
        // 清理 CID（移除 ipfs:// 前缀）
        const sanitizedCid = boxInfoCID.replace(/^ipfs:\/\//, '')
        boxData.box_info_cid = sanitizedCid
    }

    // 清理整个对象，确保没有 BigInt
    const sanitizedBoxData = sanitizeForSupabase(boxData) as Record<string, unknown>
    const { error } = await supabase.from('boxes').insert(sanitizedBoxData)

    if (error) {
        console.warn(`⚠️  Failed to create box ${boxId}:`, error.message)
    }
}

/**
 * 处理其他事件，更新 boxes 记录
 */
const handleBoxUpdate = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
) => {
    // 使用通用工具安全地提取事件参数（正确处理 0 值）
    const boxId = getEventArgAsString(event, 'boxId')
    if (!boxId) return

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
            }
            break

        case 'PrivateKeyPublished':
            const privateKey = getEventArgAsString(event, 'privateKey')
            if (privateKey !== undefined) {
                updates.private_key = privateKey
            }
            break

        // ... 其他事件处理
    }

    if (Object.keys(updates).length > 0) {
        // 清理更新对象，确保没有 BigInt
        const sanitizedUpdates = sanitizeForSupabase(updates) as Record<string, unknown>
        const { error } = await supabase
            .from('boxes')
            .update(sanitizedUpdates)
            .match({ network: scope.network, layer: scope.layer, id: boxId })

        if (error) {
            console.warn(`⚠️  Failed to update box ${boxId}:`, error.message)
        }
    }
}

/**
 * 处理所有事件，确保 boxes 记录存在
 * 注意：事件是按顺序处理的，不需要检查记录是否存在
 * 优化：优先处理所有 BoxCreated 事件，然后再处理其他更新事件
 */
export const ensureBoxesExist = async (
    scope: RuntimeScope,
    contract: ContractName,
    fetchResult: EventFetchResult,
) => {
    if (contract !== ContractName.TRUTH_BOX) return // 只处理 TruthBox 合约

    // 第一步：优先处理所有 BoxCreated 事件（创建新记录）
    for (const event of fetchResult.events) {
        if (event.eventName === 'BoxCreated') {
            const boxId = getEventArgAsString(event, 'boxId')
            if (boxId) {
                await handleBoxCreated(scope, event)
            }
        }
    }

    // 第二步：处理其他更新事件（此时所有 box 记录应该已经存在）
    for (const event of fetchResult.events) {
        if (event.eventName !== 'BoxCreated') {
            const boxId = getEventArgAsString(event, 'boxId')
            if (boxId) {
                await handleBoxUpdate(scope, event)
            }
        }
    }
}