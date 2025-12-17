import { ContractName } from '../types';


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
        'event RewardsAdded(uint256 indexed boxId, address indexed token, uint256 amount, uint8 rewardType)',
        'event HelperRewrdsWithdraw(uint256 indexed userId, address indexed token, uint256 amount)',
        'event MinterRewardsWithdraw(uint256 indexed userId, address indexed token, uint256 amount)',
    ],

    [ContractName.TRUTH_BOX]: [
        'event BoxCreated(uint256 indexed boxId, uint256 indexed userId, string boxInfoCID)',
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

    // Other contracts (not needed for sync script, but keep empty arrays to maintain type consistency)
    [ContractName.ADDRESS_MANAGER]: [],
    [ContractName.SIWE_AUTH]: [],
    [ContractName.OFFICIAL_TOKEN]: [],
    [ContractName.OFFICIAL_TOKEN_SECRET]: [],
    [ContractName.WROSE_SECRET]: [],
    [ContractName.ERC20_SECRET]: [],
};

/**
 * Get all event signatures for a specified contract
 * @param contractName - Contract name
 * @returns Event signatures array
 */
export function getContractEventSignatures(contractName: ContractName): string[] {
    return CONTRACT_EVENT_SIGNATURES[contractName] || [];
}

/**
 * Get all contracts to sync and their event signatures
 * @returns Mapping of contract name to event signatures array
 */
export function getAllSyncContracts(): Record<string, string[]> {
    const syncContracts: Record<string, string[]> = {};

    // Only return contracts with events
    Object.entries(CONTRACT_EVENT_SIGNATURES).forEach(([contractName, signatures]) => {
        if (signatures.length > 0) {
            syncContracts[contractName] = signatures;
        }
    });

    return syncContracts;
}
