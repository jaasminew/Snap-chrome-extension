import type { Message, Assessment, Language } from './types';

// Generate unique request ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Send message and wait for response
export async function sendMessage<T>(message: Omit<Message, 'requestId'>): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = generateRequestId();
    const fullMessage: Message = { ...message, requestId };

    chrome.runtime.sendMessage(fullMessage, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response && response.error) {
        reject(new Error(response.error));
        return;
      }

      resolve(response);
    });
  });
}

// Request prompt assessment
export async function requestAssessment(
  promptText: string,
  language: Language
): Promise<Assessment> {
  return sendMessage<Assessment>({
    type: 'ASSESS_PROMPT',
    payload: { promptText, language },
  });
}
