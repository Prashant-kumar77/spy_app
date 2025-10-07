import * as React from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ListRenderItem,
  Text,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useEffect, useState } from 'react';
import {
  AudioSession,
  LiveKitRoom,
  useTracks,
  TrackReferenceOrPlaceholder,
  VideoTrack,
  isTrackReference,
  registerGlobals,
  useRoomContext,
  useConnectionState,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { NavigationContainer } from '@react-navigation/native';
import MainNavigation from './navigation/MainNavigation';
import { Provider } from 'react-redux';
import { store } from './store/index';

// !! Note !!
// This sample hardcodes a token which expires in 2 hours.
const wsURL = "wss://live-stream-j0ngkwts.livekit.cloud"
const token = "eyJhbGciOiJIUzI1NiJ9.eyJ2aWRlbyI6eyJyb29tSm9pbiI6dHJ1ZSwicm9vbSI6InF1aWNrc3RhcnQtcm9vbSJ9LCJpc3MiOiJBUElrWGR6Nmk0UGhHb1UiLCJleHAiOjE3NTk0NzIyODksIm5iZiI6MCwic3ViIjoicXVpY2tzdGFydC11c2VybmFtZSJ9.6J47Bwep-ktIYd_gjSYgdwwuprMo8A8YzEybe1X6oUg"

export default function App() {
  return (
    <Provider store={store}>
      <WebSocketProvider 
        url="wss://spy-backend-mb3i.onrender.com"
        autoConnect={true}
        reconnectInterval={3000}
        maxReconnectAttempts={5}
      >
        <NavigationContainer>
          <MainNavigation />
        </NavigationContainer>
      </WebSocketProvider>
    </Provider>
  );
}

// Legacy RoomView and styles kept if needed elsewhere
const RoomView = () => {
  const connectionState = useConnectionState();
  const tracks = useTracks([Track.Source.Camera]);
  const renderTrack: ListRenderItem<TrackReferenceOrPlaceholder> = ({item}) => {
    if(isTrackReference(item)) {
      return (<VideoTrack trackRef={item} style={styles.participantView} />)
    } else {
      return (<View style={styles.participantView} />)
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>
        LiveKit Connection: {connectionState} | Tracks: {tracks.length}
      </Text>
      <View style={styles.videoSection}>
        <Text style={styles.sectionTitle}>Video Tracks</Text>
        <FlatList
          data={tracks}
          renderItem={renderTrack}
          keyExtractor={(item, index) => isTrackReference(item) ? item.participant.identity + index : `placeholder-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  participantView: {
    height: 200,
    width: 150,
    backgroundColor: '#000',
    margin: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#e3f2fd',
    margin: 5,
    borderRadius: 6,
    fontWeight: '600',
  },
  videoSection: {
    marginBottom: 20,
  },
  websocketSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 5,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
});