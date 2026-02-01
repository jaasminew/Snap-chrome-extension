# Snap - Development Progress Note

**Date:** 2026-01-18
**Status:** Velocity tracking system complete, ready for UI/personnel work

---

## What We Accomplished

### 1. Velocity-Based Assessment Trigger System

Built an intelligent system that detects when users finish typing and automatically assesses their prompts without manual clicking.

**Core Implementation:**
- **File:** `src/utils/velocityTracker.ts`
- Tracks typing speed by sampling every 500ms
- Detects 4 velocity states: FLOW (>2 c/s), EDITING (0.5-2 c/s), REVIEWING (<0.5 c/s), STOPPED (0 c/s)
- Triggers assessment after user stops typing for 6-8 seconds based on prompt characteristics

**Trigger Logic:**
- 6 seconds wait if prompt ends with punctuation (. ? ! 。？！)
- 8 seconds wait if prompt >20 chars without punctuation
- Ignores micro-pauses <1.5s (handles Chinese IME character selection)

**Pre-filters (cost optimization):**
- Minimum 15 characters
- 30-second cooldown between assessments
- 20% content change required (Levenshtein distance)
- Filters throwaway phrases ("hello", "hi", "test", "测试", etc.)

### 2. Bilingual Support (English + Chinese)

**Key Challenge Solved:** Chinese IME typing creates false "pause" signals

Chinese Pinyin input: `Type pinyin → [500ms pause to select character] → Character appears`

These selection pauses look like "user stopped typing" but they're just execution time.

**Solution:**
- Universal thresholds calibrated for Chinese timing (6-8s instead of 3-5s)
- Ignores micro-pauses <1.5s
- Works for both English and Chinese without language detection

### 3. Visual Feedback States

**Button opacity changes based on typing velocity:**
- **Waiting state** (user typing): 20-60% opacity - minimizes distraction
- **Awake state** (user stopped): 80-100% opacity + pulsing - signals readiness

**Progressive countdown feedback:**
- Stopped 3+ seconds: 80% opacity + gentle pulse
- Stopped 6+ seconds: 100% opacity + strong pulse → triggers assessment

**Animations:**
- `pulse`: Assessment in progress
- `gentlePulse`: Countdown active (3+ sec)
- `strongPulse`: Assessment imminent (6+ sec)

### 4. Keystroke Tracking Integration

**Challenge:** Gemini's contenteditable div doesn't fire standard `input` events

**Solution:**
- Hook into existing `observeChanges` polling (200ms interval)
- Track new characters on each poll cycle
- Handle IME composition events (compositionstart/compositionend)

**File:** `src/content/index.tsx` lines 50-68

### 5. Auto-Deactivation (15-minute inactivity)

Velocity tracker automatically stops after 15 minutes of no typing to save tokens.
- Resets timer on every keystroke
- Console logs: "[Snap] Auto-disabling after 15 minutes of inactivity"
- User can reactivate by clicking "Assess" again

---

## UX Principles Established

### Principle 1: No "Enable/Disable" Toggle

**User Mental Model:**
- Users don't care about "velocity tracking ON/OFF"
- They just want: Click button → See options → Click Assess → Get help

**Implementation:**
- Button click = open/close panel (NOT toggle ON/OFF)
- "Assess" button in panel = run assessment + activate tracker
- Once activated, tracker keeps running in background

### Principle 2: Visual States Show "Liveness"

Button gives constant feedback about what it's doing:
- **Dimmed (20-60%):** "I'm waiting for you to finish typing"
- **Bright + pulsing (80-100%):** "I'm awake and ready to help!"

Users feel the tool is "listening" without needing to understand the mechanics.

### Principle 3: Minimize User Effort

- First click "Assess" → Everything starts automatically
- No configuration needed
- No manual "start tracking" button
- Visual feedback is passive - users don't need to act on it

### Principle 4: Cost Optimization Over Responsiveness

Jasmine prioritized: **Minimize API calls > Maximize feedback coverage**

