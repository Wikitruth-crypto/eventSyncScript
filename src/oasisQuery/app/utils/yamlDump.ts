// eslint-disable-next-line no-restricted-imports
import { dump } from 'js-yaml'

export function yamlDump(value: unknown) {
  return dump(value, {
    replacer: (_key: string, entry: unknown) => {
      if (entry instanceof Map) return Object.fromEntries(entry.entries())
      if (typeof entry === 'bigint') return entry.toString()
      if (typeof entry === 'undefined') return '!!undefined'
      return entry
    },
  })
}
