import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/MainNavigation';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSpyRoom, PlayerInfo, ChatMessage } from '../hooks/useSpyRoom';
import { useAppSelector } from '../store/hooks';
import {
  LiveKitRoom,
  useTracks,
  TrackReferenceOrPlaceholder,
  VideoTrack,
  isTrackReference,
  useConnectionState,
  useLocalParticipant,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

const { width, height } = Dimensions.get('window');

type Props = StackScreenProps<RootStackParamList, 'Room'>;

const SpyRoomScreen: React.FC<Props> = ({ navigation, route }) => {
  const { roomId, name } = route.params || { roomId: '', name: '' };
  const roomToken = useAppSelector(state => state.app.roomToken);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  
  // Add timeout for connection
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isConnecting) {
        console.log('Connection timeout - switching to fallback mode');
        setConnectionError('Connection timeout. Using fallback mode.');
        setIsConnecting(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [isConnecting]);

  // LiveKit configuration
  const wsURL = "wss://live-stream-j0ngkwts.livekit.cloud";
  
  console.log('SpyRoomScreen - roomId:', roomId);
  console.log('SpyRoomScreen - roomToken:', roomToken ? 'Present' : 'Missing');
  console.log('SpyRoomScreen - using defaultToken:', !roomToken);
  
  const handleError = (error: Error) => {
    console.error('LiveKit Room error:', error);
    setConnectionError(error.message);
    setIsConnecting(false);
    Alert.alert('Connection Error', `LiveKit connection failed: ${error.message}`);
  };

  const handleConnected = () => {
    console.log('LiveKit connected successfully');
    setIsConnecting(false);
    setConnectionError(null);
  };

  const handleDisconnected = () => {
    console.log('LiveKit disconnected');
    setIsConnecting(false);
  };

  if (!roomToken) {
    return (
      <LinearGradient
        colors={['#042A6B', '#0A58CA']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <StatusBar barStyle="light-content" backgroundColor="#042A6B" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Missing room token. Go back and create/join again.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={wsURL}
      token={roomToken}
      connect={true}
      options={{ 
        adaptiveStream: { pixelDensity: 'screen' },
        publishDefaults: {
          videoSimulcastLayers: [],
        }
      }}
      audio={true}
      video={false}
      onError={handleError}
      onConnected={handleConnected}
      onDisconnected={handleDisconnected}
    >
      <SpyRoomContent navigation={navigation} route={route} />
    </LiveKitRoom>
  );
};

// Main room content component
const SpyRoomContent: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { roomId, name } = route.params || { roomId: '', name: '' };
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  
  // LiveKit hooks (with fallback for when LiveKit is not available)
  let connectionState: any = 'disconnected';
  let tracks: any[] = [];
  let localParticipant: any = null;

  try {
    connectionState = useConnectionState();
    tracks = useTracks([Track.Source.Camera]);
    localParticipant = useLocalParticipant();
  } catch (error) {
    console.log('LiveKit hooks not available, using fallback values');
  }

  // Use WebSocket hook for room management
  const {
    roomState,
    chatMessages,
    isLoading,
    error,
    currentPlayer,
    isHost,
    players,
    readyPlayers,
    canStartGame,
    isConnected,
    setReady,
    startGame,
    sendChatMessage,
    vote,
    leaveRoom,
    // Speaking system
    speakingState,
    isCurrentSpeaker,
    isInSpeakingQueue,
    canRequestSpeak,
    requestSpeak,
    endSpeaking,
    skipSpeaker,
    resetSpeakingQueue,
    // Game system
    playerWord,
    playerRole,
    getPlayerWord,
  } = useSpyRoom(roomId);

  // Handle WebSocket connection status
  useEffect(() => {
    if (!isConnected) {
      Alert.alert('Connection Lost', 'Lost connection to server. Attempting to reconnect...');
    }
  }, [isConnected]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const handleGetReady = () => {
    if (currentPlayer) {
      setReady(!currentPlayer.ready);
    }
  };

  const handleInvite = () => {
    // Handle invite functionality
    console.log('Invite pressed');
    // You can implement share functionality here
  };

  const handleStartGame = () => {
    if (canStartGame) {
      startGame();
    }
  };

  const handleMicToggle = async () => {
    // Always toggle local state first for immediate UI feedback
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (localParticipant) {
      try {
        // Debug: Log available methods on localParticipant
        console.log('localParticipant methods:', Object.getOwnPropertyNames(localParticipant));
        console.log('localParticipant prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(localParticipant)));
        
        // Check if the method exists before calling it
        if (typeof localParticipant.setMicrophoneEnabled === 'function') {
          console.log('Using setMicrophoneEnabled method');
          await localParticipant.setMicrophoneEnabled(!newMutedState);
        } else {
          // Try alternative method names
          const enableMic = localParticipant.enableMicrophone || 
                           localParticipant.setMicrophoneEnabled ||
                           localParticipant.muteMicrophone;
          
          if (typeof enableMic === 'function') {
            console.log('Using alternative microphone method');
            await enableMic.call(localParticipant, !newMutedState);
          } else {
            // If no method found, just use local state
            console.log('No microphone method found, using local state only');
          }
        }
      } catch (error) {
        console.error('Error toggling microphone:', error);
        // Keep the local state change even if LiveKit fails
      }
    } else {
      // Fallback mode - just use local state
      console.log('LiveKit not available, using local mic state');
    }
  };

  const handleSpeakerToggle = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const renderPlayer = ({ item }: { item: PlayerInfo }) => (
    <View style={styles.playerItem}>
      <View style={styles.avatarContainer}>
        <Image 
          source={{ uri: `https://randomuser.me/api/portraits/${item.userId.length % 2 === 0 ? 'men' : 'women'}/${(item.userId.charCodeAt(0) % 10) + 1}.jpg` }} 
          style={styles.avatar} 
        />
        {item.ready && (
          <View style={styles.readyStatus}>
            <Icon name="checkmark" size={12} color="#fff" />
          </View>
        )}
        {!isMuted && (
          <View style={styles.micStatus}>
            <Icon name="mic" size={10} color="#fff" />
          </View>
        )}
      </View>
      <Text style={styles.playerName} numberOfLines={1}>
        {item.displayName}
      </Text>
    </View>
  );

  const renderChatMessage = ({ item }: { item: ChatMessage }) => (
    <View style={styles.chatMessage}>
      <Text style={styles.chatText}>{item.message}</Text>
    </View>
  );

  // Show error state
  if (error) {
    return (
      <LinearGradient
        colors={['#042A6B', '#0A58CA']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <StatusBar barStyle="light-content" backgroundColor="#042A6B" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#042A6B', '#0A58CA']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#042A6B" />
      
      <View style={styles.scrollView}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon}>
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.roomInfoCard}>
            <View style={styles.screwContainer}>
              <View style={styles.screw} />
              <View style={styles.screw} />
            </View>
            <Text style={styles.roomName}>{roomId || 'Room'} ☠️</Text>
            <Text style={styles.gameName}>Who's the Spy</Text>
          </View>
          
          <View style={styles.headerRightIcons}>
            <TouchableOpacity style={styles.headerIcon}>
              <Icon name="help-circle-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon}>
              <Icon name="people" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Player Grid */}
        <View style={styles.playerGrid}>
          <FlatList
            data={players}
            renderItem={renderPlayer}
            keyExtractor={(item) => item.userId}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.playerGridContent}
          />
        </View>

        {/* LiveKit Connection Status */}
        <View style={styles.connectionStatusContainer}>
          <Text style={styles.connectionStatusText}>
            Audio: {connectionState === 'connected' ? '🟢 Connected' : 
                   connectionState === 'connecting' ? '🟡 Connecting' : 
                   connectionState === 'disconnected' ? '🔴 Disconnected' : '⚪ Unknown'}
          </Text>
        </View>

        {/* LiveKit Video Section */}
        {tracks.length > 0 && (
          <View style={styles.videoContainer}>
            <Text style={styles.videoTitle}>Live Video</Text>
            <FlatList
              data={tracks}
              renderItem={({ item }) => {
                if (isTrackReference(item)) {
                  return (
                    <View style={styles.videoTrackContainer}>
                      <VideoTrack trackRef={item} style={styles.videoTrack} />
                      <Text style={styles.videoTrackName}>
                        {item.participant.identity}
                      </Text>
                    </View>
                  );
                }
                return <View style={styles.videoTrackPlaceholder} />;
              }}
              keyExtractor={(item, index) => 
                isTrackReference(item) ? item.participant.identity + index : `placeholder-${index}`
              }
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleInvite}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4A90E2', '#357ABD']}
              style={styles.inviteButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.actionButtonText}>Invite</Text>
            </LinearGradient>
          </TouchableOpacity>

          {roomState?.phase === 'LOBBY' ? (
            <>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleGetReady}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={currentPlayer?.ready ? ['#4CAF50', '#45A049'] : ['#FF6B35', '#E55A2B']}
                  style={styles.getReadyButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.actionButtonText}>
                    {currentPlayer?.ready ? 'Ready ✅' : 'Get Ready'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {isHost && canStartGame && (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleStartGame}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#9C27B0', '#7B1FA2']}
                    style={styles.startGameButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.actionButtonText}>Start Game</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.gameStatusContainer}>
              <Text style={styles.gameStatusText}>
                {roomState?.phase === 'IN_GAME' ? 'Game in Progress' : 
                 roomState?.phase === 'VOTING' ? 'Voting Phase' : 
                 roomState?.phase === 'RESULTS' ? 'Game Over' : 'Unknown'}
              </Text>
            </View>
          )}
        </View>

        {/* Game Countdown */}
        {roomState?.phase === 'COUNTDOWN' && (
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>
              {roomState.countdownTimer}
            </Text>
            <Text style={styles.countdownSubtext}>Game Starting...</Text>
          </View>
        )}

        {/* Word Display */}
        {roomState?.phase === 'IN_GAME' && playerWord && (
          <View style={styles.wordContainer}>
            <Text style={styles.wordTitle}>Your Word:</Text>
            <Text style={styles.wordText}>{playerWord}</Text>
            <Text style={styles.roleText}>
              Role: {playerRole === 'SPY' ? '🕵️ Spy' : '👤 Civilian'}
            </Text>
            <TouchableOpacity 
              style={styles.getWordButton}
              onPress={getPlayerWord}
            >
              <Text style={styles.getWordButtonText}>Show Word</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Voting Phase */}
        {roomState?.phase === 'VOTING' && (
          <View style={styles.votingContainer}>
            <View style={styles.votingHeader}>
              <Text style={styles.votingTitle}>Voting Phase</Text>
              <Text style={styles.votingTimer}>
                {roomState.votingTimer}s
              </Text>
            </View>
            <Text style={styles.votingSubtext}>
              Vote for who you think is the spy
            </Text>
            <View style={styles.votingGrid}>
              {players.filter(p => p.alive).map((player) => (
                <TouchableOpacity
                  key={player.userId}
                  style={[
                    styles.votingPlayer,
                    roomState.vote?.votes[currentPlayer?.userId || ''] === player.userId && styles.votingPlayerSelected
                  ]}
                  onPress={() => vote(player.userId)}
                >
                  <Text style={styles.votingPlayerName}>{player.displayName}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={styles.skipVoteButton}
              onPress={() => vote(null)}
            >
              <Text style={styles.skipVoteButtonText}>Skip Vote</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Game Results */}
        {roomState?.phase === 'RESULTS' && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>
              {roomState.winner === 'CIVILIANS' ? '🏆 Civilians Win!' : '🕵️ Spy Wins!'}
            </Text>
            <Text style={styles.resultsSubtext}>
              {roomState.winner === 'CIVILIANS' 
                ? 'The spy has been eliminated!' 
                : 'The spy has outsmarted everyone!'}
            </Text>
            <View style={styles.rolesContainer}>
              <Text style={styles.rolesTitle}>Player Roles:</Text>
              {players.map((player) => (
                <Text key={player.userId} style={styles.roleItem}>
                  {player.displayName}: {player.role === 'SPY' ? '🕵️ Spy' : '👤 Civilian'}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Speaking System */}
        {roomState?.phase === 'IN_GAME' && (
          <View style={styles.speakingContainer}>
            <View style={styles.speakingHeader}>
              <Text style={styles.speakingTitle}>Speaking Turn</Text>
              {speakingState?.currentSpeaker && (
                <Text style={styles.speakingTimer}>
                  {speakingState.speakingTimeRemaining}s
                </Text>
              )}
            </View>

            {speakingState?.currentSpeaker ? (
              <View style={styles.currentSpeakerContainer}>
                <Text style={styles.currentSpeakerText}>
                  {roomState.players[speakingState.currentSpeaker]?.displayName} is speaking
                </Text>
                {isCurrentSpeaker && (
                  <TouchableOpacity 
                    style={styles.endSpeakingButton}
                    onPress={endSpeaking}
                  >
                    <Text style={styles.endSpeakingButtonText}>End Speaking</Text>
                  </TouchableOpacity>
                )}
                {isHost && !isCurrentSpeaker && (
                  <TouchableOpacity 
                    style={styles.skipButton}
                    onPress={skipSpeaker}
                  >
                    <Text style={styles.skipButtonText}>Skip</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.noSpeakerContainer}>
                <Text style={styles.noSpeakerText}>No one is speaking</Text>
                {canRequestSpeak && (
                  <TouchableOpacity 
                    style={styles.requestSpeakButton}
                    onPress={requestSpeak}
                  >
                    <Text style={styles.requestSpeakButtonText}>Request to Speak</Text>
                  </TouchableOpacity>
                )}
                {isInSpeakingQueue && (
                  <Text style={styles.queueText}>You are in the speaking queue</Text>
                )}
              </View>
            )}

            {/* Speaking Queue */}
            {speakingState?.speakingQueue && speakingState.speakingQueue.length > 0 && (
              <View style={styles.queueContainer}>
                <Text style={styles.queueTitle}>Speaking Queue:</Text>
                {speakingState.speakingQueue.map((userId, index) => (
                  <Text key={userId} style={styles.queueItem}>
                    {index + 1}. {roomState?.players[userId]?.displayName}
                  </Text>
                ))}
              </View>
            )}

            {/* Host Controls */}
            {isHost && (
              <TouchableOpacity 
                style={styles.resetQueueButton}
                onPress={resetSpeakingQueue}
              >
                <Text style={styles.resetQueueButtonText}>Reset Speaking Queue</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Chat Area */}
        <View style={styles.chatContainer}>
          <FlatList
            data={chatMessages}
            renderItem={renderChatMessage}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>

      {/* Bottom Control Bar */}
      <View style={styles.bottomControlBar}>
        <TouchableOpacity 
          style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]} 
          onPress={handleSpeakerToggle}
        >
          <Icon 
            name={isSpeakerOn ? "volume-high" : "volume-mute"} 
            size={20} 
            color={isSpeakerOn ? "#fff" : "#999"} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.controlButton, 
            !isMuted && styles.controlButtonActive,
            isCurrentSpeaker && styles.speakingButton
          ]} 
          onPress={handleMicToggle}
        >
          <Icon 
            name={isMuted ? "mic-off" : "mic"} 
            size={20} 
            color={!isMuted ? "#fff" : "#999"} 
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Icon name="happy-outline" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Icon name="chatbubble-outline" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerIcon: {
    padding: 8,
  },
  roomInfoCard: {
    backgroundColor: '#4A90E2',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  screwContainer: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  screw: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#C0C0C0',
    borderWidth: 1,
    borderColor: '#A0A0A0',
  },
  roomName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  gameName: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  headerRightIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  playerGrid: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  playerGridContent: {
    justifyContent: 'space-between',
  },
  playerItem: {
    width: (width - 60) / 2,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fff',
  },
  readyStatus: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  micStatus: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  playerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 15,
  },
  actionButton: {
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  inviteButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 15,
  },
  getReadyButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 15,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  chatContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  chatMessage: {
    backgroundColor: '#1A365D',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  chatText: {
    fontSize: 14,
    color: '#FFD700',
    lineHeight: 20,
  },
  bottomControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1A365D',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#2D3748',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2D3748',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#4A90E2',
  },
  speakingButton: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  startGameButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 15,
  },
  gameStatusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  gameStatusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Speaking System Styles
  speakingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 15,
  },
  speakingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  speakingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  speakingTimer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  currentSpeakerContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  currentSpeakerText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 10,
  },
  endSpeakingButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  endSpeakingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noSpeakerContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  noSpeakerText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 10,
  },
  requestSpeakButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  requestSpeakButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  queueText: {
    fontSize: 14,
    color: '#FFD700',
    marginTop: 10,
    fontWeight: '600',
  },
  queueContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  queueTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  queueItem: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 4,
  },
  resetQueueButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'center',
    marginTop: 10,
  },
  resetQueueButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Game UI Styles
  countdownContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 15,
  },
  countdownText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
  },
  countdownSubtext: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  wordContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  wordTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
  },
  wordText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
    textAlign: 'center',
  },
  roleText: {
    fontSize: 16,
    color: '#FFD700',
    marginBottom: 15,
    fontWeight: '600',
  },
  getWordButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  getWordButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  votingContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 15,
    padding: 20,
  },
  votingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  votingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  votingTimer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f44336',
  },
  votingSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  votingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  votingPlayer: {
    backgroundColor: '#2D3748',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    minWidth: '45%',
    alignItems: 'center',
  },
  votingPlayerSelected: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  votingPlayerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  skipVoteButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  skipVoteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
    textAlign: 'center',
  },
  resultsSubtext: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  rolesContainer: {
    width: '100%',
  },
  rolesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  roleItem: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
  },
  // LiveKit Connection Status Styles
  connectionStatusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginVertical: 5,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  connectionStatusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  // LiveKit Video Styles
  videoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 15,
    padding: 15,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  videoTrackContainer: {
    alignItems: 'center',
    marginRight: 10,
  },
  videoTrack: {
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  videoTrackPlaceholder: {
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  videoTrackName: {
    fontSize: 12,
    color: '#fff',
    marginTop: 5,
    textAlign: 'center',
  },
  // Loading and Error Screen Styles
  connectionLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  connectionLoadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  connectionLoadingSubtext: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 30,
    textAlign: 'center',
  },
  connectionLoadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#666',
    marginTop: 10,
  },
});

export default SpyRoomScreen;