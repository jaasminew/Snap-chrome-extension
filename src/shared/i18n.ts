import type { Language } from './types';

// Translation dictionaries
const translations = {
  en: {
    // UI
    assess_button: 'Assess Prompt',
    assessing: 'Assessing...',
    close: 'Close',
    language_toggle_en: 'EN',
    language_toggle_zh: '中文',

    // Scores
    score_red: 'Needs Context',
    score_orange: 'Might Cause Misunderstanding',
    score_green: 'Perfect',

    // Labels
    explanation: 'Explanation:',
    missing_context: 'Missing:',
    no_assessment: 'Click "Assess" to evaluate your prompt',

    // Settings
    settings_title: 'Snap',
    api_key_label: 'Gemini API Key',
    api_key_placeholder: 'AIza...',
    api_key_show: 'Show',
    api_key_hide: 'Hide',
    save_key: 'Save Key',
    default_language_label: 'Default Language',
    extension_status_label: 'Extension Status',
    extension_enabled: 'Enabled',
    extension_disabled: 'Disabled',
    help_text: 'Snap assesses your prompts in real-time using Gemini 3 Flash Preview.',

    // Errors
    error_no_api_key: 'Please configure your Gemini API key in settings',
    error_network: 'Network error. Please check your connection.',
    error_rate_limit: 'Rate limit exceeded. Please wait a moment.',
    error_invalid_api_key: 'Invalid API key. Please check your settings.',
    error_unknown: 'An error occurred. Please try again.',
  },
  zh: {
    // UI
    assess_button: '评估提示词',
    assessing: '评估中...',
    close: '关闭',
    language_toggle_en: 'EN',
    language_toggle_zh: '中文',

    // Scores
    score_red: '需要更多上下文',
    score_orange: '可能引起误解',
    score_green: '完美',

    // Labels
    explanation: '说明：',
    missing_context: '缺少：',
    no_assessment: '点击"评估提示词"来评价您的提示词',

    // Settings
    settings_title: 'Snap',
    api_key_label: 'Gemini API 密钥',
    api_key_placeholder: 'AIza...',
    api_key_show: '显示',
    api_key_hide: '隐藏',
    save_key: '保存密钥',
    default_language_label: '默认语言',
    extension_status_label: '扩展状态',
    extension_enabled: '已启用',
    extension_disabled: '已禁用',
    help_text: 'Snap 使用 Gemini 3 Flash Preview 实时评估您的提示词。',

    // Errors
    error_no_api_key: '请在设置中配置您的 Gemini API 密钥',
    error_network: '网络错误，请检查您的连接。',
    error_rate_limit: '超出速率限制，请稍后再试。',
    error_invalid_api_key: 'API 密钥无效，请检查您的设置。',
    error_unknown: '发生错误，请重试。',
  },
};

export type TranslationKey = keyof typeof translations.en;

// Translation function
export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || translations.en[key] || key;
}

// Get error message
export function getErrorMessage(error: string, lang: Language): string {
  switch (error) {
    case 'NO_API_KEY':
      return t('error_no_api_key', lang);
    case 'NETWORK_ERROR':
      return t('error_network', lang);
    case 'RATE_LIMIT':
      return t('error_rate_limit', lang);
    case 'INVALID_API_KEY':
      return t('error_invalid_api_key', lang);
    default:
      return t('error_unknown', lang);
  }
}
