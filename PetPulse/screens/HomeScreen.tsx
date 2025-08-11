import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ImageBackground, } from 'react-native';
import { config } from '../gluestack-ui.config';
import PetNavigator from '../components/PetNavigator';
import PetNavigatorImages from '../components/PetNavigator';
import BottomNavBar from '../components/BottomNavBar';
import { SafeAreaView } from 'react-native-safe-area-context';



const { width } = Dimensions.get('window');

const colors = {
  blue: (config as any)?.theme?.colors?.blue ?? '#73C3D1',
  White: (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o ?? '#EE734A',
  text: (config as any)?.theme?.colors?.text ?? '#1C1C1C',
  grey: '#DADADA',
  shadow: 'rgba(0,0,0,0.12)',
};

export default function HomeScreen({}: any) {
  const [expanded, setExpanded] = useState(false);

  return (
<SafeAreaView style={[styles.safe, { backgroundColor: colors.White }]} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: colors.White }}>
        {/* <PetNavigatorImages /> */}

      {/* Welcome text (static for now) */}
      <View style={styles.headerTextWrap}>
        <Text style={styles.welcome}>WELCOME BACK,{'\n'}USER</Text>
      </View>

      {/* Today card */}
      <View style={styles.todayWrap}>
        <View style={[styles.todayCard, styles.shadow]}>
          <Text style={[styles.todayLeft, { color: colors.accent }]}>TODAY</Text>
          <View style={styles.todayRight}>
            <Text style={styles.todayRightTop}>WED,</Text>
            <Text style={styles.todayRightBottom}>27 JULY</Text>
          </View>
        </View>
      </View>

      {/* Reminders label */}
      <Text style={styles.sectionLabel}>REMINDERS</Text>

      {/* Reminders row (placeholders) */}
      <View style={styles.remindersRow}>
        <View style={[styles.reminderBox, { backgroundColor: colors.grey }]} />
        <View style={[styles.reminderBox, { backgroundColor: colors.grey }]} />
        <View style={[styles.reminderBox, { backgroundColor: colors.grey }]} />
        <View style={[styles.reminderBox, { backgroundColor: colors.grey }]} />
      </View>

      {/* Steps stat card */}
      <View style={[styles.stepsCard, { borderColor: colors.accent }, { backgroundColor: 'none' }]}>
        <Text style={styles.stepsLabel}>STEPS</Text>
        <Text style={[styles.stepsValue, { color: colors.blue }, styles.shadow2]}>3478</Text>
      </View>

      {/* Map preview (static image background placeholder) */}
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

      {/* Bottom navigation */}
      <View style={{ flex: 1, backgroundColor: '#F8F7F4' }}>
        </View>
        </View>
        <BottomNavBar />
    </SafeAreaView>  
  );
}

const RADIUS = 26;

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // --- Pet Navigator ---
  petNavTouch: {
    position: 'absolute',
    top: 6,
    left: 0,
    zIndex: 20,
  },
  petNavCollapsed: {
    width: 150,
    height: 190,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 100,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 28,
  },
  petAvatarSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.7,
  },

  petNavExpanded: {
    marginTop: 4,
    marginLeft: 0,
    width: width * 0.9,
    height: 82,
    borderRadius: 41,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  petDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  petDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    opacity: 0.95,
  },

  // --- Header text ---
  headerTextWrap: {
    marginTop: 60,
    alignItems: 'flex-end',
    paddingHorizontal: 22,
  },
  welcome: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'right',
    lineHeight: 28,
  },

  // --- Today card ---
  todayWrap: {
    marginTop: 55,
    paddingHorizontal: 22,
  },
  todayCard: {
    height: 60,
    borderRadius: 28,
    backgroundColor: '#f8f7f47d',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 70,
  },
  shadow: {
    shadowColor: colors.shadow,
    shadowOpacity: 100,
    shadowRadius: 5,
    shadowOffset: { width: 6, height: 6 },
    elevation: 10,
  },
  todayLeft: {
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  todayRight: { alignItems: 'flex-end' },
  todayRightTop: { color: '#777', fontSize: 12, lineHeight: 14 },
  todayRightBottom: { color: '#777', fontSize: 12, lineHeight: 14, fontWeight: '700' },

  // --- Reminders ---
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
    width: 70,
    borderRadius: 16,
    opacity: 0.6,
  },

  // --- Steps card ---
  stepsCard: {
    marginTop: 20,
    marginHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: '#F8F7F4',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepsLabel: {
    color: '#6E6E6E',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  stepsValue: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'Barlow SemiCondensed',
  },
  shadow2: {
    shadowColor: colors.shadow,
    shadowOpacity: 100,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  // --- Map card ---
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
  distanceLabel: {
    fontWeight: '900',
    fontSize: 13,
  },

});
