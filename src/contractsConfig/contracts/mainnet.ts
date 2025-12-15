import { ContractAddresses } from '../types';
import { TESTNET_ADDRESSES } from './testnet';

/**
 * Sapphire Mainnet (23294) contract address configuration
 * 
 * ⚠️ Important Note:
 * The contracts have not been deployed to the mainnet yet, so we are using the Testnet configuration as a fallback.
 * Once the contracts are deployed to the mainnet, please update this configuration to the actual mainnet addresses.
 */
export const MAINNET_ADDRESSES: ContractAddresses = {
  ...TESTNET_ADDRESSES, // Currently using Testnet configuration as a fallback
};
