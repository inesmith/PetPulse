// screens/RewardsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Platform, } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';

const { width } = Dimensions.get('window');

const colors = {
  blue:   (config as any)?.theme?.colors?.blue  ?? '#73C3D1',
  white:  (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o     ?? '#EE734A',
  text:   (config as any)?.theme?.colors?.text  ?? '#1C1C1C',
};

const NAV_H = 64;
const NAV_MARGIN = 8;
const ROW_RADIUS = 18;

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const padBottom = NAV_H + Math.max(insets.bottom, NAV_MARGIN) + 16;

  const earned = [
    { id: 1, name: '10% Off Treats', brand: 'PawCo',    date: '12 Jul 2025' },
    { id: 2, name: 'Free Toy',       brand: 'WoofBox',  date: '03 Jul 2025' },
    { id: 3, name: 'Bath Voucher',   brand: 'FurrySpa', date: '24 Jun 2025' },
  ];

  const upcoming = [
    { id: 1, name: 'Vet Check Voucher', pct: 40 },
    { id: 2, name: 'Grooming Discount', pct: 65 },
    { id: 3, name: 'Premium Kibble',    pct: 15 },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left','right']}>
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <ScrollView contentContainerStyle={{ paddingBottom: padBottom }}>
          {/* Header */}
          <View style={styles.headerTextWrap}>
            <Text style={styles.welcome}>HEY LOOK,{'\n'}YOU'VE MADE IT</Text>
          </View>

          {/* Pill */}
          <View style={styles.pillWrap}>
            <View style={[styles.pill, styles.cardShadow]}>
              <Text style={[styles.pillText, { color: colors.accent }]}>REWARDS</Text>
            </View>
          </View>

          {/* Earned Rewards — styled like Recent Activities list */}
          <Text style={styles.sectionLabel}>EARNED REWARDS</Text>
          <View style={styles.list}>
            {earned.map(item => (
              <View key={item.id} style={[styles.listItem, styles.listShadow]}>
                <View>
                  <Text style={styles.listTitle}>{item.name}</Text>
                  <Text style={styles.listMeta}>
                    {item.brand} • {item.date}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8A8A8A" />
              </View>
            ))}
          </View>

          {/* Next Reward section */}
          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>NEXT REWARD</Text>
          <View style={{ paddingHorizontal: 22 }}>
            {upcoming.map(u => (
              <View key={u.id} style={[styles.row, { borderColor: colors.accent }]}>
                <Text style={styles.cellLeft} numberOfLines={1}>{u.name}</Text>
                <Text style={styles.cellRight} numberOfLines={1}>{`${u.pct}%`}</Text>
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

  /* Pill */
  pillWrap: { marginTop: 55, paddingHorizontal: 22, width: '100%' },
  pill: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e9e8e6ff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 80,
  },
  pillText: { fontWeight: '900', fontSize: 18, letterSpacing: 0.3 },

  /* Section label */
  sectionLabel: {
    marginTop: 45,
    color: '#6E6E6E',
    fontWeight: '900',
    paddingHorizontal: 22,
    letterSpacing: 0.2,
    marginBottom: 10,
  },

  /* List (matches Activities recent list) */
  list: { paddingHorizontal: 22, gap: 6 },
  listItem: {
    borderRadius: ROW_RADIUS,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: { fontWeight: '800', fontSize: 14, color: colors.text },
  listMeta: { color: '#6E6E6E', marginTop: 2, fontSize: 12 },

  /* Bordered rows (Next Reward) */
  row: {
    height: 58,
    borderRadius: ROW_RADIUS,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cellLeft:  { flex: 1.2, fontWeight: '800', color: '#6E6E6E' },
  cellRight: { flex: 0.9, fontWeight: '700', color: '#6E6E6E', textAlign: 'right' },

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
});
