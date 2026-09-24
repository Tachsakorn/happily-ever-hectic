import type { ContentRegistry } from '../content/ContentRegistry';
import { applyResult, buyUpgrade, grantCoins, receptionModifiers, resetProgress, unlockAllLevels, type ResultOutcome } from '../core/progression/progression';
import type { SaveData, Settings } from '../core/progression/saveData';
import type { ReceptionResult } from '../core/scoring/results';
import { ReceptionSession } from '../core/sim/ReceptionSession';
import type { AudioService } from '../platform/audio/AudioService';
import type { SaveService } from '../platform/save/SaveService';
import { SceneKey } from '../render/config';
import type { PhaserHost } from '../render/PhaserHost';
import type { ReceptionSceneData } from '../render/scenes/ReceptionScene';
import type { Screen, ScreenStack, ScreenTransition } from '../ui/Screen';
import { BootScreen } from '../ui/screens/BootScreen';
import { DialogueScreen } from '../ui/screens/DialogueScreen';
import { PauseScreen, PlayingScreen, ResultsScreen } from '../ui/screens/InPlayScreens';
import { LevelSelectScreen } from '../ui/screens/LevelSelectScreen';
import { MainMenuScreen } from '../ui/screens/MainMenuScreen';
import { PrepScreen } from '../ui/screens/PrepScreen';
import { AppFlow, AppState, type AppStateId, type StateChange } from './AppFlow';
import { AudioDirector } from './AudioDirector';
import type { SettingsVM, UiCue } from '../ui/screens/common';
import type { Cheat } from '../core/sim/cheats';
import { decorLook, dialogueVM, levelCards, menuVM, nextLevelId, prepVM, resultsVM, shopItems } from './viewModels';

interface FlowContext {
  levelId: string | null;
  decorId: string | null;
  result: ReceptionResult | null;
  outcome: ResultOutcome | null;
}

export interface GameAppDeps {
  readonly content: ContentRegistry;
  readonly saves: SaveService;
  readonly audio: AudioService;
  readonly host: PhaserHost;
  readonly screens: ScreenStack;
}

/**
 * Wires app states to screens, scenes, saves and audio. Each state has one
 * small handler; gameplay rules live in core, visuals in render/ui.
 */
export class GameApp {
  private readonly flow = new AppFlow<FlowContext>({ levelId: null, decorId: null, result: null, outcome: null });
  private readonly audioDirector: AudioDirector;
  private session: ReceptionSession | null = null;
  private save: SaveData;

  constructor(private readonly deps: GameAppDeps) {
    this.save = deps.saves.load();
    this.audioDirector = new AudioDirector(deps.audio, deps.content);
    this.applySettings(this.save.settings);
    this.flow.subscribe((c) => this.onState(c));
  }

  /** The running reception, for automated smoke tests only (see main.ts `?debug`). */
  get activeSession(): ReceptionSession | null {
    return this.session;
  }

  start(): void {
    this.show(this.screenForBoot());
  }

  private get ctx(): Readonly<FlowContext> {
    return this.flow.ctx;
  }

  private go(to: AppStateId, patch: Partial<FlowContext> = {}): void {
    this.flow.transition(to, patch);
  }

  /** Menus wipe with the curtain; in-play overlays (playing, pause) cut instantly. */
  private show(screen: Screen | null, transition: ScreenTransition = 'curtain'): void {
    this.deps.screens.show(screen, transition);
  }

  private cue = (cue: UiCue): void => {
    this.deps.audio.play(cue);
  };

  private persist(next: SaveData): void {
    this.save = next;
    this.deps.saves.save(next);
  }

  private applySettings(s: Settings): void {
    this.deps.audio.setMusicEnabled(s.music);
    this.deps.audio.setSfxEnabled(s.sfx);
  }

  private updateSettings = (s: SettingsVM): void => {
    const next: Settings = { ...this.save.settings, ...s };
    this.applySettings(next);
    this.persist({ ...this.save, settings: next });
  };

  /** Hidden switch on the title screen: turns the playtest tools on or off. */
  private toggleTestTools = (): boolean => {
    const on = !this.save.settings.testTools;
    this.persist({ ...this.save, settings: { ...this.save.settings, testTools: on } });
    this.deps.audio.play(on ? 'coin' : 'nope');
    return on;
  };

  private testMapAction = (action: 'unlockAll' | 'coins' | 'reset'): void => {
    const { content } = this.deps;
    if (!this.save.settings.testTools) return;
    if (action === 'unlockAll') this.persist(unlockAllLevels(content, this.save));
    else if (action === 'coins') this.persist(grantCoins(this.save, 500));
    else this.persist(resetProgress(this.save));
    this.deps.audio.play('coin');
    this.show(this.mapScreen(), 'cut');
  };

  /** Applies a playtest shortcut and goes straight back to the reception, which reacts to it. */
  private testCheat = (cheat: Cheat): void => {
    if (!this.save.settings.testTools || !this.session) return;
    this.session.cheat(cheat);
    this.go(AppState.RECEPTION_PLAYING);
  };

  private mapScreen(): Screen {
    const { content, audio } = this.deps;
    return new LevelSelectScreen(
      { levels: levelCards(content, this.save), coins: this.save.coins, shop: shopItems(content, this.save), testTools: this.save.settings.testTools },
      {
        pick: (levelId) => this.go(AppState.WEDDING_PREPARATION, { levelId }),
        back: () => this.go(AppState.MAIN_MENU),
        buy: (id) => {
          const next = buyUpgrade(content, this.save, id);
          if ('error' in next) {
            audio.play('nope');
            return null;
          }
          audio.play('coin');
          this.persist(next);
          return { coins: next.coins, shop: shopItems(content, next) };
        },
        cue: this.cue,
        test: this.testMapAction,
      },
    );
  }

