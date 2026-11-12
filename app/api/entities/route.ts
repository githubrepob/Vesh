
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeEntityName } from "@/lib/assistant/entity-resolution";

const ENTITY_TYPES = [
  "project",
  "company",
  "person",
  "organization",
  "place",
  "other",
] as const;

type EntityType = (typeof ENTITY_TYPES)[number];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isEntityType(value: unknown): value is EntityType {
  return (
    typeof value === "string" &&
    ENTITY_TYPES.some((type) => type === value)
  );
}

function isConfidence(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function validText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function authenticatedClient() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user: error ? null : user,
  };
}

export async function GET() {
  const { supabase, user } = await authenticatedClient();

  if (!user) {
    return errorResponse("Authentication required.", 401);
  }

  const [entitiesResult, aliasesResult, relationshipsResult] =
    await Promise.all([
      supabase
        .from("memory_entities")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("memory_entity_aliases")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("memory_entity_relationships")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  if (
    entitiesResult.error ||
    aliasesResult.error ||
    relationshipsResult.error
  ) {
    console.error("VESH entity GET failed:", {
      entities: entitiesResult.error,
      aliases: aliasesResult.error,
      relationships: relationshipsResult.error,
    });

    return errorResponse("Unable to load entities.", 500);
  }

  return NextResponse.json(
    {
      entities: entitiesResult.data,
      aliases: aliasesResult.data,
      relationships: relationshipsResult.data,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await authenticatedClient();

  if (!user) {
    return errorResponse("Authentication required.", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  if (!isRecord(body)) {
    return errorResponse("Invalid request body.", 400);
  }

  const {
    canonical_name,
    entity_key,
    entity_type,
    description,
    confidence,
    aliases,
  } = body;

  if (!validText(canonical_name, 200)) {
    return errorResponse("A valid canonical_name is required.", 400);
  }

  if (
    !validText(entity_key, 200) ||
    !/^[a-z0-9][a-z0-9:_-]*$/.test(entity_key)
  ) {
    return errorResponse(
      "entity_key must use lowercase letters, numbers, colons, underscores or hyphens.",
      400,
    );
  }

  if (!isEntityType(entity_type)) {
    return errorResponse("Invalid entity_type.", 400);
  }

  if (
    description !== undefined &&
    description !== null &&
    (typeof description !== "string" || description.length > 2000)
  ) {
    return errorResponse("Invalid description.", 400);
  }

  if (confidence !== undefined && !isConfidence(confidence)) {
    return errorResponse("Confidence must be between 0 and 1.", 400);
  }

  if (
    aliases !== undefined &&
    (!Array.isArray(aliases) ||
      aliases.length > 20 ||
      !aliases.every((alias) => validText(alias, 200)))
  ) {
    return errorResponse("Invalid aliases.", 400);
  }

  const canonicalName = canonical_name.trim();

  const existingResult = await supabase
    .from("memory_entities")
    .select("id, canonical_name, entity_key")
    .eq("user_id", user.id);

  if (existingResult.error) {
    console.error("VESH entity duplicate check failed:", existingResult.error);
    return errorResponse("Unable to verify entity uniqueness.", 500);
  }

  const normalizedName = normalizeEntityName(canonicalName);

  const duplicate = (existingResult.data ?? []).find(
    (entity) =>
      entity.entity_key === entity_key ||
      normalizeEntityName(entity.canonical_name) === normalizedName,
  );

  if (duplicate) {
    return NextResponse.json(
      {
        error: "An entity with this key or canonical name already exists.",
        existing_entity: duplicate,
      },
      { status: 409 },
    );
  }

  const aliasNames = Array.from(
    new Map(
      ((aliases ?? []) as string[])
        .map((alias) => alias.trim())
        .filter(
          (alias) => normalizeEntityName(alias) !== normalizedName,
        )
        .map((alias) => [normalizeEntityName(alias), alias]),
    ).values(),
  );

  const { data: entity, error: insertError } = await supabase
    .from("memory_entities")
    .insert({
      user_id: user.id,
      entity_key,
      canonical_name: canonicalName,
      entity_type,
      description: typeof description === "string" ? description.trim() : null,
      confidence: confidence ?? 1,
    })
    .select()
    .single();

  if (insertError || !entity) {
    console.error("VESH entity creation failed:", insertError);
    return errorResponse(
      insertError?.code === "23505"
        ? "Entity already exists."
        : "Unable to create entity.",
      insertError?.code === "23505" ? 409 : 500,
    );
  }

  if (aliasNames.length > 0) {
    const { error: aliasError } = await supabase
      .from("memory_entity_aliases")
      .insert(
        aliasNames.map((alias) => ({
          user_id: user.id,
          entity_id: entity.id,
          alias,
          normalized_alias: normalizeEntityName(alias),
          confidence: 1,
        })),
      );

    if (aliasError) {
      const { error: rollbackError } = await supabase
        .from("memory_entities")
        .delete()
        .eq("id", entity.id)
        .eq("user_id", user.id);

      console.error("VESH alias creation failed:", {
        aliasError,
        rollbackError,
      });

      return errorResponse(
        rollbackError
          ? "Alias creation failed and entity cleanup requires attention."
          : "Unable to register aliases. Entity creation was rolled back.",
        500,
      );
    }
  }

  return NextResponse.json(
    {
      entity,
      aliases: aliasNames,
    },
    { status: 201 },
  );
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await authenticatedClient();

  if (!user) {
    return errorResponse("Authentication required.", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  if (!isRecord(body) || typeof body.action !== "string") {
    return errorResponse("A valid action is required.", 400);
  }

  switch (body.action) {
    case "update": {
      if (!isUuid(body.id)) {
        return errorResponse("Valid entity id required.", 400);
      }

      const updates: Record<string, string | number | null> = {};

      if (body.canonical_name !== undefined) {
        if (!validText(body.canonical_name, 200)) {
          return errorResponse("Invalid canonical_name.", 400);
        }

        updates.canonical_name = body.canonical_name.trim();
      }

      if (body.entity_type !== undefined) {
        if (!isEntityType(body.entity_type)) {
          return errorResponse("Invalid entity_type.", 400);
        }

        updates.entity_type = body.entity_type;
      }

      if (body.description !== undefined) {
        if (
          body.description !== null &&
          (typeof body.description !== "string" ||
            body.description.length > 2000)
        ) {
          return errorResponse("Invalid description.", 400);
        }

        updates.description =
          typeof body.description === "string"
            ? body.description.trim()
            : null;
      }

      if (body.confidence !== undefined) {
        if (!isConfidence(body.confidence)) {
          return errorResponse("Invalid confidence.", 400);
        }

        updates.confidence = body.confidence;
      }

      if (Object.keys(updates).length === 0) {
        return errorResponse("No valid updates provided.", 400);
      }

      if (typeof updates.canonical_name === "string") {
        const { data: existing, error: lookupError } = await supabase
          .from("memory_entities")
          .select("id, canonical_name")
          .eq("user_id", user.id)
          .neq("id", body.id);

        if (lookupError) {
          return errorResponse("Unable to validate canonical name.", 500);
        }

        if (
          (existing ?? []).some(
            (entity) =>
              normalizeEntityName(entity.canonical_name) ===
              normalizeEntityName(updates.canonical_name as string),
          )
        ) {
          return errorResponse("Canonical name already exists.", 409);
        }
      }

      const { data, error } = await supabase
        .from("memory_entities")
        .update(updates)
        .eq("id", body.id)
        .eq("user_id", user.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("VESH entity update failed:", error);
        return errorResponse("Unable to update entity.", 500);
      }

      if (!data) {
        return errorResponse("Entity not found.", 404);
      }

      return NextResponse.json({ entity: data });
    }

    case "add_alias": {
      if (!isUuid(body.entity_id) || !validText(body.alias, 200)) {
        return errorResponse("Valid entity_id and alias required.", 400);
      }

      if (
        body.confidence !== undefined &&
        !isConfidence(body.confidence)
      ) {
        return errorResponse("Invalid confidence.", 400);
      }

      const { data: entity } = await supabase
        .from("memory_entities")
        .select("id, canonical_name")
        .eq("id", body.entity_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!entity) {
        return errorResponse("Entity not found.", 404);
      }

      const alias = body.alias.trim();
      const normalizedAlias = normalizeEntityName(alias);

      if (
        normalizedAlias === normalizeEntityName(entity.canonical_name)
      ) {
        return errorResponse("Alias already matches canonical name.", 409);
      }

      const { data, error } = await supabase
        .from("memory_entity_aliases")
        .insert({
          user_id: user.id,
          entity_id: entity.id,
          alias,
          normalized_alias: normalizedAlias,
          confidence: body.confidence ?? 1,
        })
        .select()
        .single();

      if (error) {
        return errorResponse(
          error.code === "23505"
            ? "Alias already registered."
            : "Unable to add alias.",
          error.code === "23505" ? 409 : 500,
        );
      }

      return NextResponse.json({ alias: data }, { status: 201 });
    }

    case "remove_alias": {
      if (!isUuid(body.alias_id)) {
        return errorResponse("Valid alias_id required.", 400);
      }

      const { data, error } = await supabase
        .from("memory_entity_aliases")
        .delete()
        .eq("id", body.alias_id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        return errorResponse("Unable to remove alias.", 500);
      }

      if (!data) {
        return errorResponse("Alias not found.", 404);
      }

      return NextResponse.json({ success: true });
    }

    case "add_relationship": {
      const {
        source_entity_id,
        target_entity_id,
        relationship_type,
        evidence,
        confidence,
      } = body;

      if (
        !isUuid(source_entity_id) ||
        !isUuid(target_entity_id) ||
        source_entity_id === target_entity_id
      ) {
        return errorResponse("Two different valid entity IDs are required.", 400);
      }

      if (
        !validText(relationship_type, 80) ||
        !/^[a-z][a-z0-9_]*$/.test(relationship_type)
      ) {
        return errorResponse("Invalid relationship_type.", 400);
      }

      if (
        evidence !== undefined &&
        evidence !== null &&
        (typeof evidence !== "string" || evidence.length > 2000)
      ) {
        return errorResponse("Invalid evidence.", 400);
      }

      if (confidence !== undefined && !isConfidence(confidence)) {
        return errorResponse("Invalid confidence.", 400);
      }

      const { data: ownedEntities, error: ownershipError } =
        await supabase
          .from("memory_entities")
          .select("id")
          .eq("user_id", user.id)
          .in("id", [source_entity_id, target_entity_id]);

      if (ownershipError) {
        return errorResponse("Unable to validate relationship.", 500);
      }

      if ((ownedEntities ?? []).length !== 2) {
        return errorResponse("One or more entities were not found.", 404);
      }

      const { data, error } = await supabase
        .from("memory_entity_relationships")
        .insert({
          user_id: user.id,
          source_entity_id,
          target_entity_id,
          relationship_type,
          evidence: typeof evidence === "string" ? evidence.trim() : null,
          confidence: confidence ?? 1,
        })
        .select()
        .single();

      if (error) {
        return errorResponse(
          error.code === "23505"
            ? "Relationship already exists."
            : "Unable to create relationship.",
          error.code === "23505" ? 409 : 500,
        );
      }

      return NextResponse.json({ relationship: data }, { status: 201 });
    }

    case "remove_relationship": {
      if (!isUuid(body.relationship_id)) {
        return errorResponse("Valid relationship_id required.", 400);
      }

      const { data, error } = await supabase
        .from("memory_entity_relationships")
        .delete()
        .eq("id", body.relationship_id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        return errorResponse("Unable to remove relationship.", 500);
      }

      if (!data) {
        return errorResponse("Relationship not found.", 404);
      }

      return NextResponse.json({ success: true });
    }

    default:
      return errorResponse("Unsupported action.", 400);
  }
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await authenticatedClient();

  if (!user) {
    return errorResponse("Authentication required.", 401);
  }

  const id = request.nextUrl.searchParams.get("id");

  if (!isUuid(id)) {
    return errorResponse("Valid entity id required.", 400);
  }

  const { data, error } = await supabase
    .from("memory_entities")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("VESH entity deletion failed:", error);
    return errorResponse("Unable to delete entity.", 500);
  }

  if (!data) {
    return errorResponse("Entity not found.", 404);
  }

  return NextResponse.json({ success: true, deleted_id: data.id });
}
