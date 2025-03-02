import { useContext, useEffect, useState } from "react";
import { ButtonView, Caption, Center, HBox, Title, TransparentButton, VBox } from "react-native-boxes";
import { AppContext } from "./AppContext";
import { Button, FlatList } from "react-native";
import { useEventPublisher } from "./store";
import { Topic } from "./EventListeners";
// import Slider from '@react-native-community/slider';

export function TimeTravel() {
    const { context, setContext } = useContext(AppContext)
    const theme = context.theme
    const tickerApi = context.tickApi
    const [times, setTimes] = useState<string[]>([])
    const [enabled, setEnabled] = useState(false)
    const publishEvent = useEventPublisher()
    const [prevsliderValue] = useState(tickerApi.snapshot.time);
    const [sliderValue, setSliderValue] = useState(times[10]);

    useEffect(() => {
        tickerApi.getTimeFrames().then(setTimes)
    }, [])
    return (
        <VBox>
            <Center>
                <Title>
                    {sliderValue}
                </Title>
            </Center>
            {/* <Slider
                style={{ width: 200, height: 40 }}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor="#FFFFFF"
                maximumTrackTintColor="#000000"
            /> */}

            <FlatList
                style={{
                    maxHeight: 300
                }}
                data={times}
                renderItem={(time) => {

                    return (
                        <TransparentButton text={time.item} onPress={() => {
                            setSliderValue(time.item)
                        }} />
                    )
                }}
            />
            <Center style={{
                width: '100%',
                flexDirection: 'row'
            }}>
                <ButtonView
                    style={{
                        width: '50%'
                    }}
                    onPress={() => {
                        if (parseInt(sliderValue) < parseInt(prevsliderValue)) {
                            tickerApi.getSnapShot(tickerApi.snapshot.date, sliderValue).then(snapshot => {
                                publishEvent(Topic.SNAPSHOT_UPDATE, snapshot)
                            })
                        } else {
                            tickerApi.getSnapShot(tickerApi.snapshot.date, sliderValue).then(snapshot => {
                                publishEvent(Topic.SNAPSHOT_UPDATE, snapshot)
                            })
                        }
                    }}>Seek</ButtonView>
                <ButtonView
                    disabled={parseInt(sliderValue) < parseInt(prevsliderValue)}
                    style={{
                        width: '50%',
                        backgroundColor: (
                            parseInt(sliderValue) < parseInt(prevsliderValue) ? theme.colors.caption : theme.colors.accent
                        )
                    }}
                    onPress={() => {
                        tickerApi.seekForward(tickerApi.snapshot.date, sliderValue, false).then(snapshot => {
                            publishEvent(Topic.SNAPSHOT_UPDATE, true)
                        })
                    }}>Play</ButtonView>
            </Center>

            <Caption>
                Time travel lets you seek forward and backward in time.
            </Caption>
        </VBox>
    )
}