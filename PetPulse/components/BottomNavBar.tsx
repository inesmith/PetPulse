import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { config } from '../gluestack-ui.config';

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

export default function BottomNavBar() {
  const nav = useNavigation<any>();
  const route = useRoute();
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { bottom: Math.max(bottom, 8) }]}
      pointerEvents="box-none"
    >
      {/* Blue rounded bar */}
      <View style={[styles.bar, { backgroundColor: colors.blue }]} />

      {/* Icons */}
      <View style={styles.row}>
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

const BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: BAR_HEIGHT,
    backgroundColor: 'transparent', // keep transparent
    // ❌ remove marginBottom hack
  },
  bar: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  row: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
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
