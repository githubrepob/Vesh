export type AssistantAction =
  | { kind: "create_task"; title: string; dueInMinutes: number | null }
  | { kind: "list_tasks" }
  | { kind: "update_task"; taskTitle: string; dueInMinutes?: number; dueAt?: string; status?: "todo" | "in_progress" | "completed" }
  | { kind: "rename_task"; oldTitle: string; newTitle: string }
  | { kind: "delete_task"; taskTitle: string }
  | { kind: "rename_project"; oldName: string; newName: string }
  | { kind: "list_projects" }
  | { kind: "ask_project_rename_name" }
  | { kind: "create_note"; title: string; content: string }
  | { kind: "ask_note_content" }
  | { kind: "list_notes" }
  | { kind: "create_event"; title: string; date: string; time: string | null }
;

function cleanPhrase(value: string): string {
  return value.trim().replace(/^['"“”]+|['"“”]+$/g, "").replace(/[.!?]+$/, "").trim();
}

function parseDuration(text: string): number | null {
  const match = text.match(/\b(?:due\s+in|in|within|after|with\s+(?:the\s+)?due\s+time(?:\s+of)?)\s*(\d{1,4})\s*(minutes?|mins?|hours?|hrs?)\b/i)
    ?? text.match(/\bdue\s+(\d{1,4})\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const minutes = /^h/i.test(match[2]) ? amount * 60 : amount;
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 10080 ? minutes : null;
}

function parseCalendarDate(value: string): string | null {
  const text = value.toLowerCase().replace(/\b(the|date)\b/g, "").trim();
  const timeZone = process.env.VESH_TIME_ZONE || "Asia/Kolkata";
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const currentYear = Number(parts.find((part) => part.type === "year")?.value);
  const currentMonth = Number(parts.find((part) => part.type === "month")?.value);
  const currentDay = Number(parts.find((part) => part.type === "day")?.value);
  const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const monthIndex = months.findIndex((month) => text.includes(month) || text.includes(month.slice(0, 3)));
  const dayMatch = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (monthIndex >= 0 && dayMatch) {
    const day = Number(dayMatch[1]);
    const yearMatch = text.match(/\b(20\d{2})\b/);
    let year = yearMatch ? Number(yearMatch[1]) : currentYear;
    const candidate = new Date(Date.UTC(year, monthIndex, day));
    if (candidate.getUTCMonth() !== monthIndex || candidate.getUTCDate() !== day) return null;
    if (!yearMatch && candidate.getTime() < Date.UTC(currentYear, currentMonth - 1, currentDay)) year += 1;
    return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`);
    if (date.getUTCFullYear() !== Number(iso[1]) || date.getUTCMonth() + 1 !== Number(iso[2]) || date.getUTCDate() !== Number(iso[3])) return null;
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  if (/\btomorrow\b/i.test(text)) {
    const d = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay + 1)); return d.toISOString().slice(0, 10);
  }
  if (/\btoday\b/i.test(text)) return `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`;
  return null;
}

export function detectAssistantAction(message: string): AssistantAction | null {
  const text = message.trim();
  if (!text) return null;

  if (/\b(show|list|display|what are|what|find|check)\b/i.test(text) && /\b(my\s+)?(tasks|to[- ]?dos)\b/i.test(text)) return { kind: "list_tasks" };
  if (/\b(show|list|display|find|read|what are|what)\b/i.test(text) && /\b(my\s+)?(notes|saved notes)\b/i.test(text)) return { kind: "list_notes" };
  if (/\b(rename|rename it|change the name)\b/i.test(text) && /\b(project|project memory|memory)\b/i.test(text) && !/\bto\s+\S+/i.test(text)) return { kind: "ask_project_rename_name" };
  if (/\b(what|which|show|list|find|check|tell me)\b/i.test(text) && /\b(my\s+)?(projects|project names)\b/i.test(text)) return { kind: "list_projects" };
  if (/\b(another|other)\s+project\b/i.test(text) && /\b(check|show|tell|find|what)\b/i.test(text)) return { kind: "list_projects" };

  const earlyTaskRename = text.match(/\b(?:rename|retitle)\s+(?:the\s+)?task\s+(.+?)\s+to\s+(.+?)[.!?]?$/i)
    ?? text.match(/\bchange\s+task\s+title\s+from\s+(.+?)\s+to\s+(.+?)[.!?]?$/i);
  if (earlyTaskRename) {
    const oldTitle = cleanPhrase(earlyTaskRename[1]); const newTitle = cleanPhrase(earlyTaskRename[2]);
    if (oldTitle && newTitle) return { kind: "rename_task", oldTitle, newTitle };
  }

  const renamePatterns = [
    /\b(?:please\s+)?rename\s+(?:my\s+)?(?:project\s+)?["“]?(.+?)["”]?\s+to\s+["“]?(.+?)["”]?[.!]?$/i,
    /\b(?:please\s+)?change\s+(?:the\s+)?(?:name|project name)\s+(?:of\s+)?["“]?(.+?)["”]?\s+to\s+["“]?(.+?)["”]?[.!]?$/i,
    /\b(?:please\s+)?change\s+my\s+project\s+name\s+from\s+["“]?(.+?)["”]?\s+to\s+["“]?(.+?)["”]?[.!]?$/i,
  ];
  for (const pattern of renamePatterns) {
    const match = text.match(pattern);
    if (match) {
      const oldName = cleanPhrase(match[1]); const newName = cleanPhrase(match[2]);
      if (oldName && newName && oldName.toLowerCase() !== newName.toLowerCase()) return { kind: "rename_project", oldName, newName };
    }
  }

  // Task status and due-date changes. Resolve by exact title in the authenticated user's task list.
  const renameTaskMatch = text.match(/\b(?:rename|retitle|change the title of|change the name of)\s+(?:the\s+)?task\s+(.+?)\s+to\s+(.+?)[.!?]?$/i)
    ?? text.match(/\bchange\s+task\s+title\s+from\s+(.+?)\s+to\s+(.+?)[.!?]?$/i);
  if (renameTaskMatch) {
    const oldTitle = cleanPhrase(renameTaskMatch[1]); const newTitle = cleanPhrase(renameTaskMatch[2]);
    if (oldTitle && newTitle) return { kind: "rename_task", oldTitle, newTitle };
  }

  const statusMatch = text.match(/\b(?:mark|set)\s+(?:the\s+)?task\s+(.+?)\s+(?:as\s+)?(complete|completed|done|in progress|to do|todo)\b/i);
  if (statusMatch) {
    const status = /complete|done/i.test(statusMatch[2]) ? "completed" : /progress/i.test(statusMatch[2]) ? "in_progress" : "todo";
    return { kind: "update_task", taskTitle: cleanPhrase(statusMatch[1]), status };
  }
  const deleteTaskMatch = text.match(/\b(?:delete|remove)\s+(?:the\s+)?task\s+(.+?)[.!?]?$/i);
  if (deleteTaskMatch) return { kind: "delete_task", taskTitle: cleanPhrase(deleteTaskMatch[1]) };
  const dueTaskMatch = text.match(/\b(?:change|update|set)\s+(?:the\s+)?(?:due date|deadline|due time)\s+(?:of|for)\s+(?:the\s+)?task\s+(.+?)\s+to\s+(.+)$/i)
    ?? text.match(/\b(?:change|update|set)\s+(?:the\s+)?task\s+(.+?)\s+(?:due date|deadline|due time)\s+(?:to|for)\s+(.+)$/i)
    ?? text.match(/\bset\s+(?:the\s+)?task\s+(.+?)\s+due\s+(?:in\s+)?(\d{1,4})\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (dueTaskMatch) {
    if (/^\d+$/.test(dueTaskMatch[2])) {
      const minutes = /^h/i.test(dueTaskMatch[3]) ? Number(dueTaskMatch[2]) * 60 : Number(dueTaskMatch[2]);
      if (minutes > 0 && minutes <= 10080) return { kind: "update_task", taskTitle: cleanPhrase(dueTaskMatch[1]), dueInMinutes: minutes };
    }
    const duration = parseDuration(dueTaskMatch[2]);
    if (duration) return { kind: "update_task", taskTitle: cleanPhrase(dueTaskMatch[1]), dueInMinutes: duration };
    const date = parseCalendarDate(dueTaskMatch[2]);
    if (date) {
      const dueTime = dueTaskMatch[2].match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
      let hour = dueTime ? Number(dueTime[1]) : 23;
      const minute = dueTime ? Number(dueTime[2] ?? "00") : 59;
      if (dueTime && dueTime[3].toLowerCase() === "pm" && hour !== 12) hour += 12;
      if (dueTime && dueTime[3].toLowerCase() === "am" && hour === 12) hour = 0;
      if (hour > 23 || minute > 59) return null;
      return { kind: "update_task", taskTitle: cleanPhrase(dueTaskMatch[1]), dueAt: `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30` };
    }
  }

  const eventIntent = /\b(set|create|add|schedule|put)\b/i.test(text) && /\b(event|appointment|calendar)\b/i.test(text);
  if (eventIntent) {
    const dateMatch = text.match(/\b(?:on|for)\s+(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+20\d{2})?|20\d{2}-\d{2}-\d{2}|tomorrow|today)\b/i);
    const date = dateMatch ? parseCalendarDate(dateMatch[1]) : null;
    if (date) {
      const titleMatch = text.match(/\bname\s+of\s+(?:the\s+)?event\s+is\s+(.+?)(?:[.!?]|$)/i)
        ?? text.match(/\b(?:called|named|titled)\s+(.+?)(?:[.!?]|$)/i);
      const title = titleMatch ? cleanPhrase(titleMatch[1]) : "Event";
      const timeMatch = text.match(/\b(?:at|around)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
      const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2] ?? "00"} ${timeMatch[3].toUpperCase()}` : null;
      return { kind: "create_event", title, date, time };
    }
  }

  // Note request without content should ask a follow-up rather than fabricate a note.
  if (/\b(note|notes)\b/i.test(text) && /\b(add|create|save|write|make|put)\b/i.test(text)) {
    const noteMatch = text.match(/\b(?:note\s+(?:called|titled|named)\s+(.+?))?(?:\s*:\s*|\s+about\s+|\s+that\s+)(.+)$/i);
    if (noteMatch?.[2]) {
      const content = cleanPhrase(noteMatch[2]); const title = cleanPhrase(noteMatch[1] || content.slice(0, 70));
      if (content) return { kind: "create_note", title: title || "Quick note", content };
    }
    return { kind: "ask_note_content" };
  }

  const duration = parseDuration(text);
  const createTaskIntent = /\b(create|add|make|schedule|set)\b/i.test(text) && /\b(task|todo|to-do)\b/i.test(text);
  if (createTaskIntent) {
    let title = text
      .replace(/^.*?\b(?:create|add|make|schedule|set)\s+(?:a\s+)?(?:new\s+)?(?:task|todo|to-do)\s*/i, "")
      .replace(/^\s*(?:for|to|called|named)\s+/i, "")
      .replace(/^\s*(?:of\s+)?(?:the\s+)?(?:name|title)\s+(?:of\s+)?(?:the\s+)?(?:task\s+)?(?:is\s+)?/i, "")
      .replace(/\b(?:with\s+)?(?:the\s+)?(?:due\s+)?(?:time|date|deadline)\s+(?:of\s+)?\d{1,4}\s*(?:minutes?|mins?|hours?|hrs?)\b/i, "")
      .replace(/\b(?:due\s+)?(?:in|within|after)\s+\d{1,4}\s*(?:minutes?|mins?|hours?|hrs?)\b/i, "")
      .replace(/\b(?:with\s+)?(?:a\s+)?(?:deadline|due date)\b/i, "")
      .replace(/[.!?]+$/, "").trim();
    const nameMatch = title.match(/^(?:the\s+)?(?:name|title)\s+of\s+(?:the\s+)?task\s+is\s+(.+)$/i);
    if (nameMatch) title = nameMatch[1];
    title = cleanPhrase(title.replace(/\s+/g, " "));
    if (!title || /^(?:here|please|now)$/i.test(title)) return null;
    return { kind: "create_task", title: title.slice(0, 160), dueInMinutes: duration };
  }
  return null;
}
