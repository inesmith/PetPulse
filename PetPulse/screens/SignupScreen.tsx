import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { config } from '../gluestack-ui.config';
import { registerUser } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { fetchSignInMethodsForEmail } from 'firebase/auth';

const { width } = Dimensions.get('window');

const colors = {
  blue:   (config as any)?.theme?.colors?.blue  ?? '#73C3D1',
  white:  (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o     ?? '#EE734A',
  text:   (config as any)?.theme?.colors?.text  ?? '#1C1C1C',
};

export default function SignupScreen({ navigation }: any) {
  const { user } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]         = useState(false);

  // If already signed in, block creating another account
  useEffect(() => {
    if (user) {
      Alert.alert(
        'Already signed in',
        'You’re already logged in. Log out first to create a new account.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [user]);

  const handleSignup = async () => {
    const uname = username.trim();
    const mail  = email.trim().toLowerCase();

    if (!uname || !mail || !password) {
      Alert.alert('Missing info', 'Please fill username, email and password.');
      return;
    }

    try {
      setBusy(true);

      // ✅ Proactively check if this email is already registered
      const methods = await fetchSignInMethodsForEmail(auth, mail);
      if (methods && methods.length > 0) {
        setBusy(false);
        Alert.alert(
          'Account exists',
          'An account already exists with this email. Please log in instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Log In', onPress: () => navigation.navigate('Login') },
          ]
        );
        return;
      }

      // Not registered → create account
      await registerUser(mail, password, uname);
      // On success, AuthProvider will switch stacks automatically
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/weak-password') {
        Alert.alert('Weak password', 'Please choose a stronger password (at least 6 characters).');
      } else if (code === 'auth/invalid-email') {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
      } else if (code === 'auth/email-already-in-use') {
        // Should be prevented by the proactive check, but handle just in case
        Alert.alert(
          'Account exists',
          'This email already has an account. Please log in.',
          [{ text: 'Go to Log In', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Sign up failed', e?.message ?? 'Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.white }]}
      edges={['top']}
    >
      {/* TOP: logo + headings */}
      <View style={styles.top}>
        <Image
          source={require('../assets/petpulse-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>JOIN PETPULSE</Text>
        <Text style={[styles.subtitle, { color: colors.accent }]}>
          Track their steps. Log their health.{'\n'}Earn real rewards.
        </Text>
      </View>

      {/* BOTTOM: solid blue with wave overlay */}
      <View style={[styles.bottom, { backgroundColor: colors.blue }]}>
        <Image
          source={require('../assets/Vector1.png')}
          style={styles.wave}
          resizeMode="stretch"
        />

        {/* Content on blue */}
        <View style={styles.bottomContent}>
          <Text style={styles.sectionTitle}>Sign Up</Text>
          <Text style={styles.sectionCopy}>
            Create your account and start your journey toward{'\n'}smarter, more connected pet care.
          </Text>

          <TextInput
            placeholder="Username"
            placeholderTextColor="#707070"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#707070"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#707070"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.continueBtn, busy && { opacity: 0.7 }]}
            onPress={handleSignup}
            disabled={busy}
          >
            {busy ? <ActivityIndicator /> : <Text style={styles.continueBtnText}>Sign Up</Text>}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginCopy}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const { width: W } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  top: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
    marginTop: 100,
  },
  logo: { width: 110, height: 110, marginBottom: 8 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: '#000',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
  },

  bottom: { flex: 1, position: 'relative', marginTop: 125 },

  wave: {
    position: 'absolute',
    top: -80,
    left: 0,
    width: W,
    height: 400,
    tintColor: '#73C3D1',
    zIndex: 1,
  },

  bottomContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    position: 'relative',
    zIndex: 2,
  },
  sectionTitle: {
    color: '#F8F7F4',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  sectionCopy: { color: '#F8F7F4', marginBottom: 16 },
  input: {
    backgroundColor: '#F8F7F4',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  continueBtn: {
    backgroundColor: '#F8F7F4',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  continueBtnText: {
    color: '#EE734A',
    fontWeight: '800',
    fontSize: 16,
  },
  loginRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  loginCopy: { color: '#F8F7F4' },
  loginLink: { color: '#F8F7F4', fontWeight: '800', textDecorationLine: 'underline' },
});
