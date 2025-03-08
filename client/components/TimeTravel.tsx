import { useContext, useEffect, useReducer, useState } from "react";
import { ButtonView, Caption, Center, DropDownView, HBox, Icon, PressableView, Spinner, Storage, TextView, Title, TitleText, TransparentButton, VBox } from "react-native-boxes";
import { AppContext } from "./AppContext";
import { Button, FlatList } from "react-native";
import { Topic, useEventListener, useEventPublisher } from "./store";
import { PaperbullTimeBar } from "./Slider";
import { useStyle } from "./style";
import { Snapshot, UIResolution } from "../services/TickerApi";
// import Slider from '@react-native-community/slider';

export function TimeTravel({ onDismiss }: any) {
    const { context, setContext } = useContext(AppContext)
    const theme = context.theme
    const tickerApi = context.tickApi
    const [times, setTimes] = useState<string[]>([])
    const [dates, setDates] = useState<string[]>([])

    const [enabled, setEnabled] = useState(false)
    const publishEvent = useEventPublisher()


    const [preDateValue, setPreDateValue] = useState(tickerApi.getCurrentSnapshot().date);
    const [dateValue, setDateValue] = useState(tickerApi.getCurrentSnapshot().date);

    const [prevTimeValue, setPreTimeValue] = useState(times.indexOf(tickerApi.getCurrentSnapshot().time) > -1 ? times.indexOf(tickerApi.getCurrentSnapshot().time) : 0);
    const [timeValue, setTimeValue] = useState(times.indexOf(tickerApi.getCurrentSnapshot().time) > -1 ? times.indexOf(tickerApi.getCurrentSnapshot().time) : 0);

    const [uiTimeFrame, setUITimeFrame] = useState<UIResolution>("realtime")
    const style = useStyle(theme)
    const [, forceUpdate] = useReducer(x => x + 1, 0);

    useEventListener(Topic.SNAPSHOT_UPDATE, (snapshot: Snapshot) => {
        // console.log('snapshot,snapshot', snapshot)
        // console.log('tikcer,snapshot', tickerApi.getCurrentSnapshot())
        setPreTimeValue(timeValue)
        setTimeValue(times.indexOf(snapshot.time))
        setPreDateValue(dateValue)
        setDateValue(snapshot.date)
        forceUpdate()
    })

    useEffect(() => {
        Storage.getKeyAsync('preferred_ui_timeframe').then((t) => {
            setUITimeFrame(t as UIResolution || "realtime")
        })
        tickerApi.getTimeFrames().then(setTimes)

        tickerApi.
            getAvailableSymbols()
            .then((symbols) => {
                let dates = new Set<string>()
                let times = new Set<string>()
                symbols.forEach(s => {
                    dates.add(s.getDate())
                    times.add(s.getTime())
                })
                const _dates = Array.from(dates)
                setDates(_dates)
                const _times = Array.from(times).sort()
                // setTimes(_times)
                // if (_dates.length > 0) {
                //     setPreDateValue(_dates[0])
                //     setDateValue(_dates[_dates.length - 1])
                // }
            })
    }, [])

    if (times.length == 0) {
        return <Center style={{
            height: theme.dimens.space.xl * 2
        }}>
            <Spinner size="large" />
        </Center>
    }

    if (tickerApi.isPlaying()) {

        return (
            <Center>
                <Caption>{dateValue}</Caption>
                <Title>{parseTime(times[timeValue])}</Title>
                <ButtonView
                    underlayColor={theme.colors.critical}
                    style={{
                        backgroundColor: theme.colors.critical
                    }}
                    onPress={async () => {
                        await tickerApi.stopSeek()
                        forceUpdate()
                    }}>
                    <Center style={{
                        flexDirection: 'row'
                    }}>
                        <Icon name="pause" />
                    </Center>
                </ButtonView>
            </Center>
        )

    }
    return (
        <VBox>
            <Center style={{
                marginTop: theme.dimens.space.lg,
                flexDirection: 'row'
            }}>
                <Center style={{
                    alignItems: 'center'
                }}>
                    <DropDownView
                        title="Current date"
                        //@ts-ignore
                        underlayColor={theme.colors.transparent}
                        style={{
                            margin: 0,
                            padding: 0,
                            width: 120,
                            color: theme.colors.accent,
                            backgroundColor: theme.colors.transparent,
                        }}
                        displayType={"button"}
                        options={dates.map(d => ({
                            id: d,
                            value: d,
                            title: d
                        }))} selectedId={preDateValue} onSelect={setPreDateValue} />
                    <Title style={{
                        color: theme.colors.caption
                    }}>
                        {parseTime(times[prevTimeValue])}
                    </Title>
                </Center>
                <Icon name="arrow-right" style={{
                    padding: theme.dimens.space.md
                }} />
                <Center style={{
                    alignItems: 'center'
                }}>
                    <DropDownView
                        title="New date"
                        //@ts-ignore
                        underlayColor={theme.colors.transparent}
                        style={{
                            margin: 0,
                            padding: 0,
                            width: 120,
                            color: theme.colors.accent,
                            backgroundColor: theme.colors.transparent,
                        }}
                        displayType={"button"}
                        options={dates.map(d => ({
                            id: d,
                            value: d,
                            title: d
                        }))} selectedId={dateValue} onSelect={setDateValue} />
                    <Title>
                        {parseTime(times[timeValue])}
                    </Title>
                </Center>
            </Center>
            <PaperbullTimeBar
                style={{
                    marginTop: theme.dimens.space.lg,
                    marginBottom: theme.dimens.space.lg,
                }}
                minimumValue={0}
                maximumValue={times.length - 1}
                value={timeValue}
                onValueChange={setTimeValue}
            />



            {
                (prevTimeValue != timeValue || preDateValue != dateValue) && (

                    <>
                        <DropDownView
                            style={{
                                margin: 0,
                                padding: 0,
                            }}
                            onSelect={(id) => {
                                tickerApi.uiTimeframe = id as any
                                setUITimeFrame(id as UIResolution)
                                Storage.setKeyAsync('preferred_ui_timeframe', id)
                            }}
                            selectedId={uiTimeFrame}
                            title="Play type in UI"
                            options={[{
                                id: 'realtime',
                                value: 'realtime',
                                title: 'Realtime'
                            },
                            {
                                id: 'minute',
                                value: 'minute',
                                title: 'Minute by Minute'
                            },
                            {
                                id: 'fastforward',
                                value: 'fastforward',
                                title: 'Fast forward'
                            }]} />
                        <Center style={{
                            flex: 1,
                            marginRight: theme.dimens.space.sm,
                            marginLeft: theme.dimens.space.sm,
                            flexDirection: 'row'
                        }}>
                            <ButtonView
                                style={{
                                    width: '50%'
                                }}
                                onPress={() => {
                                    if ((timeValue) < (prevTimeValue)) {
                                        tickerApi.getSnapShot(tickerApi.getCurrentSnapshot().date, times[timeValue]).then(snapshot => {
                                            publishEvent(Topic.SNAPSHOT_UPDATE, snapshot)
                                        })
                                    } else {
                                        tickerApi.getSnapShot(tickerApi.getCurrentSnapshot().date, times[timeValue]).then(snapshot => {
                                            publishEvent(Topic.SNAPSHOT_UPDATE, snapshot)
                                        })
                                    }
                                    setPreTimeValue(timeValue)
                                }}>Seek</ButtonView>
                            <ButtonView
                                disabled={(timeValue) < (prevTimeValue)}
                                style={{
                                    width: '50%',
                                    backgroundColor: (
                                        (timeValue) < (prevTimeValue) ? theme.colors.caption : theme.colors.accent
                                    )
                                }}
                                onPress={() => {
                                    tickerApi.uiTimeframe = uiTimeFrame
                                    tickerApi.seekForward(dateValue, times[timeValue])
                                    setPreTimeValue(timeValue)
                                    forceUpdate()
                                    onDismiss()
                                }}>Play</ButtonView>

                        </Center>



                        <Caption style={{
                            marginRight: 0,
                            marginLeft: 0
                        }}>
                            With Seek, You can directly jump to the specified time. It does not read the data in between and and just pulls out the data at the end of the seeked minute. You orders will not get triggered.
                        </Caption>
                        <Caption style={{
                            marginRight: 0,
                            marginLeft: 0
                        }}>
                            With Play, Each tick will be processed and orders if any will get triggered. You can choose to watch the data in UI minute by minute or directly jump using fast forward. You cannot play while travelling back in time.
                        </Caption>
                    </>
                )
            }
        </VBox>
    )
}

export function parseTime(time: string) {
    if (typeof time !== 'string' || time.length !== 4) {
        return "Invalid time format"; // Handle invalid input
    }

    const hours = parseInt(time.substring(0, 2), 10);
    const minutes = parseInt(time.substring(2, 4), 10);

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return "Invalid time values"; // Handle invalid time values
    }

    let period = "AM";
    let formattedHours = hours;

    if (hours >= 12) {
        period = "PM";
        if (hours > 12) {
            formattedHours -= 12;
        }
    }

    if (formattedHours === 0) {
        formattedHours = 12; // Handle midnight
    }

    const formattedMinutes = minutes.toString().padStart(2, '0');

    return `${formattedHours}:${formattedMinutes} ${period}`;
}
