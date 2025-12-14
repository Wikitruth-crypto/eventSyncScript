import { ContractName } from '../contractsConfig/types'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { syncRuntimeContractEvents } from '../core/sync'
import { DEFAULT_SCOPE, EVENT_QUERY_CONFIG } from '../config/sync'
import { persistTruthBoxSync } from '../services/supabase/truthBoxWriter'
import { saveEventDataToFile, shouldSaveEventDataToFile } from '../utils/saveEventDataToFile'
import { decodeContractEvents } from '../utils/decodeEvents'
import { updateSyncStatus } from '../core/state'

export interface FetchTruthBoxEventsResult {
  outputPath: string | null 
  block_number: number 
}

/**
 * 获取 TruthBox 合约事件
 * @param scope - 运行时范围
 * @param lastSyncedBlock - 上次同步的区块高度（可选），如果未提供则使用合约配置的 startBlock
 * @param syncToSupabase - 是否同步到 Supabase 数据库
 * @param updateSyncBlock - 是否更新同步状态（默认 true）
 * @returns 包含输出路径和最近事件区块高度的结果
 */
export async function fetchTruthBoxEvents(
  scope: RuntimeScope = DEFAULT_SCOPE,
  lastSyncedBlock?: number,
  syncToSupabase: boolean = true,
  updateSyncBlock: boolean = true
): Promise<FetchTruthBoxEventsResult> {
  console.log(`🌐 正在查询 TruthBox：network=${scope.network}, layer=${scope.layer}`)

  // 确定起始区块高度
  // 优先级：环境变量 > 传入的 lastSyncedBlock
  const fromRoundOverride = process.env.EVENT_SYNC_FROM_BLOCK
    ? Number(process.env.EVENT_SYNC_FROM_BLOCK)
    : lastSyncedBlock !== undefined
      ? lastSyncedBlock + 1 // 从 lastSyncedBlock + 1 开始查询
      : undefined

  const syncResult = await syncRuntimeContractEvents({
    scope,
    contract: ContractName.TRUTH_BOX,
    limit: Number(process.env.EVENT_SYNC_LIMIT ?? EVENT_QUERY_CONFIG.DEFAULT_LIMIT),
    batchSize: Number(process.env.EVENT_SYNC_BATCH_SIZE ?? EVENT_QUERY_CONFIG.DEFAULT_BATCH_SIZE),
    fromRound: fromRoundOverride,
  })

  // 使用统一的解码工具函数解码事件（不依赖底层 oasisQuery 模块的解码结果）
  const decodedEvents = decodeContractEvents(
    syncResult.fetchResult.rawEvents,
    ContractName.TRUTH_BOX,
    scope,
  )

  // console.log("decodedEvents:",decodedEvents)

  console.log(`✅ 已获取 ${decodedEvents.length} 条解码后的事件（总计 ${syncResult.fetchResult.totalFetched} 条原始事件，抓取 ${syncResult.fetchResult.pagesFetched} 页）`)

  // 创建包含解码后事件的结果对象
  const syncResultWithDecodedEvents = {
    ...syncResult,
    fetchResult: {
      ...syncResult.fetchResult,
      events: decodedEvents, // 使用统一解码工具解码的事件
    },
  }

  // ✅ 写入数据库并获取 IPFS metadata
  if(syncToSupabase) {
    await persistTruthBoxSync(scope, ContractName.TRUTH_BOX, syncResultWithDecodedEvents)
  }
  // 可选：保存原始事件数据到文件（用于调试）
  // 通过环境变量 EVENT_SYNC_SAVE_JSON=true 启用
  let outputPath: string | null = null
  if (shouldSaveEventDataToFile()) {
    outputPath = await saveEventDataToFile(scope, ContractName.TRUTH_BOX, syncResult)
  }

  console.log(`📊 同步状态：从区块 ${syncResult.cursorBefore.lastBlock} 到 ${syncResult.cursorAfter.lastBlock}`)

  // 返回最近事件的区块高度
  const block_number = syncResult.cursorAfter.lastBlock

  // 更新同步状态
  if (updateSyncBlock && syncToSupabase) {
    await updateSyncStatus(scope, ContractName.TRUTH_BOX, block_number)
  }

  return {
    outputPath,
    block_number,
  }
}
