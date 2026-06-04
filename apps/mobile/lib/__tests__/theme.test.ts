import { describe, it, expect } from 'vitest';
import {
  buildTheme,
  parseAccentTheme,
  parseThemeMode,
  accentHex,
  getAppThemes,
  DEFAULT_ACCENT,
  DEFAULT_MODE,
} from '../theme';

describe('buildTheme (pure palette builder)', () => {
  it('returns a FullColorPalette with 24 keys for midnight dark (default)', () => {
    const t = buildTheme('midnight');
    const keys = Object.keys(t.colors);
    expect(keys.length).toBe(24);
    expect(t.colors.primary).toBe('#6366f1');
    expect(t.colors.background).toBe('#0a0e1a');
    expect(t.colors.text).toBe('#f8fafc');
  });

  it('returns light palette when mode=light', () => {
    const t = buildTheme('midnight', 'light');
    expect(t.colors.background).toBe('#f0f2f8');
    expect(t.colors.text).toBe('#1c1917');
  });

  it('returns correct accent colors for coast', () => {
    const t = buildTheme('coast');
    expect(t.colors.primary).toBe('#14b8a6');
    expect(t.colors.background).toBe('#0b1215');
  });

  it('returns correct accent colors for bloom', () => {
    const t = buildTheme('bloom');
    expect(t.colors.primary).toBe('#f43f5e');
    expect(t.colors.background).toBe('#141012');
  });

  it('returns correct accent colors for hustle', () => {
    const t = buildTheme('hustle');
    expect(t.colors.primary).toBe('#f59e0b');
    expect(t.colors.background).toBe('#11100e');
  });

  it('returns correct accent colors for slate', () => {
    const t = buildTheme('slate');
    expect(t.colors.primary).toBe('#64748b');
    expect(t.colors.background).toBe('#0d0d0d');
  });

  it('produces unique backgrounds per accent in dark mode', () => {
    const themes = ['midnight', 'coast', 'bloom', 'hustle', 'slate'] as const;
    const backgrounds = themes.map((a) => buildTheme(a).colors.background);
    // All 5 should be distinct hex strings
    expect(new Set(backgrounds).size).toBe(5);
  });

  it('has danger always #ef4444 across all accents', () => {
    const themes = ['midnight', 'coast', 'bloom', 'hustle', 'slate'] as const;
    themes.forEach((a) => {
      expect(buildTheme(a).colors.danger).toBe('#ef4444');
    });
  });
});

describe('parseAccentTheme', () => {
  it('returns midnight for null', () => {
    expect(parseAccentTheme(null)).toBe('midnight');
  });

  it('returns midnight for garbage string', () => {
    expect(parseAccentTheme('nonexistent')).toBe('midnight');
  });

  it('returns valid theme for known values', () => {
    expect(parseAccentTheme('coast')).toBe('coast');
    expect(parseAccentTheme('bloom')).toBe('bloom');
    expect(parseAccentTheme('hustle')).toBe('hustle');
    expect(parseAccentTheme('slate')).toBe('slate');
    expect(parseAccentTheme('midnight')).toBe('midnight');
  });
});

describe('parseThemeMode', () => {
  it('returns dark for null (default)', () => {
    expect(parseThemeMode(null)).toBe('dark');
  });

  it('returns dark for garbage string', () => {
    expect(parseThemeMode('aubergine')).toBe('dark');
  });

  it('returns light for "light"', () => {
    expect(parseThemeMode('light')).toBe('light');
  });
});

describe('accentHex', () => {
  it('returns midnight hex by default', () => {
    expect(accentHex('midnight')).toBe('#6366f1');
  });

  it('returns correct hex for each theme', () => {
    expect(accentHex('coast')).toBe('#14b8a6');
    expect(accentHex('bloom')).toBe('#f43f5e');
    expect(accentHex('hustle')).toBe('#f59e0b');
    expect(accentHex('slate')).toBe('#64748b');
  });
});

describe('getAppThemes', () => {
  it('returns 5 themes', () => {
    const themes = getAppThemes();
    expect(themes).toHaveLength(5);
  });

  it('each theme has id, label, description, colors', () => {
    const themes = getAppThemes();
    themes.forEach((t) => {
      expect(t.id).toBeTypeOf('string');
      expect(t.label).toBeTypeOf('string');
      expect(t.description).toBeTypeOf('string');
      expect(t.colors.primary).toBeTypeOf('string');
    });
  });
});
