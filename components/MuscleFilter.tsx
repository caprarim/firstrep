import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '~/components/ui/text';
import { countByMuscle } from '~/lib/data/exercises';
import { MUSCLES, type MuscleId } from '~/lib/data/muscles';
import { cn } from '~/lib/utils';

type Props = {
  selected: MuscleId[];
  onChange: (next: MuscleId[]) => void;
};

function Chip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'mr-2 flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 active:opacity-70',
        active ? 'border-primary bg-primary' : 'border-border bg-card'
      )}>
      <Text
        className={cn(
          'text-sm font-semibold',
          active ? 'text-primary-foreground' : 'text-foreground'
        )}>
        {label}
      </Text>
      {count !== undefined ? (
        <Text
          className={cn(
            'text-xs font-semibold',
            active ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function MuscleFilter({ selected, onChange }: Props) {
  const toggle = (id: MuscleId) => {
    onChange(selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id]);
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}>
        <Chip label="All" active={selected.length === 0} onPress={() => onChange([])} />
        {MUSCLES.map((m) => (
          <Chip
            key={m.id}
            label={m.label}
            count={countByMuscle(m.id)}
            active={selected.includes(m.id)}
            onPress={() => toggle(m.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
