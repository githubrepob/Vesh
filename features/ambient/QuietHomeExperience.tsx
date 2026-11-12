
"use client";

import { useEffect, useRef, useState } from "react";
import VeshCompanion from "@/features/VeshCompanion";
import type { CompanionState } from "@/features/companion";

import {
  ClockIcon,
  ClockCounterClockwiseIcon,
  GlobeHemisphereWestIcon,
  TimerIcon,
} from "@phosphor-icons/react";

type Props = {
  now: Date | null;
  dateLabel: string;
  timeLabel: string;
  greeting: string;
  displayName: string;
  ambientMessage: string;
  state: CompanionState;
};

type QuietTab = "clock" | "timer" | "stopwatch" | "world";

type City = {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  timezone: string;
};

type CitySearchResult = {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  timezone: string;
};

type Lap = {
  number: number;
  split: number;
  total: number;
};

const DEFAULT_CITIES: City[] = [
  {
    id: 1261481,
    name: "New Delhi",
    country: "India",
    timezone: "Asia/Kolkata",
  },
  {
    id: 2643743,
    name: "London",
    country: "United Kingdom",
    timezone: "Europe/London",
  },
  {
    id: 5128581,
    name: "New York",
    country: "United States",
    timezone: "America/New_York",
  },
  {
    id: 1850147,
    name: "Tokyo",
    country: "Japan",
    timezone: "Asia/Tokyo",
  },
];

const PRESETS = [
  { label: "5 min", seconds: 300 },
  { label: "15 min", seconds: 900 },
  { label: "25 min", seconds: 1500 },
  { label: "45 min", seconds: 2700 },
  { label: "1 hour", seconds: 3600 },
];

const TABS: { id: QuietTab; label: string }[] = [
  { id: "clock", label: "Clock" },
  { id: "timer", label: "Timer" },
  { id: "stopwatch", label: "Stopwatch" },
  { id: "world", label: "World clock" },
];

function ToolIcon({ type }: { type: QuietTab }) {
  const iconProps = {
    size: 19,
    weight: "light" as const,
  };

  switch (type) {
    case "clock":
      return <ClockIcon {...iconProps} />;

    case "timer":
      return <TimerIcon {...iconProps} />;

    case "stopwatch":
      return <ClockCounterClockwiseIcon {...iconProps} />;

    default:
      return <GlobeHemisphereWestIcon {...iconProps} />;
  }
}

