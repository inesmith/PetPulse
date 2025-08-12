// screens/HealthScreen.tsx
import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';

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

/* Data to render rows (left label | right value) */
const HEAT = [
  { id: 1, left: '1ST HEAT', right: 'DATE' },
  { id: 2, left: '2ND HEAT', right: 'DATE' },
  { id: 3, left: '3RD HEAT', right: 'DATE' },
];

const PREGNANCY = [{ id: 1, left: 'STATUS', right: 'NO' }];

const VET_VISITS = [
  { id: 1, left: 'DATE', right: 'INFO' },
  { id: 2, left: 'DATE', right: 'INFO' },
  { id: 3, left: 'DATE', right: 'INFO' },
];

const VACCINATIONS = [
  { id: 1, left: 'NAME', right: 'DATE' },
  { id: 2, left: 'NAME', right: 'DATE' },
  { id: 3, left: 'NAME', right: 'DATE' },
];

type PregEntry = { id: number; date: string; pups: string };

export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const padBottom = NAV_H + Math.max(insets.bottom, NAV_MARGIN) + 16;

  // Medication stays editable
  const [meds, setMeds] = useState(['', '', '']);
  const addMed = () => setMeds(prev => [...prev, '']);

  // Stubs for other add buttons – wire up later
  const addHeat = () => {};
  const addPregnancy = () => {};
  const addVetVisit = () => {};
  const addVaccination = () => {};

  // Pregnancy history (editable rows: DATE | PUPPIES)
  const [pregHistory, setPregHistory] = useState<PregEntry[]>([]);
  const addPregHistory = () =>
    setPregHistory(prev => [...prev, { id: Date.now(), date: '', pups: '' }]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left','right']}>
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
            {/* Header (name at right) */}
            <View style={styles.headerTopRow}>
              <View />
              <View style={{ alignItems: 'flex-end', paddingRight: 22 }}>
                <Text style={styles.petName}>LINA LARDI</Text>
                <Text style={styles.petBreed}>American Bulldog</Text>
              </View>
            </View>

            {/* Pill */}
            <View style={styles.pillWrap}>
              <View style={[styles.pill, styles.shadowCard]}>
                <Text style={[styles.pillText, { color: colors.accent }]}>HEALTH LOGS</Text>
              </View>
            </View>

            {/* MEDICATION (inputs) */}
            <SectionHeader title="MEDICATION">
              <TouchableOpacity onPress={addMed} accessibilityRole="button">
                <View style={styles.roundBtn}>
                  <Ionicons name="add" size={16} color="#f8f7f4" />
                </View>
              </TouchableOpacity>
            </SectionHeader>
            <View style={styles.sectionPad}>
              {meds.map((v, i) => (
                <View key={i} style={[styles.inputRow, { borderColor: colors.accent }]}>
                  <TextInput
                    value={v}
                    onChangeText={t => {
                      const copy = meds.slice();
                      copy[i] = t;
                      setMeds(copy);
                    }}
                    placeholder="MED NAME"
                    placeholderTextColor={colors.label}
                    style={styles.input}
                  />
                </View>
              ))}
            </View>

            {/* VET VISITS (rows) */}
            <SectionHeader title="VET VISITS">
              <TouchableOpacity onPress={addVetVisit} accessibilityRole="button">
                <View style={styles.roundBtn}>
                  <Ionicons name="add" size={16} color="#f8f7f4" />
                </View>
              </TouchableOpacity>
            </SectionHeader>
            <View style={styles.sectionPad}>
              {VET_VISITS.map(r => (
                <HealthRow key={r.id} left={r.left} right={r.right} />
              ))}
            </View>

            {/* VACCINATIONS (rows) */}
            <SectionHeader title="VACCINATIONS">
              <TouchableOpacity onPress={addVaccination} accessibilityRole="button">
                <View style={styles.roundBtn}>
                  <Ionicons name="add" size={16} color="#f8f7f4" />
                </View>
              </TouchableOpacity>
            </SectionHeader>
            <View style={styles.sectionPad}>
              {VACCINATIONS.map(r => (
                <HealthRow key={r.id} left={r.left} right={r.right} />
              ))}
            </View>

            {/* HEAT TRACKER (rows) */}
            <SectionHeader title="HEAT TRACKER">
              <TouchableOpacity onPress={addHeat} accessibilityRole="button">
                <View style={styles.roundBtn}>
                  <Ionicons name="add" size={16} color="#f8f7f4" />
                </View>
              </TouchableOpacity>
            </SectionHeader>
            <View style={styles.sectionPad}>
              {HEAT.map(r => (
                <HealthRow key={r.id} left={r.left} right={r.right} />
              ))}
            </View>

            {/* PREGNANCY (rows) */}
            <SectionHeader title="PREGNANCY">
              <TouchableOpacity onPress={addPregnancy} accessibilityRole="button">
                <View style={styles.roundBtn}>
                  <Ionicons name="add" size={16} color="#f8f7f4" />
                </View>
              </TouchableOpacity>
            </SectionHeader>
            <View style={styles.sectionPad}>
              {PREGNANCY.map(r => (
                <HealthRow key={r.id} left={r.left} right={r.right} />
              ))}
            </View>

            {/* PREGNANCY HISTORY (editable rows: DATE | PUPPIES) */}
            <SectionHeader title="PREGNANCY HISTORY">
              <TouchableOpacity onPress={addPregHistory} accessibilityRole="button">
                <View style={styles.roundBtn}>
                  <Ionicons name="add" size={16} color="#f8f7f4" />
                </View>
              </TouchableOpacity>
            </SectionHeader>
            <View style={styles.sectionPad}>
              {pregHistory.map((e, idx) => (
                <EditablePairRow
                  key={e.id}
                  leftPlaceholder="DATE"
                  rightPlaceholder="PUPPIES"
                  leftValue={e.date}
                  rightValue={e.pups}
                  onLeftChange={(t) => {
                    const copy = [...pregHistory];
                    copy[idx] = { ...copy[idx], date: t };
                    setPregHistory(copy);
                  }}
                  onRightChange={(t) => {
                    const copy = [...pregHistory];
                    copy[idx] = { ...copy[idx], pups: t.replace(/[^0-9]/g, '') };
                    setPregHistory(copy);
                  }}
                />
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Sticky floating nav */}
        <BottomNavBar />
      </View>
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

function EditablePairRow({
  leftPlaceholder,
  rightPlaceholder,
  leftValue,
  rightValue,
  onLeftChange,
  onRightChange,
}: {
  leftPlaceholder: string;
  rightPlaceholder: string;
  leftValue: string;
  rightValue: string;
  onLeftChange: (t: string) => void;
  onRightChange: (t: string) => void;
}) {
  return (
    <View style={[styles.row, { borderColor: colors.accent }]}>
      <TextInput
        value={leftValue}
        onChangeText={onLeftChange}
        placeholder={leftPlaceholder}
        placeholderTextColor={colors.label}
        style={styles.cellInputLeft}
      />
      <TextInput
        value={rightValue}
        onChangeText={onRightChange}
        placeholder={rightPlaceholder}
        placeholderTextColor={colors.label}
        keyboardType="number-pad"
        style={styles.cellInputRight}
      />
    </View>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  safe: { flex: 1 },

  headerTopRow: {
    marginTop: 125,
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

  /* Inputs (Medication) */
  inputRow: {
    height: 52,
    borderRadius: CARD_R,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    marginBottom: 12,
    justifyContent: 'center',
  },
  input: { fontWeight: '800', fontSize: 14, color: colors.text },

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

  // Inputs that live inside a row (for Pregnancy History)
  cellInputLeft: {
    flex: 1.2,
    fontWeight: '800',
    color: colors.text,
  },
  cellInputRight: {
    flex: 0.9,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },

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
});
