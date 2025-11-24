import type { DecodedRuntimeEvent } from '../oasisQuery/app/services/events'


export const extractTimestamp = (event: DecodedRuntimeEvent<Record<string, unknown>>): string => {
    const timestampStr = event.raw.timestamp // "timestamp": "2025-11-21T15:12:40Z", 需要转换为秒级时间戳
    if (timestampStr) {
        const timestamp = new Date(timestampStr).getTime()
        console.log('timestamp:', timestamp/1000)
        return String(timestamp/1000)
    } else {
        return String(Math.floor(Date.now() / 1000))
    }
}


export const extractRound = (event: DecodedRuntimeEvent<Record<string, unknown>>): string => {
    const round = event.raw.round
    if (round !== undefined && round !== null) {
        return String(round)
    }

    return "0";
}

