// import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
// import type { ContractName } from '../../contractsConfig/types'
// import type { EventFetchResult } from '../../core/events'
// import { getSupabaseClient } from '../../config/supabase'
// import { base64ToHex } from '../../oasisQuery/app/utils/helpers'
// import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'
// import { getEventArg, normalizeHash } from './eventArgs'

// type EventRecord = {
//   network: RuntimeScope['network']
//   layer: RuntimeScope['layer']
//   event_type: string
//   contract_name: ContractName
//   contract_address: string
//   block_number: number
//   tx_hash: string
//   tx_index: number
//   log_index: number
//   box_id?: string
//   user_id?: string
//   event_data: RuntimeEvent
// }

// const resolveContractAddress = (
//   fetchResult: EventFetchResult,
//   event: RuntimeEvent,
// ): string | undefined => {
//   if (fetchResult.contractAddress) {
//     return fetchResult.contractAddress.toLowerCase()
//   }
//   const address = event.body?.address ?? event.body?.contract_address ?? event.body?.eth_address
//   if (!address) return undefined
//   if (address.startsWith('0x')) return address.toLowerCase()
//   try {
//     return base64ToHex(address).toLowerCase()
//   } catch {
//     return address
//   }
// }

// const getExplicitLogIndex = (event: RuntimeEvent): number | null => {
//   const body = event.body as Record<string, unknown> | undefined
//   const logIndex = body?.log_index ?? body?.index
//   if (logIndex === undefined || logIndex === null) {
//     return null
//   }
//   const parsed = Number(logIndex)
//   return Number.isNaN(parsed) ? null : parsed
// }

// const deriveLogIndex = (
//   event: RuntimeEvent,
//   contractAddress: string,
//   txHash: string,
//   counters: Map<string, number>,
// ): number => {
//   const explicit = getExplicitLogIndex(event)
//   if (explicit !== null) {
//     return explicit
//   }
//   const key = `${contractAddress}:${txHash}`
//   const next = counters.get(key) ?? 0
//   counters.set(key, next + 1)
//   return next
// }

// const mapToEventRecord = (
//   scope: RuntimeScope,
//   contract: ContractName,
//   fetchResult: EventFetchResult,
//   decodedEvent: EventFetchResult['events'][number],
//   counters: Map<string, number>,
// ): EventRecord | null => {
//   const contractAddress = resolveContractAddress(fetchResult, decodedEvent.raw)
//   const txHash = normalizeHash(decodedEvent.raw.tx_hash ?? decodedEvent.raw.eth_tx_hash)
//   if (!contractAddress || !txHash) {
//     return null
//   }

//   const blockNumber = decodedEvent.raw.round ?? 0
//   const logIndex = deriveLogIndex(decodedEvent.raw, contractAddress, txHash, counters)

//   const boxId = getEventArg<string>(decodedEvent, 'boxId')

//   return {
//     network: scope.network,
//     layer: scope.layer,
//     event_type: decodedEvent.eventName ?? decodedEvent.raw.evm_log_name ?? 'Unknown',
//     contract_name: contract,
//     contract_address: contractAddress,
//     block_number: blockNumber,
//     tx_hash: txHash,
//     tx_index: decodedEvent.raw.tx_index ?? 0,
//     log_index: logIndex,
//     box_id: boxId || undefined,
//     user_id: getEventArg<string>(decodedEvent, 'userId'),
//     event_data: decodedEvent.raw,
//   }
// }

// export const persistEvents = async (
//   scope: RuntimeScope,
//   contract: ContractName,
//   fetchResult: EventFetchResult,
// ) => {
//   const txLogCounters = new Map<string, number>()
//   const records = fetchResult.events
//     .map(event => mapToEventRecord(scope, contract, fetchResult, event, txLogCounters))
//     .filter((record): record is EventRecord => Boolean(record))

//   if (!records.length) return

//   const supabase = getSupabaseClient()
//   const { error } = await supabase
//     .from('events')
//     .upsert(records, {
//       onConflict: 'network,layer,contract_address,tx_hash,log_index',
//     })
//   if (error) {
//     throw new Error(`Failed to persist events: ${error.message}`)
//   }
// }
