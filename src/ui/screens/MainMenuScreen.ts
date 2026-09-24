import { DomScreen } from '../Screen';
import { button, h, type Disposer } from '../dom';

export interface SettingsVM {
  readonly music: boolean;
  readonly sfx: boolean;
}

export function settingsToggles(settings: SettingsVM, onChange: (next: SettingsVM) => void, disposer: Disposer): HTMLElement {
  let current = settings;
  const musicBtn = button('', () => update({ ...current, music: !current.music }), disposer, 'small-secondary');
  const sfxBtn = button('', () => update({ ...current, sfx: !current.sfx }), disposer, 'small-secondary');
  const paint = () => {
    musicBtn.textContent = current.music ? '♪ Music on' : '♪ Music off';
    sfxBtn.textContent = current.sfx ? '🔔 Sounds on' : '🔕 Sounds off';
  };
  const update = (next: SettingsVM) => {
    current = next;
    paint();
    onChange(next);
  };
  paint();
  return h('div', { class: 'toggles' }, musicBtn, sfxBtn);
}

export class MainMenuScreen extends DomScreen {
  constructor(
    private readonly vm: { title: string; tagline: string; settings: SettingsVM },
    private readonly actions: { play: () => void; settings: (s: SettingsVM) => void },
  ) {
    super();
  }

  protected render(): HTMLElement {
    return h(
      'div',
      { class: 'screen menu-screen' },
      h('div', { class: 'menu-hearts', text: '♥ ♥ ♥' }),
      h('h1', { class: 'title', text: this.vm.title }),
      h('p', { class: 'subtitle', text: this.vm.tagline }),
      button('Play', this.actions.play, this.disposer),
      settingsToggles(this.vm.settings, this.actions.settings, this.disposer),
    );
  }
}
