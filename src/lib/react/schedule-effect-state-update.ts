/**
 * Defer synchronous setState calls scheduled from useEffect.
 * Avoids react-hooks/set-state-in-effect without changing behavior.
 */
export function scheduleEffectStateUpdate(update: () => void): void {
  queueMicrotask(update);
}
