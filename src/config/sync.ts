import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import path from 'node:path'

/**
 * 事件同步相关配置
 */

/**
 * 默认查询范围
 */
export const DEFAULT_SCOPE: RuntimeScope = {
    network: (process.env.EVENT_SYNC_NETWORK as RuntimeScope['network']) ?? 'testnet',
    layer: (process.env.EVENT_SYNC_LAYER as RuntimeScope['layer']) ?? 'sapphire',
}

/**
 * 事件查询配置
 */
export const EVENT_QUERY_CONFIG = {
    /** 默认查询限制 */
    DEFAULT_LIMIT: 500,

    /** 默认批次大小 */
    DEFAULT_BATCH_SIZE: 100,
} as const

/**
 * 同步状态配置
 */
export const SYNC_STATE_CONFIG = {
    /** 状态文件目录 */
    STATE_DIR: process.env.EVENT_SYNC_STATE_DIR ?? path.join('data', 'state'),

    /** 状态文件名 */
    STATE_FILE: process.env.EVENT_SYNC_STATE_FILE ?? 'syncState.json',

    /** 默认起始区块 */
    DEFAULT_START_BLOCK: Number(process.env.EVENT_SYNC_START_BLOCK ?? 0),
} as const

/**
 * 输出配置
 */
export const OUTPUT_CONFIG = {
    // 原始事件输出目录
    OUTPUT_DIR_RAW_EVENTS: process.env.EVENT_SYNC_OUTPUT_DIR_RAW_EVENTS ?? 'data/rawEvents',
    // 解码后事件输出目录
    OUTPUT_DIR_DECODED_EVENTS: process.env.EVENT_SYNC_OUTPUT_DIR_DECODED_EVENTS ?? 'data/decodedEvents',
} as const

