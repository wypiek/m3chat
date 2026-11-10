export type Author = "me" | "them";

export type Note = {
  id: string;
  from: Author;
  text: string;
  at: number;
};

export type Thread = {
  id: string;
  name: string;
  lines: string[];
  messages: Note[];
  unread: number;
  replyCursor: number;
  touched: number;
};

export type ThemeName = "light" | "dark";

export const GENERIC_LINES = [
  "Got it.",
  "I'll write back shortly.",
  "Can you say a bit more?",
  "Noted. I'll sit with that.",
  "Thanks, that helps.",
];

const ANCHOR = Date.parse("2026-11-10T00:23:00.000Z");
const ago = (minutes: number) => ANCHOR - minutes * 60_000;

function thread(
  id: string,
  name: string,
  lines: string[],
  unread: number,
  messages: Note[],
): Thread {
  return { id, name, lines, messages, unread, replyCursor: -1, touched: messages[messages.length - 1]?.at ?? 0 };
}

export function createSeed(): Thread[] {
  return [
    thread(
      "mara",
      "Mara Ellison",
      [
        "Saturday after nine still works on my side.",
        "The alley door will be unlatched.",
        "I set the crawled rims aside if you want to see them.",
        "The kiln should be cool enough to open by then.",
      ],
      2,
      [
        {
          id: "mara-1",
          from: "them",
          at: ago(8 * 60),
          text: "The kiln cools overnight. If you want to see the bowls before they go to the shop, Saturday morning is the window.",
        },
        {
          id: "mara-2",
          from: "me",
          at: ago(7 * 60 + 20),
          text: "I can come by after nine. Should I use the alley door?",
        },
        {
          id: "mara-3",
          from: "them",
          at: ago(46),
          text: "Alley door, yes. I'll leave the latch up.",
        },
        {
          id: "mara-4",
          from: "them",
          at: ago(12),
          text: "Also, the blue glaze crawled on two rims. I'm keeping those.",
        },
      ],
    ),
    thread(
      "priya",
      "Priya Shah",
      [
        "I'll be there closer to 16:10.",
        "Send the open questions if the room gets restless.",
        "Start without me and I'll catch up on the type notes.",
        "The 15:40 is the one I'm on.",
      ],
      1,
      [
        {
          id: "priya-1",
          from: "them",
          at: ago(5 * 60),
          text: "The 15:10 is cancelled. I'm on the 15:40, so I'll be at the review closer to 16:10.",
        },
        {
          id: "priya-2",
          from: "me",
          at: ago(4 * 60 + 40),
          text: "I'll start with the type notes and hold the decisions for you.",
        },
        {
          id: "priya-3",
          from: "them",
          at: ago(4 * 60 + 20),
          text: "Thank you. Send me the open questions if the room gets impatient.",
        },
      ],
    ),
    thread(
      "ada",
      "Ada Voss",
      [
        "It's behind the counter under your name.",
        "We're open until seven today.",
        "The cloth binding is in good shape, no jacket as I said.",
        "I can set aside the next one that comes in too.",
      ],
      1,
      [
        {
          id: "ada-1",
          from: "them",
          at: ago(10 * 60),
          text: "The copy of The Living Mountain you asked for came in. Cloth bound, no jacket.",
        },
        {
          id: "ada-2",
          from: "me",
          at: ago(9 * 60 + 20),
          text: "I'll take it. Can you keep it behind the counter?",
        },
        {
          id: "ada-3",
          from: "them",
          at: ago(9 * 60),
          text: "It's under your name. We're open until seven today.",
        },
      ],
    ),
    thread(
      "jonah",
      "Jonah Park",
      [
        "I can hold the sheets until Thursday.",
        "Warm white, 300 gsm, eight sheets under your name.",
        "The shop closes at six, so come before then.",
        "I can cut them down if the press size is off.",
      ],
      0,
      [
        {
          id: "jonah-1",
          from: "them",
          at: ago(30 * 60),
          text: "The cotton paper you asked about is back. 300 gsm, warm white.",
        },
        {
          id: "jonah-2",
          from: "me",
          at: ago(28 * 60),
          text: "Hold eight sheets for me. I'll collect them Thursday.",
        },
        {
          id: "jonah-3",
          from: "them",
          at: ago(26 * 60),
          text: "Held under your name. Thursday before six. The shop closes at six.",
        },
      ],
    ),
    thread(
      "leo",
      "Leo March",
      [
        "Seven still works. I'll have the stew on.",
        "Bring the bread with the hard crust if the bakery has it.",
        "Saturday is clear on my side.",
        "I'll keep the chili oil light unless you want it hot.",
      ],
      0,
      [
        {
          id: "leo-1",
          from: "me",
          at: ago(32 * 60),
          text: "Still good for Saturday? I'll bring bread.",
        },
        {
          id: "leo-2",
          from: "them",
          at: ago(30 * 60),
          text: "Yes. I'm making the lentil stew with the chili oil from last time.",
        },
        {
          id: "leo-3",
          from: "me",
          at: ago(29 * 60),
          text: "I'll come at seven.",
        },
      ],
    ),
    thread(
      "sam",
      "Sam Okonkwo",
      [
        "The grey pot, not the blue one.",
        "The crate is plates. Nothing fragile on top.",
        "Lock the side door when you leave.",
        "Thanks for taking the delivery.",
      ],
      0,
      [
        {
          id: "sam-1",
          from: "them",
          at: ago(54 * 60),
          text: "I left the spare key under the grey pot, not the blue one.",
        },
        {
          id: "sam-2",
          from: "me",
          at: ago(52 * 60),
          text: "Found it. I'll lock up after the delivery.",
        },
        {
          id: "sam-3",
          from: "them",
          at: ago(50 * 60),
          text: "Thanks. The delivery is a crate of plates, nothing fragile on top.",
        },
      ],
    ),
  ];
}

