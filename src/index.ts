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
    // Step 1：从 Supabase 中获取所需要的数据
    const currentSupabaseData = await getCurrentSupabaseData(DEFAULT_SCOPE)
    const last_synced_block = currentSupabaseData?.last_synced_block
    console.log('last_synced_block:', last_synced_block)

    // Step 2：Fetch TruthBox events(TruthBox)
    const result_truthBox = await fetchTruthBoxEvents(DEFAULT_SCOPE, last_synced_block)

    // Step 3: Fetch TruthNFT events(TruthNFT)
    const result_truthNFT = await fetchTruthNFTEvents(DEFAULT_SCOPE, last_synced_block)

    // Step 4: Fetch Exchange events(Exchange)
    const result_exchange = await fetchExchangeEvents(DEFAULT_SCOPE, last_synced_block)

    // Step 5: Fetch FundManager events(FundManager)
    const result_fundManager = await fetchFundManagerEvents(DEFAULT_SCOPE, last_synced_block)

    // Step 6: Fetch UserId events(UserId)
    const result_userId = await fetchUserIdEvents(DEFAULT_SCOPE, last_synced_block)

    // Step 7: 比较最小的区块高度，更新 Supabase 中的 last_synced_block
    const latest_block = Math.min(
      result_truthBox.block_number,
      result_truthNFT.block_number,
      result_exchange.block_number,
      result_fundManager.block_number,
      result_userId.block_number,
    )
    await updateSyncStatus(DEFAULT_SCOPE, latest_block)

  } catch (error) {
    console.error('❌ 查询事件失败：', error)
    process.exitCode = 1
  }
}

void main()
