import { ContractAddresses } from '../types';
import { TESTNET_ADDRESSES } from './testnet';

/**
 * Sapphire Mainnet (23293) 合约地址配置
 * 
 * ⚠️ 重要说明：
 * 当前合约尚未部署到主网，暂时使用 Testnet 的配置作为 fallback。
 * 主网合约部署后，请更新此配置为实际的主网地址。
 */
export const MAINNET_ADDRESSES: ContractAddresses = {
  ...TESTNET_ADDRESSES, // 暂时使用 Testnet 配置
};
