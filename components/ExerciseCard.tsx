import { Link } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Badge } from '~/components/ui/badge';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import type { Exercise } from '~/lib/data/exercises';
import { MUSCLE_BY_ID, muscleLabel } from '~/lib/data/muscles';
import { cn } from '~/lib/utils';

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const tint = MUSCLE_BY_ID[exercise.primary]?.tint ?? 'bg-primary';

  return (
    <Link href={`/exercise/${exercise.id}`} asChild>
      <Pressable className="mb-3 active:opacity-80">
        <View className="flex-row items-center overflow-hidden rounded-2xl border border-border bg-card">
          {/* colour spine identifies the primary muscle at a glance */}
          <View className={cn('h-full w-1.5 self-stretch', tint)} />

          <View className="flex-1 gap-2 px-4 py-3.5">
            <View className="flex-row items-start justify-between gap-2">
              <Text className="flex-1 text-base font-semibold leading-tight">{exercise.name}</Text>
              <Icon as={ChevronRight} size={18} className="mt-0.5 text-muted-foreground" />
            </View>

            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {exercise.machine}
            </Text>

            <View className="flex-row flex-wrap gap-1.5 pt-0.5">
              <Badge variant="default">
                <Text className="text-[10px]">{muscleLabel(exercise.primary)}</Text>
              </Badge>
              {exercise.secondary.slice(0, 2).map((m) => (
                <Badge key={m} variant="secondary">
                  <Text className="text-[10px]">{muscleLabel(m)}</Text>
                </Badge>
              ))}
              <Badge variant="outline">
                <Text className="text-[10px] capitalize">{exercise.equipment}</Text>
              </Badge>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
