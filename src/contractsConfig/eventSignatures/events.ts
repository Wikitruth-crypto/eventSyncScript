import { ContractName } from '../types';

/**
 * 事件签名配置
 * 每个合约对应的事件签名列表（用于解码事件）
 * 
 * 注意：
 * - 用于解码时，需要包含完整的 Solidity 事件声明格式（包含 indexed 关键字和参数名）
 * - 用于 Nexus API 查询时，需要去除 indexed 关键字和参数名，只保留类型
 */
export const CONTRACT_EVENT_SIGNATURES: Record<ContractName, string[]> = {
    [ContractName.EXCHANGE]: [
        'event BoxListed(uint256 indexed boxId, uint256 indexed userId, address acceptedToken)',
        'event BoxPurchased(uint256 indexed boxId, uint256 indexed userId)',
        'event BidPlaced(uint256 indexed boxId, uint256 indexed userId)',
        'event CompleterAssigned(uint256 indexed boxId, uint256 indexed userId)',
        'event RequestDeadlineChanged(uint256 indexed boxId, uint256 deadline)',
        'event ReviewDeadlineChanged(uint256 indexed boxId, uint256 deadline)',
        'event RefundPermitChanged(uint256 indexed boxId, bool permission)',
    ],

    [ContractName.FUND_MANAGER]: [
        'event OrderAmountPaid(uint256 indexed boxId, uint256 indexed userId, address indexed token, uint256 amount)',
        'event OrderAmountWithdraw(uint256[] list, address indexed token, uint256 indexed userId, uint256 amount, uint8 fundsType)',
        'event RewardAmountAdded(uint256 indexed boxId, address indexed token, uint256 amount, uint8 rewardType)',
        'event HelperRewrdsWithdraw(uint256 indexed userId, address indexed token, uint256 amount)',
        'event MinterRewardsWithdraw(uint256 indexed userId, address indexed token, uint256 amount)',
    ],

    // TruthBox 合约事件
    // 注意：同时支持旧合约和新合约的事件签名
    // 旧合约：BoxCreated(uint256 indexed boxId, uint256 indexed userId) + BoxInfoChanged(uint256 indexed boxId, string boxInfoCID)
    // 新合约：BoxCreated(uint256 indexed boxId, uint256 indexed userId, string boxInfoCID)
    [ContractName.TRUTH_BOX]: [
        // 新合约事件（代理合约）
        'event BoxCreated(uint256 indexed boxId, uint256 indexed userId, string boxInfoCID)',
        // 旧合约事件（兼容旧数据）
        'event BoxCreated(uint256 indexed boxId, uint256 indexed userId)',
        'event BoxInfoChanged(uint256 indexed boxId, string boxInfoCID)',
        // 通用事件
        'event BoxStatusChanged(uint256 indexed boxId, uint8 status)',
        'event PriceChanged(uint256 indexed boxId, uint256 price)',
        'event DeadlineChanged(uint256 indexed boxId, uint256 deadline)',
        'event PrivateKeyPublished(uint256 indexed boxId, bytes privateKey, uint256 indexed userId)',
    ],

    [ContractName.USER_ID]: [
        'event Blacklist(address user, bool status)',
    ],

    [ContractName.TRUTH_NFT]: [
        'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
    ],

    // 其他合约（同步脚本不需要，但保留空数组以保持类型一致）
    [ContractName.ADDRESS_MANAGER]: [],
    [ContractName.SIWE_AUTH]: [],
    [ContractName.OFFICIAL_TOKEN]: [],
    [ContractName.OFFICIAL_TOKEN_SECRET]: [],
    [ContractName.WROSE_SECRET]: [],
    [ContractName.ERC20_SECRET]: [],
};

/**
 * 获取指定合约的所有事件签名
 * @param contractName - 合约名称
 * @returns 事件签名数组
 */
export function getContractEventSignatures(contractName: ContractName): string[] {
    return CONTRACT_EVENT_SIGNATURES[contractName] || [];
}

/**
 * 获取所有需要同步的合约及其事件签名
 * @returns 合约名称到事件签名数组的映射
 */
export function getAllSyncContracts(): Record<string, string[]> {
    const syncContracts: Record<string, string[]> = {};

    // 只返回有事件的合约
    Object.entries(CONTRACT_EVENT_SIGNATURES).forEach(([contractName, signatures]) => {
        if (signatures.length > 0) {
            syncContracts[contractName] = signatures;
        }
    });

    return syncContracts;
}
