import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { BorderRadius, Colors } from '../constants/theme';

interface TabBarIconProps {
  icon: LucideIcon;
  color: string;
  focused: boolean;
}

export function TabBarIcon({ icon: Icon, color, focused }: TabBarIconProps) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, focused && styles.containerActive]}>
        <Icon
          size={focused ? 23 : 20}
          color={color}
          strokeWidth={focused ? 2.6 : 2.1}
        />
      </View>
      <View style={[styles.dot, focused ? styles.dotActive : styles.dotInactive]} />
    </View>
  );
}

export default TabBarIcon;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  container: {
    width: 48,
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
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 5,
    transform: [{ translateY: -1 }],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: Colors.primary[500],
  },
  dotInactive: {
    backgroundColor: 'transparent',
  },
});
