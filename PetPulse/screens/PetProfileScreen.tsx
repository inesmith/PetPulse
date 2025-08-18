// screens/PetProfileScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const colors = {
  blue:   (config as any)?.theme?.colors?.blue  ?? '#73C3D1',
  white:  (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o     ?? '#EE734A',
  text:   (config as any)?.theme?.colors?.text  ?? '#1C1C1C',
  gray:   '#D7D7D7',
  dark:   '#6B6B6B',
};

const HEADER_H = 330;
const NAV_HEIGHT = 64;
const NAV_MARGIN = 8;
const NAME_H = 72;
const NAME_GAP = 6;

/* helpers */
function toTitle(s = '') {
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}
function formatDobForCard(dob?: string) {
  if (!dob) return '';
  const tryIso = new Date(dob);
  if (!isNaN(+tryIso)) {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return tryIso.toLocaleDateString(undefined, opts).toUpperCase();
  }
  return dob.toUpperCase();
}
function ageFromDob(dob?: string): string | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(+d)) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  return String(Math.max(0, years));
}

export default function PetProfileScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const contentBottomPad = NAV_HEIGHT + Math.max(insets.bottom, NAV_MARGIN) + 16;

  const [pet, setPet] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notesLocal, setNotesLocal] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, 'users', user.uid, 'pets', 'primary');

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          console.log('Pet doc not found at users/{uid}/pets/primary');
          setPet(null);
          setNotesLocal('');
          setLoading(false);
          return;
        }
        const data = snap.data() || null;
        console.log('[PetProfile] pet snapshot:', JSON.stringify(data));
        setPet(data);
        setNotesLocal((data?.notes ?? '').toString());
        setLoading(false);
      },
      (err) => {
        console.warn('pet onSnapshot error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [user?.uid]);

  const petName  = useMemo(() => toTitle(pet?.name ?? ''), [pet?.name]);
  const petBreed = useMemo(() => toTitle(pet?.breed ?? ''), [pet?.breed]);
  const dobText  = useMemo(() => formatDobForCard(pet?.dob), [pet?.dob]);
  const ageText  = useMemo(() => pet?.age || ageFromDob(pet?.dob) || '', [pet?.age, pet?.dob]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left', 'right']}>
      <View style={[styles.container, { backgroundColor: colors.white }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: contentBottomPad }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            {/* Header image */}
            <View style={styles.photoWrap}>
              <Image
                source={require('../assets/lina-lardi.png')}
                style={styles.photo}
                resizeMode="cover"
              />
            </View>

            {/* Name row: pill + settings square */}
            <View style={styles.nameRow}>
              <View style={[styles.nameCard, styles.shadow]}>
                <View>
                  <Text style={[styles.petName, { color: colors.blue }]}>
                    {(petName || 'Your Pet').toUpperCase()}
                  </Text>
                  {!!petBreed && (
                    <Text style={[styles.petBreed, { color: colors.dark }]}>{petBreed}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.labelSmall, { color: colors.dark }]}>DOB:</Text>
                  <Text style={[styles.dob, { color: colors.dark }]}>
                    {dobText || '—'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => nav.navigate('PetSettings')}
                style={[styles.settingsSquare, styles.shadow]}
              >
                <Ionicons name="settings" size={26} color={colors.blue} />
              </TouchableOpacity>
            </View>

            {/* Attribute chips */}
            <View style={styles.attrRow}>
              <Attr label="AGE"    value={(ageText || '—').toString()} />
              <Attr label="COLOUR" value={(pet?.colour || '—').toString().toUpperCase()} />
              <Attr label="SIZE"   value={(pet?.size || '—').toString().toUpperCase()} />
              <Attr label="GENDER" value={((pet?.gender || '—').toString().toUpperCase()[0] || '—')} />
              <Attr label="CHIP"   value={pet?.hasChip === true ? 'YES' : pet?.hasChip === false ? 'NO' : '—'} />
            </View>

            {/* Weight row */}
            <View style={[styles.weightCard, { borderColor: colors.accent }]}>
              <Text style={[styles.weightLabel, { color: colors.dark }]}>WEIGHT:</Text>
              <Text style={[styles.weightValue, { color: colors.blue }]}>
                {pet?.weight ? `${pet.weight} KG` : '—'}
              </Text>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { borderBottomColor: colors.accent }]} />

            {/* Upcoming reminders (placeholder UI) */}
            <Text style={[styles.sectionTitle, { color: '#6E6E6E' }]}>UPCOMING REMINDERS</Text>
            <View style={styles.remindersRow}>
              {[1,2,3].map((id) => (
                <View
                  key={id}
                  style={[styles.reminderBox, styles.shadow, { backgroundColor: '#e9e8e6ff' }]}
                />
              ))}
              <TouchableOpacity
                onPress={() => {}}
                activeOpacity={0.85}
                style={[
                  styles.reminderBox,
                  styles.shadow,
                  { backgroundColor: '#e9e8e6ff', alignItems: 'center', justifyContent: 'center' },
                ]}
              >
                <Ionicons name="add" size={28} color={colors.blue} />
                <Text style={styles.addText}>Add Reminder</Text>
              </TouchableOpacity>
            </View>

            {/* Notes (local display; persisted from settings) */}
            <View style={[styles.notesCard, { borderColor: colors.accent }]}>
              <TextInput
                value={notesLocal}
                onChangeText={setNotesLocal}
                placeholder="NOTES..."
                placeholderTextColor={colors.blue}
                multiline
                textAlignVertical="top"
                style={[styles.notesInput, { marginTop: -10, fontWeight: '900' }]}
                maxLength={500}
              />
              <Text style={styles.notesCount}>{notesLocal.length}/500</Text>
              {loading && <Text style={{ marginTop: 6, color: '#8A8A8A' }}>Loading pet…</Text>}
              {!loading && pet === null && (
                <Text style={{ marginTop: 6, color: '#8A8A8A' }}>
                  No pet profile found. Go to Settings → Save Changes to create it.
                </Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <BottomNavBar />
      </View>
    </SafeAreaView>
  );
}

/* --- chip --- */
function Attr({ label, value }: { label: string; value: string }) {
  return (
    <View style={attrStyles.wrap}>
      <Text style={attrStyles.label}>{label}</Text>
      <View style={attrStyles.pill}>
        <Text style={attrStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const attrStyles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6E6E6E',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  pill: {
    minWidth: 58,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#EE734A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontWeight: '900', color: '#73C3D1', letterSpacing: 0.2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },

  photoWrap: {
    height: HEADER_H,
    width: '120%',
    borderBottomLeftRadius: 140,
    borderBottomRightRadius: 140,
    overflow: 'hidden',
    alignSelf: 'center',
    marginTop: 0,
  },
  photo: { width: '100%', height: '100%' },

  nameRow: {
    marginTop: -26,
    alignSelf: 'center',
    width: width - 65,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameCard: {
    height: NAME_H,
    flexGrow: 1,
    width: width - 65 - NAME_H - NAME_GAP,
    backgroundColor: '#e9e8e6ff',
    borderRadius: 28,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: NAME_GAP,
  },
  settingsSquare: {
    width: NAME_H,
    height: NAME_H,
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
  petName: { fontSize: 22, fontWeight: '900', letterSpacing: 0.4 },
  petBreed: { fontSize: 12, marginTop: 2 },

  labelSmall: { fontSize: 12, letterSpacing: 0.2 },
  dob: { fontSize: 12, fontWeight: '700' },

  attrRow: {
    marginTop: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 6,
  },

  weightCard: {
    marginTop: 20,
    marginHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
  weightValue: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'right',
  },

  divider: { marginTop: 20, marginHorizontal: 22, borderBottomWidth: 1.5 },

  sectionTitle: { marginTop: 14, paddingHorizontal: 22, fontWeight: '900', fontSize: 14, letterSpacing: 0.2 },

  remindersRow: {
    marginTop: 20,
    paddingHorizontal: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    flexWrap: 'wrap',
  },
  reminderBox: {
    width: (width - 70) / 4,
    height: 90,
    borderRadius: 16,
    backgroundColor: '#e9e8e6ff',
  },
  addText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6E6E6E',
    marginTop: 4,
    textAlign: 'center',
  },

  notesCard: {
    marginTop: 16,
    marginHorizontal: 22,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'transparent',
  },
  notesInput: {
    minHeight: 100,
    fontSize: 14,
    lineHeight: 20,
  },
  notesCount: {
    alignSelf: 'flex-end',
    marginTop: 6,
    fontSize: 12,
    color: '#8A8A8A',
  },
});
