"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CalendarBlank,
  CheckCircle,
  ChatCircleText,
  ListChecks,
  Microphone,
  Plus,
  Trash,
  PencilSimple,
  X,
  CaretLeft,
  CaretRight,
  Notebook,
} from "@phosphor-icons/react";

type Panel = "voice" | "conversations" | "tasks" | "calendar" | "notes";
type Task = {
  id: string; title: string; description: string; status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high"; scheduled_at: string | null; due_at: string | null;
  estimated_minutes: number | null; created_at: string;
};
type MiniMessage = { role: "user" | "assistant"; content: string };
type Note = { id: string; title: string; content: string; pinned: boolean; updated_at: string };
type CalendarEvent = {
  id: string; title: string; description: string; event_type: "deadline" | "objective" | "event";
  starts_at: string; ends_at: string | null;
};

const nav: { id: Panel; label: string; Icon: typeof Microphone }[] = [
  { id: "voice", label: "Voice", Icon: Microphone },
  { id: "conversations", label: "Conversations", Icon: ChatCircleText },
  { id: "tasks", label: "Today's plan", Icon: ListChecks },
  { id: "calendar", label: "Calendar", Icon: CalendarBlank },
  { id: "notes", label: "Notes", Icon: Notebook },
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function InteractiveWorkspaceRail({
  activePanel,
  onPanelChange,
}: {
  activePanel: Panel;
  onPanelChange: (panel: Panel) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState(() => localInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [taskMinutes, setTaskMinutes] = useState("");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("medium");
  const [miniMessages, setMiniMessages] = useState<MiniMessage[]>([]);
  const [miniConversationId, setMiniConversationId] = useState<string | null>(null);
  const [miniInput, setMiniInput] = useState("");
  const [miniSending, setMiniSending] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(localInputValue(new Date()));
  const [eventType, setEventType] = useState<CalendarEvent["event_type"]>("deadline");
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const loadTasks = useCallback(async () => {
    const result = await api<{ tasks: Task[] }>("/api/productivity?kind=tasks");
    setTasks(result.tasks);
  }, []);
  const loadNotes = useCallback(async () => {
    const result = await api<{ notes: Note[] }>("/api/productivity?kind=notes");
    setNotes(result.notes ?? []);
  }, []);
  const loadEvents = useCallback(async () => {
    const result = await api<{ events: CalendarEvent[] }>("/api/productivity?kind=events");
    setEvents(result.events);
  }, []);

    useEffect(() => {
    if (!["tasks", "calendar", "notes"].includes(activePanel)) return;

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError("");

      const load =
        activePanel === "tasks"
          ? loadTasks
          : activePanel === "calendar"
            ? loadEvents
            : loadNotes;

      try {
        await load();
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load your data."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      return load;
    };

    let currentLoad: (() => Promise<void>) | undefined;

    void loadData().then((load) => {
      currentLoad = load;
    });

    const refresh = () => {
      if (
        document.visibilityState !== "visible" ||
        cancelled ||
        !currentLoad
      ) {
        return;
      }

      void currentLoad().catch((caught: unknown) => {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not refresh your data."
          );
        }
      });
    };

    window.addEventListener("focus", refresh);
    window.addEventListener("vesh-productivity-updated", refresh);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("vesh-productivity-updated", refresh);
    };
  }, [activePanel, loadTasks, loadEvents, loadNotes]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayLabel = today.toLocaleDateString();
  const todaysTasks = tasks.filter((task) => {
    if (task.status === "completed") return false;
    const due = task.due_at ? new Date(task.due_at) : null;
    const scheduled = task.scheduled_at ? new Date(task.scheduled_at) : null;
    return !due && !scheduled || [due, scheduled].some((date) => date && date.toLocaleDateString() === todayLabel);
  });
  const monthEvents = useMemo(() => events.filter((event) => {
    const date = new Date(event.starts_at);
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
  }), [events, month]);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    setError("");
    try {
      const payload = { title: taskTitle.trim(), due_at: taskDue ? new Date(taskDue).toISOString() : null, scheduled_at: taskDue ? new Date(taskDue).toISOString() : null, estimated_minutes: taskMinutes.trim() ? Number(taskMinutes) : null, priority: taskPriority };
      const result = await api<{ task: Task }>("/api/productivity?kind=tasks", { method: "POST", body: JSON.stringify(payload) });
      setTasks((current) => [...current, result.task]);
      setTaskTitle(""); setTaskDue(localInputValue(new Date(Date.now() + 60 * 60 * 1000))); setTaskMinutes(""); setTaskPriority("medium"); setTaskModalOpen(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not add task."); }
  }

  async function updateTask(task: Task, patch: Partial<Task>) {
    try {
      const result = await api<{ task: Task }>("/api/productivity?kind=tasks", { method: "PATCH", body: JSON.stringify({ id: task.id, ...patch }) });
      setTasks((current) => current.map((item) => item.id === task.id ? result.task : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update task."); }
  }

  async function deleteTask(task: Task) {
    try { await api(`/api/productivity?kind=tasks&id=${task.id}`, { method: "DELETE" }); setTasks((current) => current.filter((item) => item.id !== task.id)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete task."); }
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteContent.trim()) return;
    setError("");
    try {
      if (editingNote) {
        const result = await api<{ note: Note }>("/api/productivity?kind=notes", {
          method: "PATCH",
          body: JSON.stringify({ id: editingNote, title: noteTitle.trim() || "Untitled note", content: noteContent.trim() }),
        });
        setNotes((items) => items.map((item) => item.id === editingNote ? result.note : item));
      } else {
        const result = await api<{ note: Note }>("/api/productivity?kind=notes", {
          method: "POST",
          body: JSON.stringify({ title: noteTitle.trim() || "Untitled note", content: noteContent.trim() }),
        });
        setNotes((items) => [result.note, ...items]);
      }
      setNoteTitle("");
      setNoteContent("");
      setEditingNote(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save note.");
    }
  }

  async function deleteNote(note: Note) {
    try {
      await api(`/api/productivity?kind=notes&id=${note.id}`, { method: "DELETE" });
      setNotes((items) => items.filter((item) => item.id !== note.id));
      if (editingNote === note.id) {
        setEditingNote(null);
        setNoteTitle("");
        setNoteContent("");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete note.");
    }
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;
    const payload = { title: eventTitle.trim(), starts_at: new Date(eventDate).toISOString(), event_type: eventType };
    try {
      if (editingEvent) {
        const result = await api<{ event: CalendarEvent }>("/api/productivity?kind=events", { method: "PATCH", body: JSON.stringify({ id: editingEvent, ...payload }) });
        setEvents((current) => current.map((item) => item.id === editingEvent ? result.event : item));
      } else {
        const result = await api<{ event: CalendarEvent }>("/api/productivity?kind=events", { method: "POST", body: JSON.stringify(payload) });
        setEvents((current) => [...current, result.event]);
      }
      setEventTitle(""); setEditingEvent(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save event."); }
  }

  async function removeEvent(event: CalendarEvent) {
    try { await api(`/api/productivity?kind=events&id=${event.id}`, { method: "DELETE" }); setEvents((current) => current.filter((item) => item.id !== event.id)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete event."); }
  }

  function editEvent(event: CalendarEvent) {
    setEditingEvent(event.id); setEventTitle(event.title); setEventDate(localInputValue(new Date(event.starts_at))); setEventType(event.event_type);
  }

  async function sendMiniMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = miniInput.trim();
    if (!content || miniSending) return;
    const next = [...miniMessages, { role: "user" as const, content }];
    setMiniMessages([...next, { role: "assistant", content: "" }]);
    setMiniInput(""); setMiniSending(true); setError("");
    try {
      let targetConversationId = miniConversationId;
      const response = await fetch("/api/assistant/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: targetConversationId, messages: next }) });
      if (!response.ok || !response.body) { const body = await response.json().catch(() => ({})); throw new Error(body.error || `Chat failed (${response.status})`); }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      const consumeFrame = (frame: string) => {
        const data = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");
        if (!data || data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{
              delta?: { content?: string };
              message?: { content?: string };
            }>;
          };
          const token = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? "";
          if (token) {
            answer += token;
            setMiniMessages([...next, { role: "assistant", content: answer }]);
          }
        } catch {
          console.warn("VESH quick chat ignored a malformed SSE frame.");
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) consumeFrame(frame);
      }
      buffer += decoder.decode();
      if (buffer.trim()) consumeFrame(buffer);
      if (!answer.trim()) {
        console.error("VESH quick chat stream ended without text.", {
          contentType: response.headers.get("content-type"),
          status: response.status,
          trailingFrame: buffer.slice(0, 500),
        });
        throw new Error("The AI stream ended without a text response. Check the server terminal for the provider response.");
      }
      window.dispatchEvent(new Event("vesh-productivity-updated"));
      window.dispatchEvent(new Event("vesh-memory-updated"));
      if (!targetConversationId) {
        const created = await api<{ conversation: { id: string } }>("/api/conversations", {
          method: "POST",
          body: JSON.stringify({ title: content.slice(0, 72) || "New conversation" }),
        });
        targetConversationId = created.conversation.id;
        setMiniConversationId(targetConversationId);
      }
      const saveResponse = await fetch(`/api/conversations/${targetConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content }, { role: "assistant", content: answer }] }),
      });
      if (!saveResponse.ok) {
        const body = await saveResponse.json().catch(() => ({}));
        throw new Error(body.error || "VESH replied, but couldn't save this conversation.");
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not send your message.";
      setError(message);
      setMiniMessages([...next, { role: "assistant", content: `**Couldn't complete that request.** ${message}` }]);
    }
    finally { setMiniSending(false); }
  }

  return (
    <>
      <nav className="vesh-interactive-rail" aria-label="Interactive workspace">
        {nav.map(({ id, label, Icon }) => (
          <button key={id} type="button" className={`vesh-rail-button ${activePanel === id ? "is-active" : ""}`} onClick={() => onPanelChange(activePanel === id && id !== "voice" ? "voice" : id)} aria-label={label} aria-pressed={activePanel === id} title={label}>
            <Icon size={21} weight={activePanel === id ? "fill" : "regular"} />
          </button>
        ))}
      </nav>

      {activePanel !== "voice" && (
        <div className="vesh-workspace-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onPanelChange("voice"); }}>
        <aside className="vesh-workspace-drawer" aria-label={`${nav.find((item) => item.id === activePanel)?.label ?? "Workspace"} panel`} onMouseDown={(event) => event.stopPropagation()}>
          <div className="vesh-drawer-heading">
            <div><span className="vesh-drawer-eyebrow">YOUR SPACE</span><h2>{nav.find((item) => item.id === activePanel)?.label}</h2></div>
            <button type="button" className="vesh-drawer-close" onClick={() => onPanelChange("voice")} aria-label="Close panel"><X size={18}/></button>
          </div>
          <div className={`vesh-panel-intro vesh-panel-intro--${activePanel}`}>
            <span className="vesh-panel-intro__mark" aria-hidden="true">
              {activePanel === "conversations" ? <ChatCircleText size={18}/> : activePanel === "tasks" ? <ListChecks size={18}/> : activePanel === "calendar" ? <CalendarBlank size={18}/> : <Notebook size={18}/>}
            </span>
            <div className="vesh-panel-intro__copy">
              <span className="vesh-panel-intro__kicker">
                {activePanel === "conversations" ? "THINK WITH VESH" : activePanel === "tasks" ? "MAKE PROGRESS" : activePanel === "calendar" ? "STAY IN SYNC" : "KEEP WHAT MATTERS"}
              </span>
              <p>
                {activePanel === "conversations"
                  ? "Pick up a thought, ask a question, or continue where you left off."
                  : activePanel === "tasks"
                    ? "Turn intentions into clear next steps. Your progress stays saved."
                    : activePanel === "calendar"
                      ? "Keep deadlines and important moments visible in one place."
                      : "Capture ideas now and return to them whenever you need."}
              </p>
            </div>
          </div>
          {error && <p className="vesh-drawer-error" role="alert">{error}</p>}
          {loading && <p className="vesh-drawer-muted">Loading your data…</p>}

          {activePanel === "conversations" && (
            <div className="vesh-mini-chat">
              <div className="vesh-mini-chat__toolbar"><span>QUICK CHAT</span><div><button type="button" onClick={() => { setMiniMessages([]); setMiniConversationId(null); setError(""); }}>New chat</button><Link href="/workspace/conversations">Full module ↗</Link></div></div>
              <div className="vesh-mini-chat__messages" aria-live="polite">{miniMessages.length === 0 ? <div className="vesh-mini-chat__empty"><ChatCircleText size={24}/><strong>Chat with VESH</strong><p>Ask a question or start a fresh conversation. Open the full module for saved-chat management.</p></div> : miniMessages.map((message, index) => <article className={`vesh-mini-chat__message is-${message.role}`} key={`${index}-${message.role}`}><span>{message.role === "user" ? "YOU" : "VESH"}</span><div className="vesh-mini-chat__formatted">{message.content ? <ReactMarkdown>{message.content.replace(/\\([*_`])/g, "$1").replace(/&#x20;/g, " ")}</ReactMarkdown> : (miniSending && message.role === "assistant" ? "Thinking…" : "")}</div></article>)}</div>
              <form className="vesh-mini-chat__form" onSubmit={sendMiniMessage}><textarea value={miniInput} onChange={(event) => setMiniInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Message VESH… (Enter to send · Shift+Enter for new line)" rows={2} maxLength={6000} disabled={miniSending}/><button className="vesh-drawer-action" type="submit" disabled={miniSending || !miniInput.trim()}>{miniSending ? "Sending…" : "Send"}</button></form>
            </div>
          )}

          {activePanel === "tasks" && (
            <>
              <div className="vesh-drawer-summary"><strong>{todaysTasks.length}</strong><span>open tasks for today</span><small>{tasks.filter((task) => task.status === "completed").length} completed overall</small></div>
              <div className="vesh-task-section-head"><div><span className="vesh-drawer-eyebrow">PLAN YOUR DAY</span><h3>Tasks for today</h3></div><button type="button" className="vesh-drawer-action" onClick={() => setTaskModalOpen(true)}><Plus size={16}/> New task</button></div>
              <div className="vesh-drawer-list">
                {todaysTasks.length === 0 && !loading ? <p className="vesh-drawer-muted">Your day is clear. Create a task to get started.</p> : todaysTasks.map((task) => (
                  <article className="vesh-task-item" key={task.id}>
                    <button type="button" className="vesh-task-complete" onClick={() => void updateTask(task, { status: "completed" })} aria-label={`Complete ${task.title}`}><CheckCircle size={19}/></button>
                    <div className="vesh-task-copy"><strong>{task.title}</strong><small>{task.due_at ? `Due ${new Date(task.due_at).toLocaleString()}` : "No due time"}{task.estimated_minutes ? ` · ${task.estimated_minutes} min estimate` : ""} · {task.priority}</small></div>
                    <button type="button" className="vesh-task-delete" onClick={() => void deleteTask(task)} aria-label={`Delete ${task.title}`}><Trash size={16}/></button>
                  </article>
                ))}
              </div>
              <div className="vesh-task-section-head vesh-task-section-head--secondary"><div><span className="vesh-drawer-eyebrow">DONE</span><h3>Completed</h3></div><span>{tasks.filter((task) => task.status === "completed").length}</span></div>
              <div className="vesh-drawer-list">{tasks.filter((task) => task.status === "completed").slice(0, 6).map((task) => <article className="vesh-task-item is-completed" key={task.id}><CheckCircle size={18}/><div className="vesh-task-copy"><strong>{task.title}</strong><small>Completed</small></div><button type="button" className="vesh-task-delete" onClick={() => void deleteTask(task)} aria-label={`Delete ${task.title}`}><Trash size={16}/></button></article>)}</div>
              <div className="vesh-task-section-head vesh-task-section-head--secondary"><div><span className="vesh-drawer-eyebrow">COMING UP</span><h3>Upcoming tasks</h3></div><span>{tasks.filter((task) => task.status !== "completed" && task.due_at && new Date(task.due_at).toDateString() !== today.toDateString()).length}</span></div>
              <div className="vesh-drawer-list">{tasks.filter((task) => task.status !== "completed" && task.due_at && new Date(task.due_at).toDateString() !== today.toDateString()).slice(0, 8).map((task) => <article className="vesh-task-item" key={task.id}><button type="button" className="vesh-task-complete" onClick={() => void updateTask(task, { status: "completed" })} aria-label={`Complete ${task.title}`}><CheckCircle size={19}/></button><div className="vesh-task-copy"><strong>{task.title}</strong><small>{new Date(task.due_at as string).toLocaleString()}{task.estimated_minutes ? ` · ${task.estimated_minutes} min estimate` : ""}</small></div><button type="button" className="vesh-task-delete" onClick={() => void deleteTask(task)} aria-label={`Delete ${task.title}`}><Trash size={16}/></button></article>)}</div>
              {taskModalOpen && <div className="vesh-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTaskModalOpen(false); }}><section className="vesh-task-modal" role="dialog" aria-modal="true" aria-labelledby="vesh-task-modal-title"><div className="vesh-drawer-heading"><div><span className="vesh-drawer-eyebrow">YOUR DAY</span><h2 id="vesh-task-modal-title">Create a task</h2></div><button type="button" className="vesh-drawer-close" onClick={() => setTaskModalOpen(false)} aria-label="Close task form"><X size={18}/></button></div><form className="vesh-quick-form" onSubmit={addTask}><label htmlFor="vesh-task-title">Task name</label><input id="vesh-task-title" autoFocus value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="What needs to get done?" maxLength={160} required/><label htmlFor="vesh-task-due">Due date and time</label><input id="vesh-task-due" type="datetime-local" value={taskDue} onChange={(event) => setTaskDue(event.target.value)}/><div className="vesh-form-row"><div><label htmlFor="vesh-task-minutes">Time estimate (optional, minutes)</label><input id="vesh-task-minutes" type="number" min="1" max="1440" placeholder="e.g. 30" value={taskMinutes} onChange={(event) => setTaskMinutes(event.target.value)}/></div><div><label htmlFor="vesh-task-priority">Priority</label><select id="vesh-task-priority" value={taskPriority} onChange={(event) => setTaskPriority(event.target.value as Task["priority"])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div></div><div className="vesh-modal-actions"><button type="button" className="vesh-modal-cancel" onClick={() => setTaskModalOpen(false)}>Cancel</button><button className="vesh-drawer-action" type="submit"><Plus size={16}/> Create task</button></div></form></section></div>}
            </>
          )}

          {activePanel === "notes" && (
            <>
              <div className="vesh-task-section-head">
                <div><span className="vesh-drawer-eyebrow">CAPTURE YOUR THOUGHTS</span><h3>{editingNote ? "Edit note" : "Quick notes"}</h3></div>
              </div>
              <form className="vesh-quick-form" onSubmit={saveNote}>
                <label htmlFor="vesh-rail-note-title">Title</label>
                <input id="vesh-rail-note-title" value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Note title" maxLength={160} />
                <label htmlFor="vesh-rail-note-content">Your note</label>
                <textarea id="vesh-rail-note-content" value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="Capture an idea, thought or reminder…" rows={5} maxLength={12000} required />
                <button className="vesh-drawer-action" type="submit"><Plus size={16}/>{editingNote ? "Save changes" : "Save note"}</button>
                {editingNote && <button className="vesh-drawer-muted" type="button" onClick={() => { setEditingNote(null); setNoteTitle(""); setNoteContent(""); }}>Cancel editing</button>}
              </form>
              <div className="vesh-task-section-head vesh-task-section-head--secondary"><div><span className="vesh-drawer-eyebrow">YOUR NOTES</span><h3>Saved notes</h3></div><span>{notes.length}</span></div>
              <div className="vesh-drawer-list">
                {notes.map((note) => (
                  <article className="vesh-task-item" key={note.id}>
                    <div className="vesh-task-copy">
                      <strong>{note.title || "Untitled note"}</strong>
                      <small>{note.content.slice(0, 150)}{note.content.length > 150 ? "…" : ""}</small>
                      <small>Updated {new Date(note.updated_at).toLocaleString()}</small>
                    </div>
                    <button type="button" className="vesh-task-delete" onClick={() => { setEditingNote(note.id); setNoteTitle(note.title); setNoteContent(note.content); }} aria-label={`Edit ${note.title}`}><PencilSimple size={15}/></button>
                    <button type="button" className="vesh-task-delete" onClick={() => void deleteNote(note)} aria-label={`Delete ${note.title}`}><Trash size={15}/></button>
                  </article>
                ))}
                {notes.length === 0 && !loading && <p className="vesh-drawer-muted">Nothing saved yet. Add a note above and it will also appear in your full Workspace.</p>}
              </div>
              <Link href="/workspace" className="vesh-drawer-action">Open full Workspace ↗</Link>
            </>
          )}

          {activePanel === "calendar" && (
            <>
              <div className="vesh-calendar-head"><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><CaretLeft/></button><strong>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><CaretRight/></button></div>
              <div className="vesh-calendar-grid" aria-label="Monthly calendar">
                {(["S","M","T","W","T","F","S"] as const).map((day, index) => <span className="vesh-calendar-weekday" key={`${day}-${index}`}>{day}</span>)}
                {Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const day = index + 1; const key = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const dayEvents = monthEvents.filter((event) => new Date(event.starts_at).toLocaleDateString() === new Date(month.getFullYear(), month.getMonth(), day).toLocaleDateString());
                  return <div className="vesh-calendar-cell" key={key}><button type="button" className={`vesh-calendar-day ${key === todayKey ? "is-today" : ""} ${dayEvents.length ? "has-event" : ""}`} aria-label={`${day}, ${dayEvents.length} calendar items`} onClick={() => { setEventDate(localInputValue(new Date(month.getFullYear(), month.getMonth(), day, 9))); setEditingEvent(null); setEventTitle(""); }}>{day}{dayEvents.length > 0 && <i/>}</button>{dayEvents.length > 0 && <div className="vesh-calendar-hover" role="group" aria-label={`Items on ${day}`}><strong>{new Date(month.getFullYear(), month.getMonth(), day).toLocaleDateString(undefined,{day:"numeric",month:"short"})}</strong>{dayEvents.map((item) => <div className="vesh-calendar-hover-item" key={item.id}><span>{item.title}</span><button type="button" onClick={() => editEvent(item)} aria-label={`Edit ${item.title}`}><PencilSimple size={13}/></button><button type="button" onClick={() => void removeEvent(item)} aria-label={`Delete ${item.title}`}><Trash size={13}/></button></div>)}</div>}</div>;
                })}
              </div>
              <form className="vesh-quick-form" onSubmit={saveEvent}>
                <label htmlFor="vesh-event-title">{editingEvent ? "Edit calendar item" : "Add deadline or event"}</label>
                <input id="vesh-event-title" value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="e.g. Project submission" maxLength={160} required />
                <input aria-label="Event date and time" type="datetime-local" value={eventDate} onChange={(event) => setEventDate(event.target.value)} required />
                <select aria-label="Event type" value={eventType} onChange={(event) => setEventType(event.target.value as CalendarEvent["event_type"])}><option value="deadline">Deadline</option><option value="objective">Objective</option><option value="event">Event</option></select>
                <button className="vesh-drawer-action" type="submit"><Plus size={16}/>{editingEvent ? "Save changes" : "Add to calendar"}</button>
              </form>
              <div className="vesh-drawer-list">
                {monthEvents.sort((a,b) => a.starts_at.localeCompare(b.starts_at)).map((event) => <article className="vesh-event-item" key={event.id}><div><strong>{event.title}</strong><small>{new Date(event.starts_at).toLocaleString()} · {event.event_type}</small></div><button type="button" onClick={() => editEvent(event)} aria-label={`Edit ${event.title}`}><PencilSimple size={16}/></button><button type="button" onClick={() => void removeEvent(event)} aria-label={`Delete ${event.title}`}><Trash size={16}/></button></article>)}
              </div>
            </>
          )}
        </aside>
        </div>
      )}
    </>
  );
}
