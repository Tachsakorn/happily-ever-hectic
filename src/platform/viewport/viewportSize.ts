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
  /** A `100lvw × 100lvh` box: the largest the viewport gets (toolbars hidden), measured by CSS itself. */
  readonly large: { width: number; height: number } | null;
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
  let width = Math.max(base.width, r.inner.width, r.client.width, r.large?.width ?? 0);
  let height = Math.max(base.height, r.inner.height, r.client.height, r.large?.height ?? 0);
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

let probe: HTMLElement | null = null;

/** A hidden box sized by CSS to the large viewport; kept in the page so reading it is cheap. */
function largeViewport(): { width: number; height: number } | null {
  if (!document.body) return null;
  if (!probe) {
    probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;visibility:hidden;pointer-events:none;z-index:-1';
    // Large-viewport units where supported (iOS 15.4+); the vw/vh above are the fallback.
    probe.style.width = '100lvw';
    probe.style.height = '100lvh';
    document.body.appendChild(probe);
  }
  const r = probe.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? { width: r.width, height: r.height } : null;
}

export function viewportReadings(): ViewportReadings {
  const vv = window.visualViewport;
  return {
    visual: vv ? { width: vv.width, height: vv.height, left: vv.offsetLeft, top: vv.offsetTop } : null,
    inner: { width: window.innerWidth, height: window.innerHeight },
    client: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
    screen: { width: window.screen.width, height: window.screen.height },
    large: largeViewport(),
    standalone: isStandalone(),
  };
}

export function visibleViewport(): VisibleViewport {
  return pickViewport(viewportReadings());
}

/** Everything measured, in one line, for the test-tools panel (diagnosing a device we can't hold). */
export function viewportReport(): string {
  const r = viewportReadings();
  const v = pickViewport(r);
  const box = document.getElementById('app')?.getBoundingClientRect();
  const f = (o: { width: number; height: number } | null) => (o ? `${Math.round(o.width)}×${Math.round(o.height)}` : '–');
  return [
    `used ${v.width}×${v.height}`,
    `app ${box ? f(box) : '–'}`,
    `visual ${f(r.visual)}`,
    `inner ${f(r.inner)}`,
    `client ${f(r.client)}`,
    `large ${f(r.large)}`,
    `screen ${f(r.screen)}`,
    `dpr ${window.devicePixelRatio}`,
    document.documentElement.classList.contains('is-oversized') ? 'root grown' : 'root normal',
    r.standalone ? 'home-screen app' : 'browser',
  ].join(' · ');
}

/** iOS settles its new size some time after the resize event; check again at these delays (ms). */
const SETTLE_CHECKS_MS = [60, 250, 600, 1200];
/** A light safety net: re-measure (a few property reads) once a second; resize only on change. */
const POLL_MS = 1000;

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
    // Taller than the page thinks it is (installed iOS app): let the root grow instead of clipping.
    const root = document.documentElement;
    const oversized = v.height > window.innerHeight + 1;
    root.classList.toggle('is-oversized', oversized);
    root.style.setProperty('--app-height', `${v.height}px`);
    // A taller root could be nudged into scrolling; keep the page pinned at the top.
    if (oversized && (window.scrollY || window.scrollX)) window.scrollTo(0, 0);
    onChange(v);
  };
  const schedule = () => {
    for (const t of timers.splice(0)) clearTimeout(t);
    requestAnimationFrame(apply);
    for (const ms of SETTLE_CHECKS_MS) timers.push(window.setTimeout(apply, ms));
  };
  apply();
  // iOS can also settle its size after launch without any event (seen as a bare strip
  // along the bottom of the home-screen app), so check again then, and every second after.
  schedule();
  const poll = window.setInterval(() => {
    if (document.visibilityState === 'visible') apply();
  }, POLL_MS);
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('scroll', schedule);
  // Coming back to the tab (or the home-screen app) can also bring a new size.
  document.addEventListener('visibilitychange', schedule);
  return () => {
    for (const t of timers.splice(0)) clearTimeout(t);
    clearInterval(poll);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
    window.visualViewport?.removeEventListener('scroll', schedule);
    document.removeEventListener('visibilitychange', schedule);
  };
}
