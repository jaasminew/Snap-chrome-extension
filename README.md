# Snap

A Chrome extension that assesses prompt quality on any chatbot platform using Gemini 3 Flash Preview.

## Features

- **Universal Support**: Works on ChatGPT, Claude, Gemini, DeepSeek, Grok, Yuanbao, and any other chatbot platform
- **3-Tier Scoring**: Red (needs context), Orange (might cause misunderstanding), Green (perfect)
- **Bilingual**: Supports English and Chinese
- **Real-time Detection**: Automatically detects prompt input fields on chatbot pages
- **Secure**: API keys encrypted using Web Crypto API

## Installation

### Step 1: Build the Extension

```bash
npm install
npm run build
```

This creates a `dist/` folder with the extension files.

### Step 2: Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` folder from this project

### Step 3: Configure API Key

1. Click the extension icon in Chrome toolbar
2. Enter your Gemini API key
   - Get your key from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
3. Choose your default language (English or 中文)
4. Click "Save Key"

## Usage

1. **Visit any chatbot page** (e.g., ChatGPT, Claude, etc.)
2. **Floating button appears** in the bottom-right corner if a chatbot input is detected
3. **Type your prompt** in the chatbot's input field
4. **Click the floating button** to open the assessment panel
5. **Click "Assess Prompt"** to evaluate your prompt quality
6. **View results**:
   - Score badge (Red/Orange/Green)
   - Explanation of the score
   - List of missing context items
7. **Toggle language** using the language button in the panel header

## Supported Platforms

### Explicitly Supported
- ChatGPT (chatgpt.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)
- DeepSeek (deepseek.com)
- Grok (grok.x.com)
- Yuanbao (yuanbao/doubao.com)

### Generic Fallback
The extension uses intelligent heuristics to detect chatbot inputs on **any platform**, even ones not explicitly supported.

## Development

### Project Structure

```
prompter/
├── src/
│   ├── background/       # Service worker & API calls
│   ├── content/          # Content script & UI components
│   │   └── platformDetectors/  # Platform-specific detectors
│   ├── popup/            # Settings UI
│   ├── shared/           # Shared utilities & types
│   └── utils/            # Encryption utilities
├── public/
│   ├── manifest.json     # Extension manifest
│   └── icons/            # Extension icons
└── dist/                 # Build output (gitignored)
```

### Build Commands

- `npm run dev` - Development build with watch mode
- `npm run build` - Production build
- `npm run type-check` - TypeScript type checking

### Tech Stack

- React 18 + TypeScript
- Vite + @crxjs/vite-plugin
- Web Crypto API for encryption
- Chrome Extension Manifest V3

## Testing Checklist

### Basic Functionality
- [ ] Extension loads without errors
- [ ] Floating button appears on chatbot pages
- [ ] Button doesn't appear on non-chatbot pages
- [ ] Settings page loads and saves API key
- [ ] Language toggle works (EN ↔ CN)

### Platform Detection
- [ ] Works on ChatGPT
- [ ] Works on Claude
- [ ] Works on Gemini
- [ ] Works on DeepSeek
- [ ] Works on Grok
- [ ] Works on Yuanbao
- [ ] Works on unknown chatbot platforms (generic detector)

### Assessment Flow
- [ ] Clicking assess button sends request
- [ ] Loading state shows during assessment
- [ ] Results display with correct score color
- [ ] Explanation text is concise and relevant
- [ ] Missing context items are listed
- [ ] Error messages display for invalid API key, network errors, etc.

### Bilingual Support
- [ ] English UI displays correctly
- [ ] Chinese UI displays correctly
- [ ] Language toggle switches all text
- [ ] API responses match selected language

### Edge Cases
- [ ] Very long prompts (1000+ characters)
- [ ] Empty or very short prompts
- [ ] Special characters in prompts
- [ ] Switching between chatbot tabs
- [ ] Extension disable/enable

## Troubleshooting

### Extension doesn't load
- Check Chrome DevTools console for errors
- Ensure `npm run build` completed successfully
- Try removing and re-adding the extension

### Floating button doesn't appear
- Check if the page is a chatbot platform
- Open DevTools console and look for "[Snap]" logs
- The generic detector may not recognize the input field - try typing in the chatbot input

### Assessment fails
- Check API key is configured correctly in settings
- Verify API key has sufficient credits
- Check network connection
- Look for error messages in the panel

### API key not saving
- Check Chrome storage permissions
- Open DevTools Application tab > Storage > chrome.storage.local
- Verify encryption key is generated

## Security

- API keys are encrypted using AES-GCM before storage
- Keys are only decrypted in the background service worker
- Never exposed to content scripts or page context
- Encryption key is generated once per installation

## Performance

- Bundle size: ~150KB (gzipped ~50KB)
- Initial load: < 500ms
- Prompt detection: < 200ms polling interval
- API assessment: 1-3 seconds (depends on Claude API)

## Future Enhancements

- Backend service for API key management
- User authentication
- Assessment history tracking
- Team sharing features
- Additional AI providers (OpenAI, etc.)
- Community-contributed platform detectors

## License

MIT

## Support

For issues or feature requests, please open an issue on GitHub.
