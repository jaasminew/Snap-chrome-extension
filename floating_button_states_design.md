# Floating Button - 4 States Design Specification

**Date:** 2026-01-18
**Status:** Design complete, implementation in progress

---

## Design Goals

1. **Button surface matches page background** - Dynamically detect and adapt to website background color
2. **Orb glow indicates liveness** - Ambient glowing effect shows button state without changing button surface, use https://reactbits.dev/backgrounds/orb?hoverIntensity=0.3&rotateOnHover=false this React library
3. **4 distinct states** based on user behavior - Not internal technical states
4. **Typing velocity affects intensity** - In listening state, faster typing = stronger glow

---

## The 4 Button States

### State 1: Idle (Clickable)

**When:** User visits page, sees button for first time

**User need:** Know the button is clickable

**Visual characteristics:**
- **Glow:** static orb effect, no rotation animation
- **Button surface:** Matches page background color
- **Icon:** public/icons/icon16.png
- **Animation:** None
- **Purpose:** Clean, unobtrusive, signals interactivity

**State conditions:**
- No score yet
- Not assessing
- Tracker not active

---

### State 2: Generating (Analyzing)

**When:** User clicked "Assess" button OR auto-trigger activated

**User need:** Know analysis is in progress

**Visual characteristics:**
- **Glow:** Strong orb with breathing animation
- **Color gradient:** Uses the sample color in the orb library
- **Intensity:** 0.3 (stronger glow)
- **Icon:** public/icons/icon16.png
- **Purpose:** "I'm actively thinking"

**Technical notes:**
- Color gradient distinct from result colors (not green/orange/red)
- Breathing suggests active processing
- Higher intensity than listening state

**State conditions:**
- `isAssessing === true`

---

### State 3: Complete (Result Ready)

**When:** Analysis finished, result available

**User need:** See the result is ready

