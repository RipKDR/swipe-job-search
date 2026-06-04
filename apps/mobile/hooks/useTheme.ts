// hooks/useTheme.ts — simple consumer for ThemeProvider

import { useContext } from 'react';
import { ThemeContext } from '@/providers/ThemeProvider';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx.ready && !ctx.colors) {
    // Provider is missing entirely (dev error, but be safe)
    throw new Error('useTheme must be inside <ThemeProvider>');
  }
  return ctx;
}
