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
 * Delay function
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetch MetadataBox data from IPFS with retry mechanism and gateway switching
 * @param cid - IPFS CID
 * @returns MetadataBox data
 */
export const fetchMetadataBox = async (cid: string): Promise<MetadataBoxPayload> => {
  let lastError: Error | null = null
  let lastUrl: string | null = null

  for (let attempt = 1; attempt <= IPFS_CONFIG.MAX_RETRIES; attempt++) {
    try {
      // Refresh gateway status before each retry, try different gateways
      if (attempt > 1) {
        console.log(`🔄 Refreshing gateway status before retry ${attempt}...`)
        // Clear cache, force re-selection of gateway
        clearGatewayCache()
        await refreshGatewayStatus()
      }

      const url = await ipfsCidToUrl(cid)
      lastUrl = url
      
      console.log(`📡 Attempt ${attempt}/${IPFS_CONFIG.MAX_RETRIES}: Fetching from ${url}`)
      
      // Try to fetch data (using fetch with proxy)
      const response = await fetchWithProxy(url, {}, IPFS_CONFIG.FETCH_TIMEOUT)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = (await response.json()) as MetadataBoxPayload
      
      // Successfully fetched data
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
      
      // Detailed error information
      const detailedError = errorCause 
        ? `${errorMessage} (cause: ${errorCause})`
        : errorMessage
      
      console.warn(
        `⚠️  Attempt ${attempt}/${IPFS_CONFIG.MAX_RETRIES} failed for ${cid}` +
        (lastUrl ? ` from ${lastUrl}` : '') +
        `: ${detailedError}`
      )
      
      // If this is the last attempt, throw error
      if (attempt === IPFS_CONFIG.MAX_RETRIES) {
        throw new Error(
          `Failed to fetch metadata ${cid} after ${IPFS_CONFIG.MAX_RETRIES} attempts. ` +
          `Last URL: ${lastUrl || 'unknown'}. ` +
          `Error: ${detailedError}`
        )
      }

      // Calculate delay time (exponential backoff: 2s, 4s, 6s)
      const delayMs = IPFS_CONFIG.RETRY_DELAY_BASE * attempt
      console.warn(`⏳ Waiting ${delayMs}ms before retry...`)
      await delay(delayMs)
    }
  }

  // Theoretically shouldn't reach here, but TypeScript needs it
  throw lastError || new Error(`Failed to fetch metadata ${cid}`)
}