**Visual characteristics:**
- **Glow:** change the orb color to result-based color
- **Color:** Result-based
  - Green (#22c55e) - High score
  - Orange (#f59e0b) - Medium score
  - Red (#ef4444) - Low score
- **Animation:** Static, settled
- **Blur:** Thick glow with some blur (20px blur recommended)
- **Icon:** Checkmark (✓)
- **Purpose:** "Analysis complete, here's your score"

**Technical notes:**
- No breathing animation - signals completion
- Different icon (checkmark) reinforces completion
- Color matches score meaning

**State conditions:**
- Has score
- Not assessing
- Tracker not active (user stopped typing)

---

### State 4: Listening (Tracking Changes)

**When:** User starts typing again after assessment

**User need:** Know the tool is listening, but shouldn't be distracted

**Visual characteristics:**
- **Glow:** Weak orb with subtle breathing
- **Color gradient:** Same as State 2, using orb sample colors
- **Intensity:** 0.2-0.3 (correlated with typing velocity)
  - Map typing velocity (0-10 chars/sec) to intensity range
  - Faster typing = stronger glow (within subdued range)
- **Icon:** public/icons/icon16.png
- **Purpose:** "I'm watching, but not distracting you"

**Technical notes:**
- Weaker intensity than generating state
- Slower breathing (calmer)
- Typing velocity connection creates subtle feedback loop
- Must not interfere with user's typing focus

**State conditions:**
- Has score
- Not assessing
- Tracker active (user is typing)

---

## State Flow Diagram

```
State 1 (Idle)
  ↓ [user clicks Assess button]
State 2 (Generating)
  ↓ [API returns result]
State 3 (Complete)
  ↓ [user starts typing]
State 4 (Listening)
  ↓ [auto-trigger after pause OR user clicks Assess]
State 2 (Generating)
  ↓ [API returns result]
State 3 (Complete)
  ↓ [cycle continues...]
```

---


## Button Surface Color Detection

**Implementation:**
```javascript
React.useEffect(() => {
  const computedBg = window.getComputedStyle(document.body).backgroundColor;
  if (computedBg && computedBg !== 'rgba(0, 0, 0, 0)') {
    setBgColor(computedBg);
  }
}, []);
```

**Fallback:** If transparent background detected, use `#ffffff` (white)

**Why document.body:**
- Simple, works for most cases
- Can switch to detecting color at button position if needed
- Alternative: `const rect = element.getBoundingClientRect()` + `document.elementFromPoint(rect.x, rect.y)`

---

## Typing Velocity Correlation (State 4)

**Velocity measurement:**
- Poll velocity every 500ms
- Track chars typed in last 1 second
- Return chars/second value

**Intensity mapping:**
```javascript
const getListeningIntensity = (typingVelocity) => {
  // Assume max velocity ~10 chars/sec
  const normalized = Math.min(typingVelocity / 10, 1);
  return 0.2 + (normalized * 0.1); // Maps to 0.2-0.3 range
}
```

**Why 0.2-0.3 range:**
- Must be weaker than State 2 (0.3)
- Subtle enough not to distract
- Still provides feedback correlation

---

## Icon Switching

### Icons by State

| State | Icon | Meaning |
|-------|------|---------|
| Idle | ✨ (sparkle) | Extension icon, suggests AI/magic |
| Generating | ✨ | Same, consistency during processing |
| Complete | ✓ (checkmark) | Different icon signals completion |
| Listening | ✨ | Same, suggests active listening |

**Icon assets:** Stored in `public/icons/` (icon16.png, icon48.png, icon128.png)
**Current placeholder:** Using ✨ emoji for now

---

## Implementation Challenges & Solutions

### Challenge 1: Orb Not Visible

**Potential causes:**
1. Z-index stacking - orb behind button or page content
2. Shadow DOM isolation - CSS not applying
3. Overflow clipping - parent container hiding orb
4. Blur too subtle - need higher blur values
5. Opacity too low - need higher opacity

**Solutions to try:**
- Ensure `z-index: -1` on orb, positive on icon
- Button needs `overflow: visible`
- Test with extreme values first (blur: 100px, opacity: 1.0)
- Check browser devtools for rendered styles
- Verify orb div exists in DOM

### Challenge 2: Button Surface Not Matching Background

**Cause:** Background color detection failing

**Solutions:**
- Log computed background color to console
- Try detecting nearest non-transparent parent
- Use `window.getComputedStyle(document.documentElement)` for `<html>` background
- Fallback to page theme detection (light/dark mode)

### Challenge 3: Typing Velocity Not Updating

**Cause:** State not propagating or velocity tracker not exposing current velocity

**Solutions:**
- Add `getCurrentVelocity()` method to VelocityTracker
- Poll velocity in parent component
- Pass as prop to FloatingButton
- Verify with console logs

---

## Files to Modify

### New Files
- `src/content/OrbEffect.tsx` - Reusable orb component with gradient blur

### Modified Files
- `src/content/FloatingButton.tsx` - 4-state logic, orb rendering, background detection
- `src/content/index.tsx` - State management, velocity polling, tracker integration
- `src/utils/velocityTracker.ts` - Add `getCurrentVelocity()` method

---

## Testing Checklist

### Visual Tests
- [ ] State 1: Button visible with no glow
- [ ] State 2: Purple/cyan/pink orb appears with breathing
- [ ] State 3: Green/orange/red solid glow appears
- [ ] State 3: Checkmark icon shows
- [ ] State 4: Weak orb with slow breathing
- [ ] Background color matches page (test on Gemini, ChatGPT, Claude)

### Interaction Tests
- [ ] Click button → panel opens
- [ ] Click Assess → State 2 (generating)
- [ ] Wait for result → State 3 (complete)
- [ ] Start typing → State 4 (listening)
- [ ] Type fast → orb intensity increases
- [ ] Type slow → orb intensity decreases
- [ ] Stop typing 6-8 sec → auto-assessment triggers
- [ ] Cmd+Shift+S → manual trigger works

### Console Tests
- [ ] `[FloatingButton] State: <state>` logs appear
- [ ] State object shows correct values
- [ ] No React errors
- [ ] Orb component renders in DOM

---

## Design Principles Reaffirmed

**From Jasmine's feedback:**

1. **Glow = Liveness, not color change on surface**
   - Button surface stays constant (matches background)
   - Only glow changes to indicate state

2. **Processing color different from result color**
   - Purple/cyan/pink gradient = "thinking"
   - Green/orange/red solid = "result"
   - This distinction helps user understand what's happening

3. **Intensity correlated with activity**
   - Generating (active) = stronger glow
   - Listening (passive) = weaker glow
   - Typing faster = slightly stronger listening glow

4. **Breathing = active, Static = settled**
   - Breathing animation suggests ongoing process
   - No animation suggests completion/stability

---

## Next Steps for Implementation Agent

1. **Start simple:** Get basic orb visible first (solid color, no animation)
2. **Debug visibility:** Check z-index, overflow, blur values in browser devtools
3. **Add gradient:** Once basic orb works, add multi-color gradient
4. **Add animation:** Implement breathing effect
5. **Add states:** Wire up 4-state logic
6. **Add velocity:** Connect typing velocity to intensity
7. **Polish:** Fine-tune blur, opacity, timing values

**Key debugging tip:** Start with extreme values to ensure visibility:
- Blur: 100px
- Opacity: 1.0
- Size: 300px
- Colors: Solid red for testing

Once visible, dial back to desired subtle values.

---

## Open Questions

1. **Orb library vs custom implementation:**
   - jsrepo installation failed (Node version + native bindings issue)
   - Custom implementation gives full control
   - Could try manual copy-paste from react-bits source if needed

2. **Button position sensitivity:**
   - Currently fixed position (bottom-right)
   - Should orb adapt to nearby UI elements?

3. **Accessibility:**
   - Should orb have aria attributes?
   - Color-blind friendly result colors?

4. **Performance:**
   - Blur filter can be expensive
   - Need to test on lower-end devices
   - Consider `will-change: filter` for optimization
