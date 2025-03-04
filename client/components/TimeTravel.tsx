import { useContext, useEffect, useState } from "react";
import { ButtonView, Caption, Center, DropDownView, HBox, Icon, Title, TransparentButton, VBox } from "react-native-boxes";
import { AppContext } from "./AppContext";
import { Button, FlatList } from "react-native";
import { useEventPublisher } from "./store";
import { Topic } from "./EventListeners";
import { PaperbullTimeBar } from "./Slider";
import { useStyle } from "./style";
// import Slider from '@react-native-community/slider';

export function TimeTravel() {
    const { context, setContext } = useContext(AppContext)
    const theme = context.theme
    const tickerApi = context.tickApi
    const [times, setTimes] = useState<string[]>([])
    const [enabled, setEnabled] = useState(false)
    const publishEvent = useEventPublisher()
    const [prevsliderValue, setPreSliderValue] = useState(times.indexOf(tickerApi.snapshot.time) > -1 ? times.indexOf(tickerApi.snapshot.time) : 0);
    const [sliderValue, setSliderValue] = useState(0);
    const [selectedPlayType, setSelectedPlayType] = useState("realtime")
    const style = useStyle(theme)

    useEffect(() => {
        tickerApi.getTimeFrames().then(setTimes)
    }, [])
    return (
        <VBox>
            <Center style={{
                marginTop: theme.dimens.space.lg,
                flexDirection: 'row'
            }}>
                <Title style={{
                    color: theme.colors.caption
                }}>
                    {parseTime(times[prevsliderValue])}
                </Title>
                <Icon name="arrow-right" style={{
                    padding: theme.dimens.space.md
                }} />
                <Title>
                    {parseTime(times[sliderValue])}
                </Title>
            </Center>
            <PaperbullTimeBar
                style={{
                    marginTop: theme.dimens.space.lg,
                    marginBottom: theme.dimens.space.lg,
                }}
                minimumValue={0}
                maximumValue={times.length - 1}
                value={sliderValue}
                onValueChange={setSliderValue}
            />

            <DropDownView
                style={{
                    margin: 0,
                    padding: 0,
                }}
                onSelect={setSelectedPlayType}
                selectedId={selectedPlayType}
                title="Play type in UI"
                options={[{
                    id: 'realtime',
                    value: 'realtime',
                    title: 'Realtime'
                }, {
                    id: 'minute',
                    value: 'minute',
                    title: 'Minute by Minute'
                },
                {
                    id: 'fast',
                    value: 'fast',
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
                        if ((sliderValue) < (prevsliderValue)) {
                            tickerApi.getSnapShot(tickerApi.snapshot.date, times[sliderValue]).then(snapshot => {
                                publishEvent(Topic.SNAPSHOT_UPDATE, snapshot)
                            })
                        } else {
                            tickerApi.getSnapShot(tickerApi.snapshot.date, times[sliderValue]).then(snapshot => {
                                publishEvent(Topic.SNAPSHOT_UPDATE, snapshot)
                            })
                        }
                        setPreSliderValue(sliderValue)
                    }}>Seek</ButtonView>
                <ButtonView
                    disabled={(sliderValue) < (prevsliderValue)}
                    style={{
                        width: '50%',
                        backgroundColor: (
                            (sliderValue) < (prevsliderValue) ? theme.colors.caption : theme.colors.accent
                        )
                    }}
                    onPress={() => {
                        tickerApi.seekForward(tickerApi.snapshot.date, times[sliderValue], false).then(snapshot => {
                            publishEvent(Topic.SNAPSHOT_UPDATE, true)
                        })
                        setPreSliderValue(sliderValue)
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
