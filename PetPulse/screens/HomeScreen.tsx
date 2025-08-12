// screens/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';

const { width } = Dimensions.get('window');

const colors = {
  blue: (config as any)?.theme?.colors?.blue ?? '#73C3D1',
  White: (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o ?? '#EE734A',
  text: (config as any)?.theme?.colors?.text ?? '#1C1C1C',
  grey: '#DADADA',
};

const TODAY_H = 60; // keep Today pill height consistent with design

export default function HomeScreen() {
  const nav = useNavigation<any>();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.White }]} edges={['left','right']}>
      <View style={{ flex: 1, backgroundColor: colors.White }}>
        {/* Welcome text */}
        <View style={styles.headerTextWrap}>
          <Text style={styles.welcome}>WELCOME BACK,{'\n'}USER</Text>
        </View>

        {/* Today row: Today card + Settings square, centered together */}
        <View style={styles.todayWrap}>
          <View style={styles.todayRow}>
            <View style={[styles.todayCard, styles.shadow]}>
              <Text style={[styles.todayLeft, { color: colors.accent }]}>TODAY</Text>
              <View style={styles.todayRight}>
                <Text style={styles.todayRightTop}>WED,</Text>
                <Text style={styles.todayRightBottom}>27 JULY</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
                onPress={() => nav.navigate('UserSettings')}
              style={[styles.settingsSquare, styles.shadow]}
            >
              <Ionicons name="settings" size={24} color={colors.blue} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reminders */}
        <Text style={styles.sectionLabel}>REMINDERS</Text>
        <View style={styles.remindersRow}>
          <View style={[styles.reminderBox, styles.shadow, { backgroundColor: '#e9e8e6ff' }]} />
          <View style={[styles.reminderBox, styles.shadow, { backgroundColor: '#e9e8e6ff' }]} />
          <View style={[styles.reminderBox, styles.shadow, { backgroundColor: '#e9e8e6ff' }]} />
          <View style={[styles.reminderBox, styles.shadow, { backgroundColor: '#e9e8e6ff' }]} />
        </View>

        {/* Steps */}
        <View style={[styles.stepsCard, { borderColor: colors.accent }]}>
          <Text style={styles.stepsLabel}>STEPS</Text>
          <Text style={[styles.stepsValue, { color: colors.blue }, styles.shadow]} >3478</Text>
        </View>

        {/* Map preview */}
        <View style={[styles.mapCard, { borderColor: colors.accent }]}>
          <ImageBackground
            source={require('../assets/map-placeholder.png')}
            style={styles.mapImg}
            imageStyle={{ borderRadius: 16, opacity: 0.25 }}
            resizeMode="cover"
          >
            <Text style={[styles.distanceLabel, { color: colors.accent }]}>
              DISTANCE: 2,5 km
            </Text>
          </ImageBackground>
        </View>
      </View>

      {/* Floating nav */}
      <BottomNavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  headerTextWrap: {
    marginTop: 125,
    alignItems: 'flex-end',
    paddingHorizontal: 22,
  },
  welcome: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'right',
    lineHeight: 28,
  },

  todayWrap: { marginTop: 55, paddingHorizontal: 22 },
  // Center the Today card + Settings square as one group
  todayRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 6,
  },
  todayCard: {
    height: TODAY_H,
    borderRadius: 28,
    backgroundColor: '#e9e8e6ff',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',


    // width tuned so card + square look balanced in center
    width: width * 0.58,
  },
  settingsSquare: {
    width: TODAY_H,
    height: TODAY_H,
    borderRadius: 28,
    backgroundColor: '#e9e8e6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  todayLeft: { fontWeight: '900', fontSize: 18, letterSpacing: 0.2 },
  todayRight: { alignItems: 'flex-end' },
  todayRightTop: { color: '#777', fontSize: 12, lineHeight: 14 },
  todayRightBottom: { color: '#777', fontSize: 12, lineHeight: 14, fontWeight: '700' },

  sectionLabel: {
    marginTop: 45,
    color: '#6E6E6E',
    fontWeight: '800',
    paddingHorizontal: 22,
    letterSpacing: 0.2,
  },
  remindersRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 22,
    marginTop: 10,
  },
  reminderBox: {
    flex: 1,
    height: 90,
    width: 90,
    borderRadius: 16,
  },

  stepsCard: {
    marginTop: 20,
    marginHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepsLabel: { color: '#6E6E6E', fontWeight: '800', letterSpacing: 0.2 },
  stepsValue: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 1,
  },


  mapCard: {
    marginTop: 20,
    marginHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  mapImg: {
    width: '100%',
    height: 250,
    justifyContent: 'flex-end',
    padding: 12,
  },
  distanceLabel: { fontWeight: '900', fontSize: 13 },
});
