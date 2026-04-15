import React from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import PricingScreen from '../screens/PricingScreen';
import { GradientBackground } from '../components/GradientBackground';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Colors } from '../constants/theme';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  Pricing: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function StartupScreen() {
  const { colors } = useTheme();

  return (
    <GradientBackground style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary[500]} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Oturum hazırlanıyor...</Text>
    </GradientBackground>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <StartupScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Pricing" component={PricingScreen} />

        {user ? (
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
