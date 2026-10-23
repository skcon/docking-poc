/** Clamp `value` to [min, max]; `min` wins if the range is empty (max < min). */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(Math.min(value, max), min);
}
