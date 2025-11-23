import { CONTRACT_EVENT_SIGNATURES } from './events';
import { ContractName } from '../types';

/**
 * 所有事件签名的扁平数组
 * 用于向后兼容和测试
 * 
 * @deprecated 推荐使用 CONTRACT_EVENT_SIGNATURES 按合约获取事件签名
 */
export const EVENT_SIGNATURES = [
  ...CONTRACT_EVENT_SIGNATURES[ContractName.EXCHANGE],
  ...CONTRACT_EVENT_SIGNATURES[ContractName.FUND_MANAGER],
  ...CONTRACT_EVENT_SIGNATURES[ContractName.TRUTH_BOX],
  ...CONTRACT_EVENT_SIGNATURES[ContractName.USER_ID],
  ...CONTRACT_EVENT_SIGNATURES[ContractName.TRUTH_NFT],
] as const;

