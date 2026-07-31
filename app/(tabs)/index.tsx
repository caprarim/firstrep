import { useLocalSearchParams } from 'expo-router';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseCard } from '~/components/ExerciseCard';
import { MuscleFilter } from '~/components/MuscleFilter';
import { Icon } from '~/components/ui/icon';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { EXERCISES, type Equipment } from '~/lib/data/exercises';
import type { MuscleId } from '~/lib/data/muscles';
import { cn } from '~/lib/utils';

const EQUIPMENT: Equipment[] = ['machine', 'cable', 'free weight', 'bodyweight'];

export default function ExercisesScreen() {
  const insets = useSafeAreaInsets();
  const [muscles, setMuscles] = React.useState<MuscleId[]>([]);
  const [equipment, setEquipment] = React.useState<Equipment[]>([]);
  const [query, setQuery] = React.useState('');
  const [showEquipment, setShowEquipment] = React.useState(false);

  // Tapping a group on the Muscles tab deep-links here with that filter applied.
  const { muscle } = useLocalSearchParams<{ muscle?: string }>();
  const appliedParam = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (muscle && muscle !== appliedParam.current) {
      appliedParam.current = muscle;
      setMuscles([muscle as MuscleId]);
      setQuery('');
    }
  }, [muscle]);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      if (muscles.length && !muscles.some((m) => e.primary === m || e.secondary.includes(m)))
        return false;
      if (equipment.length && !equipment.includes(e.equipment)) return false;
      if (q && !`${e.name} ${e.machine} ${e.blurb}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [muscles, equipment, query]);

  const filtersActive = muscles.length + equipment.length > 0 || query.length > 0;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="gap-3 px-4 pb-3 pt-2">
        <View>
          <Text className="text-3xl font-extrabold tracking-tight">FirstRep</Text>
          <Text className="text-sm text-muted-foreground">
            Every machine, shown in 3D. Pick a muscle and start.
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3">
            <Icon as={Search} size={16} className="text-muted-foreground" />
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises or machines"
              className="h-11 flex-1 border-0 bg-transparent px-0"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Icon as={X} size={16} className="text-muted-foreground" />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => setShowEquipment((v) => !v)}
            className={cn(
              'h-11 w-11 items-center justify-center rounded-xl border active:opacity-70',
              showEquipment || equipment.length
                ? 'border-primary bg-primary'
                : 'border-border bg-card'
            )}>
            <Icon
              as={SlidersHorizontal}
              size={18}
              className={
                showEquipment || equipment.length ? 'text-primary-foreground' : 'text-foreground'
              }
            />
          </Pressable>
        </View>
      </View>

      <MuscleFilter selected={muscles} onChange={setMuscles} />

      {showEquipment ? (
        <View className="flex-row flex-wrap gap-2 px-4 pt-3">
          {EQUIPMENT.map((eq) => {
            const active = equipment.includes(eq);
            return (
              <Pressable
                key={eq}
                onPress={() =>
                  setEquipment(active ? equipment.filter((x) => x !== eq) : [...equipment, eq])
                }
                className={cn(
                  'rounded-lg border px-3 py-1.5 active:opacity-70',
                  active ? 'border-primary bg-primary/15' : 'border-border bg-card'
                )}>
                <Text
                  className={cn(
                    'text-xs font-semibold capitalize',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}>
                  {eq}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {results.length} {results.length === 1 ? 'exercise' : 'exercises'}
        </Text>
        {filtersActive ? (
          <Pressable
            onPress={() => {
              setMuscles([]);
              setEquipment([]);
              setQuery('');
            }}
            hitSlop={8}>
            <Text className="text-xs font-semibold text-primary">Clear filters</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExerciseCard exercise={item} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center gap-2 rounded-2xl border border-dashed border-border py-12">
            <Text className="font-semibold">Nothing matches that</Text>
            <Text className="px-8 text-center text-sm text-muted-foreground">
              Try removing a muscle filter or clearing the search.
            </Text>
          </View>
        }
      />
    </View>
  );
}
