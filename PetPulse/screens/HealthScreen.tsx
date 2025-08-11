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

export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const padBottom = NAV_H + Math.max(insets.bottom, NAV_MARGIN) + 16;

  // tiny local state demo (you can wire to storage later)
  const [meds, setMeds] = useState(['', '', '']);
  const addMed = () => setMeds(prev => [...prev, '']);

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
            {/* Page header (name at right) */}
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


            {/* MEDICATION */}
            <SectionHeader title="MEDICATION">
              <TouchableOpacity onPress={addMed} accessibilityRole="button">
                <View style={styles.roundBtn}>
                  <Ionicons name="add" size={16} color={colors.white} />
                </View>
              </TouchableOpacity>
            </SectionHeader>
            <View style={styles.sectionPad}>
              {meds.map((v, i) => (
                <InputRow
                  key={i}
                  placeholder="MED NAME"
                  value={v}
                  onChangeText={t => {
                    const copy = meds.slice();
                    copy[i] = t;
                    setMeds(copy);
                  }}
                />
              ))}
            </View>

            {/* HEAT TRACKER */}
            <SectionHeader title="HEAT TRACKER" />
            <View style={styles.sectionPad}>
              <InputPair leftPlaceholder="1ST HEAT" rightPlaceholder="DATE" />
              <InputPair leftPlaceholder="2ND HEAT" rightPlaceholder="DATE" />
            </View>

            {/* PREGNANCY */}
            <SectionHeader title="PREGNANCY" />
            <View style={styles.sectionPad}>
              <InputPair leftPlaceholder="NO" rightPlaceholder="DATE" />
            </View>

            {/* VET VISITS */}
            <SectionHeader title="VET VISITS" />
            <View style={styles.sectionPad}>
              <InputPair leftPlaceholder="DATE:" rightPlaceholder="INFO" />
              <InputPair leftPlaceholder="DATE:" rightPlaceholder="INFO" />
              <InputPair leftPlaceholder="DATE:" rightPlaceholder="INFO" />
            </View>

            {/* VACCINATIONS */}
            <SectionHeader title="VACCINATIONS" />
            <View style={styles.sectionPad}>
              <InputPair leftPlaceholder="DATE:" rightPlaceholder="INFO" />
              <InputPair leftPlaceholder="DATE:" rightPlaceholder="INFO" />
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

function InputRow({
  value,
  onChangeText,
  placeholder,
}: {
  value?: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={[styles.inputRow, { borderColor: colors.accent }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.label}
        style={styles.input}
      />
    </View>
  );
}

function InputPair({
  leftPlaceholder,
  rightPlaceholder,
}: {
  leftPlaceholder: string;
  rightPlaceholder: string;
}) {
  return (
    <View style={styles.pairRow}>
      <View style={[styles.inputRow, styles.flex1, { borderColor: colors.accent, marginRight: 10 }]}>
        <TextInput placeholder={leftPlaceholder} placeholderTextColor={colors.label} style={styles.input} />
      </View>
      <View style={[styles.inputRow, styles.flex1, { borderColor: colors.accent, marginLeft: 10 }]}>
        <TextInput placeholder={rightPlaceholder} placeholderTextColor={colors.label} style={styles.input} />
      </View>
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
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.4,
    color: colors.text,
  },
  petBreed: { fontSize: 12, color: '#888', marginTop: 2 },

  pillWrap: { marginTop: 55, paddingHorizontal: 22 },
  pill: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 50,
  },
  pillText: { fontWeight: '900', fontSize: 18, letterSpacing: 0.3 },

 

  sectionHeaderRow: {
    marginTop: 45,
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

  pairRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  flex1: { flex: 1 },

  roundBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#73C3D1',
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
