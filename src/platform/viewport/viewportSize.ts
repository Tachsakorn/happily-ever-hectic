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

/** Everything the browser reports about the window's size, gathered so the choice can be tested. */
export interface ViewportReadings {
  readonly visual: { width: number; height: number; left: number; top: number } | null;
  readonly inner: { width: number; height: number };
  readonly client: { width: number; height: number };
  /** The device screen as reported (iPad reports it in portrait whatever the rotation). */
  readonly screen: { width: number; height: number };
  /** Running as a home-screen app: no browser toolbars, the whole window is ours. */
  readonly standalone: boolean;
}

/** How close (CSS px) the window must be to the screen to count as covering it. */
const FULL_SCREEN_SLACK = 2;

/**
 * Picks the visible size. In the browser, the visual viewport (toolbars come
 * and go). As a home-screen app there are no toolbars, but iOS reports the
 * visual viewport — and sometimes the window — shorter than the screen by the
 * translucent status bar, which left a bare strip along the bottom. There the
 * largest reported size wins, and the full screen when the app fills it.
 */
export function pickViewport(r: ViewportReadings): VisibleViewport {
  const base = r.visual && r.visual.width > 0 && r.visual.height > 0 ? r.visual : { ...r.inner, left: 0, top: 0 };
  if (!r.standalone) return { width: Math.round(base.width), height: Math.round(base.height), left: Math.round(base.left), top: Math.round(base.top) };
  let width = Math.max(base.width, r.inner.width, r.client.width);
  let height = Math.max(base.height, r.inner.height, r.client.height);
  const long = Math.max(r.screen.width, r.screen.height);
  const short = Math.min(r.screen.width, r.screen.height);
  const [screenW, screenH] = width >= height ? [long, short] : [short, long];
  // Only when the app really spans the screen (not in Split View or Stage Manager).
  if (Math.abs(width - screenW) <= FULL_SCREEN_SLACK) {
    width = screenW;
    height = Math.max(height, screenH);
  }
  return { width: Math.round(width), height: Math.round(height), left: 0, top: 0 };
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
}

export function visibleViewport(): VisibleViewport {
  const vv = window.visualViewport;
  return pickViewport({
    visual: vv ? { width: vv.width, height: vv.height, left: vv.offsetLeft, top: vv.offsetTop } : null,
    inner: { width: window.innerWidth, height: window.innerHeight },
    client: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
    screen: { width: window.screen.width, height: window.screen.height },
    standalone: isStandalone(),
  });
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
