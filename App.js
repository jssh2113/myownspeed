import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RunProvider } from './src/context/RunContext';

import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import GuestHomeScreen from './src/screens/GuestHomeScreen';
import RunningGoalScreen from './src/screens/RunningGoalScreen';
import RunningScreen from './src/screens/RunningScreen';
import RecordsScreen from './src/screens/RecordsScreen';
import ChallengesScreen from './src/screens/ChallengesScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFDF5' }}>
        <ActivityIndicator size="large" color="#F5A623" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="GuestHome" component={GuestHomeScreen} />
            <Stack.Screen name="RunningGoal" component={RunningGoalScreen} />
            <Stack.Screen name="Running" component={RunningScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="RunningGoal" component={RunningGoalScreen} />
            <Stack.Screen name="Running" component={RunningScreen} />
            <Stack.Screen name="Records" component={RecordsScreen} />
            <Stack.Screen name="Challenges" component={ChallengesScreen} />
            <Stack.Screen name="Friends" component={FriendsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'RumRaisin': require('./assets/fonts/RumRaisin-Regular.ttf'),
    'GowunDodum': require('./assets/fonts/GowunDodum-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFDF5' }}>
        <ActivityIndicator size="large" color="#F5A623" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <RunProvider>
        <AppNavigator />
      </RunProvider>
    </AuthProvider>
  );
}
