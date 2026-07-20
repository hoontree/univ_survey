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
- 디자인 시안 반영 시: 색·폰트 토큰은 `src/app/globals.css`, 트랙별 강조색은 `src/lib/tracks.ts`의 `accent`, 카피는 각 랜딩 컴포넌트(`src/components/landing/`)에 모여 있음
