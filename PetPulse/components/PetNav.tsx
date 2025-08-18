import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePets } from '../context/PetContext';

const { width } = Dimensions.get('window');

const TEAL = '#73C3D1';
const BG   = '#F8F7F4';
const GREY = '#E6E6E6';
const TXT  = '#1C1C1C';

const AVATAR = 48;             // circle size (collapsed top circle)
const STRIP_AVATAR = 54;       // circle size inside expanded strip
const STRIP_H = 100;            // expanded strip height

export default function PetNav() {
  const nav = useNavigation<any>();
  const { pets, selectedPetId, setSelectedPetId } = usePets();
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => pets.find(p => p.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId]
  );

  // simple open/close animation
  const anim = useRef(new Animated.Value(0)).current;
  const toggle = () => {
    setOpen((o) => {
      Animated.timing(anim, {
        toValue: o ? 0 : 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return !o;
    });
  };

  // widths for the expanding “pill” strip
  const stripW = Math.min(width - 22 * 2, 340);
  const interpW = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [AVATAR + 28, stripW],
  });
  const interpR = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 24],
  });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {/* teal “blob” + the primary circle (collapsed state) */}
      <View style={styles.blob} pointerEvents="none" />

      {/* Expandable container */}
      <Animated.View
        style={[
          styles.expander,
          {
            width: interpW,
            borderTopRightRadius: interpR as any,
            borderBottomRightRadius: interpR as any,
          },
        ]}
      >
        {/* Left-most circle (always visible) */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={toggle}
          style={styles.topCircle}
        >
          <Avatar photoURL={selected?.photoURL} name={selected?.name} size={AVATAR} />
        </TouchableOpacity>

        {/* Expanded strip with all pets + add */}
        {open && (
          <View style={styles.stripRow}>
            {pets.map((p) => {
              const active = p.id === selected?.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.itemCircle, active && styles.itemActive]}
                  activeOpacity={0.9}
                  onPress={() => {
                    setSelectedPetId(p.id);
                    toggle();
                  }}
                >
                  <Avatar
                    photoURL={p.photoURL}
                    name={p.name}
                    size={STRIP_AVATAR}
                  />
                </TouchableOpacity>
              );
            })}

            {/* Add pet circle */}
            <TouchableOpacity
              style={[styles.itemCircle, styles.addCircle]}
              activeOpacity={0.9}
              onPress={() => {
                toggle();
                nav.navigate('PetSettings'); // re-use settings screen to create/fill data
              }}
            >
              <Text style={styles.plus}>＋</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

/* ---------------- tiny avatar ---------------- */
function Avatar({
  photoURL,
  name,
  size,
}: {
  photoURL?: string | null;
  name?: string | null;
  size: number;
}) {
  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: GREY,
        }}
      />
    );
  }
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#D7EFF2',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: TXT, fontWeight: '900' }}>{initials}</Text>
    </View>
  );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  wrap: {
    height: STRIP_H,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: -147,
  },

  // big teal quarter-circle in the corner
  blob: {
    position: 'absolute',
    left: -width * 0.22,
    top: -STRIP_H * 0.55,
    width: width * 0.6,
    height: width * 0.6,
    borderBottomRightRadius: width,
    backgroundColor: TEAL,
  },

  // the container that grows from a small circle to a rounded strip
  expander: {
    height: STRIP_H,
    backgroundColor: TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 12,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    overflow: 'hidden',
  },

  topCircle: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 14,
    gap: 10,
    flexShrink: 1,
  },

  itemCircle: {
    width: STRIP_AVATAR,
    height: STRIP_AVATAR,
    borderRadius: STRIP_AVATAR / 2,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: {
    borderWidth: 2,
    borderColor: '#EE734A',
  },

  addCircle: {
    backgroundColor: BG,
  },
  plus: {
    color: TEAL,
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '900',
    marginTop: -1,
  },
});
