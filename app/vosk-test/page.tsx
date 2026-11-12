
"use client";

import { useRef, useState } from "react";
import type { Model, KaldiRecognizer } from "vosk-browser";

export default function VoskTestPage() {
  const [status, setStatus] = useState("Not started");
  const [partial, setPartial] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState("");

  const modelRef = useRef<Model | null>(null);
  const recognizerRef = useRef<KaldiRecognizer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const muteRef = useRef<GainNode | null>(null);

  const startingRef = useRef(false);

  async function startTest() {
    if (startingRef.current || modelRef.current) return;

    startingRef.current = true;
    setError("");
    setPartial("");
    setFinalText("");

    try {
      setStatus("Loading Vosk model...");

      const { createModel } = await import("vosk-browser");

      const model = await createModel(
        "/models/vosk-model-small-en-us-0.15.tar.gz"
      );

      modelRef.current = model;

      setStatus("Requesting microphone permission...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
        video: false,
      });

      streamRef.current = stream;

      const context = new AudioContext();
      contextRef.current = context;

      await context.resume();

      const recognizer = new model.KaldiRecognizer(
        context.sampleRate
      );

      recognizerRef.current = recognizer;

      recognizer.on("partialresult", (message) => {
        const result = (message as unknown as {
          result?: { partial?: string };
        }).result;
        setPartial(result?.partial || "");
      });

      recognizer.on("result", (message) => {
        const result = (message as unknown as {
          result?: { text?: string };
        }).result;
        const text = result?.text?.trim();

        if (text) {
          setFinalText((previous) =>
            previous ? `${previous}\n${text}` : text
          );
        }

        setPartial("");
      });

      const source = context.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = context.createScriptProcessor(
        4096,
        1,
        1
      );

      processorRef.current = processor;

      const mute = context.createGain();
      mute.gain.value = 0;
      muteRef.current = mute;

      processor.onaudioprocess = (event) => {
        try {
          if (recognizerRef.current) {
            recognizerRef.current.acceptWaveform(
              event.inputBuffer
            );
          }
        } catch (err) {
          console.error("Vosk audio processing error:", err);
        }
      };

      source.connect(processor);
      processor.connect(mute);
      mute.connect(context.destination);

      setStatus("Listening — speak in English");

    } catch (err) {
      console.error("Vosk test failed:", err);

      setError(
        err instanceof Error ? err.message : String(err)
      );

      await stopTest();
      setStatus("Failed");
    } finally {
      startingRef.current = false;
    }
  }

  async function stopTest() {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    muteRef.current?.disconnect();

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
    }

    recognizerRef.current?.remove();
    recognizerRef.current = null;

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;

    if (contextRef.current) {
      await contextRef.current.close().catch(() => {});
    }
    contextRef.current = null;

    modelRef.current?.terminate();
    modelRef.current = null;

    processorRef.current = null;
    sourceRef.current = null;
    muteRef.current = null;

    setPartial("");
    setStatus("Stopped");
  }

  return (
    <main className="min-h-screen bg-[#0b1020] text-white p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">
            VESH Wake Detection Lab
          </h1>

          <p className="text-gray-400 mt-2">
            Isolated browser-based Vosk recognition test.
          </p>
        </div>

        <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
          <p className="text-sm text-gray-400">Engine status</p>

          <p className="text-lg font-medium">{status}</p>

          <div className="flex gap-3">
            <button
              onClick={startTest}
              disabled={status.startsWith("Loading") ||
                status.startsWith("Requesting") ||
                status.startsWith("Listening")}
              className="rounded-lg bg-blue-600 px-5 py-3 disabled:opacity-40"
            >
              Start test
            </button>

            <button
              onClick={stopTest}
              className="rounded-lg border border-white/20 px-5 py-3"
            >
              Stop test
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 p-5 space-y-2">
          <h2 className="font-semibold">Live partial recognition</h2>
          <p className="text-gray-300 min-h-8">
            {partial || "Speak something in English..."}
          </p>
        </section>

        <section className="rounded-xl border border-white/10 p-5 space-y-2">
          <h2 className="font-semibold">Final recognition results</h2>
          <pre className="whitespace-pre-wrap text-gray-300 min-h-12">
            {finalText || "No final results yet."}
          </pre>
        </section>

        {error && (
          <section className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
            {error}
          </section>
        )}

        <p className="text-sm text-gray-500">
          This test recognizes unrestricted English speech.
          It does not yet activate VESH or send audio to a server.
        </p>
      </div>
    </main>
  );
}
