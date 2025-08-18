// components/PetNav.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePets } from '../context/PetContext';
import { config } from '../gluestack-ui.config';

const colors = {
  blue:   (config as any)?.theme?.colors?.blue  ?? '#73C3D1',
  white:  (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o     ?? '#EE734A',
  text:   (config as any)?.theme?.colors?.text  ?? '#1C1C1C',
};

const AVATAR_SIZE = 44;

export default function PetNav() {
  const { pets, selectedPet, setSelectedPetId, loadingPets } = usePets();
  const [open, setOpen] = useState(false);
  const nav = useNavigation<any>();

  const activeThumb = useMemo(() => selectedPet?.photoURL ?? null, [selectedPet?.photoURL]);

  return (
    <>
      {/* Collapsed pill */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.9}
        style={styles.bar}
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

      {/* Modal selector */}
      <Modal visible={open} transparent animationType="fade">
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
                    onPress={() => { setOpen(false); nav.navigate('PetSettings'); }}
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
                    <Image source={{ uri: item.photoURL }} style={[styles.itemAvatar, active && styles.itemAvatarActive]} />
                  ) : (
                    <View style={[styles.itemAvatar, styles.itemAvatarPlaceholder, active && styles.itemAvatarActive]}>
                      <Ionicons name="paw" size={20} color={colors.white} />
                    </View>
                  )}
                  <Text style={styles.itemLabel} numberOfLines={1}>{item.name || 'Pet'}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignSelf: 'center',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e9e8e6ff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE/2 },
  avatarPlaceholder: { backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },

  backdrop: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.white, paddingTop: 16, paddingBottom: 28, borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  sheetTitle: { fontWeight: '900', fontSize: 16, paddingHorizontal: 16, marginBottom: 12 },

  item: { width: 92, alignItems: 'center', marginRight: 10 },
  itemAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e9e8e6ff' },
  itemAvatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  itemAvatarActive: { borderWidth: 2, borderColor: colors.accent },
  itemLabel: { marginTop: 6, fontSize: 12, fontWeight: '700', textAlign: 'center', maxWidth: 88 },
  addTile: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.accent, backgroundColor: 'transparent' },
});
