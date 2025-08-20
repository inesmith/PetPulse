// screens/ActivitiesScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView,
  Platform, Modal, Pressable, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';
import PetNav from '../components/PetNav';
import { usePets } from '../context/PetContext';
import { useAuth } from '../context/AuthContext';
import { addDoc, onSnapshot, orderBy, query, serverTimestamp, where, Timestamp } from 'firebase/firestore';
import { petCol } from '../src/utils/pets';

import MapView, { Polyline, Marker, PROVIDER_GOOGLE, LatLng } from 'react-native-maps';

const { width } = Dimensions.get('window');
const TODAY_H = 60;
const CARD_RADIUS = 16;

const colors = {
  blue:   (config as any)?.theme?.colors?.blue  ?? '#73C3D1',
  white:  (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o     ?? '#EE734A',
  text:   (config as any)?.theme?.colors?.text  ?? '#1C1C1C',
};

type ActivityKey =
  | 'morning_walk' | 'evening_walk' | 'park_play' | 'training'
  | 'swim' | 'hike' | 'grooming' | 'feeding' | 'meds';

const ACTIVITY_TYPES: Record<ActivityKey, { title: string; icon: keyof typeof Ionicons.glyphMap }> = {
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

type ActivityItem = {
  id: string;
  petId: string;
  type: ActivityKey;
  meta?: string;
  createdAt?: any;
  meters?: number;
  steps?: number;
  path?: LatLng[];
};

type ActivitySummary = {
  startedAt: number;
  endedAt: number;
  elapsedMs: number;
  meters: number;
  steps: number;
  path: LatLng[];
};

function fmtDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n:number)=> n<10?`0${n}`:`${n}`;
  return hh>0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}
function todayRange() {
  const start = new Date(); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate()+1);
  return { startTS: Timestamp.fromDate(start), endTS: Timestamp.fromDate(end) };
}
function computeRegionFromPaths(paths: LatLng[][]) {
  const pts = paths.flat();
  if (!pts.length) return undefined;
  let minLat = pts[0].latitude, maxLat = pts[0].latitude, minLng = pts[0].longitude, maxLng = pts[0].longitude;
  for (const p of pts) {
    minLat = Math.min(minLat, p.latitude); maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude); maxLng = Math.max(maxLng, p.longitude);
  }
  const latDelta = Math.max(0.005, (maxLat - minLat) * 1.2);
  const lonDelta = Math.max(0.005, (maxLng - minLng) * 1.2);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lonDelta,
  };
}

