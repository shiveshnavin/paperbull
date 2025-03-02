import { Tick } from "./models/Tick";

export class TickerApi {

    constructor(timeframe: "realtime" | "1s" | "10s" | "1m" | "10m" = 'realtime') {

    }

    subscribe(instrumentToken: string[]) {

    }

    listen(onTick: (ticks: Tick[]) => void) {

    }

    seekForward(date: string, time: number, processIntermediates = true) {
        // calls the onTick function with the ticks with timeframe sampling
    }

    seekBack(date: string, time: number) {

    }

    getSnapShot() {

    }

}