import type { PlatformDetector } from './index';
import { isVisible } from './index';

export const genericDetector: PlatformDetector = {
  name: 'Generic Chatbot',

  detect: () => {
    // Generic detector always returns true as fallback
    // It will be tried last in the detector registry
    return genericDetector.getPromptInput() !== null;
  },

  getPromptInput: () => {
    // Search for common chatbot input patterns
    const selectors = [
      // Textareas with chat-related placeholders (case insensitive)
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="chat" i]',
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="ask" i]',
      'textarea[placeholder*="type" i]',
      'textarea[placeholder*="send" i]',
      'textarea[placeholder*="问" i]', // Chinese "ask"
      'textarea[placeholder*="输入" i]', // Chinese "input"

      // Contenteditable divs (common for modern chat UIs)
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"].ProseMirror',

      // Large textareas (likely for chat)
      'textarea[rows]',

      // Generic contenteditable as last resort
      'div[contenteditable="true"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);

      for (const el of Array.from(elements)) {
        const element = el as HTMLElement;

        if (!isVisible(element)) continue;

        // Apply heuristics to confirm it's likely a chatbot input
        if (isLikelyChatbotInput(element)) {
          return element;
        }
      }
    }

    return null;
  },

  extractPromptText: () => {
    const input = genericDetector.getPromptInput();
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
      const currentText = genericDetector.extractPromptText();
      if (currentText !== lastText) {
        lastText = currentText;
        callback(currentText);
      }
    }, 200);

    return () => clearInterval(interval);
  },
};

// Heuristics to confirm an element is likely a chatbot input
function isLikelyChatbotInput(element: HTMLElement): boolean {
  // Check 1: Element should be reasonably sized (not tiny)
  const rect = element.getBoundingClientRect();
  if (rect.height < 30 || rect.width < 100) {
    return false;
  }

  // Check 2: Look for nearby send button (common pattern)
  const parent = element.closest('form, div, section');
  if (parent) {
    const buttons = parent.querySelectorAll('button');
    for (const button of Array.from(buttons)) {
      const buttonText = button.textContent?.toLowerCase() || '';
      const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';

      // Check for send/submit button indicators
      if (
        buttonText.includes('send') ||
        buttonText.includes('submit') ||
        buttonText.includes('发送') || // Chinese "send"
        ariaLabel.includes('send') ||
        ariaLabel.includes('submit')
      ) {
        return true;
      }
    }
  }

  // Check 3: Placeholder text suggests conversation
  const placeholder = element.getAttribute('placeholder')?.toLowerCase() || '';
  const chatKeywords = [
    'message', 'chat', 'prompt', 'ask', 'type', 'send',
    '问', '输入', '发送' // Chinese keywords
  ];

  for (const keyword of chatKeywords) {
    if (placeholder.includes(keyword)) {
      return true;
    }
  }

  // Check 4: Located near bottom of viewport (common UX pattern)
  const viewportHeight = window.innerHeight;
  if (rect.bottom > viewportHeight * 0.5) {
    // Element is in bottom half of viewport
    return true;
  }

  // If none of the heuristics match, be conservative
  return false;
}
