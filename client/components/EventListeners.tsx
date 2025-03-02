import { useContext, useState } from "react"
import { PickedFile } from "./filepicker/FilePickerProps"
import { useEventListener, useEventPublisher } from "./store"
import { AppContext } from "./AppContext"
import { SqliteTickerApi } from "../services/SqliteTickerApi"
import { BottomSheet } from "react-native-boxes"
import { TimeTravel } from "./TimeTravel"

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
        await sqliteTickerApi.clearDb().catch(e => {
            console.log("Error dropping clearDb", e)
        })
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


export const Topic = {
    TIME_TRAVEL: 'TIME_TRAVEL',
    SNAPSHOT_UPDATE: 'SNAPSHOT_UPDATE',
    INGEST_CSV: 'INGEST_CSV',
    INGEST_CSV_PROGRESS: 'INGEST_CSV_PROGRESS',
    INGEST_CSV_ERROR: 'INGEST_CSV_ERROR',
    INGEST_CSV_CANCEL: 'INGEST_CSV_CANCEL',
}