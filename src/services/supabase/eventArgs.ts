import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'

type EventWithArgs<T = Record<string, unknown>> = DecodedRuntimeEvent<T> & {
  raw: RuntimeEvent
}

export const getEventArg = <T = unknown>(event: EventWithArgs, key: string): T | undefined => {
  const argsValue = (event.args as Record<string, unknown> | undefined)?.[key]
  if (argsValue !== undefined) {
    return argsValue as T
  }
  const param = (event.raw.evm_log_params as Array<{ name: string; value: unknown }> | undefined)?.find(
    p => p.name === key,
  )
  return param?.value as T | undefined
}

export const normalizeHash = (hash?: string | null): string | undefined => {
  if (!hash) return undefined
  return hash.startsWith('0x') ? hash : `0x${hash}`
}
