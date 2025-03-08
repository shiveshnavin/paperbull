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
import { Resolution } from '../services/TickerApi';

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
        tickerApi.setSnapshot(JSON.parse(snapshot))
      }
    })
    Storage.getKeyAsync('symbols').then(symbols => {
      if (symbols) {
        tickerApi.setSymbols(JSON.parse(symbols))
      }
    })
    Storage.getKeyAsync('preferred_resolution').then(r => {
      tickerApi.setResolution(r as Resolution || 'realtime')
    })
    tickerApi.init().finally(() => {
      setApiInit(true)
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
            <AppBottomBar />
          </ThemeContext.Provider>
        </AppContext.Provider>
      </Provider>
    </GestureHandlerRootView>
  );
}
