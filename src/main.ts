import './styles.css';
import { GameApp } from './app/GameApp';
import { validateContent } from './content/validate';
import { loadContent } from './data';
import { SynthAudioService } from './platform/audio/SynthAudioService';
import { LocalStorageSaveService } from './platform/save/SaveService';
import { computeRenderScale } from './platform/viewport/renderScale';
import { installTouchHardening } from './platform/viewport/touchHardening';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SceneKey } from './render/config';
import { PhaserHost } from './render/PhaserHost';
import { ReceptionScene } from './render/scenes/ReceptionScene';
import { ScreenStack } from './ui/Screen';

// Composition root: the only module that knows every layer and picks the
// concrete implementations (localStorage saves, WebAudio synth, Phaser).

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el;
}

installTouchHardening();

const content = loadContent();
if (import.meta.env.DEV) {
  const problems = validateContent(content);
  if (problems.length) console.error('Content problems:\n' + problems.join('\n'));
}

const long = Math.max(window.screen.width, window.screen.height);
const short = Math.min(window.screen.width, window.screen.height);
const renderScale = computeRenderScale(long, short, window.devicePixelRatio || 1, DESIGN_WIDTH, DESIGN_HEIGHT);

const app = new GameApp({
  content,
  saves: new LocalStorageSaveService(),
  audio: new SynthAudioService(),
  host: new PhaserHost(requireElement('game-layer'), renderScale, [{ key: SceneKey.RECEPTION, scene: ReceptionScene }]),
  screens: new ScreenStack(requireElement('ui-layer')),
});
app.start();
// Debug handle for automated smoke tests (?debug in the URL). Not used by the game itself.
if (location.search.includes('debug')) (window as unknown as Record<string, unknown>).__app = app;
