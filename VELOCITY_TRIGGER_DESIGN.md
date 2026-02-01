# Velocity-Based Assessment Trigger - Design Document

## Problem Statement

Users won't manually click "Assess" after every prompt because:
- Breaks typing flow
- Feels like extra work
- Creates friction that leads to tool abandonment

**Goal:** Make Snap feel like a real-time assistant that knows when to provide feedback without being intrusive or wasteful.

---

## Research Foundation

### Human Cognitive Speed Limit
- All humans process information at ~10 bits/second (Caltech 2024)
- This is constant across typing, problem-solving, memory tasks
- Typing speed variations reflect cognitive state, not thinking speed

### Typing Speed ↔ Cognitive Load Relationship

**Fast typing (>2 chars/sec):**
- Brain prioritizes transcription over monitoring
- User in "flow state" - composing/brainstorming
- Cognitive resources diverted from self-monitoring
- **Don't interrupt during this phase**

**Slowing/Stopping:**
- Cognitive resources shift to monitoring and planning
- Brain has bandwidth to process feedback
- User reviewing, planning next thought, or uncertain
- **Prime moment for feedback**

### Pause Patterns Reveal Intent

Research on keystroke dynamics shows WHERE pauses occur matters:

**Sentence/paragraph-initial pauses (3-8+ seconds):**
- Planning/idea generation phase
- High cognitive load
- User thinking "what should I say next?" or "am I done?"
- **Prime moment for assessment**

**Within-word/mid-sentence pauses (<2 seconds):**
- Formulation struggles (searching for right word)
- Lower cognitive significance
- Often just typing mechanics
- **Too early for assessment**

**Post-punctuation pauses (3+ seconds):**
- User reviewing what they wrote
- Deciding if complete or needs more
- **Good completion signal**

### Critical Insight: Chinese vs English Typing

**Chinese Pinyin Input Has Different Cognitive Architecture:**

English typing: `Brain → Fingers → Characters appear`

Chinese Pinyin typing: `Brain → Fingers type pinyin → PAUSE to select character → Character appears`

**Impact on velocity detection:**
- Candidate selection creates 500ms+ pauses that look like "thinking" but are execution time
- Choice reaction (homophone selection) takes 36% of total Chinese typing time
- Average Chinese typing: 140 chars/min with built-in micro-pauses
- Average English typing: 120 chars/min without selection overhead

**Example:**
```
User types: "我想问你" (I want to ask you)
Keystroke log: w-o-[500ms]-space-x-i-a-n-g-[500ms]-select-w-e-n-[500ms]-select-n-i-[500ms]

Those 500ms pauses are NOT thinking - they're selecting from:
我/卧/握/沃, 想/向/相/香, 问/稳/wen, 你/ni/泥
```

**Design Decision:**
Use single universal threshold calibrated for Chinese timing. English users wait slightly longer but have manual override (Cmd+Shift+S) for instant feedback. This prevents false triggers and saves API costs.

---

## Final Design: Universal Velocity-Based Triggers

### Velocity Bands & Detection States

| Cognitive State | Typing Speed | Pause Duration | User Mental State | Assessment Action |
|----------------|--------------|----------------|-------------------|-------------------|
| **Flow/Composing** | >2 chars/sec | <1.5s | Brain dump, active creation | **DON'T ASSESS** - User in flow |
| **Careful Editing** | 0.5-2 chars/sec | 1.5-3s | Deliberate word choice / IME selection | **DON'T ASSESS** - Still composing |
| **Reviewing/Thinking** | <0.5 char/sec | 3-5s | Evaluating what was written | **WAIT** - May continue or finish |
| **Planning/Done** | 0 chars/sec | 6-8s+ | Finished thought or stuck | **ASSESS** - Prime feedback moment |

**Note:** Micro-pauses <1.5s are ignored to prevent false triggers from Chinese IME character selection.

### Assessment Trigger Logic

