/**
 * Supabase write utility functions
 * Used to handle BigInt serialization issues
 */

import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import { getEventArg } from './eventArgs'

/**
 * Convert value to string (handle BigInt)
 * @param value - Value to convert
 * @returns String value
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
 * Safely extract event parameter and convert to string (correctly handle 0 value)
 * @param event - Decoded event
 * @param key - Parameter name
 * @returns String value, returns undefined if parameter does not exist
 */
export const getEventArgAsString = (
  event: DecodedRuntimeEvent<Record<string, unknown>>,
  key: string,
): string | undefined => {
  const value = getEventArg<unknown>(event, key)
  // Only return undefined when value is undefined or null
  // 0, '0', false, etc. are valid values
  if (value === undefined || value === null) {
    return undefined
  }
  return toString(value)
}

/**
 * Safely extract event parameter and convert to string (correctly handle 0 value), return empty string if parameter does not exist
 * @param event - Decoded event
 * @param key - Parameter name
 * @returns String value, returns empty string if parameter does not exist
 */
export const getEventArgAsStringOrEmpty = (
  event: DecodedRuntimeEvent<Record<string, unknown>>,
  key: string,
): string => {
  return getEventArgAsString(event, key) ?? ''
}

/**
 * Check if event parameter exists and is valid (correctly handle 0 value)
 * @param event - Decoded event
 * @param key - Parameter name
 * @returns True if parameter exists and is valid (including 0), otherwise false
 */
export const hasEventArg = (
  event: DecodedRuntimeEvent<Record<string, unknown>>,
  key: string,
): boolean => {
  const value = getEventArg<unknown>(event, key)
  return value !== undefined && value !== null
}

/**
 * Convert value to string or null (handle BigInt)
 * @param value - Value to convert
 * @returns String value or null
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
 * Recursively clean BigInt in object, convert to string or number
 * @param obj - Object to clean
 * @returns Cleaned object
 */
export const sanitizeForSupabase = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'bigint') {
    // Convert BigInt to string (Supabase NUMERIC type can accept string)
    return obj.toString()
  }
  
  if (typeof obj === 'number') {
    // Check if it is a safe integer, if not, convert to string
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
