import { useState, useEffect, useCallback } from 'react';
import { useWebSocket, useWebSocketMessage } from '../contexts/WebSocketContext';
import { useAppSelector } from '../store/hooks';

export interface PlayerInfo {
  userId: string;
  displayName: string;
  role: 'SPY' | 'CIVILIAN' | null;
  alive: boolean;
  ready: boolean;
  speakingOrder?: number;
  hasSpoken?: boolean;
}

export interface SpeakingState {
  currentSpeaker: string | null;
  speakingQueue: string[];
  speakingTimeRemaining: number;
}

export interface SpyGameState {
  phase: 'LOBBY' | 'COUNTDOWN' | 'IN_GAME' | 'VOTING' | 'RESULTS' | 'ENDED';
  players: Record<string, PlayerInfo>;
  hostId: string;
  topic: string | null;
  secretWord: string | null;
  spyWord: string | null;
  roundEndsAt: number | null;
  discussionEndsAt: number | null;
  vote: {
    votes: Record<string, string | null>;
    tally: Record<string, number>;
  } | null;
  winner: 'SPY' | 'CIVILIANS' | null;
  settings: {
    maxPlayers: number;
    roundTimeSec: number;
    discussionTimeSec: number;
    spyCount: number;
  };
  speaking: SpeakingState;
  countdownTimer: number | null;
  votingTimer: number | null;
  eliminatedPlayers: string[];
  currentRound: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  type?: 'system' | 'player';
}

