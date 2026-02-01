import { encrypt, decrypt } from '@/utils/encryption';
import type { Settings, Language } from './types';

// Save encrypted Gemini API key
export async function saveApiKey(key: string): Promise<void> {
  const encrypted = await encrypt(key);
  await chrome.storage.local.set({ apiKey_gemini: encrypted });
}

// Get decrypted Gemini API key
export async function getApiKey(): Promise<string | null> {
  const result = await chrome.storage.local.get(['apiKey_gemini']);
  const encrypted = result.apiKey_gemini;

  if (!encrypted) return null;

  try {
    return await decrypt(encrypted);
  } catch (error) {
    console.error('[Storage] Failed to decrypt API key:', error);
    return null;
  }
}

// Clear API key
export async function clearApiKey(): Promise<void> {
  await chrome.storage.local.remove(['apiKey_gemini']);
}

// Save settings
export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

// Get settings
export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(['settings']);

  if (result.settings) {
    return result.settings;
  }

  // Default settings
  return {
    defaultLanguage: 'zh',
    enabled: true,
  };
}

// Save default language
export async function saveDefaultLanguage(language: Language): Promise<void> {
  const settings = await getSettings();
  settings.defaultLanguage = language;
  await saveSettings(settings);
}

// Get default language
export async function getDefaultLanguage(): Promise<Language> {
  const settings = await getSettings();
  return settings.defaultLanguage;
}

// Check if extension is enabled
export async function isEnabled(): Promise<boolean> {
  const settings = await getSettings();
  return settings.enabled;
}

// Set enabled status
export async function setEnabled(enabled: boolean): Promise<void> {
  const settings = await getSettings();
  settings.enabled = enabled;
  await saveSettings(settings);
}
