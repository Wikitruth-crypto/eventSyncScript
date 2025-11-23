import { ipfsCidToUrl } from '../../utils/ipfsUrl/ipfsCidToUrl'
import { refreshGatewayStatus, clearGatewayCache } from '../../utils/ipfsUrl/gateway'
import { IPFS_CONFIG } from '../../config/ipfs'
import { fetchWithProxy } from '../../utils/fetchWithProxy'

export interface MetadataBoxPayload {
  name?: string
  tokenId?: string
  typeOfCrime?: string
  label?: string[]
  title?: string
  nftImage?: string
  boxImage?: string
  country?: string
  state?: string
  description?: string
  eventDate?: string
  createDate?: string
  timestamp?: number
  mintMethod?: string
  project?: string
  website?: string[]
  fileList?: string[]
  password?: string
  encryptionSlicesMetadataCID?: Record<string, unknown>
  encryptionFileCID?: Record<string, unknown>[]
  encryptionPasswords?: Record<string, unknown>
  publicKey?: string
  [key: string]: unknown
}

/**
 * 延迟函数
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 从 IPFS 获取 MetadataBox 数据，带重试机制和网关切换
 * @param cid - IPFS CID
 * @returns MetadataBox 数据
 */
export const fetchMetadataBox = async (cid: string): Promise<MetadataBoxPayload> => {
  let lastError: Error | null = null
  let lastUrl: string | null = null

  for (let attempt = 1; attempt <= IPFS_CONFIG.MAX_RETRIES; attempt++) {
    try {
      // 每次重试前刷新网关状态，尝试不同的网关
      if (attempt > 1) {
        console.log(`🔄 Refreshing gateway status before retry ${attempt}...`)
        // 清除缓存，强制重新选择网关
        clearGatewayCache()
        await refreshGatewayStatus()
      }

      const url = await ipfsCidToUrl(cid)
      lastUrl = url
      
      console.log(`📡 Attempt ${attempt}/${IPFS_CONFIG.MAX_RETRIES}: Fetching from ${url}`)
      
      // 尝试获取数据（使用带代理的 fetch）
      const response = await fetchWithProxy(url, {}, IPFS_CONFIG.FETCH_TIMEOUT)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = (await response.json()) as MetadataBoxPayload
      
      // 成功获取数据
      if (attempt > 1) {
        console.log(`✅ Successfully fetched metadata for ${cid} on attempt ${attempt} from ${url}`)
      } else {
        console.log(`✅ Successfully fetched metadata for ${cid} from ${url}`)
      }
      
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorCause = error instanceof Error && 'cause' in error ? String(error.cause) : ''
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // 详细的错误信息
      const detailedError = errorCause 
        ? `${errorMessage} (cause: ${errorCause})`
        : errorMessage
      
      console.warn(
        `⚠️  Attempt ${attempt}/${IPFS_CONFIG.MAX_RETRIES} failed for ${cid}` +
        (lastUrl ? ` from ${lastUrl}` : '') +
        `: ${detailedError}`
      )
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === IPFS_CONFIG.MAX_RETRIES) {
        throw new Error(
          `Failed to fetch metadata ${cid} after ${IPFS_CONFIG.MAX_RETRIES} attempts. ` +
          `Last URL: ${lastUrl || 'unknown'}. ` +
          `Error: ${detailedError}`
        )
      }

      // 计算延迟时间（指数退避：2s, 4s, 6s）
      const delayMs = IPFS_CONFIG.RETRY_DELAY_BASE * attempt
      console.warn(`⏳ Waiting ${delayMs}ms before retry...`)
      await delay(delayMs)
    }
  }

  // 理论上不会到达这里，但 TypeScript 需要
  throw lastError || new Error(`Failed to fetch metadata ${cid}`)
}
