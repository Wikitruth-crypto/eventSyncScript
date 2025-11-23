/**
 * 记录脚本开始时的区块高度（本地调试工具）
 * 不应在生产环境（GitHub Actions）中使用
 * 
 * 这是一个独立的功能，应该在脚本开始时调用一次
 * 这样可以避免在脚本运行期间（可能几分钟）产生的新事件被遗漏
 */

import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { fetchRuntimeContractEvents } from '../../core/events'
import { getSyncCursor, updateSyncCursor } from './syncStateStore'
import type { ContractSyncKey, SyncCursor } from '../../core/state/types'

const buildCursorKey = (scope: RuntimeScope, contract: ContractName): ContractSyncKey => ({
    network: scope.network,
    layer: scope.layer,
    contract,
})

/**
 * 获取当前区块高度（通过查询 TruthBox 合约的最新事件）
 * @param scope - 运行时范围
 * @param contract - 合约名称
 * @returns 当前区块高度，如果无法获取则返回 0
 */
const getCurrentBlockHeight = async (
    scope: RuntimeScope,
    contract: ContractName,
): Promise<number> => {
    try {
        // 查询最新的事件（limit=1, offset=0）来获取当前区块高度
        // 注意：这里查询的是最新的事件，所以 offset=0 表示从最新开始
        const latestEventResult = await fetchRuntimeContractEvents({
            scope,
            contract,
            limit: 1,
            offset: 0,
            batchSize: 1,
            maxPages: 1,
            useEvmSignatureFilter: true,
        })

        // 如果获取到了事件，使用最新事件的 round 作为当前区块高度
        if (latestEventResult.rawEvents.length > 0) {
            const latestEvent = latestEventResult.rawEvents[0]
            const blockHeight = latestEvent.round ?? 0
            return blockHeight
        }

        // 如果没有事件，返回 0
        return 0
    } catch (error) {
        console.warn(
            `⚠️  获取当前区块高度失败:`,
            error instanceof Error ? error.message : String(error),
        )
        return 0
    }
}

/**
 * 记录脚本开始时的区块高度
 * 应该在脚本开始时调用一次，避免在脚本运行期间产生的新事件被遗漏
 * 
 * @param scope - 运行时范围
 * @param contract - 合约名称（用于构建 cursor key）
 */
export const recordStartBlockHeight = async (
    scope: RuntimeScope,
    contract: ContractName,
): Promise<void> => {
    const cursorKey = buildCursorKey(scope, contract)
    const currentCursor = await getSyncCursor(cursorKey)

    // 获取当前区块高度（通过查询 TruthBox 合约的最新事件）
    const startBlockHeight = await getCurrentBlockHeight(scope, contract)

    if (startBlockHeight > 0) {
        // 创建起始 cursor（用于记录脚本开始时的区块高度）
        const startCursor: SyncCursor = {
            lastBlock: startBlockHeight,
            lastLogIndex: 0,
            lastTimestamp: new Date().toISOString(),
            lastEventId: '',
        }

        // 立即保存起始区块高度到 syncState.json
        // 这样即使脚本中途失败，下次也会从这个区块开始查询
        await updateSyncCursor(cursorKey, startCursor)
        console.log(
            `📌 已记录起始区块高度: ${startBlockHeight} (脚本开始时的区块高度，上次: ${currentCursor.lastBlock})`,
        )
    } else {
        console.log(
            `ℹ️  无法确定当前区块高度，将使用上次保存的区块高度: ${currentCursor.lastBlock}`,
        )
    }
}

