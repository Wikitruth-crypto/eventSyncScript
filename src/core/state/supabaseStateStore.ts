/**
 * Implementation of state storage based on Supabase
 * Used in production environment (GitHub Actions), replacing local file system storage
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
 * Read sync status from Supabase sync_status table
 * Note: The sync_status table in Supabase is stored by network/layer/contract_name, each contract has its own sync status
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
      // If record does not exist, return default value
      if (error.code === 'PGRST116') {
        return {
          lastBlock: SYNC_STATE_CONFIG.DEFAULT_START_BLOCK,
        }
      }
      console.warn(`⚠️  Failed to read Supabase sync status:`, error.message)
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
      `⚠️  Failed to read Supabase sync status:`,
      error instanceof Error ? error.message : String(error),
    )
    return {
      lastBlock: SYNC_STATE_CONFIG.DEFAULT_START_BLOCK,
    }
  }
}

/**
 * Update sync status of Supabase sync_status table
 * Note: Here we update the last_synced_block of the specific contract
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
      console.warn(`⚠️  Failed to update Supabase sync status:`, error.message)
      throw error
    }
  } catch (error) {
    console.warn(
      `⚠️  Failed to update Supabase sync status:`,
      error instanceof Error ? error.message : String(error),
    )
    // Do not throw error, allow continue execution
  }
}

/**
 * Update sync status of Supabase sync_status table (accept RuntimeScope and contract name)
 * Used in main entry file, update sync status of specific contract
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
      console.warn(`⚠️  Failed to update Supabase sync status:`, error.message)
      throw error
    }
  } catch (error) {
    console.warn(
      `⚠️  Failed to update Supabase sync status:`,
      error instanceof Error ? error.message : String(error),
    )
    // Do not throw error, allow continue execution
  }
}

/**
 * Read sync status data from Supabase (compatible with old interface)
 * @param scope - Runtime scope (network and layer)
 * @param contract - Contract name
 * @returns Sync status data, if not exists, return null
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
      // If record does not exist, return null (will be handled by caller)
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
    console.error('❌ Failed to read Supabase sync status:', error)
    throw error
  }
}

/**
 * Get all contracts sync status data at once
 * @param scope - Runtime scope (network and layer)
 * @returns All contracts sync status data mapping, key is contract name, value is sync status data (if not exists, return null)
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
      console.error('❌ Failed to read Supabase sync status:', error)
      throw error
    }

    // Create a mapping, initialized to all contracts are null
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

    // Fill data read from database
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
    console.error('❌ Failed to read Supabase sync status:', error)
    throw error
  }
}


export const getStartBlockHeight = async (
  scope: RuntimeScope,
  contract: ContractName,
): Promise<number> => {
  const syncStatus = await getCurrentSupabaseData(scope, contract)

  if (syncStatus && syncStatus.last_synced_block > 0) {
    // Use last_synced_block + 1 from Supabase
    return syncStatus.last_synced_block + 1
  }

  // If no record, use startBlock in contract configuration
  const addresses = scope.network === 'testnet' ? TESTNET_ADDRESSES : MAINNET_ADDRESSES
  const contractAddress = addresses[contract]
  if (contractAddress && contractAddress.startBlock) {
    return contractAddress.startBlock
  }

  // Default return 0
  return 0
}

