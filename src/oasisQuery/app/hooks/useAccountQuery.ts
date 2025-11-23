import type { SearchScope } from '../../types/searchScope'
import {
  fetchConsensusAccountInfo,
  type ConsensusAccountFetchConfig,
  type FetchResult as ConsensusFetchResult,
} from '../services/nexus/consensusAccountFetcher'
import {
  fetchRuntimeAccountInfo,
  type RuntimeAccountFetchConfig,
  type FetchResult as RuntimeFetchResult,
} from '../services/nexus/runtimeAccountFetcher'

export interface UseAccountQueryParams {
  scope: SearchScope
  address: string
  enabled?: boolean
  maxRecords?: number
}

export type AccountQueryResult<T = any> =
  | (ConsensusFetchResult<T> & { source: 'consensus' })
  | (RuntimeFetchResult<T> & { source: 'runtime' })

const DEFAULT_MAX_RECORDS = 100

/**
 * 在 CLI/脚本环境下用于查询账户信息的统一入口。
 * 根据 scope 判断调用共识层或运行时账号查询器，避免依赖 React Hook。
 */
export const useAccountQuery = async ({
  scope,
  address,
  enabled = true,
  maxRecords = DEFAULT_MAX_RECORDS,
}: UseAccountQueryParams): Promise<AccountQueryResult> => {
  if (!enabled || !address) {
    return { source: scope.layer === 'consensus' ? 'consensus' : 'runtime', success: false, error: 'Query disabled or missing address' }
  }

  if (scope.layer === 'consensus') {
    const config: ConsensusAccountFetchConfig = {
      network: scope.network,
      address,
      maxRecords,
    }
    const result = await fetchConsensusAccountInfo(config)
    return { source: 'consensus', ...result }
  }

  const runtimeConfig: RuntimeAccountFetchConfig = {
    network: scope.network,
    layer: scope.layer,
    address,
  }
  const runtimeResult = await fetchRuntimeAccountInfo(runtimeConfig)
  return { source: 'runtime', ...runtimeResult }
}
