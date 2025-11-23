/**
 * 带代理支持的 fetch 工具
 * 统一处理代理配置，供其他模块调用
 */

import { getProxyUrl, isProxyConfigured, shouldUseProxy } from '../config/proxy'
import { setGlobalDispatcher, ProxyAgent } from 'undici'

// 初始化全局代理（如果启用）
let proxyInitialized = false

/**
 * 初始化全局代理配置
 * 只需要调用一次，后续所有 fetch 请求都会使用代理
 * 只有在 shouldUseProxy() 返回 true 时才会启用代理
 */
export const initializeProxy = () => {
  if (proxyInitialized) {
    return
  }

  // 检查是否应该使用代理
  if (!shouldUseProxy()) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('ℹ️  代理模式已禁用（EVENT_SYNC_USE_PROXY 未设置为 true）')
    }
    return
  }

  if (isProxyConfigured()) {
    const proxyUrl = getProxyUrl()
    if (proxyUrl) {
      console.log(`🌐 启用代理: ${proxyUrl}`)
      setGlobalDispatcher(new ProxyAgent(proxyUrl))
      proxyInitialized = true
    }
  } else {
    // 代理模式已启用，但代理 URL 未配置
    console.warn('⚠️  代理模式已启用，但未配置 HTTP_PROXY 或 HTTPS_PROXY 环境变量')
  }
}

/**
 * 带超时的 fetch，自动使用代理配置
 * @param url - 请求 URL
 * @param options - fetch 选项
 * @param timeout - 超时时间（毫秒）
 * @returns Response 对象
 */
export const fetchWithProxy = async (
  url: string,
  options: RequestInit = {},
  timeout: number = 30000,
): Promise<Response> => {
  // 确保代理已初始化
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
