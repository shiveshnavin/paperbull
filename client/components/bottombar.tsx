import { useRootNavigationState, useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';

import { BottomNavBar, Icon, TextView, ThemeContext } from 'react-native-boxes';
import { Topic, useEventListener, useEventPublisher } from './store';
import { TickerApi } from '../services/TickerApi';

export default function AppBottomBar({ tickeApi }: { tickeApi: TickerApi }) {
  const theme = useContext(ThemeContext)
  const router = useRouter()
  const [selectedId, setSelectedId] = React.useState('watchlist')
  const { routes } = useRootNavigationState();
  const publishEvent = useEventPublisher()
  const [seeking, setSeeking] = useState(false)

  useEffect(() => {
    setSelectedId(routes[0].name?.split("/")[0])
  }, [routes[0].name])

  useEventListener(Topic.SNAPSHOT_UPDATE, () => {
    let isSeekChanged = tickeApi.isPlaying() != seeking
    if (isSeekChanged)
      setSeeking(tickeApi.isPlaying())
  })

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
          icon: <Icon name={seeking ? 'pause' : 'rocket'} color={seeking ? theme.colors.critical : undefined} />,
          title: (<TextView style={{
            fontSize: theme.dimens.font.sm,
            color: seeking ? theme.colors.critical : undefined
          }}>Time</TextView>) as any
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
          if (seeking) {
            tickeApi.stopSeek()
            setSeeking(false)
            return
          }
          publishEvent(Topic.TIME_TRAVEL, {})
          return
        }
        setSelectedId(selectedId)
        router.push(`/${selectedId}` as any)
      }} />
  )
}
