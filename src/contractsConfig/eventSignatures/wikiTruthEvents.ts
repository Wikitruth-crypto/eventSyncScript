import { CONTRACT_EVENT_SIGNATURES } from './events';
import { ContractName } from '../types';

export const EVENT_SIGNATURES = [
  ...CONTRACT_EVENT_SIGNATURES[ContractName.EXCHANGE],
  ...CONTRACT_EVENT_SIGNATURES[ContractName.FUND_MANAGER],
  ...CONTRACT_EVENT_SIGNATURES[ContractName.TRUTH_BOX],
  ...CONTRACT_EVENT_SIGNATURES[ContractName.USER_ID],
  ...CONTRACT_EVENT_SIGNATURES[ContractName.TRUTH_NFT],
] as const;

