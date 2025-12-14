/**
 * 事件名称与数据库表字段的映射配置
 * 
 * 用于统一管理事件到数据库字段的映射关系
 * 格式：事件名称 -> { 表名: [字段名列表] }
 */

export interface EventToTableFields {
    table: string
    fields: string[]
    operation?: 'insert' | 'update' | 'upsert' // 操作类型，默认为 update
}

/**
 * 事件名称到表字段的映射
 */
export const EVENT_TO_TABLE_FIELDS: Record<string, EventToTableFields[]> = {
    // ========== TruthBox 合约事件 ==========
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

    // ========== Exchange 合约事件 ==========
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

    // ========== FundManager 合约事件 ==========
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

    // ========== TruthNFT 合约事件 ==========
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

    // ========== UserId 合约事件 ==========
    Blacklist: [
        {
            table: 'user_addresses',
            fields: ['id', 'is_blacklisted'],
            operation: 'upsert',
        },
    ],
}

/**
 * 获取事件对应的表字段映射
 * @param eventName - 事件名称
 * @returns 表字段映射数组，如果事件不存在则返回空数组
 */
export const getEventTableFields = (eventName: string): EventToTableFields[] => {
    return EVENT_TO_TABLE_FIELDS[eventName] || []
}

/**
 * 检查事件是否存在映射配置
 * @param eventName - 事件名称
 * @returns 是否存在映射配置
 */
export const hasEventMapping = (eventName: string): boolean => {
    return eventName in EVENT_TO_TABLE_FIELDS
}

