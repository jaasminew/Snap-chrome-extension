import type { PlatformDetector } from './index';
import { isVisible } from './index';

export const yuanbaoDetector: PlatformDetector = {
  name: 'Yuanbao',

  detect: () => {
    return (
      window.location.hostname.includes('yuanbao') ||
      window.location.hostname.includes('doubao.com')
    );
  },

  getPromptInput: () => {
    const selectors = [
      'textarea[placeholder*="问"]',
      'textarea[placeholder*="输入"]',
      'textarea[placeholder*="Ask"]',
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
    const input = yuanbaoDetector.getPromptInput();
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
      const currentText = yuanbaoDetector.extractPromptText();
      if (currentText !== lastText) {
        lastText = currentText;
        callback(currentText);
      }
    }, 200);

    return () => clearInterval(interval);
  },
};