This led to:
- 6-8 second wait times (not 3-5s)
- Aggressive pre-filtering
- 30-second cooldown
- Estimated 60% reduction in API calls vs naive approach

---

## Technical Architecture

### Component Structure

```
FloatingButton (✨ sparkle icon)
  ↓ onClick
Opens/closes AssessmentPanel
  ↓ "Assess" button
Triggers handleAssess()
  ↓
1. Runs assessment API call
2. Calls activateVelocityTracker()
  ↓
Starts velocity tracker
  ↓
Monitors typing via observeChanges
  ↓
Auto-triggers assessment after 6-8s pause
```

### Key Files Modified

1. **`src/utils/velocityTracker.ts`** (new)
   - VelocityTracker class
   - Velocity sampling, state detection, countdown logic
   - Pre-filters and trigger conditions

2. **`src/content/index.tsx`**
   - Integrated tracker into content script
   - Keystroke tracking via observeChanges
   - Activation on first assessment
   - Visual state management

3. **`src/content/FloatingButton.tsx`**
   - Progressive opacity prop
   - Pulse intensity animations
   - Sparkle icon (✨)

4. **`src/content/platformDetectors/gemini.ts`**
   - Added debug logging (removed verbose logs after fixing)
   - Confirmed detection works with `.ql-editor[contenteditable="true"]`

### Data Flow

```
User types
  ↓
observeChanges polling (200ms) detects text change
  ↓
If isTrackerActiveRef.current === true:
  → Track new characters
  → Reset 15-min inactivity timer
  ↓
VelocityTracker samples every 500ms
  ↓
Calculates velocity → Updates state
  ↓
onStateChange callback → Updates button opacity/pulse
  ↓
On STOPPED state → Starts countdown (6-8s)
  ↓
Countdown completes → Checks pre-filters
  ↓
If passes → onTrigger callback → handleAssess()
```

---

## What's Left to Do

### 1. UI Polish (Jasmine's next task)

**Current state:**
- Functional but basic UI
- Button works, panel works
- Visual feedback works

**Needs:**
- Better panel design
- Improved typography
- Color scheme refinement
- Smooth animations

### 2. Personnel/Personality (Jasmine's next task)

Jasmine noted: "给这个产品一个人格可能会增加亲密感，从而提高采用率"

**Consider:**
- Naming the assistant
- Conversational tone in explanations
- Personality in visual feedback (e.g., button "wakes up" playfully)
- Micro-interactions that feel human

### 3. Known Issues to Address

**None critical, but consider:**
- Test on other platforms (currently only tested on Gemini)
- ChatGPT, Claude, DeepSeek detection may need adjustment
- Manual trigger (Cmd+Shift+S) could have better visual feedback

---

## Testing Checklist

✅ Extension loads on Gemini
✅ Platform detection works
✅ Keystroke tracking via observeChanges
✅ Velocity sampling (every 500ms)
✅ State transitions (FLOW → EDITING → STOPPED)
✅ Countdown triggers (6s with punctuation, 8s without)
✅ Pre-filters work (length, cooldown, change%, throwaway phrases)
✅ Chinese IME micro-pause handling (<1.5s ignored)
✅ Progressive opacity changes
✅ Pulse animations (gentle → strong)
✅ Auto-assessment triggers
✅ 15-minute auto-deactivation
✅ Manual keyboard shortcut (Cmd+Shift+S)

---

## Key Decisions Made

1. **Universal thresholds (not language-specific)**
   - Single 6-8s timing works for both English and Chinese
   - English users use Cmd+Shift+S for faster feedback

2. **Polling over event listeners**
   - Gemini's contenteditable doesn't fire input events reliably
   - observeChanges (200ms polling) is more reliable

3. **Button = Panel toggle (not tracker toggle)**
   - Clearer mental model for users
   - Tracker activates on first assessment, not on button click

4. **Sparkle icon (✨) over checkmark/play**
   - Suggests AI/magic
   - Neutral - doesn't imply ON/OFF state

