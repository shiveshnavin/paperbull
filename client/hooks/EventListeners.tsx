import { useContext, useState } from "react"
import { PickedFile } from "../components/filepicker/FilePickerProps"
import { Topic, useEventListener, useEventPublisher } from "../components/store"
import { AppContext } from "../components/AppContext"
import { SqliteTickerApi } from "../services/SqliteTickerApi"
import { BottomSheet } from "react-native-boxes"
import { TimeTravel } from "../components/TimeTravel"
import { Resolution } from "../services/TickerApi"

export function EventListeners() {
    const [showTimeTravel, setShowTimeTravel] = useState(false)
    const [ingestCsvCancel, setIngestCsvCancel] = useState(() => () => { })
    const appContext = useContext(AppContext)
    const tickerApi = appContext.context.tickApi
    const publishEvent = useEventPublisher()

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
            visible={showTimeTravel} onDismiss={() => {
                setShowTimeTravel(false)
            }}>
            <TimeTravel />
        </BottomSheet>
    )
}