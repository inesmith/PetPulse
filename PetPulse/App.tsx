import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from './gluestack-ui.config';

import { AuthProvider, useAuth } from './context/AuthContext';
import { PetProvider } from './context/PetContext';

// Auth screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';

// Protected screens
import HomeScreen from './screens/HomeScreen';
import PetProfileScreen from './screens/PetProfileScreen';
import ActivitiesScreen from './screens/ActivitiesScreen';
import RewardsScreen from './screens/RewardsScreen';
import HealthScreen from './screens/HealthScreen';
import UserSettingsScreen from './screens/UserSettingsScreen';
import PetSettingsScreen from './screens/PetSettingsScreen';

import AddPetScreen from './screens/AddPetScreen';


const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="PetProfile" component={PetProfileScreen} />
          <Stack.Screen name="Activities" component={ActivitiesScreen} />
          <Stack.Screen name="Rewards" component={RewardsScreen} />
          <Stack.Screen name="Health" component={HealthScreen} />
          <Stack.Screen name="UserSettings" component={UserSettingsScreen} />
          <Stack.Screen name="PetSettings" component={PetSettingsScreen} />
          <Stack.Screen name="AddPet" component={AddPetScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GluestackUIProvider config={config}>
      <AuthProvider>
        <PetProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </PetProvider>
      </AuthProvider>
    </GluestackUIProvider>
  );
}
