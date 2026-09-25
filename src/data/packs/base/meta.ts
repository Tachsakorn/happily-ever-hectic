import type { PlanOptionDef, DialogueDef, ScoringRules, TuningDef, UpgradeDef } from '../../../content/types';

export const tuning: TuningDef = {
  plannerSpeed: 400,
  guestWalkSpeed: 150,
  maxQueuedActions: 6,
  hands: 2,
  work: { takeOrder: 0.6, serve: 0.35, pickUp: 0.25, dropGifts: 0.4, discard: 0.3, service: 0.8 },
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
  courses: { appetizerPlateSeconds: 1.5, appetizerEatFactor: 0.6, dessertEatFactor: 0.6, pauseSeconds: [1.5, 3.5], extraBetweenCoursesChance: 0.35, lingerSeconds: [2, 4] },
  rescue: { guestHappiness: 45, mood: 4 },
  coupleRequestPatienceSeconds: 35,
  // Four right picks ≈ the old perfect-decor bonus, doubled.
  planMatchBonus: { startMood: 4, scoreBonus: 0.04 },
  goalCoinReward: 40,
  coupleStates: [
    { id: 'blissful', label: 'Blissful', minMood: 80, requestPatience: 1.1 },
    { id: 'happy', label: 'Happy', minMood: 55, requestPatience: 1 },
    { id: 'worried', label: 'Worried', minMood: 35, requestPatience: 0.9 },
    { id: 'stressed', label: 'Stressed!', minMood: 15, requestPatience: 0.8 },
    { id: 'meltdown', label: 'Meltdown!!', minMood: 0, requestPatience: 0.7 },
  ],
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
  rescueUnused: 120,
};

/**
 * The wedding plan. Tags are matched against each wedding's `lovesTags`; the
 * invitation's `planHints` are the clues. Keep tags distinct across options in
 * a category so every clue points at one answer.
 */
export const planOptions: PlanOptionDef[] = [
  { id: 'pastel-peonies', category: 'decor', name: 'Pastel Peonies', description: 'Soft pink peonies on every table.', tags: ['flowers', 'pastel'], visual: { color: 0xf2a7b8, icon: 'bouquet' } },
  { id: 'fairy-lights', category: 'decor', name: 'Fairy Lights', description: 'Warm string lights and lanterns.', tags: ['lights', 'rustic'], visual: { color: 0xf3d46b, icon: 'lantern' } },
  { id: 'classic-white', category: 'decor', name: 'Classic White', description: 'White roses, linen and candles.', tags: ['classic', 'elegant'], visual: { color: 0xf4f0ea, icon: 'candles' } },
  { id: 'tropical', category: 'decor', name: 'Tropical Bloom', description: 'Orchids, palms and bright colours.', tags: ['bright', 'tropical'], visual: { color: 0x5fc49a, icon: 'tropical' } },

  { id: 'garden-feast', category: 'menu', name: 'Garden Feast', description: 'Herb risotto and roast chicken.', tags: ['garden'], menuItemIds: ['risotto', 'roast-chicken'], visual: { color: 0x7fae4f, icon: 'dish:risotto' } },
  { id: 'from-the-sea', category: 'menu', name: 'From the Sea', description: 'Grilled salmon and garden risotto.', tags: ['seafood'], menuItemIds: ['salmon', 'risotto'], visual: { color: 0xf08a6c, icon: 'dish:fish' } },
  { id: 'grand-banquet', category: 'menu', name: 'Grand Banquet', description: 'Roast chicken and grilled salmon.', tags: ['banquet'], menuItemIds: ['roast-chicken', 'salmon'], visual: { color: 0xd9a066, icon: 'dish:chicken' } },
  { id: 'chefs-trio', category: 'menu', name: 'Chef’s Trio', description: 'A little of everything — three mains.', tags: ['foodie'], menuItemIds: ['roast-chicken', 'salmon', 'risotto'], visual: { color: 0xe8b4c4, icon: 'dish:trio' } },

  { id: 'strawberry-cream', category: 'cake', name: 'Strawberry Cream', description: 'Fresh strawberries and pink cream.', tags: ['strawberry', 'pastel'], visual: { color: 0xf7b7c6, accent: 0xe05a7a, icon: 'cake' } },
  { id: 'chocolate-tower', category: 'cake', name: 'Chocolate Tower', description: 'Three tiers of dark chocolate.', tags: ['chocolate'], visual: { color: 0x8a5a3a, accent: 0x4a2c1a, icon: 'cake' } },
  { id: 'lemon-chiffon', category: 'cake', name: 'Lemon Chiffon', description: 'Light, zesty and sunny yellow.', tags: ['lemon', 'bright'], visual: { color: 0xf6e27a, accent: 0xe0b83a, icon: 'cake' } },
  { id: 'vanilla-classic', category: 'cake', name: 'Vanilla Classic', description: 'White fondant and sugar roses.', tags: ['vanilla', 'classic'], visual: { color: 0xfffaf2, accent: 0xe8b4c4, icon: 'cake' } },

  { id: 'island', category: 'honeymoon', name: 'Tropical Island', description: 'White sand and turquoise sea.', tags: ['beach', 'tropical'], visual: { color: 0x5fc4c9, icon: 'trip:island' } },
  { id: 'paris', category: 'honeymoon', name: 'Paris', description: 'Cafés, bridges and the Eiffel Tower.', tags: ['paris', 'romantic'], visual: { color: 0xb49be0, icon: 'trip:tower' } },
  { id: 'mountain-cabin', category: 'honeymoon', name: 'Mountain Cabin', description: 'Snowy peaks and a crackling fire.', tags: ['mountains', 'cozy'], visual: { color: 0x7fb08a, icon: 'trip:mountain' } },
  { id: 'city-lights', category: 'honeymoon', name: 'City Lights', description: 'Skyscrapers, rooftops and late nights.', tags: ['city'], visual: { color: 0x6b8fd6, icon: 'trip:city' } },
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
