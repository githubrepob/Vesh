"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import AssistantMessage from "./AssistantMessage";
import AccountMenu from "@/components/AccountMenu";

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

type StreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

async function readError(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: string;
    };

    return body.error || `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

function makeMessageId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Each conversation has its own independent transcript.
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, Message[]>
  >({});

  const [draft, setDraft] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const activeIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Record<string, Message[]>>({});
  const loadRequestRef = useRef(0);

  const invalidatePendingRequests = useCallback(() => {
    loadRequestRef.current += 1;
  }, []);
  const sendingRef = useRef(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeMessages = useMemo(
    () => (activeId ? messagesByConversation[activeId] ?? [] : []),
    [activeId, messagesByConversation],
  );

  // Keep refs synchronized with React state.
  function updateMessages(
    conversationId: string,
    updater: (current: Message[]) => Message[],
  ) {
    const current = messagesRef.current[conversationId] ?? [];
    const updated = updater(current);

    messagesRef.current = {
      ...messagesRef.current,
      [conversationId]: updated,
    };

    setMessagesByConversation((previous) => ({
      ...previous,
      [conversationId]: updated,
    }));
  }

  function selectActiveConversation(id: string | null) {
    activeIdRef.current = id;
    setActiveId(id);
  }

  const loadConversations = useCallback(async () => {
    const response = await fetch("/api/conversations", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const data = (await response.json()) as {
      conversations: Conversation[];
    };

    setConversations(data.conversations ?? []);

    return data.conversations ?? [];
  }, []);

  const openConversation = useCallback(async (id: string) => {
    const requestId = ++loadRequestRef.current;

    selectActiveConversation(id);
    setError("");

    // Use the existing cached transcript while refreshing it.
    const response = await fetch(`/api/conversations/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const data = (await response.json()) as {
      conversation: Conversation;
      messages: Message[];
    };

    // A newer selection was made while this request was running.
    if (requestId !== loadRequestRef.current) {
      return;
    }

    const loadedMessages = data.messages ?? [];

    messagesRef.current = {
      ...messagesRef.current,
      [id]: loadedMessages,
    };

    setMessagesByConversation((previous) => ({
      ...previous,
      [id]: loadedMessages,
    }));

    setConversations((previous) =>
      previous.map((item) => (item.id === id ? data.conversation : item)),
    );
  }, []);

  // Load conversation history once when the page opens.
  useEffect(() => {
    let alive = true;

    async function initialize() {
      try {
        const items = await loadConversations();

        if (!alive) return;

        if (items.length > 0) {
          await openConversation(items[0].id);
        }
      } catch (cause) {
        if (alive) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load conversation history.",
          );
        }
      } finally {
        if (alive) {
          setLoadingHistory(false);
        }
      }
    }

    void initialize();

    return () => {
      alive = false;
      invalidatePendingRequests();
    };
  }, [loadConversations, openConversation, invalidatePendingRequests]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeMessages]);

  async function createConversation() {
    if (sendingRef.current) return;

    setError("");

    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const data = (await response.json()) as {
      conversation: Conversation;
    };

    const conversation = data.conversation;

    // Invalidate all older conversation-loading requests.
    loadRequestRef.current++;

    messagesRef.current = {
      ...messagesRef.current,
      [conversation.id]: [],
    };

    setMessagesByConversation((previous) => ({
      ...previous,
      [conversation.id]: [],
    }));

    setConversations((previous) => [
      conversation,
      ...previous.filter((item) => item.id !== conversation.id),
    ]);

    selectActiveConversation(conversation.id);
    setDraft("");

    textareaRef.current?.focus();
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();

    if (!content || sendingRef.current) return;

    setError("");
    setDraft("");

    sendingRef.current = true;
    setSending(true);

    let conversationId = activeIdRef.current;

    const userMessageId = makeMessageId();
    const assistantMessageId = makeMessageId();

    try {
      // Create a conversation if none is currently selected.
      if (!conversationId) {
        const createResponse = await fetch("/api/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (!createResponse.ok) {
          throw new Error(await readError(createResponse));
        }

        const createData = (await createResponse.json()) as {
          conversation: Conversation;
        };

        conversationId = createData.conversation.id;

        messagesRef.current = {
          ...messagesRef.current,
          [conversationId]: [],
        };

        setMessagesByConversation((previous) => ({
          ...previous,
          [conversationId!]: [],
        }));

        setConversations((previous) => [createData.conversation, ...previous]);

        loadRequestRef.current++;
        selectActiveConversation(conversationId);
      }

      const targetId = conversationId;

      // Capture the correct conversation's history.
      const previousMessages = messagesRef.current[targetId] ?? [];

      // Automatically name a conversation from its first message.
      if (previousMessages.length === 0) {
        const title = content.replace(/\s+/g, " ").trim();
        const conversationTitle =
          title.length > 48 ? `${title.slice(0, 47).trimEnd()}…` : title;

        const titleResponse = await fetch(`/api/conversations/${targetId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: conversationTitle,
          }),
        });

        if (titleResponse.ok) {
          const titleData = await titleResponse.json();

          setConversations((current) =>
            current.map((item) =>
              item.id === targetId ? titleData.conversation : item,
            ),
          );
        } else {
          console.error(
            "Could not automatically name conversation:",
            await readError(titleResponse),
          );
        }
      }

      const history = [
        ...previousMessages.map(({ role, content: text }) => ({
          role,
          content: text,
        })),
        {
          role: "user" as const,
          content,
        },
      ];

      // Add both messages to this conversation only.
      updateMessages(targetId, (current) => [
        ...current,
        {
          id: userMessageId,
          role: "user",
          content,
        },
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);

      // Request the AI response.
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: targetId,
          messages: history,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(await readError(response));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let answer = "";

      // Read the streaming response.
      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;

          const payload = line.slice(5).trim();

          if (!payload || payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload) as StreamChunk;
            const delta = parsed.choices?.[0]?.delta?.content;

            if (typeof delta === "string") {
              answer += delta;

              // Update the correct conversation, even if another
              // conversation is currently selected.
              updateMessages(targetId, (current) =>
                current.map((message) =>
                  message.id === assistantMessageId
                    ? { ...message, content: answer }
                    : message,
                ),
              );
            }
          } catch {
            // Ignore non-content provider events.
          }
        }
      }

      // Process any remaining buffered data.
      buffer += decoder.decode();

      if (buffer.trim().startsWith("data:")) {
        const payload = buffer.trim().slice(5).trim();

        if (payload && payload !== "[DONE]") {
          try {
            const parsed = JSON.parse(payload) as StreamChunk;
            const delta = parsed.choices?.[0]?.delta?.content;

            if (typeof delta === "string") {
              answer += delta;
            }
          } catch {
            // Ignore incomplete provider events.
          }
        }
      }

      if (!answer.trim()) {
        throw new Error("VESH returned an empty response.");
      }

      // Ensure the final response is stored in the correct local transcript.
      updateMessages(targetId, (current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? { ...message, content: answer }
            : message,
        ),
      );

      // Persist both messages in Supabase.
      const saveResponse = await fetch(
        `/api/conversations/${targetId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content,
              },
              {
                role: "assistant",
                content: answer,
              },
            ],
          }),
        },
      );

      if (!saveResponse.ok) {
        throw new Error(await readError(saveResponse));
      }

      // Replace temporary IDs with the actual database IDs.
      const savedData = (await saveResponse.json()) as {
        messages: Message[];
      };

      if (savedData.messages?.length === 2) {
        updateMessages(targetId, (current) =>
          current.map((message) => {
            if (message.id === userMessageId) {
              return savedData.messages[0];
            }

            if (message.id === assistantMessageId) {
              return savedData.messages[1];
            }

            return message;
          }),
        );
      }

      // Refresh sidebar metadata without changing the active transcript.
      await loadConversations();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "VESH couldn't send that message.";

      setError(message);

      // Remove only the failed request's temporary messages.
      if (conversationId) {
        updateMessages(conversationId, (current) =>
          current.filter(
            (item) =>
              item.id !== userMessageId && item.id !== assistantMessageId,
          ),
        );
      }

      setDraft(content);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function deleteConversation(id: string) {
    if (!window.confirm("Delete this conversation and its messages?")) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const remaining = conversations.filter((item) => item.id !== id);

      setConversations(remaining);

      const nextMessages = { ...messagesRef.current };
      delete nextMessages[id];

      messagesRef.current = nextMessages;

      setMessagesByConversation(nextMessages);

      if (activeIdRef.current === id) {
        loadRequestRef.current++;

        if (remaining.length > 0) {
          await openConversation(remaining[0].id);
        } else {
          selectActiveConversation(null);
        }
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not delete conversation.",
      );
    }
  }

  return (
    <main className="conversation-page">
      <header className="conversation-topbar">
        <Link href="/" className="conversation-brand">
          <span className="conversation-mark">
            <i />
            <i />
            <i />
          </span>

          <span>V E S H</span>
          <span className="conversation-divider" />
          <small>WORKSPACE</small>
        </Link>

        <div className="conversation-topbar-actions">
          <Link href="/workspace" className="conversation-return">
            Return to Workspace
          </Link>
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

      <div className="conversation-layout">
        <aside className="conversation-sidebar">
          <div className="conversation-sidebar-heading">
            <div>
              <p className="conversation-eyebrow">YOUR HISTORY</p>

              <h1>Conversations</h1>
            </div>

            <button
              onClick={() =>
                createConversation().catch((cause) => setError(cause.message))
              }
              disabled={sending}
            >
              ＋ New
            </button>
          </div>

          <div className="conversation-list">
            {conversations.map((item) => (
              <div
                className={`conversation-list-item ${
                  activeId === item.id ? "active" : ""
                }`}
                key={item.id}
              >
                <button
                  className="conversation-select"
                  onClick={() =>
                    openConversation(item.id).catch((cause) =>
                      setError(cause.message),
                    )
                  }
                >
                  <strong>{item.title}</strong>

                  <time>
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(item.updated_at))}
                  </time>
                </button>

                <button
                  className="conversation-delete"
                  title="Delete conversation"
                  aria-label="Delete conversation"
                  onClick={() => deleteConversation(item.id)}
                  disabled={sending}
                >
                  ×
                </button>
              </div>
            ))}

            {!loadingHistory && conversations.length === 0 && (
              <p className="conversation-muted">
                Your conversations will appear here.
              </p>
            )}
          </div>

          <p className="conversation-privacy">
            <span />
            Private to your account
          </p>
        </aside>

        <section className="conversation-main">
          <div className="conversation-main-heading">
            <div>
              <p className="conversation-eyebrow">VESH INTELLIGENCE</p>

              <h2>
                {conversations.find((item) => item.id === activeId)?.title ??
                  "New conversation"}
              </h2>
            </div>

            <span>History enabled</span>
          </div>

          <div className="conversation-transcript">
            {loadingHistory ? (
              <div className="conversation-empty">
                <span className="conversation-orb">V</span>
                <h3>Connecting to your space…</h3>
              </div>
            ) : activeMessages.length === 0 ? (
              <div className="conversation-empty">
                <span className="conversation-orb">V</span>
                <h3>What shall we work on?</h3>
                <p>
                  Ask a question, explore an idea, or think through your next
                  step.
                </p>
              </div>
            ) : (
              activeMessages.map((message) => (
                <article
                  className={`message-row ${message.role}`}
                  key={message.id}
                >
                  <div className="message-avatar">
                    {message.role === "assistant" ? "V" : "You"}
                  </div>

                  <div className="message-bubble">
                    {message.role === "assistant" ? (
  <AssistantMessage
    content={
      message.content ||
      (sending ? "VESH is thinking…" : "")
    }
  />
) : (
  <p>{message.content}</p>
)}
                  </div>
                </article>
              ))
            )}

            <div ref={bottomRef} />
          </div>

          <div className="conversation-composer-wrap">
            {error && (
              /authentication required|unauthorized|sign in/i.test(error) ? (
                <div className="conversation-error conversation-auth-error" role="alert">
                  <span>Sign in to access saved conversations.</span>
                  <Link href="/login">Sign in</Link>
                  <Link href="/signup">Create account</Link>
                </div>
              ) : (
                <p className="conversation-error" role="alert">{error}</p>
              )
            )}

            <form className="conversation-composer" onSubmit={sendMessage}>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Message VESH…"
                rows={2}
                disabled={sending || loadingHistory}
                aria-label="Message VESH"
              />

              <button
                type="submit"
                disabled={!draft.trim() || sending || loadingHistory}
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </form>

            <p className="composer-hint">
              Enter to send · Shift + Enter for a new line
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
