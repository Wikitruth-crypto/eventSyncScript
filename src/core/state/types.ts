import type { ContractName } from '../../contractsConfig/types'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'

export interface ContractSyncKey {
  network: RuntimeScope['network']
  layer: RuntimeScope['layer']
  contract: ContractName
}

export interface SyncCursor {
  lastBlock: number
  lastLogIndex?: number
  lastTimestamp?: string
  lastEventId?: string
}

export type SyncState = Record<string, SyncCursor>
