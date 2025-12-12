// src/services/supabase/truthBoxWriter.ts
import type { RuntimeContractSyncResult } from '../../core/sync/runtimeContractSyncer'
import { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isSupabaseConfigured } from '../../config/supabase'
import { ensureBoxesExist } from './boxesWriter'
import { ensureUsersExist } from './usersWriter'  // 新增
import { upsertMetadataFromEvents } from './metadataWriter'
import {CONSTANTS} from '../../index'

export const persistTruthBoxSync = async (
  scope: RuntimeScope,
  contract: ContractName,
  syncResult: RuntimeContractSyncResult,
) => {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未配置，跳过数据库写入')
    return
  }

  // ✅ 先确保 users 记录存在（处理所有事件中的 userId）
  await ensureUsersExist(scope, syncResult.fetchResult)

  // ✅ 然后确保 boxes 记录存在（处理 BoxCreated 等事件）
  await ensureBoxesExist(scope, contract, syncResult.fetchResult)

  // ✅ 最后处理 metadata
  // 同时支持旧合约的 BoxInfoChanged 和新合约的 BoxCreated（包含 boxInfoCID）
  const metadataEvents = syncResult.fetchResult.events.filter(
    event => {
      if (event.eventName === 'BoxInfoChanged') {
        return true // 旧合约事件
      }
      if (event.eventName === 'BoxCreated') {
        // 新合约的 BoxCreated 事件包含 boxInfoCID 参数
        const boxInfoCID = (event.args as Record<string, unknown>)?.boxInfoCID
        return Boolean(boxInfoCID) // 只有包含 boxInfoCID 的 BoxCreated 才需要获取 metadata
      }
      return false
    }
  )
  if (metadataEvents.length && CONSTANTS.writeMetadataBox) {
    await upsertMetadataFromEvents(scope, metadataEvents)
  }
}