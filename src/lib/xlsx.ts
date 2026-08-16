import { inflateRawSync } from "node:zlib";

/**
 * .xlsx 리더 — 관리자가 올린 인클래스 구성원 명단을 읽기 위한 최소 구현.
 *
 * 외부 라이브러리를 쓰지 않는 이유: npm의 `xlsx`는 0.18.5에 묶인 채 미패치
 * 취약점이 있고 배포가 자체 CDN으로 옮겨가 `npm ci` 재현성이 깨진다.
 * 여기서 필요한 건 "문자열 격자 하나"뿐이라 직접 읽는 편이 싸다.
 *
 * 관대하게 넘어가지 말고 **명확한 한국어 에러로 거절**하는 쪽을 택했다.
 * 명단이 조용히 절반만 들어오는 것보다 업로드가 실패하는 편이 낫다.
 *
 * 날짜 시리얼(1900 epoch)은 **구현하지 않는다** — 인증에 쓰는 칸(이메일·번호)에
 * 날짜가 없고 가입일·생년월일은 아예 가져오지 않는다. 날짜 서식 셀은 원본
 * 숫자 문자열로 나온다.
 */

export class XlsxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XlsxError";
  }
}

/** 압축 폭탄 방지 — 명단 파일은 현실적으로 수백 KB다 */
const MAX_ENTRY_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
/** 셀 좌표(r 속성)는 신뢰할 수 없으므로 격자 크기도 막아둔다 */
const MAX_ROWS = 50_000;
const MAX_COLS = 200;

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const ZIP64_SENTINEL = 0xffffffff;

/* ── ZIP ── */

interface ZipEntry {
  method: number;
  flags: number;
  compSize: number;
  rawSize: number;
  localOffset: number;
}

interface Zip {
  read(name: string): string | null;
}

/**
 * central directory를 읽어 엔트리를 인덱싱한다.
 * local header를 앞에서부터 훑지 않는 이유: data descriptor가 붙은 파일은
 * local header의 크기 필드가 0이라 그 방식으론 엔트리 경계를 못 찾는다.
 */
function openZip(bytes: Uint8Array): Zip {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (bytes.length >= 4 && view.getUint32(0, true) === 0xe011cfd0) {
    throw new XlsxError(
      "옛 .xls 형식이에요. 엑셀에서 [다른 이름으로 저장] → .xlsx로 저장한 뒤 다시 올려주세요.",
    );
  }
  if (bytes.length < 22 || view.getUint32(0, true) !== SIG_LOCAL) {
    throw new XlsxError("엑셀(.xlsx) 파일이 아니에요. 파일을 다시 확인해 주세요.");
  }

  // EOCD는 파일 끝에 있고 주석(최대 65535B)이 뒤에 붙을 수 있다
  let eocd = -1;
  const scanFrom = Math.max(0, bytes.length - 22 - 0xffff);
  for (let i = bytes.length - 22; i >= scanFrom; i--) {
    if (view.getUint32(i, true) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new XlsxError("엑셀 파일이 손상된 것 같아요. 다시 내려받아 올려주세요.");

  const totalEntries = view.getUint16(eocd + 10, true);
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  if (totalEntries === 0xffff || cdSize === ZIP64_SENTINEL || cdOffset === ZIP64_SENTINEL) {
    throw new XlsxError("너무 큰 엑셀 파일이에요(zip64). 명단만 남겨 다시 저장해 주세요.");
  }

  const entries = new Map<string, ZipEntry>();
  let cursor = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== SIG_CENTRAL) {
      throw new XlsxError("엑셀 파일이 손상된 것 같아요. 다시 내려받아 올려주세요.");
    }
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compSize = view.getUint32(cursor + 20, true);
    const rawSize = view.getUint32(cursor + 24, true);
    const nameLen = view.getUint16(cursor + 28, true);
    const extraLen = view.getUint16(cursor + 30, true);
    const commentLen = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen));

    if (!name.endsWith("/")) {
      if (compSize === ZIP64_SENTINEL || rawSize === ZIP64_SENTINEL || localOffset === ZIP64_SENTINEL) {
        throw new XlsxError("너무 큰 엑셀 파일이에요(zip64). 명단만 남겨 다시 저장해 주세요.");
      }
      entries.set(name, { method, flags, compSize, rawSize, localOffset });
    }
    cursor += 46 + nameLen + extraLen + commentLen;
  }

  let spent = 0;
  const decoder = new TextDecoder("utf-8");

  return {
    read(name) {
      const entry = entries.get(name);
      if (!entry) return null;

      if (entry.flags & 0x1) {
        throw new XlsxError("암호가 걸린 파일은 열 수 없어요. 암호를 해제하고 다시 올려주세요.");
      }
      if (entry.method !== 0 && entry.method !== 8) {
        throw new XlsxError("지원하지 않는 압축 형식이에요. 엑셀에서 .xlsx로 다시 저장해 주세요.");
      }
      // central directory 값은 공격자가 정하는 값이라 해제 전/후 두 번 본다
      if (entry.rawSize > MAX_ENTRY_BYTES) throw new XlsxError("엑셀 파일이 너무 커요.");

      const head = entry.localOffset;
      if (head + 30 > bytes.length || view.getUint32(head, true) !== SIG_LOCAL) {
        throw new XlsxError("엑셀 파일이 손상된 것 같아요. 다시 내려받아 올려주세요.");
      }
      // local header의 extra 길이는 central directory의 값과 다를 수 있다
      const dataStart =
        head + 30 + view.getUint16(head + 26, true) + view.getUint16(head + 28, true);
      const raw = bytes.subarray(dataStart, dataStart + entry.compSize);

      const out = entry.method === 0 ? raw : inflateRawSync(raw, { maxOutputLength: MAX_ENTRY_BYTES });
      spent += out.length;
      if (out.length > MAX_ENTRY_BYTES || spent > MAX_TOTAL_BYTES) {
        throw new XlsxError("엑셀 파일이 너무 커요.");
      }
      return decoder.decode(out);
    },
  };
}

