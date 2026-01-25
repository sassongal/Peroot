import type he from '@/i18n/dictionaries/he.json';

export type Locale = 'he' | 'en';

const dictionaries = {
  he: () => import('@/i18n/dictionaries/he.json').then((module) => module.default),
  en: () => import('@/i18n/dictionaries/en.json').then((module) => module.default),
};

export const getDictionary = async (locale: Locale) => dictionaries[locale]();

export type Dictionary = typeof he;
