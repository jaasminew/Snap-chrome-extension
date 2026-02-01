# Snap - Chrome Extension Implementation Plan

## Overview
Build a Chrome extension that assesses prompt quality on **any chatbot page** (ChatGPT, Claude, Gemini, DeepSeek, Grok, Yuanbao, and more) using LLM API calls. The extension provides 3-tier scoring (Red/Orange/Green) with concise explanations in English or Chinese.

## Tech Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite with @crxjs/vite-plugin (handles Chrome extension specifics)
- **Manifest**: V3 (latest Chrome extension standard)
- **UI**: Shadow DOM for style isolation
- **API**: Gemini `gemini-3-flash-preview` for prompt assessment (MVP uses Gemini only)
- **Storage**: chrome.storage.local with Web Crypto encryption
- **i18n**: Custom lightweight solution

## Project Structure

```
prompter/
├── public/
│   ├── manifest.json              # Extension manifest (V3)
│   └── icons/                     # Extension icons
├── src/
│   ├── background/
│   │   ├── index.ts              # Service worker entry
│   │   ├── apiService.ts         # API calls to Gemini (MVP: Gemini only)
│   │   └── messageHandler.ts     # Message routing
│   ├── content/
│   │   ├── index.tsx             # Content script entry (Shadow DOM setup)
│   │   ├── FloatingButton.tsx    # Bottom-right floating button
│   │   ├── AssessmentPanel.tsx   # Popup panel with results
│   │   ├── promptDetector.ts     # Core prompt detection logic
│   │   └── platformDetectors/    # Platform-specific detectors
│   │       ├── chatgpt.ts
│   │       ├── claude.ts
│   │       ├── gemini.ts
│   │       ├── deepseek.ts
│   │       ├── grok.ts
│   │       ├── yuanbao.ts
│   │       ├── generic.ts        # Fallback for any chatbot
│   │       └── index.ts          # Detector registry
│   ├── popup/
│   │   ├── index.html            # Popup HTML
│   │   ├── Popup.tsx             # Settings UI
│   │   └── ApiKeyManager.tsx     # API key configuration
│   ├── shared/
│   │   ├── types.ts              # Shared TypeScript types
│   │   ├── storage.ts            # Storage abstraction with encryption
│   │   ├── i18n.ts               # Translation helper
│   │   └── messages.ts           # Message passing types
│   └── utils/
│       └── encryption.ts         # Web Crypto API wrapper
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Core Architecture

### 1. Content Script Injection
- Injected into **all web pages** (uses broad match pattern, activates only on detected chatbot pages)
- Creates Shadow DOM container for React app (prevents CSS conflicts)
- Renders floating button at bottom-right corner
- Detects and monitors prompt input field
- Generic fallback detector ensures it works on unknown chatbot platforms

### 2. Platform Detection System
Each platform has a detector implementing:
```typescript
interface PlatformDetector {
  name: string;
  detect: () => boolean;                    // Is this platform active?
  getPromptInput: () => HTMLElement | null; // Find prompt input element
  extractPromptText: () => string;          // Get current prompt text
  observeChanges: (callback) => () => void; // Watch for changes
}
```

**Detection Strategy:**
- Platform-specific detectors for known chatbots (ChatGPT, Claude, Gemini, DeepSeek, Grok, Yuanbao)
- Generic fallback detector for unknown chatbots (searches for common textarea/contenteditable patterns)
- Multiple fallback selectors (most chatbots use contenteditable divs or textareas)
- Polling (200ms) + MutationObserver for reliability
- Handles both `value` (textarea) and `textContent` (contenteditable)
- Extension only activates when a chatbot input is detected

**Generic Detector Strategy (Critical for All Platforms):**
```typescript
// Searches for common chatbot input patterns:
const genericSelectors = [
  'textarea[placeholder*="message" i]',
  'textarea[placeholder*="chat" i]',
  'textarea[placeholder*="prompt" i]',
  'textarea[placeholder*="ask" i]',
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"].ProseMirror',
  'textarea[rows]',  // Large textareas likely for chat
  'div[contenteditable="true"]',  // Fallback
];

// Heuristics to confirm it's a chatbot:
// - Element is visible and large enough (height > 40px)
// - Parent contains send button or submit button
// - Placeholder text suggests conversation
// - Located near bottom of viewport (common UX pattern)
```

This ensures the extension works on **any** chatbot platform, even ones not explicitly supported.

### 3. API Assessment Flow
```
User types → Content Script detects change (debounced 1s)
           → Sends message to Background Service Worker
           → Background retrieves & decrypts Gemini API key
           → Makes API call to Gemini `gemini-3-flash-preview`
           → Parses JSON response {score, explanation, missingContext}
           → Returns result to Content Script
           → Updates UI with colored border + panel
