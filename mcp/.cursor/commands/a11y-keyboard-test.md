# Comprehensive Keyboard Accessibility Test

Test keyboard-only navigation and interaction for WCAG 2.1 Level A/AA compliance.

## Usage
```
/a11y-keyboard-test [url]
```

## Examples
- `/a11y-keyboard-test https://example.com`
- `/a11y-keyboard-test http://localhost:3000/dashboard`

## What This Command Does

1. **Opens browser** and navigates to URL
2. **Tests keyboard navigation**:
   - Tab order verification
   - Focus visibility (WCAG 2.4.7)
   - Keyboard traps detection
   - Skip link functionality
   - All interactive elements reachable
3. **Analyzes focus order**:
   - Logical tab sequence
   - Focus indicators visible
   - Focus contrast (3:1 ratio)
4. **Tests interactive elements**:
   - Buttons accessible via Enter/Space
   - Links accessible via Enter
   - Form controls accessible
   - Custom widgets keyboard accessible
5. **Captures screenshots** showing focus states
6. **Generates detailed report** with issues and recommendations
7. **Closes browser**

## WCAG 2.1 Success Criteria Tested
- 2.1.1 Keyboard (Level A)
- 2.1.2 No Keyboard Trap (Level A)
- 2.4.3 Focus Order (Level A)
- 2.4.7 Focus Visible (Level AA)
- 2.4.13 Focus Appearance (Level AAA - optional/enhanced)

## Common Issues Detected
- Focus indicators missing or invisible
- Illogical tab order
- Keyboard traps in modals or widgets
- Interactive elements not keyboard accessible
- Skip links missing or broken
- Focus contrast below 3:1 ratio

## Perfect For
- Testing keyboard-only user experience
- WCAG 2.1 Level AA compliance verification
- Ensuring no keyboard traps
- Verifying focus indicator visibility

## Follow-Up Commands
- `/a11y-widget-test [url]` - Deep test ARIA widgets
- `/a11y-visual-test [url]` - Test focus appearance at 200% zoom
- `/a11y-quick-scan [url]` - Get full WCAG audit

## Time Required
30-60 seconds for comprehensive keyboard testing.
