import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles, Colors } from '../screens/styles';

interface BottomToolbarProps {
  onToggleSpeaker: () => void;
  onToggleMic: () => void;
  onEmoji: () => void;
  onOpenChat: () => void;
  isSpeakerOn?: boolean;
  isMicOn?: boolean;
}

const BottomToolbar: React.FC<BottomToolbarProps> = ({
  onToggleSpeaker,
  onToggleMic,
  onEmoji,
  onOpenChat,
  isSpeakerOn = true,
  isMicOn = true,
}) => {
  return (
    <View style={styles.bottomToolbar}>
      {/* Speaker Button */}
      <TouchableOpacity
        style={styles.toolbarButton}
        onPress={onToggleSpeaker}
        accessibilityLabel={isSpeakerOn ? "Turn off speaker" : "Turn on speaker"}
      >
        <MaterialCommunityIcons
          name="volume-high"
          size={24}
          color={isSpeakerOn ? Colors.white : Colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Microphone Button */}
      <TouchableOpacity
        style={styles.toolbarButton}
        onPress={onToggleMic}
        accessibilityLabel={isMicOn ? "Turn off microphone" : "Turn on microphone"}
      >
        <MaterialCommunityIcons
          name={isMicOn ? "microphone" : "microphone-off"}
          size={24}
          color={isMicOn ? Colors.white : Colors.textSecondary}
        />
        {/* Live indicator dot */}
        {/* {isMicOn && (
          <View
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: Colors.white,
            }}
          />
        )} */}
      </TouchableOpacity>

      {/* Emoji Button */}
      <TouchableOpacity
        style={styles.toolbarButton}
        onPress={onEmoji}
        accessibilityLabel="Open emoji picker"
      >
        <MaterialCommunityIcons
          name="emoticon-outline"
          size={24}
          color={Colors.white}
        />
      </TouchableOpacity>

      {/* Chat Button */}
      <TouchableOpacity
        style={styles.toolbarButton}
        onPress={onOpenChat}
        accessibilityLabel="Open chat"
      >
        <MaterialCommunityIcons
          name="message-processing"
          size={24}
          color={Colors.white}
        />
      </TouchableOpacity>
    </View>
  );
};

export default BottomToolbar;
