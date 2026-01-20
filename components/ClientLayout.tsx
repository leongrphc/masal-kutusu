'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import ThemeToggle from '@/components/ThemeToggle';

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ThemeToggle />
        {children}
      </ThemeProvider>
    </AuthProvider>
  );
}
