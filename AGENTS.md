# 유니버설 UNIVER設 — 에이전트 안내

우주설(수리논술 강사)의 대학 추천 설문 서비스. 학생이 계열(의대/약대/비메디컬)을 고르고 문항에 답하면, 각 답변이 강사 기준표를 충족한 대학에 투표되고 최다 득표 대학이 추천된다. 전체 구조·배포·규칙은 [README.md](README.md)에 있으니 먼저 읽을 것.

## 진실의 출처 (직접 손대지 말 것)

이 세 가지는 **생성물**이다. 직접 편집하지 말고 소스를 고친 뒤 재생성한다.

- `src/data/criteria/*.json` ← `data-src/*.xlsx` (강사 기준표). 재생성: `npm run convert`
- `src/app/fonts/*.woff2` ← `~/Downloads/ONE Mobile *` (원본 폰트, 미커밋). 재생성: `python3 scripts/build_fonts.py`
- 디자인 토큰·컴포넌트 ← claude.ai/design 프로젝트 `8fd99337-7104-4e28-9d99-9c19f781a955`. 큰 디자인 변경은 거기서 먼저 반영 후 `DesignSync`로 가져온다.

## 작업 규칙

- 응답 저장(`/api/responses`)은 **인클래스 구성원의 사용 횟수 차감과 원자적으로 묶여 있다** (`src/lib/members.ts`의 `consumeMemberUse` Firestore 트랜잭션). 본인 확인을 우회하는 저장 경로를 만들지 말 것. 랜딩 데모는 의도적으로 API를 호출하지 않는다.
- 학생 인증 토큰(`member-session.ts`)은 관리자 세션(`session.ts`)과 **반드시 다른 키로** 서명한다. 같은 키를 쓰면 학생 토큰을 `__session` 쿠키에 넣는 것만으로 관리자가 된다 — `member-session.test.ts`의 교차 사용 거절 테스트를 지우지 말 것.
- 구성원 휴대폰번호는 **해시로만** 저장한다(`hashPhone`). 평문 번호를 Firestore·로그·응답 문서에 남기지 말 것. 명단 재업로드는 병합이며 `planUpsert`의 갱신 타입에 `uses`를 추가하지 말 것 — 사용 횟수가 초기화된다.
- 본인 확인은 **2단계**다. ① `/api/members/verify`가 명단과 대조하고 챌린지(`otp-challenge.ts`)만 발급 ② `/api/members/confirm`이 Firebase 전화 인증 ID 토큰을 검증하고 비로소 학생 토큰을 발급. **문자는 명단 대조를 통과한 뒤에만 나간다** — 이 순서를 뒤집거나 1단계에서 학생 토큰을 내주지 말 것(문자 요금이 곧 공격 표면이다).
- `confirm`에서 **ID 토큰의 번호 해시와 챌린지의 번호 해시를 반드시 대조**한다. 빼면 자기 번호로 받은 멀쩡한 토큰을 남의 아이디에 붙일 수 있다. `firebase-id-token.test.ts`의 위조·만료·`alg=none`·타 프로젝트 토큰 거절 테스트를 지우지 말 것.
- Firebase 웹 설정은 `NEXT_PUBLIC_`이나 정적 번들에 박지 않는다(`firebase-config.ts`). 환경변수가 없으면 `otp_unavailable`로 **막는다** — OTP를 건너뛰는 폴백을 만들면 설정 실수가 곧 인증 우회가 된다.
- 관리자 인증은 아이디·비밀번호 로그인(세션 쿠키). 비밀번호는 `src/lib/password.ts`의 scrypt 해시로만 저장 — 평문을 코드·로그·Firestore에 남기지 말 것. 세션 서명 키는 `ADMIN_TOKEN`(재사용). 관리자 API는 `requireApiAdmin`(세션 쿠키 또는 Bearer)로 보호한다. 인증 계층: `password.ts`/`session.ts`(순수, 테스트됨) → `admins.ts`(Firestore) → `admin-auth.ts`(next/headers).

- 기준표 로직(`▲`=답변≤N 득표, 난이도 문항은 정확 일치, 성별 하드 필터)을 바꿀 땐 `src/lib/scoring.test.ts`를 먼저 확인. 채점 규칙 변경은 반드시 테스트로 검증.
- 시크릿 값(`ADMIN_TOKEN` 등)을 코드·로그·커밋·대화에 남기지 않는다. Secret Manager에만 둔다.
- **`main`은 보호 브랜치라 직접 푸시할 수 없다.** 모든 변경은 브랜치 → PR. PR을 열면 CI(`check`=lint+test, `build`=next build)가 돌고, 초록이면 auto-merge가 머지하고, 머지되면 Cloud Build가 Cloud Run에 배포한다 — 즉 **PR을 여는 것이 곧 배포다**. 배포 준비가 안 된 변경은 **draft로 열 것**. 커밋 전 `npm test`·`npm run build`·`npm run lint`를 로컬에서 통과시켜라(CI가 같은 것을 돌린다). 자세한 내용은 [README의 PR 게이트 절](README.md#pr-게이트와-auto-merge-github-actions).
- `src/data/admission-info.ts`(전형 정보)는 이미지 전사본이라 **강사 검수 전까지 사실 확정 아님**. 수치를 근거로 다른 판단을 내리지 말 것.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
