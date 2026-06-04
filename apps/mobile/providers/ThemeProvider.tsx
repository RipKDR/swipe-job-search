// providers/ThemeProvider.tsx — expo-secure-store persisted accent theme + light/dark mode
// Exposes `{ theme: { colors: FullColorPalette } }` for backward compat with
// existing consumers (Button.tsx, AppScreen.tsx, etc.).
// Uses the same storage strategy as lib/supabase.ts.

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  type AccentTheme,
  type ThemeMode,
  type AppTheme,
  type ThemeContract,
  DEFAULT_ACCENT,
  DEFAULT_MODE,
  ACCENT_STORAGE_KEY,
  MODE_STORAGE_KEY,
  parseAccentTheme,
  parseThemeMode,
  buildTheme,
  getAppThemes,
} from '@/lib/theme';

export type { AccentTheme, ThemeMode, AppTheme, FullColorPalette, ThemeContract } from '@/lib/theme';

/* ── Context shape (backward-compat + new accent + mode control) ────── */
interface ThemeContextValue {
  /** Full structural theme ({ colors: … }) — what existing UI reads. */
  theme: ThemeContract;
  colors: ThemeContract['colors'];
  /** Current accent identifier. */
  accent: AccentTheme;
  /** Change the accent and immediately re-render the palette. */
  setAccent: (accent: AccentTheme) => void;
  themeId: AccentTheme;
  themes: AppTheme[];
  setThemeId: (accent: AccentTheme) => void;
  /** `true` until the stored preferences have been read. */
  ready: boolean;
  /** Current light/dark mode. */
  mode: ThemeMode;
  /** Switch to a specific mode. */
  setMode: (mode: ThemeMode) => void;
  /** Flip between dark and light. */
  toggleMode: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: buildTheme(DEFAULT_ACCENT, DEFAULT_MODE),
  colors: buildTheme(DEFAULT_ACCENT, DEFAULT_MODE).colors,
  accent: DEFAULT_ACCENT,
  setAccent: () => {},
  themeId: DEFAULT_ACCENT,
  themes: getAppThemes(),
  setThemeId: () => {},
  ready: false,
  mode: DEFAULT_MODE,
  setMode: () => {},
  toggleMode: () => {},
});

/* ── Web helpers (mirrors WebStorageAdapter in supabase.ts) ──────────── */
const webGet = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const webSet = (key: string, v: string) => {
  try { localStorage.setItem(key, v); } catch {}
};

/* ── Provider ────────────────────────────────────────────────────────── */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentTheme>(DEFAULT_ACCENT);
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [ready, setReady] = useState(false);
  const mounted = useRef(true);

  // 1️⃣ Load persisted preferences on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      let accentRaw: string | null = null;
      let modeRaw: string | null = null;
      try {
        if (Platform.OS === 'web') {
          accentRaw = webGet(ACCENT_STORAGE_KEY);
          modeRaw = webGet(MODE_STORAGE_KEY);
        } else {
          [accentRaw, modeRaw] = await Promise.all([
            SecureStore.getItemAsync(ACCENT_STORAGE_KEY),
            SecureStore.getItemAsync(MODE_STORAGE_KEY),
          ]);
        }
      } catch {
        // storage unavailable — silently fall back
      }
      if (cancelled || !mounted.current) return;

      setAccentState(parseAccentTheme(accentRaw));
      setModeState(parseThemeMode(modeRaw));
      setReady(true);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // 2️⃣ Persist + broadcast accent change
  const setAccent = useCallback((next: AccentTheme) => {
    setAccentState(next);
    if (Platform.OS === 'web') {
      webSet(ACCENT_STORAGE_KEY, next);
    } else {
      SecureStore.setItemAsync(ACCENT_STORAGE_KEY, next).catch(() => {});
    }
  }, []);

  // 3️⃣ Persist + broadcast mode change
  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    if (Platform.OS === 'web') {
      webSet(MODE_STORAGE_KEY, next);
    } else {
      SecureStore.setItemAsync(MODE_STORAGE_KEY, next).catch(() => {});
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const themes = useMemo(() => getAppThemes(), []);
  const theme = useMemo(() => buildTheme(accent, mode), [accent, mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      colors: theme.colors,
      accent,
      setAccent,
      themeId: accent,
      themes,
      setThemeId: setAccent,
      ready,
      mode,
      setMode,
      toggleMode,
    }),
    [accent, mode, ready, setAccent, setMode, theme, themes, toggleMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
