// lib/theme.ts — 5 premium vibes with unique glow personalities.
// Each theme is a curated visual ecosystem: accent palette, mode-adaptive
// backgrounds, and a distinctive ambient glow pattern.
// FullColorPalette interface unchanged — all 13 consumers keep working.

/** Light / dark mode. */
export type ThemeMode = 'dark' | 'light';

/** Five premium vibes — each with its own personality and glow treatment. */
export type AccentTheme =
  | 'midnight'   // deep navy, indigo accent, starburst glow
  | 'coast'      // ocean teal, teal accent, wave glow
  | 'bloom'      // warm rose, rose accent, radial glow
  | 'hustle'     // golden amber, amber accent, upward-sweep glow
  | 'slate';     // zero-distraction gray, minimal glow

/** Storage keys — mirrors SecureStore conventions used in supabase.ts. */
export const ACCENT_STORAGE_KEY = '@hi-hired:accent';
export const MODE_STORAGE_KEY = '@hi-hired:mode';

export const DEFAULT_ACCENT: AccentTheme = 'midnight';
export const DEFAULT_MODE: ThemeMode = 'dark';

/* ── Theme meta / picker data ────────────────────────────────── */

export const ACCENT_THEMES: {
  id: AccentTheme;
  name: string;
  emoji: string;
  previewHex: string;
  description: string;
}[] = [
  { id: 'midnight', name: 'Midnight', emoji: '🌙', previewHex: '#6366f1', description: 'Deep navy — professional and calm.' },
  { id: 'coast',    name: 'Coast',    emoji: '🌊', previewHex: '#2dd4bf', description: 'Fresh teal — clear and trustworthy.' },
  { id: 'bloom',    name: 'Bloom',    emoji: '🌸', previewHex: '#f43f5e', description: 'Warm rose — optimistic and bold.' },
  { id: 'hustle',   name: 'Hustle',   emoji: '⚡', previewHex: '#f59e0b', description: 'Golden amber — energetic and confident.' },
  { id: 'slate',    name: 'Slate',    emoji: '🪨', previewHex: '#64748b', description: 'Pure minimal — zero visual noise.' },
];

/* ── Accent colour palettes (curated per theme) ─────────────── */

interface PaletteScale {
  50: string; 100: string; 200: string; 300: string; 400: string;
  500: string; 600: string; 700: string; 900: string; 950: string;
}

const MAP: Record<AccentTheme, PaletteScale> = {
  midnight: { 50:'#eef2ff', 100:'#e0e7ff', 200:'#c7d2fe', 300:'#a5b4fc', 400:'#818cf8', 500:'#6366f1', 600:'#4f46e5', 700:'#4338ca', 900:'#312e81', 950:'#1e1b4b' },
  coast:    { 50:'#f0fdfa', 100:'#ccfbf1', 200:'#99f6e4', 300:'#5eead4', 400:'#2dd4bf', 500:'#14b8a6', 600:'#0d9488', 700:'#0f766e', 900:'#134e4a', 950:'#042f2e' },
  bloom:    { 50:'#fff1f2', 100:'#ffe4e6', 200:'#fecdd3', 300:'#fda4af', 400:'#fb7185', 500:'#f43f5e', 600:'#e11d48', 700:'#be123c', 900:'#881337', 950:'#4c0519' },
  hustle:   { 50:'#fffbeb', 100:'#fef3c7', 200:'#fde68a', 300:'#fcd34d', 400:'#fbbf24', 500:'#f59e0b', 600:'#d97706', 700:'#b45309', 900:'#78350f', 950:'#451a03' },
  slate:    { 50:'#f8fafc', 100:'#f1f5f9', 200:'#e2e8f0', 300:'#cbd5e1', 400:'#94a3b8', 500:'#64748b', 600:'#475569', 700:'#334155', 900:'#0f172a', 950:'#020617' },
};

/* ── Background palettes (per theme × mode) ─────────────────── */

interface BackgroundPalette {
  background: string; backgroundWash: string; surface: string;
  elevated: string; tabBar: string; photoBase: string;
  photoPanel: string; photoPanelAlt: string;
}

interface TextPalette {
  text: string; muted: string; subtle: string;
  border: string; borderStrong: string;
  tabBorder: string; tabInactive: string;
}

