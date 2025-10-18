import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/MainNavigation';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useAppDispatch } from '../store/hooks';
import { setRoomId as setRoomIdAction, setRoomToken, setUserId } from '../store';
import { useWebSocket } from '../contexts/WebSocketContext';


type SpyHomeNav = StackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: SpyHomeNav;
};

const { width, height } = Dimensions.get('window');

const SpyHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { sendMessage } = useWebSocket();
  const [joinVisible, setJoinVisible] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const dispatch = useAppDispatch();

  const handleGameMode = (mode: 'spy' | 'wordless') => {
    // Navigate to game mode selection or room creation
    console.log(`Selected game mode: ${mode}`);
  };

  const handleJoinRoom = () => {
    // Open modal for room ID input
    setJoinVisible(true);
  };

  const handleCreateRoom = () => {
    // Directly create room with random name
    const randomName = `Player_${Math.floor(Math.random() * 10000)}`;
    setName(randomName);
    handleCreate();
  };

  const handleGoldReward = () => {
    // Navigate to contribution page
    console.log('Gold Reward pressed');
  };

  const handleCreate = async () => {
    // Use the name that was set (either from random generation or user input)
    const playerName = name.trim() || `Player_${Math.floor(Math.random() * 10000)}`;

    try {
      const resp = await fetch('https://spy-backend-http.onrender.com/api/v1/room/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Backend doesn't use name parameter
      });
      if (!resp.ok) {
        throw new Error(`Create failed: ${resp.status}`);
      }
      const json = await resp.json();
      // { roomToken, roomId, userId }
      dispatch(setRoomToken(json.roomToken || null));
      dispatch(setRoomIdAction(json.roomId || null));
      dispatch(setUserId(json.userId || null));
      sendMessage(JSON.stringify({
        type: 'CREATE_ROOM',
        roomId: json.roomId,
        userId: json.userId,
      }));
      navigation.navigate('Room', { roomId: json.roomId, name: playerName });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to create room. Please try again.');
    }
  };

  const confirmJoin = async () => {
    if (!roomId.trim()) {
      Alert.alert('Error', 'Please enter a room ID');
      return;
    }

    // Use random name if no name is set
    const playerName = name.trim() || `Player_${Math.floor(Math.random() * 10000)}`;

    try {
      const resp = await fetch('https://spy-backend-http.onrender.com/api/v1/room/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomId.trim(), addToMyClassroom: false }),
      });
      if (!resp.ok) {
        throw new Error(`Join failed: ${resp.status}`);
      }
      const json = await resp.json();
      // { roomToken, userId, roomData }
      dispatch(setRoomToken(json.roomToken || null));
      dispatch(setRoomIdAction(json.roomData?.id || roomId.trim()));
      dispatch(setUserId(json.userId || null));
      navigation.navigate('Room', { roomId: json.roomData?.id || roomId.trim(), name: playerName });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to join room. Please check the room ID and try again.');
    }
    setJoinVisible(false);
  };


  return (
    <LinearGradient
      colors={['#1e3c72', '#2a5298', '#1e3c72']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1e3c72" />
      
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <View style={styles.headerBanner}>
          <Text style={styles.headerTextSmall}>WHO IS THE</Text>
          <View style={styles.spyTextContainer}>
            <Icon name="chevron-down" size={16} color="#fff" style={styles.arrowIcon} />
            <Text style={styles.headerTextLarge}>SPY</Text>
          </View>
        </View>
      </View>

      {/* Main Game Mode Buttons */}
      <View style={styles.gameModesContainer}>
        {/* Who's the Spy Button */}
        <TouchableOpacity 
          style={[styles.gameModeButton, styles.spyButton]} 
          onPress={() => handleGameMode('spy')}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <View style={styles.iconContainer}>
              <MaterialIcon name="account-tie" size={40} color="#fff" />
              <MaterialIcon name="magnify" size={20} color="#FFD700" style={styles.magnifyIcon} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.buttonTitle}>Who's the Spy</Text>
              <Text style={styles.buttonSubtitle}>Spies have different words from villagers</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Wordless Spy Button */}
        <TouchableOpacity 
          style={[styles.gameModeButton, styles.wordlessButton]} 
          onPress={() => handleGameMode('wordless')}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <View style={styles.iconContainer}>
              <MaterialIcon name="account-tie" size={40} color="#fff" />
              <MaterialIcon name="help-circle" size={20} color="#fff" style={styles.questionIcon} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.buttonTitle}>Wordless Spy</Text>
              <Text style={styles.buttonSubtitle}>Spies have no words</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.searchButton]} 
          onPress={handleJoinRoom}
          activeOpacity={0.8}
        >
          <Icon name="search" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Join Room</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.createButton]} 
          onPress={handleCreateRoom}
          activeOpacity={0.8}
        >
          <MaterialIcon name="home-plus" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Create Room</Text>
        </TouchableOpacity>
      </View>

      {/* Gold Reward Section */}
      

      {/* Decorative Game Board Area */}
      


      {/* Join Room Modal */}
      <Modal 
        visible={joinVisible} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setJoinVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join Room</Text>
            <Text style={styles.modalSubtitle}>Enter your name and room ID</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Your name (optional)"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Room ID"
              placeholderTextColor="#999"
              value={roomId}
              onChangeText={setRoomId}
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setJoinVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={confirmJoin}
              >
                <Text style={styles.modalButtonText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 0,
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerBanner: {
    backgroundColor: '#2a5298',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    position: 'relative',
  },
  headerTextSmall: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  spyTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowIcon: {
    marginRight: 8,
  },
  headerTextLarge: {
    color: '#FF6B35',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  gameModesContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  gameModeButton: {
    marginBottom: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  spyButton: {
    backgroundColor: '#FF6B35',
  },
  wordlessButton: {
    backgroundColor: '#2a5298',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginRight: 20,
    position: 'relative',
  },
  magnifyIcon: {
    position: 'absolute',
    bottom: -5,
    right: -5,
  },
  questionIcon: {
    position: 'absolute',
    bottom: -5,
    right: -5,
  },
  textContainer: {
    flex: 1,
  },
  buttonTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonSubtitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  searchButton: {
    backgroundColor: '#4A90E2',
  },
  createButton: {
    backgroundColor: '#4A90E2',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  goldRewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  goldRewardTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  goldRewardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  goldRewardSubtitle: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  gameBoardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameBoard: {
    width: 120,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  pawnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pawn: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  yellowPawn: {
    backgroundColor: '#FFD700',
  },
  greenPawn: {
    backgroundColor: '#4CAF50',
  },
  diceContainer: {
    alignItems: 'center',
  },
  dice: {
    width: 20,
    height: 20,
    backgroundColor: '#2196F3',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  diceDot: {
    width: 3,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 1.5,
    position: 'absolute',
    top: 4,
    left: 4,
  },
  diceDotRight: {
    top: 12,
    left: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  modalInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f9fa',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
  },
  confirmButton: {
    backgroundColor: '#4A90E2',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SpyHomeScreen;
