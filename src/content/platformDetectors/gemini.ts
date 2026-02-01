import type { PlatformDetector } from './index';
import { isVisible } from './index';

export const geminiDetector: PlatformDetector = {
  name: 'Gemini',

  detect: () => {
    return window.location.hostname.includes('gemini.google.com');
  },

  getPromptInput: () => {
    const selectors = [
      'textarea[aria-label*="Enter a prompt"]',
      'rich-textarea textarea',
      '.ql-editor[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea[placeholder*="Enter a prompt"]',
      'textarea', // Fallback: any textarea
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && isVisible(el as HTMLElement)) {
        return el as HTMLElement;
      }
    }

    return null;
  },

  extractPromptText: () => {
    const input = geminiDetector.getPromptInput();
    if (!input) return '';

    return (
      input.textContent?.trim() ||
      (input as HTMLInputElement).value?.trim() ||
      ''
    );
  },

  observeChanges: (callback) => {
    let lastText = '';
    const interval = setInterval(() => {
      const currentText = geminiDetector.extractPromptText();
      if (currentText !== lastText) {
        lastText = currentText;
        callback(currentText);
      }
    }, 200);

    return () => clearInterval(interval);
  },
};
