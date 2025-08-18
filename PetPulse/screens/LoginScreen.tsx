// screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TextInput, TouchableOpacity, Dimensions, Alert, ActivityIndicator, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { config } from '../gluestack-ui.config';
import { loginUser, resetPassword } from '../services/authService';

const { width } = Dimensions.get('window');

const colors = {
  blue: (config as any)?.theme?.colors?.blue ?? '#73C3D1',
  white: (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o ?? '#EE734A',
};

export default function LoginScreen({ navigation }: any) {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    // Using email for auth. If you want username login, add a username->email lookup.
    const email = emailOrUsername.trim();
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter email and password.');
      return;
    }

    try {
      setBusy(true);
      await loginUser(email, password);
      // AuthProvider will switch to the protected stack automatically
    } catch (e: any) {
      Alert.alert('Login failed', e?.message ?? 'Check your credentials and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.white }]}
      edges={['top']} // Only top safe area to avoid bottom white box
    >
      {/* TOP: logo + headings */}
      <View style={styles.top}>
        <Image
          source={require('../assets/petpulse-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>WELCOME TO PETPULSE</Text>
        <Text style={[styles.subtitle, { color: colors.accent }]}>
          Track their steps. Log their health.{'\n'}Earn real rewards.
        </Text>
      </View>

      {/* BOTTOM: solid blue with wave overlay */}
      <View style={[styles.bottom, { backgroundColor: colors.blue }]}>
        {/* Wave overlay — white “cutout” */}
        <Image
          source={require('../assets/Vector1.png')}
          style={styles.wave}
          resizeMode="stretch"
        />

        {/* Content on blue */}
        <View style={styles.bottomContent}>
          <Text style={styles.sectionTitle}>Log In</Text>
          <Text style={styles.sectionCopy}>
            Log in and access your journey towards smarter,{'\n'}more connected pet care.
          </Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#707070"
            autoCapitalize="none"
            keyboardType="email-address"
            value={emailOrUsername}
            onChangeText={setEmailOrUsername}
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
            style={styles.continueBtn}
            onPress={handleLogin}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.continueBtnText}>Log In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupCopy}>Don’t have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => resetPassword(emailOrUsername)}>
                <Text style={styles.forgotPassword}>
                Forgot password?
                </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

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

  bottom: { flex: 1, position: 'relative', marginTop: 150 },

  wave: {
    position: 'absolute',
    top: -50,
    left: 0,
    width: width,
    height: 400,
    tintColor: '#73C3D1',
    zIndex: 1,
  },

  bottomContent: {
    paddingHorizontal: 20,
    paddingTop: 75,
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
  signupRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  signupCopy: { color: '#F8F7F4' },
  signupLink: {
    color: '#F8F7F4',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  forgotPassword: {
    color: '#F8F7F4',
    marginTop: 1,
    textDecorationLine: 'underline',
    marginLeft: 74,
  },
});
