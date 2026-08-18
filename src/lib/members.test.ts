import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_USES,
  MemberSheetError,
  type MemberDoc,
  evaluateMember,
  hashPhone,
  maskName,
  normalizeEmail,
  normalizePhone,
  parseMemberSheet,
  planUpsert,
} from "@/lib/members";

// describe 본문(모듈 로드 시점)에서 hashPhone을 부르므로 beforeAll보다 먼저 필요하다
process.env.ADMIN_TOKEN = "test-secret-key";

const HEADER = [
  "이름",
  "아이디(이메일)",
  "휴대폰번호",
  "가입일",
  "최근로그인",
  "소속상태",
  "마케팅동의여부",
  "성별",
  "생년월일",
  "학년",
  "학교",
  "학부모휴대폰번호",
  "그룹(반)1",
];

const row = (
  name: string,
  email: string,
  phone: string,
  parentPhone: string,
  group = "고3_수리논술",
) => [name, email, phone, "2026-07-15", "2026-08-03", "재원", "N", "", "", "", "", parentPhone, group];

describe("normalizeEmail", () => {
  it("아이디만 입력하면 인클래스 도메인을 붙인다", () => {
    // 인클래스 아이디는 랜덤 8자라 학생이 도메인까지 외우고 있지 않다
    expect(normalizeEmail("v3yxm46h")).toBe("v3yxm46h@inclass.co.kr");
    expect(normalizeEmail("  V3YXM46H  ")).toBe("v3yxm46h@inclass.co.kr");
  });

  it("전체 주소는 소문자로 그대로 둔다", () => {
    expect(normalizeEmail("Wjsmath@Gmail.com")).toBe("wjsmath@gmail.com");
  });

  it("형식 오류·문서 id로 못 쓰는 값은 null", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail("a b@c.kr")).toBeNull();
    expect(normalizeEmail("a/b@c.kr")).toBeNull(); // Firestore 문서 id에 / 불가
    expect(normalizeEmail("도메인없음@")).toBeNull();
    expect(normalizeEmail(`${"a".repeat(250)}@b.kr`)).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("구분자·국가번호·앞자리 0 손실을 모두 흡수한다", () => {
    expect(normalizePhone("01012345678")).toBe("01012345678");
    expect(normalizePhone("010-1234-5678")).toBe("01012345678");
    expect(normalizePhone("010 1234 5678")).toBe("01012345678");
    expect(normalizePhone("+82 10-1234-5678")).toBe("01012345678");
    // 엑셀에서 숫자로 저장되면 앞의 0이 사라진다
    expect(normalizePhone("1012345678")).toBe("01012345678");
  });

  it("구형 10자리 번호도 받는다", () => {
    expect(normalizePhone("011-123-4567")).toBe("0111234567");
  });

  it("번호가 아니면 null", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("02-123-4567")).toBeNull();
    expect(normalizePhone("0101234")).toBeNull();
  });
});

