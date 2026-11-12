"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import styles from "./memory.module.css";
import AccountMenu from "@/components/AccountMenu";
import { ArrowLeft, Brain, ChatCircleText, SquaresFour } from "@phosphor-icons/react";

type MemoryType = "fact" | "preference" | "goal" | "project" | "instruction";
type Memory = {
  id: string;
  memory_key: string;
  content: string;
  memory_type: MemoryType;
  source: string;
  created_at: string;
  updated_at: string;
};
type Filter = "all" | MemoryType;

const CATEGORIES: { id: MemoryType; label: string; description: string }[] = [
  { id: "fact", label: "Personal facts", description: "Details worth retaining" },
  { id: "preference", label: "Preferences", description: "How you like things" },
  { id: "goal", label: "Goals", description: "What you're working toward" },
  { id: "project", label: "Projects", description: "Things you're building" },
  { id: "instruction", label: "Instructions", description: "How VESH should help" },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric", month: "short", year: "numeric",
  }).format(date);
}

function makeMemoryKey(type: MemoryType, content: string) {
  const slug = content.toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 72);
  return `${type}:${slug || "saved_memory"}`;
}

async function readError(response: Response) {
  try {
    const data = await response.json();
    return typeof data.error === "string" ? data.error : "Something went wrong.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [content, setContent] = useState("");
  const [memoryType, setMemoryType] = useState<MemoryType>("fact");
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadMemories = useCallback(async () => {
    try {
      const response = await fetch("/api/memories", { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { memories?: Memory[] };
      setError("");
      setMemories(data.memories ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load memories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadMemories();
    }, 0);

    const refresh = () => {
      void loadMemories();
    };

    window.addEventListener("vesh-memory-updated", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("vesh-memory-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadMemories]);

  const counts = useMemo(() => {
    const result: Record<MemoryType, number> = {
      fact: 0, preference: 0, goal: 0, project: 0, instruction: 0,
    };
    memories.forEach((memory) => { result[memory.memory_type] += 1; });
    return result;
  }, [memories]);

  const visibleMemories = useMemo(() => {
    const query = search.trim().toLowerCase();
    return memories.filter((memory) => {
      const matchesType = filter === "all" || memory.memory_type === filter;
      const matchesSearch = !query ||
        `${memory.content} ${memory.memory_key} ${memory.memory_type}`.toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [memories, filter, search]);

  function resetForm() {
    setContent("");
    setMemoryType("fact");
    setEditingId(null);
  }

  function beginEdit(memory: Memory) {
    setContent(memory.content);
    setMemoryType(memory.memory_type);
    setEditingId(memory.id);
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanContent = content.trim();
    if (!cleanContent) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = editingId
        ? await fetch("/api/memories", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId, content: cleanContent, memory_type: memoryType }),
          })
        : await fetch("/api/memories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memory_key: makeMemoryKey(memoryType, cleanContent),
              content: cleanContent,
              memory_type: memoryType,
            }),
          });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { memory?: Memory };
      if (data.memory) {
        setMemories((current) => [data.memory!, ...current.filter((item) => item.id !== data.memory!.id)]);
      } else {
        await loadMemories();
      }
      setNotice(editingId ? "Memory updated." : "Memory saved.");
      resetForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this memory.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMemory(memory: Memory) {
    if (!window.confirm(`Forget this memory?\n\n“${memory.content}”`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/memories?id=${encodeURIComponent(memory.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response));
      setMemories((current) => current.filter((item) => item.id !== memory.id));
      if (editingId === memory.id) resetForm();
      setNotice("Memory deleted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this memory.");
    }
  }

  return (
    <main className={`vesh-app workspace-app ${styles.page}`} data-theme="dark">
      <div className="environment" aria-hidden="true">
        <div className="environment__glow environment__glow--one" />
        <div className="environment__glow environment__glow--two" />
        <div className="environment__grid" />
      </div>
      <header className="topbar workspace-topbar">
        <Link className="brand" href="/">
          <span className="brand__mark"><span /><span /><span /></span>
          <span className="brand__name">VESH</span>
          <span className="brand__divider" />
          <span className="brand__descriptor">WORKSPACE</span>
        </Link>
        <div className="workspace-topbar-actions">
          <Link className="workspace-link" href="/workspace"><ArrowLeft size={15} weight="regular" /> Workspace</Link>
          <AccountMenu
            mobileNavigation
            showEnvironmentLink={false}
            showWorkspaceLink={false}
            showStreak
            homeLinkLabel="Return to Workspace"
            homeLinkHref="/workspace"
            secondaryHomeLinkLabel="Return to VESH"
            secondaryHomeLinkHref="/"
          />
        </div>
      </header>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <p className={styles.eyebrow}>YOUR SPACE</p>
          <h1>Workspace</h1>
          <p className={styles.sideIntro}>Your personal knowledge, kept under your control.</p>
          <nav className={styles.nav} aria-label="Workspace sections">
            <Link href="/workspace"><SquaresFour size={18} weight="regular" aria-hidden="true" /> <span>Overview</span></Link>
            <Link href="/workspace/conversations"><ChatCircleText size={18} weight="regular" aria-hidden="true" /> <span>Conversations</span></Link>
            <Link href="/workspace/memory" aria-current="page" className={styles.active}><Brain size={18} weight="regular" aria-hidden="true" /> <span>Memory</span></Link>
          </nav>
          <div className={styles.privacyNote}> <span /> Private to your account <small>Stored securely with your VESH account</small></div>
        </aside>

        <section className={styles.content}>
          <div className={styles.heading}>
            <div>
              <p className={styles.eyebrow}>PERSONAL KNOWLEDGE</p>
              <h2>What VESH knows.</h2>
              <p>Memories VESH can use to understand you across conversations.</p>
            </div>
            <div className={styles.total}><strong>{memories.length}</strong><span>saved memories</span></div>
          </div>

          <div className={styles.categoryGrid}>
            {CATEGORIES.map((category) => (
              <button key={category.id} className={`${styles.categoryCard} ${filter === category.id ? styles.categorySelected : ""}`} onClick={() => setFilter(filter === category.id ? "all" : category.id)}>
                <span>{category.label}</span><strong>{counts[category.id]}</strong><small>{category.description}</small>
              </button>
            ))}
          </div>

          <form className={styles.editor} onSubmit={saveMemory}>
            <div className={styles.editorTitle}>
              <div><p className={styles.eyebrow}>{editingId ? "UPDATE MEMORY" : "ADD TO YOUR MEMORY"}</p><h3>{editingId ? "Edit a memory" : "Something worth remembering?"}</h3></div>
              {editingId && <button type="button" className={styles.textButton} onClick={resetForm}>Cancel edit</button>}
            </div>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={3} placeholder="Write a fact, preference, goal, project detail or instruction…" aria-label="Memory content" />
            <div className={styles.editorActions}>
              <label>Category
                <select value={memoryType} onChange={(event) => setMemoryType(event.target.value as MemoryType)}>
                  {CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                </select>
              </label>
              <button className={styles.primaryButton} type="submit" disabled={!content.trim() || saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Save memory"}</button>
            </div>
            <p className={styles.helper}>Only save information you want VESH to retain. You can edit or delete it at any time.</p>
          </form>

          {error && (/authentication required|unauthorized|sign in/i.test(error) ? (
            <div className={`${styles.error} ${styles.authError}`} role="alert">
              <span>Sign in to access your saved memory.</span>
              <Link href="/login">Sign in</Link>
              <Link href="/signup">Create account</Link>
            </div>
          ) : <div className={styles.error} role="alert">{error}</div>)}
          {notice && <div className={styles.notice} role="status">{notice}</div>}

          <div className={styles.listHeader}>
            <div><p className={styles.eyebrow}>YOUR KNOWLEDGE</p><h3>{filter === "all" ? "All memories" : CATEGORIES.find((item) => item.id === filter)?.label}</h3><span>{visibleMemories.length} {visibleMemories.length === 1 ? "memory" : "memories"}</span></div>
            <div className={styles.filters}>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search memories" aria-label="Search memories" />
              <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="Filter memories">
                <option value="all">All categories</option>
                {CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? <div className={styles.empty}>Loading your memories…</div> : visibleMemories.length ? (
            <div className={styles.memoryList}>
              {visibleMemories.map((memory) => (
                <article className={styles.memoryCard} key={memory.id}>
                  <div className={styles.memoryMain}>
                    <div className={styles.memoryMeta}><span className={styles.typePill}>{CATEGORIES.find((item) => item.id === memory.memory_type)?.label ?? memory.memory_type}</span><time>Updated {formatDate(memory.updated_at)}</time></div>
                    <p>{memory.content}</p>
                    <small>{memory.source === "user" ? "Added by you or at your request" : "Captured from conversation"}</small>
                  </div>
                  <div className={styles.cardActions}>
                    <button type="button" onClick={() => beginEdit(memory)}>Edit</button>
                    <button type="button" className={styles.deleteButton} onClick={() => void deleteMemory(memory)}>Forget</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <span>✧</span><h3>{search || filter !== "all" ? "No matching memories" : "Your memory starts here"}</h3>
              <p>{search || filter !== "all" ? "Try another search or category." : "When you ask VESH to remember something, it will appear here. You can also add a memory yourself."}</p>
              {(search || filter !== "all") && <button type="button" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</button>}
            </div>
          )}
          <p className={styles.footnote}>VESH MEMORY · You control what is retained. Deleting a memory removes it from your saved memory store.</p>
        </section>
      </div>
    </main>
  );
}
