import { Heading } from '@gluestack-ui/themed';
import React from 'react';
import { View, Text, Image, StyleSheet, TextInput, TouchableOpacity, ImageBackground, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { config } from '../gluestack-ui.config';

const { width } = Dimensions.get('window');

const colors = {
  blue: (config as any)?.theme?.colors?.blue ?? '#73C3D1',
  white: (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o ?? '#EE734A',
  text: (config as any)?.theme?.colors?.text ?? '#1C1C1C',
};

export default function LoginScreen({ navigation }: any) {
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
            Access your races, stats, and the community.
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

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.continueBtnText}>Log In</Text>
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupCopy}>Don’t have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
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
  signupLink: { color: '#F8F7F4', fontWeight: '800', textDecorationLine: 'underline' },
});
