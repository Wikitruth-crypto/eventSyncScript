/**
 * 代理配置
 * 可以通过环境变量 EVENT_SYNC_USE_PROXY 控制是否启用代理
 * 设置为 'true' 或 '1' 时启用代理，否则禁用
 * 在 GitHub Actions 等 CI/CD 环境中通常不需要代理，应设置为 false 或不设置
 */

/**
 * 检查是否应该使用代理
 * 可以通过环境变量 EVENT_SYNC_USE_PROXY 控制（设置为 'true' 或 '1' 时启用）
 * @returns 是否应该使用代理
 */
export const shouldUseProxy = (): boolean => {
  const envValue = process.env.EVENT_SYNC_USE_PROXY || 'false'
  return envValue === 'true' || envValue === '1'
}

/**
 * 代理配置
 */
export const PROXY_CONFIG = {
  /** HTTP 代理地址 */
  HTTP_PROXY: process.env.HTTP_PROXY,
  
  /** HTTPS 代理地址 */
  HTTPS_PROXY: process.env.HTTPS_PROXY,
} as const

/**
 * 获取代理 URL（优先使用 HTTPS_PROXY，其次 HTTP_PROXY）
 */
export const getProxyUrl = (): string | undefined => {
  if (!shouldUseProxy()) {
    return undefined
  }
  return PROXY_CONFIG.HTTPS_PROXY || PROXY_CONFIG.HTTP_PROXY
}

/**
 * 检查是否配置了代理
 */
export const isProxyConfigured = (): boolean => {
  return shouldUseProxy() && Boolean(getProxyUrl())
}

