/**
 * 基于 Supabase 的状态存储实现
 * 用于生产环境（GitHub Actions），替代本地文件系统存储
 */

import { getSupabaseClient } from '../../config/supabase'
import type { ContractSyncKey, SyncCursor } from './types'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { TESTNET_ADDRESSES, MAINNET_ADDRESSES } from '../../contractsConfig/contracts'
import { SYNC_STATE_CONFIG } from '../../config/sync'

export interface SyncStatusData {
  last_synced_block: number
  last_synced_at: string | null
}

/**
 * 从 Supabase sync_status 表读取同步状态
 * 注意：Supabase 的 sync_status 表是按 network/layer/contract_name 存储的，每个合约有独立的同步状态
 */
export const getSyncCursor = async (key: ContractSyncKey): Promise<SyncCursor> => {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('sync_status')
      .select('last_synced_block, last_synced_at')
      .eq('network', key.network)
      .eq('layer', key.layer)
      .eq('contract_name', key.contract)
      .single()

    if (error) {
      // 如果记录不存在，返回默认值
      if (error.code === 'PGRST116') {
        return {
          lastBlock: SYNC_STATE_CONFIG.DEFAULT_START_BLOCK,
        }
      }
      console.warn(`⚠️  读取 Supabase 同步状态失败:`, error.message)
      return {
        lastBlock: SYNC_STATE_CONFIG.DEFAULT_START_BLOCK,
      }
    }

    if (!data) {
      return {
        lastBlock: SYNC_STATE_CONFIG.DEFAULT_START_BLOCK,
      }
    }

    return {
      lastBlock: Number(data.last_synced_block) || SYNC_STATE_CONFIG.DEFAULT_START_BLOCK,
      lastTimestamp: data.last_synced_at || undefined,
    }
  } catch (error) {
    console.warn(
      `⚠️  读取 Supabase 同步状态失败:`,
      error instanceof Error ? error.message : String(error),
    )
    return {
      lastBlock: SYNC_STATE_CONFIG.DEFAULT_START_BLOCK,
    }
  }
}

/**
 * 更新 Supabase sync_status 表的同步状态
 * 注意：这里更新的是特定合约的 last_synced_block
 */
export const updateSyncCursor = async (key: ContractSyncKey, cursor: SyncCursor): Promise<void> => {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('sync_status')
      .upsert(
        {
          network: key.network,
          layer: key.layer,
          contract_name: key.contract,
          last_synced_block: cursor.lastBlock.toString(),
          last_synced_at: cursor.lastTimestamp || new Date().toISOString(),
        },
        {
          onConflict: 'network,layer,contract_name',
        },
      )

    if (error) {
      console.warn(`⚠️  更新 Supabase 同步状态失败:`, error.message)
      throw error
    }
  } catch (error) {
    console.warn(
      `⚠️  更新 Supabase 同步状态失败:`,
      error instanceof Error ? error.message : String(error),
    )
    // 不抛出错误，允许继续执行
  }
}

/**
 * 更新 Supabase sync_status 表的同步状态（接受 RuntimeScope 和合约名称）
 * 用于主入口文件，更新特定合约的同步状态
 */
export const updateSyncStatus = async (
  scope: RuntimeScope,
  contract: ContractName,
  lastBlock: number,
): Promise<void> => {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('sync_status')
      .upsert(
        {
          network: scope.network,
          layer: scope.layer,
          contract_name: contract,
          last_synced_block: lastBlock.toString(),
          last_synced_at: new Date().toISOString(),
        },
        {
          onConflict: 'network,layer,contract_name',
        },
      )

    if (error) {
      console.warn(`⚠️  更新 Supabase 同步状态失败:`, error.message)
      throw error
    }
  } catch (error) {
    console.warn(
      `⚠️  更新 Supabase 同步状态失败:`,
      error instanceof Error ? error.message : String(error),
    )
    // 不抛出错误，允许继续执行
  }
}

/**
 * 从 Supabase 读取同步状态数据（兼容旧接口）
 * @param scope - 运行时范围（network 和 layer）
 * @param contract - 合约名称
 * @returns 同步状态数据，如果不存在则返回 null
 */
export const getCurrentSupabaseData = async (
  scope: RuntimeScope,
  contract: ContractName,
): Promise<SyncStatusData | null> => {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('sync_status')
      .select('last_synced_block, last_synced_at')
      .eq('network', scope.network)
      .eq('layer', scope.layer)
      .eq('contract_name', contract)
      .single()

    if (error) {
      // 如果记录不存在，返回 null（将由调用方处理）
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    if (!data) {
      return null
    }

    return {
      last_synced_block: Number(data.last_synced_block) || 0,
      last_synced_at: data.last_synced_at,
    }
  } catch (error) {
    console.error('❌ 读取 Supabase 同步状态失败：', error)
    throw error
  }
}

/**
 * 一次性获取所有合约的同步状态数据
 * @param scope - 运行时范围（network 和 layer）
 * @returns 所有合约的同步状态数据映射，键为合约名称，值为同步状态数据（如果不存在则为 null）
 */
export const getAllContractsSyncData = async (
  scope: RuntimeScope,
): Promise<Record<ContractName, SyncStatusData | null>> => {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('sync_status')
      .select('contract_name, last_synced_block, last_synced_at')
      .eq('network', scope.network)
      .eq('layer', scope.layer)

    if (error) {
      console.error('❌ 读取 Supabase 同步状态失败：', error)
      throw error
    }

    // 创建一个映射，初始化为所有合约都为 null
    const result: Record<ContractName, SyncStatusData | null> = {
      [ContractName.TRUTH_BOX]: null,
      [ContractName.TRUTH_NFT]: null,
      [ContractName.EXCHANGE]: null,
      [ContractName.FUND_MANAGER]: null,
      [ContractName.USER_ID]: null,
      [ContractName.ADDRESS_MANAGER]: null,
      [ContractName.SIWE_AUTH]: null,
      [ContractName.OFFICIAL_TOKEN]: null,
      [ContractName.OFFICIAL_TOKEN_SECRET]: null,
      [ContractName.WROSE_SECRET]: null,
      [ContractName.ERC20_SECRET]: null,
    }

    // 填充从数据库读取的数据
    if (data && Array.isArray(data)) {
      for (const item of data) {
        const contractName = item.contract_name as ContractName
        if (contractName in result) {
          result[contractName] = {
            last_synced_block: Number(item.last_synced_block) || 0,
            last_synced_at: item.last_synced_at,
          }
        }
      }
    }

    return result
  } catch (error) {
    console.error('❌ 读取 Supabase 同步状态失败：', error)
    throw error
  }
}

/**
 * 获取起始区块高度
 * 如果 Supabase 中有记录，使用 last_synced_block + 1
 * 否则使用合约配置中的 startBlock
 * @param scope - 运行时范围
 * @param contract - 合约名称
 * @returns 起始区块高度
 */
export const getStartBlockHeight = async (
  scope: RuntimeScope,
  contract: ContractName,
): Promise<number> => {
  const syncStatus = await getCurrentSupabaseData(scope, contract)

  if (syncStatus && syncStatus.last_synced_block > 0) {
    // 使用 Supabase 中的 last_synced_block + 1
    return syncStatus.last_synced_block + 1
  }

  // 如果没有记录，使用合约配置中的 startBlock
  const addresses = scope.network === 'testnet' ? TESTNET_ADDRESSES : MAINNET_ADDRESSES
  const contractAddress = addresses[contract]
  if (contractAddress && contractAddress.startBlock) {
    return contractAddress.startBlock
  }

  // 默认返回 0
  return 0
}

