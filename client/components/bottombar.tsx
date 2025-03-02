import { useRootNavigationState, useRouter } from 'expo-router';
import React, { useContext, useEffect } from 'react';

import { BottomNavBar, ThemeContext } from 'react-native-boxes';
import { useEventPublisher } from './store';
import { Topic } from './EventListeners';

export default function AppBottomBar() {
  const theme = useContext(ThemeContext)
  const router = useRouter()
  const [selectedId, setSelectedId] = React.useState('watchlist')
  const { routes } = useRootNavigationState();
  const publishEvent = useEventPublisher()

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
          id: 'seek',
          icon: 'rocket',
          title: 'Time'
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
        if (selectedId == 'seek') {
          publishEvent(Topic.TIME_TRAVEL, {})
          return
        }
        setSelectedId(selectedId)
        router.push(`/${selectedId}` as any)
      }} />
  )
}
