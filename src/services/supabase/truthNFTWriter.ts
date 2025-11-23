// src/services/supabase/truthNFTWriter.ts
import type { RuntimeContractSyncResult } from '../../core/sync/runtimeContractSyncer'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isSupabaseConfigured } from '../../config/supabase'
import { getSupabaseClient } from '../../config/supabase'
import { getEventArgAsString, sanitizeForSupabase } from './utils'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'

/**
 * 创建或更新用户地址记录
 * 注意：user_addresses 表只有基础字段，没有其他数据，直接使用 upsert
 */
const ensureUserAddressExists = async (
  scope: RuntimeScope,
  address: string,
): Promise<void> => {
  if (!address) return

  const supabase = getSupabaseClient()

  // 直接使用 upsert，即使已存在也不会报错
  const addressData = sanitizeForSupabase({
    network: scope.network,
    layer: scope.layer,
    id: address.toLowerCase(),
    is_blacklisted: false,
  }) as Record<string, unknown>

  const { error } = await supabase
    .from('user_addresses')
    .upsert(addressData, {
      onConflict: 'network,layer,id',
    })

  if (error) {
    console.warn(`⚠️  Failed to upsert user address ${address}:`, error.message)
  }
}

/**
 * 处理 Transfer 事件，更新 boxes 表的 owner_address
 */
const handleTransfer = async (
  scope: RuntimeScope,
  event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
  const tokenId = getEventArgAsString(event, 'tokenId')
  const to = getEventArgAsString(event, 'to')

  if (!tokenId || !to) return

  const supabase = getSupabaseClient()

  // 确保用户地址存在
  await ensureUserAddressExists(scope, to)

  // 更新 boxes 表的 owner_address
  const { error } = await supabase
    .from('boxes')
    .update({ owner_address: to.toLowerCase() })
    .match({ network: scope.network, layer: scope.layer, id: tokenId })

  if (error) {
    console.warn(`⚠️  Failed to update box ${tokenId} owner_address:`, error.message)
  }
}

/**
 * 处理 TruthNFT 合约事件并写入 Supabase
 */
export const persistTruthNFTSync = async (
  scope: RuntimeScope,
  contract: ContractName,
  syncResult: RuntimeContractSyncResult,
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未配置，跳过数据库写入')
    return
  }

  if (contract !== ContractName.TRUTH_NFT) return // 只处理 TruthNFT 合约

  // 处理所有 Transfer 事件
  for (const event of syncResult.fetchResult.events) {
    if (event.eventName === 'Transfer') {
      await handleTransfer(scope, event)
    }
  }
}

