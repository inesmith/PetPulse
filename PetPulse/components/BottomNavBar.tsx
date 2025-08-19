import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { config } from '../gluestack-ui.config';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const { width } = Dimensions.get('window');

const colors = {
  blue: (config as any)?.theme?.colors?.blue ?? '#73C3D1',
  white: (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o ?? '#EE734A',
  text: (config as any)?.theme?.colors?.text ?? '#1C1C1C',
};

type TabKey = 'Home' | 'PetProfile' | 'Activities' | 'Rewards' | 'Health';

const TABS: { key: TabKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'Home',        icon: 'home' },
  { key: 'PetProfile',  icon: 'paw' },
  { key: 'Activities',  icon: 'walk' },
  { key: 'Rewards',     icon: 'gift' },
  { key: 'Health',      icon: 'medkit' },
];

const BAR_HEIGHT = 64;
// how much extra white background you want beyond the safe area
const EXTRA_WHITE = 20;

export default function BottomNavBar() {
  const nav = useNavigation<any>();
  const route = useRoute();
  const { bottom } = useSafeAreaInsets();

  // keep a minimum inset similar to your original Math.max(bottom, 8)
  const inset = Math.max(bottom, 8);

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: inset + EXTRA_WHITE, // extend the white a little more
          backgroundColor: colors.white,
        },
      ]}
    >
      {/* Blue rounded bar */}
      <View style={[styles.bar, { backgroundColor: colors.blue }]} />

      {/* Icons pinned to the bar area (not the whole container) */}
      <View style={[styles.row, { height: BAR_HEIGHT }]}>
        {TABS.map(({ key, icon }) => {
          const active = route.name === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => route.name !== key && nav.navigate(key)}
              style={[
                styles.hole,
                { backgroundColor: colors.white, opacity: active ? 1 : 0.95 },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={icon}
                size={24}
                color={active ? colors.accent : colors.blue}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
  },
  bar: {
    width: '100%',
    height: BAR_HEIGHT,
    borderRadius: 18,
    top: 10,
  },
  row: {
    position: 'absolute',
    top: 10,                // <-- keep icons aligned with the bar’s top
    left: 38,
    right: 38,
    flexDirection: 'row',
    alignItems: 'center',  // centers icons vertically within BAR_HEIGHT
    justifyContent: 'space-between',
  },
  hole: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
