#!/usr/bin/env bash
# 머지가 끝난 Claude Code 워크트리·브랜치 정리 — SessionStart hook 겸 수동 도구.
#
# PR 이 squash 로 머지되면 남는 것은 셋이다: `.claude/worktrees/` 아래의 작업
# 디렉터리, 로컬 브랜치, 그리고 원격 브랜치. 원격은 레포 설정
# `delete_branch_on_merge=true` 가 지우지만 GitHub 은 노트북을 건드릴 수 없으므로
# 앞의 둘은 여기서 지운다(설정이 켜지기 전에 머지된 PR 을 위해 원격도 한 번 더 본다).
#
# **판정을 gh 에 묻는 것이 이 스크립트의 존재 이유다.** 이 저장소는 squash 머지라
# (allow_merge_commit=false) 브랜치 커밋들이 main 의 조상이 되지 않는다. 그래서
# 흔한 `git branch --merged main` 관용구는 여기서 **영원히 아무것도 찾지 못하고**,
# 그 실패가 조용하다. 같은 이유로 브랜치 삭제도 `-d` 가 아니라 `-D` 여야 한다.
#
# 계약 넷:
#   1. 기본은 **보고만** 한다. 실제 삭제는 `--apply` 를 줄 때뿐 — 훅에만 그 플래그를
#      준다. 사람이 직접 부를 때는 무엇이 지워질지 먼저 보는 쪽이 기본값이다.
#   2. **절대 0이 아닌 값으로 끝나지 않는다.** 정리 실패가 세션 시작을 막으면
#      그 실패를 조사할 자리조차 없이 죽는다.
#   3. 클라우드 세션에서는 아무것도 하지 않는다 — 거기엔 워크트리가 없다.
#   4. 지우는 것은 **되돌릴 수 없다**. 그래서 가드가 통과 조건이지 힌트가 아니다:
#      아래 여섯 중 하나라도 걸리면 그 워크트리는 건드리지 않는다.
set -uo pipefail

APPLY=0
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    -h|--help)
      printf '사용법: %s [--apply]\n  (기본은 보고만 — --apply 를 줘야 실제로 지운다)\n' "$0"
      exit 0 ;;
  esac
done

log() { printf '[prune-worktrees] %s\n' "$*" >&2; }

# 클라우드에는 워크트리가 없다.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] && exit 0

command -v git >/dev/null 2>&1 || exit 0
command -v gh  >/dev/null 2>&1 || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# 메인 워크트리 = porcelain 목록의 첫 항목(git 이 보장한다). 정리 범위의 기준점이자
# gh 를 부를 자리다.
MAIN="$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print substr($0,10); exit}')"
[ -n "$MAIN" ] || exit 0
SCOPE="$MAIN/.claude/worktrees/"

# 자기 자신은 못 지운다 — 서 있는 바닥을 빼는 일이다. 훅의 cwd 와 세션의 프로젝트
# 디렉터리 둘 다 제외한다(둘이 다를 수 있다).
SELF="$(git rev-parse --show-toplevel 2>/dev/null || true)"
SELF2="${CLAUDE_PROJECT_DIR:-}"

candidates=0
removed=0

