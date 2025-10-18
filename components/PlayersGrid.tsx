import React from 'react';
import { View, FlatList } from 'react-native';
import PlayerSeat from './PlayerSeat';
import { styles, Sizes, Spacing } from '../screens/styles';

interface Player {
  id: string;
  name: string;
  isReady: boolean;
  isMicOn?: boolean;
  isRecording?: boolean;
  unreadCount?: number;
  isAlive?: boolean;
}

interface PlayersGridProps {
  players: Player[];
  onPressMic?: (playerId: string) => void;
  currentSpeaker?: string;
  isVoting?: boolean;
  onVote?: (playerId: string) => void;
  votingResults?: {[playerId: string]: string[]} | null;
  votingEnded?: boolean;
  currentUserVote?: string | null;
  currentUserId?: string | null;
}

const PlayersGrid: React.FC<PlayersGridProps> = ({ players, onPressMic, currentSpeaker, isVoting, onVote, votingResults, votingEnded, currentUserVote, currentUserId }) => {
  // Create 6 slots, filling empty ones with placeholder data
  const createSlots = () => {
    const slots: (Player | null)[] = [];
    
    // Fill slots with actual players
    for (let i = 0; i < 6; i++) {
      if (i < players.length) {
        slots.push(players[i]);
      } else {
        slots.push(null); // Empty slot
      }
    }
    
    return slots;
  };

  const slots = createSlots();

  const renderPlayer = ({ item, index }: { item: Player | null; index: number }) => {
    if (item === null) {
      // Empty slot with placeholder
      return (
        <PlayerSeat
          player=""
          seatNumber={index + 1}
          isReady={false}
          isMicOn={false}
          isRecording={false}
          unreadCount={undefined}
          onPressMic={() => onPressMic?.('')}
          isEmpty={true}
          isCurrentSpeaker={false}
        />
      );
    }

    return (
      <PlayerSeat
        player={item.name}
        seatNumber={index + 1}
        isReady={item.isReady}
        isMicOn={item.isMicOn}
        isRecording={item.isRecording}
        unreadCount={item.unreadCount}
        onPressMic={() => onPressMic?.(item.id)}
        isEmpty={false}
        isCurrentSpeaker={item.id === currentSpeaker}
        isVoting={isVoting}
        onVote={() => onVote?.(item.id)}
        isAlive={item.isAlive}
        votingResults={votingResults}
        playerId={item.id}
        votingEnded={votingEnded}
        playerList={players.map(p => p.id)}
        currentUserVote={currentUserVote}
        currentUserId={currentUserId}
      />
    );
  };

  return (
    <View style={styles.playersGrid}>
      <FlatList
        data={slots}
        renderItem={renderPlayer}
        keyExtractor={(item, index) => item?.id || `empty-${index}`}
        numColumns={2}
        columnWrapperStyle={{ 
          justifyContent: 'space-between',
          paddingHorizontal: Sizes.gridGap,
        }}
        scrollEnabled={false}
        contentContainerStyle={{
          paddingVertical: Spacing.xs,
        }}
      />
    </View>
  );
};

export default PlayersGrid;
