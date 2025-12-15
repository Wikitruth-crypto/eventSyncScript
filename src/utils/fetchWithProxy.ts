/**
 * Fetch tool with proxy support
 */

import { getProxyUrl, isProxyConfigured, shouldUseProxy } from '../config/proxy'
import { setGlobalDispatcher, ProxyAgent } from 'undici'

// Initialize global proxy (if enabled)
let proxyInitialized = false

export const initializeProxy = () => {
  if (proxyInitialized) {
    return
  }

  // Check if proxy should be used
  if (!shouldUseProxy()) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('ℹ️  Proxy mode is disabled (EVENT_SYNC_USE_PROXY is not set to true)')
    }
    return
  }

  if (isProxyConfigured()) {
    const proxyUrl = getProxyUrl()
    if (proxyUrl) {
      console.log(`🌐 Enable proxy: ${proxyUrl}`)
      setGlobalDispatcher(new ProxyAgent(proxyUrl))
      proxyInitialized = true
    }
  } else {
    // Proxy mode is enabled, but proxy URL is not configured
    console.warn('⚠️  Proxy mode is enabled, but HTTP_PROXY or HTTPS_PROXY environment variables are not configured')
  }
}

/**
 * Fetch with timeout, automatically use proxy configuration
 * @param url - Request URL
 * @param options - fetch options
 * @param timeout - Timeout (milliseconds)
 * @returns Response object
 */
export const fetchWithProxy = async (
  url: string,
  options: RequestInit = {},
  timeout: number = 30000,
): Promise<Response> => {
  // Ensure proxy is initialized
  initializeProxy()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        accept: 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}
