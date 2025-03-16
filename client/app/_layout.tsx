import { useFonts } from 'expo-font';
import { router, Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '../hooks/useColorScheme';
import { Colors, DarkColors, Storage, Theme, ThemeContext } from 'react-native-boxes';
import AppBottomBar from '../components/bottombar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppContext, Context } from '../components/AppContext';
import { EventListeners } from '../hooks/EventListeners';
import { Provider } from 'react-redux';
import { store } from '../components/store';
import { SqliteTickerApi } from '../services/SqliteTickerApi';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { Resolution, Snapshot, UIResolution } from '../services/TickerApi';
import { Tick } from '../services/models/Tick';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [apiInit, setApiInit] = useState(false)
  const [context, setContext] = useState<Context>(() => {
    const ctx = new Context()
    const theme = new Theme('appname', colorScheme === 'dark' ? DarkColors : Colors);
    ctx.theme = theme
    let tickerApi = new SqliteTickerApi()
    Storage.getKeyAsync('snapshot').then(snapshot => {
      if (snapshot) {
        let snap = JSON.parse(snapshot) as Snapshot
        snap.ticks = snap.ticks.map((t: any) => new Tick(t))
        tickerApi.setSnapshot(snap)
      }
    })
    Storage.getKeyAsync('symbols').then(symbols => {
      if (symbols) {
        tickerApi.setSymbols(JSON.parse(symbols))
      }
    })
    Storage.getKeyAsync('preferred_ui_timeframe').then((t) => {
      tickerApi.uiTimeframe = (t as UIResolution || "realtime")
    })
    Storage.getKeyAsync('preferred_resolution').then(r => {
      tickerApi.setResolution(r as Resolution || 'realtime')
    })

    Storage.getKeyAsync('sqlite_datasets')
      .then((listStr) => {
        let list = []
        if (listStr) {
          list = JSON.parse(listStr)
        }
        tickerApi.init(list)
          .then(healthyDatasets => {
            // Storage.setKeyAsync('sqlite_datasets', JSON.stringify(healthyDatasets))
          })
          .finally(() => {
            setApiInit(true);
            // (tickerApi as SqliteTickerApi).test()
          })
      })

    ctx.tickApi = tickerApi
    return ctx
  })

  const [loaded] = useFonts({
    Bold: require('../assets/fonts/Bold.ttf'),
    Regular: require('../assets/fonts/Regular.ttf'),
    Styled: require('../assets/fonts/Styled.ttf'),
  });

  useEffect(() => {
    if (loaded && apiInit) {
      SplashScreen.hideAsync();
      router.replace('/watchlist')
    }
  }, [loaded, apiInit]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView>
      <Provider store={store}>
        <AppContext.Provider value={{
          context,
          setContext
        }} >
          <ThemeContext.Provider value={context.theme} >
            <SafeAreaView style={{
              width: '100%',
              height: '100%',
              backgroundColor: context.theme.colors.background,
              marginBottom: context.theme?.insets?.bottom!
            }}>
              <View style={{
                width: '100%',
                height: '100%',
                paddingBottom: 100
              }}>
                <Slot />
              </View>
              <EventListeners />
            </SafeAreaView>
            <AppBottomBar tickeApi={context.tickApi} />
          </ThemeContext.Provider>
        </AppContext.Provider>
      </Provider>
    </GestureHandlerRootView>
  );
}