| Trigger Type | Velocity Transition | Wait Time | Additional Conditions | Priority | Use Case |
|-------------|---------------------|-----------|----------------------|----------|----------|
| **Natural Completion** | Fast (>2 c/s) → Stopped | 6 seconds | Ends with punctuation (. ? ! 。？！) | High | User finished complete thought |
| **Planning Pause** | Medium (0.5-2 c/s) → Stopped | 8 seconds | Prompt length >20 chars | Medium | User paused, likely done or stuck |
| **Manual Override** | Any → Any | Immediate | Cmd+Shift+S pressed | Highest | User explicitly wants feedback |

### Pre-Assessment Filters

Before making API call, verify ALL conditions:

```javascript
✓ Minimum prompt length: 15 characters
✓ Cooldown period: 30 seconds since last assessment
✓ Content change: >20% edit distance from last assessed version
✓ Not throwaway text: Exclude "hello", "hi", "test", "testing", etc.
✓ Ignore micro-pauses: <1.5s pauses don't reset countdown
```

### Visual Feedback States

Progressive opacity gives users clear countdown indication:

| User Action | Button State | Purpose |
|-------------|--------------|---------|
| Fast typing (>2 c/s) | 20% opacity | Minimize distraction during flow |
| Velocity slowing (0.5-2 c/s) | 60% opacity, fade in | Signal "I'm ready when you are" |
| Stopped 3+ seconds | 80% opacity, gentle pulse | Countdown to assessment active |
| Stopped 6+ seconds (trigger) | 100% opacity, stronger pulse | Assessment imminent |
| Assessment in progress | Loading spinner | Clear feedback state |

---

## Implementation Guide

### 1. Velocity Tracking System

**Sampling Strategy:**
```javascript
// Sample typing speed every 500ms
const SAMPLE_INTERVAL = 500; // ms
const CHAR_BUFFER_SIZE = 10; // Track last 10 characters

let charTimestamps = []; // Store {char, timestamp}

function sampleVelocity() {
  const now = Date.now();
  const recentChars = charTimestamps.filter(
    t => now - t.timestamp < 1000 // Last 1 second
  );

  const charsPerSecond = recentChars.length;

  if (charsPerSecond > 2) return 'FLOW';
  if (charsPerSecond >= 0.5) return 'EDITING';
  if (charsPerSecond > 0) return 'REVIEWING';
  return 'STOPPED';
}
```

### 2. Transition Detection

**Track state changes to detect trigger moments:**
```javascript
let currentState = null;
let stoppedTimestamp = null;

function onVelocityChange(newState) {
  const previousState = currentState;
  currentState = newState;

  // Detect transition to STOPPED state
  if (newState === 'STOPPED' && previousState !== 'STOPPED') {
    stoppedTimestamp = Date.now();
    startCountdown();
  }

  // Reset if user resumes typing
  if (newState !== 'STOPPED') {
    stoppedTimestamp = null;
    cancelCountdown();
  }
}
```

### 3. Countdown & Trigger Logic

```javascript
let countdownTimer = null;

function startCountdown() {
  const promptText = getCurrentPromptText();

  // Determine wait time based on previous state and conditions
  let waitTime;

  if (endsWithPunctuation(promptText) && previousState === 'FLOW') {
    waitTime = 6000; // Natural completion: 6 seconds
  } else if (promptText.length > 20 && previousState === 'EDITING') {
    waitTime = 8000; // Planning pause: 8 seconds
  } else {
    return; // Don't trigger for other transitions
  }

  // Visual feedback: Update button opacity progressively
  updateButtonOpacity(60); // Fade in

  // At 3 seconds, increase opacity
  setTimeout(() => {
    if (currentState === 'STOPPED') {
      updateButtonOpacity(80);
      addGentlePulse();
    }
  }, 3000);

  // At trigger point, assess
  countdownTimer = setTimeout(() => {
    if (currentState === 'STOPPED' && passesPreFilters(promptText)) {
      updateButtonOpacity(100);
      addStrongPulse();
      triggerAssessment(promptText);
    }
  }, waitTime);
}

function cancelCountdown() {
  if (countdownTimer) {
    clearTimeout(countdownTimer);
    countdownTimer = null;
    resetButtonVisuals();
  }
}
```

### 4. Pre-Filter Implementation