export const useSpyRoom = (roomId: string) => {
  const { sendMessage, isConnected } = useWebSocket();
  const userId = useAppSelector(state => state.app.userId);
  const roomToken = useAppSelector(state => state.app.roomToken);
  
  const [roomState, setRoomState] = useState<SpyGameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speakingState, setSpeakingState] = useState<SpeakingState | null>(null);
  const [playerWord, setPlayerWord] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'SPY' | 'CIVILIAN' | null>(null);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [hasRequestedState, setHasRequestedState] = useState(false);

  // Reset flags when roomId changes
  useEffect(() => {
    setHasJoinedRoom(false);
    setHasRequestedState(false);
    setRoomState(null);
    setSpeakingState(null);
    setPlayerWord(null);
    setPlayerRole(null);
    setChatMessages([]);
    setError(null);
    setIsLoading(true);
  }, [roomId]);

  // Stable sendMessage function
  const stableSendMessage = useCallback((message: any) => {
    sendMessage(message);
  }, [sendMessage]);

  // Join room when component mounts (only once)
  useEffect(() => {
    if (isConnected && roomId && userId && !hasJoinedRoom) {
      const displayName = `Player_${Math.floor(Math.random() * 10000)}`;
      console.log(`Sending JOIN_ROOM for user ${userId} (${displayName}) to room ${roomId}`);
      stableSendMessage({
        type: 'JOIN_ROOM',
        data: {
          roomId,
          userId,
          displayName
        }
      });
      setHasJoinedRoom(true);
    }
  }, [isConnected, roomId, userId, hasJoinedRoom, stableSendMessage]);

  // Get initial room state (only once after joining)
  useEffect(() => {
    if (isConnected && roomId && hasJoinedRoom && !hasRequestedState) {
      console.log('Requesting room state:', roomId);
      stableSendMessage({
        type: 'GET_ROOM_STATE',
        data: { roomId }
      });
      setHasRequestedState(true);
    }
  }, [isConnected, roomId, hasJoinedRoom, hasRequestedState, stableSendMessage]);

  // Handle room state updates
  useWebSocketMessage('ROOM_STATE', useCallback((message) => {
    console.log('ROOM_STATE received:', message);
    if (message.data?.roomId === roomId) {
      const players = message.data.state?.players ? Object.values(message.data.state.players) : [];
      console.log(`Updated player list for room ${roomId}:`, players.map((p: any) => ({ userId: p.userId, displayName: p.displayName, ready: p.ready })));
      setRoomState(message.data.state);
      setSpeakingState(message.data.state?.speaking || null);
      setIsLoading(false);
      setError(null);
    }
  }, [roomId]));

  // Handle speaking updates
  useWebSocketMessage('SPEAKING_UPDATE', useCallback((message) => {
    if (message.data?.roomId === roomId) {
      setSpeakingState(message.data.speaking);
    }
  }, [roomId]));

  // Handle player word assignment
  useWebSocketMessage('PLAYER_WORD', useCallback((message) => {
    setPlayerWord(message.data?.word || null);
    setPlayerRole(message.data?.role || null);
  }, []));

  // Handle player updates
  useWebSocketMessage('PLAYER_JOINED', useCallback((message) => {
    if (message.data?.roomId === roomId) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        message: `${message.data.displayName} joined the room`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'system'
      }]);
    }
  }, [roomId]));

  useWebSocketMessage('PLAYER_LEFT', useCallback((message) => {
    if (message.data?.roomId === roomId) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        message: `${message.data.displayName} left the room`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'system'
      }]);
    }
  }, [roomId]));

  // Handle ready state updates
  useWebSocketMessage('PLAYER_READY', useCallback((message) => {
    if (message.data?.roomId === roomId) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        message: `${message.data.displayName} is ready`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'system'
      }]);
    }
  }, [roomId]));

  // Handle game state changes
  useWebSocketMessage('GAME_STARTED', useCallback((message) => {
    if (message.data?.roomId === roomId) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        message: 'Game started! Good luck!',
        timestamp: new Date().toLocaleTimeString(),
        type: 'system'
      }]);
    }
  }, [roomId]));

  // Handle chat messages
  useWebSocketMessage('CHAT_MESSAGE', useCallback((message) => {
    if (message.data?.roomId === roomId) {
      setChatMessages(prev => [...prev, {
        id: message.data.id || Date.now().toString(),
        sender: message.data.sender,
        message: message.data.message,
        timestamp: message.data.timestamp || new Date().toLocaleTimeString(),
        type: 'player'
      }]);
    }
  }, [roomId]));

  // Handle errors
  useWebSocketMessage('ERROR', useCallback((message) => {
    setError(message.data?.message || 'An error occurred');
    setIsLoading(false);
  }, []));

  // Room actions
  const setReady = useCallback((ready: boolean) => {
    if (isConnected && roomId && userId) {
      stableSendMessage({
        type: 'SET_READY',
        data: {
          roomId,
          userId,
          payload: { ready }
        }
      });
    }
  }, [isConnected, roomId, userId, stableSendMessage]);

  const startGame = useCallback(() => {
    if (isConnected && roomId && userId) {
      stableSendMessage({
        type: 'START_GAME',
        data: {
          roomId,
          userId
        }
      });
    }
  }, [isConnected, roomId, userId, stableSendMessage]);

  const sendChatMessage = useCallback((message: string) => {
    if (isConnected && roomId && userId) {
      stableSendMessage({
        type: 'CHAT_MESSAGE',
        data: {
          roomId,
          userId,
          message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [isConnected, roomId, userId, stableSendMessage]);

  const vote = useCallback((targetId: string | null) => {
    if (isConnected && roomId && userId) {
      stableSendMessage({
        type: 'VOTE',
        data: {
          roomId,
          userId,
          payload: { targetId }
        }
      });
    }
  }, [isConnected, roomId, userId, stableSendMessage]);

  const leaveRoom = useCallback(() => {
    if (isConnected && roomId && userId) {
      stableSendMessage({
        type: 'PARTICIPANT_LEAVE_ROOM',
        data: {
          roomId,
          userId
        }
      });
    }
  }, [isConnected, roomId, userId, stableSendMessage]);

  // Speaking system actions
  const requestSpeak = useCallback(() => {
    if (isConnected && roomId && userId) {
      stableSendMessage({
        type: 'REQUEST_SPEAK',
        data: {
          roomId,
          userId
        }
      });
    }
  }, [isConnected, roomId, userId, stableSendMessage]);

  const endSpeaking = useCallback(() => {
    if (isConnected && roomId && userId) {
      stableSendMessage({
        type: 'END_SPEAKING',
        data: {
          roomId,
          userId
        }
      });
    }
  }, [isConnected, roomId, userId, stableSendMessage]);

  const skipSpeaker = useCallback(() => {
    if (isConnected && roomId && userId) {
      stableSendMessage({
        type: 'SKIP_SPEAKER',
        data: {
          roomId,
          userId
        }
      });
    }
  }, [isConnected, roomId, userId, stableSendMessage]);

  const resetSpeakingQueue = useCallback(() => {
    if (isConnected && roomId && userId) {
      stableSendMessage({
        type: 'RESET_SPEAKING_QUEUE',
        data: {
          roomId,
          userId
        }
      });
    }
  }, [isConnected, roomId, userId, stableSendMessage]);

  const getPlayerWord = useCallback(() => {
    if (isConnected && roomId && userId) {
      stableSendMessage({
        type: 'GET_PLAYER_WORD',
        data: {
          roomId,
          userId
        }
      });
    }
  }, [isConnected, roomId, userId, stableSendMessage]);

  // Get current player info
  const currentPlayer = roomState?.players[userId || ''] || null;
  const isHost = roomState?.hostId === userId;
  const players = roomState ? Object.values(roomState.players) : [];
  const readyPlayers = players.filter(p => p.ready);
  const canStartGame = isHost && readyPlayers.length >= 3 && roomState?.phase === 'LOBBY';

  // Speaking system info
  const isCurrentSpeaker = speakingState?.currentSpeaker === userId;
  const isInSpeakingQueue = speakingState?.speakingQueue.includes(userId || '');
  const canRequestSpeak = roomState?.phase === 'IN_GAME' && !isCurrentSpeaker && !isInSpeakingQueue;

  return {
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
    // Speaking system
    speakingState,
    isCurrentSpeaker,
    isInSpeakingQueue,
    canRequestSpeak,
    // Game system
    playerWord,
    playerRole,
    // Actions
    setReady,
    startGame,
    sendChatMessage,
    vote,
    leaveRoom,
    // Speaking actions
    requestSpeak,
    endSpeaking,
    skipSpeaker,
    resetSpeakingQueue,
    // Game actions
    getPlayerWord,
  };
};
