import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as React from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import * as THREE from 'three';
import { Text } from '~/components/ui/text';
import type { Rig as RigRef } from '~/lib/data/exercises';
import { createRenderer, disposeTree } from './renderer';
import { blendPose, buildHumanoid, type Humanoid } from './rig';
import { buildScene, type SceneBuild } from './scenes';

/**
 * Lifting tempo for one rep. Real lifting is not a sine wave: the concentric is
 * quicker than the eccentric and there is a squeeze at the top.
 */
function repProgress(u: number) {
  const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  if (u < 0.34) return easeInOut(u / 0.34); // concentric (lift)
  if (u < 0.46) return 1; // squeeze
  if (u < 0.92) return 1 - easeInOut((u - 0.46) / 0.46); // eccentric (lower)
  return 0; // reset breath
}

export type ExerciseSceneProps = {
  rig: RigRef;
  /** Seconds per full rep. */
  tempo?: number;
  paused?: boolean;
  /** 0..1 — drive the rep manually instead of animating. */
  scrub?: number | null;
};

export function ExerciseScene({ rig, tempo = 3.4, paused = false, scrub = null }: ExerciseSceneProps) {
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = React.useState(false);

  // Mutable refs so the render loop never restarts when props change.
  const pausedRef = React.useRef(paused);
  const tempoRef = React.useRef(tempo);
  const scrubRef = React.useRef(scrub);
  pausedRef.current = paused;
  tempoRef.current = tempo;
  scrubRef.current = scrub;

  // `orbit` is the in-progress drag; `orbitBase` banks it on release so
  // successive drags accumulate instead of snapping back.
  const orbit = React.useRef({ azimuth: 0, elevation: 0 });
  const orbitBase = React.useRef({ azimuth: 0, elevation: 0 });
  const teardown = React.useRef<(() => void) | null>(null);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
        onPanResponderMove: (_e, g) => {
          orbit.current.azimuth = g.dx * 0.006;
          orbit.current.elevation = -g.dy * 0.004;
        },
        onPanResponderRelease: () => {
          orbitBase.current.azimuth += orbit.current.azimuth;
          orbitBase.current.elevation += orbit.current.elevation;
          orbit.current.azimuth = 0;
          orbit.current.elevation = 0;
        },
      }),
    []
  );

  React.useEffect(() => () => teardown.current?.(), []);

  const buildContext = React.useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      teardown.current?.();

      const renderer = createRenderer(gl);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0d0f12);
      scene.fog = new THREE.Fog(0x0d0f12, 5.5, 11);

      const camera = new THREE.PerspectiveCamera(
        42,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        60
      );

      // three-point lighting: warm key, cool fill, rim from behind
      const hemi = new THREE.HemisphereLight(0x9fb6d4, 0x1a1d21, 0.75);
      scene.add(hemi);
      const key = new THREE.DirectionalLight(0xfff0dd, 2.1);
      key.position.set(3.2, 5.0, 3.6);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x93b8ff, 0.65);
      fill.position.set(-3.6, 2.2, 1.6);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffa25c, 1.05);
      rim.position.set(-1.4, 2.6, -4.2);
      scene.add(rim);

      const human: Humanoid = buildHumanoid();
      let build: SceneBuild;
      try {
        build = buildScene(rig, human);
      } catch {
        // Never let a single malformed machine take down the screen.
        const fallback = new THREE.Group();
        fallback.add(human.root);
        build = {
          group: fallback,
          camera: { pos: [2.4, 1.6, 2.6], target: [0, 1.0, 0] },
          start: { joints: {} },
          end: { joints: {} },
        };
      }
      scene.add(build.group);

      const target = new THREE.Vector3(...build.camera.target);
      const home = new THREE.Vector3(...build.camera.pos);
      const radius = home.distanceTo(target);
      const baseAzimuth = Math.atan2(home.x - target.x, home.z - target.z);
      const baseElevation = Math.asin((home.y - target.y) / radius);

      let raf = 0;
      let disposed = false;
      let clock = 0;
      let last = Date.now();

      const frame = () => {
        if (disposed) return;
        raf = requestAnimationFrame(frame);

        try {
          step();
        } catch (err) {
          disposed = true;
          cancelAnimationFrame(raf);
          setFailed(true);
        }
      };

      const step = () => {
        const now = Date.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        let t: number;
        if (scrubRef.current !== null && scrubRef.current !== undefined) {
          t = scrubRef.current;
        } else {
          if (!pausedRef.current) clock += dt / Math.max(0.5, tempoRef.current);
          t = repProgress(clock % 1);
        }

        blendPose(human, build.start, build.end, t);
        build.update?.(t, human);

        const az = baseAzimuth + orbit.current.azimuth + orbitBase.current.azimuth;
        const el = Math.max(
          -0.25,
          Math.min(1.15, baseElevation + orbit.current.elevation + orbitBase.current.elevation)
        );
        camera.position.set(
          target.x + radius * Math.cos(el) * Math.sin(az),
          target.y + radius * Math.sin(el),
          target.z + radius * Math.cos(el) * Math.cos(az)
        );
        camera.lookAt(target);

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      frame();

      teardown.current = () => {
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(raf);
        // The GL context may already be gone if the view was torn down first,
        // in which case disposal is a no-op we should not crash on.
        try {
          disposeTree(scene);
          renderer.dispose();
        } catch {
          /* context already destroyed */
        }
      };
    },
    [rig]
  );

  // A GL failure must degrade to a still, readable screen — an uncaught throw in
  // this callback terminates the whole app in a release build.
  const onContextCreate = React.useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      try {
        buildContext(gl);
      } catch (err) {
        setFailed(true);
      }
    },
    [buildContext]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && !size) setSize({ w: width, h: height });
  };

  return (
    <View className="flex-1 overflow-hidden" onLayout={onLayout} {...panResponder.panHandlers}>
      {failed ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-xs text-white/40">
            The 3D view isn't available on this device. The instructions below still apply.
          </Text>
        </View>
      ) : size ? (
        <GLView
          key={`${rig.kind}:${rig.variant ?? ''}`}
          style={{ width: size.w, height: size.h }}
          onContextCreate={onContextCreate}
        />
      ) : null}
    </View>
  );
}
