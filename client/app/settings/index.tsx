import { BottomSheet, ButtonView, Caption, CardView, CompositeTextInputView, HBox, KeyboardAvoidingScrollView, PressableView, ProgressBarView, Spinner, Subtitle, TextView, ThemeContext, TitleText, TransparentButton, TransparentCenterToolbar, VBox, VPage } from "react-native-boxes";
import { useStyle } from "../../components/style";
import React, { useContext, useEffect, useState } from "react";
import { Button, FlatList } from "react-native";
import { FilePicker } from "../../components/filepicker/FilePicker";
import { useEventListener, useEventPublisher } from "../../components/store";
import { Topic } from "../../components/EventListeners";
import { AppContext } from "../../components/AppContext";
import { Tick } from "../../services/models/Tick";
import { ReactUtils } from "../../utils/ReactUtils";
import { MarketDataRow } from "../../services/SqliteTickerApi";
import Checkbox from 'expo-checkbox';


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
    const style = useStyle(theme)

    const [showSelectSymbols, setShowSelectSymbols] = useState(false)
    const [processComplete, setProcessComplete] = useState<boolean | undefined>(undefined)
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
    }, [processComplete])
    useEventListener(Topic.INGEST_CSV_PROGRESS, ({ progress, total }) => {
        console.log('Progress', progress, total, (progress / total) * 100)
        if (progress >= 0) {
            if (progress == total) {
                setProcessComplete((a) => (!a))
            }
        }
    })

    return (
        <CardView id="metadata">
            <Subtitle>Dataset Info</Subtitle>
            {
                loading && (
                    <Spinner />
                )
            }
            {
                tickerApi.snapshot?.date && (
                    <PressableView onPress={() => {
                        setShowSelectSymbols(true)
                    }}>
                        <TextView style={{
                            color: theme.colors.success
                        }}>Currently selected date {tickerApi.snapshot?.date}</TextView>
                    </PressableView>
                )
            }
            <HBox>
                <TextView>Total {size} data points across {availableSymbols.length} instruments.</TextView>
            </HBox>
            <Caption>
                Click on any of the below dates to replay that day.
            </Caption>
            {
                availableDates.map(a => {
                    return (
                        <PressableView id={`${a}-${ReactUtils.getRandomNumber(0, 111)}`}
                            onPress={() => {
                                tickerApi.snapshot = {
                                    date: a,
                                    ticks: [],
                                    time: '0915'
                                }
                                setShowSelectSymbols(true)
                            }}>
                            <TitleText style={style.link} >{a}</TitleText>
                        </PressableView>
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

            <BottomSheet
                onDismiss={() => {
                    setShowSelectSymbols(false)
                }}
                title="Select symbols" visible={showSelectSymbols}>
                <SearchBox symbols={availableSymbols} onDone={(ticks) => {
                    tickerApi.symbols = ticks.map(s => s.symbol)
                    tickerApi.getSnapShot(
                        tickerApi.snapshot.date,
                        '0915'
                    ).then((snap) => {

                    }).catch(e => {
                        setError(e.message)
                    }).finally(() => {
                        setLoading(false)
                    })
                }} />
            </BottomSheet>
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
        <CardView id="loadcsv">
            <Subtitle>Load CSV</Subtitle>
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


export function SearchBox({ symbols, onDone }: { symbols: Tick[], onDone: (syms: Tick[]) => void }) {
    const [searchText, setSearchText] = useState('');
    const [selected, setSelected] = useState<Tick[]>([]);
    const theme = useContext(ThemeContext)

    // Filter symbols based on search text
    const filteredSymbols = symbols.filter(symbol =>
        symbol.symbol.toLowerCase().includes(searchText.toLowerCase())
    );

    // Handle checkbox toggle
    const toggleSelection = (symbol: Tick) => {
        setSelected(prevSelected => {
            const isSelected = prevSelected.some(s => s.symbol === symbol.symbol);
            if (isSelected) {
                return prevSelected.filter(s => s.symbol !== symbol.symbol);
            } else {
                return [...prevSelected, symbol];
            }
        });
    };

    return (
        <VBox>
            {/* Search Input */}
            <CompositeTextInputView
                placeholder="Search symbols..."
                onChangeText={(text) => setSearchText(text)}
            />

            {/* List of Symbols with Checkboxes */}
            <FlatList
                showsVerticalScrollIndicator={false}
                style={{
                    margin: theme.dimens.space.md,
                    maxHeight: 200
                }}
                data={filteredSymbols}
                renderItem={({ item }) => (
                    <VBox key={item.symbol}

                    >

                        <PressableView onPress={() => toggleSelection(item)}>
                            <HBox style={{
                                alignItems: 'center'
                            }}>
                                <Checkbox
                                    style={{
                                        margin: theme.dimens.space.sm
                                    }}
                                    value={selected.some(s => s.symbol === item.symbol)} onValueChange={() => toggleSelection(item)} />
                                <TextView style={{
                                    flexGrow: 1
                                }} >{item.symbol}</TextView>
                            </HBox>
                        </PressableView>

                    </VBox>
                )}
            />

            <ButtonView onPress={() => onDone(selected)}>
                Done
            </ButtonView>
        </VBox>
    );
}