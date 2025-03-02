import { useContext, useEffect, useState } from "react";
import { ButtonView, Caption, Center, HBox, Title, TransparentButton, VBox } from "react-native-boxes";
import { AppContext } from "./AppContext";
import { Button } from "react-native";
import Slider from '@react-native-community/slider';

export function TimeTravel() {
    const { context, setContext } = useContext(AppContext)
    const theme = context.theme
    const tickerApi = context.tickApi
    const [times, setTimes] = useState<string[]>([])
    const [enabled, setEnabled] = useState(false)

    const [sliderValue, setSliderValue] = useState(10);

    useEffect(() => {
        tickerApi.getTimeFrames().then(setTimes)
    }, [])
    return (
        <VBox>
            <Center>
                <Title>
                    {times?.[sliderValue]}
                </Title>
            </Center>
            <Slider
                style={{ width: 200, height: 40 }}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor="#FFFFFF"
                maximumTrackTintColor="#000000"
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

                    }}>Seek</ButtonView>
                <ButtonView
                    style={{
                        width: '50%'
                    }} onPress={() => {

                    }}>Play</ButtonView>
            </Center>

            <Caption>
                Time travel lets you seek forward and backward in time.
            </Caption>
        </VBox>
    )
}