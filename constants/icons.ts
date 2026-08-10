import { colors } from "@/constants/theme";

import activity from "@/assets/icons/activity.png";
import add from "@/assets/icons/add.png";
import adobe from "@/assets/icons/adobe.png";
import back from "@/assets/icons/back.png";
import canva from "@/assets/icons/canva.png";
import claude from "@/assets/icons/claude.png";
import dropbox from "@/assets/icons/dropbox.png";
import figma from "@/assets/icons/figma.png";
import github from "@/assets/icons/github.png";
import home from "@/assets/icons/home.png";
import medium from "@/assets/icons/medium.png";
import menu from "@/assets/icons/menu.png";
import notion from "@/assets/icons/notion.png";
import openai from "@/assets/icons/openai.png";
import plus from "@/assets/icons/plus.png";
import setting from "@/assets/icons/setting.png";
import spotify from "@/assets/icons/spotify.png";
import wallet from "@/assets/icons/wallet.png";

export const icons = {
    home,
    wallet,
    setting,
    activity,
    add,
    back,
    menu,
    plus,
    notion,
    dropbox,
    openai,
    adobe,
    medium,
    figma,
    spotify,
    github,
    claude,
    canva,
} as const;

export type IconKey = keyof typeof icons;

/**
 * Glyphs authored white-on-transparent for the dark tab bar. They are invisible
 * on the app's cream surfaces, so anything drawing them outside the tab bar has
 * to tint them — `wallet` in particular is the fallback icon for every
 * subscription that doesn't match a brand.
 */
const LIGHT_ON_DARK_GLYPHS: readonly IconKey[] = [
    "home",
    "wallet",
    "setting",
    "activity",
];

/**
 * Tint to apply when rendering `key` on a light surface, or `undefined` for
 * full-colour brand logos that must not be flattened.
 */
export const tintForLightSurface = (key: IconKey): string | undefined =>
    LIGHT_ON_DARK_GLYPHS.includes(key) ? colors.primary : undefined;