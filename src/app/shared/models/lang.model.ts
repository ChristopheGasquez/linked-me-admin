export const AVAILABLE_LANGS = ['fr', 'en'] as const;
export type Lang = (typeof AVAILABLE_LANGS)[number];
