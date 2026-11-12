
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 5_000;
const REQUEST_TIMEOUT_MS = 25_000;

type TTSRequest = {
  text?: unknown;
  language?: unknown;
};

type FetchError = Error & {
  code?: string;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(request: NextRequest) {
  let timeoutSignal: AbortSignal | undefined;

  try {
    // 1. Authenticate the user.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError("Please sign in to use VESH voice.", 401);
    }

    // 2. Enforce API rate limits.
    const {
      data: withinRateLimit,
      error: rateLimitError,
    } = await supabase.rpc("consume_api_rate_limit", {
      p_bucket: "assistant_tts",
      p_limit: 15,
      p_window_seconds: 60,
    });

    if (rateLimitError) {
      console.error("VESH TTS rate-limit check failed:", rateLimitError);

      return jsonError(
        "VESH voice usage controls are not ready. Apply the API rate-limit migration.",
        503,
      );
    }

    if (!withinRateLimit) {
      return jsonError(
        "VESH voice is being requested too frequently. Please wait a moment.",
        429,
      );
    }

    // 3. Validate request body.
    let body: TTSRequest;

    try {
      body = (await request.json()) as TTSRequest;
    } catch {
      return jsonError("Invalid request body.", 400);
    }

    const text =
      typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return jsonError("Text is required.", 400);
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return jsonError(
        `Text must not exceed ${MAX_TEXT_LENGTH} characters.`,
        413,
      );
    }

    // 4. Read Azure configuration.
    const language = body.language === "hi" ? "hi" : "en";

    const key = process.env.AZURE_SPEECH_KEY?.trim();
    const region = process.env.AZURE_SPEECH_REGION?.trim();

    if (!key || !region) {
      return jsonError(
        "Azure Speech is not configured. Check AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.",
        503,
      );
    }

    // 5. Select natural neural voices.
    const voice =
      language === "hi"
        ? process.env.AZURE_SPEECH_VOICE_HI?.trim() ||
          "hi-IN-SwaraNeural"
        : process.env.AZURE_SPEECH_VOICE_EN?.trim() ||
          "en-IN-NeerjaNeural";

    const locale = language === "hi" ? "hi-IN" : "en-IN";

    // 6. Generate SSML.
    const ssml = [
      '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"',
      ' xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="' +
        locale +
        '">',
      `<voice name="${escapeXml(voice)}">`,
      `<prosody rate="0%" pitch="0%">${escapeXml(text)}</prosody>`,
      "</voice></speak>",
    ].join("");

    const endpoint =
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    // 7. Prepare separate cancellation and timeout signals.
    timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

    const combinedSignal = AbortSignal.any([
      request.signal,
      timeoutSignal,
    ]);

    // 8. Request audio from Azure.
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat":
          "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "VESH",
      },
      body: ssml,
      cache: "no-store",
      signal: combinedSignal,
    });

    // 9. Handle Azure provider errors.
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");

      console.error(
        "Azure Speech TTS failed:",
        upstream.status,
        detail.slice(0, 500),
      );

      if (upstream.status === 429) {
        return jsonError(
          "Azure Speech usage limit reached. VESH will use its browser voice fallback.",
          429,
        );
      }

      if (
        upstream.status === 401 ||
        upstream.status === 403
      ) {
        return jsonError(
          "Azure Speech rejected the configured credentials or region.",
          502,
        );
      }

      return jsonError(
        `Azure Speech could not generate audio (${upstream.status}). VESH can use its browser voice fallback.`,
        502,
      );
    }

    if (!upstream.body) {
      return jsonError(
        "Azure Speech returned an empty audio response.",
        502,
      );
    }

    // 10. Return generated audio.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-VESH-TTS-Provider": "azure-speech",
        "X-VESH-TTS-Voice": voice,
        "X-VESH-TTS-Locale": locale,
      },
    });
  } catch (error) {
    const fetchError = error as FetchError;
    const errorName = fetchError?.name || "UnknownError";

    // 11. User or browser intentionally cancelled the request.
    if (request.signal.aborted) {
      console.info("VESH TTS request cancelled by client.");

      return new Response(null, { status: 499 });
    }

    // 12. Azure request timed out.
    if (
      timeoutSignal?.aborted ||
      errorName === "TimeoutError"
    ) {
      console.warn("VESH Azure TTS timed out.");

      return jsonError(
        "Azure voice generation timed out. VESH can use its browser voice fallback.",
        504,
      );
    }

    // 13. Upstream connection was interrupted.
    if (
      errorName === "ResponseAborted" ||
      errorName === "AbortError" ||
      fetchError?.code === "UND_ERR_ABORTED"
    ) {
      console.warn(
        "VESH Azure TTS connection interrupted:",
        errorName,
        fetchError?.code || "",
      );

      return jsonError(
        "Azure voice connection was interrupted. VESH can use its browser voice fallback.",
        502,
      );
    }

    // 14. Unexpected provider or server failure.
    console.error("VESH Azure TTS route failed:", error);

    return jsonError(
      "VESH voice is temporarily unavailable. The browser voice fallback can be used.",
      500,
    );
  }
}
