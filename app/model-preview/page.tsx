
"use client";

import { useState } from "react";

import VeshCharacter3D from "@/features/companion/components/VeshCharacter3D";

import type { CompanionState } from "@/features/companion/types/companion.types";

const STATES: CompanionState[] = [
  "ambient",
  "listening",
  "thinking",
  "speaking",
  "working",
  "attention",
];

export default function ModelPreviewPage() {
  const [state, setState] = useState<CompanionState>("ambient");

  return (
    <main className="min-h-screen bg-[#050914] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <VeshCharacter3D state={state} />

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {STATES.map((nextState) => (
            <button
              key={nextState}
              onClick={() => setState(nextState)}
              className={`rounded-lg border px-4 py-2 text-sm capitalize transition ${
                state === nextState
                  ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {nextState}
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-sm text-white/50">
          Preview state: {state}
        </p>
      </div>
    </main>
  );
}
