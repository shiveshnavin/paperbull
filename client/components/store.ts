// store.ts
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

const logging = false
interface EventPayload {
    topic: string;
    data: any;
}

const eventsSlice = createSlice({
    name: 'events',
    initialState: {} as Record<string, any>,
    reducers: {
        publishEvent: (state, action: PayloadAction<EventPayload>) => {
            const { topic, data } = action.payload;
            state[topic] = data;
        },
        clearEvent: (state, action: PayloadAction<{ topic: string }>) => {
            const { topic } = action.payload;
            delete state[topic];
        },
    },
});

const { publishEvent: _publishEvent, clearEvent } = eventsSlice.actions;

export const store = configureStore({
    reducer: {
        events: eventsSlice.reducer,
    },
    middleware: (getDefaultMiddleware: any) => getDefaultMiddleware({
        serializableCheck: false
    }),
});

export type RootState = ReturnType<typeof store.getState>;

export const useEventListener = (topic: string, callback: (data?: any) => void) => {
    const event = useSelector((state: RootState) => state.events[topic]);
    const dispatch = useDispatch();

    useEffect(() => {
        if (!topic) {
            return
        }
        if (event) {
            logging && console.log('Event recieved', topic, event)
            callback(event);
            dispatch(clearEvent({ topic }));
        } else {
            logging && console.log('Event listener attach', topic)
        }
    }, [event, callback, dispatch, topic]);
};

export const useEventPublisher = () => {
    const dispatch = useDispatch();

    const publish = (topic: string, data: any) => {
        logging && console.log('Event Publisher', topic, data)

        dispatch(_publishEvent({ topic, data }));
    };

    return publish;
};


export const Topic = {
    SUBSCRIBE: 'SUBSCRIBE',

    TIME_TRAVEL: 'TIME_TRAVEL',
    SNAPSHOT_UPDATE: 'SNAPSHOT_UPDATE',
    STOP_SEEK: 'STOP_SEEK',

    INGEST_SQLITE: 'INGEST_SQLITE',
    INGEST_SQLITE_ERROR: 'INGEST_SQLITE_ERROR',
    INGEST_SQLITE_PROGRESS: 'INGEST_SQLITE_PROGRESS',

    INGEST_CSV: 'INGEST_CSV',
    INGEST_CSV_PROGRESS: 'INGEST_CSV_PROGRESS',
    INGEST_CSV_ERROR: 'INGEST_CSV_ERROR',
    INGEST_CSV_CANCEL: 'INGEST_CSV_CANCEL',
}