```javascript
const THROWAWAY_PHRASES = ['hello', 'hi', 'test', 'testing', '测试', '你好'];
let lastAssessedText = '';
let lastAssessmentTime = 0;

function passesPreFilters(promptText) {
  const now = Date.now();

  // Check minimum length
  if (promptText.length < 15) {
    return false;
  }

  // Check cooldown period
  if (now - lastAssessmentTime < 30000) { // 30 seconds
    return false;
  }

  // Check content change (Levenshtein distance)
  const editDistance = calculateEditDistance(promptText, lastAssessedText);
  const changePercent = editDistance / Math.max(promptText.length, lastAssessedText.length);
  if (changePercent < 0.2) { // Less than 20% change
    return false;
  }

  // Check throwaway text
  const lowerText = promptText.toLowerCase().trim();
  if (THROWAWAY_PHRASES.some(phrase => lowerText === phrase)) {
    return false;
  }

  return true;
}
```

### 5. Punctuation Detection (Bilingual)

```javascript
function endsWithPunctuation(text) {
  const trimmed = text.trim();
  const lastChar = trimmed[trimmed.length - 1];

  // English and Chinese punctuation
  const punctuation = ['.', '?', '!', '。', '？', '！'];

  return punctuation.includes(lastChar);
}
```

### 6. Manual Override Handling

```javascript
// Register keyboard shortcut
document.addEventListener('keydown', (e) => {
  // Cmd+Shift+S (Mac) or Ctrl+Shift+S (Windows)
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') {
    e.preventDefault();

    const promptText = getCurrentPromptText();
    if (promptText.length >= 10) { // Minimum viable prompt
      cancelCountdown(); // Cancel any pending countdown
      triggerAssessment(promptText);
    }
  }
});
```

### 7. Assessment Trigger Function

```javascript
async function triggerAssessment(promptText) {
  // Update last assessed info
  lastAssessedText = promptText;
  lastAssessmentTime = Date.now();

  // Update UI
  showLoadingState();

  // Send to background script for API call
  const result = await chrome.runtime.sendMessage({
    type: 'ASSESS_PROMPT',
    prompt: promptText,
    language: getUserLanguagePreference()
  });

  // Display result
  displayAssessmentResult(result);
}
```


---

## Edge Cases & Handling

### 1. User Edits During Countdown
```javascript
// Reset countdown if user resumes typing
if (newState !== 'STOPPED') {
  cancelCountdown();
}
```

### 2. User Switches Tabs/Windows
```javascript
// Pause countdown when page loses focus
document.addEventListener('visibilitychange', () => {
  if (document.hidden && countdownTimer) {
    cancelCountdown();
  }
});
```

### 3. Very Long Prompts (1000+ chars)
```javascript
// Adjust minimum change threshold for long prompts
const minChangeChars = Math.min(50, promptText.length * 0.2);
if (editDistance < minChangeChars) {
  return false;
}
```

### 4. User Rapidly Switches Between Fast/Slow
```javascript
// Only trigger on sustained STOPPED state (500ms minimum)
const SUSTAINED_STOP_DURATION = 500;

function onVelocityChange(newState) {
  if (newState === 'STOPPED') {
    setTimeout(() => {
      if (currentState === 'STOPPED') {
        stoppedTimestamp = Date.now();
        startCountdown();
      }
    }, SUSTAINED_STOP_DURATION);
  }
}
```

### 5. IME Composition Events (Chinese Input)
```javascript
// Don't track velocity during active IME composition
let isComposing = false;

inputElement.addEventListener('compositionstart', () => {
  isComposing = true;
});

inputElement.addEventListener('compositionend', () => {
  isComposing = false;
  // Resume velocity tracking
});

function trackKeystroke(char) {
  if (isComposing) return; // Ignore during IME composition

  charTimestamps.push({ char, timestamp: Date.now() });
  // Keep buffer size manageable
  if (charTimestamps.length > CHAR_BUFFER_SIZE) {
    charTimestamps.shift();
  }
}
```

---

## Testing Checklist

