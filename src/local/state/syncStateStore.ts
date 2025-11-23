/**
 * 基于本地文件系统的状态存储实现（本地调试工具）
 * 不应在生产环境（GitHub Actions）中使用
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { ContractSyncKey, SyncCursor, SyncState } from '../../core/state/types'
import { SYNC_STATE_CONFIG } from '../../config/sync'

const ensureDir = async (dir: string) => {
    await fs.mkdir(dir, { recursive: true })
}

const getStateFilePath = () => path.resolve(process.cwd(), SYNC_STATE_CONFIG.STATE_DIR, SYNC_STATE_CONFIG.STATE_FILE)

const serializeStateKey = (key: ContractSyncKey) => `${key.network}:${key.layer}:${key.contract}`

const loadFile = async (): Promise<SyncState> => {
    const filePath = getStateFilePath()
    try {
        const raw = await fs.readFile(filePath, 'utf8')
        return JSON.parse(raw) as SyncState
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return {}
        }
        throw error
    }
}

export const loadSyncState = async () => {
    await ensureDir(path.dirname(getStateFilePath()))
    return loadFile()
}

export const getSyncCursor = async (key: ContractSyncKey): Promise<SyncCursor> => {
    const state = await loadSyncState()
    const serializedKey = serializeStateKey(key)
    const cursor = state[serializedKey]
    if (cursor) {
        return cursor
    }
    return {
        lastBlock: SYNC_STATE_CONFIG.DEFAULT_START_BLOCK,
    }
}

export const updateSyncCursor = async (key: ContractSyncKey, cursor: SyncCursor): Promise<void> => {
    const state = await loadSyncState()
    const serializedKey = serializeStateKey(key)
    state[serializedKey] = cursor
    const filePath = getStateFilePath()
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf8')
}

export const clearSyncState = async (): Promise<void> => {
    const filePath = getStateFilePath()
    await ensureDir(path.dirname(filePath))
    await fs.writeFile(filePath, JSON.stringify({}, null, 2), 'utf8')
}

