import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowLeft, ArrowUp, Moon, Search, SquarePen, Sun, Ellipsis } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  blocksFor,
  clockTime,
  firstName,
  listTime,
  monogram,
  previewText,
  type Note,
  type Thread,
} from "@/lib/chat/data";
import { ChatProvider, lineFor, useChat } from "@/lib/chat/store";

const iconProps = { size: 18, strokeWidth: 1.5, "aria-hidden": true as const };

export function ChatApp() {
  return (
    <ChatProvider>
      <a className="skip" href="#composer">
        Skip to note
      </a>
      <Messenger />
    </ChatProvider>
  );
}

function Messenger() {
  const { state, dispatch } = useChat();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [pane, setPane] = useState<"list" | "thread">("list");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [writingId, setWritingId] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clock, setClock] = useState(false);
  const paneRef = useRef(pane);
  const wideRef = useRef(false);
  const activeRef = useRef(state.activeId);
  const timerRef = useRef<number | null>(null);
  const threadsRef = useRef(state.threads);

  paneRef.current = pane;
  activeRef.current = state.activeId;
  threadsRef.current = state.threads;

  useEffect(() => {
    setClock(true);
    const media = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      wideRef.current = media.matches;
    };
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const thread = state.threads.find((item) => item.id === state.activeId);
    document.title = thread ? `${thread.name} · m3chat` : "m3chat";
  }, [state.activeId, state.threads]);

  useEffect(() => {
    if (!clock) return;
    const viewing = wideRef.current || pane === "thread";
    if (!viewing || !state.activeId) return;
    const open = state.threads.find((item) => item.id === state.activeId);
    if (open && open.unread > 0) dispatch({ type: "select", id: state.activeId });
  }, [clock, pane, state.activeId, state.threads, dispatch]);

  const active = state.threads.find((thread) => thread.id === state.activeId) ?? null;
  const unreadTotal = state.threads.reduce((sum, thread) => sum + thread.unread, 0);
  const q = query.trim().toLowerCase();
  const visible = state.threads.filter((thread) => {
    if (filter === "unread" && thread.unread === 0) return false;
    if (!q) return true;
    if (thread.name.toLowerCase().includes(q)) return true;
    return thread.messages.some((note) => note.text.toLowerCase().includes(q));
  });

  function select(id: string) {
    dispatch({ type: "select", id });
    setPane("thread");
  }

  function send(thread: Thread, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const messageId = crypto.randomUUID();
    const reply = lineFor(thread);
    dispatch({
      type: "send",
      threadId: thread.id,
      text: trimmed,
      messageId,
      cursor: reply.cursor,
    });
    setDrafts((current) => ({ ...current, [thread.id]: "" }));
    setFreshId(messageId);
    setWritingId(thread.id);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const replyId = crypto.randomUUID();
    timerRef.current = window.setTimeout(() => {
      const stillThere = threadsRef.current.some((item) => item.id === thread.id);
      if (!stillThere) {
        setWritingId(null);
        return;
      }
      const viewing =
        activeRef.current === thread.id && (wideRef.current || paneRef.current === "thread");
      dispatch({
        type: "incoming",
        threadId: thread.id,
        text: reply.line,
        messageId: replyId,
        viewing,
      });
      setWritingId((current) => (current === thread.id ? null : current));
      setFreshId(replyId);
      setAnnounce(`${thread.name} wrote: ${reply.line}`);
    }, 880);
  }

  function startThread(name: string) {
    const thread: Thread = {
      id: crypto.randomUUID(),
      name,
      lines: [
        "Got it.",
        "I'll write back shortly.",
        "Can you say a bit more?",
        "Noted. I'll sit with that.",
        "Thanks, that helps.",
      ],
      messages: [],
      unread: 0,
      replyCursor: -1,
      touched: Date.now(),
    };
    dispatch({ type: "start", thread });
    setPane("thread");
    setDialogOpen(false);
  }

  function removeThread(id: string) {
    if (timerRef.current && writingId === id) window.clearTimeout(timerRef.current);
    dispatch({ type: "remove", id });
    setWritingId((current) => (current === id ? null : current));
    setPane("list");
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-ink">
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <ThreadList
        threads={visible}
        activeId={state.activeId}
        query={query}
        filter={filter}
        unreadTotal={unreadTotal}
        clock={clock}
        theme={state.theme}
        hiddenOnMobile={pane === "thread"}
        onQuery={setQuery}
        onFilter={setFilter}
        onSelect={select}
        onCreate={() => setDialogOpen(true)}
        onTheme={() =>
          dispatch({ type: "theme", theme: state.theme === "dark" ? "light" : "dark" })
        }
      />
      <ThreadPane
        thread={active}
        draft={active ? (drafts[active.id] ?? "") : ""}
        writing={Boolean(active && writingId === active.id)}
        freshId={freshId}
        clock={clock}
        hiddenOnMobile={pane !== "thread"}
        onDraft={(value) => {
          if (!active) return;
          setDrafts((current) => ({ ...current, [active.id]: value }));
        }}
        onSend={(text) => {
          if (active) send(active, text);
        }}
        onBack={() => setPane("list")}
        onRemove={() => {
          if (active) removeThread(active.id);
        }}
        onCreate={() => setDialogOpen(true)}
      />
      <NewThreadDialog open={dialogOpen} onOpenChange={setDialogOpen} onStart={startThread} />
    </div>
  );
}

