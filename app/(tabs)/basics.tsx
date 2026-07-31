import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { Text } from '~/components/ui/text';

const FAQ: { q: string; a: string[] }[] = [
  {
    q: 'Is everyone looking at me?',
    a: [
      'No. Everyone in a gym is either counting their own reps, checking their phone between sets, or looking at themselves in the mirror.',
      'The one thing people do notice is someone leaving weights lying around — so put things back and you are already doing better than half the room.',
    ],
  },
  {
    q: 'How do I know what weight to use?',
    a: [
      'Pick something that feels genuinely easy and do 10 reps. If the last rep was still easy, go up. Repeat.',
      'A good working weight is one where the last two reps are hard but your form does not fall apart.',
      'Getting the movement right matters more than the number on the stack. Nobody is impressed by bad reps.',
    ],
  },
  {
    q: 'How many sets and reps?',
    a: [
      'For your first few months: 3 sets of 8–12 reps on each exercise.',
      'Rest 60–90 seconds between sets. Longer for heavy leg work.',
      'Pick 4–6 exercises per session. That is plenty.',
    ],
  },
  {
    q: 'How do I use a machine I have never seen?',
    a: [
      'Every machine has a sticker or plate showing the movement and which muscle it trains. Read it.',
      'Set the seat first. The pivot of the machine should line up with the joint that bends.',
      'Do one set with almost no weight to feel the path before loading it up.',
    ],
  },
  {
    q: 'What does "sets", "reps", and "failure" mean?',
    a: [
      'A rep is one complete movement. A set is a group of reps done back to back.',
      '"3x10" means three sets of ten reps.',
      'Failure means you physically cannot complete another rep with good form. As a beginner you rarely need to go there.',
    ],
  },
  {
    q: 'Can I use a machine someone left weights on?',
    a: [
      'Ask "are you using this?" — that is it. If nobody claims it, it is free.',
      'You are allowed to work in between someone else\'s sets. Most people will say yes.',
      'Unrack their plates or reset the pin, use it, and put it back how you found it.',
    ],
  },
  {
    q: 'How sore should I be?',
    a: [
      'Mild soreness for a day or two after a new exercise is normal, especially at the start.',
      'Sharp pain during a movement is not. Stop, lighten the load, and check your setup.',
      'Soreness is not a scoreboard. You can make excellent progress without being wrecked.',
    ],
  },
];

const RULES = [
  'Re-rack your weights and wipe the pads down.',
  'Do not stand directly in front of the dumbbell rack.',
  'Headphones on is a universal "not chatting right now" signal.',
  'Do not film someone else without asking.',
  'If someone is waiting, let them work in between your sets.',
  'Drop the ego. Nobody cares what you lift, and everyone respects clean form.',
];

const FIRST_WEEK = [
  { day: 'Day 1 — Push', items: ['Machine Chest Press', 'Machine Shoulder Press', 'Tricep Pushdown'] },
  { day: 'Day 2 — Pull', items: ['Lat Pulldown', 'Seated Cable Row', 'Machine Preacher Curl'] },
  { day: 'Day 3 — Legs', items: ['Leg Press', 'Seated Leg Curl', 'Seated Calf Raise'] },
];

export default function BasicsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}>
        <Text className="text-3xl font-extrabold tracking-tight">Basics</Text>
        <Text className="pb-5 text-sm text-muted-foreground">
          The things nobody tells you before your first session.
        </Text>

        <View className="gap-1 rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-primary">
            Your first week
          </Text>
          <Text className="pb-2 text-sm leading-5">
            Three sessions, three exercises each. Do 3 sets of 10 on everything and go lighter than
            you think.
          </Text>
          {FIRST_WEEK.map((d) => (
            <View key={d.day} className="pt-2">
              <Text className="text-sm font-semibold">{d.day}</Text>
              {d.items.map((i) => (
                <Text key={i} className="pl-1 text-sm leading-6 text-foreground/80">
                  • {i}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Text className="pb-2 pt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Unwritten rules
        </Text>
        <View className="gap-2.5 rounded-2xl border border-border bg-card p-4">
          {RULES.map((r, i) => (
            <View key={i} className="flex-row gap-2.5">
              <View className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
              <Text className="flex-1 text-sm leading-5 text-foreground/90">{r}</Text>
            </View>
          ))}
        </View>

        <Text className="pb-1 pt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Questions everyone has
        </Text>
        <Accordion type="multiple" className="w-full">
          {FAQ.map((f, i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger>
                <Text className="flex-1 pr-2 font-semibold">{f.q}</Text>
              </AccordionTrigger>
              <AccordionContent>
                <View className="gap-2 pt-1">
                  {f.a.map((line, j) => (
                    <Text key={j} className="text-sm leading-6 text-foreground/90">
                      {line}
                    </Text>
                  ))}
                </View>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollView>
    </View>
  );
}
