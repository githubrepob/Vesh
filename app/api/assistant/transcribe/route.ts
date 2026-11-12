import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 24 * 1024 * 1024;
const AZURE_API_VERSION = "2025-10-15";
const REQUEST_TIMEOUT_MS = 35_000;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

type AzureTranscriptionResponse = {
  combinedPhrases?: Array<{ text?: unknown }>;
  phrases?: Array<{ text?: unknown; locale?: unknown; confidence?: unknown }>;
};

async function transcribeWithAzure(
  audio: File,
  key: string,
  region: string,
  signal: AbortSignal,
) {
  const form = new FormData();
  form.set("audio", audio, audio.name || "vesh-recording.webm");

  // Language identification chooses the dominant locale per recording.
  // Azure fast transcription does not promise word-level Hindi/English switching
  // inside one utterance; the en-IN selection also handles Roman-script Hinglish
  // reasonably well, as verified in the user's Speech Studio test.
  form.set(
    "definition",
    JSON.stringify({
      locales: ["en-IN", "hi-IN"],
      profanityFilterMode: "None",
    }),
  );

  const endpoint =
    `https://${region}.api.cognitive.microsoft.com/speechtotext/` +
    `transcriptions:transcribe?api-version=${AZURE_API_VERSION}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
    },
    body: form,
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(
      "Azure Speech STT failed:",
      response.status,
      detail.slice(0, 600),
    );
    throw new Error(`Azure Speech transcription failed (${response.status}).`);
  }

  const result = (await response.json()) as AzureTranscriptionResponse;
  const combined = Array.isArray(result.combinedPhrases)
    ? result.combinedPhrases
        .map((item) => (typeof item.text === "string" ? item.text.trim() : ""))
        .filter(Boolean)
        .join(" ")
    : "";

  const phrases = Array.isArray(result.phrases)
    ? result.phrases
        .map((item) => (typeof item.text === "string" ? item.text.trim() : ""))
        .filter(Boolean)
        .join(" ")
    : "";

  const text = combined || phrases;
  if (!text) {
    throw new Error("No speech was detected. Please try speaking again.");
  }

  return text;
}

async function transcribeWithGroqFallback(
  audio: File,
  prompt: string,
  apiKey: string,
  baseUrl: string,
  model: string,
  signal: AbortSignal,
) {
  const base = new URL(baseUrl);
  if (base.protocol !== "https:") {
    throw new Error("The fallback transcription endpoint must use HTTPS.");
  }

  let pathname = base.pathname.replace(/\/+$/, "");
  pathname = pathname.replace(/\/chat\/completions$/i, "");
  if (!pathname.endsWith("/audio/transcriptions")) {
    pathname += "/audio/transcriptions";
  }
  base.pathname = pathname;
  base.search = "";
  base.hash = "";

  const form = new FormData();
  form.set("file", audio, audio.name || "vesh-recording.webm");
  form.set("model", model);
  form.set("response_format", "json");
  if (prompt) form.set("prompt", prompt.slice(0, 800));

  // Whisper can confuse Hindi and Urdu because of their acoustic similarity.
  // Explicitly provide the spoken language when configured; "auto" omits it.
  const language = process.env.VESH_STT_LANGUAGE?.trim().toLowerCase() || "auto";
  if (language !== "auto") {
    if (!/^[a-z]{2}$/.test(language)) {
      throw new Error("VESH_STT_LANGUAGE must be a two-letter language code or auto.");
    }
    form.set("language", language);
  }
  form.set("temperature", "0");

  const response = await fetch(base.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Groq STT fallback failed:", response.status, detail.slice(0, 400));
    throw new Error(`Fallback transcription failed (${response.status}).`);
  }

  const result = (await response.json()) as { text?: unknown };
  return typeof result.text === "string" ? result.text.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError("Please sign in to use VESH voice.", 401);
    }

    const { data: withinRateLimit, error: rateLimitError } =
      await supabase.rpc("consume_api_rate_limit", {
        p_bucket: "assistant_transcribe",
        p_limit: 8,
        p_window_seconds: 60,
      });

    if (rateLimitError) {
      console.error("VESH transcription rate-limit check failed:", rateLimitError);
      return jsonError(
        "VESH usage controls are not ready. Apply the API rate-limit migration.",
        503,
      );
    }

    if (!withinRateLimit) {
      return jsonError(
        "Voice input is being requested too quickly. Please wait a moment.",
        429,
      );
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_AUDIO_BYTES + 256 * 1024) {
      return jsonError("Audio is too large. Keep recordings under 24 MB.", 413);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError("The audio upload could not be read. Please try again.", 400);
    }

    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return jsonError("No audio recording was received.", 400);
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return jsonError("Audio is too large. Keep recordings under 24 MB.", 413);
    }
    if (!audio.type.toLowerCase().startsWith("audio/")) {
      return jsonError("Unsupported audio format. Please record again.", 415);
    }

    const suppliedPrompt =
      typeof form.get("prompt") === "string"
        ? String(form.get("prompt")).trim()
        : "";
    const prompt =
      suppliedPrompt ||
      "Transcribe the speaker's exact words. The speaker commonly uses Hindi and Hinglish. For Hindi, write Devanagari, not Urdu script. Preserve English technical terms in Latin script. Do not translate, paraphrase, or add words.";

    const azureKey = process.env.AZURE_SPEECH_KEY?.trim();
    const azureRegion = process.env.AZURE_SPEECH_REGION?.trim();
    const groqKey = process.env.VESH_AI_API_KEY?.trim();
    const groqBaseUrl =
      process.env.VESH_AI_BASE_URL?.trim() || "https://api.groq.com/openai/v1";
    const groqModel = process.env.VESH_STT_MODEL?.trim() || "whisper-large-v3-turbo";
    // Groq is the default primary STT provider because Azure currently returns
    // 429 for this resource. Set VESH_STT_PROVIDER=azure to explicitly prefer Azure.
    const preferredProvider =
      process.env.VESH_STT_PROVIDER?.trim().toLowerCase() || "groq";

    const transcribeWithGroq = async () => {
      if (!groqKey) throw new Error("Groq STT is not configured.");
      return transcribeWithGroqFallback(
        audio,
        prompt,
        groqKey,
        groqBaseUrl,
        groqModel,
        AbortSignal.any([
          request.signal,
          AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ]),
      );
    };

    const transcribeWithAzureIfAvailable = async () => {
      if (!azureKey || !azureRegion) {
        throw new Error("Azure Speech is not configured.");
      }
      return transcribeWithAzure(
        audio,
        azureKey,
        azureRegion,
        AbortSignal.any([
          request.signal,
          AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ]),
      );
    };

    const providers =
      preferredProvider === "azure"
        ? [
            { name: "azure-speech", run: transcribeWithAzureIfAvailable },
            { name: "groq", run: transcribeWithGroq },
          ]
        : [
            { name: "groq", run: transcribeWithGroq },
            { name: "azure-speech", run: transcribeWithAzureIfAvailable },
          ];

    let lastProviderError: unknown;
    for (const provider of providers) {
      try {
        const text = await provider.run();
        if (text?.trim()) {
          return Response.json(
            { text: text.trim(), provider: provider.name },
            { headers: { "Cache-Control": "no-store" } },
          );
        }
        throw new Error(`${provider.name} returned an empty transcript.`);
      } catch (providerError) {
        lastProviderError = providerError;
        console.warn(
          `${provider.name} STT unavailable; trying next provider:`,
          providerError instanceof Error ? providerError.message : "Unknown error",
        );
        if (request.signal.aborted) throw providerError;
      }
    }

    console.error("All configured STT providers failed:", lastProviderError);

    return jsonError(
      "VESH couldn't transcribe this recording. Check Azure Speech availability or type your message instead.",
      502,
    );
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return jsonError("Speech transcription timed out. Please try again.", 504);
    }
    if (error instanceof Error && error.name === "AbortError") {
      return jsonError("Transcription was cancelled.", 408);
    }
    console.error("VESH transcription route failed:", error);
    return jsonError("VESH could not reach the speech service.", 502);
  }
}
