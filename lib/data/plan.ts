export type PlanDay = {
  letter: string;
  title: string;
  focus: string;
  exercises: { id: string; sets: string; note?: string }[];
};

export const PROFILE = {
  age: '16, turning 17',
  height: '5 foot 7',
  weight: '50 to 51 kg',
  goal: '57 to 58 kg',
  sleep: '8 hours, which is already sorted',
  food: 'Halal only',
  cardio: 'None, and none needed right now',
};

export const READ_OUT: { title: string; lines: string[] }[] = [
  {
    title: 'You are underweight, not overweight',
    lines: [
      'At 5 foot 7 and 50 kg you are below a normal weight for your height. That is the single biggest thing going on.',
      'So the answer is never to eat less. Every problem on this list gets better by eating more and lifting.',
    ],
  },
  {
    title: 'Skinny fat is a muscle problem, not a fat problem',
    lines: [
      'You do not have much fat. You have very little muscle under it, so the small amount of fat you do have has nothing to sit on and shows up soft.',
      'If you try to lose weight you will get smaller and still look soft. Build first.',
    ],
  },
  {
    title: 'The puffy chest',
    lines: [
      'A soft or puffy chest at your age is extremely common. Most of the time it is a normal part of growing and it settles on its own over a year or two.',
      'Chest exercises will not flatten it, and neither will pushups. What actually changes how it looks is the stuff around it getting bigger, so shoulders and back.',
      'If it ever hurts, feels like a hard lump, or only happens on one side, get it checked by a doctor once. That is it, then stop thinking about it.',
    ],
  },
  {
    title: 'Your frame is not the problem',
    lines: [
      'You cannot change how wide your bones are. Nobody can.',
      'What makes someone look wide is the side of the shoulders and the muscles down the side of the back. Both of those grow fast and both are exactly what you said you want to focus on.',
      'So your instinct here is correct. Shoulders and back is the right call.',
    ],
  },
  {
    title: 'One side is bigger than the other',
    lines: [
      'Normal, everyone has it. It gets worse when you only use both arms at the same time on machines.',
      'Fix it by using single arm machines and dumbbells, starting every set with your weaker side, and doing the same number of reps on the strong side. Never more.',
    ],
  },
  {
    title: 'Being on and off is what is actually holding you back',
    lines: [
      'You said it yourself. Some weeks one rest day, some weeks four. That is the real reason nothing has changed.',
      'The fix is below and it is not more discipline. It is a plan that does not care what day of the week it is.',
    ],
  },
];

export const SPLIT_NOTE = [
  'Your current split is fine on paper. The problem is it is tied to days. Monday back, Tuesday chest, and so on. Miss Tuesday and Tuesday is gone.',
  'So this one is not tied to days at all. There are four sessions, A B C D. Whenever you get to the gym, you do the next letter. Then you go home.',
  'Missed three days? You still just do the next letter. Nothing is ever skipped and you never have to restart.',
  'Back and shoulders show up twice in the loop because those are your two goals. Chest gets less, on purpose.',
];

export const PLAN_DAYS: PlanDay[] = [
  {
    letter: 'A',
    title: 'Back and Biceps',
    focus: 'Width. This is your priority day.',
    exercises: [
      { id: 'lat-pulldown', sets: '4 sets of 10', note: 'Wide grip. This is the width builder.' },
      { id: 'seated-cable-row', sets: '3 sets of 10' },
      { id: 'straight-arm-pulldown', sets: '3 sets of 12' },
      { id: 'preacher-curl', sets: '3 sets of 10' },
      { id: 'hammer-curl', sets: '3 sets of 12', note: 'One arm at a time. Weak side first.' },
    ],
  },
  {
    letter: 'B',
    title: 'Shoulders and Chest',
    focus: 'Shoulders go first while you are fresh.',
    exercises: [
      { id: 'machine-shoulder-press', sets: '4 sets of 8' },
      {
        id: 'lateral-raise-machine',
        sets: '4 sets of 15',
        note: 'The single best exercise for looking wider. Light weight, high reps.',
      },
      { id: 'chest-press-machine', sets: '3 sets of 10' },
      { id: 'pec-deck', sets: '2 sets of 12' },
      { id: 'tricep-pushdown', sets: '3 sets of 12' },
    ],
  },
  {
    letter: 'C',
    title: 'Legs and Abs',
    focus: 'Do not skip this one. Legs drive the weight gain.',
    exercises: [
      { id: 'leg-press', sets: '4 sets of 10' },
      { id: 'seated-leg-curl', sets: '3 sets of 12' },
      { id: 'leg-extension', sets: '3 sets of 12' },
      { id: 'calf-raise', sets: '4 sets of 15' },
      { id: 'ab-crunch-machine', sets: '3 sets of 15' },
    ],
  },
  {
    letter: 'D',
    title: 'Back, Rear Shoulders and Arms',
    focus: 'Thickness and posture. The half of the back you cannot see.',
    exercises: [
      { id: 'chest-supported-row', sets: '4 sets of 10' },
      { id: 'assisted-pull-up', sets: '3 sets of 8' },
      { id: 'rear-delt-fly', sets: '3 sets of 15' },
      { id: 'face-pull', sets: '3 sets of 15', note: 'Fixes rounded shoulders. Makes you look bigger standing still.' },
      { id: 'cable-bicep-curl', sets: '3 sets of 12' },
      { id: 'overhead-tricep-extension', sets: '3 sets of 12' },
    ],
  },
];

