/**
 * Proxy configuration
 * Can be controlled by environment variable EVENT_SYNC_USE_PROXY (set to 'true' or '1' to enable)
 * @returns Whether to use proxy
 */
export const shouldUseProxy = (): boolean => {
  const envValue = process.env.EVENT_SYNC_USE_PROXY || 'false'
  return envValue === 'true' || envValue === '1'
}

/**
 * Proxy configuration
 */
export const PROXY_CONFIG = {
  /** HTTP proxy address */
  HTTP_PROXY: process.env.HTTP_PROXY,
  
  /** HTTPS proxy address */
  HTTPS_PROXY: process.env.HTTPS_PROXY,
} as const

/**
 * Get proxy URL (prefer HTTPS_PROXY, then HTTP_PROXY)
 */
export const getProxyUrl = (): string | undefined => {
  if (!shouldUseProxy()) {
    return undefined
  }
  return PROXY_CONFIG.HTTPS_PROXY || PROXY_CONFIG.HTTP_PROXY
}

/**
 * Check if proxy is configured
 */
export const isProxyConfigured = (): boolean => {
  return shouldUseProxy() && Boolean(getProxyUrl())
}

