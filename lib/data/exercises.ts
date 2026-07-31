import type { MuscleId } from './muscles';

/** Identifies which 3D machine + animation to build for an exercise. */
export type RigKind =
  | 'lat-pulldown'
  | 'seated-row'
  | 'chest-press'
  | 'pec-deck'
  | 'shoulder-press'
  | 'lateral-raise'
  | 'preacher-curl'
  | 'cable-column'
  | 'assisted-pullup'
  | 'leg-press'
  | 'leg-extension'
  | 'leg-curl'
  | 'calf-raise'
  | 'ab-crunch'
  | 'hip-abduction'
  | 'chest-supported-row'
  | 'flat-bench'
  | 'smith-machine';

export type Rig = {
  kind: RigKind;
  /** Distinguishes exercises that share one physical machine. */
  variant?: string;
};

export type Equipment = 'machine' | 'cable' | 'free weight' | 'bodyweight';

export type Exercise = {
  id: string;
  name: string;
  /** What the thing is called on the gym floor. */
  machine: string;
  equipment: Equipment;
  primary: MuscleId;
  secondary: MuscleId[];
  difficulty: 'beginner' | 'intermediate';
  /** One-line "why you'd do this". */
  blurb: string;
  setup: string[];
  steps: string[];
  cues: string[];
  mistakes: string[];
  breathing: string;
  starter: string;
  rig: Rig;
};

