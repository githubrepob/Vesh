export type EntityType =
  | "project"
  | "company"
  | "person"
  | "organization"
  | "place"
  | "other";

export type EntityCandidate = {
  id: string;
  user_id: string;
  entity_key: string;
  canonical_name: string;
  entity_type: EntityType;
  description?: string | null;
  confidence: number;
};

export type EntityAliasCandidate = {
  id: string;
  entity_id: string;
  alias: string;
  normalized_alias: string;
  confidence: number;
};

export type EntityResolution =
  | {
      status: "resolved";
      entity: EntityCandidate;
      confidence: number;
      matchedBy: "canonical_name" | "alias";
    }
  | {
      status: "suggestion";
      entity: EntityCandidate;
      confidence: number;
      matchedBy: "similarity";
    }
  | {
      status: "ambiguous";
      suggestions: Array<{
        entity: EntityCandidate;
        confidence: number;
      }>;
    }
  | {
      status: "unknown";
    };

export type EntityResolutionData = {
  entities: EntityCandidate[];
  aliases: EntityAliasCandidate[];
};

export function normalizeEntityName(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenize(value: string): Set<string> {
  return new Set(
    normalizeEntityName(value)
      .split(" ")
      .filter((token) => token.length > 1),
  );
}

function similarity(
  first: string,
  second: string,
): number {
  const a = tokenize(first);
  const b = tokenize(second);

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const token of a) {
    if (b.has(token)) {
      intersection++;
    }
  }

  const union = new Set([...a, ...b]).size;

  return intersection / union;
}

function containsExactPhrase(
  text: string,
  phrase: string,
): boolean {
  const normalizedText = normalizeEntityName(text);
  const normalizedPhrase = normalizeEntityName(phrase);

  if (!normalizedText || !normalizedPhrase) {
    return false;
  }

  return ` ${normalizedText} `.includes(
    ` ${normalizedPhrase} `,
  );
}

export function resolveEntityMention(
  mention: string,
  data: EntityResolutionData,
): EntityResolution {
  const normalizedMention = normalizeEntityName(mention);

  if (!normalizedMention) {
    return { status: "unknown" };
  }

  // 1. Exact canonical-name match.
  const canonicalMatches = data.entities.filter(
    (entity) =>
      normalizeEntityName(entity.canonical_name) ===
      normalizedMention,
  );

  if (canonicalMatches.length === 1) {
    return {
      status: "resolved",
      entity: canonicalMatches[0],
      confidence: 1,
      matchedBy: "canonical_name",
    };
  }

  if (canonicalMatches.length > 1) {
    return {
      status: "ambiguous",
      suggestions: canonicalMatches.map((entity) => ({
        entity,
        confidence: 1,
      })),
    };
  }

  // 2. Exact alias match.
  const aliasMatches = data.aliases
    .filter(
      (alias) =>
        normalizeEntityName(alias.normalized_alias) ===
        normalizedMention ||
        normalizeEntityName(alias.alias) === normalizedMention,
    )
    .map((alias) => ({
      alias,
      entity: data.entities.find(
        (entity) => entity.id === alias.entity_id,
      ),
    }))
    .filter(
      (
        item,
      ): item is {
        alias: EntityAliasCandidate;
        entity: EntityCandidate;
      } => Boolean(item.entity),
    );

  const uniqueAliasEntities = Array.from(
    new Map(
      aliasMatches.map((item) => [
        item.entity.id,
        item.entity,
      ]),
    ).values(),
  );

  if (uniqueAliasEntities.length === 1) {
    return {
      status: "resolved",
      entity: uniqueAliasEntities[0],
      confidence: 1,
      matchedBy: "alias",
    };
  }

  if (uniqueAliasEntities.length > 1) {
    return {
      status: "ambiguous",
      suggestions: uniqueAliasEntities.map((entity) => ({
        entity,
        confidence: 1,
      })),
    };
  }

  // 3. Fuzzy matches are suggestions only.
  const suggestions = data.entities
    .map((entity) => ({
      entity,
      confidence: similarity(
        normalizedMention,
        entity.canonical_name,
      ),
    }))
    .filter((item) => item.confidence >= 0.5)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  if (suggestions.length === 0) {
    return { status: "unknown" };
  }

  if (
    suggestions.length > 1 &&
    suggestions[0].confidence === suggestions[1].confidence
  ) {
    return {
      status: "ambiguous",
      suggestions,
    };
  }

  return {
    status: "suggestion",
    entity: suggestions[0].entity,
    confidence: suggestions[0].confidence,
    matchedBy: "similarity",
  };
}

export function extractRegisteredEntityMentions(
  text: string,
  data: EntityResolutionData,
): Array<{
  mention: string;
  resolution: EntityResolution;
}> {
  const candidates: string[] = [];

  for (const entity of data.entities) {
    candidates.push(entity.canonical_name);
  }

  for (const alias of data.aliases) {
    candidates.push(alias.alias);
  }

  const uniqueCandidates = Array.from(
    new Set(candidates),
  ).sort((a, b) => b.length - a.length);

  const found: Array<{
    mention: string;
    resolution: EntityResolution;
  }> = [];

  const seen = new Set<string>();

  for (const candidate of uniqueCandidates) {
    if (
      containsExactPhrase(text, candidate) &&
      !seen.has(normalizeEntityName(candidate))
    ) {
      seen.add(normalizeEntityName(candidate));

      found.push({
        mention: candidate,
        resolution: resolveEntityMention(candidate, data),
      });
    }
  }

  return found;
}