describe("parseMemberSheet", () => {
  it("헤더 이름으로 열을 찾는다 — 순서가 바뀌어도 안전", () => {
    const shuffled = [
      ["학교", "휴대폰번호", "아이디(이메일)", "그룹(반)1", "이름", "소속상태"],
      ["", "010-1111-2222", "abcd1234", "고3_A", "홍길동", "재원"],
    ];
    const { members, errors } = parseMemberSheet(shuffled);
    expect(errors).toEqual([]);
    expect(members[0]).toEqual({
      email: "abcd1234@inclass.co.kr",
      name: "홍길동",
      phone: "01011112222",
      parentPhone: null,
      status: "재원",
      groups: ["고3_A"],
    });
  });

  it("실제 인클래스 열 구성을 그대로 읽는다", () => {
    const { members, errors, warnings } = parseMemberSheet([
      HEADER,
      row("김철수", "v3yxm46h", "01011112222", "01033334444"),
      row("이영희", "tav62xry", "", "01055556666"), // 본인 번호 없음 — 13/62가 이 경우다
    ]);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(members).toHaveLength(2);
    expect(members[1].phone).toBeNull();
    expect(members[1].parentPhone).toBe("01055556666");
  });

  it("그룹(반) 열이 여러 개면 모두 모은다", () => {
    const { members } = parseMemberSheet([
      ["이름", "아이디(이메일)", "휴대폰번호", "그룹(반)1", "그룹(반)2"],
      ["홍길동", "abcd1234", "01011112222", "고3_A", "특강_B"],
    ]);
    expect(members[0].groups).toEqual(["고3_A", "특강_B"]);
  });

  it("빈 줄은 조용히 건너뛰고, 아이디 없는 줄은 행 번호와 함께 보고한다", () => {
    const { members, errors } = parseMemberSheet([
      HEADER,
      row("김철수", "v3yxm46h", "01011112222", ""),
      ["", "", "", "", "", "", "", "", "", "", "", "", ""],
      row("이름만", "", "01099998888", ""),
    ]);
    expect(members).toHaveLength(1);
    expect(errors).toEqual([{ row: 4, message: expect.stringContaining("아이디(이메일)") }]);
  });

  it("번호가 하나도 없는 줄은 오류로 남기고 넘어간다", () => {
    const { members, errors } = parseMemberSheet([HEADER, row("번호없음", "abcd1234", "", "")]);
    expect(members).toHaveLength(0);
    expect(errors[0].row).toBe(2);
    expect(errors[0].message).toContain("본인 확인");
  });

  it("파일 안에 같은 아이디가 두 번이면 뒤쪽이 이기고 경고를 남긴다", () => {
    const { members, warnings } = parseMemberSheet([
      HEADER,
      row("옛이름", "abcd1234", "01011112222", ""),
      row("새이름", "abcd1234", "01099998888", ""),
    ]);
    expect(members).toHaveLength(1);
    expect(members[0].name).toBe("새이름");
    expect(warnings[0].row).toBe(3);
  });

  it("필수 헤더가 없으면 헤더 이름을 알려주며 실패한다", () => {
    expect(() => parseMemberSheet([["이름", "학교"], ["홍길동", ""]])).toThrow(MemberSheetError);
    expect(() => parseMemberSheet([["이름", "학교"]])).toThrow(/아이디\(이메일\)/);
    expect(() => parseMemberSheet([["이름", "아이디(이메일)"], []])).toThrow(/휴대폰번호/);
  });

  it("오류 메시지에 셀 값(개인정보)을 담지 않는다", () => {
    const { errors } = parseMemberSheet([HEADER, row("김철수", "abcd1234", "", "")]);
    expect(errors[0].message).not.toContain("김철수");
    expect(errors[0].message).not.toContain("abcd1234");
  });
});

