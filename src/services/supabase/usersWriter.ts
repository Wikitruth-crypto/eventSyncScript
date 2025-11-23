// src/services/supabase/usersWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import type { EventFetchResult } from '../../core/events'
import { getSupabaseClient } from '../../config/supabase'
import { sanitizeForSupabase, getEventArgAsString } from './utils'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'

/**
 * 创建或更新用户记录
 * 注意：users 表只包含 network, layer, id 字段，没有其他数据，直接使用 upsert
 */
const ensureUserExists = async (
    scope: RuntimeScope,
    userId: string,
) => {
    if (!userId) return

    const supabase = getSupabaseClient()
    
    // 直接使用 upsert，即使已存在也不会报错
    const userData = {
        network: scope.network,
        layer: scope.layer,
        id: userId,
    }
    // 清理对象，确保没有 BigInt
    const sanitizedUserData = sanitizeForSupabase(userData) as Record<string, unknown>
    const { error } = await supabase
        .from('users')
        .upsert(sanitizedUserData, {
            onConflict: 'network,layer,id',
        })

    if (error) {
        console.warn(`⚠️  Failed to upsert user ${userId}:`, error.message)
    }
}

/**
 * 处理所有事件，确保 users 记录存在
 */
export const ensureUsersExist = async (
    scope: RuntimeScope,
    fetchResult: EventFetchResult,
) => {
    const userIds = new Set<string>()

    // 收集所有事件中的 userId（使用通用工具，正确处理 0 值）
    for (const event of fetchResult.events) {
        const userId = getEventArgAsString(event, 'userId')
        if (userId) {
            userIds.add(userId)
        }
    }

    // 为每个 userId 确保记录存在
    for (const userId of userIds) {
        await ensureUserExists(scope, userId)
    }
}

