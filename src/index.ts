import './config/env' // 加载环境变量（支持 .env 和 .env.local）
import { fetchTruthBoxEvents } from './scripts/fetchTruthBoxEvents'
import { fetchTruthNFTEvents } from './scripts/fetchTruthNFTEvents'
import { fetchExchangeEvents } from './scripts/fetchExchangeEvents'
import { fetchFundManagerEvents } from './scripts/fetchFundManagerEvents'
import { fetchUserIdEvents } from './scripts/fetchUserIdEvents'
import { DEFAULT_SCOPE } from './config/sync'
import { getAllContractsSyncData } from './core/state'
import { ContractName } from './contractsConfig/types'

export const CONSTANTS = {
  writeMetadataBox: true
}

async function main() {
  try {

    // console.log('🌐 当前不进行事件同步...')
    // return;

    const writeToSupabase = true
    const restart = false
    const isUpdateSyncBlock = true

    // 一次性获取所有合约的同步状态
    const allSyncData = await getAllContractsSyncData(DEFAULT_SCOPE)
    const default_start_block = 14458354

    const truthBoxLastBlock = restart
      ? default_start_block
      : allSyncData[ContractName.TRUTH_BOX]?.last_synced_block
    await fetchTruthBoxEvents(
      DEFAULT_SCOPE,
      truthBoxLastBlock,
      writeToSupabase,
      isUpdateSyncBlock
    )

    const truthNFTLastBlock = restart
      ? default_start_block
      : allSyncData[ContractName.TRUTH_NFT]?.last_synced_block
    await fetchTruthNFTEvents(
      DEFAULT_SCOPE,
      truthNFTLastBlock,
      writeToSupabase,
      isUpdateSyncBlock
    )

    const exchangeLastBlock = restart
      ? default_start_block
      : allSyncData[ContractName.EXCHANGE]?.last_synced_block
    await fetchExchangeEvents(
      DEFAULT_SCOPE,
      exchangeLastBlock,
      writeToSupabase,
      isUpdateSyncBlock
    )

    const fundManagerLastBlock = restart
      ? default_start_block
      : allSyncData[ContractName.FUND_MANAGER]?.last_synced_block
    await fetchFundManagerEvents(
      DEFAULT_SCOPE,
      fundManagerLastBlock,
      writeToSupabase,
      isUpdateSyncBlock
    )

    const userIdLastBlock = restart
      ? default_start_block
      : allSyncData[ContractName.USER_ID]?.last_synced_block
    await fetchUserIdEvents(
      DEFAULT_SCOPE,
      userIdLastBlock,
      writeToSupabase,
      isUpdateSyncBlock
    )

  } catch (error) {
    console.error('❌ 查询事件失败：', error)
    process.exitCode = 1
  }
}

void main()
