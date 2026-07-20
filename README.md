# 유니버설 UNIVER設

우주설 강사의 대학 추천 설문 서비스. 학생이 계열(의대/약대/비메디컬)을 고르고 문항에 답하면, 각 답변이 기준표를 충족한 대학에 투표되고 **최다 득표 대학이 최종 추천**됩니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 채점 엔진 단위 테스트
```

## 구조

| 경로 | 역할 |
|---|---|
| `data-src/*.xlsx` | 강사 제공 원본 기준표 (문항 × 대학 임계값 매트릭스) |
| `scripts/convert_criteria.py` | 엑셀 → JSON 변환기. 기준 갱신 시 `npm run convert` |
| `src/data/criteria/*.json` | 변환된 트랙별 기준 데이터 (커밋 대상) |
| `src/data/admission-info.ts` | 결과 페이지 하단 수능최저·고사일정 표 (**강사 검수 필요**) |
| `src/lib/scoring.ts` | 득표 집계 엔진 (하드 필터·공동 1위 처리) |
| `src/lib/store.ts` | 응답 저장소 (SQLite) — **배포 시 교체 지점** |
| `src/app/` | 랜딩(`/`) → 설문(`/survey/[track]`) → 결과(`…/result`), 관리자(`/admin`) |
| `src/app/globals.css` | 디자인 토큰 + 시그니처 효과 + 컴포넌트 CSS |
| `src/components/ds/` | 디자인 시스템 컴포넌트 11종 |
| `scripts/build_fonts.py` | ONE Mobile 원본 → 서브셋 WOFF2 웹폰트 |

## 디자인 시스템

claude.ai/design 프로젝트 **유니버설 UNIVER設 Design System**(`8fd99337-7104-4e28-9d99-9c19f781a955`)에서 가져왔습니다. 기준 문서는 그 프로젝트이며, 갱신 시 `DesignSync`로 다시 읽어 반영합니다.

- **테마**: 코스믹 다크 단일 테마(`#070b18`). 라이트 모드 없음
- **색**: 네뷸라 어센트(인디고→바이올렛→푸시아) + 트랙별 그라디언트(의대 rose→orange, 약대 emerald→teal, 비메디컬 indigo→violet). 회색 팔레트 대신 화이트 알파 스케일
- **타입**: 표시 `ONE Mobile Title`, 본문 `ONE Mobile`, 밀집 표 `Noto Sans KR`
- **깊이**: 회색 그림자가 아니라 어센트 글로우. 카드는 1px 보더 + 반투명 필
- **아이콘**: 전용 세트 없이 이모지 + 유니코드 글리프(→ ← ↺ ⌄ ✓ ✕)

### 폰트 빌드

원본 ONE Mobile OTF는 face당 1.9~4MB라 그대로 쓰지 않습니다. `python3 scripts/build_fonts.py`가 KS X 1001 상용 한글 2,350자 + 라틴/UI 글리프로 서브셋해 WOFF2로 굽습니다(총 648KB, 3종). 원본은 `~/Downloads/ONE Mobile *`에 있어야 하며 저장소에 커밋하지 않습니다.

이 스크립트는 **외곽선이 비어 있는 결함 글리프를 자동 제외**합니다. ONE Mobile은 `—`(em dash), `–`(en dash), `•` 등이 cmap에는 있지만 잉크가 없어, 그대로 두면 브라우저가 폴백하지 않고 보이지 않는 문자를 그립니다. 제외하면 Noto Sans KR로 폴백해 정상 표시됩니다.

`--fw-light`(300)는 토큰에만 있고 사용하는 컴포넌트가 없어 Light face는 빌드하지 않습니다. 쓰려면 `FACES`에 추가하세요.

## 채점 규칙

- 기준표 셀 `N▲` = 답변 번호가 **N 이하**(더 좋은 수준)면 해당 대학 +1표
- `▲` 없는 셀(논술 난이도 선호 문항) = 번호가 **정확히 일치**할 때만 +1표
- **성별 문항은 하드 필터**: 미충족 대학(예: 남학생→여대)은 득표와 무관하게 추천에서 제외되고 "지원 불가"로 표시. `src/data/criteria/*.json`의 `hardFilter` 플래그로 제어
- 동점 1위는 공동 1위로 모두 표시, 순서는 기준표 컬럼 순서 유지

## 응답 통계

- 설문 완료 시 `POST /api/responses`로 익명 저장(개인정보 없음). 결과는 서버에서 재계산해 기록
- 관리자 페이지: `/admin?token=<ADMIN_TOKEN>` — 트랙별 응답 수, 1위 추천 분포, 문항별 답변 분포
- `ADMIN_TOKEN`은 `.env.local`에 설정 (미설정 시 관리자 기능 전체 비활성). **배포 전 반드시 변경**

## 배포 시 주의

- 로컬 SQLite(`data/responses.db`)는 Vercel 등 서버리스에서 유지되지 않음 → `src/lib/store.ts`의 `saveResponse`/`getStats`만 호스팅 DB(Neon/Supabase/Turso) 구현으로 교체하면 됨 (인터페이스 유지)
- `admission-info.ts`의 전형 정보는 엑셀 임베드 이미지를 전사한 것 — 발행 전 강사 검수 필수
- 디자인 수정 시: 토큰은 `src/app/globals.css`, 컴포넌트는 `src/components/ds/`, 카피는 각 랜딩 컴포넌트(`src/components/landing/`)에 모여 있음. 원본은 claude.ai/design 프로젝트이므로 큰 변경은 거기서 먼저 반영하는 편이 좋음
- 로고는 흰 배경 JPG 한 장뿐이라 다크 표면에서 녹아웃 처리(`public/brand/univer-seol-mark.png`는 배경을 알파로 뺀 파생본). 투명 배경 SVG 원본을 받으면 교체 권장