/* -------------------------------------------------------
   FORMATTING
   ------------------------------------------------------- */

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatStopwatch(milliseconds: number) {
  const centiseconds = Math.floor(milliseconds / 10);
  const hours = Math.floor(centiseconds / 360000);
  const minutes = Math.floor((centiseconds % 360000) / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  const fraction = centiseconds % 100;

  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(fraction).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(fraction).padStart(2, "0")}`;
}

function formatWorldTime(zone: string, date: Date) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "--:--";
  }
}

function formatWorldDate(zone: string, date: Date) {
  try {
    return new Intl.DateTimeFormat("en", {
      timeZone: zone,
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(date);
  } catch {
    return "";
  }
}

/* -------------------------------------------------------
   MAIN QUIET EXPERIENCE
   ------------------------------------------------------- */

export default function QuietHomeExperience({
  now,
  dateLabel,
  timeLabel,
  greeting,
  displayName,
  ambientMessage,
  state,
}: Props) {
  const [activeTab, setActiveTab] = useState<QuietTab>("clock");

  // Timer
  const [timerHours, setTimerHours] = useState("00");
  const [timerMinutes, setTimerMinutes] = useState("25");
  const [timerSeconds, setTimerSeconds] = useState("00");
  const [timerRemaining, setTimerRemaining] = useState(25 * 60 * 1000);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [timerHasStarted, setTimerHasStarted] = useState(false);
  const timerEndRef = useRef<number | null>(null);

  // Stopwatch
  const [stopwatchElapsed, setStopwatchElapsed] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const stopwatchStartedAtRef = useRef(0);
  const stopwatchAccumulatedRef = useRef(0);
  const lastLapAtRef = useRef(0);

  // World clock
  const [cities, setCities] = useState<City[]>(DEFAULT_CITIES);
  const [citiesLoaded, setCitiesLoaded] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState("");

  const currentDate = now ?? new Date();
  const currentSeconds = now
  ? String(now.getSeconds()).padStart(2, "0")
  : "00";

  // Restore saved cities after mount without changing state synchronously in the effect.
  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("vesh-world-clock-cities");
        if (saved) {
          const parsed = JSON.parse(saved) as City[];
          if (Array.isArray(parsed) && parsed.length) {
            setCities(parsed);
          }
        }
      } catch {
        // Defaults are used if saved data is invalid.
      }

      setCitiesLoaded(true);
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!citiesLoaded) return;

    localStorage.setItem(
      "vesh-world-clock-cities",
      JSON.stringify(cities),
    );
  }, [cities, citiesLoaded]);

  // Global city search through Open-Meteo.
  useEffect(() => {
    const query = citySearch.trim();

    if (query.length < 2) return;

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      setCityLoading(true);
      setCityError("");

      try {
        const params = new URLSearchParams({
          name: query,
          count: "20",
          language: "en",
          format: "json",
        });

        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?${params}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("City search is temporarily unavailable.");
        }

        const data = await response.json();

        const results: CitySearchResult[] = (
          data.results ?? []
        ).filter((item: CitySearchResult) => item.timezone);

        setCityResults(results);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setCityError("Unable to search cities. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setCityLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [citySearch]);

  // Timer tick.
  useEffect(() => {
    if (!timerRunning || timerEndRef.current === null) return;

    const interval = window.setInterval(() => {
      const remaining = Math.max(0, timerEndRef.current! - Date.now());
      setTimerRemaining(remaining);

      if (remaining <= 0) {
        timerEndRef.current = null;
        setTimerRunning(false);
        setTimerFinished(true);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [timerRunning]);

  // Stopwatch tick.
  useEffect(() => {
    if (!stopwatchRunning) return;

    const interval = window.setInterval(() => {
      setStopwatchElapsed(
        stopwatchAccumulatedRef.current +
          (Date.now() - stopwatchStartedAtRef.current),
      );
    }, 20);

    return () => window.clearInterval(interval);
  }, [stopwatchRunning]);

  function timerDuration() {
    const hours = Number(timerHours);
    const minutes = Number(timerMinutes);
    const seconds = Number(timerSeconds);

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      !Number.isInteger(seconds) ||
      hours < 0 ||
      hours > 99 ||
      minutes < 0 ||
      minutes > 59 ||
      seconds < 0 ||
      seconds > 59
    ) {
      return null;
    }

    const duration = (hours * 3600 + minutes * 60 + seconds) * 1000;
    return duration > 0 ? duration : null;
  }

  function updateTimerField(
    field: "hours" | "minutes" | "seconds",
    value: string,
  ) {
    const clean = value.replace(/\D/g, "").slice(0, 2);
    const numeric = Number(clean || "0");
    const bounded = field === "hours" ? Math.min(numeric, 99) : Math.min(numeric, 59);
    const next = String(bounded).padStart(2, "0");

    if (field === "hours") setTimerHours(next);
    if (field === "minutes") setTimerMinutes(next);
    if (field === "seconds") setTimerSeconds(next);

    setTimerHasStarted(false);
    setTimerFinished(false);
  }

  function setTimerPreset(totalSeconds: number) {
    timerEndRef.current = null;
    setTimerRunning(false);
    setTimerFinished(false);
    setTimerHasStarted(false);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    setTimerHours(String(hours).padStart(2, "0"));
    setTimerMinutes(String(minutes).padStart(2, "0"));
    setTimerSeconds(String(seconds).padStart(2, "0"));
    setTimerRemaining(totalSeconds * 1000);
  }

  function startTimer() {
    if (timerRunning) return;

    const duration = timerHasStarted
      ? timerRemaining
      : timerDuration();

    if (!duration || duration <= 0) return;

    timerEndRef.current = Date.now() + duration;
    setTimerRemaining(duration);
    setTimerFinished(false);
    setTimerHasStarted(true);
    setTimerRunning(true);
  }

  function pauseTimer() {
    if (!timerRunning) return;

    const remaining = Math.max(
      0,
      (timerEndRef.current ?? Date.now()) - Date.now(),
    );

    timerEndRef.current = null;
    setTimerRemaining(remaining);
    setTimerRunning(false);
  }

  function resetTimer() {
    const duration = timerDuration() ?? 25 * 60 * 1000;

    timerEndRef.current = null;
    setTimerRemaining(duration);
    setTimerRunning(false);
    setTimerFinished(false);
    setTimerHasStarted(false);
  }

  function startStopwatch() {
    if (stopwatchRunning) return;

    stopwatchStartedAtRef.current = Date.now();
    setStopwatchRunning(true);
  }

  function pauseStopwatch() {
    if (!stopwatchRunning) return;

    const elapsed =
      stopwatchAccumulatedRef.current +
      (Date.now() - stopwatchStartedAtRef.current);

    stopwatchAccumulatedRef.current = elapsed;
    setStopwatchElapsed(elapsed);
    setStopwatchRunning(false);
  }

  function recordLap() {
    if (!stopwatchRunning) return;

    const elapsed =
      stopwatchAccumulatedRef.current +
      (Date.now() - stopwatchStartedAtRef.current);

    const split = elapsed - lastLapAtRef.current;
    lastLapAtRef.current = elapsed;

    setLaps((previous) => [
      {
        number: previous.length + 1,
        split,
        total: elapsed,
      },
      ...previous,
    ]);
  }

  function resetStopwatch() {
    stopwatchAccumulatedRef.current = 0;
    stopwatchStartedAtRef.current = 0;
    lastLapAtRef.current = 0;
    setStopwatchElapsed(0);
    setStopwatchRunning(false);
    setLaps([]);
  }

  function addCity(city: CitySearchResult) {
    setCities((previous) => {
      if (previous.some((item) => item.id === city.id)) return previous;

      return [
        ...previous,
        {
          id: city.id,
          name: city.name,
          country: city.country,
          admin1: city.admin1,
          timezone: city.timezone,
        },
      ];
    });

    setCitySearch("");
    setCityResults([]);
  }

  function removeCity(id: number) {
    setCities((previous) => previous.filter((city) => city.id !== id));
  }

  const fastestLap =
    laps.length > 1
      ? Math.min(...laps.map((lap) => lap.split))
      : null;

  const slowestLap =
    laps.length > 1
      ? Math.max(...laps.map((lap) => lap.split))
      : null;

  return (
    <section className="vesh-ambient-layout" aria-label="VESH quiet home">
      <main className="vesh-ambient-center">
        {activeTab === "clock" && (
          <div className="vesh-clock-view">
            <div className="vesh-stage__date">{dateLabel}</div>

            <div
              className="vesh-stage__time"
              role="timer"
              aria-label={`Time ${timeLabel}:${currentSeconds}`}
            >
              <span>{timeLabel}</span>
              <span className="vesh-clock-seconds">:{currentSeconds}</span>
            </div>

            <div className="vesh-presence-copy">
              <h1>
                {greeting}, {displayName}.
              </h1>
              <p>{ambientMessage}</p>
            </div>
          </div>
        )}

        {activeTab === "timer" && (
          <div className="vesh-utility-view">
            <span className="vesh-utility-eyebrow">FOCUS & TIME</span>
            <h2>Timer</h2>

            <div className="vesh-utility-value">
              {formatCountdown(
                timerRunning || timerHasStarted
                  ? timerRemaining
                  : timerDuration() ?? timerRemaining,
              )}
            </div>

            <div className="vesh-timer-fields">
              <label>
                <input
                  aria-label="Hours"
                  inputMode="numeric"
                  value={timerHours}
                  disabled={timerRunning}
                  onChange={(event) =>
                    updateTimerField("hours", event.target.value)
                  }
                />
                <span>Hours</span>
              </label>

              <span className="vesh-timer-colon">:</span>

              <label>
                <input
                  aria-label="Minutes"
                  inputMode="numeric"
                  value={timerMinutes}
                  disabled={timerRunning}
                  onChange={(event) =>
                    updateTimerField("minutes", event.target.value)
                  }
                />
                <span>Minutes</span>
              </label>

              <span className="vesh-timer-colon">:</span>

              <label>
                <input
                  aria-label="Seconds"
                  inputMode="numeric"
                  value={timerSeconds}
                  disabled={timerRunning}
                  onChange={(event) =>
                    updateTimerField("seconds", event.target.value)
                  }
                />
                <span>Seconds</span>
              </label>
            </div>

            <div className="vesh-timer-presets">
              {PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  disabled={timerRunning}
                  onClick={() => setTimerPreset(preset.seconds)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="vesh-utility-actions">
              <button
                className="is-primary"
                type="button"
                onClick={timerRunning ? pauseTimer : startTimer}
              >
                {timerRunning ? "Pause" : timerHasStarted ? "Resume" : "Start"}
              </button>

              <button type="button" onClick={resetTimer}>
                Reset
              </button>
            </div>

            {timerFinished && (
              <p className="vesh-utility-message" role="status">
                Your timer is complete.
              </p>
            )}
          </div>
        )}

        {activeTab === "stopwatch" && (
          <div className="vesh-utility-view vesh-stopwatch-view">
            <span className="vesh-utility-eyebrow">MEASURE TIME</span>
            <h2>Stopwatch</h2>

            <div className="vesh-utility-value">
              {formatStopwatch(stopwatchElapsed)}
            </div>

            <div className="vesh-utility-actions">
              <button
                className="is-primary"
                type="button"
                onClick={
                  stopwatchRunning ? pauseStopwatch : startStopwatch
                }
              >
                {stopwatchRunning
                  ? "Pause"
                  : stopwatchElapsed
                    ? "Resume"
                    : "Start"}
              </button>

              <button
                type="button"
                disabled={!stopwatchRunning}
                onClick={recordLap}
              >
                Lap
              </button>

              <button type="button" onClick={resetStopwatch}>
                Reset
              </button>
            </div>

            <div className="vesh-lap-list">
              <div className="vesh-lap-list__heading">
                <span>Lap</span>
                <span>Split</span>
                <span>Total</span>
              </div>

              {laps.length === 0 ? (
                <p className="vesh-lap-list__empty">
                  Start the stopwatch and record your first lap.
                </p>
              ) : (
                laps.map((lap) => (
                  <div className="vesh-lap-row" key={lap.number}>
                    <span>
                      Lap {String(lap.number).padStart(2, "0")}
                      {lap.split === fastestLap && (
                        <small className="is-fastest">Fastest</small>
                      )}
                      {lap.split === slowestLap && (
                        <small className="is-slowest">Slowest</small>
                      )}
                    </span>
                    <time>{formatStopwatch(lap.split)}</time>
                    <time>{formatStopwatch(lap.total)}</time>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "world" && (
          <div className="vesh-utility-view vesh-world-view">
            <span className="vesh-utility-eyebrow">AROUND THE WORLD</span>
            <h2>World clock</h2>

            <div className="vesh-city-search">
              <input
                type="search"
                placeholder="Search any city worldwide..."
                value={citySearch}
                onChange={(event) => {
                  const value = event.target.value;
                  setCitySearch(value);
                  setCityResults([]);
                  setCityError("");
                  setCityLoading(false);
                }}
                aria-label="Search cities worldwide"
              />

              {cityLoading && (
                <p className="vesh-city-search__status">Searching cities…</p>
              )}

              {cityError && (
                <p className="vesh-city-search__status is-error">
                  {cityError}
                </p>
              )}

              {cityResults.length > 0 && (
                <div className="vesh-city-suggestions">
                  {cityResults.map((city) => {
                    const alreadyAdded = cities.some(
                      (item) => item.id === city.id,
                    );

                    return (
                      <button
                        key={city.id}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => addCity(city)}
                      >
                        <span>
                          <strong>{city.name}</strong>
                          <small>
                            {[city.admin1, city.country]
                              .filter(Boolean)
                              .join(", ")}
                          </small>
                        </span>
                        <span>{alreadyAdded ? "Added" : "+ Add"}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {citySearch.trim().length >= 2 &&
                !cityLoading &&
                !cityError &&
                cityResults.length === 0 && (
                  <p className="vesh-city-search__status">
                    No matching cities found.
                  </p>
                )}
            </div>

            <div className="vesh-world-clock-list">
              {cities.map((city) => (
                <div key={city.id}>
                  <span className="vesh-world-city-name">
                    <strong>{city.name}</strong>
                    <small>
                      {[city.admin1, city.country]
                        .filter(Boolean)
                        .join(", ")}
                      {" · "}
                      {formatWorldDate(city.timezone, currentDate)}
                    </small>
                  </span>

                  <time>
                    {formatWorldTime(city.timezone, currentDate)}
                  </time>

                  <button
                    type="button"
                    onClick={() => removeCity(city.id)}
                    aria-label={`Remove ${city.name}`}
                    title={`Remove ${city.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <p className="vesh-world-hint">
              Search and add cities. Your selected cities are saved on this device.
            </p>

            <p className="vesh-world-attribution">
              City data: Open-Meteo · GeoNames
            </p>
          </div>
        )}

        <nav className="vesh-utility-nav" aria-label="Time tools">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "is-active" : ""}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              aria-pressed={activeTab === tab.id}
              title={tab.label}
            >
              <ToolIcon type={tab.id} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </main>

      <aside className="vesh-ambient-companion" aria-label="VESH companion">
        <div className="vesh-character">
          <div className="vesh-character__backlight" />
          <div className="vesh-character__floor-shadow" />
          <VeshCompanion state={state} />
        </div>

        <span className="vesh-companion-caption">V E S H</span>
        <span className="vesh-companion-status">Here with you</span>
      </aside>
    </section>
  );
}
