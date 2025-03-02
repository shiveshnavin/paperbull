import { Tick } from "./models/Tick";


export type Snapshot = {
    date: string
    time: string
    ticks: Tick[]
}


export class TickerApi {
    snapshotPrev: Snapshot = {} as Snapshot
    snapshot: Snapshot = {} as Snapshot
    symbols: string[] = [];
    currentListenCallback: ((ticks: Tick[]) => void) | null = null;
    timeframe: "realtime" | "1s" | "10s" | "1m" | "10m"

    constructor(timeframe: "realtime" | "1s" | "10s" | "1m" | "10m" = 'realtime') {
        this.timeframe = timeframe
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

    async subscribe(instrumentToken: string[]) {

    }

    async listen(onTick: (ticks: Tick[]) => void) {

    }

    async stopSeek() {

    }

    async seekForward(date: string, time: string, processIntermediates = true): Promise<Tick[]> {
        // calls the onTick function with the ticks with timeframe sampling
        return []
    }

    async seekBack(date: string, time: string): Promise<Tick[]> {
        return []
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

