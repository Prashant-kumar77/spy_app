import React from 'react';
import { View, Text, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { styles, Colors } from '../screens/styles';

interface HeaderCardProps {
  title: string;
  subtitle: string;
}

const HeaderCard: React.FC<HeaderCardProps> = ({ title, subtitle }) => {
  return (
    <View style={styles.headerCard}>
      {/* Gear halo background */}
      <View style={styles.gearHalo} />
      
      {/* Pin bolts */}
      <View style={[styles.pinBolt, styles.pinBoltLeft]} />
      <View style={[styles.pinBolt, styles.pinBoltRight]} />
      
      {/* Main card content */}
      <LinearGradient
        colors={[Colors.cardTop, Colors.cardBottom]}
        style={styles.headerCardInner}
      >
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </LinearGradient>
    </View>
  );
};

export default HeaderCard;
