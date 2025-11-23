import { ContractAddresses, ContractName } from '../types';
import deployedAddresses from '../chain-23295/deployed_addresses.json';

/**
 * Sapphire Testnet (23295) 合约地址配置
 * 只包含同步脚本需要的核心合约地址
 */
export const TESTNET_ADDRESSES: ContractAddresses = {
  // 核心合约（同步脚本需要的合约）
  [ContractName.TRUTH_NFT]: {
    address: deployedAddresses['TruthNFT_Proxy'] as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.EXCHANGE]: {
    address: deployedAddresses['Exchange_Proxy'] as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.FUND_MANAGER]: {
    address: deployedAddresses['FundManager_Proxy'] as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.TRUTH_BOX]: {
    address: deployedAddresses['TruthBox_Proxy'] as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.USER_ID]: {
    address: deployedAddresses['UserId_Proxy'] as `0x${string}`,
    startBlock: 14458354,
  },
};