export function sortThreads(threads: Thread[]): Thread[] {
  return [...threads].sort((a, b) => lastAt(b) - lastAt(a));
}

export function lastAt(thread: Thread): number {
  return thread.touched || thread.messages[thread.messages.length - 1]?.at || 0;
}

export function lastNote(thread: Thread): Note | undefined {
  return thread.messages[thread.messages.length - 1];
}

export function monogram(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function previewText(note: Note | undefined): string {
  if (!note) return "No notes yet";
  const flat = note.text.replace(/\s+/g, " ");
  return note.from === "me" ? `You: ${flat}` : flat;
}

export function nextLine(thread: Thread): { line: string; cursor: number } {
  const pool = thread.lines.length > 0 ? thread.lines : GENERIC_LINES;
  const cursor = (thread.replyCursor + 1) % pool.length;
  return { line: pool[cursor] ?? pool[0] ?? "Got it.", cursor };
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function clockTime(at: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

export function dayLabel(at: number, now = Date.now()): string {
  const date = new Date(at);
  const today = new Date(now);
  if (sameDay(date, today)) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, yesterday)) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(date);
}

export function listTime(at: number, now = Date.now()): string {
  const date = new Date(at);
  const today = new Date(now);
  if (sameDay(date, today)) return clockTime(at);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, yesterday)) return "Yesterday";
  const age = now - at;
  if (age >= 0 && age < 6 * 24 * 60 * 60 * 1000) {
    return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
  }
  return dayLabel(at, now);
}

export type Run = { key: string; from: Author; notes: Note[] };

export type ThreadBlock =
  | { kind: "day"; key: string; label: string }
  | { kind: "run"; key: string; run: Run };

export function blocksFor(notes: Note[], withDays: boolean, now = Date.now()): ThreadBlock[] {
  const blocks: ThreadBlock[] = [];
  let lastDay = "";
  let run: Run | null = null;

  const pushRun = () => {
    if (!run) return;
    blocks.push({ kind: "run", key: run.key, run });
    run = null;
  };

  for (const note of notes) {
    if (withDays) {
      const label = dayLabel(note.at, now);
      if (label !== lastDay) {
        pushRun();
        lastDay = label;
        blocks.push({ kind: "day", key: `day-${note.id}`, label });
      }
    }
    if (!run || run.from !== note.from) {
      pushRun();
      run = { key: note.id, from: note.from, notes: [note] };
    } else {
      run.notes.push(note);
    }
  }
  pushRun();
  return blocks;
}
