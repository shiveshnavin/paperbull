import { AlertMessage, Center, DarkColors, HBox, KeyboardAvoidingScrollView, TextView, Theme, ThemeContext, Title, TransparentButton, TransparentCenterToolbar, VPage } from 'react-native-boxes';
import { useStyle } from '../components/style';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../components/AppContext';
import { Snapshot } from '../services/TickerApi';
import { useEventListener } from '../components/store';
import { Topic } from '../components/EventListeners';

export default function Watchlist() {
  const theme = useContext(ThemeContext)
  const styles = useStyle(theme)
  const { context } = useContext(AppContext)
  const tickerApi = context.tickApi
  const [error, setError] = useState<string | undefined>(undefined)
  const [snapshot, setSnapshot] = useState<Snapshot | undefined>(undefined)

  function fetchSnapShot() {
    if (tickerApi.snapshot?.date == undefined) {
      setError('Please select a date from settings.')
      return
    } else {
      setError(undefined)
      tickerApi.getSnapShot(tickerApi.snapshot.date, tickerApi.snapshot.time).then(setSnapshot)
    }
  }

  useEffect(() => {
    fetchSnapShot()
  }, [tickerApi.snapshot.date, tickerApi.snapshot.time])

  useEventListener(Topic.SNAPSHOT_UPDATE, (snapshot) => {
    setSnapshot(snapshot)
  })
  return (
    <VPage style={styles.container}>
      <TransparentCenterToolbar title="Watchlist" options={[{
        id: 'refresh',
        icon: 'refresh',
        onClick: () => {
          fetchSnapShot()
        }
      }]} />
      <KeyboardAvoidingScrollView>
        {
          error && (
            //@ts-ignore
            <AlertMessage id="AlertMessage" type='critical' text={error} />
          )
        }
        {
          snapshot?.ticks?.map(t => {
            return (
              <TextView key={t.symbol}>
                {t.symbol} {t.last_price}
              </TextView>
            )
          })
        }
      </KeyboardAvoidingScrollView>
    </VPage>
  );
}