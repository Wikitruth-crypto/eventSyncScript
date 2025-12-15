/**
 * Universal event decoding utility
 * Supports event decoding for multiple contracts
 */

import type { RuntimeEvent } from '../oasisQuery/oasis-nexus/api'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { ContractName } from '../contractsConfig/types'
import { getContractEventSignatures } from '../contractsConfig/eventSignatures/events'
import { decodeRuntimeEvents, type DecodedRuntimeEvent } from '../oasisQuery/app/services/events'
import { NETWORK_CONTRACTS } from '../contractsConfig/contracts'
import { SupportedChainId } from '../contractsConfig/types'

/**
 * Resolve contract address (reuse existing logic)
 */
const resolveContractAddress = (
    scope: RuntimeScope,
    contractName: ContractName,
): `0x${string}` | null => {
    const networkToChainId: Partial<Record<RuntimeScope['network'], SupportedChainId>> = {
        testnet: SupportedChainId.SAPPHIRE_TESTNET,
        mainnet: SupportedChainId.SAPPHIRE_MAINNET,
    }

    const chainId = networkToChainId[scope.network]
    if (!chainId) {
        return null
    }

    const contractConfig = NETWORK_CONTRACTS[chainId]?.[contractName]
    return contractConfig?.address ?? null
}

/**
 * Decode events for a single contract
 */
export const decodeContractEvents = <TArgs = Record<string, unknown>>(
    rawEvents: RuntimeEvent[],
    contractName: ContractName,
    scope: RuntimeScope,
): DecodedRuntimeEvent<TArgs>[] => {
    // Resolve contract address
    const contractAddress = resolveContractAddress(scope, contractName)
    if (!contractAddress) {
        console.warn(`⚠️  Unable to resolve contract address: ${contractName} (${scope.network}/${scope.layer})`)
        return []
    }

    // Get event signatures
    const eventSignatures = getContractEventSignatures(contractName)
    if (!eventSignatures || eventSignatures.length === 0) {
        console.warn(`⚠️  Contract ${contractName} has no event signature configuration`)
        return []
    }

    // Decode events
    return decodeRuntimeEvents<TArgs>(rawEvents, {
        contractAddress,
        eventSignatures,
    })
}

/**
 * Decode events for multiple contracts (auto-identify contracts)
 * If contract name is provided, only decode events for that contract
 * If not provided, will try all configured contracts
 */
export const decodeMultiContractEvents = <TArgs = Record<string, unknown>>(
    rawEvents: RuntimeEvent[],
    scope: RuntimeScope,
    contractName?: ContractName,
): Array<DecodedRuntimeEvent<TArgs> & { contract: ContractName }> => {
    const results: Array<DecodedRuntimeEvent<TArgs> & { contract: ContractName }> = []

    if (contractName) {
        // Only decode events for specified contract
        const decoded = decodeContractEvents<TArgs>(rawEvents, contractName, scope)
        results.push(...decoded.map(event => ({ ...event, contract: contractName })))
    } else {
        // Try decoding all configured contracts
        const contractsToTry: ContractName[] = [
            ContractName.TRUTH_BOX,
            ContractName.EXCHANGE,
            ContractName.FUND_MANAGER,
            ContractName.USER_ID,
            ContractName.TRUTH_NFT,
        ]

        for (const contract of contractsToTry) {
            const decoded = decodeContractEvents<TArgs>(rawEvents, contract, scope)
            results.push(...decoded.map(event => ({ ...event, contract })))
        }
    }

    return results
}

