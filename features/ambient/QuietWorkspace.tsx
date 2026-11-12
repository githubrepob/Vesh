
"use client";

import { useEffect, useRef, useState } from "react";

type Soundscape = "rain" | "brown" | "focus";

const CITIES = [
  { name: "London", zone: "Europe/London" },
  { name: "New York", zone: "America/New_York" },
  { name: "Tokyo", zone: "Asia/Tokyo" },
  { name: "Dubai", zone: "Asia/Dubai" },
];

function formatStopwatch(ms: number) {
  const centiseconds = Math.floor(ms / 10);
  const minutes = Math.floor(centiseconds / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  const fraction = centiseconds % 100;

  return `${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}.${String(fraction).padStart(2, "0")}`;
}

function formatTimer(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getDuration(value: string) {
  const match = value.trim().match(/^(\d{1,3}):([0-5]\d)$/);
  if (!match) return null;

  const duration = (Number(match[1]) * 60 + Number(match[2])) * 1000;
  return duration > 0 ? duration : null;
}

function getCityTime(zone: string, date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default function QuietWorkspace() {
  const [now, setNow] = useState(() => new Date());

  // Stopwatch
  const [elapsed, setElapsed] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const stopwatchStart = useRef(0);
  const stopwatchBase = useRef(0);

  // Countdown
  const [durationInput, setDurationInput] = useState("25:00");
  const [remaining, setRemaining] = useState(25 * 60 * 1000);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const timerEnd = useRef<number | null>(null);

  // Soundscape
  const [soundscape, setSoundscape] = useState<Soundscape>("rain");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(28);
  const [audioError, setAudioError] = useState("");

  const audioContext = useRef<AudioContext | null>(null);
  const audioNodes = useRef<AudioNode[]>([]);
  const masterGain = useRef<GainNode | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const timestamp = Date.now();
      setNow(new Date(timestamp));

      if (stopwatchRunning) {
        setElapsed(
          stopwatchBase.current + timestamp - stopwatchStart.current,
        );
      }

      if (timerRunning && timerEnd.current !== null) {
        const next = Math.max(0, timerEnd.current - timestamp);
        setRemaining(next);

        if (next === 0) {
          setTimerRunning(false);
          setTimerFinished(true);
          timerEnd.current = null;
        }
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [stopwatchRunning, timerRunning]);

  useEffect(() => {
    return () => {
      audioNodes.current.forEach((node) => {
        try {
          node.disconnect();
        } catch {
          // Already disconnected.
        }
      });

      void audioContext.current?.close();
    };
  }, []);

  useEffect(() => {
    if (masterGain.current && audioContext.current) {
      masterGain.current.gain.setTargetAtTime(
        volume / 100,
        audioContext.current.currentTime,
        0.12,
      );
    }
  }, [volume]);

  function startStopwatch() {
    if (stopwatchRunning) return;

    stopwatchStart.current = Date.now();
    stopwatchBase.current = elapsed;
    setStopwatchRunning(true);
  }

  function pauseStopwatch() {
    if (!stopwatchRunning) return;

    const value =
      stopwatchBase.current + Date.now() - stopwatchStart.current;

    stopwatchBase.current = value;
    setElapsed(value);
    setStopwatchRunning(false);
  }

  function resetStopwatch() {
    setStopwatchRunning(false);
    stopwatchStart.current = 0;
    stopwatchBase.current = 0;
    setElapsed(0);
  }

  function startTimer() {
    if (timerRunning) return;

    const next = timerFinished
      ? getDuration(durationInput)
      : remaining > 0
        ? remaining
        : getDuration(durationInput);

    if (next === null) return;

    timerEnd.current = Date.now() + next;
    setRemaining(next);
    setTimerFinished(false);
    setTimerRunning(true);
  }

  function pauseTimer() {
    if (!timerRunning) return;

    const next = Math.max(0, (timerEnd.current ?? Date.now()) - Date.now());

    timerEnd.current = null;
    setRemaining(next);
    setTimerRunning(false);
  }

  function resetTimer() {
    const next = getDuration(durationInput) ?? 25 * 60 * 1000;

    timerEnd.current = null;
    setRemaining(next);
    setTimerRunning(false);
    setTimerFinished(false);
  }

  function changeDuration(value: string) {
    setDurationInput(value);

    const parsed = getDuration(value);

    if (parsed !== null && !timerRunning) {
      setRemaining(parsed);
      setTimerFinished(false);
    }
  }

  function createNoiseBuffer(context: AudioContext, brown: boolean) {
    const length = context.sampleRate * 4;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;

    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;

      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[index] = last * 3.5;
      } else {
        data[index] = white * 0.65;
      }
    }

    return buffer;
  }

  async function startSoundscape() {
    try {
      const context =
        audioContext.current ?? new AudioContext();

      audioContext.current = context;

      if (context.state === "suspended") {
        await context.resume();
      }

      audioNodes.current.forEach((node) => {
        try {
          node.disconnect();
        } catch {
          // Ignore disconnected nodes.
        }
      });
      audioNodes.current = [];

      const master = context.createGain();
      master.gain.value = volume / 100;
      master.connect(context.destination);
      masterGain.current = master;

      const nodes: AudioNode[] = [master];

      if (soundscape === "rain" || soundscape === "brown") {
        const source = context.createBufferSource();
        source.buffer = createNoiseBuffer(
          context,
          soundscape === "brown",
        );
        source.loop = true;

        const filter = context.createBiquadFilter();
        filter.type = soundscape === "rain" ? "bandpass" : "lowpass";
        filter.frequency.value =
          soundscape === "rain" ? 950 : 240;
        filter.Q.value = soundscape === "rain" ? 0.55 : 0.7;

        const highPass = context.createBiquadFilter();
        highPass.type = "highpass";
        highPass.frequency.value =
          soundscape === "rain" ? 180 : 35;

        source.connect(filter);
        filter.connect(highPass);
        highPass.connect(master);
        source.start();

        nodes.push(source, filter, highPass);
      } else {
        const frequencies = [110, 164.81, 220];

        frequencies.forEach((frequency, index) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();

          oscillator.type = "sine";
          oscillator.frequency.value = frequency;
          gain.gain.value = index === 0 ? 0.12 : 0.045;

          oscillator.connect(gain);
          gain.connect(master);
          oscillator.start();

          nodes.push(oscillator, gain);
        });
      }

      audioNodes.current = nodes;
      setPlaying(true);
      setAudioError("");
    } catch {
      setAudioError("Audio could not start in this browser.");
      setPlaying(false);
    }
  }

  function stopSoundscape() {
    audioNodes.current.forEach((node) => {
      try {
        if ("stop" in node && typeof node.stop === "function") {
          node.stop();
        }
        node.disconnect();
      } catch {
        // Already stopped.
      }
    });

    audioNodes.current = [];
    masterGain.current = null;
    setPlaying(false);
  }

  function chooseSoundscape(next: Soundscape) {
    setSoundscape(next);

    if (playing) {
      stopSoundscape();
    }
  }

  return (
    <section className="quiet-workspace" aria-label="Quiet workspace">
      <div className="quiet-tools">
        <article className="quiet-tool">
          <div className="quiet-tool__heading">
            <span>STOPWATCH</span>
            <span className="quiet-tool__symbol">◷</span>
          </div>

          <div className="quiet-tool__time">
            {formatStopwatch(elapsed)}
          </div>

          <div className="quiet-tool__actions">
            <button
              type="button"
              onClick={stopwatchRunning ? pauseStopwatch : startStopwatch}
            >
              {stopwatchRunning ? "Pause" : elapsed > 0 ? "Resume" : "Start"}
            </button>
            <button type="button" onClick={resetStopwatch}>
              Reset
            </button>
          </div>
        </article>

        <article className="quiet-tool">
          <div className="quiet-tool__heading">
            <span>FOCUS TIMER</span>
            <span className="quiet-tool__symbol">◴</span>
          </div>

          <div className="quiet-tool__time">
            {formatTimer(remaining)}
          </div>

          <label className="quiet-tool__duration">
            <span>Duration</span>
            <input
              value={durationInput}
              onChange={(event) => changeDuration(event.target.value)}
              disabled={timerRunning}
              aria-label="Timer duration in minutes and seconds"
              inputMode="numeric"
              maxLength={6}
            />
          </label>

          <div className="quiet-tool__actions">
            <button
              type="button"
              onClick={timerRunning ? pauseTimer : startTimer}
            >
              {timerRunning ? "Pause" : timerFinished ? "Restart" : "Start"}
            </button>
            <button type="button" onClick={resetTimer}>
              Reset
            </button>
          </div>

          {timerFinished && (
            <span className="quiet-tool__finished" role="status">
              Your timer is complete.
            </span>
          )}
        </article>
      </div>

      <article className="quiet-world">
        <div className="quiet-section-heading">
          <span>WORLD CLOCKS</span>
          <span>LOCAL TIME · LIVE</span>
        </div>

        <div className="quiet-world__cities">
          {CITIES.map((city) => (
            <div className="quiet-world__city" key={city.zone}>
              <span>{city.name}</span>
              <time>{getCityTime(city.zone, now)}</time>
            </div>
          ))}
        </div>
      </article>

      <article className="quiet-sound">
        <div className="quiet-section-heading">
          <span>SOUNDSPACE</span>
          <span>AMBIENT AUDIO</span>
        </div>

        <div className="quiet-sound__choices">
          <button
            type="button"
            className={soundscape === "rain" ? "is-selected" : ""}
            onClick={() => chooseSoundscape("rain")}
          >
            <span>Rain</span>
            <small>Window ambience</small>
          </button>

          <button
            type="button"
            className={soundscape === "brown" ? "is-selected" : ""}
            onClick={() => chooseSoundscape("brown")}
          >
            <span>Brown noise</span>
            <small>Deep focus</small>
          </button>

          <button
            type="button"
            className={soundscape === "focus" ? "is-selected" : ""}
            onClick={() => chooseSoundscape("focus")}
          >
            <span>Soft focus</span>
            <small>Ambient tones</small>
          </button>
        </div>

        <div className="quiet-sound__controls">
          <button
            type="button"
            className="quiet-sound__play"
            onClick={playing ? stopSoundscape : startSoundscape}
            aria-label={playing ? "Stop soundscape" : "Play soundscape"}
          >
            {playing ? "Ⅱ" : "▶"}
          </button>

          <div className="quiet-sound__volume">
            <span>VOLUME</span>
            <input
              type="range"
              min="0"
              max="70"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-label="Sound volume"
            />
          </div>

          <span className="quiet-sound__volume-value">{volume}%</span>
        </div>

        {audioError && (
          <p className="quiet-sound__error" role="status">
            {audioError}
          </p>
        )}
      </article>
    </section>
  );
}
