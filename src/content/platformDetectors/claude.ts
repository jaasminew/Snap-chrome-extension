import type { PlatformDetector } from './index';
import { isVisible } from './index';

export const claudeDetector: PlatformDetector = {
  name: 'Claude',

  detect: () => {
    return window.location.hostname.includes('claude.ai');
  },

  getPromptInput: () => {
    const selectors = [
      '[data-testid="chat-input"]',
      '.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="Talk to Claude"]',
      'textarea[placeholder*="Reply to Claude"]',
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
    const input = claudeDetector.getPromptInput();
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
      const currentText = claudeDetector.extractPromptText();
      if (currentText !== lastText) {
        lastText = currentText;
        callback(currentText);
      }
    }, 200);

    return () => clearInterval(interval);
  },
};
