import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { EXERCISE_BY_ID } from '~/lib/data/exercises';
import {
  FOOD_TARGETS,
  HOME_DAYS,
  HOME_NOTE,
  HONEST_BITS,
  MEALS,
  PLAN_DAYS,
  PROFILE,
  READ_OUT,
  SPLIT_NOTE,
  TIMELINE,
  TRAINING_RULES,
} from '~/lib/data/plan';
import { muscleLabel } from '~/lib/data/muscles';

const STATS: { label: string; value: string }[] = [
  { label: 'Age', value: PROFILE.age },
  { label: 'Height', value: PROFILE.height },
  { label: 'Weight now', value: PROFILE.weight },
  { label: 'Target', value: PROFILE.goal },
  { label: 'Training for', value: PROFILE.training },
  { label: 'Sessions', value: PROFILE.days },
  { label: 'Sleep', value: PROFILE.sleep },
  { label: 'Food', value: PROFILE.food },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="pb-2 pt-7 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </Text>
  );
}

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <Text className="text-3xl font-extrabold tracking-tight">My Plan</Text>
        <Text className="pb-5 text-sm text-muted-foreground">
          Built around your numbers, your food, and the fact that you train on and off.
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {STATS.map((s) => (
            <View
              key={s.label}
              className="min-w-[47%] flex-1 gap-0.5 rounded-2xl border border-border bg-card px-3.5 py-3">
              <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </Text>
              <Text className="text-sm font-semibold leading-5">{s.value}</Text>
            </View>
          ))}
        </View>

        <View className="mt-3 gap-1 rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <Text className="text-[11px] font-bold uppercase tracking-wider text-primary">
            The short version
          </Text>
          <Text className="text-sm leading-5">
            You are not overweight and you are not out of shape. You are 7 kg of muscle short of the
            body you want. Eat more than you think, train back and shoulders twice a week, and stop
            restarting on Mondays.
          </Text>
        </View>

        <SectionTitle>Where you are right now</SectionTitle>
        <Accordion type="multiple" className="w-full">
          {READ_OUT.map((r, i) => (
            <AccordionItem key={i} value={`r${i}`}>
              <AccordionTrigger>
                <Text className="flex-1 pr-2 font-semibold">{r.title}</Text>
              </AccordionTrigger>
              <AccordionContent>
                <View className="gap-2 pt-1">
                  {r.lines.map((line, j) => (
                    <Text key={j} className="text-sm leading-6 text-foreground/90">
                      {line}
                    </Text>
                  ))}
                </View>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <SectionTitle>Your split</SectionTitle>
        <View className="gap-2.5 rounded-2xl border border-border bg-card p-4">
          {SPLIT_NOTE.map((line, i) => (
            <Text key={i} className="text-sm leading-6 text-foreground/90">
              {line}
            </Text>
          ))}
        </View>

        <View className="gap-3 pt-3">
          {PLAN_DAYS.map((day) => (
            <View key={day.letter} className="overflow-hidden rounded-2xl border border-border bg-card">
              <View className="flex-row items-center gap-3 border-b border-border px-4 py-3">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
                  <Text className="text-sm font-extrabold text-primary-foreground">
                    {day.letter}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold leading-tight">{day.title}</Text>
                  <Text className="text-xs text-muted-foreground">{day.focus}</Text>
                </View>
              </View>

              {day.exercises.map((item) => {
                const ex = EXERCISE_BY_ID[item.id];
                if (!ex) return null;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/exercise/${item.id}`)}
                    className="flex-row items-center gap-3 px-4 py-2.5 active:opacity-70">
                    <View className="flex-1 gap-0.5">
                      <Text className="text-sm font-medium leading-tight">{ex.name}</Text>
                      <Text className="text-[11px] text-primary">{item.sets}</Text>
                      {item.note ? (
                        <Text className="text-[11px] leading-4 text-muted-foreground">
                          {item.note}
                        </Text>
                      ) : (
                        <Text className="text-[11px] text-muted-foreground">
                          {muscleLabel(ex.primary)}
                        </Text>
                      )}
                    </View>
                    <Icon as={ChevronRight} size={14} className="text-muted-foreground" />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <SectionTitle>If you cannot get to the gym</SectionTitle>
        <View className="gap-2.5 rounded-2xl border border-border bg-card p-4">
          {HOME_NOTE.map((line, i) => (
            <Text key={i} className="text-sm leading-6 text-foreground/90">
              {line}
            </Text>
          ))}
        </View>

        <View className="gap-3 pt-3">
          {HOME_DAYS.map((day) => (
            <View
              key={day.letter}
              className="overflow-hidden rounded-2xl border border-border bg-card">
              <View className="flex-row items-center gap-3 border-b border-border px-4 py-3">
                <View className="h-8 w-8 items-center justify-center rounded-full border border-primary">
                  <Text className="text-sm font-extrabold text-primary">{day.letter}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold leading-tight">{day.title}</Text>
                  <Text className="text-xs text-muted-foreground">One dumbbell, up to 7.8 kg</Text>
                </View>
              </View>

              {day.exercises.map((item) => (
                <View key={item.name} className="gap-0.5 px-4 py-2.5">
                  <Text className="text-sm font-medium leading-tight">{item.name}</Text>
                  <Text className="text-[11px] text-primary">{item.sets}</Text>
                  {item.note ? (
                    <Text className="text-[11px] leading-4 text-muted-foreground">{item.note}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </View>

        <SectionTitle>Rules for every session</SectionTitle>
        <View className="gap-2.5 rounded-2xl border border-border bg-card p-4">
          {TRAINING_RULES.map((r, i) => (
            <View key={i} className="flex-row gap-2.5">
              <View className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
              <Text className="flex-1 text-sm leading-5 text-foreground/90">{r}</Text>
            </View>
          ))}
        </View>

        <SectionTitle>Food targets</SectionTitle>
        <View className="flex-row flex-wrap gap-2">
          {FOOD_TARGETS.map((t) => (
            <View
              key={t.label}
              className="min-w-[47%] flex-1 gap-0.5 rounded-2xl border border-border bg-card px-3.5 py-3">
              <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t.label}
              </Text>
              <Text className="text-sm font-semibold leading-5">{t.value}</Text>
            </View>
          ))}
        </View>

        <SectionTitle>What to change about your food</SectionTitle>
        <View className="gap-3">
          {MEALS.map((m) => (
            <View key={m.meal} className="gap-2 rounded-2xl border border-border bg-card p-4">
              <View className="gap-0.5">
                <Text className="text-base font-semibold">{m.meal}</Text>
                <Text className="text-xs text-muted-foreground">Right now: {m.now}</Text>
              </View>
              {m.change.map((line, i) => (
                <View key={i} className="flex-row gap-2.5">
                  <View className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  <Text className="flex-1 text-sm leading-5 text-foreground/90">{line}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <SectionTitle>What actually happens, and when</SectionTitle>
        <View className="gap-2.5 rounded-2xl border border-border bg-card p-4">
          {TIMELINE.map((t) => (
            <View key={t.when} className="gap-0.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-primary">
                {t.when}
              </Text>
              <Text className="text-sm leading-5 text-foreground/90">{t.what}</Text>
            </View>
          ))}
        </View>

        <SectionTitle>Things worth being honest about</SectionTitle>
        <View className="gap-2.5 rounded-2xl border border-border bg-card p-4">
          {HONEST_BITS.map((b, i) => (
            <View key={i} className="flex-row gap-2.5">
              <View className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <Text className="flex-1 text-sm leading-5 text-foreground/90">{b}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
