import * as React from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ListRenderItem,
  TouchableOpacity,
  Text,
  TextInput,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  AudioSession,
  LiveKitRoom,
  useTracks,
  useLocalParticipant,
  TrackReferenceOrPlaceholder,
  VideoTrack,
  isTrackReference,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../store/hooks';
import { useWebSocket } from '../contexts/WebSocketContext';
import { styles, Colors } from './styles';
import HeaderCard from '../components/HeaderCard';
import PlayersGrid from '../components/PlayersGrid';
import PrimaryActions from '../components/PrimaryActions';
import ChatPanel from '../components/ChatPanel';
import BottomToolbar from '../components/BottomToolbar';
import GameModal from '../components/GameModal';


const wsURL = "wss://live-stream-j0ngkwts.livekit.cloud";

interface ReadyStatus{
  [key : string] : boolean
}


interface Voting{
  [key : string] : string[]
}

interface RoomState{
  chats : string[],
  readyStatus : ReadyStatus,
  gameStarted : boolean,
  spy : {
      word : string,
      player : string
  }
  voting : Voting,
  civilianWord : string,
  alivePlayers : string[]
}

export default function App() {
  const { sendMessage } = useWebSocket();
  const roomId = useAppSelector(state => state.app.roomId);
  const userId = useAppSelector(state => state.app.userId);
  const token = useAppSelector(state => state.app.roomToken);
  useEffect(() => {

    sendMessage(JSON.stringify({
      type: 'join_room',
      roomId,
      userId,
    }));

    const start = async () => {
      await AudioSession.startAudioSession();
    };
    start();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  return (
    <LiveKitRoom
      serverUrl={wsURL}
      token={token!}
      connect={true}
      options={{
        adaptiveStream: { pixelDensity: 'screen' },
      }}
      audio={true}
      video={false}
    >
      <RoomView />
    </LiveKitRoom>
  );
}

const RoomView = () => {
  const tracks = useTracks([Track.Source.Camera]);
  const { localParticipant } = useLocalParticipant();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const roomId = useAppSelector(state => state.app.roomId);
  const userId = useAppSelector(state => state.app.userId);
  const { sendMessage, addMessageListener } = useWebSocket();
  const [playerList, setPlayerList] = useState<string[]>([]);
  const [spyword, setSpyword] = useState<string | null>(null);
  const [civilianWord, setCivilianWord] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [notReady, setNotReady] = useState<boolean>(false);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'countdown' | 'word' | 'voting' | 'game_result' | 'round_started'>('countdown');
  const [modalWord, setModalWord] = useState<string>('');
  const [modalWordType, setModalWordType] = useState<'spy' | 'civilian'>('civilian');
  const [gameResult, setGameResult] = useState<{winner: string, spy: string} | null>(null);
  const [roundNumber, setRoundNumber] = useState<number>(0);
  const [showChatInput, setShowChatInput] = useState<boolean>(false);
  const [speakStatement, setSpeakStatement] = useState<boolean>(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [startVoting, setStartVoting] = useState<boolean>(false);
  const [endVoting, setEndVoting] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [vote, setVote] = useState<string | null>(null);
  const [alivePlayers, setAlivePlayers] = useState<string[]>([]);
  const [chat, setChat] = useState<string | null>(null);
  const [voting, setVoting] = useState<boolean>(false);
  const [yourVote, setYourVote] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [votingTime, setVotingTime] = useState<number>(0);
  const [speakerTime, setSpeakerTime] = useState<number>(0);
  const votingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speakerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [playersReadyStatus, setPlayersReadyStatus] = useState<ReadyStatus | null>(null);
  const [votingResults, setVotingResults] = useState<{[playerId: string]: string[]} | null>(null);
  const [votingEnded, setVotingEnded] = useState<boolean>(false);
  const [currentUserVote, setCurrentUserVote] = useState<string | null>(null);
  const [userWord, setUserWord] = useState<string | null>(null);

  useEffect(() => {
    

    return ()=>{
      sendMessage(JSON.stringify({
        type: 'leave_room',
        roomId,
        userId,
      }));
    };
  }, []);

  
  useEffect(() => {
    const unsubscribeRoomState = addMessageListener('room_state', (message: any) => {
      console.log("ROOM_STATE", message);
      setRoomState(message.roomState);
      setPlayersReadyStatus(message.roomState.readyStatus);
    });

    const unsubscribePlayerList = addMessageListener('playerList', (message: any) => {
      console.log("PLAYER_LIST", message);
      setPlayerList(message.playerList);
    });

    const unsubscribeCountdown = addMessageListener('countdown', (message: any) => {
      console.log("COUNTDOWN", message);
      setCountdown(message.seconds);
      if (message.seconds > 0) {
        setModalType('countdown');
        setModalVisible(true);
      }
    });

    const unsubscribeRoundStarted = addMessageListener('round_started', (message: any) => {
      console.log("ROUND_STARTED", message);
      setCurrentRound(message.roundNo);
      setRoundNumber(message.roundNo);
      setModalType('round_started');
      setModalVisible(true);
    });

    const unsubscribePlayerAlreadyInRoom = addMessageListener('player_already_in_room', (message: any) => {
      console.log("PLAYER_ALREADY_IN_ROOM", message);
    });

    const unsubscribeGameStarted = addMessageListener('gameStarted', (message: any) => {
      console.log("GAME_STARTED", message);
      console.log("Current playerList:", playerList);
      
      // Use playerList from the message if available, otherwise use local playerList
      const initialAlivePlayers = message.playerList || playerList;
      console.log("Setting alivePlayers to:", initialAlivePlayers);
      setAlivePlayers(initialAlivePlayers);
      setGameStarted(true);
      
      // Reset ready status for all players when game starts
      setPlayersReadyStatus({});
      
      // Clear any previous voting results when new round starts
      setVotingResults(null);
    });

    const unsubscribeSpy = addMessageListener('spy', (message: any) => {
      console.log("SPY", message);
      setSpyword(message.word);
      setUserWord(message.word); // Set user's word for display
      setModalType('word');
      setModalWord(message.word);
      setModalWordType('spy');
      setModalVisible(true);
      
      // Auto-close spy word modal after 1.5 seconds
      setTimeout(() => {
        setModalVisible(false);
      }, 1500);
    });

    const unsubscribeCivilianWord = addMessageListener('civilianWord', (message: any) => {
      console.log("CIVILIAN_WORD", message);
      setCivilianWord(message.word);
      setUserWord(message.word); // Set user's word for display
      setModalType('word');
      setModalWord(message.word);
      setModalWordType('civilian');
      setModalVisible(true);
      
      // Auto-close civilian word modal after 1.5 seconds
      setTimeout(() => {
        setModalVisible(false);
      }, 1500);
    });

    const unsubscribeSpeakStatement = addMessageListener('speak_statement', async (message: any) => {
      console.log("SPEAK_STATEMENT", message);
      setCurrentSpeaker(message.currentSpeaker);
      setVotingEnded(false); // Show mic icon for the new speaker
      setModalVisible(false); // Close round started modal when speaker starts
      if(speakerTimerRef.current) {
        clearInterval(speakerTimerRef.current);
        speakerTimerRef.current = null;
      }
      setSpeakerTime(0);
      speakerTimerRef.current = setInterval(()=>{
        setSpeakerTime((prev)=>prev+1);
      }, 1000);
      if(message.currentSpeaker === userId) {
        setSpeakStatement(true);
        if (!localParticipant) return;
        await localParticipant.setMicrophoneEnabled(true);
        setIsMicOn(true);
      }
      else {
        setSpeakStatement(false);
        // Allow users to speak during voting and after voting ends
        if (!localParticipant) return;
        if (voting || votingEnded) {
          // Keep mic enabled during voting and after voting ends
          await localParticipant.setMicrophoneEnabled(true);
          setIsMicOn(true);
        } else {
          // Only mute during structured speaking phase
          await localParticipant.setMicrophoneEnabled(false);
          setIsMicOn(false);
        }
      }
      
    });

    const unsubscribeStartVoting = addMessageListener('start_voting', async (message: any) => {
      console.log("START_VOTING", message);
      setVoting(true);
      setModalType('voting');
      setModalVisible(true);
      setCurrentUserVote(null); // Clear previous vote when new voting starts
      
      // Enable mics for all users during voting
      if (localParticipant) {
        await localParticipant.setMicrophoneEnabled(true);
        setIsMicOn(true);
      }
      
      // Auto-close voting modal after 1.5 seconds
      setTimeout(() => {
        setModalVisible(false);
      }, 1500);
      
      // Clear any existing timer first
      if(votingTimerRef.current) {
        clearInterval(votingTimerRef.current);
        votingTimerRef.current = null;
      }
      
      // Reset voting time to 0
      setVotingTime(0);
      
      // Start new timer after a brief delay to ensure clean state
      setTimeout(() => {
        votingTimerRef.current = setInterval(()=>{
          setVotingTime((prev)=>prev+1);
        }, 1000);
      }, 100); // Small delay to ensure clean state
    });

    const unsubscribeEndVoting = addMessageListener('end_voting', async (message: any) => {
      console.log("END_VOTING", message);
      setVoting(false);
      setVotingEnded(true); // Hide mic icons after voting ends
      setCurrentUserVote(null); // Clear current user's vote when voting ends
      
      // Keep mics enabled after voting ends
      if (localParticipant) {
        await localParticipant.setMicrophoneEnabled(true);
        setIsMicOn(true);
      }
      
      if(votingTimerRef.current) {
        clearInterval(votingTimerRef.current);
        votingTimerRef.current = null;
      }
      setVotingTime(0);
      setSpeakerTime(0); // Reset speaker timer to 0 and keep it at 0
      
      // Store voting results to display for 4 seconds
      if (message.votingResults) {
        setVotingResults(message.votingResults);
        
        // Clear voting results after 4 seconds
        setTimeout(() => {
          setVotingResults(null);
        }, 4000);
      }
    });

    const unsubscribeAlivePlayers = addMessageListener('alivePlayers', (message: any) => {
      console.log("ALIVE_PLAYERS", message);
      setAlivePlayers(message.alivePlayers);
    });

    const unsubscribeGameEnded = addMessageListener('game_ended', (message: any) => {
      console.log("GAME_ENDED", message);
      
      // Show game result modal
      setGameResult({
        winner: message.winner,
        spy: message.spy
      });
      setModalType('game_result');
      setModalVisible(true);
      
      // Clear all timers
      if(speakerTimerRef.current) {
        clearInterval(speakerTimerRef.current);
        speakerTimerRef.current = null;
      }
      if(votingTimerRef.current) {
        clearInterval(votingTimerRef.current);
        votingTimerRef.current = null;
      }
      
      // Reset all game-related state to default values
      setGameEnded(true);
      setGameStarted(false);
      setSpyword(null);
      setCivilianWord(null);
      setUserWord(null); // Clear user's word when game ends
      setReady(false);
      setNotReady(false);
      setSpeakStatement(false);
      setCurrentSpeaker(null);
      setStartVoting(false);
      setEndVoting(false);
      setVote(null);
      setAlivePlayers(playerList);
      setVoting(false);
      setYourVote(null);
      setVotingTime(0);
      setSpeakerTime(0);
      
      // setChatMessages([]);
      // setChatInput('');
    });

    const unsubscribeChat = addMessageListener('chat', (message: any) => {
      console.log("CHAT", message);
      setChat(message.chat);
      setChatMessages(prev => [...prev, message.chat]);
    });

    const unsubscribePlayerLeft = addMessageListener('player_left', (message: any) => {
      console.log("PLAYER_LEFT", message);
      setPlayerList((prev)=>{
        return prev.filter((player)=>player !== message.playerLeft);
      });
      setAlivePlayers((prev)=>{
        return prev.filter((player)=>player !== message.playerLeft);
      });
    });

    const unsubscribePlayerReady = addMessageListener('player_ready', (message: any) => {
      console.log("PLAYER_READY", message);
      setPlayersReadyStatus((prev) => ({
        ...prev,
        [message.playerId]: true
      }));
    });

    const unsubscribePlayerNotReady = addMessageListener('player_not_ready', (message: any) => {
      console.log("PLAYER_NOT_READY", message);
      setPlayersReadyStatus((prev) => ({
        ...prev,
        [message.playerId]: false
      }));
    });

    return ()=>{
      // Clear all timers on cleanup
      if(speakerTimerRef.current) {
        clearInterval(speakerTimerRef.current);
        speakerTimerRef.current = null;
      }
      if(votingTimerRef.current) {
        clearInterval(votingTimerRef.current);
        votingTimerRef.current = null;
      }
      
      // Unsubscribe from all listeners
      unsubscribeRoomState()
      unsubscribePlayerList()
      unsubscribePlayerAlreadyInRoom()
      unsubscribeGameStarted()
      unsubscribeSpy()
      unsubscribeCivilianWord()
      unsubscribeSpeakStatement()
      unsubscribeStartVoting()
      unsubscribeEndVoting()
      unsubscribeAlivePlayers()
      unsubscribeGameEnded()
      unsubscribeChat()
      unsubscribePlayerLeft()
      unsubscribePlayerReady()
      unsubscribePlayerNotReady()
      unsubscribeCountdown()
      unsubscribeRoundStarted()
    };
  }, [addMessageListener]);

  const toggleMic = async () => {
    if (!localParticipant) return;
    await localParticipant.setMicrophoneEnabled(!isMicOn);
    setIsMicOn(!isMicOn);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const handleInvite = () => {
    // TODO: Implement invite functionality
    console.log('Invite pressed');
  };

  const handleReady = () => {
    setReady(!ready);
    if(ready) {
    sendMessage(JSON.stringify({
      type: 'ready',
        roomId,
        userId,
      }));
    } else {
      sendMessage(JSON.stringify({
        type: 'notready',
        roomId,
        userId,
      }));
    }
    
  };

  const handlePressMic = (playerId: string) => {
    // TODO: Implement mic press for specific player
    console.log('Mic pressed for player:', playerId);
  };

  const handleEmoji = () => {
    // TODO: Implement emoji picker
    console.log('Emoji pressed');
  };

  const handleOpenChat = () => {
    setShowChatInput(!showChatInput);
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  const handleVote = (playerId: string) => {
    // Only allow alive players to vote
    // Fix: userId can be string or null, ensure it's a string before calling includes
    const currentUserIsAlive = gameStarted
      ? (alivePlayers.length === 0
          ? true
          : (typeof userId === 'string' ? alivePlayers.includes(userId) : false))
      : true;

    if (!currentUserIsAlive) {
      console.log('Dead players cannot vote');
      return;
    }

    // Prevent users from voting for themselves
    if (playerId === userId) {
      console.log('Cannot vote for yourself');
      return;
    }

    // Only allow voting during voting phase
    if (!voting) {
      console.log('Voting is not active');
      return;
    }
    
    // Update current user's vote
    setCurrentUserVote(playerId);
    
    sendMessage(JSON.stringify({
      type: 'vote',
      roomId,
      userId,
      votedPlayer: playerId,
    }));
  };

  // Transform playerList into the format expected by PlayersGrid
  const players = useMemo(() => {
    return playerList.map((player, index) => {
      const playerReadyStatus = roomState?.readyStatus?.[player] || playersReadyStatus?.[player] || false;
      // Only show cross icons when game is running and player is not alive
      // If game is not running, all players should appear alive
      // If game just started and alivePlayers is empty, consider all players alive
      const isAlive = gameStarted ? (alivePlayers.length === 0 ? true : alivePlayers.includes(player)) : true;
      
      // Debug logging
      if (gameStarted && !isAlive) {
        console.log(`Player ${player} is marked as dead. alivePlayers:`, alivePlayers);
      }
      
      return {
        id: player,
        name: player,
        isReady: playerReadyStatus,
        isMicOn: player === userId ? isMicOn : false,
        isRecording: index === 4, // Seat #5 (index 4) shows recording
        unreadCount: index === 4 ? 5 : undefined, // Seat #5 shows unread count
        isAlive: isAlive,
      };
    });
  }, [playerList, roomState?.readyStatus, playersReadyStatus, userId, isMicOn, alivePlayers, gameStarted]);

  // Transform chatMessages into the format expected by ChatPanel
  const formattedChatMessages = useMemo(() => {
    return chatMessages.map((message, index) => {
      const parts = message.split(': ');
      const sender = parts[0] || 'System';
      const messageText = parts.slice(1).join(': ') || message;
      
      return {
        id: `chat-${index}-${message.slice(0, 10)}`, // More stable ID using message content
        sender,
        message: messageText,
        isSystem: sender === 'System' || !message.includes(': '),
      };
    });
  }, [chatMessages]);


  const sendChatMessage = () => {
    sendMessage(JSON.stringify({
      type: 'send_chat',
      roomId,
      userId,
      chat: `${userId}: ${chatInput}`,
    }));
    setChatInput('');
  };

  useEffect(() => {
    if(ready) {
      sendMessage(JSON.stringify({
        type: 'ready',
        roomId,
        userId,
      }));
    }else {
      sendMessage(JSON.stringify({
        type: 'notready',
        roomId,
        userId,
      }));
    }
  }, [ready]);

  // Listen for keyboard events to close chat input when keyboard is dismissed
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setShowChatInput(false);
    });

    return () => {
      keyboardDidHideListener?.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient 
        colors={[Colors.bgTop, Colors.bgMid, Colors.bgBottom]} 
        style={styles.fill}
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.content}>
          {/* <HeaderCard title="MR GT650 🏴‍☠️" subtitle="Who's the Spy" /> */}
          <View style={styles.scrollView}>
            {/* Header Section */}
            <View style={styles.header}>
              {/* Connection Status */}
              {/* <View style={[styles.connectionStatus, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]}>
                <Icon name={isConnected ? "wifi" : "wifi-off"} size={16} color="#fff" />
                <Text style={styles.connectionText}>{isConnected ? "Connected" : "Reconnecting..."}</Text>
              </View> */}
              
              {/* Timer with time icon on the left */}
              <View style={styles.timerContainer}>
                <Icon name="clock-outline" size={20} color="#fff" />
                <Text style={styles.timerText}>{voting ? `${votingTime}s` : `${speakerTime}s`}</Text>
              </View>
              
              <View style={styles.roomInfoCard}>
                <View style={styles.screwContainer}>
                  <View style={styles.screw} />
                  <View style={styles.screw} />
                </View>
                <Text style={styles.roomName}>{roomId || 'Room'}</Text>
                <Text style={styles.gameName}>Who's the Spy</Text>
              </View>
              
              {/* Round number with icon on the right */}
              <View style={styles.roundContainer}>
                <Icon name="counter" size={20} color="#fff" />
                <Text style={styles.roundText}>{gameStarted ? currentRound : "--"}</Text>
              </View>
            </View>
            
            {/* User's Word Display */}
            {userWord && gameStarted && (
              <View style={styles.wordDisplayContainer}>
                <Text style={styles.wordDisplayLabel}>Word</Text>
                <Text style={styles.wordDisplayText}>{userWord}</Text>
              </View>
            )}
            
            <View style={styles.playersGridContainer}>
              <PlayersGrid 
                players={players} 
                onPressMic={handlePressMic} 
                currentSpeaker={currentSpeaker || undefined}
                isVoting={voting}
                onVote={handleVote}
                votingResults={votingResults}
                votingEnded={votingEnded}
                currentUserVote={currentUserVote}
                currentUserId={userId}
              />
              
              {/* Current Speaker Display */}
              {currentSpeaker && gameStarted && !voting && !votingEnded && (
                <View style={styles.speakerDisplayContainer}>
                  <Text style={styles.speakerDisplayText}>
                    {currentSpeaker} is speaking
                  </Text>
                </View>
              )}
            </View>
            <PrimaryActions 
              onInvite={handleInvite} 
              onReady={handleReady}
              isReady={ready}
              isInviteDisabled={true}
              isReadyDisabled={gameStarted}
              showReadyButton={!gameStarted}
            />
            <ChatPanel messages={formattedChatMessages} />
          </View>
        </View>
        <BottomToolbar 
          onToggleSpeaker={toggleSpeaker}
          onToggleMic={toggleMic}
          onEmoji={handleEmoji}
          onOpenChat={handleOpenChat}
          isSpeakerOn={isSpeakerOn}
          isMicOn={isMicOn}
        />
        
        {/* Chat Input Area */}
        {showChatInput && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.chatInputArea}
          >
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInputField}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                multiline
                autoFocus={true}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={styles.sendChatButton}
                onPress={sendChatMessage}
              >
                <Icon name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
        
        {/* Game Modal */}
        <GameModal
          visible={modalVisible}
          type={modalType}
          countdown={countdown}
          word={modalWord}
          wordType={modalWordType}
          gameResult={gameResult}
          roundNumber={roundNumber}
          onClose={handleModalClose}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

