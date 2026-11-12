begin;

-- ==========================================
-- 1. CANONICAL ENTITIES
-- ==========================================

create table if not exists public.memory_entities (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    entity_key text not null,
    canonical_name text not null,

    entity_type text not null
        check (
            entity_type in (
                'project',
                'company',
                'person',
                'organization',
                'place',
                'other'
            )
        ),

    description text,

    confidence numeric(4,3) not null default 1.000
        check (confidence between 0 and 1),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint memory_entities_key_length
        check (char_length(entity_key) between 1 and 120),

    constraint memory_entities_name_length
        check (char_length(canonical_name) between 1 and 200),

    constraint memory_entities_user_key_unique
        unique (user_id, entity_key),

    constraint memory_entities_id_user_unique
        unique (id, user_id)
);

create index if not exists memory_entities_user_type_idx
    on public.memory_entities(user_id, entity_type);

create index if not exists memory_entities_user_name_idx
    on public.memory_entities(user_id, lower(canonical_name));


-- ==========================================
-- 2. ENTITY ALIASES
-- ==========================================

create table if not exists public.memory_entity_aliases (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null,

    entity_id uuid not null,

    alias text not null,

    normalized_alias text not null,

    confidence numeric(4,3) not null default 1.000
        check (confidence between 0 and 1),

    created_at timestamptz not null default now(),

    constraint memory_entity_aliases_entity_fk
        foreign key (entity_id, user_id)
        references public.memory_entities(id, user_id)
        on delete cascade,

    constraint memory_entity_aliases_alias_length
        check (char_length(alias) between 1 and 200),

    constraint memory_entity_aliases_normalized_length
        check (char_length(normalized_alias) between 1 and 200),

    constraint memory_entity_aliases_unique
        unique (user_id, normalized_alias)
);

create index if not exists memory_entity_aliases_entity_idx
    on public.memory_entity_aliases(entity_id);


-- ==========================================
-- 3. ENTITY RELATIONSHIPS
-- ==========================================

create table if not exists public.memory_entity_relationships (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null,

    source_entity_id uuid not null,
    target_entity_id uuid not null,

    relationship_type text not null,

    confidence numeric(4,3) not null default 1.000
        check (confidence between 0 and 1),

    evidence text,

    created_at timestamptz not null default now(),

    constraint memory_relationship_source_fk
        foreign key (source_entity_id, user_id)
        references public.memory_entities(id, user_id)
        on delete cascade,

    constraint memory_relationship_target_fk
        foreign key (target_entity_id, user_id)
        references public.memory_entities(id, user_id)
        on delete cascade,

    constraint memory_relationship_not_self
        check (source_entity_id <> target_entity_id),

    constraint memory_relationship_type_length
        check (char_length(relationship_type) between 1 and 80),

    constraint memory_relationship_unique
        unique (
            user_id,
            source_entity_id,
            target_entity_id,
            relationship_type
        )
);

create index if not exists memory_relationship_source_idx
    on public.memory_entity_relationships(source_entity_id);

create index if not exists memory_relationship_target_idx
    on public.memory_entity_relationships(target_entity_id);


-- ==========================================
-- 4. CONNECT EXISTING MEMORIES
-- ==========================================

alter table public.memories
    add column if not exists entity_id uuid;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'memories_entity_user_fk'
          and conrelid = 'public.memories'::regclass
    ) then
        alter table public.memories
            add constraint memories_entity_user_fk
            foreign key (entity_id, user_id)
            references public.memory_entities(id, user_id)
            on delete set null (entity_id);
    end if;
end $$;

create index if not exists memories_entity_id_idx
    on public.memories(entity_id);


-- ==========================================
-- 5. ROW LEVEL SECURITY
-- ==========================================

alter table public.memory_entities
    enable row level security;

alter table public.memory_entity_aliases
    enable row level security;

alter table public.memory_entity_relationships
    enable row level security;


-- Entities

drop policy if exists "Users manage their own entities"
    on public.memory_entities;

create policy "Users manage their own entities"
    on public.memory_entities
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);


-- Aliases

drop policy if exists "Users manage their own entity aliases"
    on public.memory_entity_aliases;

create policy "Users manage their own entity aliases"
    on public.memory_entity_aliases
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);


-- Relationships

drop policy if exists "Users manage their own entity relationships"
    on public.memory_entity_relationships;

create policy "Users manage their own entity relationships"
    on public.memory_entity_relationships
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);


-- ==========================================
-- 6. PERMISSIONS
-- ==========================================

revoke all on public.memory_entities from anon;
revoke all on public.memory_entity_aliases from anon;
revoke all on public.memory_entity_relationships from anon;

grant select, insert, update, delete
    on public.memory_entities to authenticated;

grant select, insert, update, delete
    on public.memory_entity_aliases to authenticated;

grant select, insert, update, delete
    on public.memory_entity_relationships to authenticated;


-- ==========================================
-- 7. UPDATED_AT TRIGGER
-- ==========================================

drop trigger if exists memory_entities_updated_at
    on public.memory_entities;

create trigger memory_entities_updated_at
before update on public.memory_entities
for each row
execute function public.set_updated_at();

commit;