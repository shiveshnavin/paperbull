import { Tick } from "./models/Tick";


export type Snapshot = {
    date: string
    time: string
    ticks: Tick[]
}

export type Resolution = "realtime" | "1s" | "10s" | "1m" | "10m"
export type UIResolution = "realtime" | "minute" | "fastforward"
export class TickerApi {
    snapshotPrev: Snapshot = {} as Snapshot
    snapshot: Snapshot = {} as Snapshot
    protected symbols: string[] = [];
    currentListenCallback: ((ticks: Tick[]) => void) | null = null;
    protected timeframe: Resolution
    uiTimeframe: UIResolution

    constructor(timeframe: Resolution = 'realtime') {
        this.timeframe = timeframe
        this.uiTimeframe = "realtime"
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


    async subscribe(
        instrumentTokens: string[],
        resolution: Resolution,
        onProgress?: (progress: number, total: number) => void,
        setCancelHook?: (cancelCallback: () => void) => void) {
        this.symbols = instrumentTokens
    }

    getSymbols() {
        return this.symbols
    }

    async listen(onTick: (ticks: Tick[]) => void) {

    }

    async stopSeek() {

    }

    async seekForward(date: string, time: string, processIntermediates = true): Promise<Tick[]> {
        // calls the onTick function with the ticks with timeframe sampling
        return (await this.getSnapShot(date, time)).ticks
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

