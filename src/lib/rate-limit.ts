/**
 * 본인 확인 시도 제한 — 인스턴스 메모리 기반 슬라이딩 윈도우.
 *
 * Cloud Run은 인스턴스가 여러 개일 수 있고 min-instances=0이라 이건 완벽한
 * 방벽이 아니라 **속도 제한**이다. 그래도 번호(10⁸)를 긁어 명단에 있는
 * 사람을 찾아내려는 시도를 크게 늦추고, 비용이 0이라 둘 이유가 충분하다.
 * Firestore 카운터는 쓰기 비용과 정리 부담 때문에 쓰지 않는다.
 */
export interface RateLimitRule {
  /** 윈도우 안에서 허용할 실패 횟수 */
  limit: number;
  windowMs: number;
}

export const PHONE_RULE: RateLimitRule = { limit: 5, windowMs: 10 * 60 * 1000 };
export const IP_RULE: RateLimitRule = { limit: 20, windowMs: 10 * 60 * 1000 };

export class RateLimiter {
  private hits = new Map<string, number[]>();

  /** 남은 시도가 있으면 true. 성공한 인증은 기록하지 않는다(실패만 센다). */
  allow(key: string, rule: RateLimitRule, now: number): boolean {
    return this.recent(key, rule, now).length < rule.limit;
  }

  /** 실패 1회 기록 */
  record(key: string, rule: RateLimitRule, now: number): void {
    const recent = this.recent(key, rule, now);
    recent.push(now);
    this.hits.set(key, recent);
    // 오래된 키가 무한정 쌓이지 않게 가끔 청소한다
    if (this.hits.size > 5000) this.sweep(rule, now);
  }

  /** 인증에 성공하면 그 키의 실패 기록을 지운다 */
  clear(key: string): void {
    this.hits.delete(key);
  }

  private recent(key: string, rule: RateLimitRule, now: number): number[] {
    const since = now - rule.windowMs;
    return (this.hits.get(key) ?? []).filter((at) => at > since);
  }

  private sweep(rule: RateLimitRule, now: number): void {
    const since = now - rule.windowMs;
    for (const [key, times] of this.hits) {
      if (times.every((at) => at <= since)) this.hits.delete(key);
    }
  }
}

/** 프록시(Firebase Hosting) 뒤에 있으므로 첫 홉이 실제 클라이언트다 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || "unknown";
}
