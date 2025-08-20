// screens/UserSettingsScreen.tsx
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
  Alert,
  ActivityIndicator,
  StatusBar, 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../gluestack-ui.config';
import { useNavigation } from '@react-navigation/native';
import { logoutUser } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import {
  doc,
  onSnapshot,
  setDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import {
  updateEmail,
  updateProfile,
} from 'firebase/auth';

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

// Match PetNav blob placement exactly
const BLOB_TOP = -55;

function slugUsername(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._ -]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default function UserSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const padBottom = NAV_H + Math.max(insets.bottom, NAV_MARGIN) + 24;

  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [age, setAge]           = useState('');
  const [gender, setGender]     = useState<'Female' | 'Male' | 'Other' | ''>('');

  // Keep a copy to detect changes
  const [initialUsername, setInitialUsername] = useState<string>('');
  const [initialEmail, setInitialEmail]       = useState<string>('');

  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = (snap.data() || {}) as {
          displayName?: string;
          username?: string;
          email?: string;
          phone?: string;
          age?: string | number;
          gender?: 'Female' | 'Male' | 'Other' | '';
        };

        const displayName = (data.displayName ?? user.displayName ?? '').trim();
        const username    = (data.username ?? displayName ?? (user.email?.split('@')[0] ?? '')).toString();
        const theEmail    = (data.email ?? user.email ?? '').toString();

        setFullName(displayName);
        setUserName(username);
        setEmail(theEmail);
        setPhone((data.phone ?? '').toString());
        setAge((data.age ?? '').toString());
        setGender((data.gender ?? '') as any);

        setInitialUsername(username);
        setInitialEmail(theEmail);

        setLoading(false);
      },
      (err) => {
        console.error('onSnapshot(users) error:', err);
        Alert.alert('Error', 'Could not load your profile.');
        setLoading(false);
      }
    );
    return unsub;
  }, [user?.uid]);

  const headerGreeting = useMemo(() => {
    const n = fullName || userName || (email ? email.split('@')[0] : 'USER');
    return n.toUpperCase();
  }, [fullName, userName, email]);

  const onSave = async () => {
    if (!user?.uid) return;
    if (saving) return;

    const trimmedFullName = fullName.trim();
    const trimmedUserName = userName.trim();
    const trimmedEmail    = email.trim().toLowerCase();

    if (!trimmedFullName || !trimmedUserName || !trimmedEmail) {
      Alert.alert('Missing info', 'Full name, username, and email are required.');
      return;
    }

    const newSlug = slugUsername(trimmedUserName);
    const oldSlug = slugUsername(initialUsername);
    if (!newSlug) {
      Alert.alert('Invalid username', 'Use letters, numbers, ".", "_" or "-".');
      return;
    }
    if (newSlug.length < 3 || newSlug.length > 30) {
      Alert.alert('Invalid username', 'Username must be 3–30 characters.');
      return;
    }

    setSaving(true);
    try {
      // usernames mapping
      if (newSlug !== oldSlug) {
        await runTransaction(db, async (tx) => {
          const newRef = doc(db, 'usernames', newSlug);
          const newSnap = await tx.get(newRef);

          if (newSnap.exists() && (newSnap.data() as any).uid !== user.uid) {
            throw new Error('That username is taken. Please choose another.');
          }
          tx.set(newRef, { uid: user.uid });
          if (oldSlug) {
            const oldRef = doc(db, 'usernames', oldSlug);
            tx.delete(oldRef);
          }
        });
      }

      // Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: trimmedFullName || trimmedUserName });
      }

      // Auth email
      if (trimmedEmail !== initialEmail) {
        try {
          if (!auth.currentUser) throw new Error('Not signed in');
          await updateEmail(auth.currentUser, trimmedEmail);
        } catch (e: any) {
          if (e?.code === 'auth/requires-recent-login') {
            Alert.alert('Re-authentication needed', 'For security, please log in again to change your email.');
            throw e;
          } else {
            throw e;
          }
        }
      }

      // Firestore profile
      await setDoc(
        doc(db, 'users', user.uid),
        {
          displayName: trimmedFullName,
          username: newSlug,
          email: auth.currentUser?.email ?? trimmedEmail,
          phone: phone.trim(),
          age: age.trim(),
          gender: gender || '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (auth.currentUser) {
        try { await auth.currentUser.reload(); } catch {}
      }

      setInitialUsername(trimmedUserName);
      setInitialEmail(auth.currentUser?.email ?? trimmedEmail);
      setFullName(trimmedFullName);
      setUserName(trimmedUserName);
      setEmail(auth.currentUser?.email ?? trimmedEmail);

      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: any) {
      console.log('SAVE ERROR:', e?.code, e?.message, e);
      Alert.alert('Save failed', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onResetPassword = () => {
    Alert.alert('Coming soon', 'Password reset is available from the Login screen.');
  };

  const onLogout = async () => {
    if (loggingOut) return;
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true);
            await logoutUser();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not log out. Try again.');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left','right']}>
      {/*  Remove Android “top white” and draw content under the status bar */}
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: padBottom }} keyboardShouldPersistTaps="handled">
          {/* Blob */}
          <View style={styles.blob} pointerEvents="none" />

          {/* Header */}
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName}>
              WELCOME BACK,{'\n'}{loading ? '…' : headerGreeting}
            </Text>
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
              disabled={loggingOut}
            >
              <Text style={[styles.cellLeft, { color: colors.accent }]}>
                {loggingOut ? 'LOGGING OUT…' : 'LOG OUT'}
              </Text>
              {loggingOut
                ? <ActivityIndicator />
                : <Ionicons name="log-out-outline" size={18} color={colors.accent} />
              }
            </TouchableOpacity>
          </View>

          {/* Save */}
          <View style={styles.sectionPad}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onSave}
              style={[styles.saveBtn, styles.cardShadow, saving && { opacity: 0.6 }]}
              disabled={saving || loggingOut}
            >
              {saving ? <ActivityIndicator /> : <Text style={styles.saveText}>Save Changes</Text>}
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

  // 🔵 Blob aligned with PetNav (same geometry)
  blob: {
    position: 'absolute',
    left: -width * 0.10,
    top: -30,        
    width: width * 0.6,
    height: width * 0.6,
    borderBottomRightRadius: width,
    backgroundColor: colors.blue,
    alignSelf: 'flex-start',
  },

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
    borderColor: colors.accent,
  },
  genderText: { fontWeight: '800', color: '#6E6E6E', fontSize: 12 },
  genderTextActive: { color: colors.blue },

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