```

### 4. UI Components

**FloatingButton.tsx**
- 56px circular button, bottom-right (20px margins)
- Border color indicates score (red/orange/green/gray)
- Pulsing animation during assessment
- Click to toggle panel

**AssessmentPanel.tsx**
- 320px × 200-400px popup above button
- Header: Close button + Language toggle (EN|CN)
- Body: Score badge + Explanation text + Missing context list
- Footer: "Assess Prompt" button
- Slide-up animation on open

**Popup (Settings)**
- Gemini API key input with show/hide toggle
- Default language preference (EN/CN)
- Extension enable/disable toggle
- Help text and usage instructions

### 5. Security & Storage

**API Key Storage:**
- Encrypted using Web Crypto API (AES-GCM)
- Stored in chrome.storage.local
- Decrypted only in background service worker
- Never exposed to content scripts

**Permissions:**
- `storage` - for chrome.storage.local
- `activeTab` - for content script injection
- Host permissions: `<all_urls>` or broad pattern to work on any chatbot site
  - Note: Extension only activates when chatbot input is detected (no unnecessary resource usage)

### 6. Bilingual Support

**Translation System:**
```typescript
// src/shared/i18n.ts
const translations = {
  en: {
    assess_button: 'Assess Prompt',
    score_red: 'Needs Context',
    score_orange: 'Might Cause Misunderstanding',
    score_green: 'Perfect',
    // ...
  },
  zh: {
    assess_button: '评估提示词',
    score_red: '需要更多上下文',
    score_orange: '可能引起误解',
    score_green: '完美',
    // ...
  }
};

export function t(key: string, lang: 'en' | 'zh'): string;
```

- React Context for current language
- Language toggle in panel header
- API receives language parameter for assessment response

## Scalability Preparation

### Future Database Integration
- **Current**: All data in chrome.storage.local
- **Future**: Backend API service
- **Preparation**: Abstract storage layer (`src/shared/storage.ts`) - easy to swap implementations

```typescript
// MVP: Uses chrome.storage
export async function saveApiKey(provider, key) {
  await chrome.storage.local.set({...});
}

