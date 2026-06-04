/**
 * ThemePicker — Accent theme + light/dark mode selector.
 * Displays the 5 premium vibes as selectable tiles and a mode toggle.
 * Uses ThemeProvider for state + persistence.
 */
import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTheme, type AccentTheme } from '@/providers/ThemeProvider';
import { ACCENT_THEMES } from '@/lib/theme';

export function ThemePicker() {
  const { accent, setAccent, mode, toggleMode, colors } = useTheme();

  const handleAccentPress = useCallback((id: AccentTheme) => {
    setAccent(id);
  }, [setAccent]);

  return (
    <View style={{ gap: 16 }}>
      {/* Section header */}
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>
        Appearance
      </Text>

      {/* Light / Dark toggle */}
      <Pressable
        onPress={toggleMode}
        accessibilityRole="switch"
        accessibilityLabel={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
        accessibilityState={{ checked: mode === 'dark' }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.elevated,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 20 }}>{mode === 'dark' ? '🌙' : '☀️'}</Text>
          <Text style={{ color: colors.text, fontSize: 16 }}>{mode === 'dark' ? 'Dark Mode' : 'Light Mode'}</Text>
        </View>
        <View
          style={{
            width: 48,
            height: 28,
            borderRadius: 14,
            backgroundColor: mode === 'dark' ? colors.accent : colors.border,
            padding: 2,
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: colors.surface,
              transform: [{ translateX: mode === 'dark' ? 20 : 0 }],
            }}
          />
        </View>
      </Pressable>

      {/* Accent theme tiles */}
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>
        Accent Theme
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {ACCENT_THEMES.map((t) => {
          const isSelected = accent === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => handleAccentPress(t.id)}
              accessibilityRole="button"
              accessibilityLabel={`${t.name} theme${isSelected ? ', selected' : ''}`}
              accessibilityState={{ selected: isSelected }}
              style={{
                width: 100,
                alignItems: 'center',
                gap: 8,
                padding: 12,
                borderRadius: 16,
                backgroundColor: isSelected ? `${t.previewHex}20` : colors.elevated,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? t.previewHex : colors.border,
              }}
            >
              <Text style={{ fontSize: 28 }}>{t.emoji}</Text>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{t.name}</Text>
              {/* Color preview dot */}
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: t.previewHex,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.text : 'transparent',
                }}
              />
              {isSelected && (
                <Text style={{ color: t.previewHex, fontSize: 10, fontWeight: '600' }}>ACTIVE</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Description of current theme */}
      <Text style={{ color: colors.subtle, fontSize: 12, fontStyle: 'italic' }}>
        {ACCENT_THEMES.find((t) => t.id === accent)?.description}
      </Text>
    </View>
  );
}

export default ThemePicker;
