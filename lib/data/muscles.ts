export const MUSCLE_IDS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
] as const;

export type MuscleId = (typeof MUSCLE_IDS)[number];

export type MuscleGroup = {
  id: MuscleId;
  label: string;
  /** Where it is, in words a beginner will recognise. */
  where: string;
  /** Tailwind classes for the filter chip when active. */
  tint: string;
  region: 'upper' | 'lower' | 'core';
};

export const MUSCLES: MuscleGroup[] = [
  {
    id: 'chest',
    label: 'Chest',
    where: 'Front of your ribcage, under the collarbone',
    tint: 'bg-rose-500',
    region: 'upper',
  },
  {
    id: 'back',
    label: 'Back',
    where: 'Everything from your shoulder blades down to your lower back',
    tint: 'bg-sky-500',
    region: 'upper',
  },
  {
    id: 'shoulders',
    label: 'Shoulders',
    where: 'The rounded caps on the outside of each shoulder',
    tint: 'bg-amber-500',
    region: 'upper',
  },
  {
    id: 'biceps',
    label: 'Biceps',
    where: 'Front of the upper arm — the "flex" muscle',
    tint: 'bg-violet-500',
    region: 'upper',
  },
  {
    id: 'triceps',
    label: 'Triceps',
    where: 'Back of the upper arm, opposite the biceps',
    tint: 'bg-fuchsia-500',
    region: 'upper',
  },
  {
    id: 'forearms',
    label: 'Forearms',
    where: 'Between your elbow and wrist — grip strength lives here',
    tint: 'bg-teal-500',
    region: 'upper',
  },
  {
    id: 'core',
    label: 'Core',
    where: 'Abs and the deep muscles wrapping your midsection',
    tint: 'bg-lime-500',
    region: 'core',
  },
  {
    id: 'quads',
    label: 'Quads',
    where: 'Front of the thigh',
    tint: 'bg-orange-500',
    region: 'lower',
  },
  {
    id: 'hamstrings',
    label: 'Hamstrings',
    where: 'Back of the thigh',
    tint: 'bg-cyan-500',
    region: 'lower',
  },
  {
    id: 'glutes',
    label: 'Glutes',
    where: 'Your backside — the biggest muscle you own',
    tint: 'bg-pink-500',
    region: 'lower',
  },
  {
    id: 'calves',
    label: 'Calves',
    where: 'Back of the lower leg',
    tint: 'bg-emerald-500',
    region: 'lower',
  },
];

export const MUSCLE_BY_ID: Record<MuscleId, MuscleGroup> = MUSCLES.reduce(
  (acc, m) => {
    acc[m.id] = m;
    return acc;
  },
  {} as Record<MuscleId, MuscleGroup>
);

export function muscleLabel(id: MuscleId) {
  return MUSCLE_BY_ID[id]?.label ?? id;
}
