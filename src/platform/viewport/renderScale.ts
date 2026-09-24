/**
 * Chooses how many canvas pixels to render per design unit.
 * Rendering at 1x on a retina iPad looks blurry; rendering above the physical
 * pixel count wastes GPU fill-rate. We render close to the physical resolution
 * the design area will occupy, clamped to [1, maxScale].
 */
export function computeRenderScale(
  viewportWidth: number,
  viewportHeight: number,
  devicePixelRatio: number,
  designWidth: number,
  designHeight: number,
  maxScale = 2,
): number {
  if (viewportWidth <= 0 || viewportHeight <= 0 || designWidth <= 0 || designHeight <= 0) return 1;
  const fitScale = Math.min(viewportWidth / designWidth, viewportHeight / designHeight);
  const physical = fitScale * Math.max(1, devicePixelRatio);
  const clamped = Math.min(maxScale, Math.max(1, physical));
  // Quarter steps keep texture sizes stable across tiny viewport differences.
  return Math.round(clamped * 4) / 4;
}
