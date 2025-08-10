import { Heading } from '@gluestack-ui/themed';
import React from 'react';
import { View, Text, Button, Image, StyleSheet, TextInput, TouchableOpacity, ImageBackground, Dimensions } from 'react-native';
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.white }]}>
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
    paddingBottom: 12, // keep tight so the blue comes up closer
    marginTop: 100,
  },
  logo: { width: 110, height: 110, marginBottom: 8 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: '#000',
    letterSpacing: 0.5,
    // fontFamily: 'Staatliches',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
    // fontFamily: 'Inter',
  },

  bottom: { flex: 1, position: 'relative', marginTop: 150, backgroundColor: colors.blue }, // negative margin to pull up the wave

  // >>> TUNE THESE TWO KNOBS IF NEEDED <<<
  // Move the white cut-in higher/lower with "top"
  // Make the curve deeper/shallower with "height"
  wave: {
    position: 'absolute',
    top: -100,      // was -34; move higher to erase the big white gap
    left: 0,
    width: width,
    height: 400,   // was 120; a bit deeper curve
    tintColor: '#73C3D1', // white from theme to cut into blue
    zIndex: 1,
  },

  bottomContent: {
    paddingHorizontal: 20,
    paddingTop: 20, // space below the wave; adjust with wave changes
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
  loginRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  loginCopy: { color: '#F8F7F4' },
  loginLink: { color: '#F8F7F4', fontWeight: '800', textDecorationLine: 'underline' },
});