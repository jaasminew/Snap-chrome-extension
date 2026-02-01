// Platform detector interface
export interface PlatformDetector {
  name: string;
  detect: () => boolean;
  getPromptInput: () => HTMLElement | null;
  extractPromptText: () => string;
  observeChanges: (callback: (text: string) => void) => () => void;
}

// Helper function to check if element is visible
export function isVisible(el: HTMLElement): boolean {
  return (
    el.offsetParent !== null &&
    getComputedStyle(el).visibility !== 'hidden' &&
    getComputedStyle(el).display !== 'none'
  );
}

// Import all detectors
import { chatGPTDetector } from './chatgpt';
import { claudeDetector } from './claude';
import { geminiDetector } from './gemini';
import { deepseekDetector } from './deepseek';
import { grokDetector } from './grok';
import { yuanbaoDetector } from './yuanbao';
import { genericDetector } from './generic';

// Detector registry (order matters - specific detectors first, generic last)
const detectors: PlatformDetector[] = [
  chatGPTDetector,
  claudeDetector,
  geminiDetector,
  deepseekDetector,
  grokDetector,
  yuanbaoDetector,
  genericDetector, // Fallback - always matches
];

// Detect current platform
export function detectPlatform(): PlatformDetector | null {
  console.log('[Platform Detection] Starting detection on:', window.location.hostname);

  for (const detector of detectors) {
    console.log(`[Platform Detection] Trying ${detector.name}...`);
    if (detector.detect()) {
      console.log(`[Platform Detection] ✓ Detected: ${detector.name}`);

      // Test if we can find input
      const input = detector.getPromptInput();
      if (input) {
        console.log(`[Platform Detection] ✓ Input element found for ${detector.name}`);
      } else {
        console.log(`[Platform Detection] ✗ Input element NOT found for ${detector.name}`);
      }

      return detector;
    }
  }

  console.log('[Platform Detection] ✗ No platform detected');
  return null;
}
