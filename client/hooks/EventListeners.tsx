import { useCallback, useContext, useEffect, useState } from "react"
import { PickedFile } from "../components/filepicker/FilePickerProps"
import { Topic, useEventListener, useEventPublisher } from "../components/store"
import { AppContext } from "../components/AppContext"
import { SqliteTickerApi } from "../services/SqliteTickerApi"
import { BottomSheet } from "react-native-boxes"
import { TimeTravel } from "../components/TimeTravel"
import { Resolution, Snapshot } from "../services/TickerApi"
import { Tick } from "../services/models/Tick"

export function EventListeners() {
    const [showTimeTravel, setShowTimeTravel] = useState(false)
    const [ingestCsvCancel, setIngestCsvCancel] = useState(() => () => { })
    const appContext = useContext(AppContext)
    const tickerApi = appContext.context.tickApi
    const publishEvent = useEventPublisher()

    useEffect(() => {
        let frame = new Map<string, Tick>()
        tickerApi.getCurrentSnapshot().ticks.forEach(t => {
            frame.set(t.symbol, t)
        })
        let curFrameDatetimems: number = 0
        const $1Minute = 60 * 1000
        const $30mins = 30 * 60 * 1000
        const $100Ms = 100
        tickerApi.listen(async (ticks: Tick[], dateTime) => {
            // todo: process orders
            let dummyTick = new Tick({
                datetime: dateTime
            })
            // console.log('Reieceved', ticks.length, 'ticks', ticks)
            if (ticks.length == 0) {

                let dummySnapshot = {
                    date: dummyTick.getDate(),
                    time: dummyTick.getTime(),
                    ticks: Array.from(frame.values())
                } as Snapshot
                tickerApi.setSnapshot(dummySnapshot)
                publishEvent(Topic.SNAPSHOT_UPDATE, dummySnapshot)
                return
            }

            if (curFrameDatetimems == 0) {
                curFrameDatetimems = ticks[0]?.datetime
            }

            let uiTimeFrame = tickerApi.uiTimeframe
            if (uiTimeFrame == 'minute') {
                for (let tick of ticks) {
                    if (tick.datetime < (curFrameDatetimems + $1Minute)) {
                        frame.set(tick.symbol, tick)
                    }
                    else {
                        curFrameDatetimems = tick.datetime
                        let snap = {
                            date: tick.getDate(),
                            time: tick.getTime(),
                            ticks: Array.from(frame.values())
                        } as Snapshot
                        tickerApi.setSnapshot(snap)
                        publishEvent(Topic.SNAPSHOT_UPDATE, snap)
                    }
                }
                let snap = {
                    date: dummyTick.getDate(),
                    time: dummyTick.getTime(),
                    ticks: Array.from(frame.values())
                } as Snapshot
                tickerApi.setSnapshot(snap)
                publishEvent(Topic.SNAPSHOT_UPDATE, snap)

            }
            else if (uiTimeFrame == 'realtime') {
                for (let tick of ticks) {
                    if (tick.datetime < (curFrameDatetimems + $1Minute)) {
                        frame.set(tick.symbol, tick)
                    }
                    else {
                        curFrameDatetimems = tick.datetime
                        let snap = {
                            date: tick.getDate(),
                            time: tick.getTime(),
                            ticks: Array.from(frame.values())
                        } as Snapshot
                        tickerApi.setSnapshot(snap)
                        publishEvent(Topic.SNAPSHOT_UPDATE, snap)
                    }
                }
                let snap = {
                    date: dummyTick.getDate(),
                    time: dummyTick.getTime(),
                    ticks: Array.from(frame.values())
                } as Snapshot
                tickerApi.setSnapshot(snap)
                publishEvent(Topic.SNAPSHOT_UPDATE, snap)
            }
            else if (uiTimeFrame == 'fastforward') {
                for (let tick of ticks) {
                    if (tick.datetime < (curFrameDatetimems + $30mins)) {
                        frame.set(tick.symbol, tick)
                    }
                    else {
                        curFrameDatetimems = tick.datetime
                        let snap = {
                            date: tick.getDate(),
                            time: tick.getTime(),
                            ticks: Array.from(frame.values())
                        } as Snapshot
                        publishEvent(Topic.SNAPSHOT_UPDATE, snap)
                        tickerApi.setSnapshot(snap)
                    }
                }
                let snap = {
                    date: dummyTick.getDate(),
                    time: dummyTick.getTime(),
                    ticks: Array.from(frame.values())
                } as Snapshot
                tickerApi.setSnapshot(snap)
                publishEvent(Topic.SNAPSHOT_UPDATE, snap)
            }

        }, (e) => {
            console.log(e)
        })
    }, [tickerApi])

    useEventListener(Topic.TIME_TRAVEL, async () => {
        setShowTimeTravel(true)
    })
    useEventListener(Topic.INGEST_CSV_CANCEL, async () => {
        ingestCsvCancel && ingestCsvCancel()
        publishEvent(Topic.INGEST_CSV_PROGRESS, { progress: -1, total: 1 })
    })
    useEventListener(Topic.INGEST_CSV, async (file: PickedFile) => {
        let sqliteTickerApi = tickerApi as SqliteTickerApi
        await sqliteTickerApi.init()
        console.log('Processing file', file)

        sqliteTickerApi.loadFromCsv(file,
            (progress, total) => {
                publishEvent(Topic.INGEST_CSV_PROGRESS, {
                    progress,
                    total
                })
            }, (onCancel) => {
                setIngestCsvCancel(() => onCancel)
            })
            .then(() => {
                tickerApi.getDataSize('2025-03-01', '0915').then(console.log)
            })
            .catch(e => {
                // console.log('Error loading CSV', e)
                publishEvent(Topic.INGEST_CSV_ERROR, {
                    message: 'Error importing market data. ' + e.message
                })
            })
    })



    useEventListener(Topic.SUBSCRIBE, async ({ symbols, resolution }: { symbols: string[], resolution: Resolution }) => {
        let sqliteTickerApi = tickerApi as SqliteTickerApi
        await sqliteTickerApi.init()

        sqliteTickerApi.subscribe(symbols, resolution,
            (progress, total) => {
                publishEvent(Topic.SUBSCRIBE_PROGRESS, {
                    progress,
                    total
                })
            }, (onCancel) => {
                setIngestCsvCancel(() => onCancel)
            })
            .then(() => {

            })
            .catch(e => {
                publishEvent(Topic.SUBSCRIBE_ERROR, {
                    message: 'Error subscribing market data. ' + e.message
                })
            })
    })

    return (
        <BottomSheet
            title="Time Travel"
            visible={showTimeTravel}
            onDismiss={() => {
                setShowTimeTravel(false)
            }}>
            <TimeTravel onDismiss={() => setShowTimeTravel(false)} />
        </BottomSheet>
    )
}