// Future: Calls backend
export async function saveApiKey(provider, key) {
  await fetch('https://api.promptassessor.com/keys', {...});
}
```

### Future Authentication
- **Current**: No auth, extension works immediately
- **Future**: User accounts with OAuth
- **Preparation**:
  - Separate auth logic in `src/shared/auth.ts`
  - Context for "current user" (currently null)
  - Settings UI separated from main functionality

### Extensible Detector System
- Detector registry allows adding new platforms
- Future: Load detectors from remote config
- Community-contributed detectors

### Feature Flags
```typescript
// src/shared/features.ts
export const features = {
  assessmentCache: true,      // MVP
  remoteDetectors: false,     // Future
  historyTracking: false,     // Future
  teamSharing: false,         // Future
};
```

## Critical Files to Implement

### 1. `public/manifest.json`
Chrome extension configuration defining:
- Manifest V3 structure
- Content scripts with broad match pattern (`<all_urls>` to work on any chatbot)
- Background service worker
- Permissions (storage, activeTab, <all_urls>)
- Extension metadata (name, version, icons)
- Note: Content script activates conditionally only when chatbot input detected

### 2. `src/content/index.tsx`
Content script entry point:
- Creates Shadow DOM for style isolation
- Renders React app inside Shadow DOM
- Initializes platform detector
- Sets up message listeners to background

### 3. `src/content/platformDetectors/index.ts`
Detector registry and detection logic:
- Exports detector interfaces
- Implements detection for ChatGPT, Claude, Gemini, DeepSeek, Grok, Yuanbao
- Generic fallback detector for any unknown chatbot platform
- Polling + MutationObserver for prompt changes
- Handles contenteditable and textarea inputs
- Tries detectors in order, falls back to generic if none match

### 4. `src/background/apiService.ts`
API integration layer:
- Retrieves & decrypts Gemini API key from storage
- Makes API calls to Gemini `gemini-3-flash-preview`
- Formats prompt assessment requests with bilingual support
- Parses and validates JSON responses
- Error handling (network, auth, rate limits)
- Note: Structured for future API provider expansion

### 5. `src/shared/storage.ts`
Storage abstraction with encryption:
- Wraps chrome.storage.local API
- Web Crypto encryption/decryption for API keys
- Settings persistence (language, provider, enabled)
- Easy to replace with backend API calls later

### 6. `src/content/FloatingButton.tsx` & `AssessmentPanel.tsx`
Main UI components:
- Floating button with score-based colored border
- Assessment panel with bilingual content
- Click handlers for assess action
- Loading states and animations

### 7. `src/shared/i18n.ts`
Internationalization system:
- Translation dictionaries (EN/CN)
- Translation function with type safety
- React hook for accessing translations
- Language preference persistence

### 8. `vite.config.ts`
Build configuration:
- @crxjs/vite-plugin for Chrome extension build
- Multiple entry points (content, background, popup)
- TypeScript compilation
- Path aliases (@/*)

## Implementation Phases

### Phase 1: Project Setup (Day 1)
- Initialize Vite + React + TypeScript project
- Install @crxjs/vite-plugin and @types/chrome
- Configure vite.config.ts and tsconfig.json
- Create basic manifest.json
- Set up folder structure

### Phase 2: Content Script Foundation (Day 1-2)
- Implement content/index.tsx with Shadow DOM
- Create FloatingButton component (static, no functionality)
- Test injection on ChatGPT page
- Verify Shadow DOM isolation

### Phase 3: Platform Detection (Day 2-3)
- Build platformDetectors/index.ts with detector interface
- Implement ChatGPT detector with selectors + polling
- Implement Claude detector
- Implement Gemini detector
- Implement DeepSeek detector
- Implement Grok detector
- Implement Yuanbao detector
- Implement generic fallback detector (most important - works on any chatbot)
- Test prompt text extraction on all platforms

### Phase 4: Background & API Integration (Day 3-4)
- Create background service worker
- Implement message passing system
- Build apiService.ts for Gemini `gemini-3-flash-preview` API
- Test API calls with bilingual responses
- Implement error handling and retry logic

### Phase 5: UI Components (Day 4-5)
- Build AssessmentPanel with score display
- Add explanation rendering
- Implement language toggle
- Create popup settings UI
- Build ApiKeyManager component

### Phase 6: Security & Storage (Day 5-6)
- Implement encryption.ts using Web Crypto API
- Build storage.ts abstraction layer
- Secure API key storage and retrieval
- Add settings persistence

### Phase 7: i18n & Polish (Day 6-7)
- Create i18n.ts with EN/CN translations
- Add translations to all components
- Implement language switching
- Add loading states and animations

### Phase 8: Testing & Refinement (Day 7)
- Manual testing on all platforms (ChatGPT, Claude, Gemini, DeepSeek, Grok, Yuanbao, generic)
- Test Claude Haiku 4.5 API calls with both EN and CN responses
- Test language switching
- Fix bugs and edge cases
- Performance optimization (debouncing, caching)

## Verification & Testing

### Manual Testing Checklist
1. **Extension Loading**
   - Load unpacked extension from dist/ folder
   - Verify no console errors
   - Check extension appears in chrome://extensions

2. **Content Script Injection**
   - Visit ChatGPT, Claude, Gemini, DeepSeek, Grok, Yuanbao
   - Test generic detector on unknown chatbot platforms
   - Verify floating button appears bottom-right
   - Verify button doesn't conflict with page styles

3. **Prompt Detection**
   - Type in each chatbot's input field
   - Verify extension detects prompt changes
   - Test with both short and long prompts

4. **API Assessment**
   - Configure API key in popup settings
   - Type prompt and click "Assess"
   - Verify loading state shows
   - Verify response displays with correct score color
   - Check explanation is concise and relevant

5. **Bilingual Support**
   - Toggle language EN ↔ CN
   - Verify all UI text translates
   - Verify API response is in selected language

6. **Settings Management**
   - Configure Claude API key
   - Save/update API key
   - Toggle extension on/off
   - Verify settings persist across sessions

7. **Error Handling**
   - Test with invalid API key → should show error
   - Test with no network → should show network error
   - Test rate limiting → should show rate limit message

### Edge Cases to Test
- Very long prompts (1000+ characters)
- Special characters in prompts
- Switching between chatbot pages
- Page navigation while panel is open
- Extension disable/enable while on page
- Multiple browser tabs with chatbots

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0",
    "@types/chrome": "^0.0.260",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

## API Request Format

### Gemini API (MVP)
```typescript
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={API_KEY}
Headers:
  Content-Type: application/json

Body:
{
  "contents": [{
    "role": "user",
    "parts": [{
      "text": "Assess this prompt quality. Rate as RED/ORANGE/GREEN. Respond in {language} with JSON: {score, explanation, missingContext}. Prompt: \"{userPrompt}\""
    }]
  }],
  "generationConfig": {
    "maxOutputTokens": 500
  }
}
```

**Note**: MVP uses Gemini only. The architecture supports adding other API providers (OpenAI, Anthropic, etc.) in the future by extending `apiService.ts`.

## Performance Targets
- Bundle size: < 100KB total
- Initial load: < 500ms
- Prompt detection latency: < 200ms
- API assessment: 1-3 seconds (depends on API)
- UI rendering: < 100ms

## Key Design Decisions

1. **React + TypeScript**: For maintainability and scalability
2. **Shadow DOM**: Prevents CSS conflicts with host pages
3. **Polling + MutationObserver**: Most reliable prompt detection
4. **Background Service Worker**: Handles API calls, avoids CORS
5. **Web Crypto Encryption**: Secures API keys client-side
6. **Debouncing (1s)**: Prevents excessive API calls
7. **Lightweight i18n**: Custom solution avoids bloat
8. **Storage Abstraction**: Easy to swap for backend later

This plan provides a complete MVP that meets all requirements while preparing for future scalability with database and authentication.
