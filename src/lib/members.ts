import crypto from "node:crypto";
import { FieldValue } from "@google-cloud/firestore";
import { getDb } from "@/lib/firestore";
import { deriveKey, keyFingerprint } from "@/lib/secret-keys";

/**
 * 인클래스 구성원 명단 — 설문 접근 권한의 원천.
 *
 * Firestore `members` 컬렉션, 문서 id = 정규화된 이메일(인클래스 아이디).
 * 한 사람은 maxUses(기본 2)회까지 결과를 받을 수 있고, 차감은 결과 발급
 * 시점(POST /api/responses)에 트랜잭션으로 수행한다.
 *
 * **휴대폰번호는 평문으로 저장하지 않는다.** ADMIN_TOKEN에서 파생한 키로
 * HMAC한 값만 두고, 관리자 화면 식별용으로 뒤 4자리(phoneTail)만 남긴다.
 * Firestore가 통째로 새더라도 미성년자 번호가 함께 새지 않게 하기 위해서다.
 */
const COLLECTION = "members";
export const DEFAULT_MAX_USES = 2;
/** 인클래스 아이디는 대부분 이 도메인이라, 학생이 아이디만 쳐도 되게 붙여준다 */
export const DEFAULT_EMAIL_DOMAIN = "inclass.co.kr";

const HEADER_EMAIL = "아이디(이메일)";
const HEADER_NAME = "이름";
const HEADER_PHONE = "휴대폰번호";
const HEADER_PARENT_PHONE = "학부모휴대폰번호";
const HEADER_STATUS = "소속상태";
/** `그룹(반)1`, `그룹(반)2`… — 여러 반에 속하면 열이 늘어난다 */
const HEADER_GROUP_PREFIX = "그룹(반)";

export class MemberSheetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemberSheetError";
  }
}

/* ── 정규화 (순수) ── */

/**
 * 인클래스 아이디를 문서 id로. `@`가 없으면 기본 도메인을 붙인다.
 * Firestore 문서 id 규칙(`/` 불가, `.`/`..` 불가, `__…__` 불가)도 여기서 막는다.
 */
export function normalizeEmail(input: string | null | undefined): string | null {
  const value = (input ?? "").trim().toLowerCase();
  if (!value) return null;
  const email = value.includes("@") ? value : `${value}@${DEFAULT_EMAIL_DOMAIN}`;
  if (email.length > 200) return null;
  if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) return null;
  if (email === "." || email === ".." || /^__.*__$/.test(email)) return null;
  return email;
}

/**
 * 휴대폰번호를 숫자 11자리(구형은 10자리)로.
 * `+82 10-1234-5678`, `010 1234 5678`, 엑셀에서 숫자로 바뀌어 앞 0이 날아간
 * `1012345678` 모두 같은 값이 된다.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  let digits = (input ?? "").replace(/\D/g, "");
  if (digits.startsWith("82")) digits = `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith("10")) digits = `0${digits}`;
  return /^01\d{8,9}$/.test(digits) ? digits : null;
}

/** 뒤 4자리 — 관리자가 명단에서 사람을 알아보는 용도 */
export function phoneTail(phone: string | null): string {
  return phone ? phone.slice(-4) : "";
}

export function hashPhone(phone: string): string {
  return crypto.createHmac("sha256", deriveKey("member-phone/v1")).update(phone).digest("hex");
}

/* ── 엑셀 해석 (순수) ── */

export interface ParsedMember {
  email: string;
  name: string;
  /** 정규화된 숫자 — Firestore에 그대로 들어가지 않는다 */
  phone: string | null;
  parentPhone: string | null;
  status: string;
  groups: string[];
}

export interface SheetIssue {
  /** 엑셀에서 보이는 행 번호(1-base) */
  row: number;
  message: string;
}

export interface ParsedSheet {
  members: ParsedMember[];
  warnings: SheetIssue[];
  errors: SheetIssue[];
}

/**
 * 인클래스 구성원 엑셀 격자 → 명단.
 *
 * 헤더는 **위치가 아니라 이름으로** 찾는다. 인클래스가 열 순서를 바꾸거나
 * 열을 하나 끼워 넣어도 번호 칸을 학교 칸으로 읽는 사고가 나지 않게.
 */
