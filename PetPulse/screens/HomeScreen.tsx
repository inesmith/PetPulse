// screens/HomeScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, Platform,
  StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE, LatLng } from 'react-native-maps';
import * as Location from 'expo-location';
import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';
import PetNav from '../components/PetNav';
import { useAuth } from '../context/AuthContext';
import { usePets } from '../context/PetContext';
import { db } from '../firebase';
import {
  doc, getDoc, onSnapshot, setDoc, serverTimestamp, collection,
  query, orderBy, limit as qLimit, Timestamp, where,
} from 'firebase/firestore';
import { petCol } from '../src/utils/pets';

const { width } = Dimensions.get('window');

const colors = {
  blue:  (config as any)?.theme?.colors?.blue  ?? '#73C3D1',
  White: (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent:(config as any)?.theme?.colors?.o     ?? '#EE734A',
  text:  (config as any)?.theme?.colors?.text  ?? '#1C1C1C',
  grey:  '#DADADA',
};

const TODAY_H = 60;
const BOTTOM_BAR_H = 88;

type ReminderItem = {
  id: string;
  petId: string;
  petName: string;
  petPhotoURL?: string | null;
  title: string;
  when?: Timestamp | null;
};

type ActivityItem = {
  id: string;
  meters?: number;
  steps?: number;
  path?: LatLng[];
  createdAt?: any;
};

function formatWhenShort(ts?: Timestamp | null) {
  if (!ts) return '—';
  const d = ts.toDate();
  const optsTop: Intl.DateTimeFormatOptions = { weekday: 'short' };
  const optsBottom: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  return `${d.toLocaleDateString(undefined, optsTop).toUpperCase()}, ${d
    .toLocaleDateString(undefined, optsBottom).toUpperCase()}`;
}
async function ensureUserDoc(uid: string, email?: string | null, displayName?: string | null) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const fallbackName =
      (displayName && displayName.trim()) || (email ? email.split('@')[0] : 'User');
    await setDoc(ref, { email: email ?? '', displayName: fallbackName, username: fallbackName, createdAt: serverTimestamp() }, { merge: true });
  } else {
    const data = (snap.data() as { displayName?: string; username?: string; email?: string }) || {};
    const currentName = (data.displayName ?? data.username ?? '').trim();
    if (!currentName) {
      const fallbackName =
        (displayName && displayName.trim()) || (email ? email.split('@')[0] : 'User');
      await setDoc(ref, { displayName: fallbackName, username: fallbackName }, { merge: true });
    }
  }
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

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { selectedPet } = usePets();
  const petId = selectedPet?.id ?? 'primary';

  const insets = useSafeAreaInsets();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loadingName, setLoadingName] = useState<boolean>(true);
  const [remindersRaw, setRemindersRaw] = useState<ReminderItem[]>([]);
  const childUnsubsRef = useRef<(() => void)[]>([]);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // today's finished activities for this pet (for steps, distance, path)
  const [todayActs, setTodayActs] = useState<ActivityItem[]>([]);
  const [mapRegion, setMapRegion] = useState<any>(undefined);
  const pathsToday = todayActs.map(a => a.path || []).filter(p => p.length);
  const stepsToday = todayActs.reduce((s,a)=> s + (a.steps || 0), 0);
  const metersToday = todayActs.reduce((s,a)=> s + (a.meters || 0), 0);
  const distanceKm = (metersToday / 1000).toFixed(2);

  // keep UI ticking for reminders
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // profile display name
  useEffect(() => {
    let unsubUser: undefined | (() => void);
    (async () => {
      if (!user?.uid) { setProfileName(null); setLoadingName(false); return; }
      try { await ensureUserDoc(user.uid, user.email ?? null, user.displayName ?? null); } catch {}
      const ref = doc(db, 'users', user.uid);
      unsubUser = onSnapshot(
        ref,
        (snap) => {
          if (!snap.exists()) { setProfileName(null); setLoadingName(false); return; }
          const data = snap.data() as { displayName?: string; username?: string } | undefined;
          const fromDb = (data?.displayName ?? data?.username ?? '').trim();
          setProfileName(fromDb || null); setLoadingName(false);
        },
        () => setLoadingName(false)
      );
    })();
    return () => { if (unsubUser) unsubUser(); };
  }, [user?.uid]);

  // all pets’ reminders
  useEffect(() => {
    childUnsubsRef.current.forEach((u) => u());
    childUnsubsRef.current = [];
    setRemindersRaw([]);
    if (!user?.uid) return;

    const petsCol = collection(db, 'users', user.uid, 'pets');
    const unsubPets = onSnapshot(
      petsCol,
      (petsSnap) => {
        childUnsubsRef.current.forEach((u) => u());
        childUnsubsRef.current = [];
        setRemindersRaw([]);

        const nextUnsubs: (() => void)[] = [];
        petsSnap.forEach((petDoc) => {
          const petId = petDoc.id;
          const petData = (petDoc.data() || {}) as { name?: string; photoURL?: string | null };
          const petName = (petData.name || petId).toString();
          const petPhotoURL = petData.photoURL ?? null;

          const remCol = collection(db, 'users', user.uid, 'pets', petId, 'reminders');
          const qy = query(remCol, orderBy('when', 'asc'), qLimit(6));
          const unsubRem = onSnapshot(
            qy,
            (remSnap) => {
              setRemindersRaw((prev) => {
                const filtered = prev.filter((r) => r.petId !== petId);
                const rows: ReminderItem[] = remSnap.docs.map((d) => {
                  const data = d.data() as any;
                  return { id: d.id, petId, petName, petPhotoURL, title: data.title ?? '', when: data.when ?? null };
                });
                const merged = [...filtered, ...rows].sort((a, b) => {
                  const ta = a.when ? a.when.toMillis() : Number.MAX_SAFE_INTEGER;
                  const tb = b.when ? b.when.toMillis() : Number.MAX_SAFE_INTEGER;
                  return ta - tb;
                });
                return merged;
              });
            },
            () => setRemindersRaw((prev) => prev.filter((r) => r.petId !== petId))
          );
          nextUnsubs.push(unsubRem);
        });
        childUnsubsRef.current = nextUnsubs;
      },
      () => {
        childUnsubsRef.current.forEach((u) => u());
        childUnsubsRef.current = [];
      }
    );
    return () => {
      if (unsubPets) unsubPets();
      childUnsubsRef.current.forEach((u) => u());
      childUnsubsRef.current = [];
    };
  }, [user?.uid]);

  // subscribe to today's finished activities for this pet
  useEffect(() => {
    if (!user?.uid) return;
    const { startTS, endTS } = todayRange();
    const colRef = petCol(user.uid, petId, 'activities');
    const qy = query(
      colRef,
      where('createdAt', '>=', startTS),
      where('createdAt', '<', endTS),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(qy, (snap) => {
      const rows: ActivityItem[] = [];
      snap.forEach((d) => rows.push({ ...(d.data() as ActivityItem), id: d.id }));
      setTodayActs(rows);
      // Fit the region from today’s paths once
      const paths = rows.map(r => r.path || []).filter(a => a.length);
if (paths.length) {
  // Fit to today's paths (overrides any prior region so you see the route)
  setMapRegion(computeRegionFromPaths(paths));
}
    });
  }, [user?.uid, petId]);

  useEffect(() => {
  if (mapRegion) return; // already set (e.g., from today paths)
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

  const greetingName = useMemo(() => {
    const fromDb = (profileName ?? '').trim();
    const fromAuth = (user?.displayName ?? '').trim();
    const fallback = user?.email ? user.email.split('@')[0] : 'USER';
    return (fromDb || fromAuth || fallback).toUpperCase();
  }, [profileName, user?.displayName, user?.email]);

  const { dayTop, dayBottom } = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString(undefined, { weekday: 'short' });
    const day = now.getDate();
    const month = now.toLocaleDateString(undefined, { month: 'long' });
    return { dayTop: `${weekday},`.toUpperCase(), dayBottom: `${day} ${month}`.toUpperCase() };
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.White }]} edges={['left', 'right']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View style={{ flex: 1, backgroundColor: colors.White, paddingTop: 0, paddingBottom: insets.bottom + BOTTOM_BAR_H + 12 }}>
        <ScrollView contentInsetAdjustmentBehavior="never">
          <View style={styles.headerTextWrap}>
            <Text style={styles.welcome}>WELCOME BACK,{'\n'}{loadingName ? '…' : greetingName}</Text>
          </View>

          <View style={{ paddingHorizontal: 22, marginTop: 16 }}>
            <PetNav />
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

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => nav.navigate('UserSettings')}
                style={[styles.settingsSquare, styles.shadow]}
              >
                <Ionicons name="settings" size={24} color={colors.blue} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionLabel}>REMINDERS</Text>
          <View style={styles.remindersRow}>
           
            {remindersRaw.length === 0 ? (
              <View style={[styles.reminderEmptyWrap, styles.shadow]}>
                <Text style={styles.noRemindersText}>No upcoming reminders</Text>
              </View>
            ) : (
              remindersRaw.slice(0, 8).map((r) => (
                <View
                  key={`${r.petId}-${r.id}`}
                  style={[
                    styles.reminderBox, styles.shadow,
                    { backgroundColor: '#e9e8e6ff', padding: 8 },
                  ]}
                >
                  {r.petPhotoURL ? (
                    <Image source={{ uri: r.petPhotoURL }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarFallbackText}>
                        {(r.petName || '?').split(' ').map((w) => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={{ fontWeight: '900', color: colors.blue, fontSize: 11, marginTop: 6 }} numberOfLines={2}>{r.title}</Text>
                  <Text style={{ marginTop: 4, fontSize: 10, color: '#6E6E6E' }}>
                    {formatWhenShort(r.when)}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Steps today (only finished sessions) */}
          <View style={[styles.stepsCard, { borderColor: colors.accent }]}>
            <Text style={styles.stepsLabel}>STEPS TODAY</Text>
            <Text style={[styles.stepsValue, { color: colors.blue }, styles.shadow]}>{stepsToday}</Text>
          </View>

          {/* Map: show today’s saved paths; draggable/zoomable; no navigation on tap */}
          <View style={[styles.mapCard, { borderColor: colors.accent }]}>
            <View style={{ width: '100%', height: 250, borderRadius: 16, overflow: 'hidden' }}>
              <MapView
  style={{ width: '100%', height: '100%' }}
  provider={PROVIDER_GOOGLE}
  initialRegion={mapRegion ?? { latitude: 0, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 }} // harmless placeholder; replaced as soon as mapRegion is set
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
        </ScrollView>

        <BottomNavBar />
      </View>
    </SafeAreaView>
  );
}

const AVATAR = 30;

const styles = StyleSheet.create({
  safe: { flex: 1 },

  headerTextWrap: { marginTop: 125, alignItems: 'flex-end', paddingHorizontal: 22 },
  welcome: { fontSize: 26, fontWeight: '900', textAlign: 'right', lineHeight: 28 },

  todayWrap: { marginTop: 24, paddingHorizontal: 22 },
  todayRow: { alignSelf: 'flex-end', flexDirection: 'row', gap: 6 },
  todayCard: {
    height: TODAY_H, borderRadius: 28, backgroundColor: '#e9e8e6ff',
    paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: width * 0.58,
  },
  settingsSquare: {
    width: TODAY_H, height: TODAY_H, borderRadius: 28, backgroundColor: '#e9e8e6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  shadow: {
    shadowColor: 'rgba(0,0,0,0.15)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  todayLeft: { fontWeight: '900', fontSize: 18, letterSpacing: 0.2 },
  todayRight: { alignItems: 'flex-end' },
  todayRightTop: { color: '#777', fontSize: 12, lineHeight: 14 },
  todayRightBottom: { color: '#777', fontSize: 12, lineHeight: 14, fontWeight: '700' },

  sectionLabel: { marginTop: 50, color: '#6E6E6E', fontWeight: '800', paddingHorizontal: 22, letterSpacing: 0.2 },

  remindersRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 22, marginTop: 10, flexWrap: 'wrap' },
  reminderBox: { width: 100, height: 100, borderRadius: 16 },
  reminderEmptyWrap: {
    flexBasis: (width - 22 * 2 - 14 * 3) / 4, height: 90, borderRadius: 16,
    backgroundColor: '#e9e8e6ff', alignItems: 'center', justifyContent: 'center',
  },
  noRemindersText: { color: '#EE734A', fontSize: 11, fontWeight: '600', textAlign: 'center' },

  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: '#ddd' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0e0e0' },
  avatarFallbackText: { fontSize: 10, fontWeight: '900', color: '#555' },

  stepsCard: {
    marginTop: 20, marginHorizontal: 22, borderRadius: 16, borderWidth: 1.5,
    backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  stepsLabel: { color: '#6E6E6E', fontWeight: '800', letterSpacing: 0.2 },
  stepsValue: { fontSize: 40, fontWeight: '900', letterSpacing: 1 },

  mapCard: { marginTop: 20, marginHorizontal: 22, borderRadius: 16, borderWidth: 1.5, overflow: 'hidden' },

  mapOverlay: { position: 'absolute', left: 12, right: 12, bottom: 12, alignItems: 'flex-start' },
  mapPill: {
    backgroundColor: '#fff',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    shadowColor: 'rgba(0,0,0,0.15)', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  mapPillText: { fontWeight: '900', fontSize: 13 },
});
