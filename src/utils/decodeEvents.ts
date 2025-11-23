/**
 * 通用事件解码工具
 * 支持多个合约的事件解码
 */

import type { RuntimeEvent } from '../oasisQuery/oasis-nexus/api'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { ContractName } from '../contractsConfig/types'
import { getContractEventSignatures } from '../contractsConfig/eventSignatures/events'
import { decodeRuntimeEvents, type DecodedRuntimeEvent } from '../oasisQuery/app/services/events'
import { NETWORK_CONTRACTS } from '../contractsConfig/contracts'
import { SupportedChainId } from '../contractsConfig/types'

/**
 * 解析合约地址（复用现有的逻辑）
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
 * 解码单个合约的事件
 */
export const decodeContractEvents = <TArgs = Record<string, unknown>>(
    rawEvents: RuntimeEvent[],
    contractName: ContractName,
    scope: RuntimeScope,
): DecodedRuntimeEvent<TArgs>[] => {
    // 解析合约地址
    const contractAddress = resolveContractAddress(scope, contractName)
    if (!contractAddress) {
        console.warn(`⚠️  无法解析合约地址: ${contractName} (${scope.network}/${scope.layer})`)
        return []
    }

    // 获取事件签名
    const eventSignatures = getContractEventSignatures(contractName)
    if (!eventSignatures || eventSignatures.length === 0) {
        console.warn(`⚠️  合约 ${contractName} 没有事件签名配置`)
        return []
    }

    // 解码事件
    return decodeRuntimeEvents<TArgs>(rawEvents, {
        contractAddress,
        eventSignatures,
    })
}

/**
 * 解码多个合约的事件（自动识别合约）
 * 如果提供了合约名称，只解码该合约的事件
 * 如果没有提供，会尝试所有配置的合约
 */
export const decodeMultiContractEvents = <TArgs = Record<string, unknown>>(
    rawEvents: RuntimeEvent[],
    scope: RuntimeScope,
    contractName?: ContractName,
): Array<DecodedRuntimeEvent<TArgs> & { contract: ContractName }> => {
    const results: Array<DecodedRuntimeEvent<TArgs> & { contract: ContractName }> = []

    if (contractName) {
        // 只解码指定合约的事件
        const decoded = decodeContractEvents<TArgs>(rawEvents, contractName, scope)
        results.push(...decoded.map(event => ({ ...event, contract: contractName })))
    } else {
        // 尝试解码所有配置的合约
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

