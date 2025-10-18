import React, { useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles, Colors } from '../screens/styles';

interface GameModalProps {
  visible: boolean;
  type: 'countdown' | 'word' | 'voting' | 'game_result';
  countdown?: number;
  word?: string;
  wordType?: 'spy' | 'civilian';
  gameResult?: {winner: string, spy: string} | null;
  onClose: () => void;
}

const GameModal: React.FC<GameModalProps> = ({
  visible,
  type,
  countdown = 0,
  word = '',
  wordType = 'civilian',
  gameResult = null,
  onClose,
}) => {
  useEffect(() => {
    if (visible) {
      let timer: NodeJS.Timeout;
      
      if (type === 'word') {
        // Close after 2 seconds for word display
        timer = setTimeout(() => {
          onClose();
        }, 2000);
      } else if (type === 'voting') {
        // Close after 1.5 seconds for voting started
        timer = setTimeout(() => {
          onClose();
        }, 1500);
      }
      
      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }
  }, [visible, type, onClose]);

  const renderContent = () => {
    switch (type) {
      case 'countdown':
        return (
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="timer" size={60} color={Colors.white} />
            <Text style={styles.modalTitle}>Game Starting</Text>
            <Text style={styles.modalSubtitle}>Get Ready!</Text>
            {countdown > 0 && (
              <Text style={styles.modalCountdown}>{countdown}</Text>
            )}
          </View>
        );
      
      case 'word':
        return (
          <View style={styles.modalContent}>
            <MaterialCommunityIcons 
              name={wordType === 'spy' ? 'skull' : 'shield'} 
              size={60} 
              color={wordType === 'spy' ? '#FF6B6B' : '#4CAF50'} 
            />
            <Text style={styles.modalTitle}>
              {wordType === 'spy' ? 'You are the Spy!' : 'You are a Civilian!'}
            </Text>
            <Text style={styles.modalWord}>{word}</Text>
            <Text style={styles.modalSubtitle}>
              {wordType === 'spy' ? 'Find the civilian word' : 'Find the spy'}
            </Text>
          </View>
        );
      
      case 'voting':
        return (
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="vote" size={60} color={Colors.white} />
            <Text style={styles.modalTitle}>Voting Started</Text>
            <Text style={styles.modalSubtitle}>Choose who you think is the spy</Text>
          </View>
        );
      
      case 'game_result':
        if (!gameResult) return null;
        
        const isSpyWin = gameResult.winner === 'spy';
        const isCivilianWin = gameResult.winner === 'civilians';
        
        return (
          <View style={styles.modalContent}>
            <MaterialCommunityIcons 
              name={isSpyWin ? 'skull' : 'shield-check'} 
              size={60} 
              color={isSpyWin ? '#FF6B6B' : '#4CAF50'} 
            />
            <Text style={styles.modalTitle}>
              {isSpyWin ? 'Spy Wins!' : 'Civilians Win!'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isSpyWin ? 'The spy successfully avoided detection' : 'The spy was caught!'}
            </Text>
            <Text style={styles.modalWord}>
              The spy was: {gameResult.spy}
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={onClose}>
              <Text style={styles.modalButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
};

export default GameModal;
