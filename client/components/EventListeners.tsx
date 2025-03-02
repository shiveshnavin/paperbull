import { PickedFile } from "./filepicker/FilePickerProps"
import { useEventListener } from "./store"

export function EventListeners() {


    useEventListener(Topic.INGEST_CSV, (file: PickedFile) => {
        console.log('Processing file', file)
    })


    return null
}


export const Topic = {
    INGEST_CSV: 'INGEST_CSV'
}