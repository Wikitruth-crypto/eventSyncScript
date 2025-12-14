import './config/env' // 加载环境变量（支持 .env 和 .env.local）
import { fetchTruthBoxEvents } from './scripts/fetchTruthBoxEvents'
import { fetchTruthNFTEvents } from './scripts/fetchTruthNFTEvents'
import { fetchExchangeEvents } from './scripts/fetchExchangeEvents'
import { fetchFundManagerEvents } from './scripts/fetchFundManagerEvents'
import { fetchUserIdEvents } from './scripts/fetchUserIdEvents'
import { getCurrentSupabaseData, updateSyncStatus } from './core/state'
import { DEFAULT_SCOPE } from './config/sync'
import { ContractName } from './contractsConfig/types'

export const CONSTANTS = {
  writeMetadataBox: true
}

async function main() {
  try {

    console.log('🌐 当前不进行事件同步...')
    return;

    console.log('🌐 开始同步事件...')
    const writeToSupabase = true
    const reSet = false
    const isUpdateSyncBlock = true

    // Step 1：为每个合约单独查询和更新同步状态
    if (!reSet) {
      // TRUTH_BOX 合约同步
      const truthBoxData = await getCurrentSupabaseData(DEFAULT_SCOPE, ContractName.TRUTH_BOX)
      const truthBox_last_block = truthBoxData?.last_synced_block || 14458354
      console.log('TRUTH_BOX last_synced_block:', truthBox_last_block)
      const result_truthBox = await fetchTruthBoxEvents(DEFAULT_SCOPE, truthBox_last_block, writeToSupabase)
      if (isUpdateSyncBlock) {
        await updateSyncStatus(DEFAULT_SCOPE, ContractName.TRUTH_BOX, result_truthBox.block_number)
      }

      // TRUTH_NFT 合约同步
      const truthNFTData = await getCurrentSupabaseData(DEFAULT_SCOPE, ContractName.TRUTH_NFT)
      const truthNFT_last_block = truthNFTData?.last_synced_block || 14458354
      console.log('TRUTH_NFT last_synced_block:', truthNFT_last_block)
      const result_truthNFT = await fetchTruthNFTEvents(DEFAULT_SCOPE, truthNFT_last_block, writeToSupabase)
      if (isUpdateSyncBlock) {
        await updateSyncStatus(DEFAULT_SCOPE, ContractName.TRUTH_NFT, result_truthNFT.block_number)
      }

      // EXCHANGE 合约同步
      const exchangeData = await getCurrentSupabaseData(DEFAULT_SCOPE, ContractName.EXCHANGE)
      const exchange_last_block = exchangeData?.last_synced_block || 14458354
      console.log('EXCHANGE last_synced_block:', exchange_last_block)
      const result_exchange = await fetchExchangeEvents(DEFAULT_SCOPE, exchange_last_block, writeToSupabase)
      if (isUpdateSyncBlock) {
        await updateSyncStatus(DEFAULT_SCOPE, ContractName.EXCHANGE, result_exchange.block_number)
      }

      // FUND_MANAGER 合约同步
      const fundManagerData = await getCurrentSupabaseData(DEFAULT_SCOPE, ContractName.FUND_MANAGER)
      const fundManager_last_block = fundManagerData?.last_synced_block || 14458354
      console.log('FUND_MANAGER last_synced_block:', fundManager_last_block)
      const result_fundManager = await fetchFundManagerEvents(DEFAULT_SCOPE, fundManager_last_block, writeToSupabase)
      if (isUpdateSyncBlock) {
        await updateSyncStatus(DEFAULT_SCOPE, ContractName.FUND_MANAGER, result_fundManager.block_number)
      }

      // USER_ID 合约同步
      const userIdData = await getCurrentSupabaseData(DEFAULT_SCOPE, ContractName.USER_ID)
      const userId_last_block = userIdData?.last_synced_block || 14458354
      console.log('USER_ID last_synced_block:', userId_last_block)
      const result_userId = await fetchUserIdEvents(DEFAULT_SCOPE, userId_last_block, writeToSupabase)
      if (isUpdateSyncBlock) {
        await updateSyncStatus(DEFAULT_SCOPE, ContractName.USER_ID, result_userId.block_number)
      }
    } else {
      // 重置模式：使用默认起始区块
      const default_start_block = 14458354
      
      const result_truthBox = await fetchTruthBoxEvents(DEFAULT_SCOPE, default_start_block, writeToSupabase)
      if (isUpdateSyncBlock) {
        await updateSyncStatus(DEFAULT_SCOPE, ContractName.TRUTH_BOX, result_truthBox.block_number)
      }

      const result_truthNFT = await fetchTruthNFTEvents(DEFAULT_SCOPE, default_start_block, writeToSupabase)
      if (isUpdateSyncBlock) {
        await updateSyncStatus(DEFAULT_SCOPE, ContractName.TRUTH_NFT, result_truthNFT.block_number)
      }

      const result_exchange = await fetchExchangeEvents(DEFAULT_SCOPE, default_start_block, writeToSupabase)
      if (isUpdateSyncBlock) {
        await updateSyncStatus(DEFAULT_SCOPE, ContractName.EXCHANGE, result_exchange.block_number)
      }

      const result_fundManager = await fetchFundManagerEvents(DEFAULT_SCOPE, default_start_block, writeToSupabase)
      if (isUpdateSyncBlock) {
        await updateSyncStatus(DEFAULT_SCOPE, ContractName.FUND_MANAGER, result_fundManager.block_number)
      }

      const result_userId = await fetchUserIdEvents(DEFAULT_SCOPE, default_start_block, writeToSupabase)
      if (isUpdateSyncBlock) {
        await updateSyncStatus(DEFAULT_SCOPE, ContractName.USER_ID, result_userId.block_number)
      }
    }

  } catch (error) {
    console.error('❌ 查询事件失败：', error)
    process.exitCode = 1
  }
}

void main()
