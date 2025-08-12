// screens/PetProfileScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, KeyboardAvoidingView, Platform, TextInput, ScrollView, TouchableOpacity, } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';
import { useNavigation } from '@react-navigation/native';

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
// Lock the name pill height so the settings square can match it.
const NAME_H = 72;
const NAME_GAP = 6;

export default function PetProfileScreen() {
  const nav = useNavigation<any>();
  const [notes, setNotes] = useState('');
  const [reminders, setReminders] = useState([{ id: 1 }, { id: 2 }, { id: 3 }]);
  const insets = useSafeAreaInsets();

  const contentBottomPad = NAV_HEIGHT + Math.max(insets.bottom, NAV_MARGIN) + 16;

  const handleAddReminder = () => {
    setReminders(prev => [...prev, { id: prev.length + 1 }]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left', 'right']}>
      <View style={[styles.container, { backgroundColor: colors.white }]}>
        {/* Content scrolls; navbar is a sibling and stays fixed */}
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
              {/* Name pill */}
              <View style={[styles.nameCard, styles.shadow]}>
                <View>
                  <Text style={[styles.petName, { color: colors.blue }]}>LINA LARDI</Text>
                  <Text style={[styles.petBreed, { color: colors.dark }]}>American Bulldog</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.labelSmall, { color: colors.dark }]}>DOB:</Text>
                  <Text style={[styles.dob, { color: colors.dark }]}>4 MAY 2024</Text>
                </View>
              </View>

              {/* Settings square */}
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
              <Attr label="AGE" value="1" />
              <Attr label="COLOUR" value="MERLÉ" />
              <Attr label="SIZE" value="XL" />
              <Attr label="GENDER" value="F" />
              <Attr label="CHIP" value="YES" />
            </View>

            {/* Weight row */}
            <View style={[styles.weightCard, { borderColor: colors.accent }]}>
              <Text style={[styles.weightLabel, { color: colors.dark }]}>WEIGHT:</Text>
              <Text style={[styles.weightValue, { color: colors.blue }]}>35 KG</Text>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { borderBottomColor: colors.accent }]} />

            {/* Upcoming reminders */}
            <Text style={[styles.sectionTitle, { color: '#6E6E6E' }]}>UPCOMING REMINDERS</Text>
            <View style={styles.remindersRow}>
              {reminders.map((r) => (
                <View
                  key={r.id}
                  style={[styles.reminderBox, styles.shadow, { backgroundColor: '#e9e8e6ff' }]}
                />
              ))}

              {/* Add Reminder tile (always last) */}
              <TouchableOpacity
                onPress={handleAddReminder}
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

            {/* Editable Notes */}
            <View style={[styles.notesCard, { borderColor: colors.accent }]}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="NOTES..."
                placeholderTextColor={colors.blue}
                multiline
                textAlignVertical="top"
                style={[styles.notesInput, { marginTop: -10, fontWeight: '900' }]}
                maxLength={500}
              />
              <Text style={styles.notesCount}>{notes.length}/500</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Sticky floating navbar — outside the KeyboardAvoidingView so it does NOT move */}
        <BottomNavBar />
      </View>
    </SafeAreaView>
  );
}

/* ---------- tiny presentational chip ---------- */
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

  /* --- Name row (pill + settings) --- */
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

  // Notes card styles
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