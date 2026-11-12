
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { Canvas, useFrame } from "@react-three/fiber";

import {
  OrbitControls,
  useGLTF,
} from "@react-three/drei";

import * as THREE from "three";

import type { CompanionState } from "../types/companion.types";

interface CharacterModelProps {
  state: CompanionState;
}

function CharacterModel({ state }: CharacterModelProps) {
  const group = useRef<THREE.Group>(null);

  // Character skeleton.
  const headRef = useRef<THREE.Bone | null>(null);
  const neckRef = useRef<THREE.Bone | null>(null);
  const spineRef = useRef<THREE.Bone | null>(null);
  const chestRef = useRef<THREE.Bone | null>(null);

  // Original bone poses.
  const headBase = useRef(new THREE.Quaternion());
  const neckBase = useRef(new THREE.Quaternion());
  const spineBase = useRef(new THREE.Quaternion());
  const chestBase = useRef(new THREE.Quaternion());

  // Smooth procedural offsets.
  const headOffset = useRef(new THREE.Quaternion());
  const neckOffset = useRef(new THREE.Quaternion());
  const spineOffset = useRef(new THREE.Quaternion());
  const chestOffset = useRef(new THREE.Quaternion());

  const elapsed = useRef(0);

  const { scene, animations } = useGLTF(
    "/models/vesh/character.glb",
  );

  // Independent animation mixer.
  const mixer = useMemo(
    () => new THREE.AnimationMixer(scene),
    [scene],
  );

  // Character framing.
  const placement = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(scene);

    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    const largestDimension = Math.max(
      size.x,
      size.y,
      size.z,
    );

    const scale =
      largestDimension > 0 ? 2.2 / largestDimension : 1;

    return {
      scale,
      x: -center.x * scale,
      y: -bounds.min.y * scale,
      z: -center.z * scale,
    };
  }, [scene]);

  // Find the actual skeleton bones and save their original poses.
  // Find the actual skeleton bones and save their original poses.
