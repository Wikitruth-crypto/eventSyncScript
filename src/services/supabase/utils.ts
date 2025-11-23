/**
 * Supabase 写入工具函数
 * 用于处理 BigInt 序列化等问题
 */

import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import { getEventArg } from './eventArgs'

/**
 * 将值转换为字符串（处理 BigInt）
 * @param value - 要转换的值
 * @returns 字符串值
 */
export const toString = (value: unknown): string => {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

/**
 * 安全地提取事件参数并转换为字符串（正确处理 0 值）
 * @param event - 解码后的事件
 * @param key - 参数名
 * @returns 字符串值，如果参数不存在则返回 undefined
 */
export const getEventArgAsString = (
  event: DecodedRuntimeEvent<Record<string, unknown>>,
  key: string,
): string | undefined => {
  const value = getEventArg<unknown>(event, key)
  // 只有当值为 undefined 或 null 时才返回 undefined
  // 0、'0'、false 等都是有效值
  if (value === undefined || value === null) {
    return undefined
  }
  return toString(value)
}

/**
 * 安全地提取事件参数并转换为字符串（正确处理 0 值），如果不存在则返回空字符串
 * @param event - 解码后的事件
 * @param key - 参数名
 * @returns 字符串值，如果参数不存在则返回空字符串
 */
export const getEventArgAsStringOrEmpty = (
  event: DecodedRuntimeEvent<Record<string, unknown>>,
  key: string,
): string => {
  return getEventArgAsString(event, key) ?? ''
}

/**
 * 检查事件参数是否存在且有效（正确处理 0 值）
 * @param event - 解码后的事件
 * @param key - 参数名
 * @returns 如果参数存在且有效（包括 0）返回 true，否则返回 false
 */
export const hasEventArg = (
  event: DecodedRuntimeEvent<Record<string, unknown>>,
  key: string,
): boolean => {
  const value = getEventArg<unknown>(event, key)
  return value !== undefined && value !== null
}

/**
 * 将值转换为字符串或 null（处理 BigInt）
 * @param value - 要转换的值
 * @returns 字符串值或 null
 */
export const toStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'bigint') {
    return value.toString()
  }
  return String(value)
}

/**
 * 递归清理对象中的 BigInt，转换为字符串或数字
 * @param obj - 要清理的对象
 * @returns 清理后的对象
 */
export const sanitizeForSupabase = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'bigint') {
    // BigInt 转换为字符串（Supabase NUMERIC 类型可以接受字符串）
    return obj.toString()
  }
  
  if (typeof obj === 'number') {
    // 检查是否是安全整数，如果不是则转换为字符串
    if (!Number.isSafeInteger(obj)) {
      return obj.toString()
    }
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForSupabase)
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeForSupabase(value)
    }
    return result
  }
  
  return obj
}
