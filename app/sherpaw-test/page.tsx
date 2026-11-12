
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createKeywordSpotter } from "@sherpaw/kws";

type Detector = Awaited<ReturnType<typeof createKeywordSpotter>>;

type DetectionLog = {
  id: number;
  phrase: string;
  time: string;
  tokens: string[];
};

const MODEL_PATH = "/models/sherpaw-kws";
const TARGET_RATE = 16000;

// Lower thresholds make detection more sensitive.
// These are starting values; real microphone testing is required.


const KEYWORDS = [
  {
    label: "HELLO_CONTROL",
    threshold: 0.25,
    matches: [
      { tokens: ["HH", "AH0", "L", "OW1"] },
    ],
  },
  {
    label: "LIGHT_UP_OFFICIAL_TEST",
    threshold: 0.25,
    matches: [
      { tokens: ["L", "AY1", "T", "AH1", "P"] },
    ],
  },
];



function resampleTo16k(
  input: Float32Array,
  inputRate: number,
): Float32Array {
  if (!Number.isFinite(inputRate) || inputRate <= 0) {
    throw new Error("Invalid microphone sample rate.");
  }

  if (inputRate === TARGET_RATE) {
    return sanitizePCM(input);
  }

  const outputLength = Math.floor(
    input.length * TARGET_RATE / inputRate,
  );

  const output = new Float32Array(outputLength);
  const ratio = inputRate / TARGET_RATE;

  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const fraction = position - left;

    const a = Number.isFinite(input[left]) ? input[left] : 0;
    const b = Number.isFinite(input[right]) ? input[right] : 0;

    output[i] = a * (1 - fraction) + b * fraction;
  }

  return sanitizePCM(output);
}

function sanitizePCM(input: Float32Array): Float32Array {
  const output = new Float32Array(input.length);

  for (let i = 0; i < input.length; i++) {
    const value = input[i];

    output[i] = Number.isFinite(value)
      ? Math.max(-1, Math.min(1, value))
      : 0;
  }

  return output;
}

function getRMS(samples: Float32Array): number {
  if (!samples.length) return 0;

  let sum = 0;

  for (let i = 0; i < samples.length; i++) {
    const value = Number.isFinite(samples[i]) ? samples[i] : 0;
    sum += value * value;
  }

  return Math.sqrt(sum / samples.length);
}

