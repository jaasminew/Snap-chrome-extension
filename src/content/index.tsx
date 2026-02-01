import React from 'react';
import ReactDOM from 'react-dom/client';
import { FloatingButton } from './FloatingButton';
import { AssessmentPanel } from './AssessmentPanel';
import type { Assessment, Language } from '@/shared/types';
import { detectPlatform } from './platformDetectors';
import { requestAssessment } from '@/shared/messages';
import { detectLanguageFromText } from '@/utils/languageDetection';
import { VelocityTracker } from '@/utils/velocityTracker';

// Main App component
function App() {
  const [assessment, setAssessment] = React.useState<Assessment | null>(null);
  const [isAssessing, setIsAssessing] = React.useState(false);
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);
  const [promptText, setPromptText] = React.useState('');
  const promptTextRef = React.useRef('');
  const [isActive, setIsActive] = React.useState(false);
  const [language] = React.useState<Language>('zh');
  const [error, setError] = React.useState<string | null>(null);
  const [typingVelocity, setTypingVelocity] = React.useState(0);
  const [isTrackerActive, setIsTrackerActive] = React.useState(false);
  const velocityTrackerRef = React.useRef<VelocityTracker | null>(null);
  const inactivityTimerRef = React.useRef<number | null>(null);
  const velocityPollTimerRef = React.useRef<number | null>(null);
  const isTrackerActiveRef = React.useRef(false); // For internal callbacks

  React.useEffect(() => {
    // Detect platform and start monitoring
    const platform = detectPlatform();

    if (platform) {
      console.log(`[Snap] Platform detected: ${platform.name}`);
      setIsActive(true);

      // Initialize velocity tracker FIRST
      const tracker = new VelocityTracker();
      velocityTrackerRef.current = tracker;

      // Start observing prompt changes and track keystrokes
      let previousTextForTracking = '';

      const cleanup = platform.observeChanges((text) => {
        setPromptText(text);
        promptTextRef.current = text;

        // Track new characters for velocity detection (only if enabled)
        if (text.length > previousTextForTracking.length) {
          const newChars = text.slice(previousTextForTracking.length);

          // Only track if tracker is active
          if (isTrackerActiveRef.current) {
            console.log(`[Snap] Text changed, tracking ${newChars.length} new chars:`, newChars);
            for (const char of newChars) {
              tracker.trackKeystroke(char);
            }

            // Reset inactivity timer on typing
            resetInactivityTimer();
          }
        }

        previousTextForTracking = text;
      });

      // Tracker initialized but NOT started - user must assess first
      // Keyboard shortcut handler: Cmd+Shift+S (Mac) or Ctrl+Shift+S (Windows)
      const handleKeyboardShortcut = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          console.log('[Snap] Manual trigger via Cmd+Shift+S');
          if (isTrackerActiveRef.current) {
            tracker.forceTrigger();
          } else {
            console.log('[Snap] Tracker not active yet, click Assess first');
          }
        }
      };

      document.addEventListener('keydown', handleKeyboardShortcut);

      // Cleanup on unmount
      return () => {
        cleanup();
        tracker.stop();
        document.removeEventListener('keydown', handleKeyboardShortcut);
      };
    } else {
      console.log('[Snap] No chatbot platform detected');
      setIsActive(false);
    }
  }, []);

  const handleButtonClick = () => {
    // Simply toggle panel open/close
    setIsPanelOpen(!isPanelOpen);
  };

  const activateVelocityTracker = () => {
    if (isTrackerActiveRef.current) {
      // Already active, just reset timer
      resetInactivityTimer();
      return;
    }

    console.log('[Snap] Activating velocity tracker');
    isTrackerActiveRef.current = true;
    setIsTrackerActive(true);

    velocityTrackerRef.current?.start(
      // getCurrentText callback
      () => {
        return promptTextRef.current;
      },
      // onTrigger callback - auto-assess when velocity conditions met
      (text) => {
        console.log('[Snap] Velocity trigger - auto-assessing prompt');
        handleAssess(text);
        setIsPanelOpen(true); // Auto-open panel on assessment
      }
    );

    // Start polling velocity for orb intensity
    velocityPollTimerRef.current = window.setInterval(() => {
      if (velocityTrackerRef.current && isTrackerActiveRef.current) {
        const velocity = velocityTrackerRef.current.getCurrentVelocity();
        setTypingVelocity(velocity);
      }
    }, 500);

    // Start 15-minute inactivity timer
    resetInactivityTimer();
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = window.setTimeout(() => {
      console.log('[Snap] Auto-disabling after 15 minutes of inactivity');
      isTrackerActiveRef.current = false;
      setIsTrackerActive(false);
      setTypingVelocity(0);
      if (velocityPollTimerRef.current) {
        clearInterval(velocityPollTimerRef.current);
        velocityPollTimerRef.current = null;
      }
      velocityTrackerRef.current?.stop();
    }, 15 * 60 * 1000); // 15 minutes
  };

  const handleAssess = async (textOverride?: string) => {
    const textToAssess = textOverride || promptText;

    if (!textToAssess || textToAssess.length < 10) {
      setError('PROMPT_TOO_SHORT');
      return;
    }

    // Activate velocity tracker on first assessment
    activateVelocityTracker();

    setIsAssessing(true);
    setError(null);

    try {
      const detectedLanguage = detectLanguageFromText(textToAssess);
      const result = await requestAssessment(textToAssess, detectedLanguage);
      setAssessment(result);
      console.log('[Snap] Assessment result:', result);
    } catch (err) {
      console.error('[Snap] Assessment failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
      setError(errorMessage);
    } finally {
      setIsAssessing(false);
    }
  };

  // Only show UI if active on a chatbot platform
  if (!isActive) {
    return null;
  }

  return (
    <>
      <FloatingButton
        score={assessment?.score || null}
        isAssessing={isAssessing}
        onClick={handleButtonClick}
        isTrackerActive={isTrackerActive}
        typingVelocity={typingVelocity}
      />
      {isPanelOpen && (
        <AssessmentPanel
          assessment={assessment}
          isAssessing={isAssessing}
          error={error}
          language={language}
          onClose={() => setIsPanelOpen(false)}
          onAssess={() => handleAssess()}
        />
      )}
    </>
  );
}

