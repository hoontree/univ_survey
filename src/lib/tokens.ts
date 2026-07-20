import { FieldValue, Firestore, type Settings } from "@google-cloud/firestore";

/**
 * 이용 토큰 — 우주설 수업 수강생에게만 발급되는 접근 코드.
 *
 * Firestore `tokens` 컬렉션, 문서 id = 코드(하이픈 제거 8자).
 * 한 토큰은 maxUses(기본 2)회까지 결과 발급 가능.
 * 차감은 결과 발급 시점(POST /api/responses)에 트랜잭션으로 수행한다.
 */
const COLLECTION = "tokens";
export const DEFAULT_MAX_USES = 2;

/** 혼동 문자(0/O/1/I/L) 제외 — 학생이 손으로 옮겨 적어도 안 틀리게 */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 8;

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

/** 표시용 XXXX-XXXX / 소문자 / 공백 입력을 저장 형식(8자 대문자)으로 정규화 */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function isValidCodeFormat(code: string): boolean {
  return (
    code.length === CODE_LENGTH &&
    [...code].every((ch) => CODE_ALPHABET.includes(ch))
  );
}

/** XXXX-XXXX 표시 형식 */
export function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export interface TokenRecord {
  code: string;
  uses: number;
  maxUses: number;
  createdAt: string;
  lastUsedAt: string | null;
}

/** 토큰 일괄 생성. 생성된 코드 목록 반환 (표시 형식 아님 — 저장 형식) */
export async function generateTokens(count: number): Promise<string[]> {
  const firestore = getDb();
  const batch = firestore.batch();
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomCode();
    codes.push(code);
    batch.set(firestore.collection(COLLECTION).doc(code), {
      uses: 0,
      maxUses: DEFAULT_MAX_USES,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    });
  }
  await batch.commit();
  return codes;
}

export type TokenCheck =
  | { ok: true; remaining: number }
  | { ok: false; reason: "invalid" | "exhausted" };

/** 유효성만 검사 — 차감 없음 (설문 진입 게이트용) */
export async function checkToken(rawCode: string): Promise<TokenCheck> {
  const code = normalizeCode(rawCode);
  if (!isValidCodeFormat(code)) return { ok: false, reason: "invalid" };

  const snap = await getDb().collection(COLLECTION).doc(code).get();
  if (!snap.exists) return { ok: false, reason: "invalid" };

  const data = snap.data() as Omit<TokenRecord, "code">;
  const remaining = data.maxUses - data.uses;
  if (remaining <= 0) return { ok: false, reason: "exhausted" };
  return { ok: true, remaining };
}

/**
 * 1회 차감 — 결과 발급 시점에 호출. Firestore 트랜잭션으로
 * 동시 요청이 와도 maxUses를 넘겨 차감되지 않는다.
 */
export async function consumeToken(rawCode: string): Promise<TokenCheck> {
  const code = normalizeCode(rawCode);
  if (!isValidCodeFormat(code)) return { ok: false, reason: "invalid" };

  const firestore = getDb();
  const ref = firestore.collection(COLLECTION).doc(code);

  return firestore.runTransaction(async (tx): Promise<TokenCheck> => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false, reason: "invalid" };
    const data = snap.data() as Omit<TokenRecord, "code">;
    if (data.uses >= data.maxUses) return { ok: false, reason: "exhausted" };
    tx.update(ref, {
      uses: FieldValue.increment(1),
      lastUsedAt: new Date().toISOString(),
    });
    return { ok: true, remaining: data.maxUses - data.uses - 1 };
  });
}

/** 관리자 목록 — 최근 생성순 */
export async function listTokens(): Promise<TokenRecord[]> {
  const snap = await getDb()
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({
    code: doc.id,
    ...(doc.data() as Omit<TokenRecord, "code">),
  }));
}
