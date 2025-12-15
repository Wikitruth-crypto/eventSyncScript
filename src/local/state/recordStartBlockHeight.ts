/**
 * Record the block height at the start of the script (local debugging tool)
 * Should not be used in production environment (GitHub Actions)
 * 
 * This is a standalone feature, should be called once at the start of the script
 * This can avoid new events generated during the script runtime (possibly minutes) being missed
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
 * Get the current block height (by querying the latest event of the TruthBox contract)
 * @param scope - Runtime scope
 * @param contract - Contract name
 * @returns Current block height, if unable to get, return 0
 */
const getCurrentBlockHeight = async (
    scope: RuntimeScope,
    contract: ContractName,
): Promise<number> => {
    try {
        // Query the latest event (limit=1, offset=0) to get the current block height
        // Note: Here we query the latest event, so offset=0 means start from the latest
        const latestEventResult = await fetchRuntimeContractEvents({
            scope,
            contract,
            limit: 1,
            offset: 0,
            batchSize: 1,
            maxPages: 1,
            useEvmSignatureFilter: true,
        })

        // If an event is obtained, use the round of the latest event as the current block height
        if (latestEventResult.rawEvents.length > 0) {
            const latestEvent = latestEventResult.rawEvents[0]
            const blockHeight = latestEvent.round ?? 0
            return blockHeight
        }

        // If no event is obtained, return 0
        return 0
    } catch (error) {
        console.warn(
            `⚠️  Failed to get current block height:`,
            error instanceof Error ? error.message : String(error),
        )
        return 0
    }
}

/**
 * Record the block height at the start of the script
 * Should be called once at the start of the script to avoid new events generated during the script runtime being missed
 * 
 * @param scope - Runtime scope
 * @param contract - Contract name (used to build cursor key)
 */
export const recordStartBlockHeight = async (
    scope: RuntimeScope,
    contract: ContractName,
): Promise<void> => {
    const cursorKey = buildCursorKey(scope, contract)
    const currentCursor = await getSyncCursor(cursorKey)

    // Get the current block height (by querying the latest event of the TruthBox contract)
    const startBlockHeight = await getCurrentBlockHeight(scope, contract)

    if (startBlockHeight > 0) {
        // Create start cursor (used to record the block height at the start of the script)
        const startCursor: SyncCursor = {
            lastBlock: startBlockHeight,
            lastLogIndex: 0,
            lastTimestamp: new Date().toISOString(),
            lastEventId: '',
        }

        // Immediately save the start block height to syncState.json
        // This way, even if the script fails in the middle, the next time will start from this block
        await updateSyncCursor(cursorKey, startCursor)
        console.log(
            `📌 Start block height recorded: ${startBlockHeight} (the block height at the start of the script, last: ${currentCursor.lastBlock})`,
        )
    } else {
        console.log(
            `ℹ️  Unable to determine the current block height, will use the last saved block height: ${currentCursor.lastBlock}`,
        )
    }
}

