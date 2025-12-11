import './config/env' // 加载环境变量（支持 .env 和 .env.local）
import { fetchTruthBoxEvents } from './scripts/fetchTruthBoxEvents'
import { fetchTruthNFTEvents } from './scripts/fetchTruthNFTEvents'
import { fetchExchangeEvents } from './scripts/fetchExchangeEvents'
import { fetchFundManagerEvents } from './scripts/fetchFundManagerEvents'
import { fetchUserIdEvents } from './scripts/fetchUserIdEvents'
import { getCurrentSupabaseData, updateSyncStatus } from './core/state'
import { DEFAULT_SCOPE } from './config/sync'

async function main() {
  try {
    const writeToSupabase = true
    const reSet = false
    const isUpdateSyncBlock = true
    let last_synced_block = 14458354 // 重新开始同步

    // Step 1：从 Supabase 中获取所需要的数据
    if (!reSet) {
      const currentSupabaseData = await getCurrentSupabaseData(DEFAULT_SCOPE)
      const current_block = currentSupabaseData?.last_synced_block
      if (current_block) {
        last_synced_block = current_block
      }
      console.log('last_synced_block:', last_synced_block)

    }


    const result_truthBox = await fetchTruthBoxEvents(DEFAULT_SCOPE, last_synced_block, writeToSupabase)

    const result_truthNFT = await fetchTruthNFTEvents(DEFAULT_SCOPE, last_synced_block, writeToSupabase)

    const result_exchange = await fetchExchangeEvents(DEFAULT_SCOPE, last_synced_block, writeToSupabase)

    const result_fundManager = await fetchFundManagerEvents(DEFAULT_SCOPE, last_synced_block, writeToSupabase)

    const result_userId = await fetchUserIdEvents(DEFAULT_SCOPE, last_synced_block, writeToSupabase)

    // const latest_block = Math.min(
    //   result_truthBox.block_number,
    //   result_truthNFT.block_number,
    //   result_exchange.block_number,
    //   result_fundManager.block_number,
    //   result_userId.block_number,
    // )
    const latest_block = result_truthBox.block_number

    if (isUpdateSyncBlock) {
      await updateSyncStatus(DEFAULT_SCOPE, latest_block)
    }

  } catch (error) {
    console.error('❌ 查询事件失败：', error)
    process.exitCode = 1
  }
}

void main()
