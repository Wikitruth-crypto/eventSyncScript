// src/services/supabase/boxesWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types' // 需要导入值，不只是类型
import type { EventFetchResult } from '../../core/events'
import { getSupabaseClient } from '../../config/supabase'
import { getEventArg } from './eventArgs'
import { sanitizeForSupabase, getEventArgAsString, hasEventArg } from './utils'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'

/**
 * 从事件中提取时间戳
 * 优先使用事件的 round（区块号）作为时间戳，如果没有则使用当前时间戳
 */
const extractTimestamp = (event: DecodedRuntimeEvent<Record<string, unknown>>): string => {
    // 优先使用 round（区块号）作为时间戳
    const round = event.raw.round
    if (round !== undefined && round !== null) {
        return String(round)
    }
    
    // 如果没有 round，尝试从 timestamp 字符串解析
    const timestampStr = event.raw.timestamp
    if (timestampStr) {
        try {
            // timestamp 是 ISO 8601 格式字符串，转换为 Unix 时间戳（秒）
            const date = new Date(timestampStr)
            const unixTimestamp = Math.floor(date.getTime() / 1000)
            return String(unixTimestamp)
        } catch {
            // 解析失败，使用当前时间戳
            return String(Math.floor(Date.now() / 1000))
        }
    }
    
    // 如果都没有，使用当前时间戳
    return String(Math.floor(Date.now() / 1000))
}

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

    // 检查是否已存在
    const { data: existing } = await supabase
        .from('boxes')
        .select('id')
        .match({ network: scope.network, layer: scope.layer, id: boxId })
        .single()

    if (existing) return // 已存在，跳过

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
 * 确保 box 记录存在（如果不存在则创建）
 */
const ensureBoxExists = async (
    scope: RuntimeScope,
    boxId: string,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
) => {
    const supabase = getSupabaseClient()
    
    // 检查是否已存在
    const { data: existing } = await supabase
        .from('boxes')
        .select('id')
        .match({ network: scope.network, layer: scope.layer, id: boxId })
        .single()

    if (existing) return // 已存在，跳过

    // 如果不存在，尝试创建（使用事件中的信息）
    // 如果没有 userId，使用默认值
    const userId = getEventArgAsString(event, 'userId') ?? '0'
    const createTimestamp = extractTimestamp(event)

    // 注意：根据 supabase.config.ts，box_info_cid 是必填字段（可以是 null）
    const boxDataToInsert = {
        network: scope.network,
        layer: scope.layer,
        id: boxId,
        token_id: boxId,
        minter_id: userId,
        owner_address: '0x0000000000000000000000000000000000000000',
        status: 'Storing',
        price: '0',
        deadline: '0',
        create_timestamp: createTimestamp,
        box_info_cid: null, // 必填字段，默认为 null
    }
    // 清理对象，确保没有 BigInt
    const sanitizedBoxDataToInsert = sanitizeForSupabase(boxDataToInsert) as Record<string, unknown>
    const { error } = await supabase.from('boxes').insert(sanitizedBoxDataToInsert)

    if (error) {
        console.warn(`⚠️  Failed to ensure box ${boxId} exists:`, error.message)
    }
}

/**
 * 处理所有事件，确保 boxes 记录存在
 */
export const ensureBoxesExist = async (
    scope: RuntimeScope,
    contract: ContractName,
    fetchResult: EventFetchResult,
) => {
    if (contract !== ContractName.TRUTH_BOX) return // 只处理 TruthBox 合约

    for (const event of fetchResult.events) {
        // 使用通用工具安全地提取事件参数（正确处理 0 值）
        const boxId = getEventArgAsString(event, 'boxId')
        if (!boxId) continue

        // 先处理 BoxCreated（创建新记录）
        if (event.eventName === 'BoxCreated') {
            await handleBoxCreated(scope, event)
        } else {
            // 对于其他事件，确保 box 记录存在（如果不存在则创建）
            await ensureBoxExists(scope, boxId, event)
        }

        // 然后处理其他更新事件
        await handleBoxUpdate(scope, event)
    }
}