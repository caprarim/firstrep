export type SplitDay = {
  title: string;
  focus: string;
  exercises: string[];
};

export type Split = {
  id: string;
  name: string;
  tagline: string;
  frequency: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  bestFor: string;
  how: string[];
  schedule: SplitDay[];
  watchOut: string;
  tint: string;
};

export const SPLITS: Split[] = [
  {
    id: 'push-pull-legs',
    name: 'Push, Pull, Legs',
    tagline: 'The most used split in the gym, and the easiest one to not mess up.',
    frequency: '3 or 6 days a week',
    level: 'beginner',
    bestFor: 'Anyone who wants a simple rule for what to train today.',
    how: [
      'Everything that pushes goes on one day. Chest, shoulders, triceps.',
      'Everything that pulls goes on the next. Back, rear shoulders, biceps.',
      'Legs get their own day so they never get skipped.',
      'Run it three days a week to start. Run it twice through for six days once you can actually show up that often.',
    ],
    schedule: [
      {
        title: 'Push',
        focus: 'Chest, shoulders, triceps',
        exercises: [
          'chest-press-machine',
          'machine-shoulder-press',
          'pec-deck',
          'lateral-raise-machine',
          'tricep-pushdown',
        ],
      },
      {
        title: 'Pull',
        focus: 'Back, rear shoulders, biceps',
        exercises: [
          'lat-pulldown',
          'seated-cable-row',
          'rear-delt-fly',
          'preacher-curl',
          'hammer-curl',
        ],
      },
      {
        title: 'Legs',
        focus: 'Quads, hamstrings, calves, abs',
        exercises: [
          'leg-press',
          'leg-extension',
          'seated-leg-curl',
          'calf-raise',
          'ab-crunch-machine',
        ],
      },
    ],
    watchOut:
      'Shoulders get worked on push day and pull day. If they feel beaten up, drop a set, not the exercise.',
    tint: 'bg-orange-500',
  },
  {
    id: 'bro-split',
    name: 'Bro Split',
    tagline: 'One muscle a day, five days a week. The classic gym timetable.',
    frequency: '5 days a week',
    level: 'intermediate',
    bestFor: 'People who love the gym and will genuinely turn up five times a week.',
    how: [
      'Each muscle gets one full session, then a whole week off.',
      'Because it only gets hit once, you need volume. Four or five exercises per day.',
      'It works, but it works slower than it looks if you miss even one day.',
    ],
    schedule: [
      {
        title: 'Chest',
        focus: 'Chest, some triceps',
        exercises: ['chest-press-machine', 'dumbbell-bench-press', 'pec-deck', 'tricep-dip-machine'],
      },
      {
        title: 'Back',
        focus: 'Lats, mid back',
        exercises: [
          'lat-pulldown',
          'seated-cable-row',
          'chest-supported-row',
          'straight-arm-pulldown',
        ],
      },
      {
        title: 'Shoulders',
        focus: 'All three shoulder heads',
        exercises: ['machine-shoulder-press', 'lateral-raise-machine', 'rear-delt-fly', 'face-pull'],
      },
      {
        title: 'Arms',
        focus: 'Biceps, triceps, forearms',
        exercises: [
          'preacher-curl',
          'cable-bicep-curl',
          'tricep-pushdown',
          'overhead-tricep-extension',
          'hammer-curl',
        ],
      },
      {
        title: 'Legs',
        focus: 'Quads, hamstrings, calves',
        exercises: ['leg-press', 'leg-extension', 'seated-leg-curl', 'calf-raise'],
      },
    ],
    watchOut:
      'Miss one day and that muscle waits a full week. This is the worst split for anyone who trains on and off.',
    tint: 'bg-rose-500',
  },
  {
    id: 'upper-lower',
    name: 'Upper and Lower',
    tagline: 'Four days. Everything above the waist, then everything below.',
    frequency: '4 days a week',
    level: 'beginner',
    bestFor: 'Getting every muscle twice a week without living in the gym.',
    how: [
      'Two upper body days and two lower body days.',
      'Hitting a muscle twice a week grows it faster than hitting it once.',
      'The A and B days are the same idea with different exercises, so nothing gets stale.',
    ],
    schedule: [
      {
        title: 'Upper A',
        focus: 'Push heavy, pull heavy',
        exercises: [
          'chest-press-machine',
          'lat-pulldown',
          'machine-shoulder-press',
          'seated-cable-row',
          'tricep-pushdown',
          'preacher-curl',
        ],
      },
      {
        title: 'Lower A',
        focus: 'Quads, hamstrings, abs',
        exercises: ['leg-press', 'seated-leg-curl', 'calf-raise', 'ab-crunch-machine'],
      },
      {
        title: 'Upper B',
        focus: 'Wider grips, more side and rear shoulder',
        exercises: [
          'dumbbell-bench-press',
          'chest-supported-row',
          'lateral-raise-machine',
          'face-pull',
          'hammer-curl',
          'overhead-tricep-extension',
        ],
      },
      {
        title: 'Lower B',
        focus: 'Squat pattern, glutes, calves',
        exercises: ['smith-squat', 'leg-extension', 'hip-abduction', 'calf-raise'],
      },
    ],
    watchOut:
      'Upper days are long. Six exercises is enough, do not add a seventh because you feel fresh.',
    tint: 'bg-sky-500',
  },
  {
    id: 'arnold-split',
    name: 'Arnold Split',
    tagline: 'Chest with back, shoulders with arms, legs alone. Twice a week each.',
    frequency: '6 days a week',
    level: 'advanced',
    bestFor: 'People chasing a wide upper body who can train almost every day.',
    how: [
      'Chest and back are trained together because one pushes and one pulls, so neither gets in the way.',
      'Shoulders and arms share a day, which is a huge amount of work for a small area.',
      'Legs get a full day to themselves, then the whole thing repeats.',
    ],
    schedule: [
      {
        title: 'Chest and Back',
        focus: 'Push and pull in the same session',
        exercises: ['chest-press-machine', 'lat-pulldown', 'pec-deck', 'seated-cable-row'],
      },
      {
        title: 'Shoulders and Arms',
        focus: 'Delts, biceps, triceps',
        exercises: [
          'machine-shoulder-press',
          'lateral-raise-machine',
          'rear-delt-fly',
          'preacher-curl',
          'tricep-pushdown',
        ],
      },
      {
        title: 'Legs',
        focus: 'Quads, hamstrings, calves, abs',
        exercises: [
          'leg-press',
          'leg-extension',
          'seated-leg-curl',
          'calf-raise',
          'ab-crunch-machine',
        ],
      },
    ],
    watchOut:
      'Six days a week with almost no rest. Do not touch this one until you have trained for a year without missing weeks.',
    tint: 'bg-violet-500',
  },
  {
    id: 'muscle-pairs',
    name: 'Back and Biceps Style',
    tagline: 'Pair a big muscle with the small one that helps it. Four days.',
    frequency: '4 days a week',
    level: 'beginner',
    bestFor: 'People who want short, focused sessions that are easy to remember.',
    how: [
      'Your biceps already work during back rows, so you finish them off the same day.',
      'Same idea with chest and triceps, and shoulders with forearms.',
      'Legs and abs share the last day.',
    ],
    schedule: [
      {
        title: 'Back and Biceps',
        focus: 'Lats, mid back, biceps',
        exercises: ['lat-pulldown', 'seated-cable-row', 'straight-arm-pulldown', 'preacher-curl'],
      },
      {
        title: 'Chest and Triceps',
        focus: 'Chest, triceps',
        exercises: ['chest-press-machine', 'pec-deck', 'tricep-pushdown', 'tricep-dip-machine'],
      },
      {
        title: 'Shoulders and Forearms',
        focus: 'Delts, grip',
        exercises: [
          'machine-shoulder-press',
          'lateral-raise-machine',
          'rear-delt-fly',
          'reverse-curl',
          'farmers-carry',
        ],
      },
      {
        title: 'Legs and Abs',
        focus: 'Quads, hamstrings, calves, core',
        exercises: ['leg-press', 'seated-leg-curl', 'calf-raise', 'ab-crunch-machine'],
      },
    ],
    watchOut:
      'Legs are always last, so they are the first thing you skip on a bad week. Move leg day earlier if that keeps happening.',
    tint: 'bg-amber-500',
  },
  {
    id: 'full-body',
    name: 'Full Body',
    tagline: 'Three days, whole body every time. Best return for the least time.',
    frequency: '3 days a week',
    level: 'beginner',
    bestFor: 'Your first few months, or any week where you can only get in three times.',
    how: [
      'One exercise per big movement, every session.',
      'Every muscle gets trained three times a week, which is the fastest way to learn the machines.',
      'Sessions are short. Five exercises, three sets each, done in under an hour.',
    ],
    schedule: [
      {
        title: 'Full Body A',
        focus: 'Everything, push first',
        exercises: [
          'leg-press',
          'chest-press-machine',
          'lat-pulldown',
          'machine-shoulder-press',
          'ab-crunch-machine',
        ],
      },
      {
        title: 'Full Body B',
        focus: 'Everything, pull first',
        exercises: [
          'seated-cable-row',
          'seated-leg-curl',
          'dumbbell-bench-press',
          'lateral-raise-machine',
          'calf-raise',
        ],
      },
      {
        title: 'Full Body C',
        focus: 'Everything, arms and back extra',
        exercises: [
          'smith-squat',
          'chest-supported-row',
          'pec-deck',
          'preacher-curl',
          'tricep-pushdown',
        ],
      },
    ],
    watchOut:
      'Do not turn this into a two hour session. If it is running long you added too many exercises.',
    tint: 'bg-emerald-500',
  },
];
