import {
  canonicalizeEntityKey,
  findEntitiesInText,
} from "./memory-entities";

export const MEMORY_TYPES = [
  "fact",
  "preference",
  "goal",
  "project",
  "instruction",
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];

export type MemoryCandidate = {
  id: string;
  memory_key: string;
  content: string;
  memory_type: string;
  updated_at?: string;
};

export type MemoryIntent =
  | {
      kind: "save";
      content: string;
      memoryType: MemoryType;
      memoryKey: string;
    }
  | {
      kind: "forget";
      target: string;
    };

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "because",
  "but", "by", "for", "from", "get", "give", "have", "i",
  "im", "into", "is", "it", "me", "my", "of", "on", "or",
  "our", "please", "that", "the", "this", "to", "want",
  "was", "with", "you", "your", "now", "really", "very",
  "just",
]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter(
      (token) => token.length > 1 && !STOP_WORDS.has(token),
    );
}

function cleanMemoryContent(value: string): string {
  return value
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(
      /\s+(?:until|till)\s+(?:i\s+)?ask(?:\s+you)?(?:\s+again)?\.?$/i,
      "",
    )
    .replace(/[.!?]+$/, "")
    .trim();
}

function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

function inferMemoryType(content: string): MemoryType {
  const text = content.toLowerCase();

  if (
    /\b(prefer|preferred|like|love|enjoy|favorite|favourite|rather)\b/.test(text) ||
    /(?:पसंद है|पसंद करता|पसंद करती|अच्छा लगता|अच्छी लगती|मुझे .* पसंद)/u.test(text)
  ) {
    return "preference";
  }

  if (
    /\b(goal|aim|aspire|target|want to achieve|career objective)\b/.test(text) ||
    /(?:मेरा लक्ष्य|मेरा मकसद|मेरा aim|मेरा goal|मैं .* बनना चाहता|मैं .* बनना चाहती)/iu.test(text)
  ) {
    return "goal";
  }

  if (
    /\b(building|developing|working on|creating|making|my project|project called|project is)\b/.test(text) ||
    /(?:बना रहा हूँ|बना रही हूँ|काम कर रहा हूँ|काम कर रही हूँ|मेरा प्रोजेक्ट)/u.test(text)
  ) {
    return "project";
  }

  if (
    /\b(always|never|from now on|going forward|every time)\b/.test(text)
  ) {
    return "instruction";
  }

  return "fact";
}

