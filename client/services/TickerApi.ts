import { Tick } from "./models/Tick";


export type Snapshot = {
    date: string
    time: string
    ticks: Tick[]
}


export class TickerApi {
    snapshot: Snapshot = {} as Snapshot
    symbols: string[] = [];
    currentListenCallback: ((ticks: Tick[]) => void) | null = null;

    constructor(timeframe: "realtime" | "1s" | "10s" | "1m" | "10m" = 'realtime') {

    }

    async subscribe(instrumentToken: string[]) {

    }

    async listen(onTick: (ticks: Tick[]) => void) {

    }

    async seekForward(date: string, time: string, processIntermediates = true) {
        // calls the onTick function with the ticks with timeframe sampling
    }

    async seekBack(date: string, time: string) {

    }

    async getSnapShot(date: string, time: string): Promise<Snapshot> {
        return {} as Snapshot
    }

    async getAvailableSymbols(date?: string): Promise<Tick[]> {
        return []
    }

    async getDataSize(date?: string, time?: string): Promise<number> {
        return 0
    }
}

