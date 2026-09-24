/**
 * iOS Safari ignores `user-scalable=no`, so pinch-zoom and some scroll
 * behaviours must be blocked in JS. Elements marked `data-scrollable`
 * (or `.screen--scroll`) keep native vertical scrolling.
 * Returns a disposer so listeners are never leaked.
 */
export function installTouchHardening(root: Document = document): () => void {
  const preventDefault = (e: Event) => e.preventDefault();

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 1) {
      e.preventDefault();
      return;
    }
    const target = e.target instanceof Element ? e.target : null;
    if (!target?.closest('[data-scrollable], .screen--scroll')) e.preventDefault();
  };

  const opts: AddEventListenerOptions = { passive: false };
  root.addEventListener('gesturestart', preventDefault, opts);
  root.addEventListener('gesturechange', preventDefault, opts);
  root.addEventListener('dblclick', preventDefault, opts);
  root.addEventListener('contextmenu', preventDefault, opts);
  root.addEventListener('touchmove', onTouchMove, opts);

  return () => {
    root.removeEventListener('gesturestart', preventDefault);
    root.removeEventListener('gesturechange', preventDefault);
    root.removeEventListener('dblclick', preventDefault);
    root.removeEventListener('contextmenu', preventDefault);
    root.removeEventListener('touchmove', onTouchMove);
  };
}
