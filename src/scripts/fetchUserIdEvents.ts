import { ContractName } from '../contractsConfig/types'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { syncRuntimeContractEvents } from '../core/sync'
import { DEFAULT_SCOPE, EVENT_QUERY_CONFIG } from '../config/sync'
import { persistUserIdSync } from '../services/supabase/userIdWriter'
import { saveEventDataToFile, shouldSaveEventDataToFile } from '../utils/saveEventDataToFile'
import { decodeContractEvents } from '../utils/decodeEvents'

export interface FetchUserIdEventsResult {
    outputPath: string | null
    block_number: number
}

/**
 * 获取 UserId 合约事件
 */
export async function fetchUserIdEvents(
    scope: RuntimeScope = DEFAULT_SCOPE,
    last_synced_block?: number,
): Promise<FetchUserIdEventsResult> {
    console.log(`🌐 正在查询 UserId 事件：network=${scope.network}, layer=${scope.layer}`)
    console.log('ℹ️  当前模式：获取事件数据、解码事件、写入数据库')

    const fromRoundOverride = process.env.EVENT_SYNC_FROM_BLOCK
        ? Number(process.env.EVENT_SYNC_FROM_BLOCK)
        : last_synced_block !== undefined
            ? last_synced_block + 1
            : undefined

    const syncResult = await syncRuntimeContractEvents({
        scope,
        contract: ContractName.USER_ID,
        limit: Number(process.env.EVENT_SYNC_LIMIT ?? EVENT_QUERY_CONFIG.DEFAULT_LIMIT),
        batchSize: Number(process.env.EVENT_SYNC_BATCH_SIZE ?? EVENT_QUERY_CONFIG.DEFAULT_BATCH_SIZE),
        fromRound: fromRoundOverride,
    })

    // 使用统一的解码工具函数解码事件
    const decodedEvents = decodeContractEvents(
        syncResult.fetchResult.rawEvents,
        ContractName.USER_ID,
        scope,
    )

    console.log(`✅ 已获取 ${decodedEvents.length} 条解码后的事件（总计 ${syncResult.fetchResult.totalFetched} 条原始事件，抓取 ${syncResult.fetchResult.pagesFetched} 页）`)

    const syncResultWithDecodedEvents = {
        ...syncResult,
        fetchResult: {
            ...syncResult.fetchResult,
            events: decodedEvents,
        },
    }

    // ✅ 写入数据库
    await persistUserIdSync(scope, ContractName.USER_ID, syncResultWithDecodedEvents)

    let outputPath: string | null = null
    if (shouldSaveEventDataToFile()) {
        outputPath = await saveEventDataToFile(scope, ContractName.USER_ID, syncResult)
    }

    console.log(`📊 同步状态：从区块 ${syncResult.cursorBefore.lastBlock} 到 ${syncResult.cursorAfter.lastBlock}`)

    const block_number = syncResult.cursorAfter.lastBlock

    return {
        outputPath,
        block_number,
    }
}

