
// import { SupportedChainId } from "./types";
import type { RuntimeScope } from '../oasisQuery/types/searchScope'


export interface ProtocolConstants {
    initialPrivacyPeriod: number; // The initial privacy period for minting (seconds)
    saleValidityPeriod: number; // The validity period for selling (seconds)
    initialAuctionPeriod: number; // The initial auction period after setting the auction (seconds)
    bidExtensionPeriod: number; // The time added for each auction (seconds)
    postCompletionPrivacyPeriod: number; // The privacy period added after the transaction is completed (seconds)

    refundRequestPeriod: number; // The buyer's refund request period (seconds)
    refundReviewPeriod: number; // The DAO's review period for refunds (seconds)
    
    deadlineExtensionWindow: number; // The time window for extending the deadline within the deadline (seconds)
    minterPrivacyExtension: number; // The maximum privacy period that the minter can extend for each unsold box (seconds)
    confidentialityFeeExtensionPeriod: number; // The privacy period that the buyer can extend by paying a confidentiality fee after the transaction is completed (seconds)

    bidIncrementRate: number; // The increment rate for each bid (%)
    incrementRate: number; // The increment rate for the buyer's confidentiality fee (%)
    serviceFeeRate: number; // The transaction fee rate (%)
    helperRewardRate: number; // The reward rate for other operators (%)
}


export const SAPPHIRE_TESTNET: ProtocolConstants = {
    initialPrivacyPeriod: 15 * 24 * 3600,  
    saleValidityPeriod: 15 * 24 * 3600, 
    initialAuctionPeriod: 5 * 24 * 3600, 
    bidExtensionPeriod: 5 * 24 * 3600,
    postCompletionPrivacyPeriod: 5 * 24 * 3600, 

    refundRequestPeriod: 7 * 24 * 3600, 
    refundReviewPeriod: 7 * 24 * 3600,

    deadlineExtensionWindow: 3 * 24 * 3600,
    minterPrivacyExtension: 15 * 24 * 3600, 
    confidentialityFeeExtensionPeriod: 15 * 24 * 3600, 

    bidIncrementRate: 110, 
    incrementRate: 200, 
    serviceFeeRate: 3, 
    helperRewardRate: 1, 
};


export const SAPPHIRE_MAINNET: ProtocolConstants = {
    initialPrivacyPeriod: 365 * 24 * 3600,
    saleValidityPeriod: 365 * 24 * 3600,
    initialAuctionPeriod: 30 * 24 * 3600,
    bidExtensionPeriod: 30 * 24 * 3600,
    postCompletionPrivacyPeriod: 30 * 24 * 3600,

    refundRequestPeriod: 7 * 24 * 3600,
    refundReviewPeriod: 15 * 24 * 3600,

    deadlineExtensionWindow: 30 * 24 * 3600,
    minterPrivacyExtension: 365 * 24 * 3600,
    confidentialityFeeExtensionPeriod: 365 * 24 * 3600,

    bidIncrementRate: 110,
    incrementRate: 200,
    serviceFeeRate: 3,
    helperRewardRate: 1, 
};


export function getProtocolConstants(scope: RuntimeScope): ProtocolConstants {
    if (scope.network === 'testnet' && scope.layer === 'sapphire') return SAPPHIRE_TESTNET;
    if (scope.network === 'mainnet' && scope.layer === 'sapphire') return SAPPHIRE_MAINNET;
    return SAPPHIRE_TESTNET;
}

