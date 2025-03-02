import { useContext } from "react"
import { PickedFile } from "./filepicker/FilePickerProps"
import { useEventListener } from "./store"
import { AppContext } from "./AppContext"
import { SqliteTickerApi } from "../services/SqliteTickerApi"

export function EventListeners() {

    const appContext = useContext(AppContext)

    useEventListener(Topic.INGEST_CSV, (file: PickedFile) => {
        let tickerApi = appContext.context.tickApi as SqliteTickerApi
        console.log('Processing file', file)

        tickerApi.loadFromCsv(file).catch(e => {
            console.log('Error loading CSV', e)
        })
    })


    return null
}


export const Topic = {
    INGEST_CSV: 'INGEST_CSV'
}