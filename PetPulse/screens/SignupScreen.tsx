import React from 'react';
import { View, Text, Button } from 'react-native';

const SignupScreen = ({ navigation }: any) => {
  return (
    <View>
      <Text>Signup Screen</Text>
      <Button title="Go to Login" onPress={() => navigation.navigate('Login')} />
    </View>
  );
};

export default SignupScreen;
