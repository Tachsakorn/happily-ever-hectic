import './styles.css';
import { AppFlow, AppState, type AppStateId } from './app/AppFlow';
import { installTouchHardening } from './platform/viewport/touchHardening';
import { computeRenderScale } from './platform/viewport/renderScale';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SceneKey } from './render/config';
import { PhaserHost } from './render/PhaserHost';
import { TouchProbeScene } from './render/scenes/TouchProbeScene';
import { ScreenStack, type Screen } from './ui/Screen';
import { BootScreen } from './ui/screens/BootScreen';
import { PlaceholderScreen } from './ui/screens/PlaceholderScreen';

// Composition root: the only module that knows every layer. Everything else
// receives its dependencies explicitly.

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el;
}

installTouchHardening();

const renderScale = computeRenderScale(
  window.screen.width > window.screen.height ? window.screen.width : window.screen.height,
  window.screen.width > window.screen.height ? window.screen.height : window.screen.width,
  window.devicePixelRatio || 1,
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
);

const flow = new AppFlow({ levelId: null as string | null });
const screens = new ScreenStack(requireElement('ui-layer'));
const host = new PhaserHost(requireElement('game-layer'), renderScale, [TouchProbeScene]);

const go = (to: AppStateId) => () => flow.transition(to);

function screenFor(state: AppStateId): Screen | null {
  switch (state) {
    case AppState.BOOT:
      return new BootScreen('Happily Ever Hectic', go(AppState.MAIN_MENU));
    case AppState.MAIN_MENU:
      return new PlaceholderScreen('Main menu', [{ label: 'Play', onTap: go(AppState.PROGRESSION) }]);
    case AppState.PROGRESSION:
      return new PlaceholderScreen('Choose a wedding', [
        { label: 'Wedding 1', onTap: () => flow.transition(AppState.WEDDING_PREPARATION, { levelId: 'demo' }) },
        { label: 'Back', onTap: go(AppState.MAIN_MENU) },
      ]);
    case AppState.WEDDING_PREPARATION:
      return new PlaceholderScreen('Wedding preparation', [
        { label: 'Start reception', onTap: go(AppState.RECEPTION_INTRO) },
      ]);
    case AppState.RECEPTION_INTRO:
      return new PlaceholderScreen('The reception begins!', [
        { label: 'Go', onTap: go(AppState.RECEPTION_PLAYING) },
      ]);
    case AppState.RECEPTION_PLAYING:
      return new PlaceholderScreen('', [
        { label: 'Pause', onTap: go(AppState.PAUSED) },
        { label: 'Finish', onTap: go(AppState.WEDDING_COMPLETE) },
      ]);
    case AppState.PAUSED:
      return new PlaceholderScreen('Paused', [
        { label: 'Resume', onTap: go(AppState.RECEPTION_PLAYING) },
        { label: 'Quit', onTap: go(AppState.PROGRESSION) },
      ]);
    case AppState.WEDDING_COMPLETE:
      return new PlaceholderScreen('Wedding complete!', [{ label: 'Results', onTap: go(AppState.RESULTS) }]);
    case AppState.RESULTS:
      return new PlaceholderScreen('Results', [{ label: 'Continue', onTap: go(AppState.PROGRESSION) }]);
  }
}

flow.subscribe(({ to }) => {
  screens.show(screenFor(to));
  if (to === AppState.RECEPTION_PLAYING) host.start(SceneKey.TOUCH_PROBE, { renderScale });
  if (to === AppState.PROGRESSION || to === AppState.MAIN_MENU) host.stopAll();
});

screens.show(screenFor(flow.state));
