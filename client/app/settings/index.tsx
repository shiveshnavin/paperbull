import { BottomSheet, ButtonView, Caption, CardView, CompositeTextInputView, Expand, HBox, KeyboardAvoidingScrollView, PressableView, ProgressBarView, Spinner, Storage, Subtitle, TextView, ThemeContext, TitleText, TransparentButton, TransparentCenterToolbar, VBox, VPage } from "react-native-boxes";
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
        <CardView key="metadata">
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
                            color: theme.colors.accent
                        }}>Currently selected date is {tickerApi.snapshot?.date} with {tickerApi.symbols.length} instruments selected for paper trading.</TextView>
                    </PressableView>
                )
            }
            <HBox>
                <TextView>You have total {size} data points across {availableSymbols.length} instruments in this dataset.</TextView>
            </HBox>
            <Expand
                initialExpand={true}
                title="Available Dates"
                style={{
                    paddingStart: 0,
                    marginStart: -4
                }}>
                <TextView>
                    Click on any of the below dates to replay that day.
                </TextView>
                {
                    availableDates.map((a, idx) => {
                        return (
                            <PressableView key={`${a}-${idx}`}
                                onPress={() => {
                                    tickerApi.snapshot = {
                                        date: a,
                                        ticks: [],
                                        time: '0915'
                                    }
                                    Storage.setKeyAsync('snapshot', JSON.stringify(tickerApi.snapshot))
                                    setShowSelectSymbols(true)
                                }}>
                                <TitleText style={style.link} >{a}</TitleText>
                            </PressableView>
                        )
                    })
                }
            </Expand>
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
                title="Select instruments" visible={showSelectSymbols}>
                <SearchBox
                    selectedSymbols={tickerApi.symbols || []}
                    symbols={availableSymbols.map(m => m.symbol)}
                    onDone={(symbols) => {
                        setShowSelectSymbols(false)
                        tickerApi.symbols = symbols
                        Storage.setKeyAsync('symbols', JSON.stringify(symbols))
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
        <CardView key="loadcsv">
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


export function SearchBox({ symbols, selectedSymbols, onDone }: { symbols: string[], selectedSymbols: string[], onDone: (syms: string[]) => void }) {
    const [searchText, setSearchText] = useState('');
    const [selected, setSelected] = useState<string[]>([...selectedSymbols]);
    const theme = useContext(ThemeContext)
    const filteredSymbols = symbols
        .map(symbol => {
            const symbolLower = symbol.toLowerCase();
            const searchParts = searchText.toLowerCase().split(' ');
            let score = 0;
            for (const part of searchParts) {
                if (symbolLower.includes(part)) {
                    score++;
                }
            }
            return { symbol, score };
        })
        .filter(symbol => symbol.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(e => e.symbol);
    const toggleSelection = (symbol: string) => {
        setSelected(prevSelected => {
            const isSelected = prevSelected.some(s => s === symbol);
            if (isSelected) {
                return prevSelected.filter(s => s !== symbol);
            } else {
                return [...prevSelected, symbol];
            }
        });
    };

    return (
        <VBox>
            <CompositeTextInputView
                placeholder="Search symbols..."
                onChangeText={(text) => setSearchText(text)}
            />
            <Caption>
                Since there are a lot of instruments avaialble in the dataset, select only those symbols that you intend to monitor or paper trade to make sure device performace is not degraded.
            </Caption>

            <FlatList
                showsVerticalScrollIndicator={false}
                style={{
                    maxHeight: 250,
                    marginBottom: theme.dimens.space.md
                }}
                data={searchText ? filteredSymbols : selectedSymbols}
                renderItem={({ item }) => (
                    <VBox key={item}>
                        <PressableView onPress={() => toggleSelection(item)}>
                            <HBox style={{
                                alignItems: 'center',
                                overflow: 'hidden',
                                width: '100%',
                            }}>
                                <Checkbox
                                    style={{
                                        margin: theme.dimens.space.sm,
                                    }}
                                    value={selected.some(s => s === item)}
                                    onValueChange={() => toggleSelection(item)}
                                />
                                <TextView style={{
                                    flexGrow: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    paddingRight: theme.dimens.space.md
                                }}>
                                    {item?.split("-")[0]}
                                </TextView>
                            </HBox>
                        </PressableView>
                    </VBox>
                )}
            />

            <ButtonView
                onPress={() => onDone(selected)}>
                Done
            </ButtonView>
        </VBox>
    );
}