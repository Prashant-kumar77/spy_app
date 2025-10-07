import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AppState = {
  name: string;
  roomId: string | null;
  roomToken: string | null;
  userId: string | null;
};

const initialState: AppState = {
  name: '',
  roomId: null,
  roomToken: null,
  userId: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setName(state, action: PayloadAction<string>) {
      state.name = action.payload;
    },
    setRoomId(state, action: PayloadAction<string | null>) {
      state.roomId = action.payload;
    },
    setRoomToken(state, action: PayloadAction<string | null>) {
      state.roomToken = action.payload;
    },
    setUserId(state, action: PayloadAction<string | null>) {
      state.userId = action.payload;
    },
    reset(state) {
      state.name = '';
      state.roomId = null;
      state.roomToken = null;
      state.userId = null;
    },
  },
});

export const { setName, setRoomId, setRoomToken, setUserId, reset } = appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
