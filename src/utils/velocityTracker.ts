/**
 * Velocity Tracker - Detects typing speed and triggers assessments
 * Based on cognitive research of typing patterns and pause behavior
 */

export type VelocityState = 'FLOW' | 'EDITING' | 'REVIEWING' | 'STOPPED';

export interface VelocityConfig {
  sampleInterval: number; // How often to sample velocity (ms)
  charBufferSize: number; // How many recent chars to track
  flowThreshold: number; // chars/sec for flow state
  editingThreshold: number; // chars/sec for editing state
  reviewingThreshold: number; // chars/sec for reviewing state
  microPauseIgnoreThreshold: number; // Ignore pauses shorter than this (ms)
  naturalCompletionWait: number; // Wait time for punctuated completion (ms)
  planningPauseWait: number; // Wait time for non-punctuated pause (ms)
  cooldownPeriod: number; // Minimum time between assessments (ms)
  minPromptLength: number; // Minimum characters to trigger assessment
  minChangePercent: number; // Minimum content change to re-assess (0-1)
}

export const DEFAULT_CONFIG: VelocityConfig = {
  sampleInterval: 500,
  charBufferSize: 10,
  flowThreshold: 2.0, // >2 chars/sec
  editingThreshold: 0.5, // 0.5-2 chars/sec
  reviewingThreshold: 0.1, // <0.5 chars/sec but >0
  microPauseIgnoreThreshold: 1500, // Ignore <1.5s pauses (Chinese IME)
  naturalCompletionWait: 6000, // 6 seconds for punctuated text
  planningPauseWait: 8000, // 8 seconds for non-punctuated
  cooldownPeriod: 30000, // 30 seconds between assessments
  minPromptLength: 15,
  minChangePercent: 0.2, // 20% change required
};

interface CharTimestamp {
  char: string;
  timestamp: number;
}

export type TriggerCallback = (text: string) => void;
export type StateChangeCallback = (state: VelocityState, opacity: number) => void;

const THROWAWAY_PHRASES = [
  'hello',
  'hi',
  'test',
  'testing',
  '测试',
  '你好',
];

const PUNCTUATION = ['.', '?', '!', '。', '？', '！'];

export class VelocityTracker {
  private config: VelocityConfig;
  private charTimestamps: CharTimestamp[] = [];
  private currentState: VelocityState = 'STOPPED';
  private previousState: VelocityState = 'STOPPED';
  private countdownTimer: number | null = null;
  private sampleTimer: number | null = null;
  private isComposing: boolean = false;
  private lastAssessedText: string = '';
  private lastAssessmentTime: number = 0;
  private triggerCallback: TriggerCallback | null = null;
  private stateChangeCallback: StateChangeCallback | null = null;
  private getCurrentText: (() => string) | null = null;