/* ── XML ── */

/** 네임스페이스 접두사(`<x:c>`)를 허용하는 태그 패턴 */
function tag(name: string, flags = "g"): RegExp {
  return new RegExp(
    `<(?:[A-Za-z0-9]+:)?${name}\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/(?:[A-Za-z0-9]+:)?${name}>)`,
    flags,
  );
}

/** 접두사 있는 속성(`r:id`)도 이름만으로 찾는다 */
function attr(attrs: string, name: string): string | null {
  const m = new RegExp(`(?:^|\\s)(?:[A-Za-z0-9]+:)?${name}\\s*=\\s*"([^"]*)"`).exec(attrs);
  return m ? decodeEntities(m[1]) : null;
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, (whole, code: string) => {
    if (code[0] === "#") {
      const point =
        code[1] === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : whole;
    }
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[code] ?? whole;
  });
}

/** `<t>` 조각들을 이어붙인다. `<rPh>`(한글 발음 힌트)는 본문이 아니라 먼저 뗀다. */
function textOf(xml: string): string {
  let out = "";
  for (const m of xml.replace(/<(?:[A-Za-z0-9]+:)?rPh\b[\s\S]*?<\/(?:[A-Za-z0-9]+:)?rPh>/g, "").matchAll(tag("t"))) {
    out += decodeEntities(m[2] ?? "");
  }
  return out;
}

/** `AB12` → 27 (0-base) */
function columnIndex(ref: string): number {
  let index = 0;
  for (const ch of ref) {
    const code = ch.charCodeAt(0);
    if (code < 65 || code > 90) break;
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

/** rels의 Target을 zip 내부 경로로 (상대·절대·`../` 모두) */
function resolvePath(baseDir: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = baseDir.split("/").filter(Boolean);
  for (const segment of target.split("/")) {
    if (segment === "..") parts.pop();
    else if (segment !== "." && segment !== "") parts.push(segment);
  }
  return parts.join("/");
}

/**
 * 첫 번째(숨김 아닌) 시트를 문자열 격자로 읽는다. 빈 칸은 "".
 * 실패는 전부 사용자에게 보여줄 수 있는 한국어 메시지의 XlsxError.
 */
export function parseXlsx(bytes: Uint8Array): string[][] {
  const zip = openZip(bytes);

  const workbook = zip.read("xl/workbook.xml");
  if (!workbook) throw new XlsxError("엑셀(.xlsx) 파일이 아니에요. 파일을 다시 확인해 주세요.");

  // 시트 파일 이름을 추측하면 안 된다 — 실제 인클래스 파일은 시트가 rId4에 걸려 있다
  let relId: string | null = null;
  for (const m of workbook.matchAll(tag("sheet"))) {
    const state = attr(m[1], "state");
    if (state === "hidden" || state === "veryHidden") continue;
    relId = attr(m[1], "id");
    break;
  }
  if (!relId) throw new XlsxError("엑셀 파일에 읽을 수 있는 시트가 없어요.");

  const rels = zip.read("xl/_rels/workbook.xml.rels");
  if (!rels) throw new XlsxError("엑셀 파일이 손상된 것 같아요. 다시 내려받아 올려주세요.");

  let sheetPath: string | null = null;
  for (const m of rels.matchAll(tag("Relationship"))) {
    if (attr(m[1], "Id") !== relId) continue;
    const target = attr(m[1], "Target");
    if (target) sheetPath = resolvePath("xl", target);
    break;
  }
  const sheetXml = sheetPath ? zip.read(sheetPath) : null;
  if (!sheetXml) throw new XlsxError("엑셀 파일에 읽을 수 있는 시트가 없어요.");

  const sharedXml = zip.read("xl/sharedStrings.xml");
  const shared: string[] = [];
  if (sharedXml) {
    for (const m of sharedXml.matchAll(tag("si"))) shared.push(textOf(m[2] ?? ""));
  }

  const grid: string[][] = [];
  let cursorRow = 0;
  for (const rowMatch of sheetXml.matchAll(tag("row"))) {
    const declared = attr(rowMatch[1], "r");
    const rowIndex = declared ? Number.parseInt(declared, 10) - 1 : cursorRow;
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= MAX_ROWS) {
      throw new XlsxError("엑셀 시트가 너무 커요. 명단만 남겨 다시 저장해 주세요.");
    }
    cursorRow = rowIndex + 1;

    const cells: string[] = [];
    let cursorCol = 0;
    for (const cellMatch of (rowMatch[2] ?? "").matchAll(tag("c"))) {
      const ref = attr(cellMatch[1], "r");
      const col = ref ? columnIndex(ref) : cursorCol;
      if (col < 0 || col >= MAX_COLS) {
        throw new XlsxError("엑셀 시트가 너무 커요. 명단만 남겨 다시 저장해 주세요.");
      }
      cursorCol = col + 1;

      const type = attr(cellMatch[1], "t");
      const body = cellMatch[2] ?? "";
      let value = "";
      if (type === "inlineStr") {
        value = textOf(body);
      } else if (type === "e") {
        value = "";
      } else {
        const v = tag("v", "").exec(body);
        const raw = v ? decodeEntities(v[2] ?? "") : "";
        value = type === "s" ? (shared[Number.parseInt(raw, 10)] ?? "") : raw;
      }

      while (cells.length < col) cells.push("");
      cells[col] = value;
    }

    while (grid.length < rowIndex) grid.push([]);
    grid[rowIndex] = cells;
  }

  return grid;
}
