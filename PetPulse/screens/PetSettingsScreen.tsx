// screens/PetSettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, Image, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { config } from '../gluestack-ui.config';
import { useAuth } from '../context/AuthContext';
import { usePets } from '../context/PetContext';
import { db } from '../firebase';
import { doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { uploadPetImage } from '../services/storage';

const { width } = Dimensions.get('window');
const colors = {
  blue: (config as any)?.theme?.colors?.blue ?? '#73C3D1',
  white: (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o ?? '#EE734A',
  text: (config as any)?.theme?.colors?.text ?? '#1C1C1C',
  grey: '#e9e8e6ff',
  label: '#6E6E6E',
};
const NAV_H = 64; const NAV_MARGIN = 8; const ROW_R = 18;

export default function PetSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const padBottom = NAV_H + Math.max(insets.bottom, NAV_MARGIN) + 24;

  const { user } = useAuth();
  const { selectedPet, selectedPetId, setSelectedPetId } = usePets();

  // Form state
  const [name, setName]           = useState('');
  const [breed, setBreed]         = useState('');
  const [dob, setDob]             = useState('');
  const [height, setHeight]       = useState('');
  const [weight, setWeight]       = useState('');
  const [size, setSize]           = useState<'XS'|'S'|'M'|'L'|'XL'|''>('');
  const [colour, setColour]       = useState('');
  const [gender, setGender]       = useState<'Female'|'Male'|'Other'|''>('');
  const [hasChip, setHasChip]     = useState<'Yes' | 'No' | ''>('');
  const [chipDetails, setChipDetails] = useState('');
  const [photoURL, setPhotoURL]   = useState<string | undefined>(undefined);
  const [photoLocal, setPhotoLocal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load selected pet into form (if editing)
  useEffect(() => {
    if (!selectedPet) return;
    setName(selectedPet.name ?? '');
    setBreed(selectedPet.breed ?? '');
    setDob(selectedPet.dob ?? '');
    setHeight((selectedPet.height ?? '').toString());
    setWeight((selectedPet.weight ?? '').toString());
    setSize((selectedPet.size as any) ?? '');
    setColour(selectedPet.colour ?? '');
    setGender((selectedPet.gender as any) ?? '');
    setHasChip(selectedPet.hasChip === true ? 'Yes' : selectedPet.hasChip === false ? 'No' : '');
    setChipDetails(selectedPet.chipDetails ?? '');
    setPhotoURL(selectedPet.photoURL ?? undefined);
    setPhotoLocal(null);
  }, [selectedPet?.id]); // rehydrate whenever the selected pet changes

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos to pick a pet picture.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets && res.assets[0]?.uri) {
      setPhotoLocal(res.assets[0].uri);
    }
  };

  const onSave = async () => {
    if (!user?.uid) return;
    const uid = user.uid;

    if (!name.trim()) {
      Alert.alert('Missing info', 'Please enter your pet’s name.');
      return;
    }

    // Determine final pet id to write to (avoid setState races)
    let finalPetId = selectedPetId;
    if (!finalPetId) {
      const primaryRef = doc(db, 'users', uid, 'pets', 'primary');
      const existingPrimary = await getDoc(primaryRef);
      if (existingPrimary.exists()) {
        finalPetId = Date.now().toString();
      } else {
        finalPetId = 'primary';
      }
    }

    const keepChip = hasChip === 'Yes';
    const payload: any = {
      name: name.trim(),
      breed: breed.trim(),
      dob: dob.trim(),
      height: height.trim(),
      weight: weight.trim(),
      size: size || '',
      colour: colour.trim(),
      gender: gender || '',
      hasChip: hasChip === 'Yes' ? true : hasChip === 'No' ? false : null,
      chipDetails: keepChip ? chipDetails.trim() : '',
      updatedAt: serverTimestamp(),
    };

    setSaving(true);
    try {
      // Ensure doc exists with createdAt on first write
      await setDoc(
        doc(db, 'users', uid, 'pets', finalPetId!),
        { createdAt: serverTimestamp() },
        { merge: true }
      );

      // Upload photo if newly chosen, then include in payload
      if (photoLocal) {
        const { url, path } = await uploadPetImage(uid, finalPetId!, photoLocal);
        payload.photoURL = url;
        payload.photoPath = path;
        setPhotoURL(url);
      }

      // Save profile
      await setDoc(
        doc(db, 'users', uid, 'pets', finalPetId!),
        payload,
        { merge: true }
      );

      // Update selection only after successful save
      if (finalPetId !== selectedPetId) setSelectedPetId(finalPetId);

      Alert.alert('Saved', 'Your pet profile has been updated.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left','right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <ScrollView contentContainerStyle={{ paddingBottom: padBottom }} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName}>{name ? name.toUpperCase() : 'ADD PET'}</Text>
            {!!breed && <Text style={styles.headerSub}>{breed.toUpperCase()}</Text>}
          </View>

          {/* Photo */}
          <TouchableOpacity onPress={pickImage} activeOpacity={0.9} style={styles.photoPick}>
            {photoLocal || photoURL ? (
              <Image source={{ uri: photoLocal ?? photoURL! }} style={styles.photoImg} />
            ) : (
              <View style={[styles.photoImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9e8e6ff' }]}>
                <Text style={{ fontWeight: '900', color: colors.blue }}>ADD PHOTO</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Identity */}
          <SectionLabel label="IDENTITY" />
          <View style={styles.sectionPad}>
            <LabeledInputRow label="NAME"  value={name}  onChangeText={setName} />
            <LabeledInputRow label="BREED" value={breed} onChangeText={setBreed} />
            <LabeledInputRow label="DATE OF BIRTH" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" autoCapitalize="characters" />
          </View>

          {/* Measurements */}
          <SectionLabel label="MEASUREMENTS" />
          <View style={styles.sectionPad}>
            <LabeledInputRow label="HEIGHT (CM)" value={height} onChangeText={(t)=>setHeight(t.replace(/[^0-9.]/g,''))} keyboardType="number-pad" />
            <LabeledInputRow label="WEIGHT (KG)" value={weight} onChangeText={(t)=>setWeight(t.replace(/[^0-9.]/g,''))} keyboardType="number-pad" />
          </View>

          {/* Appearance & Gender */}
          <SectionLabel label="APPEARANCE" />
          <View style={styles.sectionPad}>
            <ChipRow label="SIZE" options={['XS','S','M','L','XL'] as const} value={size} onChange={setSize} />
            <LabeledInputRow label="COLOUR" value={colour} onChangeText={setColour} />
            <ChipRow label="GENDER" options={['Female','Male','Other'] as const} value={gender} onChange={setGender} />
          </View>

          {/* Microchip */}
          <SectionLabel label="MICROCHIP" />
          <View style={styles.sectionPad}>
            <ChipRow label="HAS CHIP" options={['Yes','No'] as const} value={hasChip} onChange={setHasChip} />
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
              style={[styles.saveBtn, styles.cardShadow, saving && { opacity: 0.6 }]}
              disabled={saving}
            >
              {saving ? <ActivityIndicator /> : <Text style={styles.saveText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function LabeledInputRow({
  label, value, onChangeText, keyboardType, autoCapitalize, placeholder,
}:{
  label:string; value:string; onChangeText:(t:string)=>void;
  keyboardType?:'default'|'email-address'|'number-pad'|'phone-pad';
  autoCapitalize?:'none'|'sentences'|'words'|'characters';
  placeholder?:string;
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
  label, options, value, onChange,
}:{ label:string; options: readonly T[]; value:T|''; onChange:(v:T)=>void; }) {
  return (
    <View style={[styles.row, { borderColor: colors.accent, justifyContent: 'space-between' }]}>
      <Text style={styles.cellLeft}>{label}</Text>
      <View style={styles.chipsWrap}>
        {options.map(opt => {
          const active = value === opt;
          return (
            <TouchableOpacity key={opt} onPress={()=>onChange(opt)} activeOpacity={0.85} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1},
  headerTextWrap:{marginTop:125, alignItems:'flex-end', paddingHorizontal:22},
  headerName:{fontSize:26, fontWeight:'900', letterSpacing:0.4, color:colors.text, textAlign:'right', lineHeight:28},
  headerSub:{fontSize:12, color:'#6E6E6E', marginTop:2, textAlign:'right'},

  photoPick:{ marginTop:16, alignSelf:'center', width: width-44, height: 220, borderRadius:16, overflow:'hidden' },
  photoImg:{ width:'100%', height:'100%' },

  sectionLabel:{ marginTop:18, color:'#6E6E6E', fontWeight:'900', paddingHorizontal:22, letterSpacing:0.2, marginBottom:10 },
  sectionPad:{ paddingHorizontal:22, marginTop:0 },

  row:{ minHeight:58, borderRadius:ROW_R, borderWidth:1.5, backgroundColor:'transparent', paddingHorizontal:16, marginBottom:12, flexDirection:'row', alignItems:'center' },
  cellLeft:{ flex:1.2, fontWeight:'800', color:'#6E6E6E' },
  cellInputRight:{ flex:0.9, fontWeight:'700', color:colors.text, textAlign:'right', paddingVertical:10 },

  chipsWrap:{ flexDirection:'row', gap:8 },
  chip:{ paddingHorizontal:12, height:34, borderRadius:17, borderWidth:0, alignItems:'center', justifyContent:'center', backgroundColor:'transparent' },
  chipActive:{ backgroundColor:colors.grey, borderWidth:1.5, borderColor:colors.accent },
  chipText:{ fontWeight:'800', color:'#6E6E6E', fontSize:12 },
  chipTextActive:{ color:colors.blue },

  saveBtn:{ height:54, borderRadius:16, backgroundColor:colors.white, alignItems:'center', justifyContent:'center' },
  saveText:{ color:colors.blue, fontWeight:'900', fontSize:16, letterSpacing:0.3 },
  cardShadow:{ shadowColor:'rgba(0,0,0,0.15)', shadowOpacity:1, shadowRadius:12, shadowOffset:{width:0,height:8}, elevation:6 },
});
