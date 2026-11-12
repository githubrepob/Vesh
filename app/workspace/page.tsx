"use client";

import Link from "next/link";
import AccountMenu from "@/components/AccountMenu";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { SquaresFour, Notebook, CheckSquare, CalendarBlank, ChatCircleText, Brain, CornersIn, CornersOut, ArrowLeft } from "@phosphor-icons/react";

type Note = { id: string; title: string; content: string; pinned: boolean; created_at: string; updated_at: string };
type Task = { id: string; title: string; description: string; status: "todo" | "in_progress" | "completed"; priority: "low" | "medium" | "high"; scheduled_at: string | null; due_at: string | null; estimated_minutes: number | null; created_at: string };
type EventItem = { id: string; title: string; description: string; event_type: "deadline" | "objective" | "event"; starts_at: string; ends_at: string | null };
type Conversation = { id: string; title: string; created_at: string; updated_at: string };
type Section = "overview" | "notes" | "tasks" | "calendar" | "conversations" | "memory";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
function dateLabel(value: string | null) { return value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "No date set"; }
function localInput(value?: string | null) { const date = value ? new Date(value) : new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

export default function WorkspacePage() {
  const [section, setSection] = useState<Section>("overview");
  const [isWorkspaceFullscreen, setIsWorkspaceFullscreen] = useState(false);
  const workspaceRootRef = useRef<HTMLElement | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskScheduled, setTaskScheduled] = useState("");
  const [taskMinutes, setTaskMinutes] = useState("");
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("medium");
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(localInput());
  const [eventType, setEventType] = useState<EventItem["event_type"]>("deadline");
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const loadAll = useCallback(async () => {
    try {
      const [n, t, e, c] = await Promise.all([
        request<{ notes: Note[] }>("/api/productivity?kind=notes"),
        request<{ tasks: Task[] }>("/api/productivity?kind=tasks"),
        request<{ events: EventItem[] }>("/api/productivity?kind=events"),
        request<{ conversations: Conversation[] }>("/api/conversations"),
      ]);
      setError("");
      setNotes(n.notes ?? []); setTasks(t.tasks ?? []); setEvents(e.events ?? []); setConversations(c.conversations ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load your workspace."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadAll();
    }, 0);

    const refresh = () => {
      if (document.visibilityState === "visible") void loadAll();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadAll]);
  useEffect(() => { const syncFullscreen = () => setIsWorkspaceFullscreen(document.fullscreenElement === workspaceRootRef.current); document.addEventListener("fullscreenchange", syncFullscreen); return () => document.removeEventListener("fullscreenchange", syncFullscreen); }, []);
  const toggleWorkspaceFullscreen = useCallback(async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await workspaceRootRef.current?.requestFullscreen(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Fullscreen is not available in this browser."); } }, []);

  const openTasks = useMemo(() => tasks.filter((task) => task.status !== "completed"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "completed"), [tasks]);
  const todayTasks = useMemo(() => openTasks.filter((task) => { const d = task.scheduled_at || task.due_at; return d && new Date(d).toDateString() === new Date().toDateString(); }), [openTasks]);
  const overdueTasks = useMemo(() => openTasks.filter((task) => task.due_at && new Date(task.due_at).getTime() < Date.now() && new Date(task.due_at).toDateString() !== new Date().toDateString()), [openTasks]);
  const upcomingTasks = useMemo(() => openTasks.filter((task) => !todayTasks.some((t) => t.id === task.id) && !overdueTasks.some((t) => t.id === task.id)), [openTasks, todayTasks, overdueTasks]);
  const filteredNotes = useMemo(() => notes.filter((note) => `${note.title} ${note.content}`.toLowerCase().includes(search.toLowerCase())), [notes, search]);
  const monthEvents = useMemo(() => events.filter((event) => { const d = new Date(event.starts_at); return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth(); }), [events, month]);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();

  async function saveNote(event: FormEvent) {
    event.preventDefault(); if (!noteContent.trim()) return;
    try {
      if (editingNote) {
        const result = await request<{ note: Note }>("/api/productivity?kind=notes", { method: "PATCH", body: JSON.stringify({ id: editingNote, title: noteTitle.trim() || "Untitled note", content: noteContent.trim() }) });
        setNotes((items) => items.map((item) => item.id === editingNote ? result.note : item));
      } else {
        const result = await request<{ note: Note }>("/api/productivity?kind=notes", { method: "POST", body: JSON.stringify({ title: noteTitle.trim() || "Untitled note", content: noteContent.trim() }) });
        setNotes((items) => [result.note, ...items]);
      }
      resetNote(); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save note."); }
  }
  function resetNote() { setEditingNote(null); setNoteTitle(""); setNoteContent(""); }
  function editNote(note: Note) { setEditingNote(note.id); setNoteTitle(note.title); setNoteContent(note.content); setSection("notes"); }
  async function deleteNote(note: Note) { if (!window.confirm(`Delete “${note.title}”?`)) return; try { await request(`/api/productivity?kind=notes&id=${note.id}`, { method: "DELETE" }); setNotes((items) => items.filter((item) => item.id !== note.id)); if (editingNote === note.id) resetNote(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete note."); } }
  async function togglePin(note: Note) { try { const result = await request<{ note: Note }>("/api/productivity?kind=notes", { method: "PATCH", body: JSON.stringify({ id: note.id, pinned: !note.pinned }) }); setNotes((items) => items.map((item) => item.id === note.id ? result.note : item)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update note."); } }

  async function saveTask(event: FormEvent) {
    event.preventDefault(); if (!taskTitle.trim()) return;
    const payload = { title: taskTitle.trim(), due_at: taskDue ? new Date(taskDue).toISOString() : null, scheduled_at: taskScheduled ? new Date(taskScheduled).toISOString() : null, estimated_minutes: taskMinutes.trim() ? Number(taskMinutes) : null, priority: taskPriority };
    try {
      if (editingTask) { const result = await request<{ task: Task }>("/api/productivity?kind=tasks", { method: "PATCH", body: JSON.stringify({ id: editingTask, ...payload }) }); setTasks((items) => items.map((item) => item.id === editingTask ? result.task : item)); }
      else { const result = await request<{ task: Task }>("/api/productivity?kind=tasks", { method: "POST", body: JSON.stringify(payload) }); setTasks((items) => [result.task, ...items]); }
      resetTask(); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save task."); }
  }
  function resetTask() { setEditingTask(null); setTaskTitle(""); setTaskDue(""); setTaskScheduled(""); setTaskMinutes(""); setTaskPriority("medium"); }
  function editTask(task: Task) { setEditingTask(task.id); setTaskTitle(task.title); setTaskDue(task.due_at ? localInput(task.due_at) : ""); setTaskScheduled(task.scheduled_at ? localInput(task.scheduled_at) : ""); setTaskMinutes(String(task.estimated_minutes ?? 30)); setTaskPriority(task.priority); setSection("tasks"); }
  async function updateTask(task: Task, patch: Partial<Task>) { try { const result = await request<{ task: Task }>("/api/productivity?kind=tasks", { method: "PATCH", body: JSON.stringify({ id: task.id, ...patch }) }); setTasks((items) => items.map((item) => item.id === task.id ? result.task : item)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update task."); } }
  async function deleteTask(task: Task) { if (!window.confirm(`Delete “${task.title}”?`)) return; try { await request(`/api/productivity?kind=tasks&id=${task.id}`, { method: "DELETE" }); setTasks((items) => items.filter((item) => item.id !== task.id)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete task."); } }

  async function saveEvent(event: FormEvent) { event.preventDefault(); if (!eventTitle.trim() || !eventDate) return; const payload = { title: eventTitle.trim(), starts_at: new Date(eventDate).toISOString(), event_type: eventType }; try { if (editingEvent) { const result = await request<{ event: EventItem }>("/api/productivity?kind=events", { method: "PATCH", body: JSON.stringify({ id: editingEvent, ...payload }) }); setEvents((items) => items.map((item) => item.id === editingEvent ? result.event : item)); } else { const result = await request<{ event: EventItem }>("/api/productivity?kind=events", { method: "POST", body: JSON.stringify(payload) }); setEvents((items) => [result.event, ...items]); } resetEvent(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save calendar item."); } }
  function resetEvent() { setEditingEvent(null); setEventTitle(""); setEventDate(localInput()); setEventType("deadline"); }
  function editEvent(item: EventItem) { setEditingEvent(item.id); setEventTitle(item.title); setEventDate(localInput(item.starts_at)); setEventType(item.event_type); }
  async function deleteEvent(item: EventItem) { if (!window.confirm(`Delete “${item.title}”?`)) return; try { await request(`/api/productivity?kind=events&id=${item.id}`, { method: "DELETE" }); setEvents((items) => items.filter((event) => event.id !== item.id)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete calendar item."); } }

  const nav = [
    { id: "overview" as const, label: "Overview", Icon: SquaresFour },
    { id: "notes" as const, label: "Notes", Icon: Notebook },
    { id: "tasks" as const, label: "Tasks", Icon: CheckSquare },
    { id: "calendar" as const, label: "Calendar", Icon: CalendarBlank },
    { id: "conversations" as const, label: "Conversations", Icon: ChatCircleText },
    { id: "memory" as const, label: "Memory", Icon: Brain },
  ];

  return (
    <main ref={workspaceRootRef} className={`vesh-app workspace-app${isWorkspaceFullscreen ? " is-fullscreen" : ""}`} data-theme="dark">
      <div className="environment" aria-hidden="true"><div className="environment__glow environment__glow--one"/><div className="environment__glow environment__glow--two"/><div className="environment__grid"/></div>
      <header className="topbar workspace-topbar"><Link className="brand" href="/"><span className="brand__mark"><span/><span/><span/></span><span className="brand__name">VESH</span><span className="brand__divider"/><span className="brand__descriptor">WORKSPACE</span></Link><div className="workspace-topbar-actions"><button type="button" className="workspace-fullscreen-button" onClick={() => void toggleWorkspaceFullscreen()} aria-label={isWorkspaceFullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={isWorkspaceFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}>{isWorkspaceFullscreen ? <><CornersIn size={16} weight="regular" /> Exit fullscreen</> : <><CornersOut size={16} weight="regular" /> Fullscreen</>}</button><Link className="workspace-link" href="/"><ArrowLeft size={15} weight="regular" /> Return to VESH</Link><AccountMenu mobileNavigation showEnvironmentLink={false} showWorkspaceLink={false} showStreak homeLinkLabel="Return to VESH" homeLinkHref="/" onFullscreen={toggleWorkspaceFullscreen} isFullscreen={isWorkspaceFullscreen} /></div></header>
      <div className="workspace-shell">
        <aside className="workspace-sidebar"><p className="eyebrow">YOUR SPACE</p><h1>Workspace</h1><p className="workspace-intro">A calm place to keep track of what matters.</p><nav className="workspace-nav" aria-label="Workspace sections">{nav.map((item) => <button key={item.id} className={section === item.id ? "is-active" : ""} onClick={() => setSection(item.id)}><span className="workspace-nav-icon"><item.Icon size={18} weight="regular" aria-hidden="true" /></span>{item.label}{item.id === "tasks" && openTasks.length > 0 && <small>{openTasks.length}</small>}</button>)}</nav><div className="workspace-storage-note"><span className="storage-dot"/> Synced to your account<br/><small>Available across your signed-in devices</small></div></aside>
        <section className="workspace-content">
          {error && (/authentication required|unauthorized|sign in/i.test(error) ? (
            <div className="workspace-error workspace-auth-error" role="alert">
              <span>Your account is needed to sync Workspace.</span>
              <Link href="/login">Sign in</Link>
              <Link href="/signup">Create account</Link>
            </div>
          ) : <p className="workspace-error" role="alert">{error}</p>)}{loading && <p className="workspace-empty">Syncing your workspace…</p>}
          {section === "overview" && <><div className="workspace-heading"><div><p className="eyebrow">YOUR PERSONAL SPACE</p><h2>Good to have you here.</h2><p>Pick up where you left off.</p></div></div><div className="workspace-stats"><button onClick={() => setSection("notes")}><span className="stat-label">NOTES</span><strong>{notes.length}</strong><span className="stat-foot">Ideas worth keeping ↗</span></button><button onClick={() => setSection("tasks")}><span className="stat-label">OPEN TASKS</span><strong>{openTasks.length}</strong><span className="stat-foot">Things to follow through ↗</span></button><button onClick={() => setSection("tasks")}><span className="stat-label">COMPLETED</span><strong>{completedTasks.length}</strong><span className="stat-foot">Progress made ↗</span></button></div><div className="workspace-columns"><div className="workspace-panel"><div className="panel-heading"><div><p className="eyebrow">RECENT</p><h3>Notes</h3></div><button onClick={() => setSection("notes")}>View all ↗</button></div>{notes.slice(0, 3).map((note) => <button className="workspace-list-item" key={note.id} onClick={() => editNote(note)}><span><strong>{note.title}</strong><small>{note.content.slice(0, 90)}</small></span><time>{new Date(note.updated_at).toLocaleDateString()}</time></button>)}{notes.length === 0 && <p className="workspace-empty">Nothing saved yet. Capture an idea before it slips away.</p>}</div><div className="workspace-panel"><div className="panel-heading"><div><p className="eyebrow">UP NEXT</p><h3>Tasks</h3></div><button onClick={() => setSection("tasks")}>View all ↗</button></div>{openTasks.slice(0, 4).map((task) => <div className="workspace-task-row" key={task.id}><input type="checkbox" checked={false} onChange={() => void updateTask(task, { status: "completed" })}/><span>{task.title}</span><time>{dateLabel(task.due_at)}</time></div>)}{openTasks.length === 0 && <p className="workspace-empty">No open tasks. A little breathing room.</p>}</div></div><div className="workspace-columns"><div className="workspace-panel"><div className="panel-heading"><h3>Upcoming calendar</h3><button onClick={() => setSection("calendar")}>View calendar ↗</button></div>{events.slice(0, 3).map((item) => <div className="workspace-list-item" key={item.id}><span><strong>{item.title}</strong><small>{item.event_type}</small></span><time>{dateLabel(item.starts_at)}</time></div>)}</div><div className="workspace-panel"><div className="panel-heading"><h3>Recent conversations</h3><button onClick={() => setSection("conversations")}>View all ↗</button></div>{conversations.slice(0, 3).map((item) => <Link className="workspace-list-item" href={`/workspace/conversations?conversation=${item.id}`} key={item.id}><span><strong>{item.title || "New conversation"}</strong><small>Continue conversation</small></span><time>{new Date(item.updated_at).toLocaleDateString()}</time></Link>)}</div></div></>}
          {section === "notes" && <><div className="workspace-heading"><div><p className="eyebrow">PERSONAL KNOWLEDGE</p><h2>Notes & ideas</h2><p>Save thoughts here or ask VESH to remember them while you work.</p></div></div><form className="workspace-form" onSubmit={saveNote}><input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Give this note a title" aria-label="Note title"/><textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Write something worth remembering…" rows={5} aria-label="Note content"/><div className="form-actions"><span>{editingNote ? "Editing saved note" : "Saved to your account"}</span><div>{editingNote && <button type="button" className="button-quiet" onClick={resetNote}>Cancel</button>}<button className="button-primary" type="submit" disabled={!noteContent.trim()}>{editingNote ? "Save changes" : "Save note"}</button></div></div></form><div className="workspace-list-heading"><h3>All notes <span>{notes.length}</span></h3><input className="workspace-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes" aria-label="Search notes"/></div><div className="note-grid">{filteredNotes.map((note) => <article className="note-card" key={note.id}><button className="note-card-main" onClick={() => editNote(note)}><strong>{note.title}</strong><p>{note.content}</p><time>Updated {new Date(note.updated_at).toLocaleString()}</time></button><div className="note-card-actions"><button className="delete-button" onClick={() => void togglePin(note)}>{note.pinned ? "Unpin" : "Pin"}</button><button className="delete-button" onClick={() => void deleteNote(note)}>Delete</button></div></article>)}{filteredNotes.length === 0 && <p className="workspace-empty">{notes.length ? "No notes match your search." : "Your notes will appear here after you save the first one."}</p>}</div></>}
          {section === "tasks" && <><div className="workspace-heading"><div><p className="eyebrow">FOLLOW THROUGH</p><h2>Tasks & daily plan</h2><p>Plan the day, schedule time and track your progress.</p></div></div><form className="task-create-form workspace-task-form" onSubmit={saveTask}><input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="What needs to get done?" aria-label="Task title" required/><label>Start <input type="datetime-local" value={taskScheduled} onChange={(e) => setTaskScheduled(e.target.value)}/></label><label>Due <input type="datetime-local" value={taskDue} onChange={(e) => setTaskDue(e.target.value)}/></label><label>Estimate (optional) <input type="number" min="1" max="1440" value={taskMinutes} placeholder="e.g. 30" onChange={(e) => setTaskMinutes(e.target.value)}/></label><select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as Task["priority"])}><option value="low">Low priority</option><option value="medium">Normal priority</option><option value="high">High priority</option></select><button className="button-primary" type="submit" disabled={!taskTitle.trim()}>{editingTask ? "Save task" : "Add task"}</button>{editingTask && <button type="button" className="button-quiet" onClick={resetTask}>Cancel</button>}</form><div className="task-groups">{[{ title: "Today", label: "TODAY'S PLAN", items: todayTasks }, { title: "Overdue", label: "NEEDS ATTENTION", items: overdueTasks }, { title: "Upcoming / Unscheduled", label: "UP NEXT", items: upcomingTasks }, { title: "Completed", label: "DONE", items: completedTasks }].map((group) => <div className="workspace-panel" key={group.title}><div className="panel-heading"><div><p className="eyebrow">{group.label}</p><h3>{group.title} <span>{group.items.length}</span></h3></div></div>{group.items.map((task) => <div className={`task-item ${task.status === "completed" ? "task-item--done" : ""}`} key={task.id}><label><input type="checkbox" checked={task.status === "completed"} onChange={() => void updateTask(task, { status: task.status === "completed" ? "todo" : "completed" })}/><span>{task.title}</span></label><div><small>{task.priority}{task.estimated_minutes ? ` · ${task.estimated_minutes} min estimate` : ""} · {dateLabel(task.due_at)}</small>{task.status !== "completed" && <button className="delete-button" onClick={() => editTask(task)}>Edit</button>}<button className="delete-button" onClick={() => void deleteTask(task)}>Delete</button></div></div>)}{group.items.length === 0 && <p className="workspace-empty">{group.title === "Today" ? "No tasks scheduled for today." : group.title === "Overdue" ? "Nothing overdue. Nice work." : group.title === "Completed" ? "Completed tasks will collect here." : "No upcoming tasks."}</p>}</div>)}</div></>}
          {section === "calendar" && <><div className="workspace-heading"><div><p className="eyebrow">TIME & MILESTONES</p><h2>Calendar</h2><p>Deadlines, objectives and events in one place.</p></div></div><div className="workspace-calendar"><div className="vesh-calendar-head"><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><strong>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button><button type="button" className="calendar-today-button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button></div><div className="workspace-calendar-grid">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <span key={d}>{d}</span>)}{Array.from({length:firstWeekday},(_,i)=><i key={`blank-${i}`}/>)}{Array.from({length:daysInMonth},(_,i)=>{const day=i+1;const key=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;const matches=monthEvents.filter((e)=>{const date=new Date(e.starts_at);return date.getFullYear()===month.getFullYear()&&date.getMonth()===month.getMonth()&&date.getDate()===day;});const isToday=day===new Date().getDate()&&month.getMonth()===new Date().getMonth()&&month.getFullYear()===new Date().getFullYear();return <button type="button" key={key} className={`${matches.length?"has-items":""}${isToday?" is-today":""}`} aria-label={`${month.toLocaleDateString(undefined,{month:"long"})} ${day}${matches.length?`, ${matches.length} calendar item${matches.length===1?"":"s"}`:""}`} onClick={()=>{setEventDate(localInput(new Date(month.getFullYear(),month.getMonth(),day,9).toISOString()));setEditingEvent(null);}}><strong>{day}</strong>{matches.slice(0,2).map((e)=><small key={e.id}>{e.title}</small>)}{matches.length>2&&<small>+{matches.length-2} more</small>}</button>;})}</div></div><form className="workspace-form" onSubmit={saveEvent}><h3>{editingEvent ? "Edit calendar item" : "Add calendar item"}</h3><input value={eventTitle} onChange={(e)=>setEventTitle(e.target.value)} placeholder="Title" required/><div className="workspace-inline-fields"><input type="datetime-local" value={eventDate} onChange={(e)=>setEventDate(e.target.value)} required/><select value={eventType} onChange={(e)=>setEventType(e.target.value as EventItem["event_type"])}><option value="deadline">Deadline</option><option value="objective">Objective</option><option value="event">Event</option></select></div><div className="form-actions"><span>Synced with Interactive Mode</span><div>{editingEvent && <button type="button" className="button-quiet" onClick={resetEvent}>Cancel</button>}<button className="button-primary" type="submit">{editingEvent ? "Save changes" : "Add to calendar"}</button></div></div></form><div className="workspace-panel">{monthEvents.map((item)=><div className="task-item" key={item.id}><span>{item.title} · {item.event_type} · {dateLabel(item.starts_at)}</span><div><button className="delete-button" onClick={()=>editEvent(item)}>Edit</button><button className="delete-button" onClick={()=>void deleteEvent(item)}>Delete</button></div></div>)}</div></>}
          {section === "conversations" && <><div className="workspace-heading"><div><p className="eyebrow">YOUR HISTORY</p><h2>Conversations</h2><p>Continue a saved chat or start a new one.</p></div></div><div className="workspace-panel"><div className="panel-heading"><h3>Recent conversations</h3><Link className="button-primary" href="/workspace/conversations">Open full chat module</Link></div>{conversations.map((item)=><Link className="workspace-list-item" href={`/workspace/conversations?conversation=${item.id}`} key={item.id}><span><strong>{item.title || "New conversation"}</strong><small>Updated {new Date(item.updated_at).toLocaleString()}</small></span><span>↗</span></Link>)}{conversations.length===0&&<p className="workspace-empty">No saved conversations yet. Start one from VESH.</p>}</div></>}
          {section === "memory" && <><div className="workspace-heading"><div><p className="eyebrow">PERSONAL CONTEXT</p><h2>Memory</h2><p>Review the context VESH uses to make conversations more useful.</p></div></div><div className="workspace-panel"><p className="workspace-empty">Memory management is available in the dedicated module.</p><Link className="button-primary" href="/workspace/memory">Open memory management</Link></div></>}
          <p className="workspace-footnote">VESH WORKSPACE <span>·</span> Your notes, tasks and calendar are stored in your account and shared with Interactive Mode.</p>
        </section>
      </div>
    </main>
  );
}
