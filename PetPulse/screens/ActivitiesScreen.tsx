// screens/ActivitiesScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';

const { width } = Dimensions.get('window');
const TODAY_H = 60; // keep Today pill height consistent with design


const colors = {
  blue:   (config as any)?.theme?.colors?.blue  ?? '#73C3D1',
  white:  (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o     ?? '#EE734A',
  text:   (config as any)?.theme?.colors?.text  ?? '#1C1C1C',
};

const NAV_H = 64;
const NAV_MARGIN = 8;
const CARD_RADIUS = 16;

export default function ActivitiesScreen() {
  const insets = useSafeAreaInsets();
  const padBottom = NAV_H + Math.max(insets.bottom, NAV_MARGIN) + 16;

  // Start with 3 activity tiles; you can store real data later.
  const [activities, setActivities] = useState<{ id: number }[]>([
    { id: 1 },
    { id: 2 },
    { id: 3 },
  ]);

  const handleAddActivity = () => {
    setActivities(prev => [...prev, { id: prev.length + 1 }]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left','right']}>
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: padBottom }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top welcome */}
          <View style={styles.headerTextWrap}>
            <Text style={styles.welcome}> LINA LARDI'S{'\n'}ACTIVITIES</Text>
          </View>

          {/* Activity History pill */}
          <View style={styles.todayWrap}>
                    <View style={styles.todayRow}>
                      <View style={[styles.todayCard, styles.shadow]}>
                        <Text style={[styles.todayLeft, { color: colors.accent }]}>TODAY</Text>
                        <View style={styles.todayRight}>
                          <Text style={styles.todayRightTop}>WED,</Text>
                          <Text style={styles.todayRightBottom}>27 JULY</Text>
                        </View>
                      </View>
                    </View>
           </View>

          {/* Activities Done — last tile is always Add */}
          <Text style={styles.sectionLabel}>ACTIVITIES DONE</Text>
          <View style={styles.tilesRow}>
            {activities.map(a => (
              <View
                key={a.id}
                style={[styles.tile, styles.cardShadow, { backgroundColor: '#e9e8e6ff' }]}
              />
            ))}

            {/* Add Activity tile (always last) */}
            <TouchableOpacity
              onPress={handleAddActivity}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Add activity"
              style={[
                styles.tile,
                styles.cardShadow,
                { backgroundColor: '#e9e8e6ff', alignItems: 'center', justifyContent: 'center' },
              ]}
            >
              <Ionicons name="add" size={28} color={colors.blue} />
              <Text style={styles.addText}>Add Activity</Text>
            </TouchableOpacity>
          </View>

          {/* Stats: Steps */}
          <View style={[styles.statCard, { borderColor: colors.accent }]}>
            <Text style={styles.statLabel}>STEPS</Text>
            <Text style={[styles.statValue, { color: colors.blue }, styles.shadow]}>70392</Text>
          </View>

          {/* Stats: Distance */}
          <View style={[styles.statCard, { borderColor: colors.accent }]}>
            <Text style={styles.statLabel}>DISTANCE</Text>
            <Text style={[styles.statValue, { color: colors.blue }, styles.shadow]}>69km</Text>
          </View>

          {/* Route / Map preview */}
          <View style={[styles.mapCard, { borderColor: colors.accent }]}>
            <ImageBackground
              source={require('../assets/map-placeholder.png')}
              style={styles.mapImg}
              imageStyle={{ borderRadius: 16, opacity: 0.25 }}
              resizeMode="cover"
            >
              <Text style={styles.distanceLabel}>DISTANCE: 2,5 km</Text>
            </ImageBackground>
          </View>

          {/* Recent items */}
          <Text style={[styles.sectionLabel, { marginTop: 18 }]}>RECENT ACTIVITIES</Text>
          <View style={styles.list}>
            {[
              { id: 1, title: 'Evening Walk', meta: '2.1 km • 3,248 steps • 24 min' },
              { id: 2, title: 'Park Play',    meta: '1.3 km • 1,845 steps • 18 min' },
              { id: 3, title: 'Morning Walk', meta: '3.0 km • 4,102 steps • 32 min' },
            ].map(item => (
              <View key={item.id} style={[styles.listItem, styles.listShadow]}>
                <View>
                  <Text style={styles.listTitle}>{item.title}</Text>
                  <Text style={styles.listMeta}>{item.meta}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8A8A8A" />
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Sticky floating nav */}
        <BottomNavBar />
      </View>
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
  todayLeft: { fontWeight: '900', fontSize: 18, letterSpacing: 0.2 },
  todayRight: { alignItems: 'flex-end' },
  todayRightTop: { color: '#777', fontSize: 12, lineHeight: 14 },
  todayRightBottom: { color: '#777', fontSize: 12, lineHeight: 14, fontWeight: '700' },

  /* Activities Done */
  sectionLabel: {
    marginTop: 45,
    color: '#6E6E6E',
    fontWeight: '800',
    paddingHorizontal: 22,
    letterSpacing: 0.2,
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 22,
    marginTop: 10,
  },
  tile: {
    width: (width - 22 * 2 - 14 * 3) / 4, // exactly 4 across with 14px gaps and 22px side padding
    height: 90,
    borderRadius: CARD_RADIUS,
  },
  addText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6E6E6E',
    marginTop: 4,
    textAlign: 'center',
  },

  /* Stat cards */
  statCard: {
    marginTop: 20,
    marginHorizontal: 22,
    borderRadius: CARD_RADIUS,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: { color: '#6E6E6E', fontWeight: '800', letterSpacing: 0.2 },
  statValue: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 1,
  },

  /* Map */
  mapCard: {
    marginTop: 20,
    marginHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  mapImg: {
    width: '100%',
    height: 180,
    justifyContent: 'flex-end',
    padding: 12,
  },
  distanceLabel: { fontWeight: '900', fontSize: 13, color: colors.accent },

  /* Recent list */
  list: { marginTop: 8, paddingHorizontal: 22, gap: 6 },
  listItem: {
    borderRadius: CARD_RADIUS,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: { fontWeight: '800', fontSize: 14, color: colors.text },
  listMeta: { color: '#6E6E6E', marginTop: 2, fontSize: 12 },

  /* Shadows */
  cardShadow: {
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  listShadow: {
    shadowColor: '#000',
    shadowOpacity: Platform.select({ ios: 0.12, android: 0.15 }),
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  shadow: {
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
