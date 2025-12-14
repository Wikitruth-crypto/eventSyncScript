/**
 * 保存事件数据到 JSON 文件的工具函数
 * 主要用于调试目的，正式环境中可以禁用
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { ContractName } from '../contractsConfig/types'
import { OUTPUT_CONFIG } from '../config/sync'
import type { RuntimeContractSyncResult } from '../core/sync/runtimeContractSyncer'

export interface EventDataPayload {
    fetchedAt: string
    scope: RuntimeScope
    contract: ContractName
    cursorBefore: {
        lastBlock: number
        lastLogIndex?: number
        lastTimestamp?: string
        lastEventId?: string
    }
    cursorAfter: {
        lastBlock: number
        lastLogIndex?: number
        lastTimestamp?: string
        lastEventId?: string
    }
    pagesFetched: number
    totalFetched: number
    eventCount: number
    rawEvents: unknown[]
}

/**
 * 解析输出文件路径
 * @param scope - 运行时范围
 * @param contract - 合约名称
 * @returns 输出文件路径
 */
const resolveOutputPath = (scope: RuntimeScope, contract: ContractName): string => {
    const filename = `${contract.toLowerCase()}Events-${scope.network}-${scope.layer}.json`
    return path.resolve(process.cwd(), OUTPUT_CONFIG.OUTPUT_DIR_RAW_EVENTS, filename)
}

/**
 * 构建事件数据负载
 * @param scope - 运行时范围
 * @param contract - 合约名称
 * @param syncResult - 同步结果
 * @returns 事件数据负载
 */
const buildEventDataPayload = (
    scope: RuntimeScope,
    contract: ContractName,
    syncResult: RuntimeContractSyncResult,
): EventDataPayload => {
    return {
        fetchedAt: new Date().toISOString(),
        scope,
        contract,
        cursorBefore: syncResult.cursorBefore,
        cursorAfter: syncResult.cursorAfter,
        pagesFetched: syncResult.fetchResult.pagesFetched,
        totalFetched: syncResult.fetchResult.totalFetched,
        eventCount: syncResult.fetchResult.rawEvents.length,
        // 只保存原始事件数据，不保存解码后的数据
        rawEvents: syncResult.fetchResult.rawEvents,
    }
}

/**
 * 保存事件数据到 JSON 文件
 * @param scope - 运行时范围
 * @param contract - 合约名称
 * @param syncResult - 同步结果
 * @returns 保存的文件路径，如果保存失败则返回 null
 */
export const saveEventDataToFile = async (
    scope: RuntimeScope,
    contract: ContractName,
    syncResult: RuntimeContractSyncResult,
): Promise<string | null> => {
    try {
        const payload = buildEventDataPayload(scope, contract, syncResult)
        const outputPath = resolveOutputPath(scope, contract)

        // 确保目录存在
        await fs.mkdir(path.dirname(outputPath), { recursive: true })

        // 写入文件
        await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8')

        console.log(`📝 已保存原始事件数据至 ${outputPath}`)
        return outputPath
    } catch (error) {
        console.warn(
            `⚠️  保存事件数据到文件失败:`,
            error instanceof Error ? error.message : String(error),
        )
        return null
    }
}

/**
 * 检查是否应该保存事件数据到文件
 * 可以通过环境变量 EVENT_SYNC_SAVE_JSON 控制（设置为 'true' 或 '1' 时保存）
 * @returns 是否应该保存
 */
export const shouldSaveEventDataToFile = (): boolean => {
    const envValue = process.env.EVENT_SYNC_SAVE_JSON
    return envValue === 'true' || envValue === '1'
}

