import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE, Region, LatLng } from 'react-native-maps';
import * as Location from 'expo-location';

import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';
import PetNav from '../components/PetNav';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit as qLimit,
  Timestamp,
} from 'firebase/firestore';

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

/** ---- distance/steps helpers ---- */
const toRad = (v: number) => (v * Math.PI) / 180;
function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000; // meters
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// Rough step estimate from distance walked (meters / stride meters)
// Tweak to your preference (0.78m is a common adult stride length)
const STRIDE_M = 0.78;

type ReminderItem = {
  id: string;
  petId: string;
  petName: string;
  petPhotoURL?: string | null;
  title: string;
  when?: Timestamp | null;
};

function formatWhenShort(ts?: Timestamp | null) {
  if (!ts) return '—';
  const d = ts.toDate();
  const optsTop: Intl.DateTimeFormatOptions = { weekday: 'short' };
  const optsBottom: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  return `${d.toLocaleDateString(undefined, optsTop).toUpperCase()}, ${d
    .toLocaleDateString(undefined, optsBottom)
    .toUpperCase()}`;
}

// --- helper: create users/{uid} if missing ---
async function ensureUserDoc(uid: string, email?: string | null, displayName?: string | null) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const fallbackName =
      (displayName && displayName.trim()) ||
      (email ? email.split('@')[0] : 'User');
    await setDoc(
      ref,
      {
        email: email ?? '',
        displayName: fallbackName,
        username: fallbackName,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    const data =
      (snap.data() as { displayName?: string; username?: string; email?: string }) ||
      {};
    const currentName = (data.displayName ?? data.username ?? '').trim();
    if (!currentName) {
      const fallbackName =
        (displayName && displayName.trim()) ||
        (email ? email.split('@')[0] : 'User');
      await setDoc(
        ref,
        { displayName: fallbackName, username: fallbackName },
        { merge: true }
      );
    }
  }
}

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  const [profileName, setProfileName] = useState<string | null>(null);
  const [loadingName, setLoadingName] = useState<boolean>(true);

  const [remindersRaw, setRemindersRaw] = useState<ReminderItem[]>([]);
  const childUnsubsRef = useRef<(() => void)[]>([]);
  const [nowTick, setNowTick] = useState<number>(Date.now()); // re-render clock

  // ---- live location / path / distance ----
  const mapRef = useRef<MapView | null>(null);
  const [path, setPath] = useState<LatLng[]>([]);
  const [current, setCurrent] = useState<LatLng | null>(null);
  const [distanceM, setDistanceM] = useState(0);
  const [region, setRegion] = useState<Region | undefined>(undefined);
  const [locReady, setLocReady] = useState(false);

  // Keep UI “live” so past reminders drop off without db changes
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let unsubUser: undefined | (() => void);

    (async () => {
      if (!user?.uid) {
        setProfileName(null);
        setLoadingName(false);
        return;
      }

      try {
        await ensureUserDoc(user.uid, user.email ?? null, user.displayName ?? null);
      } catch {}

      const ref = doc(db, 'users', user.uid);
      unsubUser = onSnapshot(
        ref,
        (snap) => {
          if (!snap.exists()) {
            setProfileName(null);
            setLoadingName(false);
            return;
          }
          const data = snap.data() as { displayName?: string; username?: string } | undefined;
          const fromDb = (data?.displayName ?? data?.username ?? '').trim();
          setProfileName(fromDb || null);
          setLoadingName(false);
        },
        () => setLoadingName(false)
      );
    })();

    return () => {
      if (unsubUser) unsubUser();
    };
  }, [user?.uid]);

  // --- Listen to ALL pets & their reminders ---
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

        const nextChildUnsubs: (() => void)[] = [];

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
                  return {
                    id: d.id,
                    petId,
                    petName,
                    petPhotoURL,
                    title: data.title ?? '',
                    when: data.when ?? null,
                  };
                });

                const merged = [...filtered, ...rows].sort((a, b) => {
                  const ta = a.when ? a.when.toMillis() : Number.MAX_SAFE_INTEGER;
                  const tb = b.when ? b.when.toMillis() : Number.MAX_SAFE_INTEGER;
                  return ta - tb;
                });

                return merged;
              });
            },
            () => {
              setRemindersRaw((prev) => prev.filter((r) => r.petId !== petId));
            }
          );

          nextChildUnsubs.push(unsubRem);
        });

        childUnsubsRef.current = nextChildUnsubs;
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

  // ---- Foreground location tracking, draw path & accumulate distance ----
  useEffect(() => {
    let watchSub: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location denied', 'Enable Location to track your walk on the map.');
          return;
        }

        const last = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const start = { latitude: last.coords.latitude, longitude: last.coords.longitude };
        setCurrent(start);
        setPath([start]);
        setRegion({
          latitude: start.latitude,
          longitude: start.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setLocReady(true);

        watchSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 2000,     // ~2s
            distanceInterval: 3,    // ~3 meters min
          },
          (loc) => {
            const p: LatLng = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setCurrent(p);
            setPath((prev) => {
              if (prev.length === 0) return [p];
              const last = prev[prev.length - 1];
              const d = haversine(last, p);
              // filter tiny jitter (< 2m)
              if (d < 2) return prev;

              setDistanceM((m) => m + d);
              return [...prev, p];
            });
          }
        );
      } catch (e) {
        console.warn('Location error:', e);
      }
    })();

    return () => {
      try { watchSub?.remove(); } catch {}
    };
  }, []);

  const visibleReminders = useMemo(() => {
    const nowMs = nowTick;
    const future = remindersRaw.filter((r) => {
      if (!r.when) return true; // keep undated reminders
      return r.when.toMillis() >= nowMs;
    });
    return future
      .sort((a, b) => {
        const ta = a.when ? a.when.toMillis() : Number.MAX_SAFE_INTEGER;
        const tb = b.when ? b.when.toMillis() : Number.MAX_SAFE_INTEGER;
        return ta - tb;
      })
      .slice(0, 8);
  }, [remindersRaw, nowTick]);

  // ---- Greeting ----
  const greetingName = useMemo(() => {
    const fromDb = (profileName ?? '').trim();
    const fromAuth = (user?.displayName ?? '').trim();
    const fallback = user?.email ? user.email.split('@')[0] : 'USER';
    return (fromDb || fromAuth || fallback).toUpperCase();
  }, [profileName, user?.displayName, user?.email]);

  // ---- Today's date ----
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

  const stepsToday = Math.max(0, Math.round(distanceM / STRIDE_M));
  const distanceKm = (distanceM / 1000).toFixed(2);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.White }]}
      edges={['left', 'right']} // top handled manually
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View
        style={{
          flex: 1,
          backgroundColor: colors.White,
          paddingTop: 0, // no white band at top
          paddingBottom: insets.bottom + BOTTOM_BAR_H + 12,
        }}
      >
        <ScrollView contentInsetAdjustmentBehavior="never">
          {/* Welcome text */}
          <View style={styles.headerTextWrap}>
            <Text style={styles.welcome}>
              WELCOME BACK,{'\n'}
              {loadingName ? '…' : greetingName}
            </Text>
          </View>

          {/* Pet selector nav */}
          <View style={{ paddingHorizontal: 22, marginTop: 16 }}>
            <PetNav />
          </View>

          {/* Today row: Today card + Settings */}
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

          {/* Reminders */}
          <Text style={styles.sectionLabel}>REMINDERS</Text>
          <View style={styles.remindersRow}>
            {visibleReminders.length === 0 ? (
              <View style={[styles.reminderEmptyWrap, styles.shadow]}>
                <Text style={styles.noRemindersText}>No upcoming reminders</Text>
              </View>
            ) : (
              visibleReminders.map((r) => (
                <View
                  key={`${r.petId}-${r.id}`}
                  style={[
                    styles.reminderBox,
                    styles.shadow,
                    { backgroundColor: '#e9e8e6ff', padding: 8 },
                  ]}
                >
                  {r.petPhotoURL ? (
                    <Image source={{ uri: r.petPhotoURL }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarFallbackText}>
                        {(r.petName || '?')
                          .split(' ')
                          .map((w) => w[0])
                          .filter(Boolean)
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <Text style={{ fontWeight: '900', color: colors.blue, fontSize: 11, marginTop: 6 }} numberOfLines={2}>
                    {r.title}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 10, color: '#6E6E6E' }}>
                    {formatWhenShort(r.when)}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Steps — now shows steps for today (derived from tracked distance) */}
          <View style={[styles.stepsCard, { borderColor: colors.accent }]}>
            <Text style={styles.stepsLabel}>STEPS TODAY</Text>
            <Text style={[styles.stepsValue, { color: colors.blue }, styles.shadow]}>{stepsToday}</Text>
          </View>

          {/* Live Map preview with polyline */}
          <View style={[styles.mapCard, { borderColor: colors.accent }]}>
            <TouchableOpacity
              activeOpacity={0.96}
              onPress={() => nav.navigate('TrackMap')}
              style={{ width: '100%', height: 250, borderRadius: 16, overflow: 'hidden' }}
            >
              <MapView
                ref={(r) => { mapRef.current = r; }}
                style={{ width: '100%', height: '100%' }}
                provider={PROVIDER_GOOGLE}
                initialRegion={
                  region ?? {
                    latitude: 37.78825,
                    longitude: -122.4324,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }
                }
                region={region}
                onRegionChangeComplete={(r) => setRegion(r)}
                showsUserLocation
                followsUserLocation
                showsMyLocationButton={false}
                toolbarEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                scrollEnabled
                zoomEnabled
                mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                {path.length > 1 && (
                  <Polyline
                    coordinates={path}
                    strokeWidth={5}
                    strokeColor={colors.blue}
                  />
                )}
                {current && (
                  <Marker coordinate={current} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={{
                      width: 12, height: 12, borderRadius: 6,
                      backgroundColor: colors.accent, borderWidth: 2, borderColor: '#fff'
                    }} />
                  </Marker>
                )}
              </MapView>

              {/* Distance overlay (same style spot as before) */}
              <View style={styles.mapOverlay}>
                <Text style={[styles.distanceLabel, { color: colors.accent }]}>
                  DISTANCE: {distanceKm} km
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Tip if location off */}
          {!locReady && (
            <Text style={{ marginTop: 8, paddingHorizontal: 22, color: '#8A8A8A' }}>
              Enable Location to draw your route and count steps.
            </Text>
          )}
        </ScrollView>

        {/* Floating nav */}
        <BottomNavBar />
      </View>
    </SafeAreaView>
  );
}

const AVATAR = 30;

const styles = StyleSheet.create({
  safe: { flex: 1 },

  headerTextWrap: {
    marginTop: 125,
    alignItems: 'flex-end',
    paddingHorizontal: 22,
  },
  welcome: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'right',
    lineHeight: 28,
  },

  todayWrap: { marginTop: 24, paddingHorizontal: 22 },
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
  settingsSquare: {
    width: TODAY_H,
    height: TODAY_H,
    borderRadius: 28,
    backgroundColor: '#e9e8e6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  todayLeft: { fontWeight: '900', fontSize: 18, letterSpacing: 0.2 },
  todayRight: { alignItems: 'flex-end' },
  todayRightTop: { color: '#777', fontSize: 12, lineHeight: 14 },
  todayRightBottom: { color: '#777', fontSize: 12, lineHeight: 14, fontWeight: '700' },

  sectionLabel: {
    marginTop: 50,
    color: '#6E6E6E',
    fontWeight: '800',
    paddingHorizontal: 22,
    letterSpacing: 0.2,
  },

  remindersRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 22,
    marginTop: 10,
    flexWrap: 'wrap',
  },

  reminderBox: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },

  reminderEmptyWrap: {
    flexBasis: (width - 22 * 2 - 14 * 3) / 4,
    height: 90,
    borderRadius: 16,
    backgroundColor: '#e9e8e6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noRemindersText: {
    color: '#EE734A',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#ddd',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
  },
  avatarFallbackText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#555',
  },

  stepsCard: {
    marginTop: 20,
    marginHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepsLabel: { color: '#6E6E6E', fontWeight: '800', letterSpacing: 0.2 },
  stepsValue: { fontSize: 40, fontWeight: '900', letterSpacing: 1 },

  mapCard: {
    marginTop: 20,
    marginHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  mapOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    pointerEvents: 'none',
  },
  distanceLabel: { fontWeight: '900', fontSize: 13 },

});
