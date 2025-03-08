
import React, { useContext, useState } from "react";
import Slider from '@react-native-community/slider';
import { StyleSheet, View, ViewStyle } from "react-native";
import { Icon, ThemeContext } from "react-native-boxes";

export const PaperbullTimeBar = (props: {
    onValueChange: (newVal: number) => void,
    text?: string,
    icon?: string,
    value: number,
    minimumValue?: number,
    step?: number,
    maximumValue?: number,
    showEndTexts?: boolean,
    style?: ViewStyle
}) => {
    const [value, setValue] = useState(props.value)
    const theme = useContext(ThemeContext)
    return (
        <Slider
            value={value}
            step={props.step || 1}
            onValueChange={(val) => {
                props.onValueChange(val)
            }}
            style={props.style}
            minimumValue={props.minimumValue || 0}
            maximumValue={props.maximumValue || 100}
            minimumTrackTintColor="#FFFFFF"
            maximumTrackTintColor="#000000"
            thumbTintColor={theme.colors.accent}
        />
    )
}