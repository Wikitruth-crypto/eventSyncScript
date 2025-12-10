// src/services/supabase/userIdWriter.ts
import type { RuntimeContractSyncResult } from '../../core/sync/runtimeContractSyncer'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isSupabaseConfigured } from '../../config/supabase'
import { getSupabaseClient } from '../../config/supabase'
import { getEventArgAsString, sanitizeForSupabase } from './utils'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'

/**
 * 处理 Blacklist 事件
 * 更新 user_addresses 表的 is_blacklisted 字段
 */
const handleBlacklist = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const user = getEventArgAsString(event, 'user')
    const statusRaw = (event.args as Record<string, unknown>)?.status

    if (!user || statusRaw === undefined || statusRaw === null) return

    const supabase = getSupabaseClient()

    // 处理布尔值
    let isBlacklisted: boolean
    if (typeof statusRaw === 'boolean') {
        isBlacklisted = statusRaw
    } else if (typeof statusRaw === 'number') {
        isBlacklisted = statusRaw !== 0
    } else {
        const statusStr = String(statusRaw).toLowerCase()
        isBlacklisted = statusStr === 'true' || statusStr === '1'
    }

    // 先确保用户地址存在（使用 upsert）
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
 * 处理 UserId 合约事件并写入 Supabase
 */
export const persistUserAddressSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    syncResult: RuntimeContractSyncResult,
): Promise<void> => {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未配置，跳过数据库写入')
        return
    }

    if (contract !== ContractName.USER_ID) return // 只处理 UserId 合约

    // 反转事件数组：区块链API返回的是最新的在前，我们需要最旧的在前面
    // 这样确保最新的事件数据最后写入，覆盖之前的值（例如 is_blacklisted）
    const reversedEvents = [...syncResult.fetchResult.events].reverse()

    // 处理所有 Blacklist 事件
    for (const event of reversedEvents) {
        if (event.eventName === 'Blacklist') {
            await handleBlacklist(scope, event)
        }
    }
}

