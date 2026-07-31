# FirstRep

A mobile app that shows gym newcomers how to use the machines — with a 3D figure demonstrating every exercise.

Walking into a gym for the first time is overwhelming. There are forty machines, no instructions, and everyone else looks like they know what they're doing. FirstRep answers the only question that matters: *what is this thing and how do I use it?*

## What it does

- **3D animated demonstrations.** Every exercise renders a rigged humanoid figure performing the movement on a model of the actual machine, at a realistic lifting tempo — quicker on the lift, slower on the lower, with a squeeze at the top. Drag to orbit the camera, pause it, or slow it down.
- **Filter by muscle.** Chest, back, shoulders, biceps, triceps, forearms, core, quads, hamstrings, glutes, calves. Filters stack, and there's a second filter for equipment type (machine / cable / free weight / bodyweight).
- **Real coaching per exercise.** How to set the machine up, how to do the rep, form cues, the common mistakes beginners make, breathing, and a sensible starting weight.
- **A Basics tab** covering the unwritten rules, what "3x10" means, how to pick a weight, and a three-day first week to follow.

No account, no login, no network calls. It's a reference app — it opens and works.

## Install

Grab [`release/firstrep.apk`](release/firstrep.apk) and sideload it on any Android device (you'll need to allow install from unknown sources).

## Stack

| | |
|---|---|
| Framework | React Native 0.86 + Expo SDK 57 (expo-router) |
| UI | shadcn/ui via [react-native-reusables](https://reactnativereusables.com) + NativeWind |
| 3D | three.js rendered through `expo-gl` |

### How the 3D works

There are no downloaded model or animation assets. The figure is a hand-built forward-kinematic skeleton (`components/three/rig.ts`) — hips → spine → chest → limbs, where rotating a joint swings everything below it. Each exercise defines a start pose and a contracted end pose, and the renderer blends between them on an eased rep curve.

Machines are composed from primitives in `components/three/parts.ts` (frame tubes, upholstered pads, weight stacks, pulleys, cables). Rather than solving inverse kinematics, handles are snapped to the figure's hands each frame and cables are re-aimed to follow — so the bar always sits in the grip and the weight stack visibly moves with the rep.

## Running it

```bash
npm install
npx expo prebuild --platform android
npm run android
```

To rebuild the APK: `npm run apk` (output lands in `android/app/build/outputs/apk/release/`).

---

Built for personal use. Not medical or training advice — if something hurts, stop.
