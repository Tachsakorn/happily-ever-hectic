/**
 * Keeps the DOM UI in a comfortable design frame on any screen. The menus are
 * laid out for an iPad (about 1024×700 CSS px or more); on a smaller screen
 * such as a phone in landscape, the UI layer is laid out at a larger size and
 * scaled down uniformly, so panels shrink instead of squeezing their text.
 * CSS viewport units go through `--vw` / `--vh`, which this keeps in step with
 * the frame. Returns a function that removes the listeners.
 */
export const UI_FRAME_MIN = { width: 1024, height: 700 } as const;

export function uiScaleFor(viewportW: number, viewportH: number, min = UI_FRAME_MIN): number {
  return Math.min(1, viewportW / min.width, viewportH / min.height);
}

export function installUiScale(layer: HTMLElement, root: HTMLElement = document.documentElement): () => void {
  let frame = 0;
  const apply = () => {
    frame = 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = uiScaleFor(vw, vh);
    const w = vw / scale;
    const h = vh / scale;
    if (scale < 1) {
      layer.style.inset = 'auto';
      layer.style.left = '0';
      layer.style.top = '0';
      layer.style.width = `${w}px`;
      layer.style.height = `${h}px`;
      layer.style.transformOrigin = '0 0';
      layer.style.transform = `scale(${scale})`;
    } else {
      layer.style.cssText = '';
    }
    root.style.setProperty('--vw', `${w / 100}px`);
    root.style.setProperty('--vh', `${h / 100}px`);
    root.style.setProperty('--ui-scale', String(scale));
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(apply);
  };
  apply();
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  return () => {
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}
