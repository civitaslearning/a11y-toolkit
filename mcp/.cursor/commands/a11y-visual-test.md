# Visual & Responsive Accessibility Test

Test visual accessibility and responsive design compliance with WCAG 2.1.

## Usage
```
/a11y-visual-test [url]
```

## Examples
- `/a11y-visual-test https://example.com`
- `/a11y-visual-test http://localhost:3000/checkout`

## What This Command Does

1. **Opens browser** and navigates to URL

2. **Tests focus visibility** (WCAG 2.4.7 Level AA, 2.4.13 Level AAA optional):
   - Focus indicators present on all focusable elements
   - 3:1 contrast ratio minimum
   - 2px minimum size
   - Visible against all backgrounds
   - Screenshots of focus states

3. **Tests hover/focus content** (WCAG 1.4.13):
   - Tooltips hoverable
   - Dismissible with Escape key
   - Persistent (don't disappear on mouse movement)
   - Detect problematic hover-only content

4. **Tests reflow** (WCAG 1.4.10):
   - Content at 320px width (mobile)
   - No horizontal scrolling
   - Content reflows properly
   - No content loss at narrow widths

5. **Tests text resize** (WCAG 1.4.4):
   - Text at 200% zoom
   - No content loss
   - No functionality loss
   - No overlapping text
   - All content still accessible

6. **Tests text spacing** (WCAG 1.4.12):
   - Line height increased to 1.5x font size
   - Letter spacing increased to 0.12x font size
   - Word spacing increased to 0.16x font size
   - Paragraph spacing increased to 2x font size
   - No content loss or overlap

7. **Detects auto-refresh** (WCAG 2.1 Success Criterion 2.2.1 Timing Adjustable - Level A):
   - Meta refresh tags
   - JavaScript redirects
   - Auto-updating content
   - Timing adjustability

8. **Tests animation controls** (WCAG 2.1 Success Criteria 2.2.2 Pause, Stop, Hide - Level A, and 2.3.3 Animation from Interactions - Level AAA):
   - Pause/stop controls present
   - prefers-reduced-motion support
   - Auto-playing animations
   - Motion-triggered interactions

9. **Tests error messages** (WCAG 3.3.1, 4.1.3):
   - Errors visible
   - Errors announced to screen readers
   - Error associations with fields
   - aria-live regions for dynamic errors
   - aria-invalid on invalid fields

10. **Tests required fields** (WCAG 3.3.2):
    - Visual indicators (asterisks)
    - aria-required="true"
    - Field labels clear
    - Instructions provided

11. **Tests orientation lock** (WCAG 1.3.4):
    - Content works in portrait
    - Content works in landscape
    - No orientation restrictions via CSS/JS

12. **Generates comprehensive report** with:
    - All visual issues found
    - WCAG criterion references
    - Severity ratings
    - Screenshots as evidence
    - Specific recommendations
    - Code examples for fixes

13. **Closes browser**

## WCAG 2.1 Success Criteria Tested
- 1.3.4 Orientation (Level AA)
- 1.4.4 Resize Text (Level AA)
- 1.4.10 Reflow (Level AA)
- 1.4.12 Text Spacing (Level AA)
- 1.4.13 Content on Hover or Focus (Level AA)
- 2.2.1 Timing Adjustable (Level A) - WCAG 2.1 criterion
- 2.2.2 Pause, Stop, Hide (Level A) - WCAG 2.1 criterion
- 2.3.3 Animation from Interactions (Level AAA - optional/enhanced)
- 2.4.7 Focus Visible (Level AA)
- 2.4.13 Focus Appearance (Level AAA - enhanced)
- 3.3.1 Error Identification (Level A)
- 3.3.2 Labels or Instructions (Level A)
- 4.1.3 Status Messages (Level AA)

## Common Issues Detected
- Focus indicators invisible or too small
- Content doesn't reflow at 320px
- Text overlaps at 200% zoom
- No animation pause controls
- Auto-refresh without controls
- Tooltips dismiss on hover
- Missing aria-required attributes
- Errors not announced
- Orientation locked to landscape
- Text spacing causes content loss

## Perfect For
- WCAG 2.1 Level AA compliance
- Responsive design accessibility
- Mobile accessibility verification
- Visual accessibility audit
- Enhanced testing with Level AAA criteria (optional)

## Device Testing
Tests simulate:
- Mobile devices (320px width)
- Tablets (varying widths)
- Desktop at 200% zoom
- High contrast modes
- Reduced motion preferences

## Follow-Up Commands
- `/a11y-quick-scan [url]` - Full WCAG audit
- `/a11y-keyboard-test [url]` - Keyboard navigation
- `/a11y-screen-reader-test [url]` - Screen reader testing

## Time Required
1-2 minutes for comprehensive visual/responsive testing.
