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
import { useNavigation } from '@react-navigation/native';

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

export default function UserSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const padBottom = NAV_H + Math.max(insets.bottom, NAV_MARGIN) + 24;

  const [fullName, setFullName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [age, setAge]           = useState('');
  const [gender, setGender]     = useState<'Female' | 'Male' | 'Other' | ''>('');

  const onSave = () => {
    // TODO: Save logic here
    navigation.navigate('PetProfileScreen');
  };

  const onResetPassword = () => {
    // TODO: Reset password flow here
  };

  const onLogout = () => {
    // TODO: Add real logout/auth clear here
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left','right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: padBottom }} keyboardShouldPersistTaps="handled">
          
          {/* Header */}
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName}>WELCOME BACK,{'\n'}USER</Text>
          </View>

          {/* Pill */}
          <View style={styles.pillWrap}>
            <View style={[styles.pill, styles.cardShadow]}>
              <Text style={[styles.pillText, { color: colors.accent }]}>ACCOUNT SETTINGS</Text>
            </View>
          </View>

          {/* PROFILE INFO */}
          <SectionLabel label="PROFILE" />
          <View style={styles.sectionPad}>
            <LabeledInputRow label="FULL NAME" value={fullName} onChangeText={setFullName} />
            <LabeledInputRow label="USERNAME"  value={userName} onChangeText={setUserName} autoCapitalize="none" />
            <LabeledInputRow label="AGE"       value={age} onChangeText={(t)=>setAge(t.replace(/[^0-9]/g,''))} keyboardType="number-pad" />
            <GenderRow value={gender} onChange={setGender} />
          </View>

          {/* CONTACT */}
          <SectionLabel label="CONTACT" />
          <View style={styles.sectionPad}>
            <LabeledInputRow label="EMAIL" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <LabeledInputRow label="PHONE" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>

          {/* SECURITY */}
          <SectionLabel label="SECURITY" />
          <View style={styles.sectionPad}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onResetPassword}
              style={[styles.row, { borderColor: colors.accent }]}
              accessibilityRole="button"
            >
              <Text style={styles.cellLeft}>RESET PASSWORD</Text>
              <Ionicons name="chevron-forward" size={18} color="#8A8A8A" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onLogout}
              style={[styles.row, { borderColor: colors.accent }]}
              accessibilityRole="button"
            >
              <Text style={[styles.cellLeft, { color: colors.accent }]}>LOG OUT</Text>
              <Ionicons name="log-out-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
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
  return (
    <Text style={styles.sectionLabel}>{label}</Text>
  );
}

function LabeledInputRow({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={[styles.row, { borderColor: colors.accent }]}>
      <Text style={styles.cellLeft}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={colors.label}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
        style={styles.cellInputRight}
      />
    </View>
  );
}

function GenderRow({
  value,
  onChange,
}: {
  value: 'Female' | 'Male' | 'Other' | '';
  onChange: (g: 'Female' | 'Male' | 'Other') => void;
}) {
  return (
    <View style={[styles.row, { borderColor: colors.accent, justifyContent: 'space-between' }]}>
      <Text style={styles.cellLeft}>GENDER</Text>
      <View style={styles.genderWrap}>
        {(['Female','Male','Other'] as const).map(g => {
          const active = value === g;
          return (
            <TouchableOpacity
              key={g}
              onPress={() => onChange(g)}
              activeOpacity={0.85}
              style={[styles.genderChip, active && styles.genderChipActive]}
            >
              <Text style={[styles.genderText, active && styles.genderTextActive]}>{g}</Text>
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
  headerSub: { fontSize: 12, color: '#6E6E6E', marginTop: 2, textAlign: 'right' },

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
    height: 58,
    borderRadius: ROW_R,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cellLeft:  { flex: 1.2, fontWeight: '800', color: '#6E6E6E' },
  cellInputRight: {
    flex: 0.9,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },

  genderWrap: { flexDirection: 'row', gap: 8 },
  genderChip: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  genderChipActive: {
    backgroundColor: colors.grey,
    borderWidth: 1.5,
    borderColor: colors.blue,
  },
  genderText: { fontWeight: '800', color: '#6E6E6E', fontSize: 12 },
  genderTextActive: { color: colors.text },

  saveBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: colors.blue,
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