import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import { getSupabaseClient } from '../../config/supabase'
import { fetchMetadataBox, MetadataBoxPayload } from '../ipfs/fetchMetadataBox'
import { sanitizeForSupabase, getEventArgAsString } from './utils'

type MetadataRecord = {
  network: RuntimeScope['network']
  layer: RuntimeScope['layer']
  id: string
  type_of_crime?: string
  label?: string[]
  title?: string
  nft_image?: string
  box_image?: string
  country?: string
  state?: string
  description?: string
  event_date?: string | null
  create_date?: string | null
  timestamp?: number | null
  mint_method?: string | null
  file_list?: string[]
  password?: string | null
  encryption_slices_metadata_cid?: Record<string, unknown> | null
  encryption_file_cid?: Record<string, unknown>[] | null
  encryption_passwords?: Record<string, unknown> | null
  public_key?: string | null
}

const toISODate = (value?: string): string | null => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const normalizeMetadataRecord = (
  scope: RuntimeScope,
  boxId: string,
  metadata: MetadataBoxPayload,
): MetadataRecord => {
  // Handle timestamp, ensure BigInt is converted to number
  let timestamp: number | null = null
  if (metadata.timestamp !== undefined && metadata.timestamp !== null) {
    if (typeof metadata.timestamp === 'bigint') {
      timestamp = Number(metadata.timestamp)
    } else if (typeof metadata.timestamp === 'number') {
      timestamp = metadata.timestamp
    } else {
      timestamp = Number(metadata.timestamp)
    }
  }

  // Sanitize nested objects that may contain BigInt
  const encryptionSlicesMetadataCID = metadata.encryptionSlicesMetadataCID
    ? (sanitizeForSupabase(metadata.encryptionSlicesMetadataCID) as Record<string, unknown>)
    : null

  const encryptionFileCID = metadata.encryptionFileCID
    ? (sanitizeForSupabase(metadata.encryptionFileCID) as Record<string, unknown>[])
    : null

  const encryptionPasswords = metadata.encryptionPasswords
    ? (sanitizeForSupabase(metadata.encryptionPasswords) as Record<string, unknown>)
    : null

  return {
    network: scope.network,
    layer: scope.layer,
    id: boxId,
    type_of_crime: metadata.typeOfCrime,
    label: metadata.label,
    title: metadata.title,
    nft_image: metadata.nftImage,
    box_image: metadata.boxImage,
    country: metadata.country,
    state: metadata.state,
    description: metadata.description,
    event_date: metadata.eventDate ? toISODate(metadata.eventDate)?.split('T')[0] ?? null : null,
    create_date: toISODate(metadata.createDate),
    timestamp,
    mint_method: metadata.mintMethod ?? null,
    file_list: metadata.fileList,
    password: metadata.password ?? null,
    encryption_slices_metadata_cid: encryptionSlicesMetadataCID,
    encryption_file_cid: encryptionFileCID,
    encryption_passwords: encryptionPasswords,
    public_key: metadata.publicKey ?? null,
  }
}

const extractBoxInfoCid = (event: DecodedRuntimeEvent<Record<string, unknown>>) => {
  // Use common utility to safely extract event parameters (correctly handle 0 values)
  return {
    boxId: getEventArgAsString(event, 'boxId'),
    boxInfoCID: getEventArgAsString(event, 'boxInfoCID'),
  }
}

const sanitizeCid = (cid?: string): string | undefined => {
  if (!cid) return undefined
  return cid.replace(/^ipfs:\/\//, '')
}

export const upsertMetadataFromEvents = async (
  scope: RuntimeScope,
  events: DecodedRuntimeEvent<Record<string, unknown>>[],
) => {
  // Reverse event array: blockchain API returns newest first, we need oldest first
  // This ensures latest metadata is written last, overwriting previous values
  const reversedEvents = [...events].reverse()
  
  const targets = reversedEvents
    .map(event => {
      const { boxId, boxInfoCID } = extractBoxInfoCid(event)
      const cid = sanitizeCid(boxInfoCID)
      // After using common utility, boxId of '0' will not be filtered
      // Only skip if boxId is undefined or cid is empty
      if (boxId === undefined || !cid) return null
      return { boxId, cid }
    })
    .filter((item): item is { boxId: string; cid: string } => Boolean(item))

  if (!targets.length) return

  const records: MetadataRecord[] = []
  const failedBoxes: Array<{ boxId: string; cid: string; error: string }> = []
  
  for (const target of targets) {
    try {
      const metadata = await fetchMetadataBox(target.cid)
      records.push(normalizeMetadataRecord(scope, target.boxId, metadata))
      console.log(`✅ Successfully fetched metadata for box ${target.boxId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      failedBoxes.push({ boxId: target.boxId, cid: target.cid, error: errorMessage })
      console.warn(`⚠️  Failed to fetch metadata for box ${target.boxId} (CID: ${target.cid}):`, errorMessage)
    }
  }

  // If there are failed records, log but don't prevent processing successful records
  if (failedBoxes.length > 0) {
    console.warn(
      `⚠️  ${failedBoxes.length} box metadata fetch failed. ` +
      `These boxes will be skipped for now and can be retried later.`
    )
  }

  if (!records.length) return

  const supabase = getSupabaseClient()
  // Sanitize all records to ensure no BigInt
  const sanitizedRecords = records.map(record => sanitizeForSupabase(record) as MetadataRecord)
  const { error } = await supabase.from('metadata_boxes').upsert(sanitizedRecords, {
    onConflict: 'network,layer,id',
  })
  if (error) {
    throw new Error(`Failed to upsert metadata_boxes: ${error.message}`)
  }

  // Update boxes table so box_info_cid stays fresh
  await Promise.all(
    records.map(record =>
      supabase
        .from('boxes')
        .update({ box_info_cid: targets.find(t => t.boxId === record.id)?.cid })
        .match({ network: record.network, layer: record.layer, id: record.id }),
    ),
  )
}