/* Dark-mode backgrounds — each theme has a distinct atmospheric base. */
const DARK_BG: Record<AccentTheme, BackgroundPalette> = {
  midnight: {
    background: '#0a0e1a', backgroundWash: '#111827',
    surface: '#0f172a', elevated: '#1e293b', tabBar: '#0f172a',
    photoBase: '#0f172a', photoPanel: '#1e293b', photoPanelAlt: '#334155',
  },
  coast: {
    background: '#0b1215', backgroundWash: '#121c20',
    surface: '#0f1a1e', elevated: '#1a282e', tabBar: '#0f1a1e',
    photoBase: '#0f1a1e', photoPanel: '#1a282e', photoPanelAlt: '#243840',
  },
  bloom: {
    background: '#141012', backgroundWash: '#1e181a',
    surface: '#1a1517', elevated: '#2a1f22', tabBar: '#1a1517',
    photoBase: '#1a1517', photoPanel: '#2a1f22', photoPanelAlt: '#3d2d30',
  },
  hustle: {
    background: '#11100e', backgroundWash: '#1a1815',
    surface: '#171513', elevated: '#25221e', tabBar: '#171513',
    photoBase: '#171513', photoPanel: '#25221e', photoPanelAlt: '#36322c',
  },
  slate: {
    background: '#0d0d0d', backgroundWash: '#1a1a1a',
    surface: '#141414', elevated: '#1f1f1f', tabBar: '#141414',
    photoBase: '#141414', photoPanel: '#1f1f1f', photoPanelAlt: '#2e2e2e',
  },
};

/* Light-mode backgrounds — each theme gets a complementary light atmosphere. */
const LIGHT_BG: Record<AccentTheme, BackgroundPalette> = {
  midnight: {
    background: '#f0f2f8', backgroundWash: '#e4e7f0',
    surface: '#ffffff', elevated: '#eef0f5', tabBar: '#ffffff',
    photoBase: '#e4e7f0', photoPanel: '#d8dce8', photoPanelAlt: '#c8cde0',
  },
  coast: {
    background: '#f0f7fa', backgroundWash: '#e0f0f5',
    surface: '#ffffff', elevated: '#eef5f8', tabBar: '#ffffff',
    photoBase: '#e0f0f5', photoPanel: '#d0e8f0', photoPanelAlt: '#c0dce8',
  },
  bloom: {
    background: '#fff5f5', backgroundWash: '#ffe8e8',
    surface: '#ffffff', elevated: '#ffeeee', tabBar: '#ffffff',
    photoBase: '#ffe8e8', photoPanel: '#ffd8d8', photoPanelAlt: '#ffc8c8',
  },
  hustle: {
    background: '#fffaf0', backgroundWash: '#fff3e0',
    surface: '#ffffff', elevated: '#fff8ee', tabBar: '#ffffff',
    photoBase: '#fff3e0', photoPanel: '#ffe8d0', photoPanelAlt: '#ffddc0',
  },
  slate: {
    background: '#f5f5f5', backgroundWash: '#eaeaea',
    surface: '#ffffff', elevated: '#f0f0f0', tabBar: '#ffffff',
    photoBase: '#eaeaea', photoPanel: '#e0e0e0', photoPanelAlt: '#d0d0d0',
  },
};

/* Text + borders per mode — theme-independent for readability consistency. */
const MODE_TEXT: Record<ThemeMode, TextPalette> = {
  dark:  { text:'#f8fafc', muted:'#94a3b8', subtle:'#64748b', border:'#1e293b', borderStrong:'#334155', tabBorder:'#1e293b', tabInactive:'#64748b' },
  light: { text:'#1c1917', muted:'#78716c', subtle:'#a8a29e', border:'#e7e2db', borderStrong:'#d4cfc8', tabBorder:'#e7e2db', tabInactive:'#a8a29e' },
};

/* ── Glow pattern config (per theme, consumed by AmbientBackground) ── */

export interface GlowDot {
  /** Tailwind className for size + absolute positioning. */
  className: string;
  /** Key into FullColorPalette to pick the color (adapts to mode + accent). */
  colorKey: keyof FullColorPalette;
  /** Additional opacity multiplier (applied on top of the hex alpha). */
  opacity?: number;
}

/**
 * Each theme gets a unique glow-dot arrangement, creating a distinct
 * atmospheric personality. Colors reference FullColorPalette keys so
 * they automatically adapt to dark/light mode and accent changes.
 */
