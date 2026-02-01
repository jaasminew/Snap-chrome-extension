import type { PlatformDetector } from './index';
import { isVisible } from './index';

export const deepseekDetector: PlatformDetector = {
  name: 'DeepSeek',

  detect: () => {
    return (
      window.location.hostname.includes('deepseek.com') ||
      window.location.hostname.includes('chat.deepseek.com')
    );
  },

  getPromptInput: () => {
    const selectors = [
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="message"]',
      'div[contenteditable="true"][role="textbox"]',
      '.ProseMirror[contenteditable="true"]',
      'textarea',
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
    const input = deepseekDetector.getPromptInput();
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
      const currentText = deepseekDetector.extractPromptText();
      if (currentText !== lastText) {
        lastText = currentText;
        callback(currentText);
      }
    }, 200);

    return () => clearInterval(interval);
  },
};
