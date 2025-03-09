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

    constructor(timeframe: Resolution = 'realtime') {
        this.resolution = timeframe
        this.uiTimeframe = "realtime"
    }


    setSnapshot(snapshot: Snapshot) {
        // console.log('setting snapshot', snapshot.time)
        this.snapshotPrev = this.snapshot
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
        const startTime = "0915";
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

    onTick?: (ticks: Tick[], dateTime: number) => Promise<void> = undefined
    onError?: (r: Error) => void = undefined
    async listen(onTick: (ticks: Tick[], dateTime: number) => Promise<void>, onError?: (e: Error) => void) {
        this.onTick = onTick
        this.onError = onError
    }

    stopped = true
    async stopSeek() {
        this.stopped = true
    }
    private isStopped() {
        return this.stopped
    }

    isPlaying() {
        return !this.isStopped()
    }

    async getTicks(datetimefrom: number, datetimeto: number, onTick: (ticks: Tick[]) => Promise<void>)
        : Promise<number> {
        throw new Error('getTicks Not implemented')
    }

    async getNextTicks(datetimefrom: number, limit: number, onTick: (ticks: Tick[]) => Promise<void>)
        : Promise<number> {
        throw new Error('getNextTicks Not implemented')
    }
    parseResolution(resolution: string) {
        let resolutionInterval = 0
        const unit = resolution.slice(-1);
        const value = parseInt(resolution);
        if (unit === "s") {
            resolutionInterval = value * 1000;
        } else if (unit === "m") {
            resolutionInterval = value * 60 * 1000;
        }
        return resolutionInterval
    }

    async seekForward(date: string, time: string) {
        this.stopSeek()
        this.stopped = false
        let curdateTime = toEpochMs((this.getCurrentSnapshot()).date, (this.getCurrentSnapshot()).time);
        let finaldateTime = toEpochMs(date, time);
        if (this.uiTimeframe == 'fastforward') {
            console.log('seek fast fwd!!', curdateTime, '->', finaldateTime)

            await this.getTicks(curdateTime, finaldateTime, async (ticks) => {
                // console.log('fasting to', finaldateTime, ticks.length)

                if (this.isStopped()) {
                    throw new Error('Seek stopped')
                }
                this.onTick && (await this.onTick(ticks, finaldateTime))
            }).catch(e => {
                if (!e.message.includes("Seek stopped"))
                    throw e
            }).catch(this.onError)

            // the expectation is that the tick listener will aggregate the ticks
            // and only publish them to UI when there are no more ticks to process
            // i.e. when the more ticks is an empty array
            this.stopSeek()
            this.onTick && (await this.onTick([], finaldateTime))

        } else if (this.uiTimeframe == 'realtime') {
            // console.log('seek realtime!!', curdateTime, '->', finaldateTime)
            let loadNextMinute = async () => {

                if (this.isStopped()) {
                    return
                }
                if (curdateTime < finaldateTime) {
                    let nextHit = curdateTime + 1000
                    let fetchedcount = await this.getTicks(curdateTime, nextHit, async (ticks) => {

                        this.onTick && (await this.onTick(ticks, nextHit))
                    }).catch(this.onError)
                    // console.log('fetchedcount at ', new Date(curdateTime).toLocaleTimeString(), fetchedcount)
                    if (fetchedcount == 0) {
                        let fetchedcountNext = await this.getNextTicks(curdateTime, 1, async (ticks) => {
                            ticks.forEach(t => {
                                if (nextHit < t.datetime) {
                                    nextHit = t.datetime
                                }
                                // console.log('getNextTicks realtime', new Date(t.datetime), t.last_price)
                            })
                            this.onTick && (await this.onTick(ticks, nextHit))
                        }).catch(this.onError)
                    }
                    curdateTime = nextHit
                    if (!this.isStopped())
                        setTimeout(loadNextMinute, 100)
                } else {
                    this.stopSeek()
                    this.onTick && (await this.onTick([], finaldateTime))
                }
            }
            loadNextMinute()

        } else if (this.uiTimeframe == 'minute') {
            let loadNextMinute = async () => {

                if (this.isStopped()) {
                    return
                }
                if (curdateTime < finaldateTime) {
                    let nextHit = curdateTime + 60 * 1000
                    let fetchedcount = await this.getTicks(curdateTime, nextHit, async (ticks) => {
                        // console.log('getTicks at ', new Date(curdateTime).toLocaleTimeString(), ticks)

                        this.onTick && (await this.onTick(ticks, nextHit))
                    }).catch(this.onError)
                    if (fetchedcount == 0) {
                        let fetchedcountNext = await this.getNextTicks(curdateTime, 1, async (ticks) => {
                            ticks.forEach(t => {
                                if (nextHit < t.datetime) {
                                    nextHit = t.datetime
                                }
                                // console.log('getNextTicks realtime', new Date(t.datetime), t.last_price)
                            })
                            this.onTick && (await this.onTick(ticks, nextHit))
                        }).catch(this.onError)
                    }
                    curdateTime = nextHit
                    if (!this.isStopped())
                        setTimeout(loadNextMinute, 1000)
                } else {
                    this.stopSeek()
                    this.onTick && (await this.onTick([], finaldateTime))
                }
            }
            loadNextMinute()
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
    return new Date(`${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00.000+05:30`).getTime();
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
} 