import type { DecodedRuntimeEvent } from '../oasisQuery/app/services/events'


interface EventErrorFix {
    contractAddress: string,
    contractName: string,
    txHash: string
    eventName: string
    paramName: string
    incorrectValue: string
    correctValue: string
    round: number
}

const TRUTH_BOX_EVENT_FIXES: EventErrorFix[] = [
    {
        contractAddress: "GuwBl7DdwEEjk4E/hjOCdI2lwB4=",
        contractName: 'TruthBox',
        txHash: '777172dd777fcb7bd53c585f587d71ef380e1f54ee1807758fbb61854b64f42f',
        eventName: 'BoxCreated',
        paramName: 'userId',
        incorrectValue: '2',
        correctValue: '1',
        round: 14484034,
    }
]

const EXCHANGE_EVENT_FIXES: EventErrorFix[] = [
    {
        contractAddress: "/UxM+osd868/egemMLL7umtFtA0=",
        contractName: 'Exchange',
        txHash: 'f2381b7079cee11324c57c18a2c6103163fa65c6ee59200ffa6be7a434257e98',
        eventName: 'BoxPurchased',
        paramName: 'userId',
        incorrectValue: '4',
        correctValue: '3',
        round: 14785168
    },
    {
        contractAddress: "/UxM+osd868/egemMLL7umtFtA0=",
        contractName: 'Exchange',
        txHash: '967e5c6cd6b61874864c1d006f914fb00ffa2cd6fbf0aaca8d0e19074178ab37',
        eventName: 'BidPlaced',
        paramName: 'userId',
        incorrectValue: '3',
        correctValue: '2',
        round: 14770576,
    }
]


export function fixEventErrorParam(
    event: DecodedRuntimeEvent<Record<string, unknown>>,
    paramName: string,
    originalValue: string
): string {

    const txHash = event.raw.tx_hash ?? event.raw.eth_tx_hash
    const round = event.raw.round
    if (!txHash || round > 14785168) return originalValue

    const contractAddress = event.raw.body?.address
    let events: EventErrorFix[] = []
    if (contractAddress) {
        if (contractAddress === "GuwBl7DdwEEjk4E/hjOCdI2lwB4=") {
            events = TRUTH_BOX_EVENT_FIXES;
        }
        else if (contractAddress === "/UxM+osd868/egemMLL7umtFtA0=") {
            events = EXCHANGE_EVENT_FIXES;
        }
    }
    const fix = events.find(f =>
        f.txHash === txHash &&
        f.eventName === event.eventName &&
        f.paramName === paramName &&
        f.incorrectValue === originalValue
    )

    if (fix) {
        return fix.correctValue
    }

    return originalValue
}