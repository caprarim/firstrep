# FirstRep

A mobile app that shows gym newcomers how to use the machines — with a 3D figure demonstrating every exercise.

Walking into a gym for the first time is overwhelming. There are forty machines, no instructions, and everyone else looks like they know what they're doing. FirstRep answers the only question that matters: *what is this thing and how do I use it?*

## What it does

- **3D animated demonstrations.** Every exercise renders a rigged humanoid figure performing the movement on a model of the actual machine, at a realistic lifting tempo — quicker on the lift, slower on the lower, with a squeeze at the top. Drag to orbit the camera, pause it, or slow it down.
- **Filter by muscle.** 29 exercises across chest, back, shoulders, biceps, triceps, forearms, core, quads, hamstrings, glutes and calves. Filters stack, and there's a second filter for equipment type (machine / cable / free weight / bodyweight).
- **Real coaching per exercise.** How to set the machine up, how to do the rep, form cues, the common mistakes beginners make, breathing, and a sensible starting weight.
- **A Basics tab** covering the unwritten rules, what "3x10" means, how to pick a weight, and a three-day first week to follow.

No account, no login, no network calls. It's a reference app — it opens and works.

## Install

**[Download firstrep.apk](https://github.com/caprarim/firstrep/releases/latest/download/firstrep.apk)** (44 MB) and sideload it (you'll need to allow install from unknown sources). All builds live on the [releases page](https://github.com/caprarim/firstrep/releases).

Don't click the copy of the APK sitting in `release/` in the file tree — GitHub can't preview a binary that size and shows "Unable to view file" instead of downloading it. Use the link above.

Built for `arm64-v8a`, which covers every Android phone from roughly 2016 onward — but not x86 emulators. For a universal build, set `reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64` in `android/gradle.properties` and rebuild. It's signed with the default debug keystore, which is fine for sideloading but would need a real one for the Play Store.

## Stack

| | |
|---|---|
| Framework | React Native 0.86 + Expo SDK 57 (expo-router) |
| UI | shadcn/ui via [react-native-reusables](https://reactnativereusables.com) + NativeWind |
| 3D | three.js rendered through `expo-gl` |

### How the 3D works

There are no downloaded model or animation assets. The figure is a hand-built forward-kinematic skeleton (`components/three/rig.ts`) — hips → spine → chest → limbs, where rotating a joint swings everything below it. Each exercise defines a start pose and a contracted end pose, and the renderer blends between them on an eased rep curve.

Machines are composed from primitives in `components/three/parts.ts` (frame tubes, upholstered pads, weight stacks, pulleys, cables). Handles are snapped to the figure's hands each frame and cables re-aimed to follow, so the bar always sits in the grip and the weight stack visibly moves with the rep.

Legs are the one place that does use IK: poses are authored as "hips here, feet planted there" and a two-link solver works out the joint angles. Without it, any pose carrying a torso lean or a hip drop — squats, rows, preacher curls — rotates the legs along with the torso and drives the feet through the floor.

`scripts/verify-poses.ts` builds every scene headlessly and asserts nothing clips the floor, collapses, or goes NaN:

```bash
npx esbuild scripts/verify-poses.ts --bundle --platform=node --format=cjs \
  --outfile=.verify.cjs --external:three && node .verify.cjs
```

## Running it

```bash
npm install
npx expo prebuild --platform android
npm run android
```

To rebuild the APK: `npm run apk` (output lands in `android/app/build/outputs/apk/release/`).

---

Built for personal use. Not medical or training advice — if something hurts, stop.
