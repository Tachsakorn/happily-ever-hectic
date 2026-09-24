import type { System } from '../sim/SimContext';

/** Gifts left on tables too long go missing — a small, readable penalty that makes gifts a real task. */
export const GiftSystem: System = {
  name: 'gifts',
  update(ctx, dt) {
    const gifts = ctx.state.gifts;
    for (let i = gifts.length - 1; i >= 0; i--) {
      const gift = gifts[i];
      if (!gift) continue;
      if (gift.state === 'delivered') {
        gifts.splice(i, 1);
        continue;
      }
      if (gift.state !== 'waiting') continue;
      gift.age += dt;
      if (gift.age >= ctx.tuning.giftLostAfterSeconds) {
        gifts.splice(i, 1);
        ctx.mood.change(-ctx.tuning.mood.giftLost, 'A gift went missing', gift.pos);
      }
    }
  },
};
