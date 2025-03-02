import { Center, DarkColors, HBox, Theme, ThemeContext, Title, TransparentButton, TransparentCenterToolbar, VPage } from 'react-native-boxes';
import { useStyle } from '../components/style';
import { useContext, useState } from 'react';

export default function TabTwoScreen() {
  const theme = useContext(ThemeContext)
  const styles = useStyle(theme)
  return (
    <VPage style={styles.container}>
      <TransparentCenterToolbar title="Watchlist" />
    </VPage>
  );
}