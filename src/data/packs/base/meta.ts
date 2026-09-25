import type { DecorDef, DialogueDef, ScoringRules, TuningDef, UpgradeDef } from '../../../content/types';

export const tuning: TuningDef = {
  plannerSpeed: 400,
  guestWalkSpeed: 150,
  maxQueuedActions: 6,
  hands: 2,
  work: { takeOrder: 0.6, serve: 0.35, pickUp: 0.25, dropGifts: 0.4, discard: 0.3 },
  settleSeconds: [1.5, 3],
  upsetSeconds: 1.6,
  outsideDrainFactor: 0.6,
  eatingRecoveryPerSecond: 3,
  satisfiedRecoveryPerSecond: 1,
  serveHappinessBoost: 25,
  seating: { likePoints: 1.5, dislikePoints: 2, sameGroupPoints: 0.5, happinessPerPointPerSecond: 0.35 },
  mood: {
    start: 70,
    calmRecoveryPerSecond: 0.35,
    guestUpset: 12,
    guestServed: 1.2,
    giftDelivered: 2,
    giftLost: 6,
    coupleRequestServed: 4,
    coupleRequestExpired: 8,
  },
  giftLostAfterSeconds: 60,
  danceSeconds: 7,
  danceHappinessPerSecond: 6,
  secretWorkSeconds: 0.4,
  courses: { appetizerPlateSeconds: 1.5, appetizerEatFactor: 0.6, dessertEatFactor: 0.6, pauseSeconds: [1.5, 3.5], extraBetweenCoursesChance: 0.35 },
  coupleRequestPatienceSeconds: 35,
  decorMatchBonus: { startMood: 10, scoreBonus: 0.1 },
};

export const scoring: ScoringRules = {
  guestSeated: 20,
  seatingLikeBonus: 15,
  orderTaken: 10,
  dishServed: 40,
  requestServed: 25,
  maxTip: 25,
  giftDelivered: 40,
  guestLeftUpset: -60,
  guestLeftHappyPerHeart: 12,
  danceStarted: 35,
  perHappyGuestHeartAtEnd: 10,
  perMoodPointAtEnd: 4,
  appetizerServed: 25,
  dessertServed: 25,
  chainBonusPerStep: 15,
};

export const decor: DecorDef[] = [
  { id: 'pastel-peonies', name: 'Pastel Peonies', description: 'Soft pink peonies on every table.', tags: ['flowers', 'pastel'], visual: { color: 0xf2a7b8, icon: 'bouquet' } },
  { id: 'fairy-lights', name: 'Fairy Lights', description: 'Warm string lights and lanterns.', tags: ['lights', 'rustic'], visual: { color: 0xf3d46b, icon: 'lantern' } },
  { id: 'classic-white', name: 'Classic White', description: 'White roses, linen and candles.', tags: ['classic', 'elegant'], visual: { color: 0xf4f0ea, icon: 'candles' } },
  { id: 'tropical', name: 'Tropical Bloom', description: 'Orchids, palms and bright colours.', tags: ['bright', 'tropical'], visual: { color: 0x5fc49a, icon: 'tropical' } },
];

export const upgrades: UpgradeDef[] = [
  { id: 'comfy-chairs', name: 'Comfy Chairs', description: 'Guests lose patience 15% slower.', cost: 150, modifiers: { guestPatienceDrain: 0.85 }, icon: 'chair' },
  { id: 'running-shoes', name: 'Running Shoes', description: 'Your planner walks 15% faster.', cost: 200, modifiers: { plannerSpeed: 1.15 }, icon: 'shoe' },
  { id: 'extra-chef', name: 'Extra Chef', description: 'The kitchen cooks 25% faster.', cost: 250, modifiers: { kitchenCookTime: 0.75 }, icon: 'chef' },
  { id: 'early-warning', name: 'Walkie-Talkie', description: 'Disaster warnings last 50% longer.', cost: 200, modifiers: { disasterWarningTime: 1.5 }, icon: 'walkie' },
  { id: 'extra-stove', name: 'Extra Stove', description: 'The chef can cook one more dish at the same time.', cost: 350, modifiers: { kitchenBurners: 1 }, icon: 'chef' },
  { id: 'string-quartet', name: 'String Quartet', description: 'The couple stays calmer: mood losses 15% smaller.', cost: 300, modifiers: { coupleMoodDrain: 0.85 }, icon: 'violin' },
];