export default function SherpawTestPage() {
  const [status, setStatus] = useState("Not started");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<DetectionLog[]>([]);
  const [error, setError] = useState("");
  const [inputLevel, setInputLevel] = useState(0);
  const [sampleRate, setSampleRate] = useState(0);
  const [detectorReady, setDetectorReady] = useState(false);

  const detectorRef = useRef<Detector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const runningRef = useRef(false);
  const processingRef = useRef(false);
  const queueRef = useRef<Float32Array[]>([]);
  const logIdRef = useRef(0);
  const lastLevelUpdateRef = useRef(0);
  const lastDetectionRef = useRef(0);

  const addLog = useCallback((phrase: string, tokens: string[]) => {
    setLogs((previous) => [
      {
        id: ++logIdRef.current,
        phrase,
        time: new Date().toLocaleTimeString(),
        tokens,
      },
      ...previous,
    ].slice(0, 50));
  }, []);

  const stop = useCallback(async () => {
    runningRef.current = false;
    queueRef.current = [];

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    sourceRef.current?.disconnect();
    sourceRef.current = null;

    gainRef.current?.disconnect();
    gainRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const context = contextRef.current;
    contextRef.current = null;

    if (context && context.state !== "closed") {
      await context.close().catch(() => {});
    }

    detectorRef.current?.dispose();
    detectorRef.current = null;
    setDetectorReady(false);

    processingRef.current = false;

    setInputLevel(0);
    setSampleRate(0);
    setLoading(false);
    setStatus("Stopped");
  }, []);

  const start = useCallback(async () => {
    if (runningRef.current || loading) return;

    setError("");
    setLoading(true);
    setStatus("Loading local wake-word model...");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone requires localhost or HTTPS.");
      }

      const [dataResponse, metadataResponse] = await Promise.all([
        fetch(`${MODEL_PATH}/preload.data`),
        fetch(`${MODEL_PATH}/preload.js.metadata`),
      ]);

      if (!dataResponse.ok || !metadataResponse.ok) {
        throw new Error("Could not load the local model files.");
      }

      const [data, metadata] = await Promise.all([
        dataResponse.arrayBuffer(),
        metadataResponse.json(),
      ]);

      const detector = await createKeywordSpotter({
        model: { data, metadata },
        keywords: KEYWORDS,
        maxPendingAudio: 2,
      });

      detectorRef.current = detector;
      setDetectorReady(true);

      setStatus("Requesting microphone access...");

      // Preserve quiet speech instead of aggressively filtering it.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported.");
      }

      const context = new AudioContextClass({
        sampleRate: TARGET_RATE,
      });

      contextRef.current = context;

      if (context.state === "suspended") {
        await context.resume();
      }

      setSampleRate(context.sampleRate);

      const source = context.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = context.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const gain = context.createGain();
      gain.gain.value = 0;
      gainRef.current = gain;

      runningRef.current = true;
      setStatus("Listening locally");

      const pumpQueue = async () => {
        if (processingRef.current || !runningRef.current) return;

        processingRef.current = true;

        try {
          while (
            runningRef.current &&
            queueRef.current.length > 0
          ) {
            const samples = queueRef.current.shift()!;
            const activeDetector = detectorRef.current;

            if (!activeDetector) break;

            const hits = await activeDetector.processAudio(
              samples,
              TARGET_RATE,
            );

            if (!runningRef.current) break;

            for (const hit of hits) {
              // Prevent duplicate events arriving almost simultaneously.
              const now = Date.now();

              if (now - lastDetectionRef.current < 900) {
                continue;
              }

              lastDetectionRef.current = now;
              addLog(hit.label, hit.tokens);
            }
          }
        } catch (err) {
          if (runningRef.current) {
            setError(
              err instanceof Error
                ? err.message
                : "Audio processing failed.",
            );
          }
        } finally {
          processingRef.current = false;

          if (runningRef.current && queueRef.current.length > 0) {
            void pumpQueue();
          }
        }
      };

      processor.onaudioprocess = (event) => {
        if (!runningRef.current) return;

        const input = event.inputBuffer.getChannelData(0);
        const samples = resampleTo16k(input, context.sampleRate);

        if (!samples.length) return;

        const rms = getRMS(samples);
        const now = Date.now();

        // Update the visible input meter approximately four times a second.
        if (now - lastLevelUpdateRef.current > 250) {
          lastLevelUpdateRef.current = now;
          setInputLevel(rms);
        }

        // Do not discard quiet samples: quiet speech is exactly what
        // this detector needs to learn to recognize.
        if (queueRef.current.length >= 12) {
          setError(
            "Audio processing is falling behind. Stop and restart.",
          );
          return;
        }

        queueRef.current.push(samples);
        void pumpQueue();
      };

      source.connect(processor);
      processor.connect(gain);
      gain.connect(context.destination);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not start detector.";

      setError(message);
      await stop();
      setStatus("Failed to start");
    } finally {
      setLoading(false);
    }
  }, [addLog, loading, stop]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  const levelPercent = Math.min(100, inputLevel * 1000);

  return (
    <main className="min-h-screen bg-[#080b12] px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-7">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">
            VESH · Development
          </p>

          <h1 className="mt-3 text-3xl font-semibold">
            Wake Word Detection Lab
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Testing sensitive, low-volume, local wake-word detection.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs text-gray-400">DETECTOR STATUS</p>
          <p className="mt-2 text-lg font-medium">{status}</p>

          <p className="mt-5 text-sm text-gray-400">
            Microphone input level
          </p>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all"
              style={{ width: `${levelPercent}%` }}
            />
          </div>

          <div className="mt-2 space-y-1 text-xs text-gray-400">
  <p>RMS: {inputLevel.toFixed(6)}</p>
  <p>Sample rate: {sampleRate || "—"} Hz</p>
  <p>
    Signal:
    {inputLevel < 0.0001
      ? " Very low / silence"
      : inputLevel < 0.001
        ? " Low"
        : inputLevel < 0.01
          ? " Normal"
          : " Strong"}
  </p>
</div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={start}
              disabled={loading || status === "Listening locally"}
              className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-black disabled:opacity-40"
            >
              {loading ? "Starting..." : "Start listening"}
            </button>

            <button
              onClick={stop}
              disabled={loading && !detectorReady}
              className="rounded-xl border border-white/20 px-6 py-3 disabled:opacity-40"
            >
              Stop
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="font-semibold">Configured wake phrases</h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {KEYWORDS.map((keyword) => (
              <span
                key={keyword.label}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                {keyword.label}
              </span>
            ))}
          </div>

          <p className="mt-4 text-xs leading-6 text-gray-500">
            Sensitivity-biased experimental thresholds. Quiet speech
            detection and false activation rates must be measured on
            your actual microphone.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Detection history</h2>

            <button
              onClick={() => setLogs([])}
              className="text-xs text-gray-400 hover:text-white"
            >
              Clear history
            </button>
          </div>

          {logs.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">
              No detections yet. Start listening and speak a wake phrase.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-cyan-300">
                      {log.phrase}
                    </span>

                    <span className="text-xs text-gray-500">
                      {log.time}
                    </span>
                  </div>

                  <p className="mt-2 break-all text-xs text-gray-500">
                    Tokens: {log.tokens.join(" ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs leading-6 text-gray-500">
          This experimental page processes microphone audio locally.
          No audio is sent to the VESH backend. Keep the browser open
          and microphone permission enabled during testing.
        </p>
      </div>
    </main>
  );
}
