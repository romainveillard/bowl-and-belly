/** Pixels per millisecond, about what a deliberate flick of the thumb reaches. */
const FLICK_SPEED = 0.6;
/** Shorter drags are taps or jitter, however fast. */
const FLICK_DISTANCE = 24;

/** Whether letting go of a sheet dragged down `distance` pixels in `elapsedMs` closes it. */
export function dragCloses(distance: number, elapsedMs: number, sheetHeight: number): boolean {
  const flicked = distance > FLICK_DISTANCE && distance / Math.max(elapsedMs, 1) > FLICK_SPEED;
  return flicked || distance > sheetHeight / 4;
}