export const EXERCISES: Exercise[] = [
  // ─────────────────────────────── BACK ───────────────────────────────
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    machine: 'Lat Pulldown Tower',
    equipment: 'machine',
    primary: 'back',
    secondary: ['biceps', 'forearms'],
    difficulty: 'beginner',
    blurb: 'The friendliest way to build a wide back before you can do pull-ups.',
    setup: [
      'Set the thigh pad so it presses firmly on your legs — this stops you lifting off the seat.',
      'Stand up, grab the bar slightly wider than shoulder width, then sit down with it.',
      'Pick a weight you can control for 10 reps. Lighter than you think.',
    ],
    steps: [
      'Sit tall, chest up, with a slight lean back from the hips.',
      'Pull the bar down toward your upper chest by driving your elbows down and back.',
      'Stop when the bar is at chin/collarbone height — it does not need to touch.',
      'Let the bar rise back up slowly until your arms are straight and shoulders stretch up.',
    ],
    cues: [
      'Think "elbows to your back pockets", not "hands to my chest".',
      'Squeeze your shoulder blades together at the bottom.',
      'Keep your torso still — if you are rowing your whole body, drop the weight.',
    ],
    mistakes: [
      'Pulling the bar behind your neck. Never do this — it grinds the shoulder joint.',
      'Leaning way back and using momentum.',
      'Letting the bar snap back up and yanking your shoulders.',
    ],
    breathing: 'Breathe out as you pull down, in as the bar rises.',
    starter: 'Roughly 1/3 of your bodyweight for 3 sets of 10.',
    rig: { kind: 'lat-pulldown' },
  },
  {
    id: 'seated-cable-row',
    name: 'Seated Cable Row',
    machine: 'Low Cable Row',
    equipment: 'cable',
    primary: 'back',
    secondary: ['biceps', 'forearms'],
    difficulty: 'beginner',
    blurb: 'Builds the thickness in the middle of your back and fixes desk posture.',
    setup: [
      'Sit down and place your feet flat on the platform, knees slightly bent.',
      'Grab the V-handle, then sit up straight with arms extended.',
      'Your knees should stay soft the whole set — never locked straight.',
    ],
    steps: [
      'Start with arms straight and let your shoulder blades stretch forward.',
      'Pull the handle to your belly button, elbows brushing past your ribs.',
      'Squeeze your shoulder blades together for a beat.',
      'Extend your arms back out slowly under control.',
    ],
    cues: [
      'Chest proud, shoulders down away from your ears.',
      'Elbows stay tucked close to your body.',
      'Your torso should stay near-vertical — a tiny rock is fine, rowing back and forth is not.',
    ],
    mistakes: [
      'Swinging your whole torso like a rowing machine.',
      'Rounding your lower back when you reach forward.',
      'Shrugging your shoulders up toward your ears.',
    ],
    breathing: 'Out as you pull to your stomach, in as you extend.',
    starter: '3 sets of 10–12 with a weight that feels easy for the first 5.',
    rig: { kind: 'seated-row' },
  },
  {
    id: 'chest-supported-row',
    name: 'Chest-Supported Row',
    machine: 'Chest-Supported / Seal Row Machine',
    equipment: 'machine',
    primary: 'back',
    secondary: ['biceps', 'shoulders'],
    difficulty: 'beginner',
    blurb: 'A row where the machine holds your torso still, so you cannot cheat.',
    setup: [
      'Adjust the seat so the handles sit level with your mid-chest.',
      'Lean your chest into the pad and plant your feet.',
      'Take a neutral grip (palms facing each other) if the machine offers one.',
    ],
    steps: [
      'Let your arms hang straight and feel your shoulder blades spread.',
      'Pull the handles back, elbows tracking close to your sides.',
      'Pause when your hands reach your ribs.',
      'Lower slowly until your arms are fully straight again.',
    ],
    cues: [
      'Keep your chest glued to the pad the entire set.',
      'Lead with the elbows, let the hands follow.',
      'Chin tucked — do not crane your neck forward.',
    ],
    mistakes: [
      'Peeling your chest off the pad to move more weight.',
      'Only doing half the range of motion.',
      'Jerking the first inch of the pull.',
    ],
    breathing: 'Out on the pull, in on the return.',
    starter: '3 sets of 10. This one is easy to get right — focus on a slow lower.',
    rig: { kind: 'chest-supported-row' },
  },
  {
    id: 'assisted-pull-up',
    name: 'Assisted Pull-Up',
    machine: 'Assisted Pull-Up / Dip Machine',
    equipment: 'machine',
    primary: 'back',
    secondary: ['biceps', 'forearms', 'core'],
    difficulty: 'beginner',
    blurb: 'Real pull-ups with a counterweight helping you, so you can actually learn them.',
    setup: [
      'On this machine, a HIGHER number means MORE help. That trips everybody up at first.',
      'Set the assist to about half your bodyweight to start.',
      'Step or kneel onto the pad, grab the high bar overhead.',
    ],
    steps: [
      'Hang with arms straight and shoulders relaxed up by your ears.',
      'Pull your shoulder blades down first, then bend your elbows.',
      'Pull until your chin clears the bar.',
      'Lower yourself all the way down slowly.',
    ],
    cues: [
      'Start every rep from a full hang — no bouncing off the bottom.',
      'Drive your elbows down toward the floor.',
      'Squeeze your glutes to stop your legs swinging.',
    ],
    mistakes: [
      'Kipping and swinging to get up.',
      'Stopping halfway down between reps.',
      'Setting the assistance so high that your back never works.',
    ],
    breathing: 'Out on the way up, in on the way down.',
    starter: '3 sets of 6–8. Lower the assist by small steps each week.',
    rig: { kind: 'assisted-pullup' },
  },
  {
    id: 'straight-arm-pulldown',
    name: 'Straight-Arm Pulldown',
    machine: 'Cable Column (high setting)',
    equipment: 'cable',
    primary: 'back',
    secondary: ['core', 'triceps'],
    difficulty: 'intermediate',
    blurb: 'Isolates your lats without your biceps stealing the work.',
    setup: [
      'Set the pulley at the very top and attach a straight bar or rope.',
      'Stand a step back from the machine, feet hip-width.',
      'Hinge forward slightly at the hips with a flat back.',
    ],
    steps: [
      'Start with arms straight out in front, roughly at eye level.',
      'Keeping your elbows almost locked, sweep the bar down to your thighs.',
      'Squeeze your lats hard at the bottom.',
      'Let the bar float back up under control.',
    ],
    cues: [
      'Your elbows barely change angle — this is a shoulder movement, not an arm one.',
      'Feel the stretch under your armpits at the top.',
      'Brace your abs so your lower back does not arch.',
    ],
    mistakes: [
      'Bending the elbows and turning it into a triceps pushdown.',
      'Using so much weight your whole body dips.',
      'Standing too close to the machine.',
    ],
    breathing: 'Out as you sweep down, in as it returns.',
    starter: 'Light. 3 sets of 12–15 to learn the feel.',
    rig: { kind: 'cable-column', variant: 'straight-arm-pulldown' },
  },

  // ─────────────────────────────── BICEPS ───────────────────────────────
  {
    id: 'preacher-curl',
    name: 'Machine Preacher Curl',
    machine: 'Preacher Curl Machine',
    equipment: 'machine',
    primary: 'biceps',
    secondary: ['forearms'],
    difficulty: 'beginner',
    blurb: 'The pad locks your arms in place so only your biceps can move the weight.',
    setup: [
      'Set the seat height so your armpits rest at the top edge of the pad.',
      'Lay the backs of your upper arms flat on the pad.',
      'Grip the handles with palms facing up.',
    ],
    steps: [
      'Start with your arms almost straight — but not locked hard.',
      'Curl the handles up toward your forehead.',
      'Pause and squeeze at the top.',
      'Lower slowly until your arms are long again.',
    ],
    cues: [
      'Keep your armpits pressed into the pad.',
      'The lowering half should take twice as long as the lift.',
      'Wrists stay straight, not bent back.',
    ],
    mistakes: [
      'Lifting your elbows off the pad at the top.',
      'Dropping the weight fast at the bottom — this is where biceps get strained.',
      'Going so heavy your shoulders join in.',
    ],
    breathing: 'Out as you curl up, in as you lower.',
    starter: '3 sets of 10–12. Biceps respond to control, not ego.',
    rig: { kind: 'preacher-curl' },
  },
  {
    id: 'cable-bicep-curl',
    name: 'Cable Bicep Curl',
    machine: 'Cable Column (low setting)',
    equipment: 'cable',
    primary: 'biceps',
    secondary: ['forearms'],
    difficulty: 'beginner',
    blurb: 'Constant tension the whole way up and down — cables never let the muscle rest.',
    setup: [
      'Set the pulley to the lowest position and clip on a straight or EZ bar.',
      'Stand a foot back from the machine, feet shoulder-width.',
      'Grab the bar underhand, arms hanging straight down.',
    ],
    steps: [
      'Pin your elbows lightly against your sides.',
      'Curl the bar up to chest height.',
      'Squeeze for a moment at the top.',
      'Lower all the way until your arms are straight.',
    ],
    cues: [
      'Elbows stay in one spot the whole set — they are the hinge.',
      'Do not swing your hips forward to start the rep.',
      'Keep your shoulders back and down.',
    ],
    mistakes: [
      'Leaning back to heave the weight up.',
      'Elbows drifting forward, which turns it into a front raise.',
      'Half reps that never straighten the arm.',
    ],
    breathing: 'Out on the curl, in on the lower.',
    starter: '3 sets of 12.',
    rig: { kind: 'cable-column', variant: 'bicep-curl' },
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    machine: 'Dumbbells',
    equipment: 'free weight',
    primary: 'biceps',
    secondary: ['forearms'],
    difficulty: 'beginner',
    blurb: 'Thumbs-up grip that hits the biceps and the thick muscle under it at once.',
    setup: [
      'Pick two dumbbells you could curl for 12 clean reps.',
      'Stand tall, feet hip-width, dumbbells at your sides.',
      'Turn your palms to face each other, like holding two hammers.',
    ],
    steps: [
      'Arms hang straight, thumbs pointing forward.',
      'Curl one or both dumbbells up toward your shoulder.',
      'Keep the palms facing inward the whole time — no twisting.',
      'Lower under control to a full stretch.',
    ],
    cues: [
      'Stand still — only the forearms move.',
      'Do not let the dumbbells bang together at the top.',
      'Squeeze the handle hard; grip drives the forearm growth.',
    ],
    mistakes: [
      'Rocking backward and forward to build momentum.',
      'Shrugging the shoulders at the top of each rep.',
      'Rushing the lowering phase.',
    ],
    breathing: 'Out as you curl, in as you lower.',
    starter: '3 sets of 10–12 per arm.',
    rig: { kind: 'flat-bench', variant: 'hammer-curl' },
  },

  // ─────────────────────────────── TRICEPS ───────────────────────────────
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    machine: 'Cable Column (high setting)',
    equipment: 'cable',
    primary: 'triceps',
    secondary: ['forearms'],
    difficulty: 'beginner',
    blurb: 'The single most beginner-proof triceps exercise in the building.',
    setup: [
      'Set the pulley to the top and attach a rope or straight bar.',
      'Stand close to the machine, feet staggered slightly for balance.',
      'Grab the attachment and tuck your elbows against your ribs.',
    ],
    steps: [
      'Start with your elbows bent about 90 degrees, hands at chest height.',
      'Push the attachment straight down until your arms are fully locked.',
      'If using a rope, spread your hands apart at the bottom.',
      'Let it come back up slowly to the 90-degree start.',
    ],
    cues: [
      'Elbows stay glued to your sides — they are the only fixed point.',
      'Lock out fully at the bottom and squeeze for one second.',
      'Lean forward just slightly; do not hunch over the bar.',
    ],
    mistakes: [
      'Letting the elbows flare out and forward, turning it into a chest press.',
      'Using bodyweight to push the bar down.',
      'Letting the weight pull your hands above chest height between reps.',
    ],
    breathing: 'Out as you push down, in as it rises.',
    starter: '3 sets of 12–15.',
    rig: { kind: 'cable-column', variant: 'tricep-pushdown' },
  },
  {
    id: 'overhead-tricep-extension',
    name: 'Overhead Tricep Extension',
    machine: 'Cable Column (low setting) or Dumbbell',
    equipment: 'cable',
    primary: 'triceps',
    secondary: ['shoulders', 'core'],
    difficulty: 'intermediate',
    blurb: 'Stretches the long head of the triceps — the part that adds real size.',
    setup: [
      'Set the pulley low and attach a rope.',
      'Face away from the machine and bring the rope up behind your head.',
      'Stagger your stance so you are stable.',
    ],
    steps: [
      'Start with your hands behind your head, elbows pointing forward and up.',
      'Extend your arms straight overhead.',
      'Squeeze the triceps hard at full lockout.',
      'Bend the elbows to lower behind your head until you feel a stretch.',
    ],
    cues: [
      'Upper arms stay pointed forward and still — only the forearms move.',
      'Brace your abs so your ribs do not flare out.',
      'Go slow at the stretched position; that is where injuries happen.',
    ],
    mistakes: [
      'Letting the elbows flare wide out to the sides.',
      'Arching the lower back to press the weight.',
      'Going too heavy and losing the elbow position.',
    ],
    breathing: 'Out as you extend, in as you lower behind your head.',
    starter: 'Light. 3 sets of 12.',
    rig: { kind: 'cable-column', variant: 'overhead-extension' },
  },
  {
    id: 'tricep-dip-machine',
    name: 'Machine Tricep Dip',
    machine: 'Assisted Dip / Triceps Dip Machine',
    equipment: 'machine',
    primary: 'triceps',
    secondary: ['chest', 'shoulders'],
    difficulty: 'beginner',
    blurb: 'A seated, guided dip — all the triceps work without balancing your bodyweight.',
    setup: [
      'Adjust the seat so the handles sit just beside your lower chest.',
      'Sit upright with your back against the pad.',
      'Take the handles with a neutral grip, palms facing in.',
    ],
    steps: [
      'Start with your elbows bent, hands beside your chest.',
      'Press straight down until your arms lock out.',
      'Hold the lockout briefly and squeeze the back of your arms.',
      'Let the handles rise slowly back to the start.',
    ],
    cues: [
      'Keep your back flat on the pad — no leaning forward to help.',
      'Elbows track backward, not out to the sides.',
      'Full lockout every rep.',
    ],
    mistakes: [
      'Bouncing out of the bottom position.',
      'Shrugging the shoulders up as you press.',
      'Only pressing halfway down.',
    ],
    breathing: 'Out as you press down, in as you come up.',
    starter: '3 sets of 10.',
    rig: { kind: 'assisted-pullup', variant: 'dip' },
  },

  // ─────────────────────────────── FOREARMS ───────────────────────────────
  {
    id: 'cable-wrist-curl',
    name: 'Cable Wrist Curl',
    machine: 'Cable Column (low setting)',
    equipment: 'cable',
    primary: 'forearms',
    secondary: ['biceps'],
    difficulty: 'beginner',
    blurb: 'Directly trains the meat of your forearm and your grip.',
    setup: [
      'Set the pulley to the lowest position with a straight bar.',
      'Sit on a bench with your forearms resting on your thighs.',
      'Hold the bar underhand with your wrists hanging just past your knees.',
    ],
    steps: [
      'Let the bar roll down to your fingertips so your wrists extend fully.',
      'Curl your wrists up, closing your fingers and flexing hard.',
      'Hold the squeeze at the top for a second.',
      'Lower slowly back to the fingertip stretch.',
    ],
    cues: [
      'Forearms never leave your thighs.',
      'This is a small movement — a few inches is the full range.',
      'Squeeze the bar like you are trying to crush it.',
    ],
    mistakes: [
      'Using your biceps to lift the whole forearm.',
      'Going far too heavy and only moving an inch.',
      'Rushing — forearms need slow reps to feel anything.',
    ],
    breathing: 'Out as you curl up, in as you lower.',
    starter: 'Very light. 3 sets of 15–20.',
    rig: { kind: 'cable-column', variant: 'wrist-curl' },
  },
  {
    id: 'reverse-curl',
    name: 'Reverse Curl',
    machine: 'Cable Column or EZ Bar',
    equipment: 'cable',
    primary: 'forearms',
    secondary: ['biceps'],
    difficulty: 'beginner',
    blurb: 'An overhand curl that builds the top of the forearm and thickens your grip.',
    setup: [
      'Low pulley with a straight or EZ bar.',
      'Stand tall, feet shoulder-width.',
      'Grip the bar OVERHAND — knuckles facing up.',
    ],
    steps: [
      'Arms hang straight, bar resting against your thighs.',
      'Curl the bar up to chest height keeping the knuckles leading.',
      'Squeeze at the top.',
      'Lower with control to straight arms.',
    ],
    cues: [
      'Keep your wrists locked straight — do not let the bar bend them down.',
      'Elbows pinned to your sides.',
      'You will need far less weight than a normal curl. That is normal.',
    ],
    mistakes: [
      'Loading it like a regular curl and swinging.',
      'Letting the wrists collapse under the bar.',
      'Bouncing the bar off the thighs.',
    ],
    breathing: 'Out on the way up, in on the way down.',
    starter: '3 sets of 12–15, light.',
    rig: { kind: 'cable-column', variant: 'reverse-curl' },
  },
  {
    id: 'farmers-carry',
    name: "Farmer's Carry",
    machine: 'Dumbbells',
    equipment: 'free weight',
    primary: 'forearms',
    secondary: ['core', 'shoulders'],
    difficulty: 'beginner',
    blurb: 'Pick up heavy things and walk. Brutally effective for grip and core.',
    setup: [
      'Grab a dumbbell in each hand — heavy but not so heavy you drop them.',
      'Find a clear walkway of about 20 metres.',
      'Stand tall with the weights hanging at your sides.',
    ],
    steps: [
      'Brace your abs and pull your shoulders back and down.',
      'Walk at a steady, controlled pace.',
      'Keep the dumbbells from swinging into your legs.',
      'Set them down under control — do not drop them.',
    ],
    cues: [
      'Chest up, eyes forward, ribs stacked over hips.',
      'Crush the handles. Grip is the whole point.',
      'Short controlled steps beat long rushed ones.',
    ],
    mistakes: [
      'Leaning to one side.',
      'Letting the shoulders round forward under the load.',
      'Holding your breath the whole way.',
    ],
    breathing: 'Steady, shallow breaths. Do not hold your breath.',
    starter: '3 walks of 20–30 metres.',
    rig: { kind: 'flat-bench', variant: 'farmers-carry' },
  },

  // ─────────────────────────────── CHEST ───────────────────────────────
  {
    id: 'chest-press-machine',
    name: 'Machine Chest Press',
    machine: 'Seated Chest Press',
    equipment: 'machine',
    primary: 'chest',
    secondary: ['triceps', 'shoulders'],
    difficulty: 'beginner',
    blurb: 'A bench press on rails — no spotter, no balancing, all the chest.',
    setup: [
      'Set the seat so the handles line up with the middle of your chest, not your neck.',
      'Sit back with your whole back on the pad and feet flat.',
      'Grab the handles with a full grip, thumbs wrapped.',
    ],
    steps: [
      'Start with the handles beside your chest and elbows bent.',
      'Press forward until your arms are nearly straight.',
      'Stop just short of locking the elbows hard.',
      'Let the handles come back slowly until you feel a chest stretch.',
    ],
    cues: [
      'Keep your shoulder blades pinched back against the pad.',
      'Elbows at about 45 degrees from your body, not flared to 90.',
      'Press with your chest, not your shoulders.',
    ],
    mistakes: [
      'Setting the seat too low, which turns it into a shoulder press.',
      'Letting the elbows flare straight out to the sides.',
      'Lifting your head or shoulders off the pad.',
    ],
    breathing: 'Out as you press, in as it returns.',
    starter: '3 sets of 10.',
    rig: { kind: 'chest-press' },
  },
  {
    id: 'pec-deck',
    name: 'Pec Deck Fly',
    machine: 'Pec Deck / Butterfly Machine',
    equipment: 'machine',
    primary: 'chest',
    secondary: ['shoulders'],
    difficulty: 'beginner',
    blurb: 'The clearest way to actually feel your chest working.',
    setup: [
      'Set the seat so the handles are at chest height with your elbows slightly bent.',
      'Sit back flat against the pad.',
      'Take the handles with a soft, near-straight arm.',
    ],
    steps: [
      'Start with your arms open wide and feel a stretch across your chest.',
      'Bring the handles together in a hugging arc in front of you.',
      'Squeeze your chest hard when the handles nearly touch.',
      'Open back out slowly to the stretch.',
    ],
    cues: [
      'Imagine hugging a tree — the elbow angle stays fixed.',
      'Keep your back flat on the pad.',
      'Slow at the stretch. Do not let the weight yank your shoulders.',
    ],
    mistakes: [
      'Bending and straightening the elbows, turning it into a press.',
      'Going too heavy and over-stretching the shoulders.',
      'Slamming the handles together.',
    ],
    breathing: 'Out as you bring the handles together, in as you open.',
    starter: '3 sets of 12.',
    rig: { kind: 'pec-deck' },
  },
  {
    id: 'dumbbell-bench-press',
    name: 'Dumbbell Bench Press',
    machine: 'Flat Bench + Dumbbells',
    equipment: 'free weight',
    primary: 'chest',
    secondary: ['triceps', 'shoulders'],
    difficulty: 'intermediate',
    blurb: 'Once machines feel easy, this is the natural next step for chest.',
    setup: [
      'Pick a pair of dumbbells you can press for 10 clean reps.',
      'Sit on the end of the bench with the dumbbells on your thighs.',
      'Kick them up one at a time as you lie back.',
    ],
    steps: [
      'Lie flat, feet planted, dumbbells at chest level with elbows bent.',
      'Press both dumbbells up until your arms are nearly straight.',
      'Do not clang them together at the top.',
      'Lower slowly until your upper arms are level with your torso.',
    ],
    cues: [
      'Shoulder blades pinched together and pressed down into the bench.',
      'Elbows at 45 degrees, not flared out.',
      'Keep your wrists stacked straight over your elbows.',
    ],
    mistakes: [
      'Bouncing the dumbbells off your chest.',
      'Letting your elbows drop way below the bench and straining the shoulder.',
      'Arching your lower back off the bench dramatically.',
    ],
    breathing: 'In as you lower, out as you press.',
    starter: '3 sets of 8–10. Start lighter than your ego wants.',
    rig: { kind: 'flat-bench', variant: 'bench-press' },
  },

  // ─────────────────────────────── SHOULDERS ───────────────────────────────
  {
    id: 'machine-shoulder-press',
    name: 'Machine Shoulder Press',
    machine: 'Seated Shoulder Press',
    equipment: 'machine',
    primary: 'shoulders',
    secondary: ['triceps'],
    difficulty: 'beginner',
    blurb: 'Builds round shoulders with your back fully supported.',
    setup: [
      'Set the seat so the handles start at about ear height.',
      'Sit with your back flat against the pad, feet planted.',
      'Grip the handles with palms facing forward.',
    ],
    steps: [
      'Start with elbows bent and hands beside your head.',
      'Press straight up until your arms are nearly locked overhead.',
      'Pause briefly at the top.',
      'Lower slowly until your hands are back beside your ears.',
    ],
    cues: [
      'Brace your abs so your lower back does not arch off the pad.',
      'Press up, not forward.',
      'Keep your head neutral, chin level.',
    ],
    mistakes: [
      'Setting the start position too low and grinding the shoulders.',
      'Arching the back hard to push the last rep.',
      'Locking the elbows out violently.',
    ],
    breathing: 'Out as you press up, in as you lower.',
    starter: '3 sets of 10. Shoulders fatigue fast — go light.',
    rig: { kind: 'shoulder-press' },
  },
  {
    id: 'lateral-raise-machine',
    name: 'Machine Lateral Raise',
    machine: 'Lateral Raise Machine',
    equipment: 'machine',
    primary: 'shoulders',
    secondary: [],
    difficulty: 'beginner',
    blurb: 'The exercise that actually makes shoulders look wider.',
    setup: [
      'Set the seat so the pivot lines up roughly with your shoulder joint.',
      'Sit upright with your chest against the pad if there is one.',
      'Place your upper arms against the pads, elbows bent.',
    ],
    steps: [
      'Start with your arms down by your sides.',
      'Push your elbows out and up until your upper arms are level with your shoulders.',
      'Pause at the top — no higher than shoulder height.',
      'Lower slowly all the way down.',
    ],
    cues: [
      'Lead with your elbows, not your hands.',
      'Do not shrug — keep your neck long.',
      'Stop at shoulder height; going higher just uses your traps.',
    ],
    mistakes: [
      'Using momentum by bouncing in the seat.',
      'Raising the arms far above shoulder height.',
      'Going heavy — this movement needs light weight and clean reps.',
    ],
    breathing: 'Out as you raise, in as you lower.',
    starter: '3 sets of 12–15, genuinely light.',
    rig: { kind: 'lateral-raise' },
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    machine: 'Cable Column (high setting)',
    equipment: 'cable',
    primary: 'shoulders',
    secondary: ['back'],
    difficulty: 'beginner',
    blurb: 'The best thing you can do for shoulder health and posture. Do these.',
    setup: [
      'Set the pulley at about face height and attach a rope.',
      'Grab the rope with both hands, thumbs pointing back.',
      'Step back until the cable is taut with your arms extended.',
    ],
    steps: [
      'Start with arms straight out toward the machine.',
      'Pull the rope toward your face, splitting your hands apart.',
      'Finish with your hands beside your ears and elbows high.',
      'Extend back out slowly.',
    ],
    cues: [
      'Elbows stay at or above shoulder height.',
      'Think about pulling the rope apart, not just back.',
      'Squeeze the muscles between your shoulder blades.',
    ],
    mistakes: [
      'Pulling to the chest instead of the face with low elbows.',
      'Leaning back and turning it into a row.',
      'Way too much weight.',
    ],
    breathing: 'Out as you pull to your face, in as you extend.',
    starter: '3 sets of 15. Light weight, high reps.',
    rig: { kind: 'cable-column', variant: 'face-pull' },
  },

  // ─────────────────────────────── QUADS ───────────────────────────────
  {
    id: 'leg-press',
    name: 'Leg Press',
    machine: '45° Leg Press',
    equipment: 'machine',
    primary: 'quads',
    secondary: ['glutes', 'hamstrings'],
    difficulty: 'beginner',
    blurb: 'Train your legs heavy without needing to balance a barbell.',
    setup: [
      'Sit with your whole back and hips flat against the pad.',
      'Place your feet shoulder-width in the middle of the platform.',
      'Push the platform up and swing the safety handles out to unlock it.',
    ],
    steps: [
      'Start with your legs nearly straight but knees not locked.',
      'Lower the platform by bending your knees toward your chest.',
      'Stop when your knees reach about 90 degrees — or before your hips lift.',
      'Press back up through your whole foot until nearly straight.',
    ],
    cues: [
      'Knees track in line with your toes, never caving inward.',
      'Keep your lower back pinned to the pad — if it curls under, you went too deep.',
      'Push through your mid-foot and heel.',
    ],
    mistakes: [
      'Locking the knees out hard at the top.',
      'Going so deep your tailbone peels off the seat — that hurts backs.',
      'Placing your hands on your knees.',
    ],
    breathing: 'In as you lower, out as you press.',
    starter: '3 sets of 10. This machine flatters you — stay conservative.',
    rig: { kind: 'leg-press' },
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    machine: 'Leg Extension Machine',
    equipment: 'machine',
    primary: 'quads',
    secondary: [],
    difficulty: 'beginner',
    blurb: 'Isolates the front of your thigh with zero balance required.',
    setup: [
      'Set the backrest so your knees line up with the machine pivot.',
      'Adjust the ankle pad to sit just above your shoes on your shin.',
      'Hold the side handles and sit back firmly.',
    ],
    steps: [
      'Start with your knees bent and the pad against your shins.',
      'Straighten your legs until they are nearly locked out.',
      'Squeeze your quads at the top for a beat.',
      'Lower slowly back to the start.',
    ],
    cues: [
      'Do not slam into full lockout — extend firmly, not violently.',
      'Keep your hips down in the seat.',
      'Point your toes slightly up toward your shins.',
    ],
    mistakes: [
      'Swinging the weight up with a hip thrust.',
      'Letting the weight stack crash down between reps.',
      'Setting the pivot wrong so your knee is strained.',
    ],
    breathing: 'Out as you extend, in as you lower.',
    starter: '3 sets of 12.',
    rig: { kind: 'leg-extension' },
  },

  // ─────────────────────────────── HAMSTRINGS ───────────────────────────────
  {
    id: 'seated-leg-curl',
    name: 'Seated Leg Curl',
    machine: 'Seated Leg Curl Machine',
    equipment: 'machine',
    primary: 'hamstrings',
    secondary: ['calves', 'glutes'],
    difficulty: 'beginner',
    blurb: 'The back of your thigh is half your leg — most beginners skip it.',
    setup: [
      'Line your knees up with the machine pivot.',
      'Set the ankle pad to rest on the back of your lower calves.',
      'Pull the thigh pad down snug across your legs.',
    ],
    steps: [
      'Start with your legs extended out in front of you.',
      'Curl your heels down and back underneath the seat.',
      'Squeeze your hamstrings at the bottom.',
      'Let your legs extend back out slowly.',
    ],
    cues: [
      'Keep your back against the pad and hips still.',
      'Curl with the heels, not by pushing with the toes.',
      'Full stretch at the top of each rep.',
    ],
    mistakes: [
      'Lifting the hips off the seat to move more weight.',
      'Tiny partial reps.',
      'Setting the thigh pad too loose so your legs bounce.',
    ],
    breathing: 'Out as you curl, in as you extend.',
    starter: '3 sets of 12.',
    rig: { kind: 'leg-curl' },
  },

  // ─────────────────────────────── GLUTES ───────────────────────────────
  {
    id: 'hip-abduction',
    name: 'Hip Abduction',
    machine: 'Hip Abduction Machine',
    equipment: 'machine',
    primary: 'glutes',
    secondary: [],
    difficulty: 'beginner',
    blurb: 'Trains the side of your glutes, which stabilises your knees and hips.',
    setup: [
      'Sit with your back flat against the pad.',
      'Place the outside of your knees against the pads.',
      'Set the starting width so your knees begin close together.',
    ],
    steps: [
      'Start with your knees together and pads touching.',
      'Push your knees apart as wide as comfortable.',
      'Hold the outer position for a second.',
      'Bring your knees back together slowly.',
    ],
    cues: [
      'Sit upright — leaning forward changes which part of the glute works.',
      'Do not let the pads snap back together.',
      'Keep your feet flat on the footplates.',
    ],
    mistakes: [
      'Bouncing the pads in and out fast.',
      'Using your hands on the pads to help.',
      'Rushing through a range that is too wide to control.',
    ],
    breathing: 'Out as you push apart, in as you close.',
    starter: '3 sets of 15.',
    rig: { kind: 'hip-abduction' },
  },

  // ─────────────────────────────── CALVES ───────────────────────────────
  {
    id: 'calf-raise',
    name: 'Seated Calf Raise',
    machine: 'Seated Calf Raise Machine',
    equipment: 'machine',
    primary: 'calves',
    secondary: [],
    difficulty: 'beginner',
    blurb: 'Calves need a full stretch and a hard squeeze — this machine gives both.',
    setup: [
      'Sit and place the balls of your feet on the platform edge.',
      'Lower the thigh pad snugly onto your knees.',
      'Release the safety catch.',
    ],
    steps: [
      'Let your heels sink down as far as they will go for a deep stretch.',
      'Push through the balls of your feet to raise your heels as high as possible.',
      'Hold the top squeeze for a full second.',
      'Lower slowly all the way back to the stretch.',
    ],
    cues: [
      'The stretch at the bottom matters as much as the squeeze at the top.',
      'Do not bounce — calves are tendon-heavy and respond to slow reps.',
      'Keep your toes pointing straight ahead.',
    ],
    mistakes: [
      'Fast, tiny bouncing reps.',
      'Not letting the heels drop at the bottom.',
      'Loading it so heavy you can barely move.',
    ],
    breathing: 'Out as you rise, in as you lower.',
    starter: '3 sets of 15 with a one-second pause top and bottom.',
    rig: { kind: 'calf-raise' },
  },

  // ─────────────────────────────── CORE ───────────────────────────────
  {
    id: 'ab-crunch-machine',
    name: 'Machine Ab Crunch',
    machine: 'Ab Crunch Machine',
    equipment: 'machine',
    primary: 'core',
    secondary: [],
    difficulty: 'beginner',
    blurb: 'Lets you actually add weight to your abs instead of endless sit-ups.',
    setup: [
      'Set the seat so the chest pad sits across your upper chest.',
      'Hook your feet under the leg rollers.',
      'Grab the handles over your shoulders.',
    ],
    steps: [
      'Start sitting tall with a slight arch.',
      'Crunch forward by curling your ribcage toward your hips.',
      'Squeeze your abs at the bottom of the crunch.',
      'Uncurl slowly back to sitting tall.',
    ],
    cues: [
      'Curl your spine — do not just hinge at the hips.',
      'Pull with your abs, not by yanking the handles with your arms.',
      'Exhale hard at the bottom to squeeze harder.',
    ],
    mistakes: [
      'Turning it into a hip hinge with a straight back.',
      'Pulling with the arms and shoulders.',
      'Going so heavy the range collapses to a few inches.',
    ],
    breathing: 'Out hard as you crunch, in as you rise.',
    starter: '3 sets of 12–15.',
    rig: { kind: 'ab-crunch' },
  },
  {
    id: 'cable-woodchop',
    name: 'Cable Woodchop',
    machine: 'Cable Column (high setting)',
    equipment: 'cable',
    primary: 'core',
    secondary: ['shoulders', 'glutes'],
    difficulty: 'intermediate',
    blurb: 'Trains your core to resist twisting — which is what it actually does in life.',
    setup: [
      'Set the pulley high and attach a single D-handle.',
      'Stand side-on to the machine, feet wider than shoulders.',
      'Grab the handle with both hands, arms extended up toward the pulley.',
    ],
    steps: [
      'Start with your hands high and to one side, torso rotated slightly toward the machine.',
      'Pull the handle down and across your body toward the opposite hip.',
      'Rotate through your torso and let your back foot pivot.',
      'Return along the same path slowly.',
    ],
    cues: [
      'The rotation comes from your midsection, not your arms.',
      'Keep your arms fairly straight throughout.',
      'Finish with your hips and shoulders facing the same direction.',
    ],
    mistakes: [
      'Rotating only the arms while the torso stays frozen.',
      'Rounding the lower back at the end of the chop.',
      'Letting the weight drag you back up.',
    ],
    breathing: 'Out sharply as you chop down and across.',
    starter: '3 sets of 10 per side, moderate weight.',
    rig: { kind: 'cable-column', variant: 'woodchop' },
  },

  // ─────────────────────────────── FULL BODY / BARBELL ───────────────────────────────
  {
    id: 'smith-squat',
    name: 'Smith Machine Squat',
    machine: 'Smith Machine',
    equipment: 'machine',
    primary: 'quads',
    secondary: ['glutes', 'hamstrings', 'core'],
    difficulty: 'intermediate',
    blurb: 'A squat on fixed rails — great for learning the movement safely.',
    setup: [
      'Set the bar at upper-chest height and load it light.',
      'Step under the bar so it rests across your upper back, not your neck.',
      'Position your feet slightly in front of the bar, shoulder-width apart.',
      'Rotate the bar to unhook it.',
    ],
    steps: [
      'Stand tall with the bar on your traps and your core braced.',
      'Sit down and back, bending at the knees and hips together.',
      'Descend until your thighs are about parallel to the floor.',
      'Drive back up through your whole foot to standing.',
    ],
    cues: [
      'Knees push out in line with your toes.',
      'Chest stays up — do not let it fold forward.',
      'Take a big breath at the top and brace before descending.',
    ],
    mistakes: [
      'Resting the bar on your neck instead of your upper back.',
      'Letting the knees cave inward on the way up.',
      'Standing too far under the bar so your back gets loaded oddly.',
    ],
    breathing: 'Big breath in at the top, hold through the descent, out as you stand.',
    starter: 'Just the bar for 3 sets of 8 until the pattern feels natural.',
    rig: { kind: 'smith-machine', variant: 'squat' },
  },
  {
    id: 'smith-row',
    name: 'Smith Machine Bent-Over Row',
    machine: 'Smith Machine',
    equipment: 'machine',
    primary: 'back',
    secondary: ['biceps', 'forearms', 'core'],
    difficulty: 'intermediate',
    blurb: 'A barbell row where the rails keep the bar path honest.',
    setup: [
      'Set the bar to just below knee height.',
      'Stand with the bar over your mid-foot, feet hip-width.',
      'Hinge at the hips with a flat back and grab the bar overhand.',
    ],
    steps: [
      'Start hinged forward about 45 degrees, arms straight, back flat.',
      'Pull the bar to your lower ribs or belly button.',
      'Squeeze your shoulder blades together at the top.',
      'Lower the bar back down slowly to straight arms.',
    ],
    cues: [
      'Keep your back flat like a table the entire set.',
      'Elbows drive back past your ribs.',
      'Your torso angle should not change during the pull.',
    ],
    mistakes: [
      'Standing up a little on every rep to help the bar move.',
      'Rounding the lower back.',
      'Pulling the bar to your chest with flared elbows.',
    ],
    breathing: 'Out as you row, in as you lower.',
    starter: '3 sets of 8–10 with a weight that lets your back stay flat.',
    rig: { kind: 'smith-machine', variant: 'row' },
  },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = EXERCISES.reduce(
  (acc, e) => {
    acc[e.id] = e;
    return acc;
  },
  {} as Record<string, Exercise>
);

/** Counts of exercises per muscle, used for the filter chips. */
export function countByMuscle(id: MuscleId) {
  return EXERCISES.filter((e) => e.primary === id || e.secondary.includes(id)).length;
}
