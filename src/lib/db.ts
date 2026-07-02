import { openDB, type IDBPDatabase } from "idb";

export interface Note {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface Scan {
  id: string;
  noteId: string;
  text: string;
  imageBlob?: Blob;
}

const DB_NAME = "ocr-clipboard";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("DB is browser-only");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("notes")) {
          db.createObjectStore("notes", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("scans")) {
          const store = db.createObjectStore("scans", { keyPath: "id" });
          store.createIndex("by-note", "noteId");
        }
      },
    });
  }
  return dbPromise;
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export async function listNotes(): Promise<Note[]> {
  const db = await getDB();
  const notes = (await db.getAll("notes")) as Note[];
  return notes.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await getDB();
  return (await db.get("notes", id)) as Note | undefined;
}

export async function createNote(title: string): Promise<Note> {
  const db = await getDB();
  const now = Date.now();
  const note: Note = { id: uid(), title: title.trim() || "Untitled", createdAt: now, updatedAt: now };
  await db.put("notes", note);
  return note;
}

export async function renameNote(id: string, title: string) {
  const db = await getDB();
  const existing = (await db.get("notes", id)) as Note | undefined;
  if (!existing) return;
  await db.put("notes", { ...existing, title: title.trim() || "Untitled", updatedAt: Date.now() });
}

export async function deleteNote(id: string) {
  const db = await getDB();
  const tx = db.transaction(["notes", "scans"], "readwrite");
  await tx.objectStore("notes").delete(id);
  const idx = tx.objectStore("scans").index("by-note");
  let cursor = await idx.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function listScans(noteId: string): Promise<Scan[]> {
  const db = await getDB();
  const scans = (await db.getAllFromIndex("scans", "by-note", noteId)) as Scan[];
  return scans;
}

export async function addScan(noteId: string, text: string, imageBlob?: Blob): Promise<Scan> {
  const db = await getDB();
  const scan: Scan = { id: uid(), noteId, text, imageBlob };
  const tx = db.transaction(["scans", "notes"], "readwrite");
  await tx.objectStore("scans").put(scan);
  const note = (await tx.objectStore("notes").get(noteId)) as Note | undefined;
  if (note) {
    await tx.objectStore("notes").put({ ...note, updatedAt: Date.now() });
  }
  await tx.done;
  return scan;
}

export async function deleteScan(id: string) {
  const db = await getDB();
  await db.delete("scans", id);
}

export async function clearScans(noteId: string) {
  const db = await getDB();
  const tx = db.transaction("scans", "readwrite");
  const idx = tx.store.index("by-note");
  let cursor = await idx.openCursor(IDBKeyRange.only(noteId));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}
