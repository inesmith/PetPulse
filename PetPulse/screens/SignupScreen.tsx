// screens/SignupScreen.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { config } from '../gluestack-ui.config';

const { width } = Dimensions.get('window');

const colors = {
  blue: (config as any)?.theme?.colors?.blue ?? '#73C3D1',
  white: (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o ?? '#EE734A',
  text: (config as any)?.theme?.colors?.text ?? '#1C1C1C',
};

export default function SignupScreen({ navigation }: any) {
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.white }]}
      edges={['top']} // only top safe-area to avoid bottom white strip
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
        {/* Wave overlay — white “cutout” */}
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
            style={styles.input}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#707070"
            secureTextEntry
            style={styles.input}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#707070"
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.continueBtnText}>Sign Up</Text>
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

  // Blue section fills to bottom; no white safe area applied at bottom
  bottom: { flex: 1, position: 'relative', marginTop: 125 },

  // White cut-in wave that overlays on top of the blue
  wave: {
    position: 'absolute',
    top: -80,        // adjust if you want the curve higher/lower
    left: 0,
    width: width,
    height: 400,
    tintColor: '#73C3D1', // important: white cut-in over blue
    zIndex: 1,
  },

  bottomContent: {
    paddingHorizontal: 20,
    paddingTop: 20,  // space below the wave
    position: 'relative',
    zIndex: 2,       // above the wave
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
