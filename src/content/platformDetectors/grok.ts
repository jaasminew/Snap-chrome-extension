import type { PlatformDetector } from './index';
import { isVisible } from './index';

export const grokDetector: PlatformDetector = {
  name: 'Grok',

  detect: () => {
    return (
      window.location.hostname.includes('grok.x.com') ||
      window.location.hostname.includes('x.com') && document.querySelector('[data-testid*="grok"]') !== null
    );
  },

  getPromptInput: () => {
    const selectors = [
      '[data-testid="grok-input"]',
      'textarea[placeholder*="Ask Grok"]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea[aria-label*="message"]',
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
    const input = grokDetector.getPromptInput();
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
      const currentText = grokDetector.extractPromptText();
      if (currentText !== lastText) {
        lastText = currentText;
        callback(currentText);
      }
    }, 200);

    return () => clearInterval(interval);
  },
};