// Initialize the extension
function init() {
  // Check if extension should be active (detect chatbot input)
  // For now, we'll inject on all pages and add detection logic in Phase 3

  // Create container for Shadow DOM
  const container = document.createElement('div');
  container.id = 'prompt-assessor-root';
  container.style.cssText = 'position: fixed; z-index: 2147483647;';
  document.body.appendChild(container);

  // Attach Shadow DOM
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Create React root inside Shadow DOM
  const reactRoot = document.createElement('div');
  reactRoot.id = 'react-root';
  shadowRoot.appendChild(reactRoot);

  // Inject styles into Shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    .orb-container {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .orb-wrapper {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 80px;
      height: 80px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 1;
      --orb-opacity: 0.65;
      --orb-opacity-peak: 0.85;
    }

    .orb-breathe-strong {
      animation: orbBreatheStrong 2s ease-in-out infinite;
    }

    .orb-breathe-subtle {
      animation: orbBreatheSubtle 3s ease-in-out infinite;
    }

    @keyframes orbBreatheStrong {
      0%, 100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: var(--orb-opacity);
      }
      50% {
        transform: translate(-50%, -50%) scale(1.08);
        opacity: var(--orb-opacity-peak);
      }
    }

    @keyframes orbBreatheSubtle {
      0%, 100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: var(--orb-opacity);
      }
      50% {
        transform: translate(-50%, -50%) scale(1.04);
        opacity: var(--orb-opacity-peak);
      }
    }
  `;
  shadowRoot.appendChild(style);

  // Render React app
  const root = ReactDOM.createRoot(reactRoot);
  root.render(<App />);

  console.log('[Snap] Extension initialized');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
