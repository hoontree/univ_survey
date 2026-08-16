import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { XlsxError, parseXlsx } from "@/lib/xlsx";

/* ── 테스트용 .xlsx 생성기 ──
 * 실제 명단은 개인정보라 커밋할 수 없다. 바이너리 픽스처 대신 여기서
 * zip을 직접 만들어 쓴다(CRC는 리더가 보지 않으므로 0으로 둔다). */

interface Entry {
  name: string;
  data: string;
  /** 압축 없이(method 0) 저장 */
  store?: boolean;
  /** central directory에는 없고 local header에만 붙는 extra — 실제로 흔하다 */
  localExtra?: number;
  /** 손상 시나리오 주입 */
  method?: number;
  flags?: number;
  rawSize?: number;
}

function zip(entries: Entry[], corrupt?: { cdSize?: number }): Uint8Array {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const raw = Buffer.from(entry.data, "utf8");
    const store = entry.store ?? false;
    const body = store ? raw : deflateRawSync(raw);
    const method = entry.method ?? (store ? 0 : 8);
    const flags = entry.flags ?? 0;
    const rawSize = entry.rawSize ?? raw.length;
    const extra = Buffer.alloc(entry.localExtra ?? 0);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(rawSize, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(extra.length, 28);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(flags, 8);
    dir.writeUInt16LE(method, 10);
    dir.writeUInt32LE(0, 16);
    dir.writeUInt32LE(body.length, 20);
    dir.writeUInt32LE(rawSize, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt16LE(0, 30); // central의 extra 길이는 local과 다르다
    dir.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([dir, name]));

    chunks.push(local, name, extra, body);
    offset += local.length + name.length + extra.length + body.length;
  }

  const cd = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(corrupt?.cdSize ?? cd.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return new Uint8Array(Buffer.concat([...chunks, cd, eocd]));
}

/** 실제 인클래스 파일과 같은 레이아웃: 시트가 rId1이 아니라 **rId4**에 걸려 있다 */
function workbook(sheetXml: string, shared: string[] = [], extra: Entry[] = []): Uint8Array {
  return zip([
    {
      name: "xl/workbook.xml",
      data: `<workbook><sheets><sheet sheetId="1" name="구성원리스트" state="visible" r:id="rId4"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data:
        `<Relationships>` +
        `<Relationship Id="rId1" Target="styles.xml"/>` +
        `<Relationship Id="rId3" Target="sharedStrings.xml"/>` +
        `<Relationship Id="rId4" Target="worksheets/sheet1.xml"/>` +
        `</Relationships>`,
    },
    {
      name: "xl/sharedStrings.xml",
      data: `<sst>${shared.map((s) => `<si><t>${s}</t></si>`).join("")}</sst>`,
      store: true, // stored(method 0) 경로도 함께 태운다
    },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml, localExtra: 6 },
    ...extra,
  ]);
}

const sharedRow = (row: number, indexes: number[]) =>
  `<row r="${row}">${indexes
    .map((i, col) => `<c r="${String.fromCharCode(65 + col)}${row}" t="s"><v>${i}</v></c>`)
    .join("")}</row>`;

describe("parseXlsx — ZIP", () => {
  it("deflate·stored 엔트리를 모두 읽고, 시트를 rId 간접 참조로 찾는다", () => {
    const bytes = workbook(
      `<sheetData>${sharedRow(1, [0, 1])}${sharedRow(2, [2, 3])}</sheetData>`,
      ["이름", "아이디(이메일)", "홍길동", "abcd1234@inclass.co.kr"],
    );
    expect(parseXlsx(bytes)).toEqual([
      ["이름", "아이디(이메일)"],
      ["홍길동", "abcd1234@inclass.co.kr"],
    ]);
  });

  it("local header의 extra 길이가 central과 달라도 데이터 위치를 맞게 찾는다", () => {
    // sheet1.xml에 localExtra: 6이 붙어 있다 — central 값을 그대로 쓰면 6바이트 밀린다
    const bytes = workbook(`<sheetData>${sharedRow(1, [0])}</sheetData>`, ["정상"]);
    expect(parseXlsx(bytes)[0][0]).toBe("정상");
  });

  it("암호가 걸린 파일은 안내와 함께 거절한다", () => {
    const bytes = zip([
      { name: "xl/workbook.xml", data: `<workbook><sheets><sheet r:id="rId1"/></sheets></workbook>`, flags: 0x1 },
    ]);
    expect(() => parseXlsx(bytes)).toThrow(/암호/);
  });

  it("지원하지 않는 압축 형식(AES 등)은 거절한다", () => {
    const bytes = zip([
      { name: "xl/workbook.xml", data: `<workbook><sheets><sheet r:id="rId1"/></sheets></workbook>`, method: 99 },
    ]);
    expect(() => parseXlsx(bytes)).toThrow(/압축 형식/);
  });

  it("zip64 파일은 거절한다", () => {
    const bytes = zip([{ name: "xl/workbook.xml", data: "<workbook/>" }], { cdSize: 0xffffffff });
    expect(() => parseXlsx(bytes)).toThrow(/zip64/);
  });

  it("해제 크기가 상한을 넘는다고 신고된 엔트리는 열지 않는다", () => {
    const bytes = zip([
      { name: "xl/workbook.xml", data: "<workbook/>", rawSize: 999_999_999 },
    ]);
    expect(() => parseXlsx(bytes)).toThrow(/너무 커요/);
  });

  it("옛 .xls는 변환 안내를 준다", () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(() => parseXlsx(ole)).toThrow(/\.xlsx/);
  });

  it("엑셀 파일이 아니면 거절한다", () => {
    expect(() => parseXlsx(new TextEncoder().encode("이건 그냥 텍스트입니다"))).toThrow(XlsxError);
  });
});

describe("parseXlsx — XML", () => {
  it("rPh(발음 힌트)를 본문으로 착각하지 않는다", () => {
    const bytes = zip([
      { name: "xl/workbook.xml", data: `<workbook><sheets><sheet r:id="rId1"/></sheets></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", data: `<Relationships><Relationship Id="rId1" Target="/xl/worksheets/s.xml"/></Relationships>` },
      { name: "xl/sharedStrings.xml", data: `<sst><si><t>김철수</t><rPh sb="0" eb="3"><t>キムチョルス</t></rPh></si></sst>` },
      { name: "xl/worksheets/s.xml", data: `<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData>` },
    ]);
    expect(parseXlsx(bytes)[0][0]).toBe("김철수");
  });

  it("XML 엔티티를 디코드한다", () => {
    const bytes = workbook(`<sheetData>${sharedRow(1, [0])}</sheetData>`, [
      "A&amp;B 고등학교 &lt;본교&gt; &#48156;",
    ]);
    expect(parseXlsx(bytes)[0][0]).toBe("A&B 고등학교 <본교> 발");
  });

  it("inlineStr·숫자·빈 셀·네임스페이스 접두사 태그를 처리한다", () => {
    const bytes = zip([
      { name: "xl/workbook.xml", data: `<x:workbook><x:sheets><x:sheet r:id="rId1"/></x:sheets></x:workbook>` },
      { name: "xl/_rels/workbook.xml.rels", data: `<Relationships><Relationship Id="rId1" Target="worksheets/s.xml"/></Relationships>` },
      {
        name: "xl/worksheets/s.xml",
        data:
          `<x:sheetData><x:row r="1">` +
          `<x:c r="A1" t="inlineStr"><x:is><x:t>홍길동</x:t></x:is></x:c>` +
          `<x:c r="B1"/>` +
          `<x:c r="C1"><x:v>1012345678</x:v></x:c>` +
          `</x:row></x:sheetData>`,
      },
    ]);
    expect(parseXlsx(bytes)[0]).toEqual(["홍길동", "", "1012345678"]);
  });

  it("건너뛴 열·행을 빈 칸으로 채워 자리를 맞춘다", () => {
    // 엑셀 왕복 후에는 뒤쪽 빈 셀이 통째로 빠진다 — 위치로 읽어야 열이 안 밀린다
    const bytes = zip([
      { name: "xl/workbook.xml", data: `<workbook><sheets><sheet r:id="rId1"/></sheets></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", data: `<Relationships><Relationship Id="rId1" Target="worksheets/s.xml"/></Relationships>` },
      {
        name: "xl/worksheets/s.xml",
        data:
          `<sheetData>` +
          `<row r="1"><c r="A1" t="str"><v>첫행</v></c></row>` +
          `<row r="3"><c r="C3" t="str"><v>C열</v></c></row>` +
          `</sheetData>`,
      },
    ]);
    const grid = parseXlsx(bytes);
    expect(grid).toHaveLength(3);
    expect(grid[0]).toEqual(["첫행"]);
    expect(grid[1]).toEqual([]);
    expect(grid[2]).toEqual(["", "", "C열"]);
  });

  it("숨긴 시트는 건너뛰고 보이는 시트를 읽는다", () => {
    const bytes = zip([
      {
        name: "xl/workbook.xml",
        data:
          `<workbook><sheets>` +
          `<sheet name="숨김" state="hidden" r:id="rId1"/>` +
          `<sheet name="명단" r:id="rId2"/>` +
          `</sheets></workbook>`,
      },
      {
        name: "xl/_rels/workbook.xml.rels",
        data:
          `<Relationships>` +
          `<Relationship Id="rId1" Target="worksheets/hidden.xml"/>` +
          `<Relationship Id="rId2" Target="worksheets/real.xml"/>` +
          `</Relationships>`,
      },
      { name: "xl/worksheets/hidden.xml", data: `<sheetData><row r="1"><c r="A1" t="str"><v>숨김</v></c></row></sheetData>` },
      { name: "xl/worksheets/real.xml", data: `<sheetData><row r="1"><c r="A1" t="str"><v>명단</v></c></row></sheetData>` },
    ]);
    expect(parseXlsx(bytes)[0][0]).toBe("명단");
  });

  it("시트를 찾을 수 없으면 XlsxError", () => {
    const bytes = zip([
      { name: "xl/workbook.xml", data: `<workbook><sheets><sheet r:id="rId9"/></sheets></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", data: `<Relationships/>` },
    ]);
    expect(() => parseXlsx(bytes)).toThrow(/시트/);
  });
});