### Velocity Detection Accuracy
- [ ] Fast typing (>2 c/s) correctly identified - button at 20% opacity
- [ ] Slow typing (0.5-2 c/s) correctly identified - button at 60% opacity
- [ ] Stopped state triggers countdown - button pulses at 80%
- [ ] 6-second countdown triggers assessment for punctuated text
- [ ] 8-second countdown triggers for non-punctuated text >20 chars

### Chinese IME Handling
- [ ] Micro-pauses <1.5s during character selection ignored
- [ ] No false triggers while typing "我想问你一个问题"
- [ ] Chinese punctuation (。？！) detected correctly
- [ ] compositionstart/compositionend events properly handled

### Pre-Filter Validation
- [ ] Prompts <15 chars don't trigger assessment
- [ ] 30-second cooldown enforced between assessments
- [ ] <20% content change blocks duplicate assessment
- [ ] Throwaway phrases (hello, hi, test, 测试) filtered out

### Manual Override
- [ ] Cmd+Shift+S immediately triggers assessment
- [ ] Manual trigger bypasses cooldown
- [ ] Works during active countdown (cancels countdown)

### Edge Cases
- [ ] User resumes typing → countdown cancels
- [ ] User switches tabs → countdown pauses
- [ ] Very long prompts (1000+ chars) handled correctly
- [ ] Rapid typing velocity changes don't cause multiple triggers

### Cost Validation
- [ ] Log API call frequency for English users (~1 per prompt)
- [ ] Log API call frequency for Chinese users (~1 per prompt)
- [ ] Verify no unnecessary calls during typing flow

---

## Future Enhancements (Post-MVP)

### Adaptive Thresholds
- Learn individual user's typing patterns
- Adjust velocity bands per user over time
- Faster triggers for fast typers, slower for slow typers

### Context-Aware Triggers
- Detect prompt patterns (questions vs commands vs conversations)
- Adjust thresholds based on prompt type
- Earlier triggers for simple questions, later for complex prompts

### Multi-Language Detection
- Auto-detect switch between English and Chinese in same prompt
- Apply language-specific thresholds dynamically
- Handle code blocks differently (ignore velocity entirely)

---

## References

Research papers and sources that informed this design:

1. **Human Cognitive Speed Limit:**
   - [Can't This Thing Go Any Faster? Our Thoughts Obey a Strict, Slow Speed Limit](https://www.brainfacts.org/neuroscience-in-society/neuroscience-in-the-news/2025/icymi-cant-this-thing-go-any-faster-our-thoughts-obey-a-strict-slow-speed-limit--010925)

2. **Typing Speed & Cognitive Load:**
   - [The Neuroscience Behind Writing: Handwriting vs. Typing](https://pmc.ncbi.nlm.nih.gov/articles/PMC11943480/)
   - [Language bursts and text quality in digital writing by young EFL learners](https://link.springer.com/article/10.1007/s44322-024-00012-x)

3. **Keystroke Dynamics & Pause Patterns:**
   - [Pause for Thought: Systemic Functional Units and the Dynamics of Writing](https://lup.lub.lu.se/search/publication/f454544b-a7ed-4770-8e82-4c4abc110de1)
   - [Keystroke Dynamics Patterns While Writing Positive and Negative Opinions](https://pmc.ncbi.nlm.nih.gov/articles/PMC8434638/)

4. **Chinese Input Methods:**
   - [CN-T9: Optimization of T9 Chinese input layout](https://dl.acm.org/doi/fullHtml/10.1145/3640471.3680458)
   - [How the quest to type Chinese on a QWERTY keyboard created autocomplete](https://www.technologyreview.com/2024/05/27/1092876/type-chinese-computer-qwerty-keyboard/)
   - [Authentication by Keystroke Dynamics: The Influence of Typing Language](https://www.mdpi.com/2076-3417/13/20/11478)
   - [Why Press Backspace? Understanding User Input Behaviors in Chinese Pinyin Input Method](https://www.researchgate.net/publication/220874726_Why_Press_Backspace_Understanding_User_Input_Behaviors_in_Chinese_Pinyin_Input_Method)

5. **Cognitive Resource Allocation:**
   - [Cognitive resource allocation in text production segments and pauses during translation](https://wjyy.publish.founderss.cn/en/article/67480810/)
