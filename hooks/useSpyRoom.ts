import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
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
  // New backend specific fields
  chats: string[];
  readyStatus: Record<string, boolean>;
  gameStarted: boolean;
  spy: {
    word: string;
    player: string;
  };
  voting: Record<string, string[]>;
  civilianWord: string;
  alivePlayers: string[];
  playerList: string[];
}

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  type?: 'system' | 'player';
}

export const useSpyRoom = (roomId: string) => {
  const { sendMessage, addMessageListener } = useWebSocket();
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
    sendMessage(JSON.stringify(message));
  }, [sendMessage]);

  // Join room when component mounts (only once)
  useEffect(() => {
    if (roomId && userId && !hasJoinedRoom) {
      console.log(`Sending join_room for user ${userId} to room ${roomId}`);
      stableSendMessage({
        type: 'join_room',
        roomId,
        userId
      });
      setHasJoinedRoom(true);
    }
  }, [roomId, userId, hasJoinedRoom, stableSendMessage]);

  // Get initial room state (only once after joining)
  useEffect(() => {
    if (roomId && userId && hasJoinedRoom && !hasRequestedState) {
      console.log('Room state will be received automatically after joining');
      setHasRequestedState(true);
    }
  }, [roomId, userId, hasJoinedRoom, hasRequestedState, stableSendMessage]);

  // Handle room state updates
  useEffect(() => {
    const unsubscribe = addMessageListener('room_state', (message) => {
      console.log('=== ROOM_STATE MESSAGE RECEIVED ===');
      console.log('Message:', message);
      
      // Handle both old format (with data) and new format (direct properties)
      const messageRoomId = message.data?.roomId || message.roomId;
      const messageRoomState = message.data?.roomState || message.roomState;
      
      console.log('Message roomId:', messageRoomId);
      console.log('Current roomId:', roomId);
      console.log('Message state:', messageRoomState);
      
      if (messageRoomId === roomId) {
        const roomState = messageRoomState;
        const players = roomState?.playerList || [];
        console.log(`Updated player list for room ${roomId}:`, players);
        console.log(`Total players in room: ${players.length}`);
        
        // Convert new backend format to expected format
        const convertedRoomState = {
          ...roomState,
          phase: roomState.gameStarted ? 'IN_GAME' : 'LOBBY',
          players: {}, // Will be populated by playerList
          hostId: players[0] || '', // First player is host
          playerList: players,
        };
        
        // Update room state immediately
        setRoomState(convertedRoomState);
        setSpeakingState(null); // Not implemented in new backend
        setIsLoading(false);
        setError(null);
        
        // Force a re-render by updating a timestamp
        console.log(`Room state updated at ${new Date().toISOString()}`);
      } else {
        console.log('ROOM_STATE message ignored - roomId mismatch');
      }
      console.log('=== ROOM_STATE MESSAGE PROCESSED ===');
    });

    return unsubscribe;
  }, [roomId, addMessageListener]);

  // Handle player list updates
  useEffect(() => {
    const unsubscribe = addMessageListener('playerList', (message) => {
      console.log('=== PLAYER_LIST MESSAGE RECEIVED ===');
      console.log('Message:', message);
      console.log('Current roomId:', roomId);
      
      const messageRoomId = message.data?.roomId || message.roomId;
      const messagePlayerList = message.data?.playerList || message.playerList;
      
      if (messageRoomId === roomId) {
        console.log(`Updated player list for room ${roomId}:`, messagePlayerList);
        
        // Update room state with new player list
        setRoomState(prev => prev ? {
          ...prev,
          playerList: messagePlayerList,
          hostId: messagePlayerList[0] || prev.hostId,
        } : null);
        
        // Add system message for new players
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'System',
          message: `Player list updated: ${messagePlayerList.length} players`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'system'
        }]);
      }
      console.log('=== PLAYER_LIST MESSAGE PROCESSED ===');
    });

    return unsubscribe;
  }, [roomId, addMessageListener]);

  // Handle player word assignment (spy/civilian word)
  useEffect(() => {
    const unsubscribe = addMessageListener('spy', (message) => {
      const word = message.data?.word || message.word;
      setPlayerWord(word || null);
      setPlayerRole('SPY');
    });
    return unsubscribe;
  }, [addMessageListener]);

  useEffect(() => {
    const unsubscribe = addMessageListener('civilianWord', (message) => {
      const word = message.data?.word || message.word;
      setPlayerWord(word || null);
      setPlayerRole('CIVILIAN');
    });
    return unsubscribe;
  }, [addMessageListener]);

  // Handle game state changes
  useEffect(() => {
    const unsubscribe = addMessageListener('gameStarted', (message) => {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        message: 'Game started! Good luck!',
        timestamp: new Date().toLocaleTimeString(),
        type: 'system'
      }]);
    });
    return unsubscribe;
  }, [addMessageListener]);

  // Handle speaking system
  useEffect(() => {
    const unsubscribe = addMessageListener('speak_statement', (message) => {
      const currentSpeaker = message.data?.currentSpeaker || message.currentSpeaker;
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        message: `${currentSpeaker} is speaking`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'system'
      }]);
    });
    return unsubscribe;
  }, [addMessageListener]);

  useEffect(() => {
    const unsubscribe = addMessageListener('start_voting', (message) => {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        message: 'Voting phase started!',
        timestamp: new Date().toLocaleTimeString(),
        type: 'system'
      }]);
    });
    return unsubscribe;
  }, [addMessageListener]);

  useEffect(() => {
    const unsubscribe = addMessageListener('end_voting', (message) => {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        message: 'Voting phase ended!',
        timestamp: new Date().toLocaleTimeString(),
        type: 'system'
      }]);
    });
    return unsubscribe;
  }, [addMessageListener]);

  useEffect(() => {
    const unsubscribe = addMessageListener('alivePlayers', (message) => {
      const alivePlayers = message.data?.alivePlayers || message.alivePlayers;
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        message: `Alive players: ${alivePlayers.length}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'system'
      }]);
    });
    return unsubscribe;
  }, [addMessageListener]);

  useEffect(() => {
    const unsubscribe = addMessageListener('game_ended', (message) => {
      const winner = message.data?.winner || message.winner;
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        message: `Game ended! Winner: ${winner}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'system'
      }]);
    });
    return unsubscribe;
  }, [addMessageListener]);

  // Handle chat messages
  useEffect(() => {
    const unsubscribe = addMessageListener('chat', (message) => {
      const userId = message.data?.userId || message.userId;
      const chat = message.data?.chat || message.chat;
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: userId || 'Unknown',
        message: chat,
        timestamp: new Date().toLocaleTimeString(),
        type: 'player'
      }]);
    });
    return unsubscribe;
  }, [addMessageListener]);

  // Handle errors
  useEffect(() => {
    const unsubscribe = addMessageListener('error', (message) => {
      const errorMessage = message.data?.message || message.message;
      setError(errorMessage || 'An error occurred');
      setIsLoading(false);
    });
    return unsubscribe;
  }, [addMessageListener]);

  useEffect(() => {
    const unsubscribe = addMessageListener('room_not_found', (message) => {
      setError('Room not found');
      setIsLoading(false);
    });
    return unsubscribe;
  }, [addMessageListener]);

  useEffect(() => {
    const unsubscribe = addMessageListener('player_already_in_room', (message) => {
      setError('Player already in room');
      setIsLoading(false);
    });
    return unsubscribe;
  }, [addMessageListener]);

  // Room actions
  const setReady = useCallback((ready: boolean) => {
    if (roomId && userId) {
      stableSendMessage({
        type: ready ? 'ready' : 'notready',
        roomId,
        userId
      });
    }
  }, [roomId, userId, stableSendMessage]);

  const startGame = useCallback(() => {
    if (roomId && userId) {
      stableSendMessage({
        type: 'ready',
        roomId,
        userId
      });
    }
  }, [roomId, userId, stableSendMessage]);

  const sendChatMessage = useCallback((message: string) => {
    if (roomId && userId) {
      stableSendMessage({
        type: 'send_chat',
        roomId,
        userId,
        chat: message
      });
    }
  }, [roomId, userId, stableSendMessage]);

  const vote = useCallback((targetId: string | null) => {
    if (roomId && userId) {
      stableSendMessage({
        type: 'vote',
        roomId,
        userId,
        votedPlayer: targetId
      });
    }
  }, [roomId, userId, stableSendMessage]);

  const leaveRoom = useCallback(() => {
    if (roomId && userId) {
      stableSendMessage({
        type: 'leave_room',
        roomId,
        userId
      });
    }
  }, [roomId, userId, stableSendMessage]);

  // Speaking system actions (simplified for new backend)
  const requestSpeak = useCallback(() => {
    // Not implemented in new backend
    console.log('Request speak not implemented');
  }, []);

  const endSpeaking = useCallback(() => {
    // Not implemented in new backend
    console.log('End speaking not implemented');
  }, []);

  const skipSpeaker = useCallback(() => {
    // Not implemented in new backend
    console.log('Skip speaker not implemented');
  }, []);

  const resetSpeakingQueue = useCallback(() => {
    // Not implemented in new backend
    console.log('Reset speaking queue not implemented');
  }, []);

  const getPlayerWord = useCallback(() => {
    // Word is automatically assigned when game starts
    console.log('Player word:', playerWord);
  }, [playerWord]);

  // Get current player info - adapt to new backend structure
  const currentPlayer = roomState?.players?.[userId || ''] || null;
  const isHost = roomState?.hostId === userId;
  
  // Convert player list from new backend format to expected format
  const players = roomState?.playerList ? roomState.playerList.map((playerId: string) => ({
    userId: playerId,
    displayName: `Player_${playerId.slice(-4)}`, // Generate display name from userId
    role: (roomState.spy?.player === playerId ? 'SPY' : 'CIVILIAN') as 'SPY' | 'CIVILIAN' | null,
    alive: roomState.alivePlayers?.includes(playerId) ?? true,
    ready: roomState.readyStatus?.[playerId] ?? false,
  })) : [];
  
  // Convert voting format from new backend
  const votingState = roomState?.voting ? {
    votes: Object.keys(roomState.voting).reduce((acc, playerId) => {
      roomState.voting[playerId].forEach(voterId => {
        acc[voterId] = playerId;
      });
      return acc;
    }, {} as Record<string, string | null>),
    tally: Object.keys(roomState.voting).reduce((acc, playerId) => {
      acc[playerId] = roomState.voting[playerId].length;
      return acc;
    }, {} as Record<string, number>)
  } : null;
  
  const readyPlayers = players.filter(p => p.ready);
  const canStartGame = isHost && readyPlayers.length >= 3 && !roomState?.gameStarted;

  // Speaking system info (simplified for new backend)
  const isCurrentSpeaker = false; // Not implemented in new backend
  const isInSpeakingQueue = false; // Not implemented in new backend
  const canRequestSpeak = false; // Not implemented in new backend

  return {
    roomState: roomState ? {
      ...roomState,
      vote: votingState
    } : null,
    chatMessages,
    isLoading,
    error,
    currentPlayer,
    isHost,
    players,
    readyPlayers,
    canStartGame,
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
