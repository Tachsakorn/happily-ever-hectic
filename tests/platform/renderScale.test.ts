import { describe, expect, it } from 'vitest';
import { computeRenderScale } from '../../src/platform/viewport/renderScale';
import { uiScaleFor } from '../../src/platform/viewport/uiScale';
import { pickViewport } from '../../src/platform/viewport/viewportSize';

describe('computeRenderScale', () => {
  it('renders at 2x on a retina iPad filling the screen', () => {
    // iPad Air landscape: 1180x820 CSS px, dpr 2 → fit ≈ 0.82 → physical ≈ 1.64
    expect(computeRenderScale(1180, 820, 2, 1400, 1000)).toBe(1.75);
    // iPad Pro 12.9": 1366x1024, dpr 2 → physical ≈ 1.95
    expect(computeRenderScale(1366, 1024, 2, 1400, 1000)).toBe(2);
  });

  it('never goes below 1 or above the max', () => {
    expect(computeRenderScale(400, 300, 1, 1400, 1000)).toBe(1);
    expect(computeRenderScale(4000, 3000, 3, 1400, 1000)).toBe(2);
    expect(computeRenderScale(4000, 3000, 3, 1400, 1000, 3)).toBe(3);
  });

  it('is safe with degenerate input', () => {
    expect(computeRenderScale(0, 0, 2, 1400, 1000)).toBe(1);
  });
});

describe('UI frame scaling', () => {
  it('iPads keep the UI at 1:1', () => {
    expect(uiScaleFor(1180, 820)).toBe(1);
    expect(uiScaleFor(1024, 768)).toBe(1);
  });
  it('a big desktop monitor grows the UI a little, never beyond the cap', () => {
    expect(uiScaleFor(1920, 1080)).toBeCloseTo(1080 / 860, 5);
    expect(uiScaleFor(3840, 2160)).toBe(1.5);
    expect(uiScaleFor(1366, 768)).toBe(1);
  });

  it('a phone in landscape lays the UI out larger and scales it down', () => {
    const s = uiScaleFor(844, 390);
    expect(s).toBeCloseTo(390 / 700, 5);
    expect(390 / s).toBeGreaterThanOrEqual(700 - 1e-6);
  });
});

describe('visible viewport', () => {
  const readings = (over: Partial<import('../../src/platform/viewport/viewportSize').ViewportReadings> = {}) => ({
    visual: { width: 1180, height: 796, left: 0, top: 0 },
    inner: { width: 1180, height: 796 },
    client: { width: 1180, height: 796 },
    screen: { width: 820, height: 1180 },
    standalone: false,
    ...over,
  });

  it('in the browser, follows the visual viewport (toolbars take their share)', () => {
    expect(pickViewport(readings())).toEqual({ width: 1180, height: 796, left: 0, top: 0 });
  });

  it('as a home-screen app filling the screen, covers the whole screen (no strip under a translucent status bar)', () => {
    expect(pickViewport(readings({ standalone: true }))).toEqual({ width: 1180, height: 820, left: 0, top: 0 });
  });

  it('as a home-screen app in Split View, keeps the window size', () => {
    const split = readings({ standalone: true, visual: { width: 700, height: 796, left: 0, top: 0 }, inner: { width: 700, height: 796 }, client: { width: 700, height: 796 } });
    expect(pickViewport(split)).toEqual({ width: 700, height: 796, left: 0, top: 0 });
  });
});
