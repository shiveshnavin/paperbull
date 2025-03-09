import { BottomSheet, ButtonView, Caption, CardView, CompositeTextInputView, DropDownView, Expand, HBox, KeyboardAvoidingScrollView, LoadingButton, PressableView, ProgressBarView, Spinner, Storage, Subtitle, SwitchView, TextView, ThemeContext, TitleText, TransparentButton, TransparentCenterToolbar, VBox, VPage } from "react-native-boxes";
import { useStyle } from "../../components/style";
import React, { useContext, useEffect, useState } from "react";
import { Button, FlatList } from "react-native";
import { FilePicker } from "../../components/filepicker/FilePicker";
import { Topic, useEventListener, useEventPublisher } from "../../components/store";
import { AppContext } from "../../components/AppContext";
import { Tick } from "../../services/models/Tick";
import { ReactUtils } from "../../utils/ReactUtils";
import { MarketDataRow, SqliteTickerApi } from "../../services/SqliteTickerApi";
import Checkbox from 'expo-checkbox';
import { Resolution, TickerApi } from "../../services/TickerApi";


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
                })
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
        // console.log('Progress', progress, total, (progress / total) * 100)
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
                tickerApi.getCurrentSnapshot()?.date && (
                    <PressableView onPress={() => {
                        setShowSelectSymbols(true)
                    }}>
                        <TextView style={{
                            color: theme.colors.accent
                        }}>Currently selected date is {tickerApi.getCurrentSnapshot()?.date} with {tickerApi.getSymbols().length} instruments selected for paper trading.</TextView>
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
                                    tickerApi.setSnapshot({
                                        date: a,
                                        ticks: [],
                                        time: '0915'
                                    })
                                    Storage.setKeyAsync('snapshot', JSON.stringify(tickerApi.getCurrentSnapshot()))
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
                    selectedSymbols={tickerApi.getSymbols() || []}
                    symbols={availableSymbols.map(m => m.symbol)}
                    onDone={(symbols) => {
                        setShowSelectSymbols(false);
                        Storage.setKeyAsync('symbols', JSON.stringify(symbols));
                        tickerApi.getSnapShot(
                            tickerApi.getCurrentSnapshot().date,
                            '0915'
                        ).then((snap) => {
                        }).catch(e => {
                            setError(e.message);
                        }).finally(() => {
                            setLoading(false);
                        });
                    }}
                    tickerApi={tickerApi} />
            </BottomSheet>
        </CardView>
    )
}

export function LoadCsv() {
    const theme = useContext(ThemeContext)
    const styles = useStyle(theme)
    const [loadProgress, setLoadProgress] = useState(-1)
    const { context } = useContext(AppContext)
    const [processComplete, setProcessComplete] = useState<String | undefined>(undefined)
    const [processError, setErocessError] = useState<String | undefined>(undefined)
    const publisher = useEventPublisher()
    const [clear, setClear] = useState(false)


    useEventListener(Topic.INGEST_CSV_ERROR, ({ message }) => {
        setErocessError(message)
    })
    useEventListener(Topic.INGEST_CSV_PROGRESS, ({ progress, total }) => {
        // console.log('Progress', progress, total, (progress / total) * 100)
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
            <SwitchView
                style={{
                    paddingTop: theme.dimens.space.sm
                }}
                text="Clear existing data" value={clear}
                onChange={(e) => {
                    setClear(e.nativeEvent.value)
                }} />
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
                            (clear ? (context.tickApi as SqliteTickerApi).clearDb() : Promise.resolve(true))
                                .then(() => {
                                    setProcessComplete(undefined)
                                    setErocessError(undefined)
                                    if (files.length > 0)
                                        publisher(Topic.INGEST_CSV, files[0])
                                })
                                .catch(e => {
                                    console.log("Error in clearDb", e)
                                    setErocessError(e.message)
                                })
                        }}
                    />
                )
            }
        </CardView>
    )
}


export function SearchBox({ symbols, selectedSymbols, tickerApi, onDone }: { symbols: string[], tickerApi: TickerApi, selectedSymbols: string[], onDone: (syms: string[]) => void }) {
    const [searchText, setSearchText] = useState('');
    const [selected, setSelected] = useState<string[]>([...selectedSymbols]);
    const theme = useContext(ThemeContext)
    const resolutions = ["realtime", "1s", "10s", "1m", "10m"]
    const [resolution, setResolution] = useState<Resolution>("realtime")
    const [loading, setLoading] = useState(false)


    const [loadProgress, setLoadProgress] = useState(-1)
    const [processComplete, setProcessComplete] = useState<String | undefined>(undefined)
    const [processError, setErocessError] = useState<String | undefined>(undefined)
    const publisher = useEventPublisher()

    useEffect(() => {
        Storage.getKeyAsync('preferred_resolution').then(r => {
            setResolution(r as Resolution || 'realtime')
        })
    }, [])



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

            {
                loadProgress == -1 && (
                    <>
                        <CompositeTextInputView
                            placeholder="Search symbols..."
                            onChangeText={(text) => setSearchText(text)}
                        />
                        <DropDownView
                            title="Resolution"
                            options={resolutions.map(op => ({
                                id: op,
                                value: op,
                                title: op
                            }))}
                            selectedId={resolution}
                            onSelect={(g) => {
                                Storage.setKeyAsync('preferred_resolution', g)
                                setResolution(g as any)
                            }}

                        />
                    </>
                )
            }
            <Caption>
                Realtime resolution processes all ticks but has poor performance while 10 min resolution has best performance but processes ticks from 10 min intervals.
            </Caption>
            <Caption>
                Select only those symbols that you intend to monitor or paper trade for better performance.
            </Caption>

            {
                loadProgress == -1 && (
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
                )}

            <LoadingButton
                style={{
                    display: loadProgress > -1 ? "none" : "flex"
                }}
                text={"Subscribe"}
                disabled={loading}
                loading={loading}
                onPress={() => {

                    setLoading(true)
                    tickerApi.subscribe(selected, resolution, (p, t) => {
                        setLoadProgress((p * 100 / t))
                    }).then(() => {
                        onDone(selected)
                    }).catch(e => {
                        console.log('tickerApi.subscribe', e)
                        setErocessError(e.message)
                        setLoadProgress(-1)
                    }).finally(() => {
                        setLoading(false)
                    })
                }} />
            {
                loadProgress > -1 && (
                    <ProgressBarView
                        style={{
                            marginBottom: theme.dimens.space.lg
                        }}
                        progress={loadProgress} />
                )
            }
            {
                processError && <TextView style={{ color: theme.colors.critical }}>{processError}</TextView>
            }
        </VBox>
    );
}