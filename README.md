# 유니버설 UNIVER設 — 논술 전형 추천 시스템

**신준섭 X 우주설 논술연구소**의 대학 추천 설문 서비스. 학생이 계열(의대/약대/비메디컬)을 고르고 문항에 답하면, 각 답변이 기준표를 충족한 대학에 투표되고 **최다 득표 대학이 최종 추천**됩니다. 우주설 수업 수강생에게 발급되는 **이용 토큰**(1개당 2회)으로만 이용할 수 있습니다.

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
| `src/lib/store.ts` | 응답 저장소 (Firestore) |
| `src/lib/tokens.ts` | 이용 토큰 (Firestore `tokens` 컬렉션, 트랜잭션 차감) |
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

## 이용 토큰

- 수강생 접근 제어: 설문 진입 시 토큰 유효성 확인(`POST /api/tokens/check`, 차감 없음), **결과 발급 시 1회 차감**(`POST /api/responses`에서 Firestore 트랜잭션으로 원자 처리). 한 토큰 = 2회
- 마지막 문항은 자동 제출하지 않음 — 차감이 있는 행동이라 "결과 보기" 버튼으로 명시적으로 제출
- 코드 형식: 혼동 문자(0/O/1/I/L) 제외 8자, `XXXX-XXXX` 표시. 무효 답변으로는 차감되지 않음(차감 전에 답변 검증)
- 발급: `/admin` 로그인 후 "이용 토큰" 섹션에서 개수 입력 → 생성·전체 복사. 목록에서 미사용/사용 중/소진 확인
- 랜딩의 자동 재생 미리보기(DemoShowcase)는 토큰 없이 볼 수 있는 홍보용 — API 호출·저장 없음

## 관리자 (`/admin`)

- **아이디·비밀번호 로그인**. 관리자 계정은 Firestore `admins` 컬렉션(비밀번호는 scrypt 해시)
- **최초 설정**: 관리자 계정이 하나도 없으면 `/admin`이 "계정 만들기" 화면을 연다(first-run). 계정이 하나라도 생기면 자동으로 닫히고 로그인만 가능. **배포 직후 바로 첫 계정을 만들 것**
- 세션은 HMAC 서명 쿠키(`univ_admin`, httpOnly, 30일). 서명 키는 기존 `ADMIN_TOKEN` 시크릿을 재사용
- 로그인 후: 응답 통계(트랙별 응답 수·1위 분포·문항별 분포), 이용 토큰 생성/현황, 관리자 계정 추가·삭제·내 비밀번호 변경
- API(`/api/tokens/generate`, `/api/responses/stats`)는 세션 쿠키 또는 `Authorization: Bearer <ADMIN_TOKEN>`(프로그래매틱/CLI) 둘 다 허용
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
| 자동 배포 | Cloud Build 트리거 `build-trigger` — `main` 푸시 시 `cloudbuild.yaml` 실행 |
| 관리자 접근 | `/admin` 아이디·비밀번호 로그인. 세션 서명 키는 Secret Manager `universeol-admin-token` → `ADMIN_TOKEN`으로 주입 |
| 스케일 | `min-instances=0` (평소 0원, 첫 접속 약 1~3초), 최대 10 |
| 예산 알림 | 월 20,000원 · 50% / 90% / 100% |

### 커스텀 도메인 (jwessay.com)

서울 리전은 Cloud Run 도메인 매핑을 지원하지 않아, **Firebase Hosting**을 앞단에 두고 모든 요청을 Cloud Run으로 리라이트한다(무료, `firebase.json` 참조). SSL·CDN은 Firebase가 자동 처리.

- 설정 배포: `firebase deploy --only hosting --project universeol` (firebase login 필요)
- Firebase Hosting은 서비스를 가리키므로 Cloud Run 새 리비전이 나와도 재배포 불필요 (한 번 설정하면 끝)
- 커스텀 도메인은 Firebase Hosting API의 `customDomains`로 연결. 가비아 DNS에 A(`199.36.158.100`) + TXT(`hosting-site=universeol`) 추가

### 수동 배포

```bash
gcloud run deploy universeol --source . --project=universeol --region=asia-northeast3
```

기존 설정(서비스 계정·시크릿·스케일)은 유지되므로 플래그를 다시 줄 필요는 없습니다.

### GitHub 푸시 시 자동 배포

구성 완료. `main`에 푸시하면 `cloudbuild.yaml`이 실행되어 이미지 빌드 → Artifact Registry 푸시 → Cloud Run 배포까지 자동으로 진행됩니다.

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

`ADMIN_TOKEN`(`universeol-admin-token` 시크릿)은 이제 **세션 쿠키 서명 키**이자 프로그래매틱 Bearer 폴백입니다. 이 값을 교체하면 로그인 세션이 전부 무효화되어 재로그인이 필요합니다(계정·비밀번호는 그대로).

```bash
# 세션 서명 키 교체 (전원 재로그인 필요, 계정은 유지)
openssl rand -hex 24 | tr -d '\n' | gcloud secrets versions add universeol-admin-token --data-file=- --project=universeol
```

관리자 비밀번호를 잊었고 계정이 하나뿐이라면, Firestore `admins` 컬렉션에서 그 문서를 지우면 `/admin`이 다시 최초 설정 모드로 돌아갑니다.

## 남은 것

- `admission-info.ts`의 전형 정보는 엑셀 임베드 이미지를 전사한 것 — 발행 전 강사 검수 필수
- Compute 기본 서비스 계정(`588223559887-compute@`)은 GCP 기본값인 `roles/editor`를 갖고 있습니다. 자동 배포는 이제 전용 계정을 쓰므로, 수동 `--source` 배포를 안 쓸 거라면 이 계정의 권한을 낮춰도 됩니다
- 응답은 입시 시즌 종료 후 삭제하기로 함 — Firestore `responses` 컬렉션을 비우면 됨
- 디자인 수정 시: 토큰은 `src/app/globals.css`, 컴포넌트는 `src/components/ds/`, 카피는 각 랜딩 컴포넌트(`src/components/landing/`)에 모여 있음. 원본은 claude.ai/design 프로젝트이므로 큰 변경은 거기서 먼저 반영하는 편이 좋음
- 로고는 흰 배경 JPG 한 장뿐이라 다크 표면에서 녹아웃 처리(`public/brand/univer-seol-mark.png`는 배경을 알파로 뺀 파생본). 투명 배경 SVG 원본을 받으면 교체 권장
