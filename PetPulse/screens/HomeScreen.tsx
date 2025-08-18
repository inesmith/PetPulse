// screens/HomeScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Button,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';
import PetNav from '../components/PetNav'; // 👈 add this
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
  blue: (config as any)?.theme?.colors?.blue ?? '#73C3D1',
  White: (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o ?? '#EE734A',
  text: (config as any)?.theme?.colors?.text ?? '#1C1C1C',
  grey: '#DADADA',
};

const TODAY_H = 60;

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
  const { logout, user } = useAuth();

  const [profileName, setProfileName] = useState<string | null>(null);
  const [loadingName, setLoadingName] = useState<boolean>(true);

  const [remindersRaw, setRemindersRaw] = useState<ReminderItem[]>([]);
  const childUnsubsRef = useRef<(() => void)[]>([]);
  const [nowTick, setNowTick] = useState<number>(Date.now()); // re-render clock

  // keep UI “live” so past reminders drop off without db changes
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

  // --- Listen to ALL pets and collect their upcoming reminders (merged) ---
  useEffect(() => {
    // cleanup any child listeners from prior runs
    childUnsubsRef.current.forEach((u) => u());
    childUnsubsRef.current = [];
    setRemindersRaw([]);

    if (!user?.uid) return;

    const petsCol = collection(db, 'users', user.uid, 'pets');
    const unsubPets = onSnapshot(
      petsCol,
      (petsSnap) => {
        // when pet list changes, reset listeners
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
              // remove existing reminders for this pet, then add fresh ones
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

                // merge & sort by 'when'
                const merged = [...filtered, ...rows].sort((a, b) => {
                  const ta = a.when ? a.when.toMillis() : Number.MAX_SAFE_INTEGER;
                  const tb = b.when ? b.when.toMillis() : Number.MAX_SAFE_INTEGER;
                  return ta - tb;
                });

                return merged;
              });
            },
            () => {
              // on error, just drop this pet's reminders
              setRemindersRaw((prev) => prev.filter((r) => r.petId !== petId));
            }
          );

          nextChildUnsubs.push(unsubRem);
        });

        childUnsubsRef.current = nextChildUnsubs;
      },
      () => {
        // on error, clear children listeners
        childUnsubsRef.current.forEach((u) => u());
        childUnsubsRef.current = [];
      }
    );

    return () => {
      // cleanup on unmount / uid change
      if (unsubPets) unsubPets();
      childUnsubsRef.current.forEach((u) => u());
      childUnsubsRef.current = [];
    };
  }, [user?.uid]);

  // Filter OUT past-due reminders (do not show anything strictly before "now")
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

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.White }]}
      edges={['left', 'right']}
    >
      <View style={{ flex: 1, backgroundColor: colors.White }}>
        {/* Welcome text */}
        <View style={styles.headerTextWrap}>
          <Text style={styles.welcome}>
            WELCOME BACK,{'\n'}
            {loadingName ? '…' : greetingName}
          </Text>
        </View>

        {/* 👇 Pet selector nav */}
        <View style={{ paddingHorizontal: 22, marginTop: 16 }}>
          <PetNav />
        </View>

        {/* Today row: Today card + Settings square */}
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
                {/* pet avatar circle */}
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

                {/* title + date */}
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

        {/* Steps */}
        <View style={[styles.stepsCard, { borderColor: colors.accent }]}>
          <Text style={styles.stepsLabel}>STEPS</Text>
          <Text style={[styles.stepsValue, { color: colors.blue }, styles.shadow]}>3478</Text>
        </View>

        {/* Map preview */}
        <View style={[styles.mapCard, { borderColor: colors.accent }]}>
          <ImageBackground
            source={require('../assets/map-placeholder.png')}
            style={styles.mapImg}
            imageStyle={{ borderRadius: 16, opacity: 0.25 }}
            resizeMode="cover"
          >
            <Text style={[styles.distanceLabel, { color: colors.accent }]}>
              DISTANCE: 2,5 km
            </Text>
          </ImageBackground>
        </View>

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

  todayWrap: { marginTop: 24, paddingHorizontal: 22 }, // tightened since PetNav is above
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
  mapImg: { width: '100%', height: 250, justifyContent: 'center', padding: 12 },
  distanceLabel: { fontWeight: '900', fontSize: 13, marginTop: 210 },
});
