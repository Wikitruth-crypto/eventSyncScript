/**
 * Event name to database table field mapping configuration
 * 
 * Used to centrally manage event to database field mapping relationships
 * Format: event name -> { table: [field name list] }
 */

export interface EventToTableFields {
    table: string
    fields: string[]
    operation?: 'insert' | 'update' | 'upsert' // Operation type, defaults to update
}

/**
 * Event name to table field mapping
 */
export const EVENT_TO_TABLE_FIELDS: Record<string, EventToTableFields[]> = {
    // ========== TruthBox Contract Events ==========
    BoxCreated: [
        {
            table: 'boxes',
            fields: [
                'id',
                'token_id',
                'minter_id',
                'owner_address',
                'status',
                'price',
                'deadline',
                'create_timestamp',
                'box_info_cid',
            ],
            operation: 'upsert',
        },
    ],

    BoxStatusChanged: [
        {
            table: 'boxes',
            fields: ['status', 'listed_mode', 'publish_timestamp'],
            operation: 'update',
        },
    ],

    PriceChanged: [
        {
            table: 'boxes',
            fields: ['price'],
            operation: 'update',
        },
    ],

    DeadlineChanged: [
        {
            table: 'boxes',
            fields: ['deadline'],
            operation: 'update',
        },
    ],

    PrivateKeyPublished: [
        {
            table: 'boxes',
            fields: ['private_key', 'publisher_id'],
            operation: 'update',
        },
    ],

    // ========== Exchange Contract Events ==========
    BoxListed: [
        {
            table: 'boxes',
            fields: ['seller_id', 'listed_timestamp', 'accepted_token'],
            operation: 'update',
        },
    ],

    BoxPurchased: [
        {
            table: 'boxes',
            fields: ['buyer_id', 'purchase_timestamp'],
            operation: 'update',
        },
    ],

    BidPlaced: [
        {
            table: 'box_bidders',
            fields: ['id', 'bidder_id'],
            operation: 'upsert',
        },
        {
            table: 'boxes',
            fields: ['purchase_timestamp'],
            operation: 'update',
        },
    ],

    CompleterAssigned: [
        {
            table: 'boxes',
            fields: ['completer_id', 'complete_timestamp'],
            operation: 'update',
        },
    ],

    RequestDeadlineChanged: [
        {
            table: 'boxes',
            fields: ['request_refund_deadline'],
            operation: 'update',
        },
    ],

    ReviewDeadlineChanged: [
        {
            table: 'boxes',
            fields: ['review_deadline'],
            operation: 'update',
        },
    ],

    RefundPermitChanged: [
        {
            table: 'boxes',
            fields: ['refund_permit'],
            operation: 'update',
        },
    ],

    // ========== FundManager Contract Events ==========
    OrderAmountPaid: [
        {
            table: 'payments',
            fields: ['id', 'box_id', 'user_id', 'token', 'amount', 'timestamp', 'transaction_hash', 'block_number'],
            operation: 'insert',
        },
    ],

    OrderAmountWithdraw: [
        {
            table: 'withdraws',
            fields: ['id', 'token', 'box_list', 'user_id', 'amount', 'timestamp', 'withdraw_type', 'transaction_hash', 'block_number'],
            operation: 'insert',
        },
    ],

    RewardAmountAdded: [
        {
            table: 'rewards_addeds',
            fields: ['id', 'box_id', 'token', 'amount', 'reward_type', 'timestamp', 'transaction_hash', 'block_number'],
            operation: 'insert',
        },
    ],

    HelperRewrdsWithdraw: [
        {
            table: 'withdraws',
            fields: ['id', 'token', 'box_list', 'user_id', 'amount', 'timestamp', 'withdraw_type', 'transaction_hash', 'block_number'],
            operation: 'insert',
        },
    ],

    MinterRewardsWithdraw: [
        {
            table: 'withdraws',
            fields: ['id', 'token', 'box_list', 'user_id', 'amount', 'timestamp', 'withdraw_type', 'transaction_hash', 'block_number'],
            operation: 'insert',
        },
    ],

    // ========== TruthNFT Contract Events ==========
    Transfer: [
        {
            table: 'boxes',
            fields: ['owner_address'],
            operation: 'update',
        },
        {
            table: 'user_addresses',
            fields: ['id'],
            operation: 'upsert',
        },
    ],

    // ========== UserId Contract Events ==========
    Blacklist: [
        {
            table: 'user_addresses',
            fields: ['id', 'is_blacklisted'],
            operation: 'upsert',
        },
    ],
}

/**
 * Get table field mapping for an event
 * @param eventName - Event name
 * @returns Table field mapping array, returns empty array if event doesn't exist
 */
export const getEventTableFields = (eventName: string): EventToTableFields[] => {
    return EVENT_TO_TABLE_FIELDS[eventName] || []
}

/**
 * Check if event has mapping configuration
 * @param eventName - Event name
 * @returns Whether mapping configuration exists
 */
export const hasEventMapping = (eventName: string): boolean => {
    return eventName in EVENT_TO_TABLE_FIELDS
}

