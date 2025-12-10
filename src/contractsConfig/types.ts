
/**
 * 合约名称枚举
 */
export enum ContractName {
  // 核心合约
  TRUTH_BOX = 'TRUTH_BOX',
  EXCHANGE = 'EXCHANGE',
  FUND_MANAGER = 'FUND_MANAGER',
  TRUTH_NFT = 'TRUTH_NFT',
  USER_ID = 'USER_ID',
  
  // 其他合约（同步脚本可能不需要，但保留以保持兼容）
  ADDRESS_MANAGER = 'ADDRESS_MANAGER',
  SIWE_AUTH = 'SIWE_AUTH',
  OFFICIAL_TOKEN = 'OFFICIAL_TOKEN',
  OFFICIAL_TOKEN_SECRET = 'OFFICIAL_TOKEN_SECRET',
  WROSE_SECRET = 'WROSE_SECRET',
  ERC20_SECRET = 'ERC20_SECRET',
}

/**
 * 支持的链ID
 */
export enum SupportedChainId {
  SAPPHIRE_TESTNET = 23295,
  SAPPHIRE_MAINNET = 23293,
}

/**
 * 单个合约的详细信息
 */
export type ContractInfo = {
  address: `0x${string}`;
  startBlock: number;
};

/**
 * 合约地址映射（按合约名称）
 */
export type ContractAddresses = {
  [key in ContractName]?: ContractInfo;
};

/**
 * 网络合约地址映射（按链ID）
 */
export type NetworkContractMap = {
  [chainId in SupportedChainId]: ContractAddresses;
};

/**
 * 事件签名配置
 * 每个合约对应一个事件签名数组
 */
export type ContractEventSignatures = {
  [contractName: string]: string[];
};

