import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { countByMuscle, EXERCISES } from '~/lib/data/exercises';
import { MUSCLES, type MuscleGroup } from '~/lib/data/muscles';
import { cn } from '~/lib/utils';

const REGIONS: { key: MuscleGroup['region']; title: string; note: string }[] = [
  { key: 'upper', title: 'Upper body', note: 'Push, pull, and everything above the waist' },
  { key: 'core', title: 'Core', note: 'The bit that holds the rest together' },
  { key: 'lower', title: 'Lower body', note: 'The biggest muscles you own' },
];

export default function MusclesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}>
        <Text className="text-3xl font-extrabold tracking-tight">Muscles</Text>
        <Text className="pb-5 text-sm text-muted-foreground">
          What each group is, where it sits, and what trains it.
        </Text>

        {REGIONS.map((region) => (
          <View key={region.key} className="pb-6">
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {region.title}
            </Text>
            <Text className="pb-3 text-xs text-muted-foreground/70">{region.note}</Text>

            <View className="gap-2.5">
              {MUSCLES.filter((m) => m.region === region.key).map((m) => {
                const top = EXERCISES.find((e) => e.primary === m.id);
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => router.push({ pathname: '/', params: { muscle: m.id } })}
                    className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4 active:opacity-80">
                    <View className={cn('h-10 w-1.5 rounded-full', m.tint)} />
                    <View className="flex-1 gap-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-semibold">{m.label}</Text>
                        <Text className="text-xs text-muted-foreground">
                          {countByMuscle(m.id)} exercises
                        </Text>
                      </View>
                      <Text className="text-xs leading-4 text-muted-foreground">{m.where}</Text>
                      {top ? (
                        <Text className="pt-0.5 text-xs text-primary">Start with: {top.name}</Text>
                      ) : null}
                    </View>
                    <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
