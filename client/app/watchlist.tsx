import { Center, DarkColors, HBox, Theme, ThemeContext, Title, TransparentButton, TransparentCenterToolbar, VPage } from 'react-native-boxes';
import { useStyle } from '../components/style';
import { useState } from 'react';

export default function TabTwoScreen() {
  const styles = useStyle()
  return (
    <VPage style={styles.container}>
      <TransparentCenterToolbar title="Watchlist" />
    </VPage>
  );
}