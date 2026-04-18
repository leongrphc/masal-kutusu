import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors } from '../constants/theme';

interface TabBarIconProps {
  icon: string;
  activeIcon?: string;
  color: string;
  focused: boolean;
}

export function TabBarIcon({ icon, activeIcon, color, focused }: TabBarIconProps) {
  return (
    <View style={[styles.container, focused && styles.containerActive]}>
      <Text style={[styles.icon, { color }, focused && styles.iconActive]}>
        {focused ? (activeIcon ?? icon) : icon}
      </Text>
    </View>
  );
}

export default TabBarIcon;

const styles = StyleSheet.create({
  container: {
    width: 46,
    height: 42,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerActive: {
    backgroundColor: 'rgba(255,127,80,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,127,80,0.28)',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
