import type { AchievementDef, SecretEventDef, Vec2 } from '../../../content/types';

/*
 * Secret events: rare surprises that reward a sharp-eyed planner. Positions
 * are on walkable floor of the shared venue layout (aisle crossings, the
 * free strip left of the waiting area) so the planner can always reach them.
 */
const AISLE_SPOTS: Vec2[] = [
  { x: 675, y: 570 },
  { x: 985, y: 570 },
  { x: 330, y: 570 },
  { x: 675, y: 850 },
];

export const secretEvents: SecretEventDef[] = [
  {
    id: 'golden-bouquet',
    name: 'Golden Bouquet',
    chance: 0.12,
    window: [45, 170],
    requires: [],
    spots: AISLE_SPOTS,
    staySeconds: 12,
    appearText: 'A golden bouquet just fell from nowhere! Grab it before it fades!',
    foundText: 'You caught the golden bouquet! Lucky you!',
    reward: { score: 250, mood: 8 },
    visual: { icon: 'golden-bouquet', color: 0xf2b84b },
  },
  {
    id: 'shooting-star',
    name: 'Shooting Star',
    chance: 1,
    window: [50, 210],
    // Only a very happy night-time couple gets to see it.
    requires: [
      { kind: 'theme', themes: ['night'] },
      { kind: 'minMood', value: 90 },
    ],
    spots: [{ x: 505, y: 172 }],
    staySeconds: 10,
    appearText: 'A shooting star! Quick — tap it and make a wish!',
    foundText: 'Wish made! The couple will never tell what it was.',
    reward: { score: 300, mood: 10 },
    visual: { icon: 'shooting-star', color: 0xfff3c4 },
  },
  {
    id: 'message-bottle',
    name: 'Message in a Bottle',
    chance: 0.35,
    window: [40, 170],
    requires: [{ kind: 'theme', themes: ['beach'] }],
    spots: [
      { x: 70, y: 400 },
      { x: 70, y: 660 },
    ],
    staySeconds: 12,
    appearText: 'Something washed up on the sand… a message in a bottle?',
    foundText: 'It says: “Love is a wave. Ride it together.”',
    reward: { score: 200, mood: 6 },
    visual: { icon: 'bottle', color: 0x8fd0c0 },
  },
  {
    id: 'lucky-clover',
    name: 'Four-Leaf Clover',
    chance: 0.2,
    window: [40, 150],
    requires: [{ kind: 'theme', themes: ['garden'] }],
    spots: [
      { x: 70, y: 390 },
      { x: 70, y: 660 },
    ],
    staySeconds: 11,
    appearText: 'Is that… a four-leaf clover by the flower pots?',
    foundText: 'A four-leaf clover! Luck is on this wedding’s side.',
    reward: { score: 200, mood: 6 },
    visual: { icon: 'clover', color: 0x6fbf73 },
  },
  {
    id: 'tuxedo-cat',
    name: 'The Tuxedo Cat',
    chance: 0.3,
    window: [40, 180],
    requires: [{ kind: 'theme', themes: ['ballroom'] }],
    spots: AISLE_SPOTS,
    staySeconds: 12,
    appearText: 'A cat in a tiny bow tie just strolled into the ballroom!',
    foundText: 'The tuxedo cat purrs. Best-dressed guest of the night!',
    reward: { score: 220, mood: 6 },
    visual: { icon: 'cat', color: 0x3b3346 },
  },
  {
    id: 'flash-mob',
    name: 'Flash Mob',
    chance: 1,
    window: [30, 240],
    requires: [{ kind: 'dancersAtOnce', count: 3 }],
    spots: 'danceFloor',
    staySeconds: 9,
    appearText: 'Three dancers at once — it’s turning into a flash mob! Jump in!',
    foundText: 'The whole room is dancing! What a moment!',
    reward: { score: 350, mood: 12 },
    visual: { icon: 'disco', color: 0xb49be0 },
  },
];

