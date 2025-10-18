import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { styles, Colors } from '../screens/styles';

interface PrimaryActionsProps {
  onInvite: () => void;
  onReady: () => void;
  isReady?: boolean;
  isInviteDisabled?: boolean;
  isReadyDisabled?: boolean;
}

const PrimaryActions: React.FC<PrimaryActionsProps> = ({
  onInvite,
  onReady,
  isReady = false,
  isInviteDisabled = false,
  isReadyDisabled = false,
}) => {
  return (
    <View style={styles.primaryActions}>
      {/* Invite Button */}
      {/* <TouchableOpacity
        onPress={onInvite}
        disabled={isInviteDisabled}
        style={{ opacity: isInviteDisabled ? 0.5 : 1 }}
        accessibilityLabel="Invite players to room"
      >
        <LinearGradient
          colors={[Colors.inviteStart, Colors.inviteEnd]}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Invite</Text>
        </LinearGradient>
      </TouchableOpacity> */}

      {/* Get Ready Button */}
      <TouchableOpacity
        onPress={onReady}
        disabled={isReadyDisabled}
        style={{ opacity: isReadyDisabled ? 0.5 : 1 }}
        accessibilityLabel={isReady ? "Mark as not ready" : "Mark as ready"}
      >
        <LinearGradient
          colors={[Colors.readyStart, Colors.readyEnd]}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {isReady ? 'Ready' : 'Get Ready'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default PrimaryActions;
