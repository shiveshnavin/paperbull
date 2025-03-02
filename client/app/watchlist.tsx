import { AlertMessage, Center, DarkColors, HBox, KeyboardAvoidingScrollView, TextView, Theme, ThemeContext, Title, TransparentButton, TransparentCenterToolbar, VPage } from 'react-native-boxes';
import { useStyle } from '../components/style';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../components/AppContext';
import { Snapshot } from '../services/TickerApi';

export default function TabTwoScreen() {
  const theme = useContext(ThemeContext)
  const styles = useStyle(theme)
  const { context } = useContext(AppContext)
  const tickerApi = context.tickApi
  const [snapshot, setSnapshot] = useState<Snapshot | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  function fetchSnapShot() {
    if (snapshot?.date == undefined) {
      setError('Please select a date from settings.')
      return
    }
  }

  useEffect(() => {
    fetchSnapShot()
  }, [])
  return (
    <VPage style={styles.container}>
      <TransparentCenterToolbar title="Watchlist" />
      <KeyboardAvoidingScrollView>
        {
          error && (
            <AlertMessage type='critical' text={error} />
          )
        }
      </KeyboardAvoidingScrollView>
    </VPage>
  );
}