import '../../config/env' 
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ipfsCidToUrl } from '../utils/ipfsUrl/ipfsCidToUrl'
import { refreshGatewayStatus, clearGatewayCache } from '../utils/ipfsUrl/gateway'
import { IPFS_CONFIG } from '../config/ipfs'
import { fetchWithProxy } from '../utils/fetchWithProxy'

/**
 * IPFS file download test tool (local debugging tool)
 * 
 * Usage:
 * npm run download:ipfs
 * tsx src/local/downloadIpfsFile.ts
 * 
 * @param ms - Delay time (milliseconds)
 * @returns Promise<void>
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Download file from IPFS
 * @param cid - IPFS CID
 * @param outputPath - Output file path (optional)
 * @returns Downloaded file content
 */
async function downloadIpfsFile(cid: string, outputPath?: string): Promise<string> {
    if (!cid) {
        throw new Error('CID is required, please set the CID variable in the script')
    }

    console.log(`📥 Start downloading IPFS file: ${cid}`)

    let lastError: Error | null = null
    let lastUrl: string | null = null

    for (let attempt = 1; attempt <= IPFS_CONFIG.MAX_RETRIES; attempt++) {
        try {
            if (attempt > 1) {
                console.log(`🔄 Refresh gateway status, prepare to retry ${attempt}...`)
                clearGatewayCache()
                await refreshGatewayStatus()
            }

            const url = await ipfsCidToUrl(cid)
            lastUrl = url

            // Try to get data (using fetch with proxy)
            const response = await fetchWithProxy(url, {}, IPFS_CONFIG.FETCH_TIMEOUT)

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const content = await response.text()

            // Successfully got data
            if (attempt > 1) {
                console.log(`✅ Successfully downloaded file on attempt ${attempt}, from: ${url}`)
            } else {
                console.log(`✅ Successfully downloaded file, from: ${url}`)
            }

            // If output path is specified, save file
            if (outputPath) {
                await fs.mkdir(path.dirname(outputPath), { recursive: true })
                await fs.writeFile(outputPath, content, 'utf8')
            }

            return content
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            const errorCause = error instanceof Error && 'cause' in error ? String(error.cause) : ''
            lastError = error instanceof Error ? error : new Error(String(error))

            // Detailed error information
            const detailedError = errorCause ? `${errorMessage} (cause: ${errorCause})` : errorMessage

            console.warn(
                `⚠️  Failed to download IPFS file on attempt ${attempt}/${IPFS_CONFIG.MAX_RETRIES}` +
                (lastUrl ? `, from: ${lastUrl}` : '') +
                `：${detailedError}`
            )

            // If this is the last attempt, throw error
            if (attempt === IPFS_CONFIG.MAX_RETRIES) {
                throw new Error(
                    `Failed to download IPFS file after ${IPFS_CONFIG.MAX_RETRIES} attempts.` +
                    `Last used URL: ${lastUrl || 'unknown'}.` +
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
    throw lastError || new Error(`Failed to download IPFS file: ${cid}`)
}


async function main() {
    try {
        // TODO: CID
        const TEST_CID = 'bafkreibty4khs64ftpvg4cr4ky6acgd2egtgaq74fj4vgxfa7maqs656re'

        if (!TEST_CID) {
            console.error('❌ Error: please set the TEST_CID variable in the script')
            console.log('💡 Tip: you can modify the TEST_CID variable at the top of the script to test different CIDs')
            process.exitCode = 1
            return
        }

        // Output file path (optional)
        const outputDir = process.env.EVENT_SYNC_OUTPUT_DIR ?? 'data'
        const outputPath = path.resolve(process.cwd(), outputDir, `ipfs-${TEST_CID}.json`)

        console.log('='.repeat(60))
        console.log('IPFS file download test')
        console.log('='.repeat(60))
        console.log(`CID: ${TEST_CID}`)
        console.log(`Output path: ${outputPath}`)
        console.log('='.repeat(60))
        console.log()

        await downloadIpfsFile(TEST_CID, outputPath)

        console.log()
        console.log('='.repeat(60))
        console.log('✅ Download completed!')
        console.log('='.repeat(60))
    } catch (error) {
        console.error('❌ Download failed:', error)
        process.exitCode = 1
    }
}

void main()

