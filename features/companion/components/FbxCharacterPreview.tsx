"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { useAnimations } from "@react-three/drei";
import * as THREE from "three";

function CharacterModel() {
  const fbx = useLoader(
    FBXLoader,
    "/models/vesh/character.fbx",
  );

  const modelGroup = useRef<THREE.Group>(null);

  const { actions, names } = useAnimations(fbx.animations, fbx);

  const placement = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(fbx);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    const largestDimension = Math.max(size.x, size.y, size.z);
    const scale = largestDimension > 0 ? 2.2 / largestDimension : 1;

    return {
      scale,
      x: -center.x * scale,
      y: -bounds.min.y * scale,
      z: -center.z * scale,
    };
  }, [fbx]);

  useEffect(() => {
    const firstAnimationName = names[0];

    if (!firstAnimationName) return;

    const action = actions[firstAnimationName];

    action?.reset().fadeIn(0.3).play();

    return () => {
      action?.fadeOut(0.3);
    };
  }, [actions, names]);

  return (
    <group
      ref={modelGroup}
      scale={placement.scale}
      position={[placement.x, placement.y, placement.z]}
    >
      <primitive object={fbx} />
    </group>
  );
}

function LoadingFallback() {
  return null;
}

export default function FbxCharacterPreview() {
  return (
    <div className="relative h-[75vh] min-h-[500px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#080d18]">
      <div className="pointer-events-none absolute left-5 top-5 z-10">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
          VESH / Character Lab
        </p>
        <h1 className="mt-2 text-xl font-semibold text-white">
          Humanoid Model Preview
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Drag to rotate · Scroll to zoom
        </p>
      </div>

      <Canvas
        camera={{ position: [0, 1.2, 4], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#080d18"]} />

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

        <Suspense fallback={<LoadingFallback />}>
          <CharacterModel />
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