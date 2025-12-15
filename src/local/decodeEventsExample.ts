/**
 * Batch decode all JSON files in OUTPUT_DIR_RAW_EVENTS directory (local debugging tool)
 * 
 * Usage:
 * npm run decode:events
 * tsx src/local/decodeEventsExample.ts
 */

import '../config/env' // Load environment variables (supports .env and .env.local)
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
 * BigInt serialization helper function
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
 * Process a single file
 */
async function processFile(inputFilePath: string): Promise<void> {
  const fileName = path.basename(inputFilePath)
  console.log(`\n📄 Processing file: ${fileName}`)
  console.log('-'.repeat(60))

  try {
    // Read file
    const fileContent = await fs.readFile(inputFilePath, 'utf8')
    const data: EventJsonFile = JSON.parse(fileContent)

    console.log(`   Contract: ${data.contract}`)
    console.log(`   Network: ${data.scope.network}`)
    console.log(`   Layer: ${data.scope.layer}`)
    console.log(`   Raw events count: ${data.rawEvents.length}`)

    // Decode events
    console.log(`   🔄 Starting event decoding...`)
    const decodedEvents = decodeContractEvents(
      data.rawEvents,
      data.contract,
      data.scope,
    )

    console.log(`   ✅ Successfully decoded ${decodedEvents.length} events`)

    // Count decoding results
    const eventNameCounts: Record<string, number> = {}
    for (const event of decodedEvents) {
      eventNameCounts[event.eventName] = (eventNameCounts[event.eventName] || 0) + 1
    }

    console.log(`   📊 Event type statistics:`)
    for (const [eventName, count] of Object.entries(eventNameCounts)) {
      console.log(`      - ${eventName}: ${count}`)
    }

    // Build output file path
    const rawEventsDir = path.resolve(process.cwd(), OUTPUT_CONFIG.OUTPUT_DIR_RAW_EVENTS)
    const decodedEventsDir = path.resolve(process.cwd(), OUTPUT_CONFIG.OUTPUT_DIR_DECODED_EVENTS)
    const relativePath = path.relative(rawEventsDir, inputFilePath)
    const outputFilePath = path.join(decodedEventsDir, relativePath)

    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputFilePath), { recursive: true })

    // Build output data (remove raw events rawEvents)
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

    // Save decoded data
    await fs.writeFile(outputFilePath, JSON.stringify(outputData, null, 2), 'utf8')
    console.log(`   💾 Decoded results saved to: ${path.relative(process.cwd(), outputFilePath)}`)
  } catch (error) {
    console.error(`   ❌ Failed to process file: ${fileName}`)
    if (error instanceof Error) {
      console.error(`      Error message: ${error.message}`)
    }
    throw error
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('='.repeat(60))
    console.log('Batch Event Decoding Tool')
    console.log('='.repeat(60))
    console.log(`Input directory: ${OUTPUT_CONFIG.OUTPUT_DIR_RAW_EVENTS}`)
    console.log(`Output directory: ${OUTPUT_CONFIG.OUTPUT_DIR_DECODED_EVENTS}`)
    console.log('='.repeat(60))

    // Get input directory path
    const inputDir = path.resolve(process.cwd(), OUTPUT_CONFIG.OUTPUT_DIR_RAW_EVENTS)

    // Check if directory exists
    try {
      await fs.access(inputDir)
    } catch {
      console.error(`❌ Input directory does not exist: ${inputDir}`)
      process.exitCode = 1
      return
    }

    // Read all files in directory
    const files = await fs.readdir(inputDir)
    const jsonFiles = files.filter(file => file.endsWith('.json'))

    if (jsonFiles.length === 0) {
      console.log(`\n⚠️  No JSON files found in directory`)
      return
    }

    console.log(`\n📁 Found ${jsonFiles.length} JSON files`)
    console.log()

    // Process each file
    let successCount = 0
    let failCount = 0

    for (const file of jsonFiles) {
      const filePath = path.join(inputDir, file)
      try {
        await processFile(filePath)
        successCount++
      } catch (error) {
        failCount++
        // Continue processing next file
      }
    }

    // Output summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ Batch decoding completed!')
    console.log('='.repeat(60))
    console.log(`   Success: ${successCount} files`)
    console.log(`   Failed: ${failCount} files`)
    console.log(`   Total: ${jsonFiles.length} files`)
    console.log('='.repeat(60))
  } catch (error) {
    console.error('\n❌ Batch decoding failed:', error)
    if (error instanceof Error) {
      console.error('   Error message:', error.message)
      console.error('   Stack:', error.stack)
    }
    process.exitCode = 1
  }
}

void main()

