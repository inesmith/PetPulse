// screens/ActivitiesScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';
import PetNav from '../components/PetNav';
import { usePets } from '../context/PetContext';
import { useAuth } from '../context/AuthContext';
import { addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { petCol } from '../src/utils/pets';

const { width } = Dimensions.get('window');
const TODAY_H = 60;

const colors = {
  blue:   (config as any)?.theme?.colors?.blue  ?? '#73C3D1',
  white:  (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o     ?? '#EE734A',
  text:   (config as any)?.theme?.colors?.text  ?? '#1C1C1C',
};

const NAV_H = 64;
const NAV_MARGIN = 8;
const CARD_RADIUS = 16;

/** ---- Activity catalog (safe Ionicons names) ---- */
type ActivityKey =
  | 'morning_walk'
  | 'evening_walk'
  | 'park_play'
  | 'training'
  | 'swim'
  | 'hike'
  | 'grooming'
  | 'feeding'
  | 'meds';

const ACTIVITY_TYPES: Record<
  ActivityKey,
  { title: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  morning_walk: { title: 'Morning Walk', icon: 'footsteps' },
  evening_walk: { title: 'Evening Walk', icon: 'footsteps' },
  park_play:    { title: 'Park Play',    icon: 'tennisball' },
  training:     { title: 'Training',     icon: 'school' },
  swim:         { title: 'Swim',         icon: 'water' },
  hike:         { title: 'Hike',         icon: 'walk' },
  grooming:     { title: 'Grooming',     icon: 'cut' },
  feeding:      { title: 'Feeding',      icon: 'restaurant' },
  meds:         { title: 'Medication',   icon: 'medkit' },
};

type ActivityDoc = {
  petId: string;
  type: ActivityKey;
  meta?: string;
  createdAt?: any; // Firestore Timestamp | null
};

type ActivityItem = ActivityDoc & { id: string };

export default function ActivitiesScreen() {
  const insets = useSafeAreaInsets();
  const { selectedPet } = usePets();
  const { user } = useAuth();

  const padBottom = NAV_H + Math.max(insets.bottom, NAV_MARGIN) + 16;
  const petId = selectedPet?.id ?? 'primary';

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Live Firestore subscription to this pet's activities (most recent first)
  useEffect(() => {
    if (!user?.uid) return;
    const col = petCol(user.uid, petId, 'activities');
    const qy = query(col, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(qy, (snap) => {
      const rows: ActivityItem[] = [];
      snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as ActivityDoc) }));
      setActivities(rows);
    });
    return unsub;
  }, [user?.uid, petId]);

  // TODAY pill date text
  const { dayTop, dayBottom } = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString(undefined, { weekday: 'short' });
    const day = now.getDate();
    const month = now.toLocaleDateString(undefined, { month: 'long' });
    return {
      dayTop: `${weekday},`.toUpperCase(),
      dayBottom: `${day} ${month}`.toUpperCase(),
    };
  }, []);

  const handlePickActivity = async (type: ActivityKey) => {
    if (!user?.uid) return;
    const metaSamples = [
      '2.1 km • 3,248 steps • 24 min',
      '1.3 km • 1,845 steps • 18 min',
      '3.0 km • 4,102 steps • 32 min',
      '0.8 km • 1,102 steps • 12 min',
    ];
    const meta = metaSamples[Math.floor(Math.random() * metaSamples.length)];
    const col = petCol(user.uid, petId, 'activities');
    await addDoc(col, { petId, type, meta, createdAt: serverTimestamp() } as ActivityDoc);
    setPickerOpen(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left','right']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View
        style={{
          flex: 1,
          backgroundColor: colors.white,
          paddingTop: 0, // ✅ remove top white on all platforms
        }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: padBottom }}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Pet Nav */}
          <View style={{ paddingHorizontal: 22, marginTop: 200 }}>
            <PetNav />
          </View>

          {/* Top welcome */}
          <View style={styles.headerTextWrap}>
            <Text style={styles.welcome}>
              {(selectedPet?.name || 'YOUR PET').toUpperCase()}'S{'\n'}ACTIVITIES
            </Text>
          </View>

          {/* TODAY pill */}
          <View style={styles.todayWrap}>
            <View style={styles.todayRow}>
              <View style={[styles.todayCard, styles.shadow]}>
                <Text style={[styles.todayLeft, { color: colors.accent }]}>TODAY</Text>
                <View style={styles.todayRight}>
                  <Text style={styles.todayRightTop}>{dayTop}</Text>
                  <Text style={styles.todayRightBottom}>{dayBottom}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Activities Done grid (with Add) */}
          <Text style={styles.sectionLabel}>ACTIVITIES DONE</Text>
          <View style={styles.tilesRow}>
            {activities.slice(0, 7).map((a) => {
              const cfg = ACTIVITY_TYPES[a.type];
              return (
                <View
                  key={a.id}
                  style={[
                    styles.tile,
                    styles.cardShadow,
                    { backgroundColor: '#e9e8e6ff', alignItems: 'center', justifyContent: 'center', padding: 8 },
                  ]}
                >
                  <Ionicons name={cfg.icon} size={26} color={colors.accent} />
                  <Text style={styles.tileText} numberOfLines={2}>{cfg.title}</Text>
                </View>
              );
            })}

            {/* Add Activity tile */}
            <TouchableOpacity
              onPress={() => setPickerOpen(true)}
              activeOpacity={0.85}
              style={[
                styles.tile,
                styles.cardShadow,
                { backgroundColor: '#e9e8e6ff', alignItems: 'center', justifyContent: 'center' },
              ]}
            >
              <Ionicons name="add" size={28} color={colors.accent} />
              <Text style={styles.addText}>Add Activity</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={[styles.statCard, { borderColor: colors.accent }]}>
            <Text style={styles.statLabel}>STEPS</Text>
            <Text style={[styles.statValue, { color: colors.blue }, styles.shadow]}>70392</Text>
          </View>
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
            {activities.length === 0 ? (
              <Text style={{ color: '#6E6E6E', fontWeight: '700' }}>No activities yet</Text>
            ) : (
              activities.slice(0, 10).map((a) => {
                const cfg = ACTIVITY_TYPES[a.type];
                const jsDate =
                  a.createdAt?.toDate?.() instanceof Date
                    ? a.createdAt.toDate()
                    : new Date();
                const whenText = jsDate.toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <View key={a.id} style={[styles.listItem, styles.listShadow]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name={cfg.icon} size={22} color={colors.accent} />
                      <View>
                        <Text style={styles.listTitle}>{cfg.title}</Text>
                        <Text style={styles.listMeta}>
                          {a.meta ? `${a.meta} • ` : ''}{whenText}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#8A8A8A" />
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        <BottomNavBar />
      </View>

      {/* ---- Activity picker modal ---- */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={picker.overlay} onPress={() => setPickerOpen(false)} />
        <View style={[picker.card, styles.shadow]}>
          <Text style={picker.title}>Add Activity</Text>
          <View style={picker.grid}>
            {(Object.keys(ACTIVITY_TYPES) as ActivityKey[]).map((key) => {
              const cfg = ACTIVITY_TYPES[key];
              return (
                <TouchableOpacity
                  key={key}
                  style={picker.item}
                  activeOpacity={0.85}
                  onPress={() => handlePickActivity(key)}
                >
                  <View style={picker.iconWrap}>
                    <Ionicons name={cfg.icon} size={24} color={colors.blue} />
                  </View>
                  <Text style={picker.label} numberOfLines={1}>{cfg.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Pressable style={picker.cancel} onPress={() => setPickerOpen(false)}>
            <Text style={picker.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  headerTextWrap: {
    marginTop: -75,
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
  todayRow: { alignSelf: 'flex-end', flexDirection: 'row', gap: 6 },
  todayCard: {
    height: TODAY_H,
    borderRadius: 28,
    backgroundColor: '#e9e8e6ff',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: width * 0.58,
  },
  todayLeft: { fontWeight: '900', fontSize: 18, letterSpacing: 0.2 },
  todayRight: { alignItems: 'flex-end' },
  todayRightTop: { color: '#777', fontSize: 12, lineHeight: 14 },
  todayRightBottom: { color: '#777', fontSize: 12, lineHeight: 14, fontWeight: '700' },

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
    width: (width - 22 * 2 - 14 * 3) / 4,
    height: 90,
    borderRadius: CARD_RADIUS,
  },
  tileText: { marginTop: 6, fontSize: 10, fontWeight: '800', color: '#6E6E6E', textAlign: 'center' },
  addText: { fontSize: 9, fontWeight: '700', color: '#6E6E6E', marginTop: 4, textAlign: 'center' },

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
  statValue: { fontSize: 40, fontWeight: '900', letterSpacing: 1 },

  mapCard: {
    marginTop: 20,
    marginHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  mapImg: { width: '100%', height: 180, justifyContent: 'flex-end', padding: 12 },
  distanceLabel: { fontWeight: '900', fontSize: 13, color: colors.accent },

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

/* --- picker modal styles --- */
const picker = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  card: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: colors.white,
    paddingTop: 16,
    paddingBottom: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: { fontWeight: '900', fontSize: 16, paddingHorizontal: 16, marginBottom: 10 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  item: {
    width: (width - 16*2 - 10*3) / 4,
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#e9e8e6ff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.accent,
  },
  label: { marginTop: 6, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  cancel: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  cancelText: { fontWeight: '900', color: '#6E6E6E' },
});
