// src/services/supabase/usersWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import type { EventFetchResult } from '../../core/events'
import { getSupabaseClient } from '../../config/supabase'
import { sanitizeForSupabase, getEventArgAsString } from './utils'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'

/**
 * 处理所有事件，确保 users 记录存在
 * 注意：事件按顺序处理，使用批量 upsert 提高性能
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

    if (userIds.size === 0) return

    const supabase = getSupabaseClient()
    
    // 批量 upsert，避免多次查询
    const userRecords = Array.from(userIds).map(userId => ({
        network: scope.network,
        layer: scope.layer,
        id: userId,
    }))
    
    // 清理对象，确保没有 BigInt
    const sanitizedUserRecords = userRecords.map(record => 
        sanitizeForSupabase(record) as Record<string, unknown>
    )
    
    const { error } = await supabase
        .from('users')
        .upsert(sanitizedUserRecords, {
            onConflict: 'network,layer,id',
        })

    if (error) {
        console.warn(`⚠️  Failed to upsert users:`, error.message)
    }
}

