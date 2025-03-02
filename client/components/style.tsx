import { useTheme } from '@react-navigation/native';
import { useContext } from 'react';
import { StyleSheet, Image, Platform } from 'react-native';
import { Theme, ThemeContext } from 'react-native-boxes';

export function useStyle(theme: Theme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            padding: theme.dimens.space.md,
        },
        fullscreen: {
            flex: 1,
        },
        link: {
            color: theme.colors.accent,
        },
    });
}