describe("planUpsert", () => {
  const parsed = [
    {
      email: "abcd1234@inclass.co.kr",
      name: "홍길동",
      phone: "01011112222",
      parentPhone: null,
      status: "재원",
      groups: ["고3_B"],
    },
  ];

  it("새 구성원은 사용 횟수 0으로 만든다", () => {
    const plan = planUpsert(new Map(), parsed, "fp1", "2026-08-17T00:00:00.000Z");
    expect(plan.updates).toHaveLength(0);
    expect(plan.creates[0].data.uses).toBe(0);
    expect(plan.creates[0].data.maxUses).toBe(DEFAULT_MAX_USES);
    expect(plan.creates[0].data.phoneTail).toBe("2222");
    expect(plan.creates[0].data.phoneHash).toBe(hashPhone("01011112222"));
  });

  /**
   * 재업로드로 학생의 사용 횟수가 되살아나면 게이트가 무의미해진다.
   * 갱신 쪽에 uses가 애초에 존재하지 않는다는 것을 고정해 둔다.
   */
  it("기존 구성원 갱신에는 uses·maxUses·createdAt이 절대 없다", () => {
    const existing = new Map([["abcd1234@inclass.co.kr", { groups: ["고3_A"] }]]);
    const plan = planUpsert(existing, parsed, "fp1", "2026-08-17T00:00:00.000Z");
    expect(plan.creates).toHaveLength(0);
    expect(Object.keys(plan.updates[0].data)).not.toContain("uses");
    expect(Object.keys(plan.updates[0].data)).not.toContain("maxUses");
    expect(Object.keys(plan.updates[0].data)).not.toContain("createdAt");
  });

  it("반은 덮어쓰지 않고 합집합으로 쌓는다", () => {
    // 반별로 파일이 따로 나오므로 덮어쓰면 다른 반 소속이 지워진다
    const existing = new Map([["abcd1234@inclass.co.kr", { groups: ["고3_A"] }]]);
    const plan = planUpsert(existing, parsed, "fp1", "2026-08-17T00:00:00.000Z");
    expect(plan.updates[0].data.groups).toEqual(["고3_A", "고3_B"]);
  });

  it("번호가 없으면 해시도 null", () => {
    const plan = planUpsert(
      new Map(),
      [{ ...parsed[0], phone: null, parentPhone: "01055556666" }],
      "fp1",
      "2026-08-17T00:00:00.000Z",
    );
    expect(plan.creates[0].data.phoneHash).toBeNull();
    expect(plan.creates[0].data.parentPhoneHash).toBe(hashPhone("01055556666"));
    expect(plan.creates[0].data.phoneTail).toBe("6666");
  });
});

describe("maskName", () => {
  it("가운데를 별표로 가린다", () => {
    expect(maskName("김민수")).toBe("김*수");
    expect(maskName("남궁민수")).toBe("남**수");
  });

  it("두 글자는 뒤를, 한 글자는 그대로", () => {
    expect(maskName("김민")).toBe("김*");
    expect(maskName("김")).toBe("김");
    expect(maskName("")).toBe("");
  });
});

describe("evaluateMember", () => {
  const base: MemberDoc = {
    name: "홍길동",
    phoneHash: hashPhone("01011112222"),
    parentPhoneHash: hashPhone("01033334444"),
    phoneTail: "2222",
    status: "재원",
    groups: [],
    keyFp: "fp1",
    uses: 0,
    maxUses: 2,
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
    lastUsedAt: null,
  };
  const attempt = (phone: string, keyFp = "fp1") => ({ phoneHash: hashPhone(phone), keyFp });

  it("본인 번호로 통과", () => {
    expect(evaluateMember(base, attempt("01011112222"))).toEqual({
      ok: true,
      remaining: 2,
      name: "홍길동",
    });
  });

  it("학부모 번호로도 통과한다", () => {
    // 본인 번호가 인클래스에 없거나 잘못 들어간 학생이 적지 않다
    expect(evaluateMember(base, attempt("01033334444"))).toMatchObject({ ok: true });
  });

  it("본인 번호가 없는 구성원도 학부모 번호로 들어온다", () => {
    expect(evaluateMember({ ...base, phoneHash: null }, attempt("01033334444"))).toMatchObject({
      ok: true,
    });
  });

  it("다른 번호는 invalid", () => {
    expect(evaluateMember(base, attempt("01099998888"))).toEqual({ ok: false, reason: "invalid" });
  });

  it("사용 횟수를 다 쓰면 exhausted", () => {
    expect(evaluateMember({ ...base, uses: 2 }, attempt("01011112222"))).toEqual({
      ok: false,
      reason: "exhausted",
    });
  });

  it("번호가 틀리면 소진 여부를 알려주지 않는다", () => {
    // 남의 아이디에 아무 번호나 넣어 '이 사람은 다 썼다'를 알아낼 수 없어야 한다
    expect(evaluateMember({ ...base, uses: 2 }, attempt("01099998888"))).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("서명 키가 바뀌었으면 stale — 조용히 실패하지 않는다", () => {
    expect(evaluateMember(base, attempt("01011112222", "fp2"))).toEqual({
      ok: false,
      reason: "stale",
    });
  });
});
