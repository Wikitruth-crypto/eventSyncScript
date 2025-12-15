

export const IPFS_CONFIG = {
    /** Maximum retry times */
    MAX_RETRIES: 3,

    /** Retry base delay (milliseconds) */
    RETRY_DELAY_BASE: 2000,

    /** Fetch timeout (milliseconds) */
    FETCH_TIMEOUT: 30000,
} as const


export const IPFS_GATEWAY_CONFIG = {
    /** Health check interval (milliseconds) */
    HEALTH_CHECK_INTERVAL: 15 * 60 * 1000, 

    /** Maximum failure times */
    MAX_FAILURES: 3,

    /** Gateway health check timeout (milliseconds) */
    TIMEOUT: 5000, 

    /** Cache duration (milliseconds) */
    CACHE_DURATION: 15 * 60 * 1000, 
} as const


export const IPFS_GATEWAY_URLS = [
    'https://ipfs.io/ipfs/{cid}',
    'https://gateway.pinata.cloud/ipfs/{cid}',
    'https://cloudflare-ipfs.com/ipfs/{cid}',
    'https://dweb.link/ipfs/{cid}',
] as const

