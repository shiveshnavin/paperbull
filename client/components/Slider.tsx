
import React, { useContext } from "react";
import Slider from '@react-native-community/slider';
import { StyleSheet, View, ViewStyle } from "react-native";
import { Icon, ThemeContext } from "react-native-boxes";

export function PaperbullTimeBar(props: {
    onValueChange: (newVal: number) => void,
    text?: string,
    icon?: string,
    value: number,
    minimumValue?: number,
    step?: number,
    maximumValue?: number,
    showEndTexts?: boolean,
    style?: ViewStyle
}) {
    const theme = useContext(ThemeContext)
    return (
        <Slider
            step={props.step || 1}
            onValueChange={props.onValueChange}
            style={props.style}
            minimumValue={props.minimumValue || 0}
            maximumValue={props.maximumValue || 100}
            minimumTrackTintColor="#FFFFFF"
            maximumTrackTintColor="#000000"
            thumbTintColor={theme.colors.accent}
        />
    )
}
