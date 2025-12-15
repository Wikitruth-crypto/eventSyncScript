import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import path from 'node:path'

/**
 * Event synchronization related configuration
 */

/**
 * Default query scope
 */
export const DEFAULT_SCOPE: RuntimeScope = {
    network: (process.env.EVENT_SYNC_NETWORK as RuntimeScope['network']) ?? 'testnet',
    layer: (process.env.EVENT_SYNC_LAYER as RuntimeScope['layer']) ?? 'sapphire',
}

/**
 * Event query configuration
 */
export const EVENT_QUERY_CONFIG = {
    /** Default query limit */
    DEFAULT_LIMIT: 500,

    /** Default batch size */
    DEFAULT_BATCH_SIZE: 100,
} as const

/**
 * Sync state configuration
 */
export const SYNC_STATE_CONFIG = {
    /** State file directory */
    STATE_DIR: process.env.EVENT_SYNC_STATE_DIR ?? path.join('data', 'state'),

    /** State file name */
    STATE_FILE: process.env.EVENT_SYNC_STATE_FILE ?? 'syncState.json',

    /** Default starting block */
    DEFAULT_START_BLOCK: Number(process.env.EVENT_SYNC_START_BLOCK ?? 0),
} as const

/**
 * Output configuration
 */
export const OUTPUT_CONFIG = {
    // Raw events output directory
    OUTPUT_DIR_RAW_EVENTS: process.env.EVENT_SYNC_OUTPUT_DIR_RAW_EVENTS ?? 'data/rawEvents',
    // Decoded events output directory
    OUTPUT_DIR_DECODED_EVENTS: process.env.EVENT_SYNC_OUTPUT_DIR_DECODED_EVENTS ?? 'data/decodedEvents',
} as const