function inferMemoryKey(
  content: string,
  memoryType: MemoryType,
): string {
  const entityKey = canonicalizeEntityKey("", content);

  if (entityKey) {
    return entityKey;
  }

  const text = content.toLowerCase();

  if (memoryType === "preference") {
    if (
      /\b(java|python|javascript|typescript|c\+\+|c#|rust|go|kotlin|swift)\b/.test(text)
    ) {
      return "preference:programming_language";
    }

    if (
      /\b(vegetarian|vegan|non.?vegetarian|food|diet)\b/.test(text)
    ) {
      return "preference:food";
    }

    if (
      /\b(short|detailed|step.?by.?step|concise|simple)\b/.test(text)
    ) {
      return "preference:communication_style";
    }

    return "preference:general";
  }

  if (memoryType === "goal") {
    if (
      /\b(career|job|company|microsoft|google|amazon|placement|salary|developer|engineer)\b/.test(text)
    ) {
      return "goal:career";
    }

    return "goal:primary";
  }

  if (memoryType === "project") {
    const words = tokenize(content).slice(0, 3);

    return `project:${slugify(words.join("_")) || "general"}`;
  }

  if (memoryType === "instruction") {
    const words = tokenize(content).slice(0, 3);

    return `instruction:${slugify(words.join("_")) || "general"}`;
  }

  const words = tokenize(content).slice(0, 3);
  const key = slugify(words.join("_"));
  return `fact:${key || `personal_${Date.now().toString(36)}`}`;
}

function normalizeEntityContent(
  content: string,
  memoryType: MemoryType,
): string {
  if (memoryType !== "project") {
    return content;
  }

  const entities = findEntitiesInText(content);
  const veshEntity = entities.find(
    (entity) => entity.canonicalKey === "project:vesh",
  );

  if (veshEntity) {
    return "Project: Vesh.ai. Also known as VESH. The user's active AI companion project.";
  }

  return content;
}

function extractSaveContent(message: string): string | null {
  const explicitPatterns = [
    /^(?:hey\s+vesh[, ]*)?(?:please\s+)?remember(?:\s+that)?\s+(.+)$/i,
    /^(?:अरे\s+)?(?:वेश[, ]*)?(?:याद रखना|याद रखो|याद रखिए|इसे याद कर लो|सेव कर लो)[: ,।]*\s*(.+)$/u,
    /^(?:please\s+)?(?:याद रखना|याद रखो)[: ,।]*\s*(.+)$/u,
    /^(?:hey\s+vesh[, ]*)?(?:please\s+)?save(?:\s+that)?\s+(.+)$/i,
    /^(?:hey\s+vesh[, ]*)?(?:please\s+)?keep\s+in\s+mind\s+(?:that\s+)?(.+)$/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = message.trim().match(pattern);

    if (match?.[1]) {
      return cleanMemoryContent(match[1]);
    }
  }

  // Explicit preference corrections should replace the existing preference,
  // regardless of whether the request arrives through voice or text.
  const preferenceCorrection = message.trim().match(
    /^(?:(?:i(?:'m| am)\s+(?:asking|telling)\s+you\s+to)\s+|please\s+)?(?:change|switch|update|set)\s+my\s+(?:preferred\s+)?(?:programming|coding)\s+language\s+to\s+(.+?)(?:\s+now)?[.!]?$/i,
  );
  if (preferenceCorrection) {
    return `My preferred programming language is ${preferenceCorrection[1].trim()}`;
  }

  const preferenceStatement = message.trim().match(
    /^(?:(?:i\s+(?:now\s+)?prefer)|(?:my\s+preferred\s+(?:programming|coding)\s+language\s+is))\s+(.+?)[.!]?$/i,
  );
  if (preferenceStatement && /\b(java|python|javascript|typescript|c\+\+|c#|rust|go|kotlin|swift)\b/i.test(preferenceStatement[1])) {
    return `My preferred programming language is ${preferenceStatement[1].trim()}`;
  }

  // High-confidence personal statements.
  const stablePatterns = [
    /^i\s+(?:now\s+)?(?:prefer|like|love|enjoy)\s+.+$/i,
    /^my\s+(?:main\s+)?goal\s+is\s+.+$/i,
    /^my\s+aim\s+is\s+.+$/i,
    /^i(?:'m| am)\s+(?:currently\s+)?(?:building|developing|creating|making|working\s+on)\s+.+$/i,
    /^i\s+(?:always|never)\s+.+$/i,
    /^from\s+now\s+on,?\s+.+$/i,
  ];

  if (
    stablePatterns.some((pattern) => pattern.test(message.trim()))
  ) {
    return cleanMemoryContent(message);
  }

  return null;
}

function extractForgetTarget(message: string): string | null {
  const patterns = [
    /^(?:hey\s+vesh[, ]*)?(?:please\s+)?forget(?:\s+that)?\s+(.+)$/i,
    /^(?:hey\s+vesh[, ]*)?(?:please\s+)?delete\s+(?:the\s+)?memory\s+(?:about\s+)?(.+)$/i,
    /^(?:hey\s+vesh[, ]*)?(?:please\s+)?remove\s+(?:the\s+)?memory\s+(?:about\s+)?(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = message.trim().match(pattern);

    const target = match?.[1] ?? match?.[2];

    if (target) {
      return cleanMemoryContent(target);
    }
  }

  return null;
}

export function detectMemoryIntent(
  message: string,
): MemoryIntent | null {
  const trimmed = message.trim();

  if (!trimmed) return null;

  const forgetTarget = extractForgetTarget(trimmed);

  if (forgetTarget) {
    return {
      kind: "forget",
      target: forgetTarget,
    };
  }

  const extractedContent = extractSaveContent(trimmed);

  if (
    !extractedContent ||
    extractedContent.length === 0 ||
    extractedContent.length > 2000
  ) {
    return null;
  }

  const memoryType = inferMemoryType(extractedContent);
  const content = normalizeEntityContent(
    extractedContent,
    memoryType,
  );

  const memoryKey = inferMemoryKey(content, memoryType);

  return {
    kind: "save",
    content,
    memoryType,
    memoryKey,
  };
}

function similarityScore(
  query: string,
  candidate: string,
): number {
  const queryTokens = new Set(tokenize(query));
  const candidateTokens = new Set(tokenize(candidate));

  if (!queryTokens.size || !candidateTokens.size) {
    return 0;
  }

  let overlap = 0;

  for (const token of queryTokens) {
    if (candidateTokens.has(token)) {
      overlap++;
    }
  }

  const precision = overlap / queryTokens.size;
  const recall = overlap / candidateTokens.size;

  if (precision + recall === 0) return 0;

  return (2 * precision * recall) / (precision + recall);
}

export function findMemoryMatches(
  target: string,
  memories: MemoryCandidate[],
): MemoryCandidate[] {
  const normalizedTarget = normalizeText(target);

  if (!normalizedTarget) return [];

  return memories
    .map((memory) => {
      const score = Math.max(
        similarityScore(target, memory.content),
        similarityScore(
          target,
          memory.memory_key.replace(/[:_]/g, " "),
        ),
      );

      return {
        memory,
        score:
          normalizeText(memory.content) === normalizedTarget
            ? 1
            : score,
      };
    })
    .filter((item) => item.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .filter(
      (item, index, array) =>
        index < 5 && item.score >= array[0].score - 0.2,
    )
    .map((item) => item.memory);
}

export function findMemoryToUpdate(
  intent: Extract<MemoryIntent, { kind: "save" }>,
  memories: MemoryCandidate[],
): MemoryCandidate | null {
  const exactKeyMatch = memories.find(
    (memory) =>
      memory.memory_key.toLowerCase() ===
      intent.memoryKey.toLowerCase(),
  );

  if (exactKeyMatch) {
    return exactKeyMatch;
  }

  // Recognize older memories that used hash-based keys.
  const legacyMatch = memories.find((memory) => {
    const oldType = inferMemoryType(memory.content);
    const oldKey = inferMemoryKey(memory.content, oldType);

    return oldKey === intent.memoryKey;
  });

  if (legacyMatch) {
    return legacyMatch;
  }

  // A project with a similar description/name is not necessarily the same
  // project. Never fuzzy-overwrite project records; let the caller add or ask.
  if (intent.memoryType === "project") {
    return null;
  }

  const ranked = memories
    .filter(
      (memory) =>
        memory.memory_type === intent.memoryType,
    )
    .map((memory) => ({
      memory,
      score: similarityScore(
        intent.content,
        memory.content,
      ),
    }))
    .sort((a, b) => b.score - a.score);

  if (ranked.length && ranked[0].score >= 0.85) {
    return ranked[0].memory;
  }

  return null;
}

export function rankRelevantMemories(
  query: string,
  memories: MemoryCandidate[],
  limit = 8,
): MemoryCandidate[] {
  const queryTokens = new Set(tokenize(query));

  if (queryTokens.size === 0) {
    return memories.slice(0, limit);
  }

  return memories
    .map((memory) => {
      const contentScore = similarityScore(
        query,
        memory.content,
      );

      const keyScore = similarityScore(
        query,
        memory.memory_key.replace(/[:_]/g, " "),
      );

      return {
        memory,
        score: Math.max(contentScore, keyScore),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.memory);
}