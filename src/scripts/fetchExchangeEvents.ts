import { ContractName } from '../contractsConfig/types'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { syncRuntimeContractEvents } from '../core/sync'
import { DEFAULT_SCOPE, EVENT_QUERY_CONFIG } from '../config/sync'
import { persistExchangeSync } from '../services/supabase/exchangeWriter'
import { saveEventDataToFile, shouldSaveEventDataToFile } from '../utils/saveEventDataToFile'
import { decodeContractEvents } from '../utils/decodeEvents'
import { updateSyncStatus } from '../core/state'

export interface FetchExchangeEventsResult {
  outputPath: string | null
  block_number: number
}

/**
 * 获取 Exchange 合约事件
 * @param scope - 运行时范围
 * @param lastSyncedBlock - 上次同步的区块高度（可选），如果未提供则使用合约配置的 startBlock
 * @param syncToSupabase - 是否同步到 Supabase 数据库
 * @param updateSyncBlock - 是否更新同步状态（默认 true）
 */
export async function fetchExchangeEvents(
  scope: RuntimeScope = DEFAULT_SCOPE,
  lastSyncedBlock?: number,
  syncToSupabase: boolean = true,
  updateSyncBlock: boolean = true
): Promise<FetchExchangeEventsResult> {
  console.log(`🌐 正在查询 Exchange：network=${scope.network}, layer=${scope.layer}`)

  const fromRoundOverride = process.env.EVENT_SYNC_FROM_BLOCK
    ? Number(process.env.EVENT_SYNC_FROM_BLOCK)
    : lastSyncedBlock !== undefined
      ? lastSyncedBlock + 1
      : undefined

  const syncResult = await syncRuntimeContractEvents({
    scope,
    contract: ContractName.EXCHANGE,
    limit: Number(process.env.EVENT_SYNC_LIMIT ?? EVENT_QUERY_CONFIG.DEFAULT_LIMIT),
    batchSize: Number(process.env.EVENT_SYNC_BATCH_SIZE ?? EVENT_QUERY_CONFIG.DEFAULT_BATCH_SIZE),
    fromRound: fromRoundOverride,
  })

  // 使用统一的解码工具函数解码事件
  const decodedEvents = decodeContractEvents(
    syncResult.fetchResult.rawEvents,
    ContractName.EXCHANGE,
    scope,
  )

  // console.log("decodedEvents:",decodedEvents)

  console.log(`✅ 已获取 ${decodedEvents.length} 条解码后的事件（总计 ${syncResult.fetchResult.totalFetched} 条原始事件，抓取 ${syncResult.fetchResult.pagesFetched} 页）`)

  const syncResultWithDecodedEvents = {
    ...syncResult,
    fetchResult: {
      ...syncResult.fetchResult,
      events: decodedEvents,
    },
  }

  // ✅ 写入数据库
  if(syncToSupabase) {
    await persistExchangeSync(scope, ContractName.EXCHANGE, syncResultWithDecodedEvents)
  }

  let outputPath: string | null = null
  if (shouldSaveEventDataToFile()) {
    outputPath = await saveEventDataToFile(scope, ContractName.EXCHANGE, syncResult)
  }

  console.log(`📊 同步状态：从区块 ${syncResult.cursorBefore.lastBlock} 到 ${syncResult.cursorAfter.lastBlock}`)

  const block_number = syncResult.cursorAfter.lastBlock

  // 更新同步状态
  if (updateSyncBlock && syncToSupabase) {
    await updateSyncStatus(scope, ContractName.EXCHANGE, block_number)
  }

  return {
    outputPath,
    block_number,
  }
}

