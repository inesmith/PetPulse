// components/PetNavigatorImages.tsx
import React, { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { config } from '../gluestack-ui.config';

const { width } = Dimensions.get('window');
const colors = {
  offWhite: (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  blue: (config as any)?.theme?.colors?.blue ?? '#73C3D1',
};

const COLLAPSED = require('../assets/petnav-collapsed.png');
const EXPANDED  = require('../assets/petnav-expanded.png');

export default function PetNavigatorImages() {
  const [open, setOpen] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setOpen(v => !v)}
      style={styles.hitbox}
    >
      {/* Image container */}
      <View
        style={[
          styles.wrap,
          open ? { width: width * 0.92, height: 92 } : { width: 170, height: 190 },
        ]}
      >
        <Image
          source={open ? EXPANDED : COLLAPSED}
          style={styles.img}
          resizeMode="stretch" // assumes your PNG already has the exact shape
        />

        {/* Optional: overlay pet dots on top of expanded image (purely visual) */}
        {open && (
          <View style={styles.dotsRow}>
            <View style={[styles.dot, { backgroundColor: '#D8D8D8' }]} />
            <View style={[styles.dot, { backgroundColor: '#D8D8D8' }]} />
            <View style={[styles.dot, { backgroundColor: '#D8D8D8' }]} />
            <View style={[styles.dot, { backgroundColor: colors.offWhite }]} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hitbox: { position: 'absolute', top: 20, left: 0, zIndex: 30 },
  wrap: {
    overflow: 'hidden',
  },
  img: { width: '90%', height: '160%' },

  // adjust these to align the dots with your artwork's holes
  dotsRow: {
    position: 'absolute',
    top: 18,           // tweak after you add images
    left: 70,          // tweak after you add images
    right: 24,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dot: { width: 56, height: 56, borderRadius: 28, opacity: 0.95 },
});
