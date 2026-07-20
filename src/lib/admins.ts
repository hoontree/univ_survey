import { Firestore, type Settings } from "@google-cloud/firestore";
import { hashPassword, verifyPassword } from "@/lib/password";

/**
 * 관리자 계정 — Firestore `admins` 컬렉션, 문서 id = 아이디(소문자).
 * 비밀번호는 scrypt 해시로만 저장한다.
 */
const COLLECTION = "admins";
const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;
const MIN_PASSWORD = 8;

let db: Firestore | null = null;

function getDb(): Firestore {
  if (!db) {
    const settings: Settings = {};
    const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCP_PROJECT;
    if (projectId) settings.projectId = projectId;
    db = new Firestore(settings);
  }
  return db;
}

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export interface AdminRecord {
  username: string;
  createdAt: string;
  lastLoginAt: string | null;
}

type Result = { ok: true } | { ok: false; error: string };

export async function hasAnyAdmin(): Promise<boolean> {
  const snap = await getDb().collection(COLLECTION).limit(1).get();
  return !snap.empty;
}

export async function listAdmins(): Promise<AdminRecord[]> {
  const snap = await getDb().collection(COLLECTION).orderBy("createdAt").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      username: doc.id,
      createdAt: data.createdAt,
      lastLoginAt: data.lastLoginAt ?? null,
    };
  });
}

export async function createAdmin(username: string, password: string): Promise<Result> {
  const u = normalizeUsername(username);
  if (!USERNAME_RE.test(u)) {
    return { ok: false, error: "아이디는 영문 소문자·숫자·._- 로 3~20자여야 해요." };
  }
  if (password.length < MIN_PASSWORD) {
    return { ok: false, error: `비밀번호는 ${MIN_PASSWORD}자 이상이어야 해요.` };
  }
  const ref = getDb().collection(COLLECTION).doc(u);
  return getDb().runTransaction(async (tx): Promise<Result> => {
    const snap = await tx.get(ref);
    if (snap.exists) return { ok: false, error: "이미 사용 중인 아이디예요." };
    tx.set(ref, {
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    });
    return { ok: true };
  });
}

/** 로그인 검증 — 성공 시 lastLoginAt 갱신. */
export async function verifyLogin(username: string, password: string): Promise<boolean> {
  const u = normalizeUsername(username);
  const ref = getDb().collection(COLLECTION).doc(u);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const data = snap.data()!;
  if (!verifyPassword(password, data.passwordHash)) return false;
  await ref.update({ lastLoginAt: new Date().toISOString() });
  return true;
}

export async function changePassword(username: string, newPassword: string): Promise<Result> {
  if (newPassword.length < MIN_PASSWORD) {
    return { ok: false, error: `비밀번호는 ${MIN_PASSWORD}자 이상이어야 해요.` };
  }
  const u = normalizeUsername(username);
  const ref = getDb().collection(COLLECTION).doc(u);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "존재하지 않는 계정이에요." };
  await ref.update({ passwordHash: hashPassword(newPassword) });
  return { ok: true };
}

export async function deleteAdmin(username: string): Promise<Result> {
  const u = normalizeUsername(username);
  const all = await listAdmins();
  if (all.length <= 1) return { ok: false, error: "마지막 관리자 계정은 삭제할 수 없어요." };
  if (!all.some((a) => a.username === u)) {
    return { ok: false, error: "존재하지 않는 계정이에요." };
  }
  await getDb().collection(COLLECTION).doc(u).delete();
  return { ok: true };
}
