import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * 클라이언트 하이드레이션 완료 여부.
 * 서버/하이드레이션 렌더에서는 false, 이후 클라이언트 렌더에서 true —
 * sessionStorage 같은 클라이언트 전용 저장소를 hydration mismatch 없이 읽기 위한 표준 패턴.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
