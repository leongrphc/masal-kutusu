import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors } from '../constants/theme';

interface TabBarIconProps {
  icon: string;
  color: string;
  focused: boolean;
}

export function TabBarIcon({ icon, color, focused }: TabBarIconProps) {
  return (
    <View style={[styles.container, focused && styles.containerActive]}>
      <Text style={[styles.icon, { color }, focused && styles.iconActive]}>{icon}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerActive: {
    backgroundColor: 'rgba(255,127,80,0.14)',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  icon: {
    fontSize: 20,
  },
  iconActive: {
    fontSize: 22,
  },
});
