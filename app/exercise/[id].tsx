import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ChevronLeft,
  Gauge,
  ListOrdered,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Wind,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseScene } from '~/components/three/ExerciseScene';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { Badge } from '~/components/ui/badge';
import { Icon } from '~/components/ui/icon';
import { Separator } from '~/components/ui/separator';
import { Text } from '~/components/ui/text';
import { EXERCISE_BY_ID } from '~/lib/data/exercises';
import { MUSCLE_BY_ID, muscleLabel } from '~/lib/data/muscles';
import { cn } from '~/lib/utils';

const TEMPOS = [
  { label: 'Slow', value: 5.2 },
  { label: 'Normal', value: 3.4 },
  { label: 'Fast', value: 2.2 },
];

function Bullets({ items, ordered }: { items: string[]; ordered?: boolean }) {
  return (
    <View className="gap-2.5 pt-1">
      {items.map((line, i) => (
        <View key={i} className="flex-row gap-2.5">
          {ordered ? (
            <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-primary/15">
              <Text className="text-[11px] font-bold text-primary">{i + 1}</Text>
            </View>
          ) : (
            <View className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          )}
          <Text className="flex-1 text-sm leading-6 text-foreground/90">{line}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const exercise = EXERCISE_BY_ID[id ?? ''];

  const [paused, setPaused] = React.useState(false);
  const [tempoIndex, setTempoIndex] = React.useState(1);

  if (!exercise) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background">
        <Text className="font-semibold">Exercise not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text className="text-primary">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const primary = MUSCLE_BY_ID[exercise.primary];

  return (
    <View className="flex-1 bg-background">
      {/* ── 3D viewport ─────────────────────────────────────────── */}
      <View style={{ height: 340 }} className="bg-[#0D0F12]">
        <ExerciseScene
          rig={exercise.rig}
          paused={paused}
          tempo={TEMPOS[tempoIndex].value}
        />

        <View
          className="absolute left-0 right-0 flex-row items-center justify-between px-4"
          style={{ top: insets.top + 4 }}
          pointerEvents="box-none">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-black/50 active:opacity-70">
            <Icon as={ChevronLeft} size={20} className="text-white" />
          </Pressable>
          <View className="flex-row items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5">
            <Icon as={RotateCcw} size={12} className="text-white/70" />
            <Text className="text-[11px] font-medium text-white/70">Drag to rotate</Text>
          </View>
        </View>

        <View
          className="absolute bottom-3 left-0 right-0 flex-row items-center justify-center gap-2"
          pointerEvents="box-none">
          <Pressable
            onPress={() => setPaused((p) => !p)}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80">
            <Icon as={paused ? Play : Pause} size={18} className="text-primary-foreground" />
          </Pressable>
          <View className="flex-row overflow-hidden rounded-full bg-black/55">
            {TEMPOS.map((t, i) => (
              <Pressable
                key={t.label}
                onPress={() => setTempoIndex(i)}
                className={cn('px-3.5 py-2.5 active:opacity-70', i === tempoIndex && 'bg-white/15')}>
                <Text
                  className={cn(
                    'text-[11px] font-semibold',
                    i === tempoIndex ? 'text-white' : 'text-white/50'
                  )}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* ── details ─────────────────────────────────────────────── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          <Text className="text-2xl font-extrabold leading-tight tracking-tight">
            {exercise.name}
          </Text>
          <Text className="text-sm text-muted-foreground">{exercise.machine}</Text>
        </View>

        <View className="flex-row flex-wrap gap-1.5 pt-3">
          <Badge variant="default">
            <Text className="text-[11px]">{muscleLabel(exercise.primary)}</Text>
          </Badge>
          {exercise.secondary.map((m) => (
            <Badge key={m} variant="secondary">
              <Text className="text-[11px]">{muscleLabel(m)}</Text>
            </Badge>
          ))}
          <Badge variant="outline">
            <Text className="text-[11px] capitalize">{exercise.difficulty}</Text>
          </Badge>
        </View>

        <Text className="pt-4 text-[15px] leading-6 text-foreground/90">{exercise.blurb}</Text>

        {primary ? (
          <View className="mt-4 flex-row items-start gap-3 rounded-xl border border-border bg-card p-3.5">
            <View className={cn('mt-1 h-2.5 w-2.5 rounded-full', primary.tint)} />
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Where you should feel it
              </Text>
              <Text className="pt-1 text-sm leading-5">{primary.where}</Text>
            </View>
          </View>
        ) : null}

        <View className="mt-4 gap-1 rounded-xl border border-border bg-card p-3.5">
          <View className="flex-row items-center gap-1.5">
            <Icon as={Wind} size={13} className="text-primary" />
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Breathing
            </Text>
          </View>
          <Text className="text-sm leading-5">{exercise.breathing}</Text>
        </View>

        <View className="mt-3 gap-1 rounded-xl border border-primary/30 bg-primary/10 p-3.5">
          <View className="flex-row items-center gap-1.5">
            <Icon as={Gauge} size={13} className="text-primary" />
            <Text className="text-xs font-bold uppercase tracking-wider text-primary">
              Where to start
            </Text>
          </View>
          <Text className="text-sm leading-5">{exercise.starter}</Text>
        </View>

        <Separator className="my-5" />

        <Accordion type="multiple" defaultValue={['setup', 'steps']} className="w-full">
          <AccordionItem value="setup">
            <AccordionTrigger>
              <View className="flex-row items-center gap-2">
                <Icon as={Settings2} size={15} className="text-primary" />
                <Text className="font-semibold">Setting the machine up</Text>
              </View>
            </AccordionTrigger>
            <AccordionContent>
              <Bullets items={exercise.setup} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="steps">
            <AccordionTrigger>
              <View className="flex-row items-center gap-2">
                <Icon as={ListOrdered} size={15} className="text-primary" />
                <Text className="font-semibold">How to do the rep</Text>
              </View>
            </AccordionTrigger>
            <AccordionContent>
              <Bullets items={exercise.steps} ordered />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cues">
            <AccordionTrigger>
              <View className="flex-row items-center gap-2">
                <Icon as={Lightbulb} size={15} className="text-primary" />
                <Text className="font-semibold">Form cues</Text>
              </View>
            </AccordionTrigger>
            <AccordionContent>
              <Bullets items={exercise.cues} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="mistakes">
            <AccordionTrigger>
              <View className="flex-row items-center gap-2">
                <Icon as={AlertTriangle} size={15} className="text-destructive" />
                <Text className="font-semibold">Common mistakes</Text>
              </View>
            </AccordionTrigger>
            <AccordionContent>
              <Bullets items={exercise.mistakes} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollView>
    </View>
  );
}
