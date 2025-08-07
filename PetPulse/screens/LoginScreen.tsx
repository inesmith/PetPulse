import React from 'react';
import { View, Text, Button } from 'react-native';

const LoginScreen = ({ navigation }: any) => {
  return (
    <View>
      <Text>Login Screen</Text>
      <Button title="Go to Signup" onPress={() => navigation.navigate('Signup')} />
    </View>
  );
};

export default LoginScreen;
