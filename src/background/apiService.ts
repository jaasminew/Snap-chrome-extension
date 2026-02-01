import type { Assessment, Language } from '@/shared/types';
import { getApiKey } from '@/shared/storage';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Assess prompt using Gemini 3 Flash Preview
export async function assessPrompt(
  promptText: string,
  language: Language
): Promise<Assessment> {
  // Get API key
  const apiKey = await getApiKey();

  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  // Build assessment prompt
  const systemPrompt = buildAssessmentPrompt(promptText, language);

  try {
    console.log('[API Service] ===== STARTING API CALL =====');
    console.log('[API Service] Timestamp:', new Date().toISOString());
    console.log('[API Service] Model URL:', GEMINI_API_URL);
    console.log('[API Service] API key (first 10 chars):', apiKey.substring(0, 10) + '...');
    console.log('[API Service] Prompt length:', promptText.length);
    console.log('[API Service] Language:', language);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: systemPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    });

    console.log('[API Service] Response received');
    console.log('[API Service] Response status:', response.status);
    console.log('[API Service] Response status text:', response.statusText);
    console.log('[API Service] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('[API Service] ===== API ERROR =====');
      console.error('[API Service] Status:', response.status);
      console.error('[API Service] Status text:', response.statusText);

      // Try to get error body
      try {
        const errorBody = await response.text();
        console.error('[API Service] Error body:', errorBody);
      } catch (e) {
        console.error('[API Service] Could not read error body');
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('INVALID_API_KEY');
      } else if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      } else {
        throw new Error(`API_ERROR: ${response.statusText}`);
      }
    }

    const data: GeminiResponse = await response.json();

    console.log('[API Service] ===== GEMINI RESPONSE =====');
    console.log('[API Service] Full response:', JSON.stringify(data, null, 2));

    // Parse response
    const result = parseGeminiResponse(data);

    return {
      ...result,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[API Service] Error:', error);

    if (error instanceof Error) {
      if (
        error.message === 'NO_API_KEY' ||
        error.message === 'INVALID_API_KEY' ||
        error.message === 'RATE_LIMIT'
      ) {
        throw error;
      }

      // Log the actual error message for debugging
      console.error('[API Service] Error message:', error.message);
      console.error('[API Service] Error stack:', error.stack);
    }

    // Network or other error
    throw new Error('NETWORK_ERROR');
  }
}

// Build assessment prompt for Gemini
function buildAssessmentPrompt(promptText: string, language: Language): string {
  const languageName = language === 'zh' ? 'Chinese' : 'English';

  return `You are an experienced and patient mentor to teach people how to properly write a prompt. Assess the following prompt for quality. Rate it as RED (severely lack context), ORANGE (insufficient context, might cause misunderstanding), or GREEN (rich information).

User prompt: "${promptText}"

Respond in ${languageName} with JSON only. No code fences, no extra text. You should strictly stick to this format:
{
  "score": "red" | "orange" | "green",
  "explanation": "Brief explanation of what might create misunderstanding (1-2 sentences max)",
  "missingContext": ["item1", "item2"]
}

Criteria:
- RED: Missing critical context, ambiguous intent, or unclear requirements
- ORANGE: Has some context but could be improved with more specifics
- GREEN: Clear intent, sufficient context, well-structured

Communication style: 
Keep the explanation concise while instructional. On top of explaining the reasons, also tell the prompter how the model might interpret the curremt prompt wrongly. With each missing context, add a concise reason of why this would help.
If the assessment is green (aka.perfect), you don't need to offer any missing context, just leave it blank and tell user that the prompt is ready to go.`;

}

// Parse Gemini's JSON response
function parseGeminiResponse(data: GeminiResponse): Omit<Assessment, 'timestamp'> {
  console.log('[API Service] ===== PARSING RESPONSE =====');

  try {
    console.log('[API Service] Candidates count:', data.candidates?.length || 0);
    console.log('[API Service] First candidate:', JSON.stringify(data.candidates?.[0], null, 2));

    const text = data.candidates[0]?.content?.parts[0]?.text || '';

    console.log('[API Service] Raw text from Gemini (length=' + text.length + '):');
    console.log('[API Service]', text);

    // Extract JSON from response (Gemini might wrap it in markdown)
    let jsonText = text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```[a-zA-Z]*\s*/, '').replace(/```$/, '').trim();
    }

    if (!jsonText.startsWith('{') || !jsonText.endsWith('}')) {
      const start = jsonText.indexOf('{');
      const end = jsonText.lastIndexOf('}');
      if (start >= 0 && end > start) {
        jsonText = jsonText.slice(start, end + 1);
      }
    }

    console.log('[API Service] JSON extraction result:', jsonText ? 'FOUND' : 'NO MATCH');
    console.log('[API Service] Extracted JSON:', jsonText);

    if (!jsonText) {
      console.error('[API Service] ===== NO JSON FOUND =====');
      console.error('[API Service] Full text was:', text);
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonText);

    console.log('[API Service] Successfully parsed JSON');
    console.log('[API Service] Parsed object:', JSON.stringify(parsed, null, 2));
    console.log('[API Service] Score:', parsed.score);
    console.log('[API Service] Explanation:', parsed.explanation);
    console.log('[API Service] Missing context:', parsed.missingContext);

    const rawMissingContext =
      parsed.missingContext ??
      parsed['More Context to be provided'] ??
      parsed.moreContext ??
      parsed.more_context ??
      [];

    return {
      score: typeof parsed.score === 'string' ? parsed.score.toLowerCase() : parsed.score,
      explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
      missingContext: Array.isArray(rawMissingContext)
        ? rawMissingContext
        : typeof rawMissingContext === 'string'
          ? [rawMissingContext]
          : [],
    };
  } catch (error) {
    console.error('[API Service] ===== PARSING FAILED =====');
    console.error('[API Service] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[API Service] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[API Service] Error stack:', error instanceof Error ? error.stack : 'N/A');

    // Fallback response
    return {
      score: 'orange',
      explanation: 'Unable to parse assessment. Please try again.',
      missingContext: [],
    };
  }
}
