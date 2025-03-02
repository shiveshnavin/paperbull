import { useRootNavigationState, useRouter } from 'expo-router';
import React, { useContext, useEffect } from 'react';

import { BottomNavBar, ThemeContext } from 'react-native-boxes';

export default function AppBottomBar() {
  const theme = useContext(ThemeContext)
  const router = useRouter()
  const [selectedId, setSelectedId] = React.useState('watchlist')
  const { routes } = useRootNavigationState();

  useEffect(() => {
    setSelectedId(routes[0].name?.split("/")[0])
  }, [routes[0].name])

  return (
    <BottomNavBar
      selectedId={selectedId}
      options={[
        {
          id: 'watchlist',
          icon: 'bookmark',
          title: 'Watchlist'
        },
        {
          id: 'orders',
          icon: 'file-text',
          title: 'Orders'
        },
        {
          id: 'positions',
          icon: 'briefcase',
          title: 'Positions'
        },
        {
          id: 'settings',
          icon: 'gears',
          title: 'Settings'
        }
      ]}
      onSelect={(selectedId) => {
        console.log('selected', selectedId)
        setSelectedId(selectedId)
        router.push(`/${selectedId}` as any)
      }} />
  )
}