  constructor(config: Partial<VelocityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start tracking velocity
   */
  public start(
    getCurrentText: () => string,
    onTrigger: TriggerCallback,
    onStateChange?: StateChangeCallback
  ) {
    this.getCurrentText = getCurrentText;
    this.triggerCallback = onTrigger;
    this.stateChangeCallback = onStateChange || null;

    // Start sampling velocity
    this.sampleTimer = window.setInterval(() => {
      this.sampleVelocity();
    }, this.config.sampleInterval);

    console.log('[VelocityTracker] Started tracking');
  }

  /**
   * Stop tracking velocity
   */
  public stop() {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    this.cancelCountdown();
    console.log('[VelocityTracker] Stopped tracking');
  }

  /**
   * Track a keystroke
   */
  public trackKeystroke(char: string) {
    if (this.isComposing) {
      return; // Ignore during IME composition
    }

    const now = Date.now();
    this.charTimestamps.push({ char, timestamp: now });

    // Keep buffer size manageable
    if (this.charTimestamps.length > this.config.charBufferSize) {
      this.charTimestamps.shift();
    }
  }

  /**
   * Handle IME composition events
   */
  public setComposing(isComposing: boolean) {
    this.isComposing = isComposing;
  }

  /**
   * Get current typing velocity (chars per second)
   */
  public getCurrentVelocity(): number {
    const now = Date.now();
    const recentChars = this.charTimestamps.filter(
      (t) => now - t.timestamp < 1000
    );
    return recentChars.length;
  }

  /**
   * Force trigger assessment (for manual override like Cmd+Shift+S)
   */
  public forceTrigger() {
    if (!this.getCurrentText || !this.triggerCallback) {
      return;
    }

    const text = this.getCurrentText();
    if (text.length >= 10) {
      // Lower minimum for manual trigger
      this.cancelCountdown();
      this.executeAssessment(text);
    }
  }

  /**
   * Sample current velocity and update state
   */
  private sampleVelocity() {
    const now = Date.now();

    // Count chars typed in last 1 second
    const recentChars = this.charTimestamps.filter(
      (t) => now - t.timestamp < 1000
    );
    const charsPerSecond = recentChars.length;

    // Determine state based on velocity
    let newState: VelocityState;
    if (charsPerSecond >= this.config.flowThreshold) {
      newState = 'FLOW';
    } else if (charsPerSecond >= this.config.editingThreshold) {
      newState = 'EDITING';
    } else if (charsPerSecond >= this.config.reviewingThreshold) {
      newState = 'REVIEWING';
    } else {
      newState = 'STOPPED';
    }

    console.log(`[VelocityTracker] Sample: ${charsPerSecond} c/s → ${newState}`);

    // Handle state transition
    if (newState !== this.currentState) {
      this.onStateChange(newState);
    }
  }

  /**
   * Handle state change
   */
  private onStateChange(newState: VelocityState) {
    this.previousState = this.currentState;
    this.currentState = newState;

    console.log(`[VelocityTracker] State: ${this.previousState} → ${newState}`);

    // Update visual state
    const opacity = this.getOpacityForState(newState);
    this.stateChangeCallback?.(newState, opacity);

    if (newState === 'STOPPED' && this.previousState !== 'STOPPED') {
      // Transition to STOPPED - start countdown after micro-pause threshold
      setTimeout(() => {
        if (this.currentState === 'STOPPED') {
          this.startCountdown();
        }
      }, this.config.microPauseIgnoreThreshold);
    } else if (newState !== 'STOPPED') {
      // User resumed typing - cancel countdown
      this.cancelCountdown();
    }
  }

  /**
   * Get opacity level for current state
   */
  private getOpacityForState(state: VelocityState): number {
    switch (state) {
      case 'FLOW':
        return 0.2;
      case 'EDITING':
        return 0.6;
      case 'REVIEWING':
        return 0.6;
      case 'STOPPED':
        return 0.8;
      default:
        return 0.6;
    }
  }

  /**
   * Start countdown to trigger assessment
   */
  private startCountdown() {
    if (!this.getCurrentText) {
      console.log('[VelocityTracker] No getCurrentText callback, skipping countdown');
      return;
    }

    const promptText = this.getCurrentText();
    console.log(`[VelocityTracker] Countdown check - text length: ${promptText.length}, previous state: ${this.previousState}`);

    // Determine wait time based on content and previous state
    let waitTime: number;
    const hasPunctuation = this.endsWithPunctuation(promptText);

    // Relax trigger conditions - trigger on any transition to STOPPED
    // if the prompt meets basic criteria
    if (hasPunctuation) {
      // Has punctuation - likely complete thought
      waitTime = this.config.naturalCompletionWait; // 6 seconds
      console.log(`[VelocityTracker] Natural completion trigger (${this.previousState} → STOPPED with punctuation)`);
    } else {
      // No punctuation - still treat as planning pause
      waitTime = this.config.planningPauseWait; // 8 seconds
      console.log(
        `[VelocityTracker] Planning pause trigger (${this.previousState} → STOPPED, no punctuation)`
      );
    }

    console.log(
      `[VelocityTracker] Countdown started: ${waitTime}ms (punctuation: ${hasPunctuation})`
    );

    // Progressive visual feedback at 3 seconds
    const midpointTimer = setTimeout(() => {
      if (this.currentState === 'STOPPED') {
        this.stateChangeCallback?.(this.currentState, 0.8);
        console.log('[VelocityTracker] Countdown midpoint - increasing opacity');
      }
    }, 3000);

    // Trigger assessment at waitTime
    this.countdownTimer = window.setTimeout(() => {
      if (this.currentState === 'STOPPED' && this.getCurrentText) {
        const text = this.getCurrentText();
        if (this.passesPreFilters(text)) {
          this.stateChangeCallback?.(this.currentState, 1.0);
          console.log('[VelocityTracker] Triggering assessment');
          this.executeAssessment(text);
        } else {
          console.log('[VelocityTracker] Failed pre-filters, skipping assessment');
        }
      }
      clearTimeout(midpointTimer);
    }, waitTime);
  }

  /**
   * Cancel countdown
   */
  private cancelCountdown() {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
      console.log('[VelocityTracker] Countdown cancelled');
    }
  }

  /**
   * Execute assessment
   */
  private executeAssessment(text: string) {
    this.lastAssessedText = text;
    this.lastAssessmentTime = Date.now();
    this.triggerCallback?.(text);
  }

  /**
   * Check if text passes pre-filters
   */
  private passesPreFilters(text: string): boolean {
    const now = Date.now();

    // Check minimum length
    if (text.length < this.config.minPromptLength) {
      console.log('[VelocityTracker] Pre-filter failed: too short');
      return false;
    }

    // Check cooldown period
    if (now - this.lastAssessmentTime < this.config.cooldownPeriod) {
      console.log('[VelocityTracker] Pre-filter failed: cooldown active');
      return false;
    }

    // Check content change
    const changePercent = this.calculateChangePercent(text, this.lastAssessedText);
    if (changePercent < this.config.minChangePercent) {
      console.log(
        `[VelocityTracker] Pre-filter failed: insufficient change (${Math.round(changePercent * 100)}%)`
      );
      return false;
    }

    // Check throwaway text
    const lowerText = text.toLowerCase().trim();
    if (THROWAWAY_PHRASES.some((phrase) => lowerText === phrase)) {
      console.log('[VelocityTracker] Pre-filter failed: throwaway phrase');
      return false;
    }

    return true;
  }

  /**
   * Check if text ends with punctuation
   */
  private endsWithPunctuation(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const lastChar = trimmed[trimmed.length - 1];
    return PUNCTUATION.includes(lastChar);
  }

  /**
   * Calculate change percentage between two texts (Levenshtein distance)
   */
  private calculateChangePercent(text1: string, text2: string): number {
    if (!text2) return 1.0; // First assessment always passes

    const distance = this.levenshteinDistance(text1, text2);
    const maxLength = Math.max(text1.length, text2.length);

    return maxLength > 0 ? distance / maxLength : 0;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
      }
    }

    return dp[m][n];
  }
}
