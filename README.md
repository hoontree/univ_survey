# 유니버설 UNIVER設 — 논술 전형 추천 시스템

**신준섭 X 우주설 논술연구소**의 대학 추천 설문 서비스. 학생이 계열(의대/약대/비메디컬)을 고르고 문항에 답하면, 각 답변이 기준표를 충족한 대학에 투표되고 **최다 득표 대학이 최종 추천**됩니다. **인클래스에 등록된 우주설 수업 수강생**만 휴대폰 **문자 인증**을 거쳐 이용할 수 있습니다(1인당 2회).

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 채점 엔진 단위 테스트
```

명단·관리자 기능까지 로컬에서 쓰려면 Firestore 접근과 서명 키가 필요합니다. `gcloud auth application-default login`의 기본 프로젝트가 `universeol`이 아닐 수 있으니 명시해 주세요.

```bash
GOOGLE_CLOUD_PROJECT=universeol ADMIN_TOKEN=$(openssl rand -hex 24) \
FIREBASE_API_KEY=… FIREBASE_AUTH_DOMAIN=universeol.firebaseapp.com \
FIREBASE_WEB_APP_ID=… npm run dev
```

로컬 `ADMIN_TOKEN`은 아무 값이나 되지만, 그 값으로 만든 번호 해시는 그 세션에서만 유효합니다(운영 `members` 문서와는 지문이 달라 `stale`로 뜹니다).

`FIREBASE_*` 값은 `firebase apps:sdkconfig web --project universeol`로 확인합니다(시크릿 아님, `cloudbuild.yaml`에도 그대로 있음). 이 값이 없으면 본인 확인 게이트가 닫힙니다. `localhost`에서는 실제 문자를 보낼 수 없으니 Firebase 콘솔의 **테스트 전화번호**를 쓰세요.

## 구조

| 경로 | 역할 |
|---|---|
| `data-src/*.xlsx` | 강사 제공 원본 기준표 (문항 × 대학 임계값 매트릭스) |
| `scripts/convert_criteria.py` | 엑셀 → JSON 변환기. 기준 갱신 시 `npm run convert` |
| `src/data/criteria/*.json` | 변환된 트랙별 기준 데이터 (커밋 대상) |
| `src/data/admission-info.ts` | 결과 페이지 하단 수능최저·고사일정 표 (**강사 검수 필요**) |
| `src/lib/scoring.ts` | 득표 집계 엔진 (하드 필터·공동 1위 처리) |
| `src/lib/store.ts` | 응답 저장소 (Firestore) |
| `src/lib/members.ts` | 인클래스 명단 (Firestore `members` 컬렉션, 번호 해시·트랜잭션 차감) |
| `src/lib/firebase-id-token.ts` | 전화 인증 ID 토큰 검증 (무의존성 RS256, `firebase-admin` 대체) |
| `src/lib/otp-challenge.ts` | 명단 대조 ↔ 문자 인증을 잇는 10분짜리 서명 챌린지 |
| `src/lib/firebase-client.ts` | 브라우저 전용 Firebase SDK 동적 로더 (reCAPTCHA·문자 발송) |
| `src/lib/xlsx.ts` | 무의존성 .xlsx 리더 (명단 업로드 해석) |
| `src/app/` | 랜딩(`/`) → 설문(`/survey/[track]`) → 결과(`…/result`), 관리자(`/admin`) |
| `src/app/globals.css` | 디자인 토큰 + 시그니처 효과 + 컴포넌트 CSS |
| `src/components/ds/` | 디자인 시스템 컴포넌트 11종 |
| `scripts/build_fonts.py` | ONE Mobile 원본 → 서브셋 WOFF2 웹폰트 |
| `scripts/build_og_image.py` | 카톡·SNS 공유 썸네일(`src/app/opengraph-image.png`) 생성 |

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

## 인클래스 명단 + 휴대폰 인증

수강생 접근 제어는 외부 수강생 관리 서비스 **인클래스**의 구성원 명단을 기준으로 하고, 확인은 **휴대폰 문자 인증**으로 한다. 학생이 입력하는 건 번호 하나뿐이다 — 아이디·비밀번호를 따로 외우지 않아도 되고, 번호를 안다고 되는 게 아니라 그 번호로 온 문자를 실제로 받아야 통과한다.

- 본인 확인은 **2단계**다. ① **휴대폰번호**를 명단과 대조(`POST /api/members/verify`) → 통과하면 10분짜리 **챌린지**만 발급 ② 그 번호로 받은 인증번호 확인(`POST /api/members/confirm`) → 비로소 12시간짜리 학생 토큰 발급. 토큰은 sessionStorage에 보관하고, **결과 발급 시 1회 차감**(`POST /api/responses`에서 Firestore 트랜잭션으로 원자 처리)한다. 1인당 2회
- **문자는 명단 대조를 통과한 뒤에만 나간다.** 명단에 없는 번호로는 한 통도 발송되지 않는다 — 문자 요금이 곧 공격 표면이라 이 순서가 중요하다
- 번호는 **본인·학부모 어느 쪽이든** 명단에 있으면 통과 — 인클래스에 본인 번호가 비어 있는 구성원이 적지 않다. 명단 문서 id는 여전히 이메일이라, 번호 해시로 **역방향 조회**한다(`verifyPhone`, 본인 번호 열·학부모 번호 열 각각 질의)
- 한 번호에 **여러 명이 걸릴 수 있다**(형제자매가 같은 학부모 번호로 등록된 경우). 이때는 문자 인증을 마친 뒤에 `김*수`처럼 가린 이름 중에서 본인을 고르게 한다. 후보 목록은 **인증을 통과한 사람에게만** 나가고, 1단계 응답에는 이름·인원수를 담지 않는다 — 담으면 번호만 넣어보는 명단 조회기가 된다
- 마지막 문항은 자동 제출하지 않음 — 차감이 있는 행동이라 "결과 보기" 버튼으로 명시적으로 제출. 무효 답변으로는 차감되지 않음(차감 전에 답변 검증)
- 명단 등록: `/admin` → "인클래스 명단"에서 인클래스 구성원 목록 엑셀(.xlsx)을 업로드. **병합**이라 이미 있는 구성원은 정보만 갱신되고, 파일에 없는 구성원은 지워지지 않으며, 이미 쓴 횟수도 초기화되지 않는다. 반이 여러 개면 파일을 나눠 올려도 `groups`가 합쳐진다
- 2회를 다 쓴 학생은 관리자 목록의 **"초기화"** 버튼으로 다시 열어준다 (토큰 시절의 "새 토큰 발급"을 대신하는 유일한 경로)
- 랜딩의 자동 재생 미리보기(DemoShowcase)는 본인 확인 없이 볼 수 있는 홍보용 — API 호출·저장 없음

### 휴대폰 문자 인증 (Firebase Auth)

문자 발송은 **Firebase Authentication 전화 로그인**을 쓴다. 국내 SMS 대행사를 쓰면 필요한 **발신번호 사전등록**(사업자 서류, 수일 소요)을 건너뛸 수 있어서다.

- 브라우저가 Firebase SDK를 **동적 로드**해 invisible reCAPTCHA → `signInWithPhoneNumber` → ID 토큰을 받고, 서버가 그 토큰을 검증한다(`src/lib/firebase-id-token.ts`, 의존성 없이 RS256 검증). `firebase-admin`은 쓰지 않는다
- 서버는 **ID 토큰의 번호 해시와 챌린지의 번호 해시를 대조**한다. 이게 없으면 자기 번호로 멀쩡히 받은 토큰을 남의 아이디에 붙일 수 있다
- Firebase 웹 설정(`FIREBASE_API_KEY`·`FIREBASE_AUTH_DOMAIN`·`FIREBASE_WEB_APP_ID`)은 **시크릿이 아니지만** 정적 번들에 박지 않고 명단 대조를 통과한 응답으로만 내려보낸다. 값이 비어 있으면 게이트가 `otp_unavailable`로 **닫힌다** — OTP를 건너뛰는 폴백은 두지 않는다
- 콘솔 설정(이미 반영됨): 전화 로그인 활성화, **SMS 지역 정책 = 대한민국(KR)만 허용**, 승인된 도메인에 `jwessay.com`·`www.jwessay.com`·`universeol.web.app`. 지역 정책의 기본값은 *전 지역 차단*이라 여기를 열지 않으면 문자가 아예 안 간다
- **비용**: 인증 문자는 건당 과금(Blaze). 급증하면 예산 알림에 잡힌다
- **로컬 개발**: `localhost`는 전화 인증 승인 도메인이 될 수 없다. Firebase 콘솔의 **테스트 전화번호**(고정 인증번호)를 등록해 확인한다

### 개인정보 취급

- **휴대폰번호는 평문으로 저장하지 않는다.** `ADMIN_TOKEN`에서 파생한 키로 HMAC한 값과 관리자 식별용 뒤 4자리만 `members` 문서에 남는다
- 다만 **Firebase Authentication 사용자 레코드에는 인증한 번호가 평문으로 남는다**(전화 로그인의 구조상 불가피). 학기말 파기 때 `/admin`의 명단 삭제와 **함께 Firebase 콘솔 Authentication → Users도 비울 것**
- 업로드한 엑셀은 디스크·GCS에 쓰지 않고 메모리에서만 처리한다. `/api/members/*`는 이메일·번호를 로그로 남기지 않는다
- **응답(`responses`)에는 이름·이메일을 넣지 않는다** — 접근 제어에는 `members`의 사용 횟수만 있으면 충분하다. 답변과 실명을 잇지 말 것
- 학기가 끝나면 `/admin`의 "명단 전체 삭제"로 파기한다
- `.xlsx` 해석은 외부 라이브러리 없이 `src/lib/xlsx.ts`가 직접 한다(npm `xlsx`의 미패치 취약점·CDN 배포 문제 회피). 인클래스 파일은 시트가 `rId4`에 걸려 있어 **workbook rels를 거쳐** 시트를 찾아야 한다

## 관리자 (`/admin`)

- **아이디·비밀번호 로그인**. 관리자 계정은 Firestore `admins` 컬렉션(비밀번호는 scrypt 해시)
- **최초 설정**: 관리자 계정이 하나도 없으면 `/admin`이 "계정 만들기" 화면을 연다(first-run). 계정이 하나라도 생기면 자동으로 닫히고 로그인만 가능. **배포 직후 바로 첫 계정을 만들 것**
- 세션은 HMAC 서명 쿠키(`__session`, httpOnly, 30일). 서명 키는 기존 `ADMIN_TOKEN` 시크릿을 재사용. **쿠키 이름을 바꾸지 말 것** — 앞단 Firebase Hosting은 백엔드로 넘기는 요청에서 `__session` 외의 쿠키를 떼어낸다
- `/admin`·`/api/*`는 `next.config.ts`에서 `private, no-store`로 고정한다. 공개 문서용 `s-maxage=60` CDN 캐시에 딸려 들어가면 로그인 직후 새로고침이 캐시된 로그아웃 화면을 받고, 반대로 캐시된 대시보드가 남에게 나갈 수 있다
- 로그인 후: 인클래스 명단 업로드/현황, 응답 통계(트랙별 응답 수·1위 분포·문항별 분포), 관리자 계정 추가·삭제·내 비밀번호 변경
- API(`/api/members/*`, `/api/responses/stats`)는 세션 쿠키 또는 `Authorization: Bearer <ADMIN_TOKEN>`(프로그래매틱/CLI) 둘 다 허용
- 통계 조회는 전체 문서를 읽으므로 인스턴스 메모리에 60초 캐시

## 응답 통계

- 설문 완료 시 `POST /api/responses`로 익명 저장(개인정보 없음). 결과는 서버에서 재계산해 기록
- 저장소는 Firestore(`responses` 컬렉션). 인증은 ADC — Cloud Run은 자동, 로컬은 `gcloud auth application-default login`

## 배포 (GCP)

운영 환경은 **Cloud Run + Firestore**(둘 다 `asia-northeast3` 서울)입니다.

| 항목 | 값 |
|---|---|
| 프로젝트 | `universeol` |
| 커스텀 도메인 | `jwessay.com` → Firebase Hosting → Cloud Run 리라이트 |
| Cloud Run URL | https://universeol-588223559887.asia-northeast3.run.app |
| Firebase Hosting | https://universeol.web.app (Cloud Run 앞단 CDN+SSL) |
| 런타임 서비스 계정 | `universeol-run@universeol.iam.gserviceaccount.com` (Firestore 읽기·쓰기 + 해당 시크릿만) |
| 빌드 서비스 계정 | `universeol-build@universeol.iam.gserviceaccount.com` (배포·이미지 푸시·연결 토큰 읽기) |
| 자동 배포 | PR 머지 → Cloud Build 트리거 `build-trigger`(asia-northeast3) — `main` 푸시 시 `cloudbuild.yaml` 실행. PR 게이트는 [아래](#pr-게이트와-auto-merge-github-actions) 참조 |
| 관리자 접근 | `/admin` 아이디·비밀번호 로그인. 세션 서명 키는 Secret Manager `universeol-admin-token` → `ADMIN_TOKEN`으로 주입 |
| 문자 인증 | Firebase Authentication 전화 로그인. 웹 설정은 `cloudbuild.yaml`의 `_FIREBASE_*` 치환값 → `FIREBASE_*` 환경변수 (시크릿 아님) |
| 스케일 | `min-instances=0` (평소 0원, 첫 접속 약 1~3초), 최대 10 |
| 예산 알림 | 월 20,000원 · 50% / 90% / 100% |

### 커스텀 도메인 (jwessay.com)

서울 리전은 Cloud Run 도메인 매핑을 지원하지 않아, **Firebase Hosting**을 앞단에 두고 모든 요청을 Cloud Run으로 리라이트한다(무료, `firebase.json` 참조). SSL·CDN은 Firebase가 자동 처리.

- 설정 배포: `firebase deploy --only hosting --project universeol` (firebase login 필요)
- Firebase Hosting은 서비스를 가리키므로 Cloud Run 새 리비전이 나와도 재배포 불필요 (한 번 설정하면 끝)
- 커스텀 도메인은 Firebase Hosting API의 `customDomains`로 연결. 가비아 DNS: apex는 A(`199.36.158.100`) + TXT(`hosting-site=universeol`), www는 CNAME(`universeol.web.app`)
- **캐시 주의**: Next가 정적 페이지에 `s-maxage=1년`을 붙여 Firebase CDN이 오래 캐시한다. `next.config.ts`의 `headers()`가 문서 캐시를 `s-maxage=60`으로 낮춰 배포가 ~1분 내 반영되게 함. 그래도 즉시 반영이 필요하면 `firebase deploy --only hosting`으로 CDN 캐시를 무효화

### 수동 배포

```bash
gcloud run deploy universeol --source . --project=universeol --region=asia-northeast3
```

기존 설정(서비스 계정·시크릿·스케일)은 유지되므로 플래그를 다시 줄 필요는 없습니다.

### PR 게이트와 auto-merge (GitHub Actions)

`main`은 **보호 브랜치**라 직접 푸시할 수 없습니다(관리자 포함). 모든 변경은 PR을 거치고, 아래 체인이 사람 손 없이 끝까지 돕니다.

```
PR 열기 → CI (check·build) 초록 → GitHub auto-merge → main 푸시 → Cloud Build → Cloud Run
```

즉 **PR을 여는 것이 곧 배포 예약**입니다.

**PR은 항상 ready로 엽니다(`--draft` 금지).** draft는 auto-merge가 켜지지 않아 사람이 다시 손대야 하고, 그대로 잊혀 방치되기 때문입니다. 아직 배포하고 싶지 않다면 PR을 여는 대신 **브랜치에만 두고 기다립니다**. 그래서 PR을 열기 **전에** 로컬에서 `npm test`·`npm run build`·`npm run lint`를 통과시켜 두어야 합니다.

이미 켠 auto-merge를 되돌리려면 PR 화면의 "Disable auto-merge"를 씁니다.

| 워크플로 | 하는 일 |
|---|---|
| `.github/workflows/ci.yml` | PR 전용. `check`와 `build`(`npm run build`) 두 잡을 병렬로 실행. `check` 안에서는 `npm run lint`와 `npm test`를 다시 동시에 띄우고 둘 다 기다립니다 — 하나가 실패해도 다른 하나를 끝까지 돌려, 한 번의 CI로 고칠 것을 전부 봅니다 |
| `.github/workflows/auto-merge.yml` | PR에 GitHub auto-merge 스위치만 켠다. 머지 시점 판정은 GitHub이 브랜치 보호 규칙을 보고 직접 함 |

머지 판정을 워크플로가 직접 하지 않는 것은 의도입니다 — 상태를 폴링해 머지를 호출하면 필수 체크를 우회하는 두 번째 경로가 생기고, 배포로 이어지는 경로는 하나여야 합니다.

**main 브랜치 보호**: 필수 체크 `check`·`build`(strict — main이 앞서면 브랜치 갱신 후 재검사), `enforce_admins`, 대화 해결 필수, force push·삭제 금지. 리뷰 승인은 필수가 아닙니다(1인 개발).

#### 머지 방식은 squash 하나뿐

레포는 **squash만 허용**합니다(`allow_squash_merge=true` / `allow_merge_commit=false` / `allow_rebase_merge=false`). PR 하나가 main에 커밋 하나로 앉으므로 main 이력이 PR 목록과 1:1로 맞고, "머지 커밋의 트리는 CI가 검사한 것과 같다"는 `ci.yml`의 전제도 참이 됩니다(보호가 strict라 브랜치는 머지 직전 main과 같은 자리에 있습니다). 방식을 하나로 좁힌 것은 PR마다 고르게 두면 한 번 잘못 고른 merge 커밋이 그대로 남기 때문입니다.

`auto-merge.yml`의 `gh pr merge --squash`가 이 설정과 **함께 움직여야 합니다.** `gh pr merge`는 비대화형에서 방식 플래그를 반드시 요구하는데, 레포가 허용하지 않는 방식을 적으면 이 워크플로만 조용히 실패합니다 — PR은 머지되지 않고 화면에는 "CI 대기 중"조차 남지 않습니다.

대가는 **스택 브랜치**입니다. A가 squash되면 그 커밋들이 다른 SHA로 main에 앉으므로, A 위에 쌓은 B는 `git rebase --onto main <A의 마지막 커밋> B`로 옮겨야 합니다.

#### 머지된 워크트리·브랜치 자동 정리

원격 브랜치는 GitHub이 지웁니다(`delete_branch_on_merge=true`). 남는 **로컬** 브랜치와 `.claude/worktrees/` 아래 작업 디렉터리는 GitHub이 건드릴 수 없으므로 `scripts/prune_merged_worktrees.sh`가 정리합니다 — `.claude/settings.json`의 SessionStart hook이 세션마다 `--apply`로 부릅니다. 무엇이 지워질지 먼저 보려면 플래그 없이 직접 실행하세요(기본은 보고만 합니다).

```bash
./scripts/prune_merged_worktrees.sh          # 보고만
./scripts/prune_merged_worktrees.sh --apply  # 실제로 삭제
```

**머지 판정을 `gh`에 묻는 것이 이 스크립트의 존재 이유입니다.** squash 커밋은 브랜치 커밋과 SHA가 다르므로 브랜치가 main의 조상이 되지 않고, 흔한 `git branch --merged main` 관용구는 이 저장소에서 영원히 아무것도 찾지 못합니다 — 그리고 그 실패가 조용합니다. 같은 이유로 브랜치 삭제도 `-d`가 아니라 `-D`입니다.

삭제는 되돌릴 수 없으므로 가드 여섯은 힌트가 아니라 통과 조건입니다: `.claude/worktrees/` 범위 · 자기 자신 제외 · locked 제외 · detached 제외 · 미커밋 변경 없음 · **로컬 tip == 머지된 PR의 `headRefOid`**. 마지막이 실질적인 마지막 방어선입니다 — 머지 이후에 얹은 커밋은 squash에 담기지 않았으므로 지우면 reflog 말고는 복구 경로가 없습니다.

#### 러너 스위치

두 CI 잡의 `runs-on`은 레포 Actions 변수 `CI_RUNNER` **하나만** 봅니다. 변수가 없으면 `ubuntu-latest`(GitHub 호스티드)로 떨어지므로 **되돌린 상태가 기본값**입니다. 워크플로 실행이 시작될 때 읽히니 토글에 커밋도 PR도 필요 없습니다.

```bash
gh variable set CI_RUNNER --body self-hosted   # self-hosted 켜기
gh variable delete CI_RUNNER                   # 호스티드로 되돌리기
```

현재는 상주 Mac mini 한 대에 러너 인스턴스 두 개(`Lizrdmini-Mac-mini-univ`, `-2`, `~/actions-runner-univ-survey{,-2}`, launchd 서비스)를 두고 self-hosted로 운용합니다. 러너 하나는 잡을 하나씩만 처리하므로, 인스턴스가 둘이어야 `check`와 `build`가 병렬로 돕니다. 러너는 **레포마다 따로 등록**해야 합니다 — 개인 계정이라 org 레벨 러너가 없어 다른 레포의 러너를 빌려 쓸 수 없습니다.

self-hosted로 켠 상태에서 알아야 할 것 셋:

1. 러너가 꺼져 있으면 잡은 실패가 아니라 **무한정 대기**합니다. 필수 체크가 초록이 되지 않으니 PR이 머지되지 않고(auto-merge 포함), 화면에는 오류가 아니라 아무 표시도 남지 않습니다. Mac mini를 오래 내려 둘 일이 있으면 **먼저 변수를 지울 것**.
2. 호스티드와 달리 작업 공간이 매번 새것이 아닙니다. `~/.npm` 캐시가 남아 두 번째 실행부터 빨라지는 것이 이득입니다(`npm ci`라 `node_modules` 자체는 매번 새로 만듭니다).
3. 그래서 **`setup-node`의 GitHub Actions 캐시(`cache: npm`)는 self-hosted에서 끕니다.** 그 옵션은 잡이 끝날 때 `~/.npm`을 통째로 타르로 말아 GitHub 캐시 서비스에 올리는데, 머신에 이미 남아 있는 것을 네트워크로 한 바퀴 돌리는 순수 손해입니다. 게다가 `~/.npm`은 이 레포만 쓰는 것이 아니라 계속 자라고(현재 2GB) 캐시 스코프는 브랜치별이라 PR마다 사본을 새로 올립니다 — 실측(run 32113358816)에서 `build` 잡 148초 중 113초, `check` 잡 66초 중 36초가 700MiB 업로드였습니다. 실제 검사(lint 3초·test 2초·build 9초)보다 캐시 왕복이 10배 이상 길었던 셈입니다. `CI_RUNNER`를 지워 호스티드로 되돌리면 캐시는 자동으로 다시 켜집니다(호스티드는 매번 새 VM이라 그때는 그것이 유일한 캐시입니다).

`auto-merge.yml`은 이 스위치를 **일부러 따르지 않고** 항상 호스티드에서 돕니다. API 호출 한 번이라 호스티드 분(minutes)이 사실상 들지 않는 반면, self-hosted로 옮기면 러너가 꺼져 있을 때 auto-merge 스위치가 조용히 안 켜집니다.

### GitHub 푸시 시 자동 배포

구성 완료. `main`에 푸시하면(= PR이 머지되면) `cloudbuild.yaml`이 실행되어 이미지 빌드 → Artifact Registry 푸시 → Cloud Run 배포까지 자동으로 진행됩니다.

빌드는 전용 계정 `universeol-build@`로 돌아가며 다음 권한만 갖습니다.

| 역할 | 용도 |
|---|---|
| `roles/run.admin` | Cloud Run 배포 |
| `roles/artifactregistry.writer` | 이미지 푸시 |
| `roles/logging.logWriter` | 빌드 로그 기록 |
| `roles/cloudbuild.builds.builder` | 빌드 실행 |
| `roles/developerconnect.readTokenAccessor` | GitHub 연결에서 소스 가져오기 |
| `iam.serviceAccountUser` (런타임 SA 한정) | 런타임 계정으로 서비스 기동 |
| `secretmanager.secretAccessor` (해당 시크릿 한정) | 배포 시 `ADMIN_TOKEN` 연결 |

빌드 상태는 [Cloud Build 기록](https://console.cloud.google.com/cloud-build/builds?project=universeol)에서 볼 수 있습니다.

### 관리자 접근

배포 직후 `/admin`에 접속하면 최초 관리자 계정 만들기 화면이 나옵니다. 아이디·비밀번호를 정하면 그 뒤로는 로그인만 하면 됩니다. `gcloud`로 토큰을 꺼낼 필요 없습니다.

`ADMIN_TOKEN`(`universeol-admin-token` 시크릿)은 **세션 쿠키 서명 키**이자 프로그래매틱 Bearer 폴백이고, 학생 인증 토큰과 명단 휴대폰번호 해시의 **파생 키**이기도 합니다.

> **주의 — 이 값을 교체하면 인클래스 명단을 다시 업로드해야 합니다.** 저장된 번호 해시가 전부 무효가 되어 학생들이 본인 확인을 할 수 없게 됩니다. `/admin`의 명단 섹션이 이 상황을 빨간 배너로 알려줍니다. 관리자 로그인 세션도 함께 무효화됩니다(계정·비밀번호는 그대로).

```bash
# 세션 서명 키 교체 (전원 재로그인 필요, 계정은 유지)
openssl rand -hex 24 | tr -d '\n' | gcloud secrets versions add universeol-admin-token --data-file=- --project=universeol
```

관리자 비밀번호를 잊었고 계정이 하나뿐이라면, Firestore `admins` 컬렉션에서 그 문서를 지우면 `/admin`이 다시 최초 설정 모드로 돌아갑니다.

#### 계정 추가 발급 (로그인 수단이 없을 때)

`/admin` 안의 계정 추가 기능은 **이미 로그인한 관리자**만 쓸 수 있습니다. 남의 계정을 초기화하지 않고 개발자용 계정을 하나 더 만들려면 로컬에서:

```bash
npm run create-admin -- 아이디
```

`gcloud auth application-default login` 자격증명으로 Firestore `admins` 컬렉션에 계정을 하나 추가합니다. 비밀번호는 실행 중에 직접 입력하고(화면에 안 보이고 셸 히스토리에도 안 남음) scrypt 해시로만 저장됩니다. 기존 계정은 건드리지 않습니다.

## 남은 것

- `admission-info.ts`의 전형 정보는 엑셀 임베드 이미지를 전사한 것 — 발행 전 강사 검수 필수
- Compute 기본 서비스 계정(`588223559887-compute@`)은 GCP 기본값인 `roles/editor`를 갖고 있습니다. 자동 배포는 이제 전용 계정을 쓰므로, 수동 `--source` 배포를 안 쓸 거라면 이 계정의 권한을 낮춰도 됩니다
- 응답은 입시 시즌 종료 후 삭제하기로 함 — Firestore `responses` 컬렉션을 비우면 됨
- 디자인 수정 시: 토큰은 `src/app/globals.css`, 컴포넌트는 `src/components/ds/`, 카피는 각 랜딩 컴포넌트(`src/components/landing/`)에 모여 있음. 원본은 claude.ai/design 프로젝트이므로 큰 변경은 거기서 먼저 반영하는 편이 좋음
- 로고는 흰 배경 JPG 한 장뿐이라 다크 표면에서 녹아웃 처리(`public/brand/univer-seol-mark.png`는 배경을 알파로 뺀 파생본). 투명 배경 SVG 원본을 받으면 교체 권장
