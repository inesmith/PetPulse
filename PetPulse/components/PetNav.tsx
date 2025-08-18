// components/PetNav.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePets } from '../context/PetContext';
import { config } from '../gluestack-ui.config';

const { width } = Dimensions.get('window');

const TEAL = '#73C3D1';
const BG   = (config as any)?.theme?.colors?.white ?? '#F8F7F4';
const colors = {
  blue:   (config as any)?.theme?.colors?.blue  ?? '#73C3D1',
  white:  BG,
  accent: (config as any)?.theme?.colors?.o     ?? '#EE734A',
  text:   (config as any)?.theme?.colors?.text  ?? '#1C1C1C',
};

const AVATAR_SIZE = 44;
const STRIP_H = 100; // blob container height

export default function PetNav() {
  const { pets, selectedPet, setSelectedPetId } = usePets();
  const [open, setOpen] = useState(false);
  const nav = useNavigation<any>();

  const activeThumb = useMemo(() => selectedPet?.photoURL ?? null, [selectedPet?.photoURL]);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {/* teal blob background in the corner */}
      <View style={styles.blob} pointerEvents="none" />

      {/* Collapsed trigger pill sitting on the blob */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.9}
        style={styles.barOnBlob}
      >
        {activeThumb ? (
          <Image source={{ uri: activeThumb }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="paw" size={20} color={colors.white} />
          </View>
        )}
        <Ionicons name="chevron-down" size={18} color={colors.text} />
      </TouchableOpacity>

      {/* Modal selector (same UX as your first version) */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Your Pets</Text>

          <FlatList
            data={[...pets, { id: '__add__', name: 'Add Pet' } as any]}
            keyExtractor={(item: any) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={({ item }: any) => {
              const isAdd = item.id === '__add__';
              if (isAdd) {
                return (
                  <TouchableOpacity
                    onPress={() => { setOpen(false); nav.navigate('AddPet'); }}
                    style={styles.item}
                    activeOpacity={0.9}
                  >
                    <View style={[styles.itemAvatar, styles.addTile]}>
                      <Ionicons name="add" size={26} color={colors.blue} />
                    </View>
                    <Text style={styles.itemLabel}>Add Pet</Text>
                  </TouchableOpacity>
                );
              }

              const active = selectedPet?.id === item.id;
              return (
                <TouchableOpacity
                  onPress={() => { setSelectedPetId(item.id); setOpen(false); }}
                  style={styles.item}
                  activeOpacity={0.9}
                >
                  {item.photoURL ? (
                    <Image
                      source={{ uri: item.photoURL }}
                      style={[styles.itemAvatar, active && styles.itemAvatarActive]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.itemAvatar,
                        styles.itemAvatarPlaceholder,
                        active && styles.itemAvatarActive,
                      ]}
                    >
                      <Ionicons name="paw" size={20} color={colors.white} />
                    </View>
                  )}
                  <Text style={styles.itemLabel} numberOfLines={1}>
                    {item.name || 'Pet'}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  wrap: {
    height: STRIP_H,          // gives room for the blob
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: -147,          // pull up to your header like your blob version
  },

  // big teal quarter-circle in the top-left
  blob: {
    position: 'absolute',
    left: -width * 0.22,
    top: -STRIP_H * 0.55,
    width: width * 0.6,
    height: width * 0.6,
    borderBottomRightRadius: width,
    backgroundColor: TEAL,
  },

  // Collapsed selector pill sitting on top of the blob
  barOnBlob: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e9e8e6ff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,

    // nudge it a bit into the blob corner
    marginLeft: 18,
    // optional drop shadow
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  avatarPlaceholder: { backgroundColor: '#EE734A', alignItems: 'center', justifyContent: 'center' },

  // Modal sheet
  backdrop: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetTitle: { fontWeight: '900', fontSize: 16, paddingHorizontal: 16, marginBottom: 12 },

  item: { width: 92, alignItems: 'center', marginRight: 10 },
  itemAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e9e8e6ff' },
  itemAvatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: TEAL },
  itemAvatarActive: { borderWidth: 2, borderColor: colors.accent },
  itemLabel: { marginTop: 6, fontSize: 12, fontWeight: '700', textAlign: 'center', maxWidth: 88 },
  addTile: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.accent, backgroundColor: 'transparent' },
});