5. **Aggressive cost optimization**
   - 6-8s wait times (not 3-5s)
   - 30s cooldown
   - Pre-filtering before API calls

---

## Research References

All research findings documented in:
`/Users/wangli/Desktop/Obsidian-notes/My thinking process of building the UX for Snap.md`

Key insights:
- Human cognitive speed: ~10 bits/second
- Typing velocity correlates with cognitive state
- Pause location matters (sentence-initial vs within-word)
- Chinese IME adds 36% overhead for character selection

---

## Build & Run

```bash
npm run build        # Production build
npm run dev          # Watch mode (use this for active development)
```

Extension loads from: `/Users/wangli/Desktop/prompter/dist/`

Load unpacked extension in Chrome → Point to dist folder → Reload on changes

---

---

## Session 2: Floating Button Redesign (2026-01-18)

### Goal: Redesign floating button with orb effect and 4 user-behavior states

**Design reference:** `/Users/wangli/Downloads/59ff5369a46717f2880463724ceeb4cd.jpg`
- White circle with ambient glowing light
- High layer blur with color gradient
- Button color matches background

**Full design specification:** `floating_button_states_design.md`

### Design Decisions Made

**4 States Based on User Behavior (not technical states):**

1. **Idle:** No glow, extension icon, signals clickability
2. **Generating:** Strong purple/cyan/pink orb, breathing animation (2s), "actively thinking"
3. **Complete:** Solid green/orange/red glow (no breathing), checkmark icon, "result ready"
4. **Listening:** Weak purple/cyan/pink orb, slow breathing (3s), intensity tied to typing velocity

**Key principles:**
- Button surface always matches page background (dynamic detection)
- Glow indicates liveness, not button color
- Processing color (purple/cyan/pink) distinct from result color (red/orange/green)
- Breathing = active, Static = settled
- Typing velocity (0-10 c/s) maps to orb intensity (0.2-0.3) in listening state

### Implementation Approach

**Attempted:**
- Install react-bits orb library via jsrepo → **Failed** (Node version mismatch, native bindings issue)
- Built custom OrbEffect component with radial gradient blur
- Updated FloatingButton with 4-state logic
- Added background color detection via `document.body`
- Connected typing velocity to orb intensity
- Modified VelocityTracker to expose `getCurrentVelocity()`

**Files created/modified:**
- `src/content/OrbEffect.tsx` (new)
- `src/content/FloatingButton.tsx` (complete rewrite)
- `src/content/index.tsx` (state management updates)
- `src/utils/velocityTracker.ts` (added getCurrentVelocity method)

**Status:** Build successful, but orb not visible in browser

**Possible causes:**
- Z-index stacking issues
- Shadow DOM CSS isolation
- Blur values too subtle
- Overflow clipping

### What's Documented

**For next agent:** `floating_button_states_design.md` contains:
- Complete 4-state specifications
- Visual characteristics for each state
- Orb effect technical specs (blur, opacity, animation)
- Color gradients and calculations
- Implementation challenges & solutions
- Testing checklist
- Debugging tips (start with extreme values: blur 100px, opacity 1.0, solid red)

---

## Next Agent: Where to Start

1. **Read:** `floating_button_states_design.md` - Complete design specification
2. **Read this document fully** - Overall project context
3. **Read:** `/Users/wangli/Desktop/Obsidian-notes/My thinking process of building the UX for Snap.md` - UX research
4. **Review:** `VELOCITY_TRIGGER_DESIGN.md` - Velocity trigger implementation
5. **Debug orb visibility:** Check z-index, overflow, blur in browser devtools
6. **Test current build:** Load extension on Gemini, verify states work
7. **UI work:** Fix orb visibility, then move to `AssessmentPanel.tsx`
8. **Personality work:** Consider tone, naming, micro-interactions

Jasmine values: Direct feedback, objective critique, concise communication, clear subject-verb relationships.
