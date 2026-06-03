import { View, Text, Pressable } from '@/components/tw';
import { useMemo, useState } from 'react';
import { BEACHHEAD_SUBURBS, type BeachheadSuburb } from '@hi-hired/shared';
import { FormBlock } from '@/components/onboarding/FormBlock';

const VISIBLE_COUNT = 6;

interface SuburbPickerProps {
  value: BeachheadSuburb | undefined;
  onChange: (suburb: BeachheadSuburb) => void;
  error?: string;
}

export function SuburbPicker({ value, onChange, error }: SuburbPickerProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleSuburbs = useMemo(() => {
    if (expanded) return [...BEACHHEAD_SUBURBS];
    if (value && !BEACHHEAD_SUBURBS.slice(0, VISIBLE_COUNT).includes(value)) {
      const rest = BEACHHEAD_SUBURBS.filter((s) => s !== value);
      return [value, ...rest.slice(0, VISIBLE_COUNT - 1)];
    }
    return BEACHHEAD_SUBURBS.slice(0, VISIBLE_COUNT);
  }, [expanded, value]);

  const hasMore = BEACHHEAD_SUBURBS.length > VISIBLE_COUNT;

  return (
    <FormBlock
      label="Suburb *"
      hint="Northern Melbourne beachhead — pick where you are based"
      error={error}
    >
      <View className="flex-row flex-wrap gap-2 sm:gap-2.5 md:gap-3">
        {visibleSuburbs.map((suburb) => {
          const selected = value === suburb;
          return (
            <Pressable
              key={suburb}
              onPress={() => onChange(suburb)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`px-3.5 py-2.5 rounded-full border ${
                selected
                  ? 'border-indigo-500 bg-indigo-500/15'
                  : 'border-slate-700 bg-slate-900/90 active:bg-slate-800'
              }`}
            >
              <Text
                className={`text-sm font-medium ${selected ? 'text-indigo-300' : 'text-slate-200'}`}
              >
                {suburb}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {hasMore ? (
        <Pressable onPress={() => setExpanded((e) => !e)} className="mt-3 self-start">
          <Text className="text-indigo-400 text-sm font-medium">
            {expanded ? 'Show fewer suburbs' : `Show all ${BEACHHEAD_SUBURBS.length} suburbs`}
          </Text>
        </Pressable>
      ) : null}
    </FormBlock>
  );
}
