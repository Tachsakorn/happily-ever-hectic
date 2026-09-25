/**
 * Procedural art. Every sprite is drawn once with Canvas2D (in design units,
 * pre-scaled for the render scale) and baked into a texture, so the frame loop
 * only moves images. The same painters draw DOM portraits and icons, so menus
 * and gameplay share one visual hand. This module re-exports the art kit.
 */
export { FONT_BODY, FONT_DISPLAY, groundShadow as softShadow, hex, INK, roundRect, shade, type Painter } from './canvas';
export { heartPath, paintIcon, starPath, ICON_SIZE, type ItemIcon } from './items';
export { paintPerson, PERSON_FEET, PERSON_H, PERSON_W, type HairStyle, type Mood, type PersonLook, type PersonStyle } from './people';
export { isUiIcon, paintBubble, paintDisasterIcon, paintDot, paintMedal, paintPanel, paintRescueButton, paintUiIcon, UI_ICONS, type UiIcon } from './props';
