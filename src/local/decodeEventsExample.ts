/**
 * 从 JSON 文件解码事件数据（本地调试工具）
 * 
 * 用法：
 * npm run decode:events
 * tsx src/local/decodeEventsExample.ts
 */

import '../../config/env' // 加载环境变量（支持 .env 和 .env.local）
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { decodeContractEvents, decodeMultiContractEvents } from '../utils/decodeEvents'
import { ContractName } from '../contractsConfig/types'
import type { RuntimeEvent } from '../oasisQuery/oasis-nexus/api'
import { DEFAULT_SCOPE, OUTPUT_CONFIG } from '../config/sync'

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
  events: Array<{
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
 * 主函数
 */
async function main() {
  try {
    // 读取 JSON 文件
    const inputFile = process.argv[2] || path.resolve(process.cwd(), OUTPUT_CONFIG.OUTPUT_DIR, 'truthBoxEvents-testnet-sapphire.json')
    
    console.log('='.repeat(60))
    console.log('事件解码工具')
    console.log('='.repeat(60))
    console.log(`输入文件: ${inputFile}`)
    console.log('='.repeat(60))
    console.log()

    const fileContent = await fs.readFile(inputFile, 'utf8')
    const data: EventJsonFile = JSON.parse(fileContent)

    console.log(`📄 读取文件成功`)
    console.log(`   - 合约: ${data.contract}`)
    console.log(`   - 网络: ${data.scope.network}`)
    console.log(`   - 层: ${data.scope.layer}`)
    console.log(`   - 事件数量: ${data.eventCount}`)
    console.log(`   - 原始事件数量: ${data.rawEvents.length}`)
    console.log()

    // 解码事件
    console.log('🔄 开始解码事件...')
    const decodedEvents = decodeContractEvents(
      data.rawEvents,
      data.contract,
      data.scope,
    )

    console.log(`✅ 成功解码 ${decodedEvents.length} 个事件（共 ${data.rawEvents.length} 个原始事件）`)
    console.log()

    // 统计解码结果
    const eventNameCounts: Record<string, number> = {}
    for (const event of decodedEvents) {
      eventNameCounts[event.eventName] = (eventNameCounts[event.eventName] || 0) + 1
    }

    console.log('📊 事件类型统计:')
    for (const [eventName, count] of Object.entries(eventNameCounts)) {
      console.log(`   - ${eventName}: ${count}`)
    }
    console.log()

    // 显示一些解码示例
    console.log('📋 解码示例（前 3 个）:')
    for (let i = 0; i < Math.min(3, decodedEvents.length); i++) {
      const event = decodedEvents[i]
      console.log(`\n   [${i + 1}] ${event.eventName}`)
      console.log(`       区块: ${event.raw.round}`)
      console.log(`       时间: ${event.raw.timestamp}`)
      console.log(`       参数:`, JSON.stringify(serializeBigInt(event.args), null, 2))
    }
    console.log()

    // 保存解码后的数据
    const outputFile = inputFile.replace('.json', '-decoded.json')
    const outputData = {
      ...data,
      events: decodedEvents.map(event => ({
        ...event,
        args: serializeBigInt(event.args),
      })),
      decodedAt: new Date().toISOString(),
      decodedCount: decodedEvents.length,
      originalEventCount: data.eventCount,
    }

    await fs.writeFile(outputFile, JSON.stringify(outputData, null, 2), 'utf8')
    console.log(`💾 解码结果已保存至: ${outputFile}`)
    console.log()

    console.log('='.repeat(60))
    console.log('✅ 解码完成！')
    console.log('='.repeat(60))
  } catch (error) {
    console.error('❌ 解码失败：', error)
    if (error instanceof Error) {
      console.error('   错误信息:', error.message)
      console.error('   堆栈:', error.stack)
    }
    process.exitCode = 1
  }
}

void main()

