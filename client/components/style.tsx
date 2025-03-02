import { useTheme } from '@react-navigation/native';
import { useContext } from 'react';
import { StyleSheet, Image, Platform } from 'react-native';
import { ThemeContext } from 'react-native-boxes';

export function useStyle() {
    const theme = useContext(ThemeContext)
    return StyleSheet.create({
        container: {
            flex: 1,
            padding: theme.dimens.space.md,
        },
        fullscreen: {
            flex: 1,
        },
    });
}