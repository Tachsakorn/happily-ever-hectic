/**
 * Keeps the DOM UI in a comfortable design frame on any screen. The menus are
 * laid out for an iPad (about 1024×700 CSS px or more); on a smaller screen
 * such as a phone in landscape, the UI layer is laid out at a larger size and
 * scaled down uniformly, so panels shrink instead of squeezing their text.
 * CSS viewport units go through `--vw` / `--vh`, which this keeps in step with
 * the frame. Returns a function that removes the listeners.
 */
import { visibleViewport } from './viewportSize';

export const UI_FRAME_MIN = { width: 1024, height: 700 } as const;
/** On big monitors the UI grows once the screen exceeds this frame, up to UI_MAX_SCALE. */
export const UI_FRAME_COMFY = { width: 1280, height: 860 } as const;
export const UI_MAX_SCALE = 1.5;

export function uiScaleFor(viewportW: number, viewportH: number, min = UI_FRAME_MIN): number {
  const shrink = Math.min(viewportW / min.width, viewportH / min.height);
  if (shrink < 1) return shrink;
  // Large desktop screens: grow panels a little so they don't look lost in the middle.
  return Math.max(1, Math.min(UI_MAX_SCALE, viewportW / UI_FRAME_COMFY.width, viewportH / UI_FRAME_COMFY.height));
}

export function installUiScale(layer: HTMLElement, root: HTMLElement = document.documentElement): () => void {
  let frame = 0;
  const apply = () => {
    frame = 0;
    const { width: vw, height: vh } = visibleViewport();
    const scale = uiScaleFor(vw, vh);
    const w = vw / scale;
    const h = vh / scale;
    if (scale !== 1) {
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
  window.visualViewport?.addEventListener('resize', schedule);
  return () => {
    window.visualViewport?.removeEventListener('resize', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}