export function parseMemberSheet(grid: string[][]): ParsedSheet {
  const header = (grid[0] ?? []).map((cell) => cell.trim());
  const at = (name: string) => header.indexOf(name);

  const emailCol = at(HEADER_EMAIL);
  if (emailCol < 0) {
    throw new MemberSheetError(
      `엑셀 첫 줄에서 '${HEADER_EMAIL}' 열을 찾지 못했어요. 인클래스에서 내려받은 구성원 목록 파일이 맞는지 확인해 주세요.`,
    );
  }
  const phoneCol = at(HEADER_PHONE);
  const parentPhoneCol = at(HEADER_PARENT_PHONE);
  if (phoneCol < 0 && parentPhoneCol < 0) {
    throw new MemberSheetError(
      `엑셀 첫 줄에서 '${HEADER_PHONE}' 열도 '${HEADER_PARENT_PHONE}' 열도 찾지 못했어요. 본인 확인에 쓸 번호가 없습니다.`,
    );
  }
  const nameCol = at(HEADER_NAME);
  const statusCol = at(HEADER_STATUS);
  const groupCols = header
    .map((cell, index) => (cell.startsWith(HEADER_GROUP_PREFIX) ? index : -1))
    .filter((index) => index >= 0);

  const cell = (row: string[], col: number) => (col < 0 ? "" : (row[col] ?? "").trim());

  const byEmail = new Map<string, ParsedMember>();
  const warnings: SheetIssue[] = [];
  const errors: SheetIssue[] = [];

  for (let i = 1; i < grid.length; i++) {
    const row = grid[i] ?? [];
    const rowNumber = i + 1;
    if (row.every((value) => !value.trim())) continue;

    const email = normalizeEmail(cell(row, emailCol));
    if (!email) {
      errors.push({ row: rowNumber, message: "아이디(이메일)가 비어 있거나 형식이 올바르지 않아요." });
      continue;
    }

    const phone = normalizePhone(cell(row, phoneCol));
    const parentPhone = normalizePhone(cell(row, parentPhoneCol));
    if (!phone && !parentPhone) {
      errors.push({
        row: rowNumber,
        message: "휴대폰번호와 학부모휴대폰번호가 모두 없어서 본인 확인을 할 수 없어요.",
      });
      continue;
    }

    if (byEmail.has(email)) {
      warnings.push({ row: rowNumber, message: "같은 아이디가 파일 안에 두 번 나와요. 뒤쪽 줄을 사용합니다." });
    }

    byEmail.set(email, {
      email,
      name: cell(row, nameCol),
      phone,
      parentPhone,
      status: cell(row, statusCol),
      groups: groupCols.map((col) => cell(row, col)).filter(Boolean),
    });
  }

  return { members: [...byEmail.values()], warnings, errors };
}

/* ── 문서 (순수) ── */

export interface MemberDoc {
  name: string;
  phoneHash: string | null;
  parentPhoneHash: string | null;
  phoneTail: string;
  status: string;
  groups: string[];
  /** 번호 해시를 만든 키의 지문 — ADMIN_TOKEN 교체를 알아채기 위한 것 */
  keyFp: string;
  uses: number;
  maxUses: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

export interface MemberRecord extends MemberDoc {
  email: string;
}

/** 재업로드 시 덮어써도 되는 필드만 */
type MemberUpdate = Pick<
  MemberDoc,
  "name" | "phoneHash" | "parentPhoneHash" | "phoneTail" | "status" | "groups" | "keyFp" | "updatedAt"
>;

export interface UpsertPlan {
  creates: { email: string; data: MemberDoc }[];
  updates: { email: string; data: MemberUpdate }[];
}

/**
 * 기존 문서와 대조해 생성/갱신을 나눈다.
 *
 * `uses`·`maxUses`·`createdAt`은 **생성 쪽에만 존재한다.** 통짜 merge 대신
 * 타입으로 갈라 둔 이유가 이것 — 명단을 다시 올렸다고 학생의 사용 횟수가
 * 슬그머니 초기화되는 일이 구조적으로 불가능해야 한다.
 * `groups`는 반별로 파일이 따로 나오므로 **합집합**으로 쌓는다.
 */
export function planUpsert(
  existing: Map<string, Pick<MemberDoc, "groups">>,
  members: ParsedMember[],
  keyFp: string,
  now: string,
): UpsertPlan {
  const plan: UpsertPlan = { creates: [], updates: [] };

  for (const member of members) {
    const shared: MemberUpdate = {
      name: member.name,
      phoneHash: member.phone ? hashPhone(member.phone) : null,
      parentPhoneHash: member.parentPhone ? hashPhone(member.parentPhone) : null,
      phoneTail: phoneTail(member.phone ?? member.parentPhone),
      status: member.status,
      groups: member.groups,
      keyFp,
      updatedAt: now,
    };

    const prior = existing.get(member.email);
    if (prior) {
      plan.updates.push({
        email: member.email,
        data: { ...shared, groups: [...new Set([...(prior.groups ?? []), ...member.groups])] },
      });
    } else {
      plan.creates.push({
        email: member.email,
        data: { ...shared, uses: 0, maxUses: DEFAULT_MAX_USES, createdAt: now, lastUsedAt: null },
      });
    }
  }

  return plan;
}

export type MemberCheck =
  | { ok: true; remaining: number; name: string }
  | { ok: false; reason: "invalid" | "exhausted" | "stale" };

function hashEquals(stored: string | null | undefined, attempt: string): boolean {
  if (!stored || stored.length !== attempt.length) return false;
  return crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(attempt));
}

