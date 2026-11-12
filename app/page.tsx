"use client";


import {

  AmbientBackground,

  AmbientScenePicker,

  type AmbientScene,

} from "@/features/ambient/AmbientEnvironment";

import {
  ArrowUpRightIcon,
  CornersInIcon,
  CornersOutIcon,
  Play,
  Pause,
} from "@phosphor-icons/react";

import HardworkCheckIn from "@/features/attendence/HardworkCheckIn";

import QuietHomeExperience from "@/features/ambient/QuietHomeExperience";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import Link from "next/link";

import VeshCompanion from "@/features/VeshCompanion";
import InteractiveWorkspaceRail from "@/features/interactive/InteractiveWorkspaceRail";

import { useCompanionController } from "@/features/companion";

type Mode = "quiet" | "interactive";
type InteractivePanel = "voice" | "conversations" | "tasks" | "calendar" | "notes";
type ChatMessage = { role: "user" | "assistant"; content: string };

function toSpeechText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-zA-Z0-9_-]*\n?/g, "").replace(/```/g, ""))
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[>*_~`]/g, "")
    .replace(/\|/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function createSpokenSummary(markdown: string, maxChars = 420) {
  // Speak only the model-authored summary section. Never fall back to the full answer.
  const summaryMatch = markdown.match(
    /(?:^|\n)\s*(?:#{1,3}\s*)?(?:\*\*)?In short:?(?:\*\*)?:?\s*([\s\S]*?)(?=\n\s*(?:#{1,6}\s+|\*\*[^*\n]+\*\*\s*:?)|$)/i,
  );

  // If the model omitted the required heading, use only its first paragraph.
  // This is a safe short fallback, not a claim that a new summary was generated.
  const firstParagraph = markdown
    .replace(/^\s*```[\s\S]*?```\s*$/gm, "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .find((part) => part && !/^#{1,6}\s/.test(part));

  const summarySource = summaryMatch?.[1]?.trim() || firstParagraph || "";
  const plain = toSpeechText(summarySource).replace(/\s+/g, " ").trim();
  if (!plain) return "";
  if (plain.length <= maxChars) return plain;

  const sentences = plain.match(/[^.!?।]+[.!?।]?/g) ?? [plain];
  let summary = "";
  for (const sentence of sentences) {
    const candidate = `${summary} ${sentence}`.trim();
    if (candidate.length > maxChars) break;
    summary = candidate;
  }

  return summary || `${plain.slice(0, maxChars).replace(/\s+\S*$/, "")}…`;
}

function detectSpeechLanguage(text: string): "hi" | "en" {
  const hindiCharacters = text.match(/[\u0900-\u097F]/g) ?? [];

  return hindiCharacters.length > 0 ? "hi" : "en";
}

function parseSse(
  buffer: string,
  onText: (text: string) => void,
) {
  // SSE permits CRLF line endings. Normalize them before finding event boundaries.
  const normalized = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const events = normalized.split("\n\n");
  const remainder = events.pop() ?? "";

  for (const event of events) {
    const data = event
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");

    if (!data || data === "[DONE]") continue;
    try {
      const parsed = JSON.parse(data) as {
        choices?: Array<{
          delta?: { content?: string };
          message?: { content?: string };
        }>;
      };
      const content =
        parsed.choices?.[0]?.delta?.content ??
        parsed.choices?.[0]?.message?.content ??
        "";
      if (content) onText(content);
    } catch {
      // Ignore non-JSON provider keepalives; malformed final payloads are caught by the empty-response guard.
    }
  }
  return remainder;
}

export default function Home() {

  const [now, setNow] = useState<Date | null>(null);

  const [mode, setMode] = useState<Mode>("quiet");
  const [interactivePanel, setInteractivePanel] = useState<InteractivePanel>("voice");

  const [status, setStatus] = useState("Quiet mode");

  const [caption, setCaption] = useState("");
  const [fullAnswer, setFullAnswer] = useState("");

  const [userMessage, setUserMessage] = useState("");

  const [captionsEnabled] = useState(true);

  const [error, setError] = useState("");

  const [voiceSupported, setVoiceSupported] = useState(true);

  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [micPaused, setMicPaused] = useState(false);

  const [scene, setScene] = useState<AmbientScene>("rain");

  const [displayName, setDisplayName] = useState("there");

  const [isFullscreen, setIsFullscreen] = useState(false);

  const homeRef = useRef<HTMLElement | null>(null);

  const { state, transitionTo, reset } = useCompanionController();

  const modeRef = useRef<Mode>("quiet");
  // Keeps recent turns available for follow-up questions during this session.
  const conversationHistoryRef = useRef<ChatMessage[]>([]);
  // Invalidates callbacks from previous audio playback sessions.
  const playbackIdRef = useRef(0);
  const speakingRef = useRef(false);
  const micPausedRef = useRef(false);
  const busyRef = useRef(false);
  const activeRequestRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

const audioObjectUrlRef = useRef<string | null>(null);

const ttsRequestControllerRef = useRef<AbortController | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const speechFrameCountRef = useRef(0);
  const recordingStartedAtRef = useRef<number | null>(null);
  const silenceStartedAtRef = useRef<number | null>(null);
  const microphoneStartingRef = useRef(false);
  const processingAudioRef = useRef(false);
  const startMicrophoneSessionRef = useRef<(() => Promise<void>) | null>(null);

  const sendMessageRef = useRef<(text: string) => Promise<void>>(

    async () => undefined,

  );

  // ---------------------------------------------------------

  // CLOCK*

  // ---------------------------------------------------------

  useEffect(() => {

    const update = () => setNow(new Date());

    update();

    const timer = window.setInterval(update, 1000);

    return () => window.clearInterval(timer);

  }, []);

  // ---------------------------------------------------------

  // LOAD USER PREFERENCES*

  // ---------------------------------------------------------

  useEffect(() => {

    const savedScene = localStorage.getItem("vesh-ambient-scene");

    if (

      savedScene === "rain" ||

      savedScene === "night-sky" ||

      savedScene === "fireplace" ||

      savedScene === "minimal"

    ) {

      // Restore a browser-only preference after hydration to avoid SSR mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScene(savedScene);

    }

    const savedName = localStorage.getItem("vesh-display-name");

    if (savedName?.trim()) {

      setDisplayName(savedName.trim());

    }

  }, []);

  // ---------------------------------------------------------

  // FULLSCREEN*

  // ---------------------------------------------------------

  useEffect(() => {

    const handleFullscreenChange = () => {

      setIsFullscreen(

        document.fullscreenElement === homeRef.current,

      );

    };

    document.addEventListener(

      "fullscreenchange",

      handleFullscreenChange,

    );

    return () => {

      document.removeEventListener(

        "fullscreenchange",

        handleFullscreenChange,

      );

    };

  }, []);

  const toggleFullscreen = async () => {

    const element = homeRef.current;

    if (!element) return;

    try {

      if (document.fullscreenElement) {

        await document.exitFullscreen();

      } else if (element.requestFullscreen) {

        await element.requestFullscreen();

      }

    } catch (caught) {

      console.error("Fullscreen could not be changed:", caught);

      setError("Fullscreen is unavailable in this browser.");

    }

  };

  // ---------------------------------------------------------

  // TIME-AWARE GREETING*

  // ---------------------------------------------------------

  const currentHour = now?.getHours() ?? 12;

  const greeting =

    currentHour < 12

      ? "Good morning"

      : currentHour < 17

        ? "Good afternoon"

        : currentHour < 21

          ? "Good evening"

          : "Winding down";

  const ambientMessage =

    currentHour < 12

      ? "A new day. I'm right here."

      : currentHour < 17

        ? "I'm here alongside you."

        : currentHour < 21

          ? "Take a moment. There's no rush."

          : "Let's slow things down for a while.";

  // ---------------------------------------------------------

  // AMBIENT SCENE*

  // ---------------------------------------------------------

  const changeScene = (nextScene: AmbientScene) => {

    setScene(nextScene);

    localStorage.setItem("vesh-ambient-scene", nextScene);

  };

  // ---------------------------------------------------------


  // ---------------------------------------------------------
  // CROSS-BROWSER MICROPHONE + VOICE ACTIVITY DETECTION
  // ---------------------------------------------------------

  const stopMicrophoneSession = useCallback((discardRecording = true) => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      if (discardRecording) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
      }
      try {
        recorder.stop();
      } catch {
        // The recorder may already have stopped.
      }
    }
    mediaRecorderRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    microphoneSourceRef.current?.disconnect();
    microphoneSourceRef.current = null;

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    analyserRef.current = null;
    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close().catch(() => undefined);
    }

    recordingChunksRef.current = [];
    speechFrameCountRef.current = 0;
    recordingStartedAtRef.current = null;
    silenceStartedAtRef.current = null;
    microphoneStartingRef.current = false;
  }, []);

  // Pause capture between turns without releasing the microphone or closing
  // AudioContext. This avoids repeated permission prompts and calibration.
  const pauseMicrophoneCapture = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try { recorder.stop(); } catch { /* already stopped */ }
    }
    recordingChunksRef.current = [];
    recordingStartedAtRef.current = null;
    silenceStartedAtRef.current = null;
    speechFrameCountRef.current = 0;
  }, []);

  const transcribeRecording = useCallback(async (blob: Blob) => {
    if (
      modeRef.current !== "interactive" ||
      busyRef.current ||
      processingAudioRef.current ||
      blob.size === 0
    ) {
      return;
    }

    processingAudioRef.current = true;
    setStatus("Transcribing");
    setError("");

    try {
      const mime = blob.type.toLowerCase();
      const extension = mime.includes("mp4")
        ? "mp4"
        : mime.includes("ogg")
          ? "ogg"
          : mime.includes("wav")
            ? "wav"
            : mime.includes("mpeg")
              ? "mp3"
              : "webm";
      const formData = new FormData();
      formData.append("audio", blob, `vesh-recording.${extension}`);
      formData.append("prompt", "The speaker is Indian and may speak Hindi, English, or Hinglish. If Hindi is spoken, write it in Devanagari; preserve English technical terms. Transcribe only audible words verbatim. Do not translate, paraphrase, autocomplete, or invent words.");

      const response = await fetch("/api/assistant/transcribe", {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(25_000),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
      };

      if (!response.ok || !payload.text?.trim()) {
        throw new Error(payload.error || "VESH could not transcribe that recording.");
      }

      if (modeRef.current !== "interactive") return;

      setUserMessage(payload.text.trim());
      await sendMessageRef.current(payload.text.trim());
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "VESH could not process the recording.";

      setError(message);
      setStatus("Voice input failed");

    } finally {
      processingAudioRef.current = false;
      if (modeRef.current === "interactive" && !busyRef.current && !speakingRef.current && !micPausedRef.current) {
        setStatus("Listening");
        // sendMessage's finally runs while processingAudioRef is still true, so
        // its normal restart guard intentionally skips. Restart here, after the
        // transcription pipeline has fully released its processing lock.
        window.setTimeout(() => {
          if (
            modeRef.current === "interactive" &&
            !busyRef.current &&
            !speakingRef.current &&
            !processingAudioRef.current &&
            !micPausedRef.current
          ) {
            void startMicrophoneSessionRef.current?.();
          }
        }, 120);
      } else if (micPausedRef.current) {
        setStatus("Microphone paused");
      }
    }
  }, []);

  const startMicrophoneSession = useCallback(async (monitorWhileSpeaking = false) => {
    if (
      modeRef.current !== "interactive" ||
      micPausedRef.current ||
      (speakingRef.current && !monitorWhileSpeaking) ||
      (busyRef.current && !monitorWhileSpeaking) ||
      microphoneStartingRef.current
    ) {
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setVoiceSupported(false);
      setStatus("Microphone unavailable");
      setError(
        "This browser does not support the required microphone recording APIs. Use a recent browser over HTTPS.",
      );
      return;
    }

    microphoneStartingRef.current = true;
    setStatus(mediaStreamRef.current ? "Listening" : "Requesting microphone");

    try {
      if (
        mediaStreamRef.current &&
        !mediaStreamRef.current.getTracks().some((track) => track.readyState === "live")
      ) {
        stopMicrophoneSession();
      }

      const stream = mediaStreamRef.current ?? await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      if (modeRef.current !== "interactive" || (speakingRef.current && !monitorWhileSpeaking)) {
        stream.getTracks().forEach((track) => track.stop());
        microphoneStartingRef.current = false;
        return;
      }

      mediaStreamRef.current = stream;

      const AudioContextConstructor =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

      if (!AudioContextConstructor) {
        throw new Error("Audio processing is not supported by this browser.");
      }

      const audioContext = audioContextRef.current ?? new AudioContextConstructor();
      if (audioContext.state === "suspended") await audioContext.resume();

      let analyser = analyserRef.current;
      if (!analyser) {
        const createdAnalyser = audioContext.createAnalyser();
        createdAnalyser.fftSize = 2048;
        createdAnalyser.smoothingTimeConstant = 0.2;
        analyser = createdAnalyser;
        analyserRef.current = createdAnalyser;
      }
      if (!microphoneSourceRef.current) {
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        microphoneSourceRef.current = source;
      }

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Float samples preserve low-amplitude detail. Byte samples quantize quiet
      // speech heavily, which can make slow/soft speakers disappear below the gate.
      const samples = new Float32Array(analyser.fftSize);
      const frequencyBins = new Uint8Array(analyser.frequencyBinCount);

      // Slow-speech-friendly VAD:
      // - open the recorder quickly after a few consecutive speech frames,
      // - accept quieter speech from laptop/desktop microphones,
      // - leave enough end-of-phrase silence for deliberate speakers,
      // - keep a speech-band check to avoid triggering on low-frequency bumps.
      const SILENCE_DURATION_MS = 900;
      const REQUIRED_SPEECH_FRAMES = 4; // ~65 ms at 60 fps
      const MIN_RECORDING_DURATION_MS = 300;
      const MIN_RECORDING_BYTES = 900;
      const MIN_VOICED_FRAMES = 3;
      let noiseFloor = 0.0018;
      const speechThreshold = () =>
        Math.max(0.0035, Math.min(0.008, noiseFloor * 1.5 + 0.0015));
      let voicedFramesInRecording = 0;

      const beginRecording = () => {
        if (!mediaStreamRef.current || mediaRecorderRef.current) return;

        const preferredMimeTypes = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
        ];

        const mimeType = preferredMimeTypes.find((type) =>
          MediaRecorder.isTypeSupported(type),
        );

        let recorder: MediaRecorder;
        try {
          recorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
        } catch {
          setError("This browser could not initialize audio recording.");
          setStatus("Microphone unavailable");
          return;
        }

        recordingChunksRef.current = [];
        voicedFramesInRecording = 0;
        recordingStartedAtRef.current = performance.now();
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordingChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const chunks = recordingChunksRef.current;
          recordingChunksRef.current = [];
          const duration = recordingStartedAtRef.current === null
            ? 0
            : performance.now() - recordingStartedAtRef.current;
          recordingStartedAtRef.current = null;
          if (
            chunks.length > 0 &&
            duration >= MIN_RECORDING_DURATION_MS &&
            voicedFramesInRecording >= MIN_VOICED_FRAMES &&
            modeRef.current === "interactive" &&
            !speakingRef.current
          ) {
            const audioBlob = new Blob(chunks, {
              type: recorder.mimeType || "audio/webm",
            });
            if (audioBlob.size >= MIN_RECORDING_BYTES) {
              if (process.env.NODE_ENV !== "production") {
                console.debug("[VESH voice] sending recording for transcription", {
                  bytes: audioBlob.size,
                  durationMs: Math.round(duration),
                  voicedFrames: voicedFramesInRecording,
                  mimeType: audioBlob.type,
                });
              }
              void transcribeRecording(audioBlob);
            } else {
              setStatus("Listening");
            }
          } else if (modeRef.current === "interactive" && !speakingRef.current) {
            setStatus("Listening");
          }
        };

        mediaRecorderRef.current = recorder;
        if (process.env.NODE_ENV !== "production") {
          console.debug("[VESH voice] recording started", { mimeType: recorder.mimeType || "browser-default" });
        }
        silenceStartedAtRef.current = null;
        setStatus("Listening");
        transitionTo("START_LISTENING");

        try {
          recorder.start(250);
        } catch {
          mediaRecorderRef.current = null;
          setError("Audio recording could not start. Please try again.");
          setStatus("Microphone unavailable");
        }
      };

      const finishRecording = () => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== "inactive") {
          mediaRecorderRef.current = null;
          try {
            recorder.stop();
          } catch {
            // Ignore a recorder that has already stopped.
          }
        }
        speechFrameCountRef.current = 0;
        silenceStartedAtRef.current = null;
      };

      const detectVoice = () => {
        if (
          modeRef.current !== "interactive" ||
          (speakingRef.current && !monitorWhileSpeaking) ||
          (busyRef.current && !(speakingRef.current && monitorWhileSpeaking)) ||
          !analyserRef.current
        ) {
          animationFrameRef.current = null;
          return;
        }

        if (processingAudioRef.current) {
          animationFrameRef.current = requestAnimationFrame(detectVoice);
          return;
        }

        if (mediaRecorderRef.current && recordingStartedAtRef.current !== null &&
            performance.now() - recordingStartedAtRef.current >= 25_000) {
          finishRecording();
          animationFrameRef.current = null;
          return;
        }

        analyser.getFloatTimeDomainData(samples);

        let sumSquares = 0;
        for (let index = 0; index < samples.length; index += 1) {
          const sample = samples[index];
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / samples.length);
        analyser.getByteFrequencyData(frequencyBins);
        const binHz = audioContext.sampleRate / analyser.fftSize;
        let speechBand = 0;
        let totalBand = 0;
        for (let i = 0; i < frequencyBins.length; i += 1) {
          const hz = i * binHz;
          const value = frequencyBins[i] / 255;
          totalBand += value;
          if (hz >= 100 && hz <= 4200) speechBand += value;
        }
        const speechRatio = totalBand > 0 ? speechBand / totalBand : 0;
        const nowMs = performance.now();
        const threshold = speechThreshold();
        // A quiet voice can have a low RMS level, especially when the speaker is
        // far from a laptop microphone. Keep the gate sensitive, but require
        // consecutive frames and a reasonable amount of energy in the speech band.
        const looksLikeSpeech = rms >= threshold && speechRatio >= 0.08;

        // Track only the quiet-room baseline while idle. Cap it so a noisy room
        // cannot teach the detector to ignore a naturally soft speaker.
        if (!mediaRecorderRef.current && !looksLikeSpeech && speechRatio < 0.08 && rms < 0.006) {
          noiseFloor = Math.min(0.0035, noiseFloor * 0.985 + rms * 0.015);
        }

        if (speakingRef.current && monitorWhileSpeaking) {
          // A stricter TTS-only gate prevents VESH's own playback/room echo
          // from cancelling the answer. Normal listening sensitivity is unchanged.
          const bargeInThreshold = Math.max(threshold * 2.4, 0.0045);
          const clearUserInterruption = rms >= bargeInThreshold && speechRatio >= 0.16;
          if (clearUserInterruption) {
            speechFrameCountRef.current += 1;
          } else {
            speechFrameCountRef.current = Math.max(0, speechFrameCountRef.current - 1);
          }
          // Require sustained speech rather than a brief echo peak.
          if (speechFrameCountRef.current >= 9) {
            // Invalidate callbacks from the playback being interrupted before cancelling it.
            playbackIdRef.current += 1;
            ttsRequestControllerRef.current?.abort();
            ttsRequestControllerRef.current = null;

            const activeAudio = audioRef.current;
            if (activeAudio) {
              activeAudio.onended = null;
              activeAudio.onerror = null;
              activeAudio.pause();
            }
            audioRef.current = null;

            if (audioObjectUrlRef.current) {
              URL.revokeObjectURL(audioObjectUrlRef.current);
              audioObjectUrlRef.current = null;
            }


            speakingRef.current = false;
            setSpeaking(false);
            setStatus("Listening · Interrupted");
            reset();
            speechFrameCountRef.current = 0;
            silenceStartedAtRef.current = null;
            beginRecording();
          }
        } else if (!mediaRecorderRef.current) {
          // Learn only low-level room noise while idle; the baseline is capped
          // above so ambient noise cannot drown out a quiet speaker.
          if (looksLikeSpeech) {
            speechFrameCountRef.current += 1;
          } else {
            speechFrameCountRef.current = 0;
          }

          if (speechFrameCountRef.current >= REQUIRED_SPEECH_FRAMES) {
            beginRecording();
          }
        } else if (looksLikeSpeech) {
          voicedFramesInRecording += 1;
          silenceStartedAtRef.current = null;
        } else if (silenceStartedAtRef.current === null) {
          silenceStartedAtRef.current = nowMs;
        } else if (
          nowMs - silenceStartedAtRef.current >= SILENCE_DURATION_MS
        ) {
          finishRecording();
        }

        animationFrameRef.current = requestAnimationFrame(detectVoice);
      };

      microphoneStartingRef.current = false;
      setVoiceSupported(true);
      setError("");
      setStatus("Listening");
      animationFrameRef.current = requestAnimationFrame(detectVoice);
    } catch (caught) {
      stopMicrophoneSession();
      const message =
        caught instanceof Error
          ? caught.message
          : "VESH could not access the microphone.";

      if (
        caught instanceof DOMException &&
        (caught.name === "NotAllowedError" || caught.name === "SecurityError")
      ) {
        setError(
          "Microphone permission was denied. Allow microphone access for this site in your browser settings.",
        );
        setStatus("Microphone permission needed");
      } else if (
        caught instanceof DOMException &&
        caught.name === "NotFoundError"
      ) {
        setError("No microphone was found on this device.");
        setStatus("Microphone not found");
      } else {
        setError(message);
        setStatus("Microphone unavailable");
      }
    }
  }, [reset, stopMicrophoneSession, transitionTo, transcribeRecording]);

  useEffect(() => {
    startMicrophoneSessionRef.current = () => startMicrophoneSession();
    return () => {
      startMicrophoneSessionRef.current = null;
    };
  }, [startMicrophoneSession]);


  // ---------------------------------------------------------
  // TEXT TO SPEECH
  // ---------------------------------------------------------

  const speak = useCallback(
    async (text: string) => {
      const speechText = text.trim();
      if (!speechText) return;

      // Every playback gets an identity. Events from older playback cannot
      // change the state of a newer playback.
      const playbackId = ++playbackIdRef.current;
      const isCurrentPlayback = () => playbackIdRef.current === playbackId;

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      ttsRequestControllerRef.current?.abort();
      const previousAudio = audioRef.current;
      if (previousAudio) {
        previousAudio.onended = null;
        previousAudio.onerror = null;
        previousAudio.pause();
      }
      audioRef.current = null;

      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = null;
      }

      pauseMicrophoneCapture();

      speakingRef.current = true;
      setSpeaking(true);
      setError("");

      const controller = new AbortController();
      ttsRequestControllerRef.current = controller;
      let finished = false;

      const finishSpeech = () => {
        if (finished || !isCurrentPlayback()) return;
        finished = true;

        if (ttsRequestControllerRef.current === controller) {
          ttsRequestControllerRef.current = null;
        }

        const activeAudio = audioRef.current;
        if (activeAudio) {
          activeAudio.onended = null;
          activeAudio.onerror = null;
          activeAudio.pause();
          audioRef.current = null;
        }

        if (audioObjectUrlRef.current) {
          URL.revokeObjectURL(audioObjectUrlRef.current);
          audioObjectUrlRef.current = null;
        }

        speakingRef.current = false;
        setSpeaking(false);
        reset();

        if (modeRef.current === "interactive" && !micPausedRef.current) {
          setStatus("Listening");
          // If barge-in monitoring is already active, this call safely no-ops;
          // its VAD loop automatically returns to idle listening.
          void startMicrophoneSession();
        } else {
          setStatus(micPausedRef.current ? "Microphone paused" : "Quiet mode");
        }
      };

      // Resolve the language before entering try so the fallback can use it too.
      const language = detectSpeechLanguage(speechText);

      try {
        setStatus("Generating voice");

        const response = await fetch("/api/assistant/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: speechText, language }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Voice provider returned ${response.status}`);
        }

        const audioBlob = await response.blob();
        if (!audioBlob.size) {
          throw new Error("The voice provider returned empty audio.");
        }

        if (controller.signal.aborted || !isCurrentPlayback() || finished) return;

        const objectUrl = URL.createObjectURL(audioBlob);
        audioObjectUrlRef.current = objectUrl;

        const audio = new Audio(objectUrl);
        audioRef.current = audio;
        audio.preload = "auto";

        audio.onended = finishSpeech;
        audio.onerror = () => {
          if (!isCurrentPlayback()) return;
          setError("VESH voice playback failed. Your response is still available as text.");
          finishSpeech();
        };

        await audio.play();

        if (controller.signal.aborted || !isCurrentPlayback() || finished) {
          audio.pause();
          return;
        }

        transitionTo("RESPONSE_STARTED");
        setStatus(
          language === "hi" ? "Speaking · Hindi voice" : "Speaking · Voice",
        );

        // Monitor the microphone during TTS using the stricter barge-in gate.
        void startMicrophoneSession(true);
      } catch (error) {
        if (controller.signal.aborted || !isCurrentPlayback()) return;

        console.warn("VESH Deepgram voice unavailable; using device speech fallback:", error);
        if (!("speechSynthesis" in window)) {
          setError("Voice playback is unavailable on this device. Your response remains available as text.");
          finishSpeech();
          return;
        }

        // Browser TTS is an explicit emergency fallback only. Deepgram remains primary.
        // Prefer a Hindi system voice; fall back to Indian English if Hindi is not installed.
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(speechText);
        const availableVoices = window.speechSynthesis.getVoices();
        const preferredVoice = language === "hi"
          ? availableVoices.find((voice) => /^hi(?:-|$)/i.test(voice.lang))
            || availableVoices.find((voice) => /^en-IN$/i.test(voice.lang))
          : availableVoices.find((voice) => /^en-IN$/i.test(voice.lang))
            || availableVoices.find((voice) => /^en(?:-|$)/i.test(voice.lang));
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          utterance.lang = preferredVoice.lang;
        } else {
          utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
        }
        utterance.rate = 0.96;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.onend = finishSpeech;
        utterance.onerror = (event) => {
          if (event.error !== "canceled" && isCurrentPlayback()) {
            setError("Device voice playback failed. Your response remains available as text.");
            finishSpeech();
          }
        };

        setStatus("Speaking · Device fallback");
        transitionTo("RESPONSE_STARTED");
        window.speechSynthesis.speak(utterance);
        void startMicrophoneSession(true);
      }
    },
    [
      reset,
      startMicrophoneSession,
      pauseMicrophoneCapture,
      transitionTo,
    ],
  );

  const stopSpeaking = useCallback(() => {
    // Invalidate all outstanding audio callbacks first, including device TTS.
    playbackIdRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    ttsRequestControllerRef.current?.abort();
    ttsRequestControllerRef.current = null;

    const activeAudio = audioRef.current;
    if (activeAudio) {
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.pause();
    }
    audioRef.current = null;

    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }


    speakingRef.current = false;
    setSpeaking(false);
    pauseMicrophoneCapture();
    reset();

    if (modeRef.current === "interactive" && !micPausedRef.current) {
      setStatus("Listening");
      void startMicrophoneSession();
    } else {
      setStatus(micPausedRef.current ? "Microphone paused" : "Quiet mode");
    }
  }, [reset, startMicrophoneSession, pauseMicrophoneCapture]);

  // SEND MESSAGE TO VESH*

  // ---------------------------------------------------------

  const sendMessage = useCallback(
    async (raw: string) => {
      const content = raw.trim();

      if (
        !content ||
        busyRef.current ||
        modeRef.current !== "interactive"
      ) {
        return;
      }

      busyRef.current = true;
      setBusy(true);
      const requestController = new AbortController();
      activeRequestRef.current = requestController;

      pauseMicrophoneCapture();
      setCaption("");
      setFullAnswer("");
      setUserMessage(content);
      setError("");
      transitionTo("REQUEST_RECEIVED");
      setStatus("Thinking");

      // The previous implementation sent only the latest user message.
      // Keep a bounded in-session history so follow-up questions have context.
      const requestMessages: ChatMessage[] = [
        ...conversationHistoryRef.current,
        { role: "user" as const, content },
      ].slice(-20);

      try {
        const response = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: requestMessages }),
          signal: requestController.signal,
        });

        if (!response.ok || !response.body) {
          const payload = await response.json().catch(() => ({
            error: "VESH could not respond.",
          }));
          throw new Error(payload.error || "VESH could not respond.");
        }

        transitionTo("RESPONSE_STARTED");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let answer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (requestController.signal.aborted) return;

          buffer += decoder.decode(value, { stream: true });
          buffer = parseSse(buffer, (chunk) => {
            answer += chunk;
            setFullAnswer(answer);
            if (captionsEnabled) setCaption(answer);
          });
        }

        buffer += decoder.decode();
        if (buffer.trim()) {
          parseSse(`${buffer}\n\n`, (chunk) => {
            answer += chunk;
            setFullAnswer(answer);
            if (captionsEnabled) setCaption(answer);
          });
        }

        if (!answer.trim()) {
          throw new Error("VESH received an empty response.");
        }

        // Refresh the shared Workspace/interactive productivity panels after
        // assistant actions. The event is harmless for ordinary chat replies.
        window.dispatchEvent(new Event("vesh-productivity-updated"));
        window.dispatchEvent(new Event("vesh-memory-updated"));

        conversationHistoryRef.current = [
          ...requestMessages,
          { role: "assistant" as const, content: answer },
        ].slice(-20);

        const spokenSummary = createSpokenSummary(answer);
        if (spokenSummary) {
          void speak(spokenSummary);
        } else {
          setStatus("Response ready · No spoken summary generated");
          if (modeRef.current === "interactive") {
            void startMicrophoneSession();
          }
        }
      } catch (caught) {
        if (requestController.signal.aborted) return;

        const message =
          caught instanceof Error ? caught.message : "Something went wrong.";

        setError(message);
        setStatus("I couldn't complete that");
        reset();

      } finally {
        if (activeRequestRef.current === requestController) {
          activeRequestRef.current = null;
        }
        busyRef.current = false;
        setBusy(false);
        if (modeRef.current === "interactive" && !micPausedRef.current && !speakingRef.current && !processingAudioRef.current) {
          window.setTimeout(() => {
            if (modeRef.current === "interactive" && !micPausedRef.current && !busyRef.current && !speakingRef.current) {
              void startMicrophoneSession();
            }
          }, 100);
        }
      }
    },
    [
      captionsEnabled,
      reset,
      speak,
      startMicrophoneSession,
      pauseMicrophoneCapture,
      transitionTo,
    ],
  );

  useEffect(() => {

    sendMessageRef.current = sendMessage;

  }, [sendMessage]);

  // ---------------------------------------------------------


  // ---------------------------------------------------------
  // INTERACTION MODE
  // ---------------------------------------------------------

  const toggleMicrophone = () => {
    if (modeRef.current !== "interactive") return;
    const nextPaused = !micPausedRef.current;
    micPausedRef.current = nextPaused;
    setMicPaused(nextPaused);
    if (nextPaused) {
      stopMicrophoneSession();
      setStatus("Microphone paused");
      setError("");
      return;
    }
    setStatus("Requesting microphone");
    void startMicrophoneSession();
  };

  const changeMode = (nextMode: Mode) => {
    if (nextMode === mode) return;

    modeRef.current = nextMode;
    setMode(nextMode);
    setError("");
    setCaption("");

    if (nextMode === "quiet") {
      micPausedRef.current = false;
      setMicPaused(false);
      playbackIdRef.current += 1;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      ttsRequestControllerRef.current?.abort();
      ttsRequestControllerRef.current = null;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;

      const activeAudio = audioRef.current;
      if (activeAudio) {
        activeAudio.onended = null;
        activeAudio.onerror = null;
        activeAudio.pause();
      }
      audioRef.current = null;

      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = null;
      }

      speakingRef.current = false;
      setSpeaking(false);
      stopMicrophoneSession();
      reset();
      setStatus("Quiet mode");
      return;
    }

    micPausedRef.current = false;
    setMicPaused(false);
    setStatus("Requesting microphone");
    void startMicrophoneSession();
  };


  // ---------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------

  useEffect(() => {
    return () => {
      modeRef.current = "quiet";
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close().catch(() => undefined);
      }
      playbackIdRef.current += 1;
      activeRequestRef.current?.abort();
      ttsRequestControllerRef.current?.abort();

      const activeAudio = audioRef.current;
      if (activeAudio) {
        activeAudio.onended = null;
        activeAudio.onerror = null;
        activeAudio.pause();
      }
      audioRef.current = null;

      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = null;
      }

    };
  }, []);

  // FORMATTED DATE AND TIME*

  // ---------------------------------------------------------

  const dateLabel = now

    ? new Intl.DateTimeFormat(undefined, {

        weekday: "long",

        month: "long",

        day: "numeric",

      }).format(now)

    : "";

  const timeLabel = now

    ? new Intl.DateTimeFormat(undefined, {

        hour: "2-digit",

        minute: "2-digit",

        hour12: false,

      }).format(now)

    : "--:--";

  // ---------------------------------------------------------

  // HOME UI*

  // ---------------------------------------------------------

  return (

    <main

      ref={homeRef}

      className="vesh-fullscreen-home"

      data-theme="dark"

      data-scene={scene}

      data-state={state}

      data-mode={mode}

    >

      <AmbientBackground scene={scene} />

      {/* Header */}

      <header className="vesh-home-header">

        <Link

          href="/"

          className="vesh-wordmark"

          aria-label="VESH home"

        >

          <span className="vesh-wordmark__symbol">

            <i />

            <i />

            <i />

          </span>

          <span>V E S H</span>

        </Link>

        <div className="vesh-header-actions">

          <AmbientScenePicker

            scene={scene}

            onChange={changeScene}

          />

          <button

            type="button"

            className="vesh-fullscreen-button"

            onClick={toggleFullscreen}

            aria-label={

              isFullscreen ? "Exit fullscreen" : "Enter fullscreen"

            }

            title={

              isFullscreen

                ? "Exit fullscreen (Esc)"

                : "Enter fullscreen"

            }

          >

            {isFullscreen ? (

              <CornersInIcon

                size={17}

                weight="light"

                aria-hidden="true"

              />

            ) : (

              <CornersOutIcon

                size={17}

                weight="light"

                aria-hidden="true"

              />

            )}

            <span>

              {isFullscreen ? "Exit" : "Fullscreen"}

            </span>

          </button>

          <HardworkCheckIn />

          <Link

            href="/workspace"

            className="vesh-workspace-link"

          >

            Workspace

            <ArrowUpRightIcon

              size={14}

              weight="light"

              aria-hidden="true"

            />

          </Link>

        </div>

      </header>

      {/* Quiet and Interactive experiences */}

      {mode === "quiet" ? (

        <QuietHomeExperience

          now={now}

          dateLabel={dateLabel}

          timeLabel={timeLabel}

          greeting={greeting}

          displayName={displayName}

          ambientMessage={ambientMessage}

          state={state}

        />

      ) : (

        <section

          className="vesh-interactive-layout"

          aria-label="VESH interactive session"

        >

          <aside className="vesh-interactive-companion">

            <div className="vesh-character vesh-character--interactive">

              <div className="vesh-character__backlight" />

              <div className="vesh-character__floor-shadow" />

              <div className="vesh-character__orbit vesh-character__orbit--one" />

              <div className="vesh-character__orbit vesh-character__orbit--two" />

              <VeshCompanion state={state} />

            </div>

            <div className="vesh-interactive-companion__label">V E S H</div>

            <div className="vesh-interactive-companion__status">

              <span className={`vesh-live-indicator ${speaking ? "is-speaking" : ""}`} />

              {speaking ? "Speaking" : status}

            </div>

          </aside>

          <div className="vesh-conversation-panel">

            <div className="vesh-conversation-panel__top">

              <div>

                <div className="vesh-stage__date">{dateLabel}</div>

                <div className="vesh-stage__time">{timeLabel}</div>

              </div>

              <div className="vesh-session-state">

                <span className={`vesh-live-indicator ${speaking ? "is-speaking" : ""}`} />

                {speaking ? "VESH IS SPEAKING" : "VOICE SESSION"}

              </div>
              <button
                type="button"
                className="vesh-mic-toggle"
                onClick={toggleMicrophone}
                disabled={mode !== "interactive" || speaking || busy}
                aria-pressed={!micPaused}
                title={micPaused ? "Resume microphone" : "Pause microphone"}
              >
                <span className="inline-flex items-center gap-2">
                  {micPaused ? <Play size={16} weight="fill" /> : <Pause size={16} weight="fill" />}
                  <span>{micPaused ? "Resume listening" : "Pause listening"}</span>
                </span>
              </button>
              {speaking && (
                <button
                  type="button"
                  className="vesh-stop-speaking"
                  onClick={stopSpeaking}
                  aria-label="Stop VESH speaking"
                >
                  <span aria-hidden="true">■</span>
                  Stop speaking
                </button>
              )}

            </div>

            <div className="vesh-conversation" aria-live="polite" aria-relevant="additions text">

              {!userMessage && !caption ? (

                <div className="vesh-conversation__empty">

                  <span className="vesh-conversation__eyebrow">YOUR SPACE</span>

                  <h1>I&apos;m listening.</h1>

                  <p>Start speaking naturally. Your conversation will appear here.</p>

                </div>

              ) : (

                <>

                  {userMessage && (

                    <article className="vesh-message vesh-message--user">

                      <span className="vesh-message__label">YOU</span>

                      <p>{userMessage}</p>

                    </article>

                  )}

                  {caption && (
                    <article className="vesh-message vesh-message--vesh">
                      <span className="vesh-message__label">VESH</span>
                      <div className="vesh-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {caption}
                        </ReactMarkdown>
                      </div>
                      {fullAnswer.trim() && (
                        <button
                          type="button"
                          className="vesh-read-full"
                          onClick={() => speak(toSpeechText(fullAnswer))}
                          aria-label="Read the full VESH response aloud"
                          title="Read full response aloud"
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                            <path d="M4 10v4h3l4 3V7l-4 3H4Z" fill="currentColor" />
                            <path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.5 7.5 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </article>
                  )}

                </>

              )}

            </div>

            {error && <p className="vesh-conversation-error">{error}</p>}

            {!voiceSupported && (

              <p className="vesh-conversation-hint">

                Microphone recording is not supported by this browser. Use a recent browser over HTTPS.

              </p>

            )}

          </div>

          <InteractiveWorkspaceRail
            activePanel={interactivePanel}
            onPanelChange={(panel) => {
              setInteractivePanel(panel);
            }}
          />

        </section>

      )}

      {/* Mode control */}

      <footer className="vesh-home-footer">

        <div

          className="vesh-mode-control"

          role="group"

          aria-label="Interaction mode"

        >

          <button

            type="button"

            onClick={() => changeMode("quiet")}

            className={mode === "quiet" ? "is-active" : ""}

            aria-pressed={mode === "quiet"}

          >

            <span className="vesh-mode-dot" />

            Quiet

          </button>

          <button

            type="button"

            onClick={() => changeMode("interactive")}

            className={mode === "interactive" ? "is-active" : ""}

            aria-pressed={mode === "interactive"}

          >

            <span className="vesh-mode-dot" />

            Interactive

          </button>

        </div>

        <span className="vesh-mode-caption">

          {mode === "quiet"

            ? "Here, whenever you need me."

            : speaking

              ? "Speaking"

              : error ||

                (voiceSupported ? status : "Voice unavailable")}

        </span>

      </footer>

    </main>

  );

}
