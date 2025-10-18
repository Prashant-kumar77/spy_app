import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { styles, Colors } from '../screens/styles';

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp?: string;
  isSystem?: boolean;
}

interface ChatPanelProps {
  messages: ChatMessage[];
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages }) => {
  const renderMessage = (message: ChatMessage) => (
    <View key={message.id} style={styles.chatMessage}>
      <Text style={styles.chatAvatar}>
        {message.isSystem ? '🐲' : '💀'}
      </Text>
      <Text style={styles.chatName}>{message.sender}:</Text>
      <Text style={styles.chatText}>{message.message}</Text>
    </View>
  );

  // Default sample message if no messages
  const defaultMessages: ChatMessage[] = [
    {
      id: 'sample-1',
      sender: 'Nyayadheesh',
      message: 'The room is full, please get ready!',
      isSystem: true,
    },
  ];

  const displayMessages = messages.length > 0 ? messages : defaultMessages;

  return (
    <View style={styles.chatPanel}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {displayMessages.map(renderMessage)}
      </ScrollView>
    </View>
  );
};

export default ChatPanel;
