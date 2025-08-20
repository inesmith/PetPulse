// screens/HealthScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  Pressable,
  StatusBar, 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';
import PetNav from '../components/PetNav';
import { useAuth } from '../context/AuthContext';
import { usePets } from '../context/PetContext';
import { onSnapshot, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { petDoc, petCol } from '../src/utils/pets';

const { width } = Dimensions.get('window');

const colors = {
  blue:   (config as any)?.theme?.colors?.blue  ?? '#73C3D1',
  white:  (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o     ?? '#EE734A',
  text:   (config as any)?.theme?.colors?.text  ?? '#1C1C1C',
  grey:   '#e9e8e6ff',
  label:  '#6E6E6E',
};

const NAV_H = 64;
const NAV_MARGIN = 8;
const CARD_R = 18;

// Match PetNav’s blob placement
const BLOB_TOP = -55;

/* ---------- Types ---------- */
type PetHeader = {
  name?: string;
  breed?: string;
  gender?: string;
};

type Med = { id: string; name: string; createdAt?: any };
type VetVisit = { id: string; date: string; info: string; createdAt?: any };
type Vaccination = { id: string; name: string; date: string; createdAt?: any };
type HeatEntry = { id: string; label: string; date: string; createdAt?: any };
type Pregnancy = { id: string; status: string; createdAt?: any };
type PregHistory = { id: string; date: string; pups: string; createdAt?: any };

/* ---------- Component ---------- */
export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const padBottom = NAV_H + Math.max(insets.bottom, NAV_MARGIN) + 16;

  const { user } = useAuth();
  const { selectedPet } = usePets();
  const petId = selectedPet?.id || 'primary';

  // header data for the currently selected pet
  const [petHeader, setPetHeader] = useState<PetHeader | null>(null);

  // Logs
  const [meds, setMeds] = useState<Med[]>([]);
  const [vetVisits, setVetVisits] = useState<VetVisit[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [heats, setHeats] = useState<HeatEntry[]>([]);
  const [pregnancies, setPregnancies] = useState<Pregnancy[]>([]);
  const [pregHistory, setPregHistory] = useState<PregHistory[]>([]);

  // Add modals state (one simple modal reused per section)
  const [modal, setModal] = useState<
    | { kind: 'med' }
    | { kind: 'vet' }
    | { kind: 'vacc' }
    | { kind: 'heat' }
    | { kind: 'preg' }
    | { kind: 'pregHistory' }
    | null
  >(null);

  // Modal form fields
  const [f1, setF1] = useState(''); // generic text
  const [f2, setF2] = useState(''); // generic text (date/info/etc)

  /* ---------- Subscriptions ---------- */
  useEffect(() => {
    if (!user?.uid) return;

    // Pet header
    const unsubHeader = onSnapshot(petDoc(user.uid, petId), (snap) => {
      setPetHeader((snap.data() as any) ?? null);
    });

    // meds
    const unsubMeds = onSnapshot(
      query(petCol(user.uid, petId, 'health_meds'), orderBy('createdAt', 'desc')),
      (snap) => {
        const rows: Med[] = [];
        snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
        setMeds(rows);
      }
    );

    // vet visits
    const unsubVet = onSnapshot(
      query(petCol(user.uid, petId, 'health_vet'), orderBy('createdAt', 'desc')),
      (snap) => {
        const rows: VetVisit[] = [];
        snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
        setVetVisits(rows);
      }
    );

    // vaccinations
    const unsubVacc = onSnapshot(
      query(petCol(user.uid, petId, 'health_vaccinations'), orderBy('createdAt', 'desc')),
      (snap) => {
        const rows: Vaccination[] = [];
        snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
        setVaccinations(rows);
      }
    );

    // heats
    const unsubHeats = onSnapshot(
      query(petCol(user.uid, petId, 'health_heats'), orderBy('createdAt', 'desc')),
      (snap) => {
        const rows: HeatEntry[] = [];
        snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
        setHeats(rows);
      }
    );

    // pregnancy status
    const unsubPreg = onSnapshot(
      query(petCol(user.uid, petId, 'health_pregnancies'), orderBy('createdAt', 'desc')),
      (snap) => {
        const rows: Pregnancy[] = [];
        snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
        setPregnancies(rows);
      }
    );

    // pregnancy history
    const unsubPH = onSnapshot(
      query(petCol(user.uid, petId, 'health_preg_history'), orderBy('createdAt', 'desc')),
      (snap) => {
        const rows: PregHistory[] = [];
        snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
        setPregHistory(rows);
      }
    );

    return () => {
      unsubHeader();
      unsubMeds();
      unsubVet();
      unsubVacc();
      unsubHeats();
      unsubPreg();
      unsubPH();
    };
  }, [user?.uid, petId]);

  const isFemale = useMemo(() => {
    const g = (petHeader?.gender || '').toString().toLowerCase();
    return g.startsWith('f');
  }, [petHeader?.gender]);

  /* ---------- Add handlers ---------- */
  function addMed()         { setModal({ kind: 'med'  }); setF1(''); setF2(''); }
  function addVetVisit()    { setModal({ kind: 'vet'  }); setF1(''); setF2(''); }
  function addVaccination() { setModal({ kind: 'vacc' }); setF1(''); setF2(''); }
  function addHeat()        { setModal({ kind: 'heat' }); setF1(''); setF2(''); }
  function addPregnancy()   { setModal({ kind: 'preg' }); setF1(''); setF2(''); }
  function addPregHistory() { setModal({ kind: 'pregHistory' }); setF1(''); setF2(''); }

  async function saveModal() {
    if (!user?.uid || !modal) return;
    const uid = user.uid;

    try {
      if (modal.kind === 'med') {
        await addDoc(petCol(uid, petId, 'health_meds'), {
          name: f1.trim() || 'Medication',
          createdAt: serverTimestamp(),
        });
      } else if (modal.kind === 'vet') {
        await addDoc(petCol(uid, petId, 'health_vet'), {
          date: f1.trim() || new Date().toISOString().slice(0, 10),
          info: f2.trim() || 'Visit',
          createdAt: serverTimestamp(),
        });
      } else if (modal.kind === 'vacc') {
        await addDoc(petCol(uid, petId, 'health_vaccinations'), {
          name: f1.trim() || 'Vaccine',
          date: f2.trim() || new Date().toISOString().slice(0, 10),
          createdAt: serverTimestamp(),
        });
      } else if (modal.kind === 'heat') {
        await addDoc(petCol(uid, petId, 'health_heats'), {
          label: f1.trim() || 'HEAT',
          date: f2.trim() || new Date().toISOString().slice(0, 10),
          createdAt: serverTimestamp(),
        });
      } else if (modal.kind === 'preg') {
        await addDoc(petCol(uid, petId, 'health_pregnancies'), {
          status: f1.trim() || 'Unknown',
          createdAt: serverTimestamp(),
        });
      } else if (modal.kind === 'pregHistory') {
        await addDoc(petCol(uid, petId, 'health_preg_history'), {
          date: f1.trim() || new Date().toISOString().slice(0, 10),
          pups: (f2 || '').replace(/[^0-9]/g, ''),
          createdAt: serverTimestamp(),
        });
      }
    } finally {
      setModal(null);
    }
  }

  function rowsToShow<T>(rows: T[]) {
    if (rows.length <= 1) return rows.slice(0, 1);
    return rows;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left','right']}>
      {/* No top white: draw under status bar on Android */}
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: padBottom }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Blob */}
            <View style={styles.blob} pointerEvents="none" />

            {/* Pet Nav  */}
            <View style={{ paddingHorizontal: 22, marginTop: 200 }}>
              <PetNav />
            </View>

            {/* Header (name at right) */}
            <View style={styles.headerTopRow}>
              <View />
              <View style={{ alignItems: 'flex-end', paddingRight: 22 }}>
                <Text style={styles.petName}>
                  {(petHeader?.name || 'YOUR PET').toUpperCase()}
                </Text>
                {!!petHeader?.breed && (
                  <Text style={styles.petBreed}>{petHeader.breed}</Text>
                )}
              </View>
            </View>

            {/* Pill */}
            <View style={styles.pillWrap}>
              <View style={[styles.pill, styles.shadowCard]}>
                <Text style={[styles.pillText, { color: colors.accent }]}>HEALTH LOGS</Text>
              </View>
            </View>

            {/* MEDICATION */}
            <SectionHeader title="MEDICATION">
              <IconBtn onPress={addMed} />
            </SectionHeader>
            <View style={styles.sectionPad}>
              {rowsToShow(meds).length === 0 ? (
                <EmptyRow label="NO MEDS ADDED" />
              ) : (
                rowsToShow(meds).map((m) => (
                  <HealthRow key={m.id} left="MED" right={m.name} />
                ))
              )}
            </View>

            {/* VET VISITS */}
            <SectionHeader title="VET VISITS">
              <IconBtn onPress={addVetVisit} />
            </SectionHeader>
            <View style={styles.sectionPad}>
              {rowsToShow(vetVisits).length === 0 ? (
                <EmptyRow label="NO VISITS ADDED" />
              ) : (
                rowsToShow(vetVisits).map((v) => (
                  <HealthRow key={v.id} left={v.date || 'DATE'} right={v.info || 'INFO'} />
                ))
              )}
            </View>

            {/* VACCINATIONS */}
            <SectionHeader title="VACCINATIONS">
              <IconBtn onPress={addVaccination} />
            </SectionHeader>
            <View style={styles.sectionPad}>
              {rowsToShow(vaccinations).length === 0 ? (
                <EmptyRow label="NO VACCINES ADDED" />
              ) : (
                rowsToShow(vaccinations).map((v) => (
                  <HealthRow key={v.id} left={v.name || 'NAME'} right={v.date || 'DATE'} />
                ))
              )}
            </View>

            {/* FEMALE-ONLY SECTIONS */}
            {isFemale && (
              <>
                {/* HEAT TRACKER */}
                <SectionHeader title="HEAT TRACKER">
                  <IconBtn onPress={addHeat} />
                </SectionHeader>
                <View style={styles.sectionPad}>
                  {rowsToShow(heats).length === 0 ? (
                    <EmptyRow label="NO HEAT LOGS" />
                  ) : (
                    rowsToShow(heats).map((h) => (
                      <HealthRow key={h.id} left={h.label || 'HEAT'} right={h.date || 'DATE'} />
                    ))
                  )}
                </View>

                {/* PREGNANCY (status) */}
                <SectionHeader title="PREGNANCY">
                  <IconBtn onPress={addPregnancy} />
                </SectionHeader>
                <View style={styles.sectionPad}>
                  {rowsToShow(pregnancies).length === 0 ? (
                    <EmptyRow label="NO PREGNANCY STATUS" />
                  ) : (
                    rowsToShow(pregnancies).map((p) => (
                      <HealthRow key={p.id} left="STATUS" right={p.status || '—'} />
                    ))
                  )}
                </View>

                {/* PREGNANCY HISTORY */}
                <SectionHeader title="PREGNANCY HISTORY">
                  <IconBtn onPress={addPregHistory} />
                </SectionHeader>
                <View style={styles.sectionPad}>
                  {rowsToShow(pregHistory).length === 0 ? (
                    <EmptyRow label="NO HISTORY ADDED" />
                  ) : (
                    rowsToShow(pregHistory).map((e) => (
                      <HealthRow key={e.id} left={e.date || 'DATE'} right={(e.pups || '0') + ' PUPPIES'} />
                    ))
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Sticky floating nav */}
        <BottomNavBar />
      </View>

      {/* ------- ADD MODAL (reused) ------- */}
      <Modal
        visible={modal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModal(null)}
      >
        <Pressable style={m.overlay} onPress={() => setModal(null)} />
        <View style={[m.card, styles.shadowCard]}>
          <Text style={m.title}>
            {modal?.kind === 'med' ? 'Add Medication'
              : modal?.kind === 'vet' ? 'Add Vet Visit'
              : modal?.kind === 'vacc' ? 'Add Vaccination'
              : modal?.kind === 'heat' ? 'Add Heat Log'
              : modal?.kind === 'preg' ? 'Update Pregnancy Status'
              : modal?.kind === 'pregHistory' ? 'Add Pregnancy History'
              : ''}
          </Text>

          {modal?.kind === 'med' && (
            <>
              <Text style={m.label}>Medication Name</Text>
              <TextInput
                value={f1}
                onChangeText={setF1}
                placeholder="e.g., Bravecto"
                placeholderTextColor="#8A8A8A"
                style={m.input}
              />
            </>
          )}

          {modal?.kind === 'vet' && (
            <>
              <Text style={m.label}>Date</Text>
              <TextInput
                value={f1}
                onChangeText={setF1}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#8A8A8A"
                style={m.input}
                autoCapitalize="none"
              />
              <Text style={m.label}>Info</Text>
              <TextInput
                value={f2}
                onChangeText={setF2}
                placeholder="Check-up / Vaccination / Notes"
                placeholderTextColor="#8A8A8A"
                style={m.input}
              />
            </>
          )}

          {modal?.kind === 'vacc' && (
            <>
              <Text style={m.label}>Vaccine Name</Text>
              <TextInput
                value={f1}
                onChangeText={setF1}
                placeholder="e.g., Rabies"
                placeholderTextColor="#8A8A8A"
                style={m.input}
              />
              <Text style={m.label}>Date</Text>
              <TextInput
                value={f2}
                onChangeText={setF2}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#8A8A8A"
                style={m.input}
                autoCapitalize="none"
              />
            </>
          )}

          {modal?.kind === 'heat' && (
            <>
              <Text style={m.label}>Label</Text>
              <TextInput
                value={f1}
                onChangeText={setF1}
                placeholder="e.g., 1ST HEAT"
                placeholderTextColor="#8A8A8A"
                style={m.input}
                autoCapitalize="characters"
              />
              <Text style={m.label}>Date</Text>
              <TextInput
                value={f2}
                onChangeText={setF2}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#8A8A8A"
                style={m.input}
                autoCapitalize="none"
              />
            </>
          )}

          {modal?.kind === 'preg' && (
            <>
              <Text style={m.label}>Status</Text>
              <TextInput
                value={f1}
                onChangeText={setF1}
                placeholder="Yes / No / Due in X weeks"
                placeholderTextColor="#8A8A8A"
                style={m.input}
              />
            </>
          )}

          {modal?.kind === 'pregHistory' && (
            <>
              <Text style={m.label}>Date</Text>
              <TextInput
                value={f1}
                onChangeText={setF1}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#8A8A8A"
                style={m.input}
                autoCapitalize="none"
              />
              <Text style={m.label}>Puppies</Text>
              <TextInput
                value={f2}
                onChangeText={(t) => setF2(t.replace(/[^0-9]/g, ''))}
                placeholder="e.g., 6"
                placeholderTextColor="#8A8A8A"
                style={m.input}
                keyboardType="number-pad"
              />
            </>
          )}

          <View style={m.row}>
            <Pressable style={[m.btn, { backgroundColor: '#e9e8e6ff' }]} onPress={() => setModal(null)}>
              <Text style={[m.btnText, { color: '#6E6E6E' }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[m.btn, { backgroundColor: colors.blue }]} onPress={saveModal}>
              <Text style={[m.btnText, { color: colors.white }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Reusable bits ---------- */

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function HealthRow({ left, right }: { left: string; right: string | number }) {
  return (
    <View style={[styles.row, { borderColor: colors.accent }]}>
      <Text style={styles.cellLeft} numberOfLines={1}>{left}</Text>
      <Text style={styles.cellRight} numberOfLines={1}>{right}</Text>
    </View>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <View style={[styles.row, { borderColor: colors.accent, opacity: 0.7 }]}>
      <Text style={[styles.cellLeft, { color: colors.label }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.cellRight, { color: colors.label }]} numberOfLines={1}>—</Text>
    </View>
  );
}

function IconBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button">
      <View style={styles.roundBtn}>
        <Ionicons name="add" size={16} color="#f8f7f4" />
      </View>
    </TouchableOpacity>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Header text block to the right (mirrors other screens)
  headerTopRow: {
    marginTop: -75,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  petName: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.4,
    color: colors.text,
  },
  petBreed: { fontSize: 12, color: '#6E6E6E', marginTop: 2 },

  pillWrap: { marginTop: 55, paddingHorizontal: 22 },
  pill: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 50,
    marginBottom: 45,
  },
  pillText: { fontWeight: '900', fontSize: 18, letterSpacing: 0.3 },

  sectionHeaderRow: {
    marginTop: 20,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#6E6E6E',
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  sectionPad: { paddingHorizontal: 22, marginTop: 10 },

  row: {
    height: 58,
    borderRadius: CARD_R,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cellLeft:  { flex: 1.2, fontWeight: '800', color: '#6E6E6E' },
  cellRight: { flex: 0.9, fontWeight: '700', color: '#6E6E6E', textAlign: 'right' },

  roundBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#73c3d1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  shadowCard: {
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  // Blob 
  blob: {
    position: 'absolute',
    left: -width * 0.10,
    top: BLOB_TOP, // -55
    width: width * 0.6,
    height: width * 0.6,
    borderBottomRightRadius: width,
    backgroundColor: colors.blue,
    alignSelf: 'flex-start',
  },
});

/* --- modal styles --- */
const m = StyleSheet.create({
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  card: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: colors.white,
    paddingTop: 16,
    paddingBottom: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    gap: 6,
  },
  title: { fontWeight: '900', fontSize: 16, marginBottom: 2 },
  label: { fontWeight: '800', fontSize: 12, color: '#6E6E6E', marginTop: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '700',
    color: colors.text,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'flex-end' },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  btnText: { fontWeight: '900' },
});
