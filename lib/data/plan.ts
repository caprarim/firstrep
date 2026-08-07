export type PlanDay = {
  letter: string;
  title: string;
  focus: string;
  exercises: { id: string; sets: string; note?: string }[];
};

export type HomeDay = {
  letter: string;
  title: string;
  exercises: { name: string; sets: string; note?: string }[];
};

export const PROFILE = {
  age: '16, turning 17',
  height: '5 foot 7',
  weight: '50 to 51 kg',
  goal: '57 to 58 kg',
  training: '9 months. 7 at home, 2 in a gym',
  days: '3 to 5 a week',
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
    title: 'Nine months in, but only two of them with real weight',
    lines: [
      'Seven months of pushups and one light dumbbell at home built a base. That is why you are not starting from zero and why you get stronger quickly now.',
      'But light home work stops adding size once your body is used to it. Your real growth clock started two months ago when you walked into a gym. Judge your progress from there, not from nine months ago.',
    ],
  },
  {
    title: 'You train more than you think, just not in a pattern',
    lines: [
      'Three to five days most weeks is plenty. Nobody needs more than that at your age.',
      'The problem is which days move around. A body part quietly gets missed for two weeks and you never notice, because the week never finishes where it started.',
      'The fix below is not more discipline. It is a plan that does not care what day of the week it is.',
    ],
  },
];

export const SPLIT_NOTE = [
  'Right now you run Sunday back and biceps, Monday chest and triceps, Tuesday shoulders and forearms, Wednesday legs and abs, then rest. On paper that is a fine split.',
  'The problem is it is tied to days. Miss Monday and Monday is gone, and you find out two weeks later that chest has had one session and back has had four.',
  'So this one is not tied to days at all. There are four sessions, A B C D. Whenever you train, you do the next letter. Then you go home.',
  'Missed three days? You still just do the next letter. Nothing is ever skipped and you never have to restart on a Monday.',
  'Back and shoulders show up twice in the loop because those are your two goals. Chest gets less, on purpose. Forearms are in there too, they just sit inside the arm work instead of getting their own day.',
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
      { id: 'reverse-curl', sets: '3 sets of 15', note: 'This is your forearm work. It also thickens the top of the arm.' },
    ],
  },
];

export const TRAINING_RULES = [
  'Three to five sessions a week, which is already what you do. Just do the next letter, whatever day it lands on.',
  'A set is one run of an exercise until you stop. A rep is one full movement inside it. So 4 sets of 8 means lift it 8 times, rest, and do that 4 times in total.',
  'Rest 90 seconds between sets. Sit down, do not scroll for five minutes.',
  'Last two reps of every set should be hard. If all 8 were easy, add weight next time.',
  'Write down the weight you used. Beating last week by one rep is the whole game.',
  'No cardio needed. You are trying to gain weight, not burn it.',
];

export const HOME_NOTE = [
  'Same four letters. If you cannot get to the gym on the day your next letter comes up, do the home version of that same letter and move on. It counts. Do not repeat it later.',
  'Your dumbbell only goes to 7.8 kg. That is light, so you make it hard with more reps and slower reps, not heavier weight.',
  'Three seconds lowering on every single rep. With this little weight, slow is the whole trick.',
  'Every dumbbell move here is one arm at a time. That is on purpose, it is what fixes the side that is behind. Weak side first, and the strong side never gets more reps.',
  'This is a backup, not a replacement. The gym is where the size comes from. Home keeps the streak alive.',
];

export const HOME_DAYS: HomeDay[] = [
  {
    letter: 'A',
    title: 'Back and Biceps at home',
    exercises: [
      {
        name: 'One arm dumbbell row',
        sets: '4 sets of 15 each arm',
        note: 'Hand and knee on a bed or chair. Pull the elbow back past your ribs, not out wide. This stands in for the pulldown and the row.',
      },
      {
        name: 'Dumbbell pullover on the floor',
        sets: '3 sets of 15',
        note: 'Lie on your back, both hands on one dumbbell, take it slowly back over your head. Same job as the straight arm pulldown.',
      },
      {
        name: 'Towel row in a doorway',
        sets: '3 sets to failure',
        note: 'Towel round a door handle, lean back, pull yourself in. Closest thing you have to a pull up.',
      },
      { name: 'One arm dumbbell curl', sets: '3 sets of 12 each arm' },
      { name: 'Hammer curl', sets: '3 sets of 15 each arm', note: 'Weak side first.' },
    ],
  },
  {
    letter: 'B',
    title: 'Shoulders and Chest at home',
    exercises: [
      {
        name: 'One arm dumbbell shoulder press',
        sets: '4 sets of 10 each arm',
        note: 'Standing or sitting. Full weight on this one.',
      },
      {
        name: 'Lateral raise',
        sets: '4 sets of 15 each arm',
        note: 'Drop the weight to about 3 or 4 kg. 7.8 is far too heavy here and you will just swing it. This is your best move for looking wider.',
      },
      {
        name: 'Pushups',
        sets: '4 sets, stop 2 reps before you fail',
        note: 'Your chest press stand in.',
      },
      {
        name: 'Feet on the bed pushups',
        sets: '3 sets of 10',
        note: 'Feet raised puts it on the upper chest and front shoulders.',
      },
      { name: 'One arm overhead tricep extension', sets: '3 sets of 12 each arm' },
    ],
  },
  {
    letter: 'C',
    title: 'Legs and Abs at home',
    exercises: [
      {
        name: 'Goblet squat',
        sets: '4 sets of 15',
        note: 'Dumbbell held at your chest. Go all the way down.',
      },
      {
        name: 'Bulgarian split squat',
        sets: '3 sets of 12 each leg',
        note: 'Back foot up on a chair or the bed. Brutal with no weight at all. Only hold the dumbbell once 12 feels easy.',
      },
      {
        name: 'One leg Romanian deadlift',
        sets: '3 sets of 12 each leg',
        note: 'Dumbbell in one hand, hinge at the hip, back straight. Your leg curl stand in.',
      },
      { name: 'Calf raise on a step', sets: '4 sets of 20', note: 'Hold the dumbbell. Pause at the top.' },
      { name: 'Lying leg raises', sets: '3 sets of 15' },
    ],
  },
  {
    letter: 'D',
    title: 'Back, Rear Shoulders and Arms at home',
    exercises: [
      {
        name: 'Chest down row on the bed',
        sets: '4 sets of 12 each arm',
        note: 'Lie face down across the bed so your arm hangs off. No swinging possible, which is the point.',
      },
      {
        name: 'Bent over rear delt raise',
        sets: '3 sets of 15 each arm',
        note: 'Light. Lead with the elbow.',
      },
      {
        name: 'Floor Y raise',
        sets: '3 sets of 12',
        note: 'Face down, arms in a Y, lift them off the floor. No weight. This is your face pull, it is what fixes rounded shoulders.',
      },
      { name: 'One arm curl', sets: '3 sets of 15 each arm' },
      { name: 'One arm overhead tricep extension', sets: '3 sets of 15 each arm' },
      {
        name: 'Reverse curl',
        sets: '3 sets of 15',
        note: 'Palms facing down. This is your forearm work.',
      },
    ],
  },
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
