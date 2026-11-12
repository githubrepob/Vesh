export type MemoryEntity = {
  canonicalName: string;
  canonicalKey: string;
  aliases: string[];
  entityType: "project" | "company" | "person";
};

const ENTITIES: MemoryEntity[] = [
  {
    canonicalName: "Vesh.ai",
    canonicalKey: "project:vesh",
    aliases: [
      "vesh",
      "vesh.ai",
      "vesh ai",
    ],
    entityType: "project",
  },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolveMemoryEntity(
  value: string,
): MemoryEntity | null {
  const normalized = normalize(value);

  if (!normalized) return null;

  return (
    ENTITIES.find((entity) =>
      entity.aliases.some(
        (alias) => normalize(alias) === normalized,
      ),
    ) ?? null
  );
}

export function findEntitiesInText(
  text: string,
): MemoryEntity[] {
  const normalizedText = normalize(text);

  return ENTITIES.filter((entity) =>
    entity.aliases.some((alias) => {
      const normalizedAlias = normalize(alias);

      return (
        ` ${normalizedText} `.includes(
          ` ${normalizedAlias} `,
        )
      );
    }),
  );
}

export function canonicalizeEntityKey(
  memoryKey: string,
  content: string,
): string {
  const entity = findEntitiesInText(
    `${memoryKey} ${content}`,
  ).find((item) => item.entityType === "project");

  return entity?.canonicalKey ?? memoryKey;
}

export function consolidateEntityContent(
  entity: MemoryEntity,
  existingContent: string[],
): string {
  const uniqueDetails = Array.from(
    new Set(
      existingContent
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

  if (entity.canonicalKey === "project:vesh") {
    return [
      "Project: Vesh.ai",
      "Also known as: VESH.",
      "The user's active AI companion project.",
      ...uniqueDetails.filter(
        (detail) =>
          !/\bvesh(?:\.ai)?\b/i.test(detail),
      ),
    ].join(" ");
  }

  return uniqueDetails.join(" ");
}