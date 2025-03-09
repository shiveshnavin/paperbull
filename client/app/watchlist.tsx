import { AlertMessage, Center, DarkColors, HBox, KeyboardAvoidingScrollView, TextView, Theme, ThemeContext, Title, TransparentButton, TransparentCenterToolbar, VPage } from 'react-native-boxes';
import { useStyle } from '../components/style';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../components/AppContext';
import { Snapshot } from '../services/TickerApi';
import { Topic, useEventListener } from '../components/store';
import { ScipDisplay } from '../components/Instrument';
import { Tick } from '../services/models/Tick';
import { PaperbullTimeBar } from '../components/Slider';
import { PaperbullToolbar } from '../components/PaperbullToolbar';
import { parseTime } from '../components/TimeTravel';
import { SqliteTickerApi } from '../services/SqliteTickerApi';

export default function Watchlist() {
  const theme = useContext(ThemeContext)
  const styles = useStyle(theme)
  const { context } = useContext(AppContext)
  const tickerApi = context.tickApi
  const [error, setError] = useState<string | undefined>(undefined)
  const [snapshot, setSnapshot] = useState<Snapshot | undefined>(undefined)

  function fetchSnapShot() {
    if (tickerApi.getCurrentSnapshot()?.date == undefined) {
      setError('Please select a date from settings.')
      return
    } else {
      setError(undefined)
      tickerApi.getSnapShot(tickerApi.getCurrentSnapshot().date, tickerApi.getCurrentSnapshot().time).then(setSnapshot)
    }
  }

  useEffect(() => {
    fetchSnapShot()
  }, [])

  useEventListener(Topic.SNAPSHOT_UPDATE, (snapshot) => {
    setSnapshot(snapshot)
  })
  let time = parseTime(tickerApi.getCurrentSnapshot().time)
  if (tickerApi.getCurrentSnapshot()?.ticks?.length > 0) {
    let tick = tickerApi.getCurrentSnapshot()?.ticks.sort((b, a) => (a.datetime - b.datetime))[0]
    time = tick.getTimeFormatted()
  }
  return (
    <VPage style={styles.container}>
      <PaperbullToolbar
        time={time}
        title="Watchlist"
        options={[{
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
              <ScipDisplay key={t.symbol + '' + t.datetime} tick={t} prevTick={new Tick({
                ...t,
                last_price: t.last_price - 10
              })} />
            )
          })
        }
      </KeyboardAvoidingScrollView>
    </VPage>
  );
}