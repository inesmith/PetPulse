// src/hooks/useDailyTrack.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import type { LatLng, Region } from 'react-native-maps';

const STRIDE_M = 0.78; // avg step length

function toRad(v: number) { return (v * Math.PI) / 180; }
function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function todayKey(petId: string, userId?: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const scope = userId ? `${userId}:${petId}` : petId;
  return `track:${scope}:${y}-${m}-${d}`;
}

type Stored = {
  date: string;
  path: LatLng[];
  distanceM: number;
  region?: Region;
  updatedAt: number;
};

export function useDailyTrack(petId: string, userId?: string) {
  const [path, setPath] = useState<LatLng[]>([]);
  const [current, setCurrent] = useState<LatLng | null>(null);
  const [region, setRegion] = useState<Region | undefined>(undefined);
  const [distanceM, setDistanceM] = useState(0);
  const [locReady, setLocReady] = useState(false);

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const dateKeyRef = useRef(todayKey(petId, userId));

  // Load persisted for today
  useEffect(() => {
    let mounted = true;
    dateKeyRef.current = todayKey(petId, userId);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(dateKeyRef.current);
        if (!mounted) return;
        if (raw) {
          const parsed: Stored = JSON.parse(raw);
          setPath(parsed.path ?? []);
          setDistanceM(parsed.distanceM ?? 0);
          setRegion(parsed.region);
          const last = parsed.path?.[parsed.path.length - 1] ?? null;
          setCurrent(last);
        } else {
          setPath([]);
          setDistanceM(0);
          setRegion(undefined);
          setCurrent(null);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [petId, userId]);

  // Persist helper
  const persist = async (next: Partial<Stored>) => {
    const key = dateKeyRef.current;
    try {
      const prevRaw = await AsyncStorage.getItem(key);
      const prev: Stored = prevRaw ? JSON.parse(prevRaw) : { date: key.split(':').pop()!, path: [], distanceM: 0, updatedAt: 0 };
      const merged: Stored = {
        date: prev.date,
        path: next.path ?? prev.path,
        distanceM: next.distanceM ?? prev.distanceM,
        region: next.region ?? prev.region,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(merged));
    } catch {}
  };

  // Start location watch, keep saving + daily rollover
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;

        const last = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const start = { latitude: last.coords.latitude, longitude: last.coords.longitude };
        if (cancelled) return;
        setCurrent(start);
        setLocReady(true);

        // if no path yet, seed
        setPath(p => p.length ? p : [start]);
        if (!region) {
          setRegion({
            latitude: start.latitude,
            longitude: start.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }

        watchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 3 },
          async (loc) => {
            // handle day change
            const newKey = todayKey(petId, userId);
            if (newKey !== dateKeyRef.current) {
              dateKeyRef.current = newKey;
              setPath([]);
              setDistanceM(0);
              setRegion((r) => r); // keep visual region
            }

            const p: LatLng = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setCurrent(p);
            setPath(prev => {
              if (!prev.length) {
                persist({ path: [p] });
                return [p];
              }
              const lastP = prev[prev.length - 1];
              const d = haversine(lastP, p);
              if (d < 2) return prev; // ignore small jitter
              const next = [...prev, p];
              setDistanceM(m => {
                const nm = m + d;
                persist({ path: next, distanceM: nm });
                return nm;
              });
              return next;
            });
          }
        );
      } catch {}
    })();

    return () => {
      try { watchRef.current?.remove(); } catch {}
      watchRef.current = null;
    };
  }, [petId, userId, region]);

  // Keep region persisted when changed by user
  const setRegionAndSave = (r: Region) => {
    setRegion(r);
    persist({ region: r });
  };

  const stepsToday = useMemo(() => Math.max(0, Math.round(distanceM / STRIDE_M)), [distanceM]);

  return {
    path,
    current,
    region,
    setRegion: setRegionAndSave,
    distanceM,
    stepsToday,
    locReady,
  };
}
