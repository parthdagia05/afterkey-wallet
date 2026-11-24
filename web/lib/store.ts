import * as fs from "node:fs";
import * as path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface Contact {
  name: string;
  address: string;
  addedAt: string;
}

export interface PolicyCheck {
  rule: string;
  passed: boolean;
  severity: "block" | "warn" | "info";
  detail: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  input: string;
  kind: "chat" | "balance" | "send";
  status: "answered" | "blocked" | "pending" | "approved" | "rejected" | "sent" | "failed";
  to?: string;
  toName?: string;
  amount?: number;
  checks?: PolicyCheck[];
  txHash?: string;
  error?: string;
}

export interface PendingIntent {
  id: string;
  to: string;
  toName?: string;
  amount: number;
  input: string;
  checks: PolicyCheck[];
  createdAt: number;
}

const PENDING_TTL_S = 5 * 60;
const DATA_DIR = path.join(process.cwd(), "data");

/* ---- backend: Cloudflare KV on Workers, JSON files in local dev ---- */

async function kv(): Promise<any | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as any)?.AFTERKEY_KV ?? null;
  } catch {
    return null;
  }
}

async function read<T>(key: string, fallback: T): Promise<T> {
  const store = await kv();
  if (store) {
    const raw = await store.get(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${key}.json`), "utf-8")) as T;
  } catch {
    return fallback;
  }
}

async function write(key: string, value: unknown, ttlSeconds?: number) {
  const store = await kv();
  if (store) {
    await store.put(key, JSON.stringify(value), ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, `${key}.json`), JSON.stringify(value, null, 2));
}

async function remove(key: string) {
  const store = await kv();
  if (store) {
    await store.delete(key);
    return;
  }
  try { fs.unlinkSync(path.join(DATA_DIR, `${key}.json`)); } catch { /* absent */ }
}

/* ---- contacts ---- */

export function getContacts() {
  return read<Contact[]>("contacts", []);
}

export async function saveContact(name: string, address: string) {
  const list = (await getContacts()).filter((c) => c.name.toLowerCase() !== name.toLowerCase());
  list.push({ name, address, addedAt: new Date().toISOString() });
  await write("contacts", list);
  return list;
}

export async function deleteContact(name: string) {
  const list = (await getContacts()).filter((c) => c.name.toLowerCase() !== name.toLowerCase());
  await write("contacts", list);
  return list;
}

export async function resolveContact(nameOrAddress: string) {
  const q = nameOrAddress.trim().toLowerCase();
  return (await getContacts()).find((c) => c.name.toLowerCase() === q || c.address.toLowerCase() === q);
}

/* ---- history ---- */

export function getHistory() {
  return read<HistoryEntry[]>("history", []);
}

export async function addHistory(entry: HistoryEntry) {
  const list = await getHistory();
  list.unshift(entry);
  await write("history", list.slice(0, 500));
  return entry;
}

export async function updateHistory(id: string, patch: Partial<HistoryEntry>) {
  const list = await getHistory();
  const i = list.findIndex((h) => h.id === id);
  if (i < 0) return undefined;
  list[i] = { ...list[i], ...patch };
  await write("history", list);
  return list[i];
}

export async function sentToday() {
  const today = new Date().toISOString().slice(0, 10);
  return (await getHistory()).filter((h) => h.status === "sent" && h.timestamp.slice(0, 10) === today);
}

/* ---- pending approvals (short-lived, single use) ---- */

export function putPending(p: PendingIntent) {
  return write(`pending-${p.id}`, p, PENDING_TTL_S);
}

export async function takePending(id: string) {
  const p = await read<PendingIntent | null>(`pending-${id}`, null);
  if (!p) return undefined;
  await remove(`pending-${id}`);
  if (Date.now() - p.createdAt > PENDING_TTL_S * 1000) return undefined;
  return p;
}
