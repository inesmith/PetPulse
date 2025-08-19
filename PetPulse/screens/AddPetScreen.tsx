// screens/AddPetScreen.tsx
import React, { useMemo, useState } from 'react';
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
  Image,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { config } from '../gluestack-ui.config';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { uploadPetImage } from '../services/storage';
import { usePets } from '../context/PetContext';

const { width } = Dimensions.get('window');

const colors = {
  blue:   (config as any)?.theme?.colors?.blue  ?? '#73C3D1',
  white:  (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o     ?? '#EE734A',
  text:   (config as any)?.theme?.colors?.text  ?? '#1C1C1C',
  grey:   '#e9e8e6ff',
  label:  '#6E6E6E',
};

const ROW_R = 18;
const PHOTO_SIDE = 96;

export default function AddPetScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { setSelectedPetId } = usePets();

  const padBottom = 64 + Math.max(insets.bottom, 8) + 24;

  // Form state
  const [name, setName]               = useState('');
  const [breed, setBreed]             = useState('');
  const [dob, setDob]                 = useState(''); // YYYY-MM-DD
  const [height, setHeight]           = useState('');
  const [weight, setWeight]           = useState('');
  const [size, setSize]               = useState<'XS'|'S'|'M'|'L'|'XL'|''>('');
  const [colour, setColour]           = useState('');
  const [gender, setGender]           = useState<'Female'|'Male'|'Other'|''>('');
  const [hasChip, setHasChip]         = useState<'Yes'|'No'|''>('');
  const [chipDetails, setChipDetails] = useState('');
  const [notes, setNotes]             = useState('');

  // Photo
  const [photoURL, setPhotoURL]     = useState<string | null>(null);
  const [photoLocal, setPhotoLocal] = useState<string | null>(null);

  // Popups
  const [photoMenuOpen, setPhotoMenuOpen]         = useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen]   = useState(false);

  const [saving, setSaving] = useState(false);

  const headerName = useMemo(() => 'ADD YOUR PET', []);

  // ImagePicker (new API)
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to change your pet picture.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!res.canceled && res.assets?.[0]?.uri) {
      setPhotoLocal(res.assets[0].uri);
    }
  };

  const onSave = async () => {
    if (!user?.uid) return;
    if (saving) return;

    const payload = {
      name: name.trim(),
      breed: breed.trim(),
      dob: dob.trim(),
      height: height.trim(),
      weight: weight.trim(),
      size: size || '',
      colour: colour.trim(),
      gender: gender || '',
      hasChip: hasChip === 'Yes',
      chipDetails: hasChip === 'Yes' ? chipDetails.trim() : '',
      notes: notes.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!payload.name) {
      Alert.alert('Missing info', 'Please enter your pet’s name.');
      return;
    }

    setSaving(true);
    try {
      const newId = Date.now().toString();

      let photoFields: Record<string, any> = {};
      if (photoLocal) {
        const { url, path } = await uploadPetImage(user.uid, newId, photoLocal);
        photoFields = { photoURL: url, photoPath: path };
        setPhotoURL(url);
      }

      await setDoc(doc(db, 'users', user.uid, 'pets', newId), { ...payload, ...photoFields }, { merge: true });

      setSelectedPetId(newId);
      Alert.alert('Saved', 'Pet created.');
      navigation.goBack();
    } catch (e: any) {
      console.log('ADD PET ERROR:', e?.code, e?.message, e);
      Alert.alert('Save failed', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasAnyPhoto = !!(photoLocal || photoURL);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left','right']}>
      
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: padBottom }} keyboardShouldPersistTaps="handled">
          {/* Blob  */}
          <View style={styles.blob} pointerEvents="none" />

          {/* Header  */}
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName}>{headerName}</Text>
          </View>

          {/* Profile photo  */}
          <View style={styles.sectionPad}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setPhotoMenuOpen(true)}
              style={styles.photoFrame}
            >
              {hasAnyPhoto ? (
                <Image source={{ uri: (photoLocal ?? photoURL) as string }} style={styles.photoImg} />
              ) : (
                <View style={[styles.photoImg, styles.photoPlaceholder]}>
                  <Text style={{ fontWeight: '900', color: colors.blue }}>ADD PHOTO</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Pill */}
          <View style={styles.pillWrap}>
            <View style={[styles.pill, styles.cardShadow]}>
              <Text style={[styles.pillText, { color: colors.accent }]}>PROFILE DETAILS</Text>
            </View>
          </View>

          {/* Identity */}
          <SectionLabel label="IDENTITY" />
          <View style={styles.sectionPad}>
            <LabeledInputRow label="NAME"  value={name}  onChangeText={setName} />
            <LabeledInputRow label="BREED" value={breed} onChangeText={setBreed} />
            <LabeledInputRow
              label="DATE OF BIRTH"
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD (recommended)"
              autoCapitalize="none"
            />
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
            <ChipRow
              label="SIZE"
              options={['XS','S','M','L','XL'] as const}
              value={size}
              onChange={(v)=>setSize(v)}
            />
            <LabeledInputRow label="COLOUR" value={colour} onChangeText={setColour} />
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

          {/* Notes */}
          <SectionLabel label="NOTES" />
          <View style={styles.sectionPad}>
            <View style={[styles.row, { borderColor: colors.accent, alignItems: 'flex-start' }]}>
              <Text style={[styles.cellLeft, { marginTop: 14 }]}>NOTES</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything important about your pet..."
                placeholderTextColor={colors.label}
                style={[styles.cellInputRight, { minHeight: 100, textAlign: 'left' }]}
                multiline
              />
            </View>
          </View>

          {/* Save */}
          <View style={styles.sectionPad}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onSave}
              style={[styles.saveBtn, styles.cardShadow, saving && { opacity: 0.6 }]}
              disabled={saving}
            >
              {saving ? <ActivityIndicator /> : <Text style={styles.saveText}>Create Pet</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Photo menu modal */}
      <Modal
        visible={photoMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoMenuOpen(false)}
      >
        <View style={m.overlay}>
          <View style={[m.card, styles.cardShadow]}>
            <Text style={m.title}>Photo</Text>

            {hasAnyPhoto && (
              <Pressable
                style={m.item}
                onPress={() => { setPhotoMenuOpen(false); setPhotoPreviewOpen(true); }}
              >
                <Text style={m.itemText}>View Image</Text>
              </Pressable>
            )}

            <Pressable
              style={m.item}
              onPress={async () => { setPhotoMenuOpen(false); await pickImage(); }}
            >
              <Text style={m.itemText}>{hasAnyPhoto ? 'Upload New Image' : 'Upload Image'}</Text>
            </Pressable>

            <Pressable style={[m.item, m.cancel]} onPress={() => setPhotoMenuOpen(false)}>
              <Text style={[m.itemText, { color: '#6E6E6E' }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Fullscreen preview */}
      <Modal
        visible={photoPreviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPreviewOpen(false)}
      >
        <View style={pv.overlay}>
          <Pressable style={pv.backdrop} onPress={() => setPhotoPreviewOpen(false)} />
          <View style={[pv.inner, styles.cardShadow]}>
            {hasAnyPhoto ? (
              <Image source={{ uri: (photoLocal ?? photoURL) as string }} style={pv.previewImg} />
            ) : (
              <View style={[pv.previewImg, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontWeight: '900', color: colors.blue }}>NO IMAGE</Text>
              </View>
            )}
            <TouchableOpacity style={pv.closeBtn} onPress={() => setPhotoPreviewOpen(false)}>
              <Text style={pv.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  headerTextWrap: { marginTop: 125, alignItems: 'flex-end', paddingHorizontal: 22 },
  headerName: { fontSize: 26, fontWeight: '900', letterSpacing: 0.4, color: colors.text, textAlign: 'right', lineHeight: 28 },

  // Blob 
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

  /* Photo */
  photoFrame: {
    width: PHOTO_SIDE,
    height: PHOTO_SIDE,
    borderRadius: PHOTO_SIDE / 2,
    overflow: 'hidden',
    backgroundColor: colors.grey,
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginLeft: 10,
    marginTop: -105, 
  },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  pillWrap: { marginTop: 24, paddingHorizontal: 22 },
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
  cellInputRight: { flex: 0.9, fontWeight: '700', color: colors.text, textAlign: 'right', paddingVertical: 10 },

  chipsWrap: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  chipActive: { backgroundColor: colors.grey, borderWidth: 1.5, borderColor: colors.accent },
  chipText: { fontWeight: '800', color: '#6E6E6E', fontSize: 12 },
  chipTextActive: { color: colors.blue },

  saveBtn: { height: 54, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.blue, fontWeight: '900', fontSize: 16, letterSpacing: 0.3 },

  cardShadow: {
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', borderRadius: 16, backgroundColor: '#fff', padding: 12 },
  title: { fontWeight: '900', fontSize: 16, marginBottom: 6, color: '#1C1C1C' },
  item: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10 },
  itemText: { fontWeight: '800', color: '#1C1C1C' },
  cancel: { backgroundColor: '#F4F4F4', marginTop: 4, alignItems: 'center' },
});

const pv = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  inner: { width: width - 44, borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden' },
  previewImg: { width: '100%', height: (width - 44) * 1.05 },
  closeBtn: { paddingVertical: 12, alignItems: 'center', backgroundColor: '#F4F4F4' },
  closeText: { fontWeight: '900', color: '#1C1C1C' },
});
