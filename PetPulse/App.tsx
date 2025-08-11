// App.tsx
import React from 'react';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from './gluestack-ui.config';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen'; 
import PetProfileScreen from './screens/PetProfileScreen';
import ActivitiesScreen from './screens/ActivitiesScreen';
import RewardsScreen from './screens/RewardsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GluestackUIProvider config={config}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="PetProfile" component={PetProfileScreen} />
          <Stack.Screen name="Activities" component={ActivitiesScreen} />
          <Stack.Screen name="Rewards" component={RewardsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GluestackUIProvider>
  );
} 

