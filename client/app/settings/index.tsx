import { ButtonView, CardView, HBox, KeyboardAvoidingScrollView, ProgressBarView, Spinner, TextView, ThemeContext, TitleText, TransparentButton, TransparentCenterToolbar, VBox, VPage } from "react-native-boxes";
import { useStyle } from "../../components/style";
import { useContext, useEffect, useState } from "react";
import { Button } from "react-native";
import { FilePicker } from "../../components/filepicker/FilePicker";
import { useEventListener, useEventPublisher } from "../../components/store";
import { Topic } from "../../components/EventListeners";
import { AppContext } from "../../components/AppContext";
import { Tick } from "../../services/models/Tick";
import { ReactUtils } from "../../utils/ReactUtils";


export default function Settings() {

    const theme = useContext(ThemeContext)
    const styles = useStyle(theme)
    return (

        <VPage style={styles.container}>
            <TransparentCenterToolbar title="Settings" />
            <KeyboardAvoidingScrollView>
                <LoadCsv />
                <MetaData />
            </KeyboardAvoidingScrollView>
        </VPage>
    )
}


export function MetaData() {
    const { context } = useContext(AppContext)
    const tickerApi = context.tickApi
    const theme = context.theme
    const [error, setError] = useState<String | undefined>(undefined)
    const [loading, setLoading] = useState(false)

    const [size, setSize] = useState(0)
    const [availableSymbols, setAvailableSymbols] = useState<Tick[]>([])
    const [availableDates, setAvailableDates] = useState<string[]>([])
    function loadMetaInfo() {
        setLoading(true)
        Promise.all([
            tickerApi.getDataSize().then(setSize),
            tickerApi.
                getAvailableSymbols()
                .then((symbols) => {
                    setAvailableSymbols(symbols)
                    let dates = new Set<string>()
                    let times = new Set<string>()
                    symbols.forEach(s => {
                        dates.add(s.getDate())
                        times.add(s.getTime())
                    })
                    setAvailableDates(Array.from(dates))
                }),
        ]).catch(e => {
            setError(e.message)
        }).finally(() => {
            setLoading(false)
        })
    }
    useEffect(() => {
        loadMetaInfo()
    }, [])


    return (
        <CardView>
            <TitleText>Dataset Info</TitleText>
            {
                loading && (
                    <Spinner />
                )
            }
            <HBox>
                <TextView>Total {size} data points across {availableSymbols.length} instruments</TextView>
            </HBox>
            {
                availableDates.map(a => {
                    return (
                        <TextView id={`${a}-${ReactUtils.getRandomNumber(0, 111)}`}>{a}</TextView>
                    )
                })
            }
            <TransparentButton onPress={() => {
                loadMetaInfo()
            }}>Refresh</TransparentButton>

            {
                error && (
                    <TextView style={{
                        color: theme.colors.critical
                    }}>{error}</TextView>
                )
            }
        </CardView>
    )
}

export function LoadCsv() {
    const theme = useContext(ThemeContext)
    const styles = useStyle(theme)
    const [loadProgress, setLoadProgress] = useState(-1)
    const [processComplete, setProcessComplete] = useState<String | undefined>(undefined)
    const [processError, setErocessError] = useState<String | undefined>(undefined)
    const publisher = useEventPublisher()


    useEventListener(Topic.INGEST_CSV_ERROR, ({ message }) => {
        setErocessError(message)
    })
    useEventListener(Topic.INGEST_CSV_PROGRESS, ({ progress, total }) => {
        console.log('Progress', progress, total, (progress / total) * 100)
        if (progress >= 0) {
            setLoadProgress((progress / total) * 100)
            if (progress == total) {
                setProcessComplete(`Imported ${progress} data points.`)
                setLoadProgress(-1)
            }
        }
        else if (progress < 0) {
            setLoadProgress(-1)
        }
    })
    return (
        <CardView>
            <TitleText>Load CSV</TitleText>
            <TextView>Select a file containing the market data. Existing data will be unloaded when you load new data.</TextView>
            {
                processComplete && (
                    <TextView style={{
                        color: theme.colors.success
                    }}>{processComplete}</TextView>
                )
            }
            {
                processError && (
                    <TextView style={{
                        color: theme.colors.critical
                    }}>{processError}</TextView>
                )
            }
            {
                loadProgress > -1 ? (
                    <VBox>
                        <ProgressBarView progress={loadProgress} />
                        <TransparentButton text="Cancel" onPress={() => {
                            publisher(Topic.INGEST_CSV_CANCEL, {})
                        }} />
                    </VBox>
                ) : (
                    <FilePicker
                        auto={false}
                        text="Select File"
                        onFiles={(files) => {
                            setProcessComplete(undefined)
                            setErocessError(undefined)
                            if (files.length > 0)
                                publisher(Topic.INGEST_CSV, files[0])
                        }}
                    />
                )
            }
        </CardView>
    )
}