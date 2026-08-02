/**
 * 드래그 중 보드 세로 자동 스크롤.
 *
 * 가로 스크롤은 의도치 않은 요일 이동을 만들 수 있으므로 절대 건드리지 않는다.
 * 순수 가로 이동 중 하단/상단 가장자리에 포인터가 있어도 시각이 밀리지 않도록
 * 세로 의도가 있을 때만 스크롤한다.
 */
const EDGE_ZONE_PX = 56;
const MAX_STEP_PX_PER_FRAME = 18;
/** 이 값 이상의 세로 이동이 있어야 auto-scroll 을 켠다. */
const VERTICAL_INTENT_PX = 10;

export type BoardAutoScroll = {
  /**
   * @param clientY 현재 포인터 Y
   * @param originY 드래그 시작 Y — 세로 의도 판정에 사용
   * @param force 리사이즈처럼 세로 조작이 본질인 경우 true
   */
  update(clientY: number, originY: number, force?: boolean): void;
  stop(): void;
};

function velocityFor(clientY: number, top: number, bottom: number): number {
  const fromTop = clientY - top;
  const fromBottom = bottom - clientY;
  if (fromTop < EDGE_ZONE_PX) {
    const ratio = Math.min(1, (EDGE_ZONE_PX - fromTop) / EDGE_ZONE_PX);
    return -Math.ceil(ratio * MAX_STEP_PX_PER_FRAME);
  }
  if (fromBottom < EDGE_ZONE_PX) {
    const ratio = Math.min(1, (EDGE_ZONE_PX - fromBottom) / EDGE_ZONE_PX);
    return Math.ceil(ratio * MAX_STEP_PX_PER_FRAME);
  }
  return 0;
}

export function createBoardAutoScroll(
  container: HTMLElement | null,
  onTick: () => void,
): BoardAutoScroll {
  let velocity = 0;
  let frameId: number | null = null;

  function canScroll(): boolean {
    if (!container) return false;
    return container.scrollHeight > container.clientHeight + 1;
  }

  function tick() {
    if (!container || velocity === 0) {
      frameId = null;
      return;
    }
    const before = container.scrollTop;
    container.scrollTop = before + velocity;
    if (container.scrollTop !== before) onTick();
    frameId = requestAnimationFrame(tick);
  }

  return {
    update(clientY: number, originY: number, force = false) {
      if (!canScroll()) return;
      const hasVerticalIntent =
        force || Math.abs(clientY - originY) >= VERTICAL_INTENT_PX;
      if (!hasVerticalIntent) {
        velocity = 0;
        return;
      }
      const rect = container!.getBoundingClientRect();
      velocity = velocityFor(clientY, rect.top, rect.bottom);
      if (velocity !== 0 && frameId == null) {
        frameId = requestAnimationFrame(tick);
      }
    },
    stop() {
      velocity = 0;
      if (frameId != null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    },
  };
}