export const achievements: AchievementDef[] = [
  // ---- visible: a path through the whole game
  { id: 'just-married', name: 'Just Married', description: 'Finish your first wedding.', icon: 'heart', color: 0xe86f8e, condition: { kind: 'weddingsCompleted', count: 1 } },
  { id: 'first-dance', name: 'First Dance', description: 'Send a guest to the dance floor.', icon: 'music', color: 0xb49be0, condition: { kind: 'lifetime', stat: 'dances', count: 1 } },
  { id: 'picture-perfect', name: 'Picture Perfect', description: 'Earn 3 stars on a wedding.', icon: 'star', color: 0xf2b84b, condition: { kind: 'threeStarLevels', count: 1 } },
  { id: 'wedding-season', name: 'Wedding Season', description: 'Finish 10 weddings.', icon: 'heart', color: 0xf49ac1, condition: { kind: 'weddingsCompleted', count: 10 } },
  { id: 'nobody-left-behind', name: 'Nobody Left Behind', description: 'Finish a wedding with 12+ guests and nobody upset.', icon: 'guests', color: 0x7fb08a, condition: { kind: 'reception', minGuests: 12, maxUpset: 0 } },
  { id: 'dance-fever', name: 'Dance Fever', description: 'Send 50 guests dancing.', icon: 'music', color: 0x9784d6, condition: { kind: 'lifetime', stat: 'dances', count: 50 } },
  { id: 'gift-keeper', name: 'Gift Keeper', description: 'Deliver 75 gifts to the gift table.', icon: 'gift', color: 0x8fb8de, condition: { kind: 'lifetime', stat: 'giftsDelivered', count: 75 } },
  { id: 'cool-under-pressure', name: 'Cool Under Pressure', description: 'Fix 30 disasters.', icon: 'wrench', color: 0x8fd0e8, condition: { kind: 'lifetime', stat: 'disastersFixed', count: 30 } },
  { id: 'come-again', name: 'Come Again!', description: 'Wave 100 happy guests goodbye.', icon: 'guests', color: 0xe0a44a, condition: { kind: 'lifetime', stat: 'happyGoodbyes', count: 100 } },
  { id: 'fully-equipped', name: 'Fully Equipped', description: 'Own every upgrade in the shop.', icon: 'shop', color: 0xf2b84b, condition: { kind: 'allUpgradesOwned' } },
  { id: 'overachiever', name: 'Overachiever', description: 'Meet 10 bonus goals.', icon: 'star', color: 0xe0a44a, condition: { kind: 'goalsCompleted', count: 10 } },
  { id: 'perfect-planner', name: 'Perfect Planner', description: 'Guess all four of a couple’s wishes in the wedding plan.', icon: 'heart', color: 0xe86f8e, condition: { kind: 'perfectPlan' } },
  { id: 'star-planner', name: 'Star Planner', description: 'Earn 3 stars on every wedding.', icon: 'trophy', color: 0xf2b84b, condition: { kind: 'threeStarLevels', count: 'all' } },
  { id: 'happily-ever-after', name: 'Happily Ever After', description: 'Finish the final wedding.', icon: 'heart', color: 0xe86f8e, condition: { kind: 'finalLevelCompleted' } },

  // ---- secret: hidden as "???" until found
  { id: 'golden-touch', name: 'Golden Touch', description: 'Caught the golden bouquet.', secret: true, hint: 'Something golden falls — very, very rarely.', icon: 'sparkle', color: 0xf2b84b, condition: { kind: 'secretFound', secretId: 'golden-bouquet' } },
  { id: 'wish-upon-a-star', name: 'Wish Upon a Star', description: 'Caught a shooting star.', secret: true, hint: 'Keep a night-time couple over the moon.', icon: 'moon', color: 0x6f63b0, condition: { kind: 'secretFound', secretId: 'shooting-star' } },
  { id: 'message-received', name: 'Message Received', description: 'Found a message in a bottle.', secret: true, hint: 'Keep an eye on the sand.', icon: 'sparkle', color: 0x5fbfd6, condition: { kind: 'secretFound', secretId: 'message-bottle' } },
  { id: 'lucky-find', name: 'Lucky Find', description: 'Found a four-leaf clover.', secret: true, hint: 'Look closely at the garden.', icon: 'sparkle', color: 0x6fbf73, condition: { kind: 'secretFound', secretId: 'lucky-clover' } },
  { id: 'best-dressed', name: 'Best-Dressed Guest', description: 'Met the tuxedo cat.', secret: true, hint: 'Someone very fancy sneaks into the ballroom.', icon: 'sparkle', color: 0x3b3346, condition: { kind: 'secretFound', secretId: 'tuxedo-cat' } },
  { id: 'flash-mob', name: 'Flash Mob', description: 'Started a flash mob.', secret: true, hint: 'Crowd the dance floor.', icon: 'music', color: 0xb49be0, condition: { kind: 'secretFound', secretId: 'flash-mob' } },
  { id: 'close-call', name: 'Close Call', description: 'Finished a wedding with the couple’s mood below 15.', secret: true, hint: 'Win by a whisker.', icon: 'heart', color: 0xd9534f, condition: { kind: 'reception', maxFinalMood: 14 } },
  { id: 'night-owl', name: 'Night Owl', description: 'Finished a wedding between midnight and 4 AM.', secret: true, hint: 'Some planners never sleep.', icon: 'clock', color: 0x4a4a86, condition: { kind: 'completedDuringHours', from: 0, to: 4 } },
  { id: 'keeper-of-secrets', name: 'Keeper of Secrets', description: 'Found every secret event.', secret: true, hint: 'Find every surprise hidden in the weddings.', icon: 'trophy', color: 0xb49be0, condition: { kind: 'allSecretsFound' } },
];
