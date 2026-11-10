import {
  createContext,
  useContext,
  useLayoutEffect,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  createSeed,
  GENERIC_LINES,
  nextLine,
  sortThreads,
  type ThemeName,
  type Thread,
} from "@/lib/chat/data";

const STORAGE_KEY = "m3chat";
const THEME_KEY = "m3chat-theme";

export type State = {
  threads: Thread[];
  activeId: string;
  theme: ThemeName;
};

type Action =
  | { type: "hydrate"; state: State }
  | { type: "select"; id: string }
  | { type: "send"; threadId: string; text: string; messageId: string; cursor: number }
  | { type: "incoming"; threadId: string; text: string; messageId: string; viewing: boolean }
  | { type: "start"; thread: Thread }
  | { type: "remove"; id: string }
  | { type: "theme"; theme: ThemeName };

function newestFirst(threads: Thread[]): Thread[] {
  return sortThreads(threads);
}

function initialState(): State {
  const threads = newestFirst(createSeed());
  return { threads, activeId: threads[0]?.id ?? "", theme: "light" };
}

function mapThread(threads: Thread[], id: string, edit: (thread: Thread) => Thread): Thread[] {
  return threads.map((thread) => (thread.id === id ? edit(thread) : thread));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return {
        threads: newestFirst(action.state.threads),
        activeId: action.state.threads.some((thread) => thread.id === action.state.activeId)
          ? action.state.activeId
          : (action.state.threads[0]?.id ?? ""),
        theme: action.state.theme === "dark" ? "dark" : "light",
      };
    case "select":
      return {
        ...state,
        activeId: action.id,
        threads: mapThread(state.threads, action.id, (thread) => ({ ...thread, unread: 0 })),
      };
    case "send": {
      const threads = mapThread(state.threads, action.threadId, (thread) => ({
        ...thread,
        replyCursor: action.cursor,
        touched: Date.now(),
        messages: [
          ...thread.messages,
          { id: action.messageId, from: "me", text: action.text, at: Date.now() },
        ],
      }));
      return { ...state, threads: newestFirst(threads), activeId: action.threadId };
    }
    case "incoming": {
      const exists = state.threads.some((thread) => thread.id === action.threadId);
      if (!exists) return state;
      const threads = mapThread(state.threads, action.threadId, (thread) => ({
        ...thread,
        unread: action.viewing ? thread.unread : thread.unread + 1,
        touched: Date.now(),
        messages: [
          ...thread.messages,
          { id: action.messageId, from: "them", text: action.text, at: Date.now() },
        ],
      }));
      return { ...state, threads: newestFirst(threads) };
    }
    case "start":
      return {
        ...state,
        threads: newestFirst([action.thread, ...state.threads]),
        activeId: action.thread.id,
      };
    case "remove": {
      const threads = state.threads.filter((thread) => thread.id !== action.id);
      const activeId =
        state.activeId === action.id ? (newestFirst(threads)[0]?.id ?? "") : state.activeId;
      return { ...state, threads, activeId };
    }
    case "theme":
      return { ...state, theme: action.theme };
    default:
      return state;
  }
}

type Saved = { threads?: Thread[]; activeId?: string; theme?: ThemeName };

function sanitize(raw: Saved): State | null {
  if (!Array.isArray(raw.threads)) return null;
  const threads = raw.threads.flatMap((thread) => {
    if (!thread || typeof thread.id !== "string" || typeof thread.name !== "string") return [];
    const messages = Array.isArray(thread.messages)
      ? thread.messages.filter(
          (note) =>
            note &&
            typeof note.id === "string" &&
            (note.from === "me" || note.from === "them") &&
            typeof note.text === "string" &&
            typeof note.at === "number",
        )
      : [];
    return [
      {
        id: thread.id,
        name: thread.name.slice(0, 48),
        lines: Array.isArray(thread.lines) && thread.lines.length > 0 ? thread.lines : GENERIC_LINES,
        messages,
        unread: typeof thread.unread === "number" ? thread.unread : 0,
        replyCursor: typeof thread.replyCursor === "number" ? thread.replyCursor : -1,
        touched:
          typeof thread.touched === "number"
            ? thread.touched
            : messages[messages.length - 1]?.at ?? 0,
      } satisfies Thread,
    ];
  });
  return {
    threads,
    activeId: typeof raw.activeId === "string" ? raw.activeId : (threads[0]?.id ?? ""),
    theme: raw.theme === "dark" ? "dark" : "light",
  };
}

type ChatContextValue = {
  state: State;
  dispatch: Dispatch<Action>;
  ready: boolean;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = sanitize(JSON.parse(raw) as Saved);
        if (parsed) dispatch({ type: "hydrate", state: parsed });
      }
    } catch {
      /* keep the seed if storage is unreadable */
    }
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", state.theme === "dark");
    if (!ready) return;
    try {
      localStorage.setItem(THEME_KEY, state.theme);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ threads: state.threads, activeId: state.activeId, theme: state.theme }),
      );
    } catch {
      /* private mode and quota failures stay in memory */
    }
  }, [state, ready]);

  return <ChatContext.Provider value={{ state, dispatch, ready }}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const value = useContext(ChatContext);
  if (!value) throw new Error("Chat is unavailable");
  return value;
}

export function lineFor(thread: Thread): { line: string; cursor: number } {
  return nextLine(thread);
}
