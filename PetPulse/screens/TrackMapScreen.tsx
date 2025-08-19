import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE, LatLng } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function TrackMapScreen({ navigation }: any) {
  const mapRef = useRef<MapView | null>(null);
  const [path, setPath] = useState<LatLng[]>([]);
  const [current, setCurrent] = useState<LatLng | null>(null);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const last = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const start = { latitude: last.coords.latitude, longitude: last.coords.longitude };
      setCurrent(start);
      setPath([start]);

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 2000,
          distanceInterval: 3,
        },
        (loc) => {
          const p = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setCurrent(p);
          setPath((prev) => {
            if (!prev.length) return [p];
            const last = prev[prev.length - 1];
            const d = Math.hypot(p.latitude - last.latitude, p.longitude - last.longitude);
            if (d < 0.00001) return prev;
            return [...prev, p];
          });
        }
      );
    })();

    return () => {
      try { sub?.remove(); } catch {}
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top','left','right']}>
      <MapView
        ref={(r) => { mapRef.current = r; }}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        followsUserLocation
      >
        {path.length > 1 && (
          <Polyline coordinates={path} strokeWidth={6} strokeColor="#73C3D1" />
        )}
        {current && (
          <Marker coordinate={current} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.dot} />
          </Marker>
        )}
      </MapView>

      <TouchableOpacity style={styles.close} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={24} color="#1C1C1C" />
        <Text style={styles.closeTxt}>Close</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  dot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#EE734A', borderWidth: 2, borderColor: '#fff',
  },
  close: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  closeTxt: { fontWeight: '800', color: '#1C1C1C' },
});
