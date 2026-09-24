import lilita from '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2?url';
import baloo500 from '@fontsource/baloo-2/files/baloo-2-latin-500-normal.woff2?url';
import baloo700 from '@fontsource/baloo-2/files/baloo-2-latin-700-normal.woff2?url';
import baloo800 from '@fontsource/baloo-2/files/baloo-2-latin-800-normal.woff2?url';

/**
 * The game's fonts ship inside the build (no CDN), so the game looks the same
 * offline and from the home screen. Canvas text cannot re-render when a web
 * font arrives late, so boot waits for these before the first scene starts.
 */
const FACES: readonly { family: string; url: string; weight: string }[] = [
  { family: 'Lilita One', url: lilita, weight: '400' },
  { family: 'Baloo 2', url: baloo500, weight: '500' },
  { family: 'Baloo 2', url: baloo700, weight: '700' },
  { family: 'Baloo 2', url: baloo800, weight: '800' },
];

export async function loadGameFonts(timeoutMs = 3000): Promise<void> {
  if (typeof FontFace === 'undefined') return;
  const loads = FACES.map(async (f) => {
    const face = new FontFace(f.family, `url(${f.url}) format('woff2')`, { weight: f.weight, display: 'block' });
    await face.load();
    document.fonts.add(face);
  });
  // A missing font must never block the game: fall back to system fonts after a short wait.
  await Promise.race([Promise.allSettled(loads), new Promise((r) => setTimeout(r, timeoutMs))]);
}