export default function ActivitiesScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { selectedPet } = usePets();
  const { user } = useAuth();

  const petId = selectedPet?.id ?? 'primary';
  const padBottom = 64 + Math.max(insets.bottom, 8) + 16;

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [todayActs, setTodayActs] = useState<ActivityItem[]>([]);
  const [mapRegion, setMapRegion] = useState<any>(undefined);

  // Recent activities (desc)
  useEffect(() => {
    if (!user?.uid) return;
    const col = petCol(user.uid, petId, 'activities');
    const qy = query(col, orderBy('createdAt', 'desc'));
    return onSnapshot(qy, (snap) => {
      const rows: ActivityItem[] = [];
      snap.forEach((d) => rows.push({ ...(d.data() as ActivityItem), id: d.id }));
      setActivities(rows);
    });
  }, [user?.uid, petId]);

  // Today's activities (for totals + map)
  useEffect(() => {
    if (!user?.uid) return;
    const { startTS, endTS } = todayRange();
    const col = petCol(user.uid, petId, 'activities');
    const qy = query(
      col,
      where('createdAt', '>=', startTS),
      where('createdAt', '<', endTS),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(qy, (snap) => {
      const rows: ActivityItem[] = [];
      snap.forEach((d) => rows.push({ ...(d.data() as ActivityItem), id: d.id }));
      setTodayActs(rows);
      // auto-fit region from today paths once
      const paths = rows.map(r => r.path || []).filter(a => a.length);
if (paths.length) {
  setMapRegion(computeRegionFromPaths(paths));
}
    });
  }, [user?.uid, petId]);

  useEffect(() => {
  if (mapRegion) return;
  let cancelled = false;
  (async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (cancelled) return;
      setMapRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch {}
  })();
  return () => { cancelled = true; };
}, [mapRegion]);

  const stepsToday = todayActs.reduce((s,a)=> s + (a.steps || 0), 0);
  const metersToday = todayActs.reduce((s,a)=> s + (a.meters || 0), 0);
  const distanceKm = (metersToday / 1000).toFixed(2);

  const pathsToday = todayActs.map(a => a.path || []).filter(p => p.length);

  const { dayTop, dayBottom } = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString(undefined, { weekday: 'short' });
    const day = now.getDate();
    const month = now.toLocaleDateString(undefined, { month: 'long' });
    return { dayTop: `${weekday},`.toUpperCase(), dayBottom: `${day} ${month}`.toUpperCase() };
  }, []);

  // Start tracking -> TrackMap -> save activity on finish (with numbers + path)
  const handlePickActivity = (type: ActivityKey) => {
    setPickerOpen(false);
    nav.navigate('TrackMap', {
      type,
      onFinish: async (a: ActivitySummary) => {
        try {
          if (!user?.uid) return;
          await addDoc(petCol(user.uid, petId, 'activities'), {
            petId,
            type,
            meta: `${(a.meters/1000).toFixed(2)} km • ${a.steps.toLocaleString()} steps • ${fmtDuration(a.elapsedMs)}`,
            meters: a.meters,
            steps: a.steps,
            elapsedMs: a.elapsedMs,
            path: a.path,
            createdAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn('Failed to save activity', e);
        }
      },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left','right']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: 0 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: padBottom }} contentInsetAdjustmentBehavior="never">
          <View style={{ paddingHorizontal: 22, marginTop: 200 }}>
            <PetNav />
          </View>

          <View style={styles.headerTextWrap}>
            <Text style={styles.welcome}>
              {(selectedPet?.name || 'YOUR PET').toUpperCase()}'S{'\n'}ACTIVITIES
            </Text>
          </View>

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

          <Text style={styles.sectionLabel}>ACTIVITIES DONE</Text>
          <View style={styles.tilesRow}>
            {activities.slice(0, 7).map((a) => {
              const cfg = ACTIVITY_TYPES[a.type];
              return (
                <View
                  key={a.id}
                  style={[
                    styles.tile, styles.cardShadow,
                    { backgroundColor: '#e9e8e6ff', alignItems: 'center', justifyContent: 'center', padding: 8 },
                  ]}
                >
                  <Ionicons name={cfg.icon} size={26} color={colors.accent} />
                  <Text style={styles.tileText} numberOfLines={2}>{cfg.title}</Text>
                </View>
              );
            })}

            <TouchableOpacity
              onPress={() => setPickerOpen(true)}
              activeOpacity={0.85}
              style={[
                styles.tile, styles.cardShadow,
                { backgroundColor: '#e9e8e6ff', alignItems: 'center', justifyContent: 'center' },
              ]}
            >
              <Ionicons name="add" size={28} color={colors.accent} />
              <Text style={styles.addText}>Add Activity</Text>
            </TouchableOpacity>
          </View>

          {/* Steps today (sums finished sessions only) */}
          <View style={[styles.statCard, { borderColor: colors.accent }]}>
            <Text style={styles.statLabel}>STEPS TODAY</Text>
            <Text style={[styles.statValue, { color: colors.blue }, styles.shadow]}>{stepsToday}</Text>
          </View>

          {/* Map: show today’s saved paths; draggable/zoomable; no navigation on tap */}
          <View style={[styles.mapCard, { borderColor: colors.accent }]}>
            <View style={{ width: '100%', height: 180, borderRadius: 16, overflow: 'hidden' }}>
              <MapView
  style={{ width: '100%', height: '100%' }}
  provider={PROVIDER_GOOGLE}
  initialRegion={mapRegion ?? { latitude: 0, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 }}
  region={mapRegion}
  showsUserLocation
  followsUserLocation={false}
  toolbarEnabled={false}
  pitchEnabled={false}
  rotateEnabled={false}
  scrollEnabled
  zoomEnabled
  onRegionChangeComplete={setMapRegion}
>
  {pathsToday.map((coords, idx) => (
    <Polyline key={idx} coordinates={coords} strokeWidth={5} strokeColor={colors.blue} />
  ))}
</MapView>

              <View style={styles.mapOverlay}>
                <View style={styles.mapPill}>
                  <Text style={[styles.mapPillText, { color: colors.accent }]}>
                    DISTANCE: {distanceKm} km
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 18 }]}>RECENT ACTIVITIES</Text>
          <View style={styles.list}>
            {activities.length === 0 ? (
              <Text style={{ color: '#6E6E6E', fontWeight: '700' }}>No activities yet</Text>
            ) : (
              activities.slice(0, 10).map((a) => {
                const cfg = ACTIVITY_TYPES[a.type];
                const jsDate = a.createdAt?.toDate?.() instanceof Date ? a.createdAt.toDate() : new Date();
                const whenText = jsDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

      {/* Picker modal */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={picker.overlay} onPress={() => setPickerOpen(false)} />
        <View style={[picker.card, styles.shadow]}>
          <Text style={picker.title}>Add Activity</Text>
          <View style={picker.grid}>
            {(Object.keys(ACTIVITY_TYPES) as ActivityKey[]).map((key) => {
              const cfg = ACTIVITY_TYPES[key];
              return (
                <TouchableOpacity key={key} style={picker.item} activeOpacity={0.85} onPress={() => handlePickActivity(key)}>
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

  headerTextWrap: { marginTop: -75, alignItems: 'flex-end', paddingHorizontal: 22 },
  welcome: { fontSize: 26, fontWeight: '900', textAlign: 'right', lineHeight: 28 },

  todayWrap: { marginTop: 55, paddingHorizontal: 22 },
  todayRow: { alignSelf: 'flex-end', flexDirection: 'row', gap: 6 },
  todayCard: {
    height: TODAY_H, borderRadius: 28, backgroundColor: '#e9e8e6ff',
    paddingHorizontal: 18, flexDirection:'row', alignItems:'center', justifyContent:'space-between', width: width * 0.58,
  },
  todayLeft: { fontWeight:'900', fontSize:18, letterSpacing:0.2 },
  todayRight: { alignItems:'flex-end' },
  todayRightTop: { color:'#777', fontSize:12, lineHeight:14 },
  todayRightBottom: { color:'#777', fontSize:12, lineHeight:14, fontWeight:'700' },

  sectionLabel: { marginTop: 45, color:'#6E6E6E', fontWeight:'800', paddingHorizontal:22, letterSpacing:0.2 },

  tilesRow: { flexDirection:'row', flexWrap:'wrap', gap:14, paddingHorizontal:22, marginTop:10 },
  tile: { width: (width - 22*2 - 14*3)/4, height: 90, borderRadius: CARD_RADIUS },
  tileText: { marginTop: 6, fontSize: 10, fontWeight: '800', color: '#6E6E6E', textAlign: 'center' },
  addText: { fontSize: 9, fontWeight: '700', color: '#6E6E6E', marginTop: 4, textAlign: 'center' },

  statCard: {
    marginTop: 20, marginHorizontal: 22, borderRadius: CARD_RADIUS, borderWidth: 1.5,
    backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 14, flexDirection:'row',
    alignItems:'center', justifyContent:'space-between',
  },
  statLabel: { color:'#6E6E6E', fontWeight:'800', letterSpacing:0.2 },
  statValue: { fontSize:40, fontWeight:'900', letterSpacing:1 },

  mapCard: { marginTop: 20, marginHorizontal: 22, borderRadius: 16, borderWidth: 1.5, overflow: 'hidden' },

  mapOverlay: { position: 'absolute', left: 12, right: 12, bottom: 12, alignItems: 'flex-start' },
  mapPill: {
    backgroundColor: '#fff',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    shadowColor: 'rgba(0,0,0,0.15)', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  mapPillText: { fontWeight: '900', fontSize: 13 },

  list: { marginTop: 8, paddingHorizontal: 22, gap: 6 },
  listItem: {
    borderRadius: CARD_RADIUS, backgroundColor: colors.white,
    paddingHorizontal: 14, paddingVertical: 12, flexDirection:'row', alignItems:'center', justifyContent:'space-between',
  },
  listTitle: { fontWeight: '800', fontSize: 14, color: colors.text },
  listMeta: { color: '#6E6E6E', marginTop: 2, fontSize: 12 },

  cardShadow: { shadowColor:'rgba(0,0,0,0.15)', shadowOpacity:1, shadowRadius:12, shadowOffset:{width:0,height:8}, elevation:6 },
  listShadow: {
    shadowColor: '#000', shadowOpacity: Platform.select({ ios: 0.12, android: 0.15 }),
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  shadow: { shadowColor:'rgba(0,0,0,0.15)', shadowOpacity:1, shadowRadius:12, shadowOffset:{width:0,height:8}, elevation:6 },
});

const picker = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  card: { position:'absolute', left:0, right:0, bottom:0, backgroundColor: colors.white, paddingTop:16, paddingBottom:18, borderTopLeftRadius:20, borderTopRightRadius:20 },
  title: { fontWeight:'900', fontSize:16, paddingHorizontal:16, marginBottom:10 },
  grid: { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:16, gap:10 },
  item: { width: (width - 16*2 - 10*3)/4, alignItems:'center', marginBottom:8 },
  iconWrap: { width:64, height:64, borderRadius:32, backgroundColor:'#e9e8e6ff', alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor: colors.accent },
  label: { marginTop:6, fontSize:11, fontWeight:'700', textAlign:'center' },
  cancel: { marginTop:8, alignSelf:'center', paddingHorizontal:18, paddingVertical:10, borderRadius:12, backgroundColor:'#F0F0F0' },
  cancelText: { fontWeight:'900', color:'#6E6E6E' },
});
