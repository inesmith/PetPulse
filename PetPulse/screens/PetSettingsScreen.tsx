// screens/PetSettingsScreen.tsx
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
import { useNavigation } from '@react-navigation/native';
import { config } from '../gluestack-ui.config';

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
const ROW_R = 18;

export default function PetSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const padBottom = NAV_H + Math.max(insets.bottom, NAV_MARGIN) + 24;

  // Form state
  const [name, setName]           = useState('');
  const [breed, setBreed]         = useState('');
  const [dob, setDob]             = useState(''); // e.g. 04 May 2024
  const [height, setHeight]       = useState(''); // cm
  const [weight, setWeight]       = useState(''); // kg
  const [size, setSize]           = useState<'XS' | 'S' | 'M' | 'L' | 'XL' | ''>('');
  const [colour, setColour]       = useState('');
  const [gender, setGender]       = useState<'Female' | 'Male' | 'Other' | ''>('');
  const [hasChip, setHasChip]     = useState<'Yes' | 'No' | ''>('');
  const [chipDetails, setChipDetails] = useState(''); // number / issuer, etc.

  const onSave = () => {
    // TODO: persist pet profile
    navigation.navigate('PetProfileScreen');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left','right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: padBottom }} keyboardShouldPersistTaps="handled">
          {/* Header (right-aligned to match app vibe) */}
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName}>LINA LARDI</Text>
            <Text style={styles.headerSub}>AMERICAN BULLDOG</Text>
          </View>

          {/* Pill */}
          <View style={styles.pillWrap}>
            <View style={[styles.pill, styles.cardShadow]}>
              <Text style={[styles.pillText, { color: colors.accent }]}>PROFILE SETTINGS</Text>
            </View>
          </View>

          {/* Identity */}
          <SectionLabel label="IDENTITY" />
          <View style={styles.sectionPad}>
            <LabeledInputRow label="NAME"  value={name}  onChangeText={setName} />
            <LabeledInputRow label="BREED" value={breed} onChangeText={setBreed} />
            <LabeledInputRow label="DATE OF BIRTH" value={dob} onChangeText={setDob} placeholder="DD MON YYYY" autoCapitalize="characters" />
          </View>

          {/* Measurements */}
          <SectionLabel label="MEASUREMENTS" />
          <View style={styles.sectionPad}>
            <LabeledInputRow
              label="HEIGHT (CM)"
              value={height}
              onChangeText={(t)=>setHeight(t.replace(/[^0-9.]/g,''))}
              keyboardType="number-pad"
              placeholder="e.g. 60"
            />
            <LabeledInputRow
              label="WEIGHT (KG)"
              value={weight}
              onChangeText={(t)=>setWeight(t.replace(/[^0-9.]/g,''))}
              keyboardType="number-pad"
              placeholder="e.g. 35"
            />
          </View>

          {/* Appearance & Gender */}
          <SectionLabel label="APPEARANCE" />
          <View style={styles.sectionPad}>
            {/* Size chips */}
            <ChipRow
              label="SIZE"
              options={['XS','S','M','L','XL'] as const}
              value={size}
              onChange={(v)=>setSize(v)}
            />
            <LabeledInputRow label="COLOUR" value={colour} onChangeText={setColour} />
            {/* Gender chips */}
            <ChipRow
              label="GENDER"
              options={['Female','Male','Other'] as const}
              value={gender}
              onChange={(v)=>setGender(v)}
            />
          </View>

          {/* Microchip */}
          <SectionLabel label="MICROCHIP" />
          <View style={styles.sectionPad}>
            <ChipRow
              label="HAS CHIP"
              options={['Yes','No'] as const}
              value={hasChip}
              onChange={(v)=>setHasChip(v)}
            />
            {hasChip === 'Yes' && (
              <LabeledInputRow
                label="CHIP DETAILS"
                value={chipDetails}
                onChangeText={setChipDetails}
                placeholder="Number / Registry / Notes"
                autoCapitalize="characters"
              />
            )}
          </View>

          {/* Save */}
          <View style={styles.sectionPad}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onSave}
              style={[styles.saveBtn, styles.cardShadow]}
            >
              <Text style={styles.saveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- Subcomponents ---------- */

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function LabeledInputRow({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  placeholder?: string;
}) {
  return (
    <View style={[styles.row, { borderColor: colors.accent }]}>
      <Text style={styles.cellLeft}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.label}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
        style={styles.cellInputRight}
      />
    </View>
  );
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T | '';
  onChange: (v: T) => void;
}) {
  return (
    <View style={[styles.row, { borderColor: colors.accent, justifyContent: 'space-between' }]}>
      <Text style={styles.cellLeft}>{label}</Text>
      <View style={styles.chipsWrap}>
        {options.map(opt => {
          const active = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              activeOpacity={0.85}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  safe: { flex: 1 },

  headerTextWrap: {
    marginTop: 125,
    alignItems: 'flex-end',
    paddingHorizontal: 22,
  },
  headerName: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.4,
    color: colors.text,
    textAlign: 'right',
    lineHeight: 28,
  },
  headerSub: {
    fontSize: 12,
    color: '#6E6E6E',
    marginTop: 2,
    textAlign: 'right',
  },

  pillWrap: { marginTop: 55, paddingHorizontal: 22 },
  pill: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 50,
    marginBottom: 32,
  },
  pillText: { fontWeight: '900', fontSize: 18, letterSpacing: 0.3 },

  sectionLabel: {
    marginTop: 18,
    color: '#6E6E6E',
    fontWeight: '900',
    paddingHorizontal: 22,
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  sectionPad: { paddingHorizontal: 22, marginTop: 0 },

  row: {
    minHeight: 58,
    borderRadius: ROW_R,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cellLeft: { flex: 1.2, fontWeight: '800', color: '#6E6E6E' },

  cellInputRight: {
    flex: 0.9,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
    paddingVertical: 10,
  },

  chipsWrap: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    borderWidth: 0,              // only the active chip gets a border
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: colors.grey,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  chipText: { fontWeight: '800', color: '#6E6E6E', fontSize: 12 },
  chipTextActive: { color: colors.text },

  saveBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: colors.accent,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.3,
  },

  cardShadow: {
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
