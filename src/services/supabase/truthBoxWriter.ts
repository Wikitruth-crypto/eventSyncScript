// src/services/supabase/truthBoxWriter.ts
import type { RuntimeContractSyncResult } from '../../core/sync/runtimeContractSyncer'
import { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isSupabaseConfigured } from '../../config/supabase'
import { ensureBoxesExist } from './boxesWriter'
import { ensureUsersExist } from './usersWriter'  // 新增
import { upsertMetadataFromEvents } from './metadataWriter'
import {CONSTANTS} from '../../index'

export const persistTruthBoxSync = async (
  scope: RuntimeScope,
  contract: ContractName,
  syncResult: RuntimeContractSyncResult,
) => {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured, skipping database write')
    return
  }

  // ✅ First ensure users records exist (process userId from all events)
  await ensureUsersExist(scope, syncResult.fetchResult)

  // ✅ Then ensure boxes records exist (process BoxCreated and other events)
  await ensureBoxesExist(scope, contract, syncResult.fetchResult)

  // ✅ Finally process metadata
  // Support both old contract's BoxInfoChanged and new contract's BoxCreated (contains boxInfoCID)
  const metadataEvents = syncResult.fetchResult.events.filter(
    event => {
      if (event.eventName === 'BoxInfoChanged') {
        return true // Old contract event
      }
      if (event.eventName === 'BoxCreated') {
        // New contract's BoxCreated event contains boxInfoCID parameter
        const boxInfoCID = (event.args as Record<string, unknown>)?.boxInfoCID
        return Boolean(boxInfoCID) // Only BoxCreated events with boxInfoCID need to fetch metadata
      }
      return false
    }
  )
  if (metadataEvents.length && CONSTANTS.writeMetadataBox) {
    await upsertMetadataFromEvents(scope, metadataEvents)
  }
}