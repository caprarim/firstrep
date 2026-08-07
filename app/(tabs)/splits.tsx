import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { EXERCISE_BY_ID } from '~/lib/data/exercises';
import { muscleLabel } from '~/lib/data/muscles';
import { SPLITS, type Split } from '~/lib/data/splits';
import { cn } from '~/lib/utils';

function SplitPage({ split, width }: { split: Split; width: number }) {
  const router = useRouter();

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}>
      <View className="flex-row items-center gap-2 pt-1">
        <View className={cn('h-2 w-2 rounded-full', split.tint)} />
        <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {split.frequency}
        </Text>
        <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
          {split.level}
        </Text>
      </View>

      <Text className="pt-1 text-2xl font-extrabold tracking-tight">{split.name}</Text>
      <Text className="pb-4 pt-1 text-sm leading-5 text-muted-foreground">{split.tagline}</Text>

      <View className="gap-1 rounded-2xl border border-border bg-card p-4">
        <Text className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Who it suits
        </Text>
        <Text className="text-sm leading-5">{split.bestFor}</Text>
      </View>

      <Text className="pb-2 pt-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        How it works
      </Text>
      <View className="gap-2.5 rounded-2xl border border-border bg-card p-4">
        {split.how.map((line, i) => (
          <View key={i} className="flex-row gap-2.5">
            <View className={cn('mt-2 h-1.5 w-1.5 rounded-full', split.tint)} />
            <Text className="flex-1 text-sm leading-5 text-foreground/90">{line}</Text>
          </View>
        ))}
      </View>

      <Text className="pb-2 pt-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        The week
      </Text>
      <View className="gap-3">
        {split.schedule.map((day, i) => (
          <View key={day.title} className="overflow-hidden rounded-2xl border border-border bg-card">
            <View className="flex-row items-center gap-3 border-b border-border px-4 py-3">
              <View
                className={cn(
                  'h-7 w-7 items-center justify-center rounded-full',
                  split.tint
                )}>
                <Text className="text-xs font-extrabold text-black">{i + 1}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold leading-tight">{day.title}</Text>
                <Text className="text-xs text-muted-foreground">{day.focus}</Text>
              </View>
            </View>

            {day.exercises.map((id) => {
              const ex = EXERCISE_BY_ID[id];
              if (!ex) return null;
              return (
                <Pressable
                  key={id}
                  onPress={() => router.push(`/exercise/${id}`)}
                  className="flex-row items-center gap-3 px-4 py-2.5 active:opacity-70">
                  <View className="flex-1">
                    <Text className="text-sm font-medium leading-tight">{ex.name}</Text>
                    <Text className="text-[11px] text-muted-foreground">
                      {muscleLabel(ex.primary)} · {ex.machine}
                    </Text>
                  </View>
                  <Icon as={ChevronRight} size={14} className="text-muted-foreground" />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View className="mt-6 gap-1 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <Text className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
          Watch out
        </Text>
        <Text className="text-sm leading-5">{split.watchOut}</Text>
      </View>
    </ScrollView>
  );
}

export default function SplitsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = React.useRef<FlatList<Split>>(null);
  const [index, setIndex] = React.useState(0);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(SPLITS.length - 1, next));
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
    setIndex(clamped);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-3 pt-2">
        <Text className="text-3xl font-extrabold tracking-tight">Splits</Text>
        <Text className="text-sm text-muted-foreground">
          The popular ways to break up a week. Swipe to compare them.
        </Text>
      </View>

      <View className="flex-row items-center gap-3 px-4 pb-3">
        <Pressable
          onPress={() => goTo(index - 1)}
          hitSlop={8}
          disabled={index === 0}
          className={cn('h-8 w-8 items-center justify-center rounded-full border border-border bg-card', index === 0 && 'opacity-30')}>
          <Icon as={ChevronLeft} size={16} className="text-foreground" />
        </Pressable>

        <View className="flex-1 flex-row items-center justify-center gap-1.5">
          {SPLITS.map((s, i) => (
            <Pressable key={s.id} onPress={() => goTo(i)} hitSlop={6}>
              <View
                className={cn(
                  'h-1.5 rounded-full',
                  i === index ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/40'
                )}
              />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => goTo(index + 1)}
          hitSlop={8}
          disabled={index === SPLITS.length - 1}
          className={cn(
            'h-8 w-8 items-center justify-center rounded-full border border-border bg-card',
            index === SPLITS.length - 1 && 'opacity-30'
          )}>
          <Icon as={ChevronRight} size={16} className="text-foreground" />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SPLITS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SplitPage split={item} width={width} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      />
    </View>
  );
}
