"use client";

import { useState } from "react";

export type AmbientScene = "rain" | "night-sky" | "fireplace" | "minimal";

type AmbientBackgroundProps = {
  scene: AmbientScene;
};

type AmbientScenePickerProps = {
  scene: AmbientScene;
  onChange: (scene: AmbientScene) => void;
};

const SCENES: { value: AmbientScene; label: string }[] = [
  { value: "rain", label: "Rain" },
  { value: "night-sky", label: "Night sky" },
  { value: "fireplace", label: "Fireplace" },
  { value: "minimal", label: "Minimal" },
];

export function AmbientBackground({ scene }: AmbientBackgroundProps) {
  return (
    <div
      className={`vesh-atmosphere vesh-atmosphere--${scene}`}
      data-scene={scene}
      aria-hidden="true"
    >
      <div className="vesh-atmosphere__vignette" />

      {scene !== "minimal" && (
        <>
          <div className="vesh-atmosphere__glow vesh-atmosphere__glow--one" />
          <div className="vesh-atmosphere__glow vesh-atmosphere__glow--two" />
        </>
      )}

      {scene === "rain" && (
        <div className="vesh-atmosphere__rain">
          {Array.from({ length: 64 }, (_, index) => (
            <i
              key={index}
              style={{
                left: `${(index * 31.7) % 100}%`,
                animationDelay: `${-((index * 0.73) % 12)}s`,
                animationDuration: `${4.5 + (index % 7) * 0.8}s`,
                opacity: 0.12 + (index % 4) * 0.045,
              }}
            />
          ))}
        </div>
      )}

      {scene === "night-sky" && (
        <div className="vesh-atmosphere__stars">
          {Array.from({ length: 65 }, (_, index) => (
            <i
              key={index}
              style={{
                left: `${(index * 37.17) % 100}%`,
                top: `${(index * 19.73) % 88}%`,
                animationDelay: `${-((index * 0.41) % 5)}s`,
                opacity: 0.25 + (index % 5) * 0.12,
              }}
            />
          ))}
        </div>
      )}

      {scene === "fireplace" && (
        <div className="vesh-atmosphere__fire">
          <div className="vesh-atmosphere__fire-glow" />
          <div className="vesh-atmosphere__flames">
            {Array.from({ length: 15 }, (_, index) => (
              <i
                key={index}
                style={{
                  left: `${index * 7}%`,
                  animationDelay: `${-((index * 0.31) % 2)}s`,
                  animationDuration: `${1.2 + (index % 5) * 0.22}s`,
                  height: `${35 + (index % 4) * 13}px`,
                }}
              />
            ))}
          </div>
          <div className="vesh-atmosphere__embers">
            {Array.from({ length: 18 }, (_, index) => (
              <i
                key={index}
                style={{
                  left: `${(index * 43.7) % 100}%`,
                  animationDelay: `${-((index * 0.57) % 8)}s`,
                  animationDuration: `${5 + (index % 4) * 2}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {scene !== "minimal" && (
        <>
          <div className="vesh-atmosphere__haze" />
          <div className="vesh-atmosphere__floor" />
        </>
      )}
    </div>
  );
}

export function AmbientScenePicker({
  scene,
  onChange,
}: AmbientScenePickerProps) {
  const [open, setOpen] = useState(false);

  function closeIfOutside(event: React.FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  }

  return (
    <div
      className={`vesh-scene-picker ${open ? "is-open" : ""}`}
      onBlur={closeIfOutside}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className="vesh-scene-icon-button"
        aria-label={`Environment: ${SCENES.find((item) => item.value === scene)?.label ?? "Rain"}`}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Environment"
        onClick={() => setOpen((value) => !value)}
      >
        
<svg
  viewBox="0 0 24 24"
  width="20"
  height="20"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.45"
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true"
>
  <path d="M19.2 15.1A8.1 8.1 0 0 1 8.9 4.8a8.2 8.2 0 1 0 10.3 10.3Z" />
  <path d="m17.5 3 .55 1.65L19.7 5.2l-1.65.55-.55 1.65-.55-1.65-1.65-.55 1.65-.55L17.5 3Z" />
  <path d="m21 10 .3.9.9.3-.9.3-.3.9-.3-.9-.9-.3.9-.3.3-.9Z" />
</svg>

        <span className="vesh-header-tooltip">Environment</span>
      </button>

      {open && (
        <div className="vesh-scene-icon-menu" role="menu">
          <span className="vesh-scene-icon-menu__heading">
            ENVIRONMENT
          </span>

          {SCENES.map((item) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={scene === item.value}
              key={item.value}
              className={scene === item.value ? "is-active" : ""}
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
            >
              <span>{item.label}</span>
              {scene === item.value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}