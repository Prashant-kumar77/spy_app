import * as React from 'react';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { NavigationContainer } from '@react-navigation/native';
import MainNavigation from './navigation/MainNavigation';
import { Provider } from 'react-redux';
import { store } from './store/index';

export default function App() {
  return (
    <Provider store={store}>
      <WebSocketProvider>
        <NavigationContainer>
          <MainNavigation />
        </NavigationContainer>
      </WebSocketProvider>
    </Provider>
  );
}