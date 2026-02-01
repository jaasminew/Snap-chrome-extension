import { assessPrompt } from './apiService';
import type { Message, Assessment } from '@/shared/types';

// Background service worker
console.log('[Snap] Background service worker initialized');
console.log('[Snap] Timestamp:', new Date().toISOString());

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  console.log('[Background] ===== NEW REQUEST =====');
  console.log('[Background] Timestamp:', new Date().toISOString());
  console.log('[Background] Message type:', message.type);
  console.log('[Background] Full message:', JSON.stringify(message, null, 2));

  // Handle different message types
  switch (message.type) {
    case 'ASSESS_PROMPT':
      handleAssessment(message.payload, sendResponse);
      return true; // Keep message channel open for async response

    default:
      console.log('[Background] Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
      return false;
  }
});

// Handle assessment request
async function handleAssessment(
  payload: { promptText: string; language: 'en' | 'zh' },
  sendResponse: (response: Assessment | { error: string }) => void
) {
  const startTime = Date.now();
  console.log('[Background] Starting assessment at:', new Date().toISOString());
  console.log('[Background] Prompt length:', payload.promptText.length);
  console.log('[Background] Language:', payload.language);

  try {
    const assessment = await assessPrompt(payload.promptText, payload.language);

    const duration = Date.now() - startTime;
    console.log('[Background] Assessment complete in', duration, 'ms');
    console.log('[Background] Assessment result:', JSON.stringify(assessment, null, 2));

    sendResponse(assessment);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Background] ===== ASSESSMENT FAILED =====');
    console.error('[Background] Failed after', duration, 'ms');
    console.error('[Background] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[Background] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Background] Error stack:', error instanceof Error ? error.stack : 'N/A');

    const errorMessage = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

    sendResponse({
      error: errorMessage,
    });
  }
}

console.log('[Snap] Background service worker ready');
console.log('[Snap] Ready at:', new Date().toISOString());
