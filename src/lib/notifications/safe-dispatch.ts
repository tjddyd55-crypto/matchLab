import "server-only";

/**
 * 알림 생성 실패가 원래 비즈니스 액션을 롤백하지 않도록 best-effort로 실행한다.
 */
export function safeNotify(task: string, fn: () => Promise<void>): void {
  void fn().catch((error: unknown) => {
    console.error(`[notification:${task}]`, error);
  });
}

/** 트랜잭션 내부 등 await가 필요한 경우 — 실패해도 throw하지 않음 */
export async function tryNotify(
  task: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (error: unknown) {
    console.error(`[notification:${task}]`, error);
  }
}