export const TRAINING_RULES = [
  'Three or four sessions a week. Four is better, three is fine, two is still progress.',
  'Rest 90 seconds between sets. Sit down, do not scroll for five minutes.',
  'Last two reps of every set should be hard. If all ten were easy, add weight next time.',
  'Write down the weight you used. Beating last week by one rep is the whole game.',
  'No cardio needed. You are trying to gain weight, not burn it.',
];

export const FOOD_TARGETS = [
  { label: 'Food per day', value: 'About 2500 calories' },
  { label: 'Protein per day', value: 'About 100 to 110 g' },
  { label: 'Water per day', value: 'About 3 litres' },
  { label: 'Weight gain', value: '0.2 to 0.3 kg per week' },
];

export const MEALS: { meal: string; now: string; change: string[] }[] = [
  {
    meal: 'Breakfast',
    now: '3 eggs and 2 bread',
    change: [
      'Make it 5 eggs and 3 bread.',
      'Add a glass of milk and a banana on the side.',
      'That takes you from roughly 25 g of protein to roughly 45 g, before you have even left the house.',
    ],
  },
  {
    meal: 'Lunch',
    now: 'Rice and chicken or beef, or roti and chicken or beef',
    change: [
      'This is already a good meal. Do not change what it is, change how much.',
      'Ask your mom for a meat portion about the size of your palm and a half, every time.',
      'Take a second scoop of rice or one extra roti. Rice is not the enemy here, it is how you get to 2500.',
    ],
  },
  {
    meal: 'Snack',
    now: 'A protein bar your mom makes, sometimes',
    change: [
      'Make it every day, not sometimes. Around the middle of the afternoon.',
      'Add a glass of milk or a handful of nuts with it.',
    ],
  },
  {
    meal: 'Dinner',
    now: 'Whatever your mom makes',
    change: [
      'Same rule as lunch. Full portion of the meat, plus the rice or roti.',
      'Add a bowl of yogurt after if there is any.',
    ],
  },
  {
    meal: 'If you had a light day',
    now: 'Nothing',
    change: [
      'A glass of milk before bed. Easiest 150 calories you will ever eat.',
      'Never go to sleep having eaten less than usual. Skipped calories do not come back.',
    ],
  },
];

export const TIMELINE = [
  {
    when: 'Weeks 1 to 4',
    what: 'Weight barely moves. Strength jumps a lot. This is normal and it is not fake progress.',
  },
  {
    when: 'Month 2 to 3',
    what: 'Around 1 to 1.5 kg on. Shoulders start to look different in a t shirt before anything else does.',
  },
  {
    when: 'Month 4 to 6',
    what: 'Around 4 to 5 kg on. Back gets noticeably wider. Chest looks less soft because the rest of you caught up.',
  },
  {
    when: 'Month 7 to 9',
    what: 'You hit 57 to 58 kg. That is the goal, and it is a realistic date, not a hopeful one.',
  },
];

export const HONEST_BITS = [
  'Weigh yourself once a week, same morning, before eating. Daily weighing will drive you mad because water alone swings you a full kilo.',
  'You said you lost weight over two weeks of bad eating. That was mostly water and food in your stomach, not muscle. Do not panic about it.',
  'Seven kg of real muscle takes months, not weeks. Anyone promising faster is selling something.',
  'The plan does not work because it is clever. It works because you can keep doing it on a bad week.',
];
