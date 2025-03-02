import { Center, DarkColors, HBox, Theme, ThemeContext, Title, TransparentButton, TransparentCenterToolbar, VPage } from 'react-native-boxes';
import { useStyle } from '../components/style';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../components/AppContext';

export default function TabTwoScreen() {
  const theme = useContext(ThemeContext)
  const styles = useStyle(theme)
  const { context } = useContext(AppContext)

  useEffect(() => {

  }, [])
  return (
    <VPage style={styles.container}>
      <TransparentCenterToolbar title="Watchlist" />
    </VPage>
  );
}