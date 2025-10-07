import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SpyHomeScreen from '../screens/SpyHomeScreen';
import SpyRoomScreen from '../screens/SpyRoomScreen';

export type RootStackParamList = {
  Home: undefined;
  Room: { roomId: string; name?: string } | undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const MainNavigation = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={SpyHomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Room" component={SpyRoomScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

export default MainNavigation;
