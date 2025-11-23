import '../../config/env' // 加载环境变量（支持 .env 和 .env.local）
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ipfsCidToUrl } from '../utils/ipfsUrl/ipfsCidToUrl'
import { refreshGatewayStatus, clearGatewayCache } from '../utils/ipfsUrl/gateway'
import { IPFS_CONFIG } from '../config/ipfs'
import { fetchWithProxy } from '../utils/fetchWithProxy'

/**
 * IPFS 文件下载测试工具（本地调试工具）
 * 
 * 用法：
 * npm run download:ipfs
 * tsx src/local/downloadIpfsFile.ts
 */

/**
 * 延迟函数
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 从 IPFS 下载文件
 * @param cid - IPFS CID
 * @param outputPath - 输出文件路径（可选）
 * @returns 下载的文件内容
 */
async function downloadIpfsFile(cid: string, outputPath?: string): Promise<string> {
    if (!cid) {
        throw new Error('CID 不能为空，请在脚本中设置 CID 变量')
    }

    console.log(`📥 开始下载 IPFS 文件：${cid}`)

    let lastError: Error | null = null
    let lastUrl: string | null = null

    for (let attempt = 1; attempt <= IPFS_CONFIG.MAX_RETRIES; attempt++) {
        try {
            // 每次重试前刷新网关状态，尝试不同的网关
            if (attempt > 1) {
                console.log(`🔄 刷新网关状态，准备重试 ${attempt}...`)
                clearGatewayCache()
                await refreshGatewayStatus()
            }

            const url = await ipfsCidToUrl(cid)
            lastUrl = url

            console.log(`📡 尝试 ${attempt}/${IPFS_CONFIG.MAX_RETRIES}: 从 ${url} 下载`)

            // 尝试获取数据（使用带代理的 fetch）
            const response = await fetchWithProxy(url, {}, IPFS_CONFIG.FETCH_TIMEOUT)

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const content = await response.text()

            // 成功获取数据
            if (attempt > 1) {
                console.log(`✅ 在第 ${attempt} 次尝试时成功下载文件，来源：${url}`)
            } else {
                console.log(`✅ 成功下载文件，来源：${url}`)
            }

            // 如果指定了输出路径，保存文件
            if (outputPath) {
                await fs.mkdir(path.dirname(outputPath), { recursive: true })
                await fs.writeFile(outputPath, content, 'utf8')
                console.log(`💾 文件已保存至：${outputPath}`)
            }

            // 尝试解析为 JSON（如果是 JSON 文件）
            try {
                const jsonData = JSON.parse(content)
                console.log(`📄 文件内容（JSON）：`)
                console.log(JSON.stringify(jsonData, null, 2))
            } catch {
                console.log(`📄 文件内容（前 500 字符）：`)
                console.log(content.substring(0, 500))
                if (content.length > 500) {
                    console.log(`... (共 ${content.length} 字符)`)
                }
            }

            return content
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            const errorCause = error instanceof Error && 'cause' in error ? String(error.cause) : ''
            lastError = error instanceof Error ? error : new Error(String(error))

            // 详细的错误信息
            const detailedError = errorCause ? `${errorMessage} (cause: ${errorCause})` : errorMessage

            console.warn(
                `⚠️  尝试 ${attempt}/${IPFS_CONFIG.MAX_RETRIES} 失败` +
                (lastUrl ? `，来源：${lastUrl}` : '') +
                `：${detailedError}`
            )

            // 如果是最后一次尝试，抛出错误
            if (attempt === IPFS_CONFIG.MAX_RETRIES) {
                throw new Error(
                    `下载 IPFS 文件失败，已尝试 ${IPFS_CONFIG.MAX_RETRIES} 次。` +
                    `最后使用的 URL：${lastUrl || 'unknown'}。` +
                    `错误：${detailedError}`
                )
            }

            // 计算延迟时间（指数退避：2s, 4s, 6s）
            const delayMs = IPFS_CONFIG.RETRY_DELAY_BASE * attempt
            console.warn(`⏳ 等待 ${delayMs}ms 后重试...`)
            await delay(delayMs)
        }
    }

    // 理论上不会到达这里，但 TypeScript 需要
    throw lastError || new Error(`下载 IPFS 文件失败：${cid}`)
}

/**
 * 主函数
 */
async function main() {
    try {
        // TODO: CID
        const TEST_CID = 'bafkreibty4khs64ftpvg4cr4ky6acgd2egtgaq74fj4vgxfa7maqs656re' // 例如: 'bafkreibty4khs64ftpvg4cr4ky6acgd2egtgaq74fj4vgxfa7maqs656re'

        if (!TEST_CID) {
            console.error('❌ 错误：请在脚本中设置 TEST_CID 变量')
            console.log('💡 提示：可以在脚本顶部修改 TEST_CID 变量来测试不同的 CID')
            process.exitCode = 1
            return
        }

        // 输出文件路径（可选）
        const outputDir = process.env.EVENT_SYNC_OUTPUT_DIR ?? 'data'
        const outputPath = path.resolve(process.cwd(), outputDir, `ipfs-${TEST_CID}.json`)

        console.log('='.repeat(60))
        console.log('IPFS 文件下载测试')
        console.log('='.repeat(60))
        console.log(`CID: ${TEST_CID}`)
        console.log(`输出路径: ${outputPath}`)
        console.log('='.repeat(60))
        console.log()

        await downloadIpfsFile(TEST_CID, outputPath)

        console.log()
        console.log('='.repeat(60))
        console.log('✅ 下载完成！')
        console.log('='.repeat(60))
    } catch (error) {
        console.error('❌ 下载失败：', error)
        process.exitCode = 1
    }
}

void main()

