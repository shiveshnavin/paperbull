import { Tick } from "./models/Tick";


export type Snapshot = {
    date: string
    time: string
    ticks: Tick[]
}

export type Resolution = "realtime" | "1s" | "10s" | "1m" | "10m"
/**
 * realtime - send ticks to ui every 100ms, process all ticks for orders
 * minute - send ticks to ui every second, ticks are the closing prices of that minute, process all ticks for orders
 * fastforward - send the final tick, process all ticks for orders
 */
export type UIResolution = "realtime" | "minute" | "fastforward"
export class TickerApi {
    protected snapshotPrev: Snapshot = {} as Snapshot
    protected snapshot: Snapshot = {} as Snapshot
    protected symbols: string[] = [];
    currentListenCallback: ((ticks: Tick[]) => void) | null = null;
    protected resolution: Resolution
    uiTimeframe: UIResolution
    intervalId: number | null = null

    constructor(timeframe: Resolution = 'realtime') {
        this.resolution = timeframe
        this.uiTimeframe = "realtime"
    }


    setSnapshot(snapshot: Snapshot) {
        this.snapshotPrev = snapshot
        this.snapshot = snapshot
    }

    getCurrentSnapshot() {
        return this.snapshot
    }
    getPrevSnapshot() {
        return this.getPrevSnapshot
    }

    async setSymbols(
        instrumentTokens: string[]) {
        this.symbols = instrumentTokens;

    }
    async getTimeFrames(): Promise<string[]> {
        const startTime = "0900";
        const endTime = "1530";
        return this.generateTimeFrames(startTime, endTime, 60);
    }

    private generateTimeFrames(startTime: string, endTime: string, intervalSeconds: number): string[] {
        const timeFrames: string[] = [];
        let currentTime = this.timeStringToSeconds(startTime);
        const endSeconds = this.timeStringToSeconds(endTime);

        while (currentTime <= endSeconds) {
            timeFrames.push(this.secondsToTimeString(currentTime));
            currentTime += intervalSeconds;
        }

        return timeFrames;
    }

    private timeStringToSeconds(time: string): number {
        const hours = parseInt(time.substring(0, 2), 10);
        const minutes = parseInt(time.substring(2, 4), 10);
        return hours * 3600 + minutes * 60;
    }

    private secondsToTimeString(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const hoursString = hours.toString().padStart(2, '0');
        const minutesString = minutes.toString().padStart(2, '0');
        return `${hoursString}${minutesString}`;
    }

    isPlaying() {
        return this.intervalId != null
    }

    setResolution(
        resolution: Resolution,
    ) {
        this.resolution = resolution
    }
    async subscribe(
        instrumentTokens: string[],
        resolution: Resolution,
        onProgress?: (progress: number, total: number) => void,
        setCancelHook?: (cancelCallback: () => void) => void) {
        this.symbols = instrumentTokens
        this.resolution = resolution
    }

    getSymbols() {
        return this.symbols
    }

    onTick?: (ticks: Tick[]) => Promise<void> = undefined
    async listen(onTick: (ticks: Tick[]) => Promise<void>) {
        this.onTick = onTick
    }

    async stopSeek() {
        this.intervalId && clearInterval(this.intervalId)
    }

    async getTicks(datetimefrom: number, datetimeto: number, onTick: (ticks: Tick[]) => Promise<void>)
        : Promise<number> {
        return 0
    }

    async seekForward(date: string, time: string, processIntermediates = true) {
        if (this.intervalId) {
            clearInterval(this.intervalId)
        }
        let curdateTime = toEpochMs((this.getCurrentSnapshot()).date, (this.getCurrentSnapshot()).time);
        let finaldateTime = toEpochMs(date, time);
        if (this.uiTimeframe == 'fastforward') {
            await this.getTicks(curdateTime, finaldateTime, async (ticks) => {
                this.setSnapshot({
                    date,
                    time,
                    ticks
                })
                this.onTick && (await this.onTick(ticks))
            })
        } else if (this.uiTimeframe == 'realtime') {
            while (curdateTime < finaldateTime) {
                curdateTime = curdateTime + 100
                await this.getTicks(curdateTime, curdateTime, async (ticks) => {
                    this.setSnapshot({
                        date,
                        time,
                        ticks
                    })
                    this.onTick && (await this.onTick(ticks))
                })
                await sleep(100)
            }
        } else if (this.uiTimeframe == 'minute') {
            while (curdateTime < finaldateTime) {
                curdateTime = curdateTime + 60 * 1000
                await this.getTicks(curdateTime, curdateTime, async (ticks) => {
                    this.setSnapshot({
                        date,
                        time,
                        ticks
                    })
                    this.onTick && (await this.onTick(ticks))
                })
                await sleep(1000)
            }
        }
    }

    async seekBack(date: string, time: string): Promise<Tick[]> {
        return (await this.getSnapShot(date, time)).ticks
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

function toEpochMs(date: string, time: string) {
    return new Date(`${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00.000Z`).getTime()
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
} 