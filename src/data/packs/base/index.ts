import type { ContentPack } from '../../../content/types';
import { disasters, moments } from './chaos';
import { decor, dialogues, scoring, tuning, upgrades } from './meta';
import { groups, guestTypes, items, traits } from './people';
import { beachDeck, gardenHall, grandBallroom, lanternNight } from './venues';
import { levels, weddings } from './weddings';

/** The base game: systems-agnostic content anyone could play. Personal content lives in its own pack. */
export const basePack: ContentPack = {
  id: 'base',
  info: {
    title: 'Happily Ever Hectic',
    tagline: 'A wedding planner’s race against chaos',
    plannerName: 'Planner',
  },
  tuning,
  scoring,
  items,
  traits,
  guestTypes,
  groups,
  venues: [gardenHall, beachDeck, grandBallroom, lanternNight],
  disasters,
  moments,
  weddings,
  levels,
  decor,
  upgrades,
  dialogues,
};
