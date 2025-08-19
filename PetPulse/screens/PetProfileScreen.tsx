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
  Modal,
  Pressable,
  Alert,
  StatusBar, // ✅ added
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Timestamp, onSnapshot, addDoc, serverTimestamp, query, where, orderBy, limit as qLimit } from 'firebase/firestore';
import { usePets } from '../context/PetContext';
import { petDoc, petCol } from '../src/utils/pets';
import { db } from '../firebase';

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
// 👇 used only to guarantee enough scroll space beneath the floating nav
const BOTTOM_BAR_H = 88;

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
function formatWhenShort(ts?: Timestamp) {
  if (!ts) return '—';
  const d = ts.toDate();
  const optsTop: Intl.DateTimeFormatOptions = { weekday: 'short' };
  const optsBottom: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  return `${d.toLocaleDateString(undefined, optsTop).toUpperCase()}, ${d
    .toLocaleDateString(undefined, optsBottom)
    .toUpperCase()}`;
}

export default function PetProfileScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { selectedPet, selectedPetId = 'primary' } = usePets();

  // Keep your original spacing, but ensure we always have *at least* enough bottom room
  const contentBottomPad = Math.max(
    NAV_HEIGHT + Math.max(insets.bottom, NAV_MARGIN) + 16,
    insets.bottom + BOTTOM_BAR_H + 12
  );

  const [pet, setPet] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notesLocal, setNotesLocal] = useState('');

  // reminders
  const [reminders, setReminders] = useState<
    { id: string; title: string; when?: Timestamp; notes?: string }[]
  >([]);
  const [openModal, setOpenModal] = useState(false);
  const [rTitle, setRTitle] = useState('');
  const [rDate, setRDate] = useState('');  // e.g. 2025-08-18 14:30
  const [rNotes, setRNotes] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);

  // ---- Load the selected pet ----
  useEffect(() => {
    if (!user?.uid) return;
    const ref = petDoc(user.uid, selectedPetId ?? 'primary');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setPet(null);
          setNotesLocal('');
          setLoading(false);
          return;
        }
        const data = snap.data() || null;
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
  }, [user?.uid, selectedPetId]);

  // ---- Upcoming reminders for selected pet ----
  useEffect(() => {
    if (!user?.uid) return;
    const col = petCol(user.uid, selectedPetId ?? 'primary', 'reminders');
    const qy = query(col, where('when', '>=', Timestamp.now()), orderBy('when', 'asc'), qLimit(4));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows: any[] = [];
        snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
        setReminders(rows);
      },
      (err) => console.warn('reminders onSnapshot error:', err)
    );
    return unsub;
  }, [user?.uid, selectedPetId]);

  const petName  = useMemo(() => toTitle(pet?.name ?? selectedPet?.name ?? ''), [pet?.name, selectedPet?.name]);
  const petBreed = useMemo(() => toTitle(pet?.breed ?? selectedPet?.breed ?? ''), [pet?.breed, selectedPet?.breed]);
  const dobText  = useMemo(() => formatDobForCard(pet?.dob), [pet?.dob]);
  const ageText  = useMemo(() => pet?.age || ageFromDob(pet?.dob) || '', [pet?.age, pet?.dob]);

  async function saveReminder() {
    if (!user?.uid) return;
    const title = rTitle.trim();
    if (!title) {
      Alert.alert('Missing info', 'Please add a title for the reminder.');
      return;
    }
    let when: Date | null = null;
    if (rDate.trim()) {
      const raw = rDate.trim();
      const isoish = raw.length <= 10 ? `${raw}T12:00` : raw.replace(' ', 'T');
      const candidate = new Date(isoish);
      if (!isNaN(+candidate)) when = candidate;
    }
    setSavingReminder(true);
    try {
      const col = petCol(user.uid, selectedPetId ?? 'primary', 'reminders');
      await addDoc(col, {
        title,
        notes: rNotes.trim(),
        when: when ? Timestamp.fromDate(when) : null,
        done: false,
        createdAt: serverTimestamp(),
      });
      setOpenModal(false);
      setRTitle('');
      setRDate('');
      setRNotes('');
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Please try again.');
    } finally {
      setSavingReminder(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left', 'right']}>
      {/* match HomeScreen behavior so Android doesn’t steal layout space */}
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />{/* ✅ */}

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

            {/* Upcoming reminders */}
            <Text style={[styles.sectionTitle, { color: '#6E6E6E' }]}>UPCOMING REMINDERS</Text>
            <View style={styles.remindersRow}>
              {reminders.length === 0 && (
                <Text style={{ color: '#6E6E6E', fontWeight: '800', marginBottom: 8 }}>
                  No reminders yet
                </Text>
              )}
              {reminders.map((r) => (
                <View
                  key={r.id}
                  style={[styles.reminderBox, styles.shadow, { backgroundColor: '#e9e8e6ff', padding: 8 }]}
                >
                  <Text style={{ fontWeight: '900', color: colors.blue, fontSize: 11, marginTop: 6 }} numberOfLines={2}>
                    {r.title}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 10, color: '#6E6E6E' }}>
                    {formatWhenShort(r.when)}
                  </Text>
                </View>
              ))}

              {/* Add Reminder tile (always last) */}
              <TouchableOpacity
                onPress={() => setOpenModal(true)}
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

            {/* Notes */}
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

      {/* --- Add Reminder Modal --- */}
      <Modal
        visible={openModal}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenModal(false)}
      >
        <View style={m.overlay}>
          <View style={[m.card, styles.shadow]}>
            <Text style={m.title}>Create Reminder</Text>

            <Text style={m.label}>Title</Text>
            <TextInput
              value={rTitle}
              onChangeText={setRTitle}
              placeholder="Vet appointment"
              placeholderTextColor="#8A8A8A"
              style={m.input}
            />

            <Text style={m.label}>Date & Time</Text>
            <TextInput
              value={rDate}
              onChangeText={setRDate}
              placeholder="YYYY-MM-DD HH:mm (24h)"
              placeholderTextColor="#8A8A8A"
              autoCapitalize="none"
              style={m.input}
            />

            <Text style={m.label}>Notes (optional)</Text>
            <TextInput
              value={rNotes}
              onChangeText={setRNotes}
              placeholder="Bring vaccination card"
              placeholderTextColor="#8A8A8A"
              style={[m.input, { height: 80 }]}
              multiline
            />

            <View style={m.row}>
              <Pressable style={[m.btn, { backgroundColor: '#e9e8e6ff' }]} onPress={() => setOpenModal(false)}>
                <Text style={[m.btnText, { color: '#6E6E6E' }]}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={savingReminder}
                onPress={saveReminder}
                style={[m.btn, { backgroundColor: colors.blue, opacity: savingReminder ? 0.6 : 1 }]}
              >
                <Text style={[m.btnText, { color: colors.white }]}>{savingReminder ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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

/* --- Modal styles --- */
const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: { fontWeight: '900', fontSize: 18, marginBottom: 12, color: '#1C1C1C' },
  label: { fontWeight: '800', fontSize: 12, color: '#6E6E6E', marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#EE734A',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  btnText: { fontWeight: '900' },
});
