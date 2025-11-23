/**
 * IPFS 相关配置
 */

/**
 * IPFS Metadata 获取配置
 */
export const IPFS_CONFIG = {
    /** 最大重试次数 */
    MAX_RETRIES: 3,

    /** 重试基础延迟（毫秒） */
    RETRY_DELAY_BASE: 2000,

    /** 获取超时时间（毫秒） */
    FETCH_TIMEOUT: 30000,
} as const

/**
 * IPFS 网关配置
 */
export const IPFS_GATEWAY_CONFIG = {
    /** 健康检查间隔（毫秒） */
    HEALTH_CHECK_INTERVAL: 15 * 60 * 1000, // 15分钟

    /** 最大失败次数 */
    MAX_FAILURES: 3,

    /** 网关健康检查超时（毫秒） */
    TIMEOUT: 5000, // 5秒

    /** 缓存持续时间（毫秒） */
    CACHE_DURATION: 15 * 60 * 1000, // 15分钟
} as const

/**
 * IPFS 网关 URL 模板
 */
export const IPFS_GATEWAY_URLS = [
    'https://ipfs.io/ipfs/{cid}',
    'https://gateway.pinata.cloud/ipfs/{cid}',
    'https://cloudflare-ipfs.com/ipfs/{cid}',
    'https://dweb.link/ipfs/{cid}',
] as const

