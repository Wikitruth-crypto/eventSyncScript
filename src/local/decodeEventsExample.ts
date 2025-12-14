/**
 * 批量解码 OUTPUT_DIR_RAW_EVENTS 目录中的所有 JSON 文件（本地调试工具）
 * 
 * 用法：
 * npm run decode:events
 * tsx src/local/decodeEventsExample.ts
 */

import '../config/env' // 加载环境变量（支持 .env 和 .env.local）
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { decodeContractEvents } from '../utils/decodeEvents'
import { ContractName } from '../contractsConfig/types'
import type { RuntimeEvent } from '../oasisQuery/oasis-nexus/api'
import { OUTPUT_CONFIG } from '../config/sync'

interface EventJsonFile {
  fetchedAt: string
  scope: {
    network: 'testnet' | 'mainnet'
    layer: 'sapphire'
  }
  contract: ContractName
  cursorBefore: unknown
  cursorAfter: unknown
  pagesFetched: number
  totalFetched: number
  eventCount: number
  events?: Array<{
    eventName: string
    args: Record<string, unknown>
    raw: RuntimeEvent
  }>
  rawEvents: RuntimeEvent[]
}

/**
 * BigInt 序列化辅助函数
 */
const serializeBigInt = (value: unknown): unknown => {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (Array.isArray(value)) {
    return value.map(serializeBigInt)
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, serializeBigInt(val)])
    )
  }
  return value
}

/**
 * 处理单个文件
 */
async function processFile(inputFilePath: string): Promise<void> {
  const fileName = path.basename(inputFilePath)
  console.log(`\n📄 处理文件: ${fileName}`)
  console.log('-'.repeat(60))

  try {
    // 读取文件
    const fileContent = await fs.readFile(inputFilePath, 'utf8')
    const data: EventJsonFile = JSON.parse(fileContent)

    console.log(`   合约: ${data.contract}`)
    console.log(`   网络: ${data.scope.network}`)
    console.log(`   层: ${data.scope.layer}`)
    console.log(`   原始事件数量: ${data.rawEvents.length}`)

    // 解码事件
    console.log(`   🔄 开始解码事件...`)
    const decodedEvents = decodeContractEvents(
      data.rawEvents,
      data.contract,
      data.scope,
    )

    console.log(`   ✅ 成功解码 ${decodedEvents.length} 个事件`)

    // 统计解码结果
    const eventNameCounts: Record<string, number> = {}
    for (const event of decodedEvents) {
      eventNameCounts[event.eventName] = (eventNameCounts[event.eventName] || 0) + 1
    }

    console.log(`   📊 事件类型统计:`)
    for (const [eventName, count] of Object.entries(eventNameCounts)) {
      console.log(`      - ${eventName}: ${count}`)
    }

    // 构建输出文件路径
    const rawEventsDir = path.resolve(process.cwd(), OUTPUT_CONFIG.OUTPUT_DIR_RAW_EVENTS)
    const decodedEventsDir = path.resolve(process.cwd(), OUTPUT_CONFIG.OUTPUT_DIR_DECODED_EVENTS)
    const relativePath = path.relative(rawEventsDir, inputFilePath)
    const outputFilePath = path.join(decodedEventsDir, relativePath)

    // 确保输出目录存在
    await fs.mkdir(path.dirname(outputFilePath), { recursive: true })

    // 构建输出数据（移除原始事件 rawEvents）
    const { rawEvents, ...dataWithoutRawEvents } = data
    const outputData = {
      ...dataWithoutRawEvents,
      events: decodedEvents.map(event => ({
        ...event,
        args: serializeBigInt(event.args),
      })),
      decodedAt: new Date().toISOString(),
      decodedCount: decodedEvents.length,
      originalEventCount: data.eventCount,
    }

    // 保存解码后的数据
    await fs.writeFile(outputFilePath, JSON.stringify(outputData, null, 2), 'utf8')
    console.log(`   💾 解码结果已保存至: ${path.relative(process.cwd(), outputFilePath)}`)
  } catch (error) {
    console.error(`   ❌ 处理文件失败: ${fileName}`)
    if (error instanceof Error) {
      console.error(`      错误信息: ${error.message}`)
    }
    throw error
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('='.repeat(60))
    console.log('批量事件解码工具')
    console.log('='.repeat(60))
    console.log(`输入目录: ${OUTPUT_CONFIG.OUTPUT_DIR_RAW_EVENTS}`)
    console.log(`输出目录: ${OUTPUT_CONFIG.OUTPUT_DIR_DECODED_EVENTS}`)
    console.log('='.repeat(60))

    // 获取输入目录路径
    const inputDir = path.resolve(process.cwd(), OUTPUT_CONFIG.OUTPUT_DIR_RAW_EVENTS)

    // 检查目录是否存在
    try {
      await fs.access(inputDir)
    } catch {
      console.error(`❌ 输入目录不存在: ${inputDir}`)
      process.exitCode = 1
      return
    }

    // 读取目录中的所有文件
    const files = await fs.readdir(inputDir)
    const jsonFiles = files.filter(file => file.endsWith('.json'))

    if (jsonFiles.length === 0) {
      console.log(`\n⚠️  目录中没有找到 JSON 文件`)
      return
    }

    console.log(`\n📁 找到 ${jsonFiles.length} 个 JSON 文件`)
    console.log()

    // 处理每个文件
    let successCount = 0
    let failCount = 0

    for (const file of jsonFiles) {
      const filePath = path.join(inputDir, file)
      try {
        await processFile(filePath)
        successCount++
      } catch (error) {
        failCount++
        // 继续处理下一个文件
      }
    }

    // 输出总结
    console.log('\n' + '='.repeat(60))
    console.log('✅ 批量解码完成！')
    console.log('='.repeat(60))
    console.log(`   成功: ${successCount} 个文件`)
    console.log(`   失败: ${failCount} 个文件`)
    console.log(`   总计: ${jsonFiles.length} 个文件`)
    console.log('='.repeat(60))
  } catch (error) {
    console.error('\n❌ 批量解码失败：', error)
    if (error instanceof Error) {
      console.error('   错误信息:', error.message)
      console.error('   堆栈:', error.stack)
    }
    process.exitCode = 1
  }
}

void main()

