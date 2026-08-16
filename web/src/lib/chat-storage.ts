import type {
  TechPassportAnalysis,
  RoomLabelOverride,
  RoomUserOverrides,
} from "@/lib/techpassport/types";
import type { HouseModel } from "@/lib/house3d/types";

export interface GenerationContext {
  mode: "standard" | "techpassport" | "house3d";
  generationId?: string;
  styleId: string;
  description?: string;
  imageModel?: string;
  referenceImages?: string[];
  planAnalysis?: TechPassportAnalysis;
  roomLabels?: RoomLabelOverride[];
  roomOverrides?: Record<string, RoomUserOverrides>;
  ceilingHeightM?: number;
  techPassportImage?: string;
  roomNumber?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  style?: string;
  styleId?: string;
  imageModel?: string;
  attachments?: string[];
  roomNumber?: string;
  roomType?: string;
  mode?: "standard" | "techpassport" | "house3d";
  houseModel?: HouseModel;
  generationContext?: GenerationContext;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_PREFIX = "designvision-chats";
const DB_NAME = "designvision-storage";
const DB_VERSION = 1;
const STORE_NAME = "chats";
/** Keep recent chats; older ones are dropped when quota is tight. */
const MAX_SESSIONS = 40;
const MAX_MESSAGES_PER_SESSION = 80;

function storageKey(email: string) {
  return `${STORAGE_PREFIX}:${email}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function idbGet(email: string): Promise<ChatSession[] | null> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(email);
      req.onsuccess = () => {
        const value = req.result;
        if (!value) {
          resolve(null);
          return;
        }
        if (Array.isArray(value)) {
          resolve(value as ChatSession[]);
          return;
        }
        if (value && typeof value === "object" && Array.isArray(value.sessions)) {
          resolve(value.sessions as ChatSession[]);
          return;
        }
        resolve(null);
      };
      req.onerror = () => reject(req.error ?? new Error("IndexedDB get failed"));
    });
  } finally {
    db.close();
  }
}

async function idbSet(email: string, sessions: ChatSession[]): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ sessions, updatedAt: new Date().toISOString() }, email);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("IndexedDB put failed"));
    });
  } finally {
    db.close();
  }
}

function sortByUpdated(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/** Drop oldest chats / trim long threads to fit storage. */
export function pruneSessions(
  sessions: ChatSession[],
  opts?: { maxSessions?: number; maxMessages?: number; stripHeavy?: boolean }
): ChatSession[] {
  const maxSessions = opts?.maxSessions ?? MAX_SESSIONS;
  const maxMessages = opts?.maxMessages ?? MAX_MESSAGES_PER_SESSION;
  const stripHeavy = opts?.stripHeavy ?? false;

  return sortByUpdated(sessions)
    .slice(0, maxSessions)
    .map((s) => {
      const messages = s.messages.slice(-maxMessages).map((m) => {
        if (!stripHeavy) return m;
        const next: ChatMessage = { ...m };
        if (next.generationContext) {
          const { referenceImages: _r, techPassportImage: _t, planAnalysis, ...rest } =
            next.generationContext;
          // Keep slim room markers so floor-plan pins survive quota pressure
          const slimPlan = planAnalysis
            ? {
                rooms: planAnalysis.rooms.map((r) => ({
                  number: r.number,
                  suggestedType: r.suggestedType,
                  markerX: r.markerX,
                  markerY: r.markerY,
                  facingDeg: r.facingDeg,
                })),
                totalAreaSqm: planAnalysis.totalAreaSqm,
                apartmentShape: planAnalysis.apartmentShape,
                layoutSummary: (planAnalysis.layoutSummary ?? "").slice(0, 240),
                rawAnalysis: "",
              }
            : undefined;
          next.generationContext = {
            ...rest,
            ...(slimPlan ? { planAnalysis: slimPlan } : {}),
          };
        }
        if (next.attachments && next.attachments.length > 0) {
          next.attachments = undefined;
        }
        return next;
      });
      return { ...s, messages };
    });
}

function readLegacyLocalStorage(email: string): ChatSession[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (!raw) return null;
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return null;
  }
}

function clearLegacyLocalStorage(email: string) {
  try {
    localStorage.removeItem(storageKey(email));
  } catch {
    /* ignore */
  }
}

/** Sync fallback for rare cases; prefer loadSessionsAsync. */
export function loadSessions(email: string): ChatSession[] {
  return readLegacyLocalStorage(email) ?? [];
}

export async function loadSessionsAsync(email: string): Promise<ChatSession[]> {
  if (typeof window === "undefined") return [];

  try {
    const fromIdb = await idbGet(email);
    if (fromIdb) return fromIdb;
  } catch (err) {
    console.warn("[chat-storage] IndexedDB read failed", err);
  }

  const legacy = readLegacyLocalStorage(email);
  if (legacy && legacy.length > 0) {
    try {
      await idbSet(email, pruneSessions(legacy));
      clearLegacyLocalStorage(email);
    } catch (err) {
      console.warn("[chat-storage] migration to IndexedDB failed", err);
    }
    return legacy;
  }

  return [];
}

export async function saveSessionsAsync(
  email: string,
  sessions: ChatSession[]
): Promise<void> {
  if (typeof window === "undefined") return;

  const attempts: Array<() => ChatSession[]> = [
    () => pruneSessions(sessions),
    () => pruneSessions(sessions, { maxSessions: 20, maxMessages: 40 }),
    () =>
      pruneSessions(sessions, {
        maxSessions: 12,
        maxMessages: 24,
        stripHeavy: true,
      }),
    () =>
      pruneSessions(sessions, {
        maxSessions: 6,
        maxMessages: 16,
        stripHeavy: true,
      }),
  ];

  let lastError: unknown;
  for (const build of attempts) {
    const payload = build();
    try {
      await idbSet(email, payload);
      clearLegacyLocalStorage(email);
      return;
    } catch (err) {
      lastError = err;
      console.warn("[chat-storage] save attempt failed, pruning harder", err);
    }
  }

  // Last resort: try a tiny localStorage snapshot without images
  try {
    const tiny = pruneSessions(sessions, {
      maxSessions: 3,
      maxMessages: 10,
      stripHeavy: true,
    }).map((s) => ({
      ...s,
      messages: s.messages.map((m) => {
        const { image: _img, houseModel: _h, ...rest } = m;
        return rest as ChatMessage;
      }),
    }));
    localStorage.setItem(storageKey(email), JSON.stringify(tiny));
  } catch {
    /* give up — do not throw to UI */
  }

  if (lastError) {
    console.error("[chat-storage] could not persist chats", lastError);
  }
}

/** Fire-and-forget save; never throws to callers. */
export function saveSessions(email: string, sessions: ChatSession[]) {
  void saveSessionsAsync(email, sessions);
}

export function createSession(): ChatSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "Новый чат",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function sessionTitleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "Генерация по референсам";
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed;
}

export function sessionTitleFromTechPassport(roomNumbers: string[]): string {
  if (roomNumbers.length === 0) return "Техпаспорт";
  if (roomNumbers.length === 1) return `Комната ${roomNumbers[0]}`;
  return `Комнаты ${roomNumbers.join(", ")}`;
}