/**
 * 본인 확인 판정. 번호는 **본인·학부모 둘 중 하나만 맞으면** 통과한다
 * (인클래스에 본인 번호가 비어 있거나 잘못 들어간 학생이 적지 않다).
 *
 * 번호 불일치를 사용 횟수 소진보다 **먼저** 판정한다 — 그래야 남의 아이디로
 * 아무 번호나 넣어 "이 사람은 이미 다 썼다"는 사실을 알아낼 수 없다.
 */
export function evaluateMember(
  doc: MemberDoc,
  attempt: { phoneHash: string; keyFp: string },
): MemberCheck {
  if (doc.keyFp !== attempt.keyFp) return { ok: false, reason: "stale" };
  if (!hashEquals(doc.phoneHash, attempt.phoneHash) && !hashEquals(doc.parentPhoneHash, attempt.phoneHash)) {
    return { ok: false, reason: "invalid" };
  }
  if (doc.uses >= doc.maxUses) return { ok: false, reason: "exhausted" };
  return { ok: true, remaining: doc.maxUses - doc.uses, name: doc.name };
}

/* ── Firestore ── */

/** 엑셀 업로드 반영 — 병합(추가·갱신만). 파일에 없는 사람은 건드리지 않는다. */
export async function upsertMembers(
  members: ParsedMember[],
): Promise<{ added: number; updated: number }> {
  if (members.length === 0) return { added: 0, updated: 0 };

  const firestore = getDb();
  const collection = firestore.collection(COLLECTION);
  const existing = new Map<string, Pick<MemberDoc, "groups">>();

  for (let i = 0; i < members.length; i += 300) {
    const refs = members.slice(i, i + 300).map((member) => collection.doc(member.email));
    for (const snap of await firestore.getAll(...refs)) {
      if (snap.exists) existing.set(snap.id, { groups: snap.get("groups") ?? [] });
    }
  }

  const plan = planUpsert(existing, members, keyFingerprint(), new Date().toISOString());
  const writes = [
    ...plan.creates.map((entry) => ({ ...entry, merge: false })),
    ...plan.updates.map((entry) => ({ ...entry, merge: true })),
  ];
  for (let i = 0; i < writes.length; i += 400) {
    const batch = firestore.batch();
    for (const write of writes.slice(i, i + 400)) {
      batch.set(collection.doc(write.email), write.data, { merge: write.merge });
    }
    await batch.commit();
  }

  return { added: plan.creates.length, updated: plan.updates.length };
}

/** 설문 진입 게이트 — 차감 없음 */
export async function verifyMember(rawEmail: string, rawPhone: string): Promise<MemberCheck> {
  const email = normalizeEmail(rawEmail);
  const phone = normalizePhone(rawPhone);
  if (!email || !phone) return { ok: false, reason: "invalid" };

  const snap = await getDb().collection(COLLECTION).doc(email).get();
  if (!snap.exists) return { ok: false, reason: "invalid" };
  return evaluateMember(snap.data() as MemberDoc, {
    phoneHash: hashPhone(phone),
    keyFp: keyFingerprint(),
  });
}

/**
 * 1회 차감 — 결과 발급 시점에 호출. 번호는 다시 보지 않는다(이미 발급된
 * 학생 토큰이 본인 확인을 마쳤다는 증명이다). 동시 요청에도 maxUses를
 * 넘겨 차감되지 않도록 트랜잭션으로 처리한다.
 */
export async function consumeMemberUse(email: string): Promise<MemberCheck> {
  const firestore = getDb();
  const ref = firestore.collection(COLLECTION).doc(email);

  return firestore.runTransaction(async (tx): Promise<MemberCheck> => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false, reason: "invalid" };
    const doc = snap.data() as MemberDoc;
    if (doc.uses >= doc.maxUses) return { ok: false, reason: "exhausted" };
    tx.update(ref, { uses: FieldValue.increment(1), lastUsedAt: new Date().toISOString() });
    return { ok: true, remaining: doc.maxUses - doc.uses - 1, name: doc.name };
  });
}

/** 관리자 목록 — 이름순 */
export async function listMembers(): Promise<MemberRecord[]> {
  const snap = await getDb().collection(COLLECTION).orderBy("name").get();
  return snap.docs.map((doc) => ({ email: doc.id, ...(doc.data() as MemberDoc) }));
}

/** 사용 횟수 초기화 — 2회를 다 쓴 학생을 선생님이 다시 열어주는 경로 */
export async function resetMemberUses(rawEmail: string): Promise<boolean> {
  const email = normalizeEmail(rawEmail);
  if (!email) return false;
  const ref = getDb().collection(COLLECTION).doc(email);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.update({ uses: 0, updatedAt: new Date().toISOString() });
  return true;
}

/** 명단 전체 삭제 — 학기 종료 시 개인정보 파기 */
export async function deleteAllMembers(): Promise<number> {
  const firestore = getDb();
  const snap = await firestore.collection(COLLECTION).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = firestore.batch();
    for (const doc of snap.docs.slice(i, i + 400)) batch.delete(doc.ref);
    await batch.commit();
  }
  return snap.size;
}