function Mark() {
  return (
    <span className="mark relative h-5 w-5 shrink-0 rounded-fold bg-raised" aria-hidden>
      <span className="seal seal-out" />
    </span>
  );
}

function ThreadList({
  threads,
  activeId,
  query,
  filter,
  unreadTotal,
  clock,
  theme,
  hiddenOnMobile,
  onQuery,
  onFilter,
  onSelect,
  onCreate,
  onTheme,
}: {
  threads: Thread[];
  activeId: string;
  query: string;
  filter: "all" | "unread";
  unreadTotal: number;
  clock: boolean;
  theme: "light" | "dark";
  hiddenOnMobile: boolean;
  onQuery: (value: string) => void;
  onFilter: (value: "all" | "unread") => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onTheme: () => void;
}) {
  return (
    <aside
      className={cn(
        "w-full shrink-0 flex-col border-r border-line bg-surface md:flex md:w-sidebar",
        hiddenOnMobile ? "hidden" : "flex",
      )}
    >
      <header className="flex h-16 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Mark />
          <p className="truncate text-word font-semibold">m3chat</p>
        </div>
        <button
          type="button"
          className="press ease grid h-11 w-11 place-items-center rounded-card text-secondary hover:bg-canvas"
          onClick={onCreate}
          aria-label="New thread"
        >
          <SquarePen {...iconProps} />
        </button>
      </header>
      <div className="px-4">
        <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-canvas px-3">
          <Search {...iconProps} className="shrink-0 text-muted" />
          <span className="sr-only">Search</span>
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
            autoComplete="off"
          />
        </label>
      </div>
      <div className="mt-3 flex gap-2 px-4">
        <FilterChip pressed={filter === "all"} onClick={() => onFilter("all")}>
          All
        </FilterChip>
        <FilterChip pressed={filter === "unread"} onClick={() => onFilter("unread")}>
          Unread
          {unreadTotal > 0 ? (
            <span className={cn("tabular-nums", filter === "unread" ? "" : "text-seal")}>
              {unreadTotal}
            </span>
          ) : null}
        </FilterChip>
      </div>
      <div className="scroll mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {threads.length === 0 ? (
          <p className="px-2 py-6 text-caption text-muted">
            {query.trim() ? "No threads match" : "No unread notes"}
          </p>
        ) : (
          <ul aria-label="Threads" className="flex flex-col gap-1">
            {threads.map((thread) => {
              const last = thread.messages[thread.messages.length - 1];
              const selected = thread.id === activeId;
              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(thread.id)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "ease flex h-16 w-full items-center gap-3 rounded-control px-2 text-left",
                      selected ? "bg-raised" : "hover:bg-canvas",
                    )}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-canvas text-caption text-secondary">
                      {monogram(thread.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-3">
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-body",
                            thread.unread > 0 ? "text-ink" : "text-secondary",
                          )}
                        >
                          {thread.name}
                        </span>
                        <span className="shrink-0 text-meta tabular-nums text-muted">
                          {clock && last ? listTime(last.at) : ""}
                        </span>
                      </span>
                      <span className="mt-1 flex items-baseline gap-3">
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-caption",
                            thread.unread > 0 ? "text-secondary" : "text-muted",
                          )}
                        >
                          {previewText(last)}
                        </span>
                        <span className="w-6 shrink-0 text-right text-meta tabular-nums text-seal">
                          {thread.unread > 0 ? thread.unread : ""}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <footer className="border-t border-line px-2 py-2">
        <button
          type="button"
          onClick={onTheme}
          className="press ease flex h-11 w-full items-center gap-2 rounded-control px-2 text-caption text-secondary hover:bg-canvas"
        >
          {theme === "dark" ? <Sun {...iconProps} /> : <Moon {...iconProps} />}
          {theme === "dark" ? "Light theme" : "Dark theme"}
        </button>
      </footer>
    </aside>
  );
}

function FilterChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "press ease flex h-11 items-center gap-2 rounded-full px-4 text-body",
        pressed ? "bg-ink text-canvas" : "text-secondary hover:bg-canvas",
      )}
    >
      {children}
    </button>
  );
}

function ThreadPane({
  thread,
  draft,
  writing,
  freshId,
  clock,
  hiddenOnMobile,
  onDraft,
  onSend,
  onBack,
  onRemove,
  onCreate,
}: {
  thread: Thread | null;
  draft: string;
  writing: boolean;
  freshId: string | null;
  clock: boolean;
  hiddenOnMobile: boolean;
  onDraft: (value: string) => void;
  onSend: (text: string) => void;
  onBack: () => void;
  onRemove: () => void;
  onCreate: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const count = thread?.messages.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.id, count, writing]);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "0px";
    field.style.height = `${Math.min(field.scrollHeight, 128)}px`;
  }, [draft, thread?.id]);

  const canSend = draft.trim().length > 0;
  const blocks = thread ? blocksFor(thread.messages, clock) : [];
  const latestId = thread?.messages[thread.messages.length - 1]?.id;

  function submit() {
    if (!canSend) return;
    onSend(draft);
    fieldRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <section
      className={cn(
        "min-w-0 flex-1 flex-col bg-canvas md:flex",
        hiddenOnMobile ? "hidden" : "flex",
      )}
    >
      {thread ? (
        <>
          <header className="border-b border-line px-4 py-4 md:px-8">
            <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
              <button
                type="button"
                className="press ease grid h-11 w-11 shrink-0 place-items-center rounded-card text-secondary hover:bg-raised md:hidden"
                onClick={onBack}
                aria-label="Back to threads"
              >
                <ArrowLeft {...iconProps} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-title font-medium">{thread.name}</h1>
                <p className="mt-1 truncate text-caption text-secondary">
                  {writing
                    ? "Writing a note"
                    : clock && latestId
                      ? `Last note · ${clockTime(thread.messages[thread.messages.length - 1]!.at)}`
                      : "Last note"}
                </p>
              </div>
              <ThreadMenu name={thread.name} onRemove={onRemove} />
            </div>
          </header>
          <div className="scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
            {thread.messages.length === 0 ? (
              <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
                <p className="text-body text-ink">No notes yet</p>
                <p className="mt-2 text-caption text-secondary">Write the first one below</p>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
                {blocks.map((block) =>
                  block.kind === "day" ? (
                    <div key={block.key} className="flex items-center gap-3">
                      <span className="h-px flex-1 bg-line" />
                      <span className="text-meta text-muted">{block.label}</span>
                      <span className="h-px flex-1 bg-line" />
                    </div>
                  ) : (
                    <div key={block.key} className="flex flex-col gap-1">
                      {block.run.notes.map((note, index) => (
                        <NoteBubble
                          key={note.id}
                          note={note}
                          fold={index === block.run.notes.length - 1}
                          sealed={note.id === latestId}
                          fresh={note.id === freshId}
                          clock={clock}
                          showTime={index === block.run.notes.length - 1}
                        />
                      ))}
                    </div>
                  ),
                )}
                {writing ? (
                  <p className="text-caption text-secondary">{firstName(thread.name)} is writing</p>
                ) : null}
                <div ref={endRef} />
              </div>
            )}
          </div>
          <form
            className="px-4 pb-4 md:px-8"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="composer mx-auto flex w-full max-w-2xl items-end gap-2 rounded-full border border-line bg-card py-1 pr-1 pl-4 shadow-rest">
              <label className="sr-only" htmlFor="composer">
                Write a note
              </label>
              <textarea
                id="composer"
                ref={fieldRef}
                rows={1}
                value={draft}
                placeholder="Write a note"
                enterKeyHint="send"
                onChange={(event) => onDraft(event.target.value)}
                onKeyDown={onKeyDown}
                className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-body outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label={canSend ? undefined : "Send"}
                className={cn(
                  "morph press grid h-11 shrink-0 place-items-center overflow-hidden",
                  canSend
                    ? "w-20 rounded-full bg-accent text-on-accent"
                    : "w-11 rounded-card bg-raised text-secondary",
                )}
              >
                <ArrowUp
                  {...iconProps}
                  className={cn(
                    "col-start-1 row-start-1 morph",
                    canSend ? "opacity-0" : "opacity-100",
                  )}
                />
                <span
                  aria-hidden={!canSend}
                  className={cn(
                    "col-start-1 row-start-1 text-body whitespace-nowrap morph",
                    canSend ? "opacity-100" : "opacity-0",
                  )}
                >
                  Send
                </span>
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-body text-ink">No thread open</p>
          <button
            type="button"
            onClick={onCreate}
            className="press ease mt-4 h-11 rounded-full bg-accent px-4 text-body text-on-accent"
          >
            New thread
          </button>
        </div>
      )}
    </section>
  );
}

