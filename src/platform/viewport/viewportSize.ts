/**
 * The part of the page actually visible on screen, in CSS pixels.
 *
 * iPhone Safari is the reason this exists: after a rotation it can keep
 * reporting the old size for a moment, and a `position: fixed; inset: 0` box
 * can end up taller than what is visible (under the toolbars). The visual
 * viewport is the reliable measure, so the game area is sized to it
 * explicitly and re-measured a few times after every change.
 */
export interface VisibleViewport {
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly top: number;
}

export function visibleViewport(): VisibleViewport {
  const vv = window.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) {
    return { width: Math.round(vv.width), height: Math.round(vv.height), left: Math.round(vv.offsetLeft), top: Math.round(vv.offsetTop) };
  }
  return { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 };
}

/** iOS settles its new size some time after the resize event; check again at these delays (ms). */
const SETTLE_CHECKS_MS = [60, 250, 600, 1200];

/**
 * Keeps `box` exactly covering the visible viewport and calls `onChange`
 * whenever its size changes (e.g. to refit the game canvas). Returns a
 * function that removes the listeners.
 */
export function installViewportSize(box: HTMLElement, onChange: (v: VisibleViewport) => void): () => void {
  let last = '';
  const timers: number[] = [];
  const apply = () => {
    const v = visibleViewport();
    const key = `${v.width}x${v.height}@${v.left},${v.top}`;
    if (key === last) return;
    last = key;
    box.style.inset = 'auto';
    box.style.left = `${v.left}px`;
    box.style.top = `${v.top}px`;
    box.style.width = `${v.width}px`;
    box.style.height = `${v.height}px`;
    onChange(v);
  };
  const schedule = () => {
    for (const t of timers.splice(0)) clearTimeout(t);
    requestAnimationFrame(apply);
    for (const ms of SETTLE_CHECKS_MS) timers.push(window.setTimeout(apply, ms));
  };
  apply();
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('scroll', schedule);
  // Coming back to the tab (or the home-screen app) can also bring a new size.
  document.addEventListener('visibilitychange', schedule);
  return () => {
    for (const t of timers.splice(0)) clearTimeout(t);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
    window.visualViewport?.removeEventListener('scroll', schedule);
    document.removeEventListener('visibilitychange', schedule);
  };
}
