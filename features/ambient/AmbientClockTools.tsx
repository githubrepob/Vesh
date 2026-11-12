
"use client";

import { useEffect, useRef, useState } from "react";

type WorldClock = {
  city: string;
  timeZone: string;
};

const WORLD_CLOCKS: WorldClock[] = [
  { city: "London", timeZone: "Europe/London" },
  { city: "New York", timeZone: "America/New_York" },
  { city: "Tokyo", timeZone: "Asia/Tokyo" },
  { city: "Dubai", timeZone: "Asia/Dubai" },
];

function formatDuration(milliseconds: number) {
  const totalCentiseconds = Math.floor(milliseconds / 10);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;

  return `${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function formatClock(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default function AmbientClockTools() {
  const [now, setNow] = useState(() => Date.now());

  // Stopwatch
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchElapsed, setStopwatchElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const stopwatchStartedAt = useRef<number | null>(null);
  const stopwatchBase = useRef(0);

  // Countdown timer
  const [durationInput, setDurationInput] = useState("05:00");
  const [remaining, setRemaining] = useState(300_000);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const timerEndAt = useRef<number | null>(null);
  const timerRemaining = useRef(300_000);
  const alarmPlayed = useRef(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      if (stopwatchRunning && stopwatchStartedAt.current !== null) {
        setStopwatchElapsed(
          stopwatchBase.current +
            (currentTime - stopwatchStartedAt.current),
        );
      }

      if (timerRunning && timerEndAt.current !== null) {
        const nextRemaining = Math.max(
          0,
          timerEndAt.current - currentTime,
        );

        setRemaining(nextRemaining);
        timerRemaining.current = nextRemaining;

        if (nextRemaining === 0) {
          setTimerRunning(false);
          setTimerFinished(true);
          timerEndAt.current = null;
        }
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [stopwatchRunning, timerRunning]);

  function startStopwatch() {
    if (stopwatchRunning) return;

    stopwatchStartedAt.current = Date.now();
    stopwatchBase.current = stopwatchElapsed;
    setStopwatchRunning(true);
  }

  function pauseStopwatch() {
    if (!stopwatchRunning) return;

    const elapsed =
      stopwatchBase.current +
      (Date.now() - (stopwatchStartedAt.current ?? Date.now()));

    setStopwatchElapsed(elapsed);
    stopwatchBase.current = elapsed;
    stopwatchStartedAt.current = null;
    setStopwatchRunning(false);
  }

  function resetStopwatch() {
    setStopwatchRunning(false);
    setStopwatchElapsed(0);
    stopwatchBase.current = 0;
    stopwatchStartedAt.current = null;
    setLaps([]);
  }

  function recordLap() {
    setLaps((previous) => [stopwatchElapsed, ...previous]);
  }

  function parseDuration(value: string) {
    const match = value.trim().match(/^(\d{1,3}):([0-5]\d)$/);
    if (!match) return null;

    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const total = (minutes * 60 + seconds) * 1000;

    return total > 0 ? total : null;
  }

  function startTimer() {
    if (timerRunning) return;

    const nextDuration = timerFinished
      ? parseDuration(durationInput)
      : remaining > 0
        ? remaining
        : parseDuration(durationInput);

    if (nextDuration === null) return;

    timerRemaining.current = nextDuration;
    timerEndAt.current = Date.now() + nextDuration;
    setRemaining(nextDuration);
    setTimerFinished(false);
    setTimerRunning(true);
    alarmPlayed.current = false;
  }

  function pauseTimer() {
    if (!timerRunning) return;

    const nextRemaining = Math.max(
      0,
      (timerEndAt.current ?? Date.now()) - Date.now(),
    );

    timerRemaining.current = nextRemaining;
    timerEndAt.current = null;
    setRemaining(nextRemaining);
    setTimerRunning(false);
  }

  function resetTimer() {
    const nextDuration = parseDuration(durationInput) ?? 300_000;

    timerEndAt.current = null;
    timerRemaining.current = nextDuration;
    setRemaining(nextDuration);
    setTimerRunning(false);
    setTimerFinished(false);
    alarmPlayed.current = false;
  }

  function handleDurationChange(value: string) {
    setDurationInput(value);

    const parsed = parseDuration(value);
    if (parsed !== null && !timerRunning) {
      setRemaining(parsed);
      timerRemaining.current = parsed;
      setTimerFinished(false);
    }
  }

  const timerDisplay = formatDuration(remaining).slice(0, 5);

  return (
    <section className="ambient-tools" aria-label="Ambient clock tools">
      <div className="ambient-tools__grid">
        <div className="ambient-tool">
          <span className="ambient-tool__eyebrow">STOPWATCH</span>

          <div className="ambient-tool__value" aria-live="off">
            {formatDuration(stopwatchElapsed)}
          </div>

          <div className="ambient-tool__actions">
            {!stopwatchRunning ? (
              <button type="button" onClick={startStopwatch}>
                {stopwatchElapsed > 0 ? "Resume" : "Start"}
              </button>
            ) : (
              <button type="button" onClick={pauseStopwatch}>
                Pause
              </button>
            )}

            <button
              type="button"
              onClick={recordLap}
              disabled={!stopwatchRunning}
            >
              Lap
            </button>

            <button type="button" onClick={resetStopwatch}>
              Reset
            </button>
          </div>

          {laps.length > 0 && (
            <div className="ambient-tool__laps">
              {laps.slice(0, 3).map((lap, index) => (
                <span key={`${lap}-${index}`}>
                  Lap {laps.length - index}: {formatDuration(lap)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="ambient-tool">
          <span className="ambient-tool__eyebrow">TIMER</span>

          <div className="ambient-tool__value" aria-live="off">
            {timerDisplay}
          </div>

          <label className="ambient-tool__input-label">
            <span>Duration (MM:SS)</span>
            <input
              value={durationInput}
              onChange={(event) =>
                handleDurationChange(event.target.value)
              }
              disabled={timerRunning}
              inputMode="numeric"
              aria-label="Timer duration in minutes and seconds"
              maxLength={6}
            />
          </label>

          <div className="ambient-tool__actions">
            {!timerRunning ? (
              <button type="button" onClick={startTimer}>
                {remaining < (parseDuration(durationInput) ?? 300_000) &&
                !timerFinished
                  ? "Resume"
                  : "Start"}
              </button>
            ) : (
              <button type="button" onClick={pauseTimer}>
                Pause
              </button>
            )}

            <button type="button" onClick={resetTimer}>
              Reset
            </button>
          </div>

          {timerFinished && (
            <span className="ambient-tool__status" role="status">
              Timer complete
            </span>
          )}
        </div>

        <div className="ambient-tool ambient-tool--world">
          <span className="ambient-tool__eyebrow">WORLD CLOCKS</span>

          <div className="ambient-tool__world-list">
            {WORLD_CLOCKS.map((clock) => (
              <div
                className="ambient-tool__world-row"
                key={clock.timeZone}
              >
                <span>{clock.city}</span>
                <time>
                  {formatClock(new Date(now), clock.timeZone)}
                </time>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