# porcelain 레코드: "worktree <경로>" / "HEAD <sha>" / ("branch <ref>" | "detached")
# / 선택적 "locked [사유]" / 빈 줄. 마지막 레코드도 빈 줄로 끝나지만, 끝을 한 번
# 더 밀어 넣어 파서가 마지막 항목을 흘리지 않게 한다.
wt=""; head=""; branch=""; locked=0
while IFS= read -r line; do
  case "$line" in
    "worktree "*) wt="${line#worktree }"; head=""; branch=""; locked=0 ; continue ;;
    "HEAD "*)     head="${line#HEAD }" ; continue ;;
    "branch "*)   branch="${line#branch }" ; continue ;;
    "locked"*)    locked=1 ; continue ;;
    "")           : ;;
    *)            continue ;;
  esac

  [ -n "$wt" ] || continue
  path="$wt"; sha="$head"; ref="$branch"; lk="$locked"
  wt=""; head=""; branch=""; locked=0

  # ── 가드 ① 범위: .claude/worktrees/ 아래만. 메인 워크트리와 저장소 밖의
  #    워크트리는 이 도구의 소관이 아니다.
  case "$path" in "$SCOPE"*) : ;; *) continue ;; esac
  # ── 가드 ② 자기 자신
  [ "$path" = "$SELF" ] && continue
  [ -n "$SELF2" ] && [ "$path" = "$SELF2" ] && continue
  # ── 가드 ③ locked: lock 은 소유자가 있다는 신호다.
  [ "$lk" = "1" ] && continue
  # ── 가드 ④ detached: 물어볼 PR 이 없다.
  [ -n "$ref" ] || continue
  name="${ref#refs/heads/}"
  # ── 가드 ⑤ 미커밋 변경(추적되지 않는 파일 포함)
  if [ -n "$(git -C "$path" status --porcelain 2>/dev/null)" ]; then
    log "건너뜀 $name — 커밋되지 않은 변경이 있습니다"
    continue
  fi

  candidates=$((candidates + 1))

  # ── 가드 ⑥ GitHub 에 묻는다: 그 브랜치의 PR 이 머지됐는가, 그리고 머지된 것이
  #    바로 이 커밋인가. tip 이 다르면 머지 이후에 얹은 커밋이 있다는 뜻이고,
  #    그건 squash 에 담기지 않았으므로 지우면 reflog 말고는 복구 경로가 없다.
  merged_oid="$(cd "$MAIN" && gh pr list --state merged --head "$name" \
      --json headRefOid --jq '.[0].headRefOid' 2>/dev/null || true)"
  if [ -z "$merged_oid" ] || [ "$merged_oid" = "null" ]; then
    log "건너뜀 $name — 머지된 PR 을 찾지 못했습니다"
    continue
  fi
  if [ "$merged_oid" != "$sha" ]; then
    log "건너뜀 $name — 머지 이후의 커밋이 있습니다(로컬 ${sha:0:7} ≠ 머지 ${merged_oid:0:7})"
    continue
  fi

  if [ "$APPLY" != "1" ]; then
    log "[보고만] 삭제 대상: $name  ($path)"
    continue
  fi

  if git worktree remove "$path" 2>/dev/null; then
    # squash 머지라 git 이 보기엔 안 머지된 브랜치다 — -d 는 거절하고 조용히 끝난다.
    git branch -D "$name" >/dev/null 2>&1 \
      || log "워크트리는 지웠지만 브랜치 $name 삭제에 실패했습니다"
    # 원격은 보통 GitHub 이 이미 지웠다(delete_branch_on_merge). 남아 있을 때만
    # 손댄다 — 없는 브랜치에 --delete 를 쏘면 실패가 로그만 더럽힌다.
    if git ls-remote --exit-code --heads origin "$name" >/dev/null 2>&1; then
      git push origin --delete "$name" >/dev/null 2>&1 \
        || log "원격 브랜치 $name 삭제에 실패했습니다"
    fi
    removed=$((removed + 1))
    log "삭제 $name"
  else
    log "워크트리 삭제 실패 $path — 'git worktree remove --force' 로 직접 확인하세요"
  fi
done < <(git worktree list --porcelain 2>/dev/null; printf '\n')

[ "$APPLY" = "1" ] && [ "$removed" -gt 0 ] && git worktree prune >/dev/null 2>&1

if [ "$candidates" -eq 0 ]; then
  : # 조용히 — 세션 시작마다 "정리할 것 없음"을 찍을 이유가 없다.
elif [ "$APPLY" = "1" ]; then
  log "정리 완료: ${removed}개"
fi

exit 0
