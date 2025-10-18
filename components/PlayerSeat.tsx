import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles, Colors, Sizes } from '../screens/styles';

interface PlayerSeatProps {
  player: string;
  seatNumber: number;
  isReady: boolean;
  isMicOn?: boolean;
  isRecording?: boolean;
  unreadCount?: number;
  onPressMic?: () => void;
  isEmpty?: boolean;
  isCurrentSpeaker?: boolean;
  isVoting?: boolean;
  onVote?: () => void;
  isAlive?: boolean;
  votingResults?: {[playerId: string]: string[]} | null;
  playerId?: string;
  votingEnded?: boolean;
  playerList?: string[];
  currentUserVote?: string | null;
  currentUserId?: string | null;
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  seatNumber,
  isReady,
  isMicOn = false,
  isRecording = false,
  unreadCount,
  onPressMic,
  isEmpty = false,
  isCurrentSpeaker = false,
  isVoting = false,
  onVote,
  isAlive = true,
  votingResults,
  playerId,
  votingEnded = false,
  playerList = [],
  currentUserVote,
  currentUserId,
}) => {
  // Generate consistent colors for placeholder avatars
  const avatarColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
  ];
  const avatarColor = avatarColors[(seatNumber - 1) % avatarColors.length];

  const getPlayerDisplayName = (name: string) => {
    if (name.length <= 8) return name;
    return name.substring(0, 6) + '...';
  };

  // Function to get voter's color based on their seat number
  const getVoterColor = (voterId: string) => {
    // Find the voter's index in the player list
    const voterIndex = playerList.indexOf(voterId);
    if (voterIndex === -1) {
      // Fallback to hash-based color if voter not found in player list
      const hash = voterId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      return avatarColors[Math.abs(hash) % avatarColors.length];
    }
    // Use the same color logic as player avatars: (seatNumber - 1) % avatarColors.length
    // voterIndex + 1 because seat numbers start from 1, not 0
    return avatarColors[(voterIndex + 1 - 1) % avatarColors.length];
  };

  // Function to get current user's color
  const getCurrentUserColor = () => {
    if (!currentUserId) return avatarColors[0];
    return getVoterColor(currentUserId);
  };

  return (
    <View style={styles.playerSeat}>
      {/* Avatar */}
      {isVoting && !isEmpty && isAlive ? (
        <TouchableOpacity 
          style={[styles.avatar]} 
          onPress={onVote}
        >
          <View style={{
            width: Sizes.seatInner,
            height: Sizes.seatInner,
            borderRadius: Sizes.seatInner / 2,
            backgroundColor: avatarColor,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: Colors.readyStart,
          }}>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
              {player.charAt(0).toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.avatar]}>
          {isEmpty ? (
            // Empty slot placeholder
            <View style={{
              width: Sizes.seatInner,
              height: Sizes.seatInner,
              borderRadius: Sizes.seatInner / 2,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.3)',
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MaterialCommunityIcons 
                name="account-plus" 
                size={24} 
                color="rgba(255,255,255,0.5)" 
              />
            </View>
          ) : (
            // Player avatar
            <View style={{
              width: Sizes.seatInner,
              height: Sizes.seatInner,
              borderRadius: Sizes.seatInner / 2,
              backgroundColor: avatarColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
                {player.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Seat number badge */}
      <View style={seatNumber === 2 || seatNumber === 4 || seatNumber === 6 ? styles.seatBadgeRight : styles.seatBadge}>
        <Text style={styles.seatBadgeText}>{seatNumber}</Text>
      </View>

      {/* Ready tick - only show for actual players */}
      {!isEmpty && isReady && (seatNumber === 1 || seatNumber === 3 || seatNumber === 5) && (
        <View style={styles.readyTick}>
          <MaterialCommunityIcons name="check" size={12} color={Colors.white} />
        </View>
      )}

      {/* Ready tick for 2nd column (seats 2, 4, 6) - positioned on the left */}
      {!isEmpty && isReady && (seatNumber === 2 || seatNumber === 4 || seatNumber === 6) && (
        <View style={styles.readyTickLeft}>
          <MaterialCommunityIcons name="check" size={12} color={Colors.white} />
        </View>
      )}

      {/* Cross icon for dead players - 1st column (seats 1, 3, 5) */}
      {!isEmpty && !isAlive && (seatNumber === 1 || seatNumber === 3 || seatNumber === 5) && (
        <View style={styles.deadCross}>
          <MaterialCommunityIcons name="close" size={16} color="#FF3B30" />
        </View>
      )}

      {/* Cross icon for dead players - 2nd column (seats 2, 4, 6) - positioned on the left */}
      {!isEmpty && !isAlive && (seatNumber === 2 || seatNumber === 4 || seatNumber === 6) && (
        <View style={styles.deadCrossLeft}>
          <MaterialCommunityIcons name="close" size={16} color="#FF3B30" />
        </View>
      )}

      {/* Special decorations for specific seats - only show for actual players and current speaker, but not during voting or after voting ends */}
      {!isEmpty && isCurrentSpeaker && !isVoting && !votingEnded && (seatNumber === 1 || seatNumber === 3 || seatNumber === 5) && (
        <TouchableOpacity style={styles.micButton} onPress={onPressMic}>
          <MaterialCommunityIcons 
            name="microphone" 
            size={20} 
            color={'#000'} 
          />
        </TouchableOpacity>
      )}

      {/* Mic button for 2nd column (seats 2, 4, 6) - positioned on the left, only for current speaker, but not during voting or after voting ends */}
      {!isEmpty && isCurrentSpeaker && !isVoting && !votingEnded && (seatNumber === 2 || seatNumber === 4 || seatNumber === 6) && (
        <TouchableOpacity style={styles.micButtonLeft} onPress={onPressMic}>
          <MaterialCommunityIcons 
            name="microphone" 
            size={20} 
            color={'#000'} 
          />
        </TouchableOpacity>
      )}

      {/* Vote avatars - show for 4 seconds after voting ends */}
      {!isEmpty && votingResults && playerId && votingResults[playerId] && (
        <>
          {/* Vote avatars for 1st column (seats 1, 3, 5) - positioned on the right */}
          {(seatNumber === 1 || seatNumber === 3 || seatNumber === 5) && (
            <View style={styles.voteAvatarsRight}>
              {votingResults[playerId].map((voterId, index) => {
                const voterColor = getVoterColor(voterId);
                return (
                  <View 
                    key={`${voterId}-${index}`}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: voterColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: Colors.white,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                      {voterId.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          
          {/* Vote avatars for 2nd column (seats 2, 4, 6) - positioned on the left */}
          {(seatNumber === 2 || seatNumber === 4 || seatNumber === 6) && (
            <View style={styles.voteAvatarsLeft}>
              {votingResults[playerId].map((voterId, index) => {
                const voterColor = getVoterColor(voterId);
                return (
                  <View 
                    key={`${voterId}-${index}`}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: voterColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: Colors.white,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                      {voterId.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* Current user's vote - show during voting phase only */}
      {!isEmpty && isVoting && currentUserVote === playerId && currentUserId && (
        <>
          {/* Current user's vote for 1st column (seats 1, 3, 5) - positioned on the right */}
          {(seatNumber === 1 || seatNumber === 3 || seatNumber === 5) && (
            <View style={styles.voteAvatarsRight}>
              <View 
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: getCurrentUserColor(),
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: Colors.readyStart, // Highlight with voting color
                }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                  {currentUserId.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          )}
          
          {/* Current user's vote for 2nd column (seats 2, 4, 6) - positioned on the left */}
          {(seatNumber === 2 || seatNumber === 4 || seatNumber === 6) && (
            <View style={styles.voteAvatarsLeft}>
              <View 
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: getCurrentUserColor(),
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: Colors.readyStart, // Highlight with voting color
                }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                  {currentUserId.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          )}
        </>
      )}

      {/* Player name */}
      <Text style={styles.playerName} numberOfLines={1}>
        {isEmpty ? 'Empty' : getPlayerDisplayName(player)}
      </Text>
      {!isEmpty && (
        <Text style={styles.playerNameSecondary}>...</Text>
      )}
    </View>
  );
};

export default PlayerSeat;
