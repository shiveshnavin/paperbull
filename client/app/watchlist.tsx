import { AlertMessage, BottomSheet, Center, CompositeTextInputView, DarkColors, HBox, KeyboardAvoidingScrollView, PressableView, Storage, TextView, Theme, ThemeContext, Title, TransparentButton, TransparentCenterToolbar, VPage } from 'react-native-boxes';
import { useStyle } from '../components/style';
import { useCallback, useContext, useEffect, useState } from 'react';
import { AppContext } from '../components/AppContext';
import { Snapshot } from '../services/TickerApi';
import { Topic, useEventListener, useEventPublisher } from '../components/store';
import { ScipDisplay } from '../components/Instrument';
import { Tick } from '../services/models/Tick';
import { PaperbullTimeBar } from '../components/Slider';
import { PaperbullToolbar } from '../components/PaperbullToolbar';
import { parseTime } from '../components/TimeTravel';
import { SqliteTickerApi } from '../services/SqliteTickerApi';
import { SearchBox } from './settings';

export default function Watchlist() {
  const theme = useContext(ThemeContext)
  const styles = useStyle(theme)
  const { context } = useContext(AppContext)
  const tickerApi = context.tickApi
  const [error, setError] = useState<string | undefined>(undefined)
  const [snapshot, setSnapshot] = useState<Snapshot | undefined>(undefined)
  const publishEvent = useEventPublisher()
  const [showSelectSymbols, setShowSelectSymbols] = useState(false)
  const [availableSymbols, setAvailableSymbols] = useState<Tick[]>([])

  const onSubscribe = useCallback(
    (symbols: string[]) => {
      publishEvent(Topic.SUBSCRIBE, { symbols: symbols })
      setShowSelectSymbols(false);
      tickerApi.setSymbols(symbols)
      Storage.setKeyAsync('symbols', JSON.stringify(symbols));
      tickerApi.getSnapShot(
        tickerApi.getCurrentSnapshot().date,
        '0915',
        true
      ).then((s) => {
        setSnapshot(s)
        publishEvent(Topic.SNAPSHOT_UPDATE, s)
      }).catch(e => {
        setError(e.message);
      })
    }, [tickerApi])
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
    tickerApi.
      getAvailableSymbols()
      .then((symbols) => {
        setAvailableSymbols(symbols)
        let dates = new Set<string>()
        let times = new Set<string>()
        symbols.forEach(s => {
          dates.add(s.getDate())
          times.add(s.getTime())
        })
      })
  }, [])

  useEventListener(Topic.SNAPSHOT_UPDATE, (snapshot) => {
    setSnapshot(snapshot)
  })
  let time = parseTime(tickerApi.getCurrentSnapshot().time)
  if (tickerApi.getCurrentSnapshot()?.ticks?.length > 0) {
    let tick = tickerApi.getCurrentSnapshot()?.ticks
      ?.reduce((max, tick) => (tick.datetime > max.datetime ? tick : max));
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
        <PressableView
          style={{
            padding: theme.dimens.space.lg,
            borderRadius: theme.dimens.space.md,
            backgroundColor: theme.colors.forground,
            margin: theme.dimens.space.sm,
          }}
          onPress={() => {
            tickerApi.stopSeek()
            setShowSelectSymbols(true)
          }}>
          <TextView>Search for symbols...</TextView>
        </PressableView>
        {
          //@ts-ignore
          [...(snapshot?.ticks || [])]
            .sort((a, b) => a.symbol.localeCompare(b.symbol))?.map(t => {
              return (
                <ScipDisplay key={t.symbol + '' + t.datetime} tick={t} prevTick={new Tick({
                  ...t,
                  last_price: t.last_price - 10
                })} />
              )
            })
        }

        <BottomSheet
          onDismiss={() => {
            setShowSelectSymbols(false)
          }}
          title="Select instruments" visible={showSelectSymbols}>
          <SearchBox
            selectedSymbols={tickerApi.getSymbols() || []}
            symbols={availableSymbols.map(m => m.symbol)}
            onSubscribe={onSubscribe}
            onDone={onSubscribe}
            tickerApi={tickerApi} />
        </BottomSheet>
      </KeyboardAvoidingScrollView>
    </VPage>
  );
}