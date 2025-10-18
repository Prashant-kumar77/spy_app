import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/MainNavigation';
import { useAppDispatch } from '../store/hooks';
import { setRoomId as setRoomIdAction, setRoomToken, setUserId } from '../store';

type HomeNav = StackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeNav;
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [joinVisible, setJoinVisible] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const dispatch = useAppDispatch();

  const handleCreate = async () => {
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
      navigation.navigate('Room', { roomId: json.roomId, name });
    } catch (e) {
      console.error(e);
    }
  };

  

  const handleJoin = () => {
    setJoinVisible(true);
  };

  const confirmJoin = async () => {
    if (roomId.trim()) {
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
        navigation.navigate('Room', { roomId: json.roomData?.id || roomId.trim(), name });
      } catch (e) {
        console.error(e);
      }
      setJoinVisible(false);

      // navigation.navigate('Room', { roomId: roomId.trim(), name });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create or Join Room</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
        />
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.create]} onPress={handleCreate}>
          <Text style={styles.buttonText}>Create Room</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.join]} onPress={handleJoin}>
          <Text style={styles.buttonText}>Join Room</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={joinVisible} transparent animationType="slide" onRequestClose={() => setJoinVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join Room</Text>
            <TextInput
              style={styles.input}
              placeholder="Room ID"
              placeholderTextColor="#999"
              value={roomId}
              onChangeText={setRoomId}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.button, styles.cancel]} onPress={() => setJoinVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.confirm]} onPress={confirmJoin}>
                <Text style={styles.buttonText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
    color: '#222',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  create: {
    backgroundColor: '#6C63FF',
    marginRight: 8,
  },
  join: {
    backgroundColor: '#00C853',
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '88%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  cancel: {
    backgroundColor: '#9E9E9E',
    marginRight: 8,
  },
  confirm: {
    backgroundColor: '#00C853',
  },
});

export default HomeScreen;
