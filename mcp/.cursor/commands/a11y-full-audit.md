# Full Accessibility Audit

Run comprehensive WCAG 2.1 Level AA accessibility audit covering all testing categories.

## Usage
```
/a11y-full-audit [url]
```

## Examples
- `/a11y-full-audit https://example.com`
- `/a11y-full-audit http://localhost:3000`

## What This Command Does

This is the most comprehensive accessibility test available, combining all testing tools into one thorough audit.

### 1. Automated WCAG Scan (30 seconds)
- **Full axe-core audit** for WCAG 2.1 AA violations
- Tests all automated checkable criteria
- Generates detailed violation reports

### 2. Keyboard Accessibility (30-45 seconds)
- **Tab order** verification
- **Focus visibility** testing (3:1 contrast, 2px size)
- **Keyboard trap** detection
- **Skip links** functionality
- All interactive elements keyboard accessible

### 3. Screen Reader Testing (1-2 minutes)
- **Cross-platform** compatibility (Mac VoiceOver, Windows JAWS/NVDA)
- **ARIA attributes** validation
- **Semantic structure** analysis
- **Live regions** testing
- **Announcement** verification
- **Platform-specific** features (rotor, virtual buffer, quick nav)

### 4. ARIA Widget Testing (30-90 seconds)
If widgets detected on page:
- **Tabs** keyboard patterns
- **Accordions** expand/collapse
- **Comboboxes** navigation
- **Menus** keyboard interaction
- **Modal dialogs** focus traps
- **Sliders** value adjustment
- Plus 7 more widget patterns
- **APG compliance** verification

### 5. Visual & Responsive Testing (1-2 minutes)
- **Focus visibility** (WCAG 2.4.7, 2.4.13)
- **Reflow** at 320px width (WCAG 1.4.10)
- **Text resize** at 200% zoom (WCAG 1.4.4)
- **Text spacing** customization (WCAG 1.4.12)
- **Orientation** support (WCAG 1.3.4)
- **Animation controls** (WCAG 2.1 Success Criteria 2.2.2 Pause, Stop, Hide - Level A, and 2.3.3 Animation from Interactions - Level AAA)
- **Error messages** accessibility (WCAG 3.3.1)
- **Required fields** indicators (WCAG 3.3.2)
- **Auto-refresh** detection (WCAG 2.1 Success Criterion 2.2.1 Timing Adjustable - Level A)
- **Hover content** dismissibility (WCAG 1.4.13)

### 6. Comprehensive Report Generation
- **Executive summary** with overall score
- **Issues by severity**:
  - Critical (blockers)
  - Serious (major issues)
  - Moderate (noticeable problems)
  - Minor (nice-to-haves)
- **Issues by WCAG criterion**
- **Issues by component/page section**
- **Detailed recommendations** with code examples
- **Screenshots** as evidence
- **Platform-specific notes**
- **Widget-specific guidance**
- **Priority ranking** for fixes

### 7. Browser Cleanup
- Closes browser
- Saves report
- Cleans up resources

## Total WCAG Criteria Tested

### Level A (25 criteria)
All automatically testable Level A success criteria

### Level AA (13 criteria)
All automatically testable Level AA success criteria

### Level AAA (selected)
- 2.4.13 Focus Appearance
- 2.3.3 Animation from Interactions

## Time Required
**Total: 3-6 minutes** depending on page complexity

Breakdown:
- Automated scan: 30 sec
- Keyboard testing: 30-45 sec
- Screen reader testing: 1-2 min
- Widget testing: 30-90 sec
- Visual testing: 1-2 min
- Report generation: 10-20 sec

## Perfect For
- Pre-launch accessibility audits
- Compliance verification for WCAG 2.1 Level AA
- Comprehensive accessibility reports for stakeholders
- Identifying all accessibility issues before deployment
- Annual accessibility reviews
- Baseline accessibility assessments

## Report Output

The full audit generates a comprehensive markdown report with:

```markdown
# Accessibility Audit Report
Generated: [timestamp]
URL: [tested-url]

## Executive Summary
- Overall Score: [score/100]
- Total Issues: [count]
- Critical: [count]
- Serious: [count]
- Moderate: [count]
- Minor: [count]

## Compliance Status
- WCAG 2.1 Level A: [Pass/Fail]
- WCAG 2.1 Level AA: [Pass/Fail]
- Level AAA Criteria (optional): [Pass/Fail]

## Automated Scan Results
[Detailed axe-core violations]

## Keyboard Accessibility
[Tab order, focus visibility, keyboard trap results]

## Screen Reader Compatibility
[Cross-platform testing results]

## ARIA Widget Analysis
[Widget pattern compliance]

## Visual & Responsive Issues
[Visual accessibility findings]

## Recommendations by Priority
1. Critical fixes (must do before launch)
2. Serious fixes (address soon)
3. Moderate improvements (plan for next release)
4. Minor enhancements (nice to have)

## Code Examples
[Specific fix examples for each issue]

## Testing Notes
[Platform-specific observations]
```

## Common Use Cases

### Pre-Launch Audit
Run before deploying new features:
```
/a11y-full-audit http://staging.example.com/new-feature
```

### Compliance Documentation
Generate compliance reports:
```
/a11y-full-audit https://www.example.com
```
Save report for compliance documentation

### Bug Fix Verification
Test after accessibility fixes:
```
/a11y-full-audit http://localhost:3000
```
Compare before/after results

### Regular Audits
Quarterly or annual accessibility checks:
```
/a11y-full-audit https://www.example.com
```
Track improvement over time

## Quick Alternative Commands

For faster, focused testing use:
- `/a11y-quick-scan [url]` - Just automated scan (30 sec)
- `/a11y-keyboard-test [url]` - Keyboard only (30-45 sec)
- `/a11y-screen-reader-test [url]` - Screen readers only (1-2 min)
- `/a11y-widget-test [url]` - Widgets only (30-90 sec)
- `/a11y-visual-test [url]` - Visual/responsive only (1-2 min)

## After the Audit

1. **Review the report** - Start with Critical and Serious issues
2. **Prioritize fixes** - Focus on blockers first
3. **Fix in batches** - Group related issues
4. **Retest after fixes** - Run `/a11y-full-audit` again
5. **Document results** - Keep reports for compliance

## Best Practices

- Run full audit on **staging** before production
- Run full audit **after major features**
- Run full audit **quarterly** for maintained apps
- Run full audit before **accessibility certifications**
- Keep **historical reports** to track improvements

## Note

This audit is comprehensive but not exhaustive. Some accessibility issues require manual testing with real assistive technologies. Use this as a foundation and supplement with:
- Manual testing with actual screen readers
- Testing with real keyboard-only users
- Testing with users with disabilities
- Testing on real mobile devices
