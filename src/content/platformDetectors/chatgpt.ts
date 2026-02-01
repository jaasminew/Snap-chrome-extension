import type { PlatformDetector } from './index';
import { isVisible } from './index';

export const chatGPTDetector: PlatformDetector = {
  name: 'ChatGPT',

  detect: () => {
    return (
      window.location.hostname.includes('chatgpt.com') ||
      window.location.hostname.includes('chat.openai.com')
    );
  },

  getPromptInput: () => {
    const selectors = [
      '#prompt-textarea',
      '[data-testid="prompt-textarea"]',
      'textarea[placeholder*="Message"]',
      'div[contenteditable="true"][role="textbox"]',
      '.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"]',
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
    const input = chatGPTDetector.getPromptInput();
    if (!input) return '';

    // Handle both textContent and value
    return (
      input.textContent?.trim() ||
      (input as HTMLInputElement).value?.trim() ||
      ''
    );
  },

  observeChanges: (callback) => {
    let lastText = '';
    const interval = setInterval(() => {
      const currentText = chatGPTDetector.extractPromptText();
      if (currentText !== lastText) {
        lastText = currentText;
        callback(currentText);
      }
    }, 200);

    return () => clearInterval(interval);
  },
};
