// src/services/supabase/boxesWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types' // 需要导入值，不只是类型
import type { EventFetchResult } from '../../core/events'
import { getSupabaseClient } from '../../config/supabase'
import { getEventArg } from './eventArgs'
import { sanitizeForSupabase, getEventArgAsString, hasEventArg } from './utils'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import { extractTimestamp } from '../../utils/extractTimestamp'
// import { getProtocolConstants } from '../../contractsConfig/ProtocolConstants'

/**
 * 处理 BoxCreated 事件，创建 boxes 记录
 * 支持旧合约（两个参数）和新合约（三个参数，包含 boxInfoCID）
 * 使用 upsert 避免重复键错误（如果 box 已存在则更新）
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
    
    // 使用 upsert 避免重复键错误（如果 box 已存在则更新，否则插入）
    const { error } = await supabase
        .from('boxes')
        .upsert(sanitizedBoxData, {
            onConflict: 'network,layer,id', // 根据主键冲突处理
        })

    if (error) {
        console.warn(`⚠️  Failed to upsert box ${boxId}:`, error.message)
    } else {
        console.log(`✅ Upserted box ${boxId}`)
    }
}

/**
 * 处理其他事件，更新 boxes 记录
 */
const handleBoxUpdate = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
) => {
    // const protocolConstants = getProtocolConstants(scope)

    // 使用通用工具安全地提取事件参数（正确处理 0 值）
    const boxId = getEventArgAsString(event, 'boxId')
    // 只有当 boxId 不存在（undefined）时才跳过（'0' 是有效值）
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
        // 清理更新对象，确保没有 BigInt
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
 * 处理所有事件，确保 boxes 记录存在
 * 注意：事件是按顺序处理的，不需要检查记录是否存在
 * 优化：优先处理所有 BoxCreated 事件，然后再处理其他更新事件
 * 
 * 重要：区块链API返回的事件是最新的在前，需要反转数组确保最旧的事件先写入，
 * 最新的事件最后写入，这样才能保证数据库中的最终状态是正确的
 */
export const ensureBoxesExist = async (
    scope: RuntimeScope,
    contract: ContractName,
    fetchResult: EventFetchResult,
) => {
    if (contract !== ContractName.TRUTH_BOX) return // 只处理 TruthBox 合约

    // 反转事件数组：区块链API返回的是最新的在前，我们需要最旧的在前面
    // 这样确保最新的事件数据最后写入，覆盖之前的值
    const reversedEvents = [...fetchResult.events].reverse()

    // 第一步：优先处理所有 BoxCreated 事件（创建新记录）
    for (const event of reversedEvents) {
        if (event.eventName === 'BoxCreated') {
            const boxId = getEventArgAsString(event, 'boxId')
            if (boxId) {
                await handleBoxCreated(scope, event)
            }
        }
    }

    // 第二步：处理其他更新事件（此时所有 box 记录应该已经存在）
    for (const event of reversedEvents) {
        if (event.eventName !== 'BoxCreated') {
            const boxId = getEventArgAsString(event, 'boxId')
            if (boxId) {
                await handleBoxUpdate(scope, event)
            }
        }
    }
}