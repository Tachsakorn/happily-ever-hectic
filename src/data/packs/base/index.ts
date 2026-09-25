import type { ContentPack } from '../../../content/types';
import { disasters, moments } from './chaos';
import { dialogues, planOptions, scoring, tuning, upgrades } from './meta';
import { groups, guestTypes, items, services, traits } from './people';
import { achievements, secretEvents } from './secrets';
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
  services,
  weddings,
  levels,
  planOptions,
  upgrades,
  dialogues,
  secretEvents,
  achievements,
};
