import { useFonts } from 'expo-font';
import { router, Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '../hooks/useColorScheme';
import { Colors, DarkColors, Theme, ThemeContext } from 'react-native-boxes';
import AppBottomBar from '../components/tab';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppContext, Context } from '../components/AppContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [context, setContext] = useState<Context>(() => {
    const ctx = new Context()
    const theme = new Theme('appname', colorScheme === 'dark' ? DarkColors : Colors);
    ctx.theme = theme
    return ctx
  })

  const [loaded] = useFonts({
    Bold: require('../assets/fonts/Bold.ttf'),
    Regular: require('../assets/fonts/Regular.ttf'),
    Styled: require('../assets/fonts/Styled.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      router.replace('/watchlist')
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppContext.Provider value={{
      context,
      setContext
    }} >
      <ThemeContext.Provider value={context.theme} >
        <SafeAreaView style={{
          width: '100%',
          height: '100%',
          backgroundColor: context.theme.colors.background,
          paddingBottom: context.theme?.insets?.bottom! + 70
        }}>
          <Slot />
          <AppBottomBar />
        </SafeAreaView>
      </ThemeContext.Provider>
    </AppContext.Provider>
  );
}
