import React from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import PricingScreen from '../screens/PricingScreen';
import StoryHistoryScreen from '../screens/StoryHistoryScreen';
import { GradientBackground } from '../components/GradientBackground';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Colors, BorderRadius } from '../constants/theme';
import { Sparkles, Clock3, UserRound } from 'lucide-react-native';
import { TabBarIcon } from '../components/TabBarIcon';

function modeAwareActiveColor(textColor: string, accentColor: string) {
  return textColor === Colors.neutral[100] ? Colors.white : accentColor;
}

function modeAwareInactiveColor(textSecondary: string) {
  return textSecondary === Colors.neutral[400] ? Colors.neutral[200] : textSecondary;
}

function renderTabLabel(label: string, color: string, focused: boolean) {
  return (
    <Text
      style={[
        styles.tabLabel,
        {
          color,
          opacity: focused ? 1 : 0.78,
          fontSize: focused ? 12 : 11,
        },
      ]}
    >
      {label}
    </Text>
  );
}

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  AppTabs: undefined;
  Pricing: undefined;
};

type CreateStoryParams = {
  topic?: string;
  ageRange?: '3-5' | '6-8';
  length?: 'short' | 'medium';
  theme?: 'friendship' | 'courage' | 'sharing' | 'emotions';
};

type AppTabParamList = {
  CreateStory: CreateStoryParams | undefined;
  History: undefined;
  Dashboard: undefined;
};

export type { CreateStoryParams };
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

function StartupScreen() {
  const { colors } = useTheme();

  return (
    <GradientBackground style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary[500]} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Oturum hazırlanıyor...</Text>
    </GradientBackground>
  );
}

function AuthenticatedTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: modeAwareActiveColor(colors.text, Colors.primary[500]),
        tabBarInactiveTintColor: modeAwareInactiveColor(colors.textSecondary),
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.surfaceBorder,
          borderTopWidth: 1,
          height: 82,
          paddingTop: 10,
          paddingBottom: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 8,
        },
        tabBarItemStyle: {
          borderRadius: BorderRadius.lg,
          marginHorizontal: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: 0,
        },
      }}
    >
      <Tab.Screen
        name="CreateStory"
        component={HomeScreen}
        options={{
          title: 'Masal Oluştur',
          tabBarLabel: ({ color, focused }) => renderTabLabel('Masal', color, focused),
          tabBarAccessibilityLabel: 'Masal oluştur sekmesi',
          tabBarIcon: ({ color, focused }) => <TabBarIcon icon={Sparkles} color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={StoryHistoryScreen}
        options={{
          title: 'Geçmiş',
          tabBarLabel: ({ color, focused }) => renderTabLabel('Geçmiş', color, focused),
          tabBarAccessibilityLabel: 'Masal geçmişi sekmesi',
          tabBarIcon: ({ color, focused }) => <TabBarIcon icon={Clock3} color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Hesabım',
          tabBarLabel: ({ color, focused }) => renderTabLabel('Hesap', color, focused),
          tabBarAccessibilityLabel: 'Hesap sekmesi',
          tabBarIcon: ({ color, focused }) => <TabBarIcon icon={UserRound} color={color} focused={focused} />,
        }}
      />
    </Tab.Navigator>
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
        initialRouteName={user ? 'AppTabs' : 'Home'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="AppTabs" component={AuthenticatedTabs} />
            <Stack.Screen name="Pricing" component={PricingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Pricing" component={PricingScreen} />
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
  tabLabel: {
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 1,
  },
});
