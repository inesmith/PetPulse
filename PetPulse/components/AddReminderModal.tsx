// components/AddReminderModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db } from '../firebase';
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';

export default function AddReminderModal({
  visible,
  onClose,
  uid,
  petId,
}: {
  visible: boolean;
  onClose: () => void;
  uid: string;
  petId: string;
}) {
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const id = Date.now().toString();
      const payload = {
        title: title.trim(),
        when: Timestamp.fromDate(when),
        petId,
        createdAt: serverTimestamp(),
      };

      // Pet-specific reminders
      await setDoc(doc(db, 'users', uid, 'pets', petId, 'reminders', id), payload);
      // Global (user-level) list for Home screen
      await setDoc(doc(db, 'users', uid, 'reminders', id), payload);

      onClose();
      setTitle('');
      setWhen(new Date());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Add Reminder</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title (e.g. Vet appointment)"
            style={styles.input}
          />

          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={styles.whenBtn}
          >
            <Text style={styles.whenText}>
              {when.toLocaleString()}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={when}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, d) => {
                if (Platform.OS === 'android') setShowPicker(false);
                if (d) setWhen(d);
              }}
              onTouchCancel={() => setShowPicker(false)}
            />
          )}

          <View style={styles.row}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.cancel]}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSave}
              style={[styles.btn, styles.save]}
              disabled={saving}
            >
              <Text style={[styles.btnText, { color: 'white' }]}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '88%',
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 16,
  },
  title: { fontWeight: '900', fontSize: 16, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  whenBtn: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  whenText: { fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  btn: {
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: { backgroundColor: '#eee' },
  save: { backgroundColor: '#73C3D1' },
  btnText: { fontWeight: '800' },
});
