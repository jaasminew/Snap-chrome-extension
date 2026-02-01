import type { Language } from '@/shared/types';

const CJK_CHAR_REGEX = /[\u4e00-\u9fff]/;

export function detectLanguageFromText(text: string): Language {
  return CJK_CHAR_REGEX.test(text) ? 'zh' : 'en';
}
