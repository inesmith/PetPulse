// screens/TrackMapScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE, LatLng } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PetNav from '../components/PetNav';

type Props = {
  navigation: any;
  route: { params?: { onFinish?: (a: ActivitySummary) => void, type?: string } };
};
type ActivitySummary = {
  startedAt: number;
  endedAt: number;
  elapsedMs: number;
  meters: number;
  steps: number;
  path: LatLng[];
};

const STEP_LENGTH_M = 0.78; // avg step length

export default function TrackMapScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const watchSub = useRef<Location.LocationSubscription | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [path, setPath] = useState<LatLng[]>([]);
  const [current, setCurrent] = useState<LatLng | null>(null);

  const [mode, setMode] = useState<'idle' | 'running' | 'paused'>('idle');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [meters, setMeters] = useState<number>(0);

  const steps = useMemo(() => Math.max(0, Math.round(meters / STEP_LENGTH_M)), [meters]);
  const timeLabel = useMemo(() => fmtDuration(elapsedMs), [elapsedMs]);
  const kmLabel = useMemo(() => (meters / 1000).toFixed(2) + ' km', [meters]);

  // allow landscape here
  useEffect(() => {
    (async () => { try { await ScreenOrientation.unlockAsync(); } catch {} })();
    return () => { (async () => { try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT); } catch {} })(); };
  }, []);

  // location watch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      const last = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const start = { latitude: last.coords.latitude, longitude: last.coords.longitude };
      setCurrent(start);
      setPath([start]);
      mapRef.current?.animateCamera({ center: start, zoom: 16 }, { duration: 500 });

      watchSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 3 },
        (loc) => {
          const p = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setCurrent(p);

          if (mode === 'running') {
            setPath((prev) => {
              if (!prev.length) return [p];
              const lastP = prev[prev.length - 1];
              const d = haversine(lastP, p);
              if (d < 0.5) return prev; // ignore tiny jitter
              setMeters((m) => m + d);
              return [...prev, p];
            });
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      try { watchSub.current?.remove(); } catch {}
      watchSub.current = null;
    };
  }, [mode]);

  // timer
  function startTimer() {
    if (mode === 'running') return;
    const now = Date.now();
    const base = startedAt ? now - (elapsedMs || 0) : now;
    setStartedAt(base);
    setMode('running');
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => setElapsedMs(Date.now() - base), 1000);
  }
  function pauseTimer() {
    if (mode !== 'running') return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setMode('paused');
  }
  function resumeTimer() {
    if (mode !== 'paused' || !startedAt) return;
    const base = Date.now() - elapsedMs;
    setMode('running');
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => setElapsedMs(Date.now() - base), 1000);
  }
  function stopAndFinish() {
    const end = Date.now();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setMode('idle');
    const activity: ActivitySummary = {
      startedAt: startedAt ?? end, endedAt: end, elapsedMs, meters, steps, path,
    };
    try { route.params?.onFinish?.(activity); } catch {}
    navigation.goBack();
  }
  function cancelAndExit() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setMode('idle');
    navigation.goBack();
  }
  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <MapView
        ref={(r) => { mapRef.current = r; }}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        followsUserLocation
        onMapReady={() => {
          if (current) {
            mapRef.current?.animateCamera({ center: current, zoom: 16 }, { duration: 500 });
          }
        }}
      >
        {path.length > 1 && <Polyline coordinates={path} strokeWidth={6} strokeColor="#73C3D1" />}
        {current && (
          <Marker coordinate={current} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.dot} />
          </Marker>
        )}
      </MapView>

      {/* PetNav */}
      <View pointerEvents="box-none" style={styles.petNavWrap}>
        <PetNav />
      </View>

      {/* Bottom panel with stats & controls (includes Close) */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.statsRow}>
          <Stat label="TIME" value={timeLabel} />
          <Stat label="DISTANCE" value={kmLabel} />
          <Stat label="STEPS" value={String(steps)} />
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={cancelAndExit}>
            <Ionicons name="close" size={18} color="#1C1C1C" />
            <Text style={styles.secondaryBtnText}>Close</Text>
          </TouchableOpacity>

          {mode === 'idle'   && <PrimaryButton label="Start"  icon="play"  onPress={startTimer} />}
          {mode === 'running'&& <PrimaryButton label="Pause"  icon="pause" onPress={pauseTimer} />}
          {mode === 'paused' && <PrimaryButton label="Resume" icon="play"  onPress={resumeTimer} />}

          <TouchableOpacity style={styles.stopBtn} onPress={stopAndFinish}>
            <Ionicons name="stop" size={18} color="#F8F7F4" />
            <Text style={styles.stopBtnText}>Stop</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* bits */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 90 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}
function PrimaryButton({
  label, icon, onPress,
}: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; }) {
  return (
    <TouchableOpacity style={styles.primaryBtn} onPress={onPress}>
      <Ionicons name={icon} size={18} color="#1C1C1C" />
      <Text style={styles.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* helpers */
function fmtDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  return `${pad(mm)}:${pad(ss)}`;
}
function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function haversine(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (x:number)=>(x*Math.PI)/180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const d = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
  return R * d;
}

/* styles */
const PANEL_BG = '#FFFFFF';
const GREY = '#e9e8e6ff';
const BLUE = '#73C3D1';
const ACCENT = '#EE734A';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },

  dot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: ACCENT, borderWidth: 2, borderColor: '#fff',
  },

  petNavWrap: {
    position: 'absolute',
    top: 200,
    left: 0, right: 0,
    zIndex: 20,
  },

  bottomPanel: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: PANEL_BG, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 16,
    shadowColor: 'rgba(0,0,0,0.2)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 16,
  },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  statLabel: { color: '#6E6E6E', fontWeight: '800', fontSize: 12, letterSpacing: 0.3 },
  statValue: { color: BLUE, fontWeight: '900', fontSize: 18, marginTop: 2 },

  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 6 },

  secondaryBtn: {
    height: 46, paddingHorizontal: 16, borderRadius: 14, backgroundColor: GREY,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  secondaryBtnText: { fontWeight: '900', color: '#1C1C1C' },

  primaryBtn: {
    flex: 1, height: 46, borderRadius: 14, backgroundColor: GREY,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  primaryBtnText: { fontWeight: '900', color: '#1C1C1C' },

  stopBtn: {
    height: 46, paddingHorizontal: 18, borderRadius: 14, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  stopBtnText: { fontWeight: '900', color: '#F8F7F4' },
});