function NoteBubble({
  note,
  fold,
  sealed,
  fresh,
  clock,
  showTime,
}: {
  note: Note;
  fold: boolean;
  sealed: boolean;
  fresh: boolean;
  clock: boolean;
  showTime: boolean;
}) {
  const mine = note.from === "me";
  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "bubble relative",
          mine ? "bubble-out" : "bubble-in",
          fold && "fold",
          fresh && "enter",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{note.text}</p>
        {sealed ? <span className={cn("seal", mine ? "seal-out" : "seal-in")} /> : null}
      </div>
      {showTime && clock ? (
        <time className="mt-1 px-1 text-meta tabular-nums text-muted" dateTime={new Date(note.at).toISOString()}>
          {clockTime(note.at)}
        </time>
      ) : null}
    </div>
  );
}

function ThreadMenu({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="press ease grid h-11 w-11 shrink-0 place-items-center rounded-card text-secondary hover:bg-raised"
          aria-label={`Thread options for ${name}`}
        >
          <Ellipsis {...iconProps} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-30 min-w-40 rounded-card border border-line bg-surface p-1 shadow-float"
        >
          <DropdownMenu.Item
            onSelect={onRemove}
            className="ease flex h-11 cursor-pointer items-center rounded-control px-3 text-body outline-none data-[highlighted]:bg-raised"
          >
            Remove thread
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function NewThreadDialog({
  open,
  onOpenChange,
  onStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [tried, setTried] = useState(false);
  const fieldId = useId();
  const invalid = tried && name.trim().length === 0;

  function close(next: boolean) {
    if (!next) {
      setName("");
      setTried(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-panel border border-line bg-surface p-4 shadow-float">
          <Dialog.Title className="text-word font-medium">New thread</Dialog.Title>
          <Dialog.Description className="sr-only">A name is enough to start.</Dialog.Description>
          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = name.trim().replace(/\s+/g, " ");
              if (!trimmed) {
                setTried(true);
                return;
              }
              onStart(trimmed.slice(0, 48));
              setName("");
              setTried(false);
            }}
          >
            <label htmlFor={fieldId} className="text-caption text-secondary">
              Name
            </label>
            <input
              id={fieldId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              className="mt-2 h-11 w-full rounded-fold border border-line bg-canvas px-3 text-body outline-none"
            />
            <p className="mt-2 min-h-4 text-caption text-secondary">{invalid ? "Add a name" : ""}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="press ease h-11 rounded-full bg-raised px-4 text-body"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="press ease h-11 rounded-full bg-accent px-4 text-body text-on-accent"
              >
                Start
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