  private screenForBoot(): Screen {
    const { info } = this.deps.content;
    return new BootScreen({ title: info.title, tagline: info.tagline }, () => {
      this.deps.audio.unlock();
      this.deps.audio.play('tap');
      this.go(AppState.MAIN_MENU);
    });
  }

  private onState({ to }: StateChange<FlowContext>): void {
    const { content, audio, host } = this.deps;
    switch (to) {
      case AppState.MAIN_MENU:
        audio.setMusicPlaying(true);
        audio.setMusicDucked(false);
        this.show(
          new MainMenuScreen(menuVM(content, this.save), {
            play: () => this.go(AppState.PROGRESSION),
            settings: this.updateSettings,
            toggleTestTools: this.toggleTestTools,
          }),
        );
        break;

      case AppState.PROGRESSION:
        this.endSession();
        audio.setMusicDucked(false);
        this.show(this.mapScreen());
        break;

      case AppState.WEDDING_PREPARATION: {
        this.endSession();
        const levelId = this.requireLevel();
        this.show(
          new PrepScreen(prepVM(content, this.save, levelId), {
            start: (decorId) => this.go(AppState.RECEPTION_INTRO, { decorId }),
            back: () => this.go(AppState.PROGRESSION),
            cue: this.cue,
          }),
        );
        break;
      }

      case AppState.RECEPTION_INTRO: {
        this.startSession();
        const level = content.levels.get(this.requireLevel());
        const intro = level.introDialogueId ? content.dialogues.get(level.introDialogueId).lines : [];
        this.show(new DialogueScreen(dialogueVM(content, intro, level.id), { onDone: () => this.go(AppState.RECEPTION_PLAYING), doneLabel: 'Let’s go!' }));
        break;
      }

      case AppState.RECEPTION_PLAYING:
        if (this.session) this.session.paused = false;
        host.resume(SceneKey.RECEPTION);
        audio.setMusicDucked(false);
        this.show(new PlayingScreen(() => this.go(AppState.PAUSED)), 'cut');
        break;

      case AppState.PAUSED:
        if (this.session) this.session.paused = true;
        host.pause(SceneKey.RECEPTION);
        audio.setMusicDucked(true);
        this.show(
          new PauseScreen(
            { settings: this.save.settings, levelName: content.levels.get(this.requireLevel()).name, testTools: this.save.settings.testTools },
            {
              resume: () => this.go(AppState.RECEPTION_PLAYING),
              restart: () => this.go(AppState.RECEPTION_INTRO),
              quit: () => this.go(AppState.PROGRESSION),
              settings: this.updateSettings,
              cheat: this.testCheat,
            },
          ),
          'cut',
        );
        break;

      case AppState.WEDDING_COMPLETE: {
        const session = this.session;
        if (!session) throw new Error('Wedding completed without a session');
        const result = session.sim.result();
        const outcome = applyResult(content, this.save, result);
        this.persist(outcome.save);
        this.flow.transition(AppState.RESULTS, { result, outcome });
        break;
      }

      case AppState.RESULTS:
        this.showResults();
        break;

      default:
        break;
    }
  }

  private showResults(): void {
    const { content, audio } = this.deps;
    const { result, outcome } = this.ctx;
    if (!result || !outcome) throw new Error('Results without a result');
    const level = content.levels.get(result.levelId);
    const success = result.outcome === 'COMPLETE';
    const next = nextLevelId(content, this.save, level.id);

    const results = () =>
      new ResultsScreen(resultsVM(content, result, outcome, next !== null), {
        retry: () => this.go(AppState.WEDDING_PREPARATION, { levelId: level.id }),
        next: () => next && this.go(AppState.WEDDING_PREPARATION, { levelId: next }),
        map: () => this.go(AppState.PROGRESSION),
        cue: this.cue,
      });

    const isFinal = content.info.finalLevelId === level.id && success;
    const endingId = content.info.endingDialogueId;
    const showEnding = () => {
      if (!isFinal || !endingId) return this.show(results());
      audio.play('cheer');
      this.persist({ ...this.save, seenEnding: true });
      this.show(
        new DialogueScreen(dialogueVM(content, content.dialogues.get(endingId).lines, level.id), {
          onDone: () => this.show(results()),
          doneLabel: 'See the results',
          variant: 'ending',
          heading: 'Happily ever after',
        }),
      );
    };

    const outro = success && level.outroDialogueId ? content.dialogues.get(level.outroDialogueId).lines : [];
    if (outro.length) this.show(new DialogueScreen(dialogueVM(content, outro, level.id), { onDone: showEnding, doneLabel: 'Continue' }));
    else showEnding();
  }

  private requireLevel(): string {
    const id = this.ctx.levelId;
    if (!id) throw new Error('No level selected');
    return id;
  }

  private startSession(): void {
    const { content, host } = this.deps;
    const levelId = this.requireLevel();
    const decorId = this.ctx.decorId;
    this.endSession();
    const session = new ReceptionSession(content, levelId, decorId, receptionModifiers(content, this.save, levelId, decorId), Date.now() >>> 0);
    session.paused = true;
    this.session = session;
    const data: ReceptionSceneData = {
      session,
      renderScale: host.renderScale,
      decor: decorLook(content, decorId),
      onEvents: (events) => this.audioDirector.handle(events, session.sim.state),
      onEnded: () => {
        if (this.session === session && this.flow.canTransition(AppState.WEDDING_COMPLETE)) this.go(AppState.WEDDING_COMPLETE);
      },
    };
    host.start(SceneKey.RECEPTION, data);
  }

  private endSession(): void {
    if (!this.session) return;
    this.session = null;
    this.deps.host.stopAll();
  }
}
