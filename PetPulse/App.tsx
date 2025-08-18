// App.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from './gluestack-ui.config';

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

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CLASS EXERCISE: listen for auth state and flip stacks
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setLoading(false);
      console.log(u ? `User logged in: ${u.email}` : 'User is logged out');
    });
    return unsub;
  }, []);

  if (loading) return null; // or show a splash

  return (
    <GluestackUIProvider config={config}>
      <NavigationContainer>
        {user ? (
          // Logged-in stack
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="PetProfile" component={PetProfileScreen} />
            <Stack.Screen name="Activities" component={ActivitiesScreen} />
            <Stack.Screen name="Rewards" component={RewardsScreen} />
            <Stack.Screen name="Health" component={HealthScreen} />
            <Stack.Screen name="UserSettings" component={UserSettingsScreen} />
            <Stack.Screen name="PetSettings" component={PetSettingsScreen} />
          </Stack.Navigator>
        ) : (
          // Auth stack (same as class)
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </GluestackUIProvider>
  );
}