useEffect(() => {
  const bones = new Map<string, THREE.Bone>();

  scene.traverse((object) => {
    if (object instanceof THREE.Bone) {
      bones.set(object.name.toLowerCase(), object);
    }
  });

  const head = bones.get("head") ?? null;
  const neck = bones.get("neck") ?? null;
  const spine = bones.get("spine") ?? null;
  const chest = bones.get("chest") ?? null;

  headRef.current = head;
  neckRef.current = neck;
  spineRef.current = spine;
  chestRef.current = chest;

  if (head) headBase.current.copy(head.quaternion);
  if (neck) neckBase.current.copy(neck.quaternion);
  if (spine) spineBase.current.copy(spine.quaternion);
  if (chest) chestBase.current.copy(chest.quaternion);

  console.log("VESH presence rig:", {
    head: head?.name,
    neck: neck?.name,
    spine: spine?.name,
    chest: chest?.name,
  });

  return () => {
    headRef.current = null;
    neckRef.current = null;
    spineRef.current = null;
    chestRef.current = null;
  };
}, [scene]);

  // Animation selection.
  useEffect(() => {
    const idleClip = animations.find(
      (clip) => clip.name.toLowerCase() === "idle",
    );

    const waveClip = animations.find(
      (clip) => clip.name.toLowerCase() === "wave",
    );

    if (!idleClip) {
      console.warn("VESH: Idle animation not found.");
      return;
    }

    const idleAction = mixer.clipAction(idleClip);
    const waveAction = waveClip
      ? mixer.clipAction(waveClip)
      : null;

    mixer.stopAllAction();

    const selectedAction =
      state === "attention" && waveAction
        ? waveAction
        : idleAction;

    selectedAction.reset();
    selectedAction.enabled = true;
    selectedAction.setEffectiveWeight(1);

    if (selectedAction === waveAction) {
      selectedAction.setLoop(THREE.LoopOnce, 1);
      selectedAction.clampWhenFinished = true;
    } else {
      selectedAction.setLoop(THREE.LoopRepeat, Infinity);
      selectedAction.clampWhenFinished = false;
    }

    selectedAction.fadeIn(0.35).play();

    const handleFinished = (
      event: { action: THREE.AnimationAction },
    ) => {
      if (event.action !== waveAction) return;

      idleAction.reset();
      idleAction.setLoop(THREE.LoopRepeat, Infinity);
      idleAction.clampWhenFinished = false;
      idleAction.fadeIn(0.35).play();
    };

    mixer.addEventListener("finished", handleFinished);

    return () => {
      mixer.removeEventListener("finished", handleFinished);
      mixer.stopAllAction();
    };
  }, [animations, mixer, state]);

  // Procedural presence and state behaviour.
  useFrame((_, delta) => {
    const head = headRef.current;
    const neck = neckRef.current;
    const spine = spineRef.current;
    const chest = chestRef.current;

    if (!head || !neck || !spine || !chest) return;

    elapsed.current += delta;
    const time = elapsed.current;

    // Reset procedural bones before the mixer update.
    head.quaternion.copy(headBase.current);
    neck.quaternion.copy(neckBase.current);
    spine.quaternion.copy(spineBase.current);
    chest.quaternion.copy(chestBase.current);

    // Apply the original GLB animation.
    mixer.update(delta);

    // State-specific head behaviour.
    let headX = 0;
    let headY = 0;
    let headZ = 0;

    switch (state) {
      case "ambient":
        headX = Math.sin(time * 0.45) * 0.015;
        headY = Math.sin(time * 0.3) * 0.025;
        headZ = Math.sin(time * 0.35) * 0.012;
        break;

      case "listening":
        headX = -0.025;
        headY = 0.08;
        headZ = -0.16;
        break;

      case "thinking":
        headX = 0.13;
        headY = -0.15;
        headZ = 0.13;
        break;

      case "speaking":
        headX = Math.sin(time * 1.7) * 0.025;
        headY = Math.sin(time * 1.1) * 0.04;
        headZ = Math.sin(time * 1.3) * 0.025;
        break;

      case "working":
        headX = 0.16;
        headY = 0.015;
        headZ = -0.025;
        break;

      case "attention":
        headX = -0.06;
        headY = 0.035;
        headZ = 0.035;
        break;
    }

    // Subtle breathing-like chest movement.
    const breathing = Math.sin(time * 1.15);
    const bodySway = Math.sin(time * 0.55);

    const chestX = breathing * 0.009;
    const chestZ = breathing * 0.003;

    const spineY = bodySway * 0.006;
    const spineZ = bodySway * 0.004;

    // Build target rotations.
    const headTarget = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(headX, headY, headZ, "XYZ"),
    );

    const neckTarget = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        headX * 0.25,
        headY * 0.25,
        headZ * 0.25,
        "XYZ",
      ),
    );

    const chestTarget = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(chestX, 0, chestZ, "XYZ"),
    );

    const spineTarget = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, spineY, spineZ, "XYZ"),
    );

    // Smooth transitions.
    const smoothing = 1 - Math.exp(-2.5 * delta);

    headOffset.current.slerp(headTarget, smoothing);
    neckOffset.current.slerp(neckTarget, smoothing);
    chestOffset.current.slerp(chestTarget, smoothing);
    spineOffset.current.slerp(spineTarget, smoothing);

    // Apply procedural movement after mixer updates.
    head.quaternion.multiply(headOffset.current);
    neck.quaternion.multiply(neckOffset.current);
    chest.quaternion.multiply(chestOffset.current);
    spine.quaternion.multiply(spineOffset.current);
  });

  return (
    <group
      ref={group}
      scale={placement.scale}
      position={[
        placement.x,
        placement.y,
        placement.z,
      ]}
    >
      <primitive object={scene} />
    </group>
  );
}

interface VeshCharacter3DProps {
  state?: CompanionState;
}

export default function VeshCharacter3D({
  state = "ambient",
}: VeshCharacter3DProps) {
  return (
    <div className="relative h-[75vh] min-h-[500px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#080d18]">
      <div className="pointer-events-none absolute left-5 top-5 z-10">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
          VESH / Character Lab
        </p>

        <h1 className="mt-2 text-xl font-semibold text-white">
          VESH — First Character
        </h1>

        <p className="mt-1 text-sm text-white/50">
          State: {state}
        </p>
      </div>

      <Canvas
        camera={{
          position: [0, 1.2, 4],
          fov: 40,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
        }}
      >
        <color
          attach="background"
          args={["#080d18"]}
        />

        <ambientLight intensity={1.2} />

        <hemisphereLight
          args={["#dceeff", "#18243a", 1.5]}
        />

        <directionalLight
          position={[3, 5, 4]}
          intensity={2.2}
        />

        <directionalLight
          position={[-4, 2, -3]}
          intensity={1.1}
          color="#75cfff"
        />

        <Suspense fallback={null}>
          <CharacterModel state={state} />
        </Suspense>

        <OrbitControls
          makeDefault
          target={[0, 1, 0]}
          enableDamping
          dampingFactor={0.08}
          minDistance={1.5}
          maxDistance={8}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/vesh/character.glb");
