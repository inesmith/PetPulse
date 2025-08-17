// components/PetNavigator.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Platform, ViewStyle, } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../gluestack-ui.config';

// Optional: If using SVG backgrounds, make sure you've set up react-native-svg + transformer
// import { SvgXml } from 'react-native-svg';
// const petbarStandard = require('../assets/petbar-standard.svg');
// const petbarExtended = require('../assets/petbar-extended.svg');

const { width: SCREEN_W } = Dimensions.get('window');

const colors = {
  blue:   (config as any)?.theme?.colors?.blue  ?? '#73C3D1',
  white:  (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o     ?? '#EE734A',
  text:   (config as any)?.theme?.colors?.text  ?? '#1C1C1C',
};

type Pet = {
  id: string;
  name?: string;
  avatar: any; // ImageSourcePropType
};

type Props = {
  pets: Pet[];
  selectedPetId: string;
  onSelectPet: (id: string) => void;
  onAddPet: () => void;

  /** Keep this bar in the same place on every screen */
  topOffset?: number;     // distance below status bar
  leftOffset?: number;
  collapsedWidth?: number;
  expandedWidthPct?: number; // 0..1 (of screen width)
  style?: ViewStyle;      // extra style overrides if you really need them
  zIndex?: number;
};

const BAR_H = 82;            // height of the expanded bar
const COLLAPSED_H = 190;     // visual height of the collapsed “pod”
const AVATAR = 56;           // avatar diameter
const RADIUS = 41;           // big pill radius
const GAP = 14;

export default function PetNavigator({
  pets,
  selectedPetId,
  onSelectPet,
  onAddPet,
  topOffset = 6,
  leftOffset = 0,
  collapsedWidth = 150,
  expandedWidthPct = 0.9,
  style,
  zIndex = 20,
}: Props) {
  const insets = useSafeAreaInsets();

  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current; // 0 = collapsed, 1 = expanded

  const expandedWidth = useMemo(
    () => Math.min(SCREEN_W * expandedWidthPct, SCREEN_W - 24),
    [expandedWidthPct]
  );

  useEffect(() => {
    Animated.spring(anim, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: false,
      friction: 9,
      tension: 90,
    }).start();
  }, [expanded, anim]);

  const widthInterpolate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedWidth, expandedWidth],
  });

  const heightInterpolate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_H, BAR_H],
  });

  const extraOpacity = anim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0, 1],
  });

  const selected = useMemo(
    () => pets.find(p => p.id === selectedPetId) ?? pets[0],
    [pets, selectedPetId]
  );

  return (
    <View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          top: (insets.top || 0) + topOffset,
          left: leftOffset,
          right: 0,
          alignItems: 'flex-start',
          zIndex,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.baseWrap,
          styles.shadow,
          {
            width: widthInterpolate,
            height: heightInterpolate,
            backgroundColor: colors.white,
          },
        ]}
      >
        {/* Background SVGs if you want — otherwise we just use rounded View */}
        {/* {expanded ? (
          <SvgXml xml={petbarExtended} width="100%" height="100%" style={StyleSheet.absoluteFillObject} />
        ) : (
          <SvgXml xml={petbarStandard} width="100%" height="100%" style={StyleSheet.absoluteFillObject} />
        )} */}

        {/* Collapsed content */}
        {!expanded && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.collapsedTouch}
            onPress={() => setExpanded(true)}
            accessibilityRole="button"
            accessibilityLabel="Open pet switcher"
          >
            <Image source={selected?.avatar} style={styles.smallAvatar} />
          </TouchableOpacity>
        )}

        {/* Expanded content */}
        <Animated.View
          style={[
            styles.expandedRow,
            { opacity: extraOpacity, pointerEvents: expanded ? 'auto' : 'none' },
          ]}
        >
          {/* Close / collapse handle (tap empty left area) */}
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => setExpanded(false)}
          />

          <View style={styles.rowInner}>
            {/* Avatars */}
            <View style={styles.avatarsRow}>
              {pets.map(p => {
                const active = p.id === selectedPetId;
                return (
                  <TouchableOpacity
                    key={p.id}
                    activeOpacity={0.9}
                    onPress={() => {
                      onSelectPet(p.id);
                      setExpanded(false);
                    }}
                    style={[styles.avatarWrap, active && styles.avatarWrapActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Switch to ${p.name ?? 'pet'}`}
                  >
                    <Image source={p.avatar} style={styles.avatar} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Add pet */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setExpanded(false);
                onAddPet();
              }}
              style={[styles.addWrap, styles.avatarShadow]}
              accessibilityRole="button"
              accessibilityLabel="Add pet"
            >
              <Ionicons name="add" size={24} color={colors.blue} />
              <Text style={styles.addText}>Add Pet</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  baseWrap: {
    borderTopRightRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
    overflow: 'visible',
    justifyContent: 'center',
  },

  // Collapsed
  collapsedTouch: {
    width: collapsedWidthFallback(), // gets overridden by parent width, but keeps touch area sane
    height: COLLAPSED_H,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 100,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 28,
  },

  smallAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.9,
  },

  // Expanded
  expandedRow: {
    flex: 1,
    justifyContent: 'center',
  },
  rowInner: {
    height: BAR_H,
    borderRadius: RADIUS,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    flex: 1,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  avatarWrapActive: {
    borderColor: colors.accent,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },

  addWrap: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    position: 'absolute',
    bottom: -16,
    fontSize: 10,
    fontWeight: '800',
    color: '#6E6E6E',
  },

  // Shadows
  shadow: {
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  avatarShadow: {
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});

// little helper so TS is happy when used in style
function collapsedWidthFallback() {
  return 150;
}