export const THEME_GLOW: Record<AccentTheme, GlowDot[]> = {
  /* ── Midnight: starburst — scattered dots suggesting a night sky ── */
  midnight: [
    { className: 'absolute -right-24 -top-20 h-80 w-80 rounded-full', colorKey: 'primarySoft' },
    { className: 'absolute -left-8 bottom-24 h-40 w-40 rounded-full', colorKey: 'accentSoft' },
    { className: 'absolute left-1/3 top-1/5 h-20 w-20 rounded-full', colorKey: 'primaryLight', opacity: 0.3 },
    { className: 'absolute right-1/4 bottom-1/3 h-14 w-14 rounded-full', colorKey: 'accentSoft', opacity: 0.5 },
  ],

  /* ── Coast: wave — horizontal spread suggesting ocean horizon ── */
  coast: [
    { className: 'absolute -right-20 -top-20 h-80 w-80 rounded-full', colorKey: 'primarySoft' },
    { className: 'absolute -left-12 bottom-12 h-56 w-56 rounded-full', colorKey: 'accentSoft' },
    { className: 'absolute left-1/3 top-1/2 h-24 w-24 rounded-full', colorKey: 'primaryLight', opacity: 0.4 },
  ],

  /* ── Bloom: radial burst — large symmetrical glow from center-right ── */
  bloom: [
    { className: 'absolute -right-28 top-1/4 h-96 w-96 rounded-full', colorKey: 'accentSoft' },
    { className: 'absolute -left-20 top-1/3 h-64 w-64 rounded-full', colorKey: 'primarySoft' },
  ],

  /* ── Hustle: upward sweep — diagonal rise from bottom-left to top-right ── */
  hustle: [
    { className: 'absolute -left-20 bottom-0 h-96 w-96 rounded-full', colorKey: 'primarySoft' },
    { className: 'absolute -right-24 -top-16 h-72 w-72 rounded-full', colorKey: 'accentSoft' },
    { className: 'absolute right-1/4 top-1/3 h-40 w-40 rounded-full', colorKey: 'primaryLight', opacity: 0.5 },
  ],

  /* ── Slate: minimal — single subtle glow, barely there ── */
  slate: [
    { className: 'absolute -right-16 -top-12 h-56 w-56 rounded-full', colorKey: 'primarySoft', opacity: 0.6 },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   FullColorPalette — UNCHANGED interface (all 13 consumers safe)
   ═══════════════════════════════════════════════════════════════ */

export interface FullColorPalette {
  /* Backgrounds */
  background: string;
  backgroundWash: string;
  surface: string;
  elevated: string;
  tabBar: string;
  photoBase: string;
  photoPanel: string;
  photoPanelAlt: string;
  /* Text */
  text: string;
  muted: string;
  subtle: string;
  /* Brand / Accent */
  primary: string;
  primaryLight: string;
  primaryText: string;
  primarySoft: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  /* Functional */
  border: string;
  borderStrong: string;
  danger: string;
  dangerSoft: string;
  tabBorder: string;
  tabInactive: string;
}

export interface ThemeContract {
  colors: FullColorPalette;
}

export type ThemeColors = FullColorPalette;
export type ThemeId = AccentTheme;

export interface AppTheme extends ThemeContract {
  id: ThemeId;
  label: string;
  description: string;
}

/* ── Palette builders ────────────────────────────────────────── */

/** Build the full palette from a theme id + mode. */
export function buildTheme(accent: AccentTheme, mode: ThemeMode = DEFAULT_MODE): ThemeContract {
  const c = MAP[accent];
  const bg = mode === 'dark' ? DARK_BG[accent] : LIGHT_BG[accent];
  const tx = MODE_TEXT[mode];

  return {
    colors: {
      // Backgrounds — per theme × mode
      ...bg,
      // Text — per mode only
      text:   tx.text,
      muted:  tx.muted,
      subtle: tx.subtle,
      // Brand — accent-driven (stays vibrant across modes)
      primary:      c[500],
      primaryLight: c[400],
      primaryText:  c[300],
      primarySoft:  `${c[500]}33`, // 20% opacity hex
      accent:       c[500],
      accentText:   c[300],
      accentSoft:   `${c[500]}26`, // 15% opacity hex
      // Functional
      border:       tx.border,
      borderStrong: tx.borderStrong,
      danger:       '#ef4444',
      dangerSoft:   'rgba(239,68,68,0.18)',
      tabBorder:    tx.tabBorder,
      tabInactive:  tx.tabInactive,
    },
  };
}

/** Build a list of all themes (used by the picker in ProfileScreen). */
export function getAppThemes(): AppTheme[] {
  return ACCENT_THEMES.map((t) => ({
    id: t.id,
    label: t.name,
    description: t.description,
    colors: buildTheme(t.id).colors,
  }));
}

/* ── Parsers / helpers ───────────────────────────────────────── */

/** Validate + coerce an unknown string into AccentTheme. */
export function parseAccentTheme(raw: string | null): AccentTheme {
  if (!raw) return DEFAULT_ACCENT;
  return MAP[raw as AccentTheme] ? (raw as AccentTheme) : DEFAULT_ACCENT;
}

/** Validate + coerce an unknown string into ThemeMode. */
export function parseThemeMode(raw: string | null): ThemeMode {
  if (raw === 'light') return 'light';
  return DEFAULT_MODE;
}

/** Quick accent → accent hex (for inline style fallbacks). */
export function accentHex(accent: AccentTheme): string {
  return MAP[accent]?.[500] ?? MAP[DEFAULT_ACCENT][500];
}