export const dialogues: DialogueDef[] = [
  {
    id: 'intro-level-1',
    lines: [
      { speaker: 'Emma', text: 'We just want a small, happy garden reception. Nothing fancy!' },
      { speaker: 'Noah', text: 'And nobody sitting alone. Our friends and family mean everything.' },
      { speaker: 'Planner', text: 'Leave it to me. Seat them, feed them, keep you two smiling.' },
    ],
  },
  {
    id: 'outro-level-1',
    lines: [{ speaker: 'Emma', text: 'That was perfect. Thank you for making it feel so easy!' }],
  },
  {
    id: 'intro-level-2',
    lines: [
      { speaker: 'Priya', text: 'My family always brings gifts. Lots of gifts. Please don’t let any go missing!' },
      { speaker: 'Sam', text: 'Gifts go to the gift table by the entrance. You can carry two at a time!' },
    ],
  },
  {
    id: 'outro-level-2',
    lines: [{ speaker: 'Sam', text: 'Every gift made it to the table. Priya’s aunties are impressed — that never happens.' }],
  },
  {
    id: 'intro-level-3',
    lines: [
      { speaker: 'Mei', text: 'Our cake has four tiers. Jonah insisted.' },
      { speaker: 'Jonah', text: 'It’s heavy, so carry it with both hands when it’s time to cut it. And watch out for spills!' },
    ],
  },
  {
    id: 'outro-level-3',
    lines: [{ speaker: 'Mei', text: 'Not a single crumb on the floor. Well… almost.' }],
  },
  {
    id: 'intro-level-4',
    lines: [
      { speaker: 'Lina', text: 'Small problem: Nonna Rosa and Uncle Vito haven’t spoken in eleven years.' },
      { speaker: 'Marco', text: 'Keep them at different tables. And my boss hates noisy kids.' },
      { speaker: 'Planner', text: 'While you drag a guest, the tables glow: green means friends, red means trouble.' },
    ],
  },
  {
    id: 'outro-level-4',
    lines: [{ speaker: 'Marco', text: 'Nonna and Vito actually danced together. You’re a miracle worker.' }],
  },
  {
    id: 'intro-level-5',
    lines: [
      { speaker: 'June', text: 'We invited everyone. The dog is the ring bearer. The DJ is my cousin.' },
      { speaker: 'Theo', text: 'What could possibly go wrong?' },
    ],
  },
  {
    id: 'outro-level-5',
    lines: [{ speaker: 'June', text: 'Chaos, cake and a very good boy. Best day ever!' }],
  },
  {
    id: 'intro-beach-dance',
    lines: [
      { speaker: 'Nia', text: 'Barefoot wedding on the beach! Our friends came here to dance.' },
      { speaker: 'Kai', text: 'When someone gets the urge, walk them over to the dance floor by the DJ.' },
    ],
  },
  {
    id: 'outro-beach-dance',
    lines: [{ speaker: 'Kai', text: 'Sand in every shoe and nobody cares. What a party!' }],
  },
  {
    id: 'intro-critics-table',
    lines: [
      { speaker: 'Vera', text: 'Dante’s family runs a restaurant. They invited every food critic in town.' },
      { speaker: 'Dante', text: 'They hate waiting. They love tipping. Please feed them first.' },
    ],
  },
  {
    id: 'outro-critics-table',
    lines: [{ speaker: 'Dante', text: 'Monsieur Laurent smiled. Twice! That has never happened.' }],
  },
  {
    id: 'intro-moonlight',
    lines: [
      { speaker: 'Zoe', text: 'A reception under the stars, with lanterns everywhere!' },
      { speaker: 'Finn', text: 'Night owls are impatient, though. And my cousins brought the puppy again.' },
    ],
  },
  {
    id: 'outro-moonlight',
    lines: [{ speaker: 'Zoe', text: 'Dancing under the moon… we’ll remember this forever.' }],
  },
  {
    id: 'intro-big-night',
    lines: [
      { speaker: 'Iris', text: 'Twenty guests, two critics, one very long night.' },
      { speaker: 'Felix', text: 'If you can plan this one, you can plan anything.' },
      { speaker: 'Planner', text: 'Deep breath. Couple first, disasters next, then the guests.' },
    ],
  },
  {
    id: 'outro-big-night',
    lines: [{ speaker: 'Felix', text: 'You did it! Honestly, you should plan your own wedding next.' }],
  },
];
