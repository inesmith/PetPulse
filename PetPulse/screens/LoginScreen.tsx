import { Heading } from '@gluestack-ui/themed';
import React from 'react';
import { View, Text, Button, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require('../assets/petpulse-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Welcome to PetPulse</Text>
        <Text style={styles.subtitle}>Track their steps. Log their health.{"\n"} Earn real rewards.</Text>

        <Button
          title="Go to Signup"
          onPress={() => navigation.navigate('Signup')}
        />
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F7F4', // secondary color from your theme
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 110,
    height: 110,
    marginTop: -400,
    paddingBottom: 20,
  },
  title: {
    fontSize: 30,
    fontStyle: 'normal',
    marginTop: 16,
    color: '#333',
    fontFamily: 'Staatliches', // heading font from your theme
  },
  subtitle: {
    fontSize: 17,
    color: '#EE734A',
    textAlign: 'center',
    marginVertical: 8,
    fontFamily: 'barlow semi-condensed', // body font from your theme
  },

});
