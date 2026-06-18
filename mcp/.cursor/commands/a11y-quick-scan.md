# Quick Accessibility Scan

Run a fast WCAG 2.1 AA accessibility audit on any website.

## Usage
```
/a11y-quick-scan [url]
```

## Examples
- `/a11y-quick-scan https://example.com`
- `/a11y-quick-scan https://www.w3.org`
- `/a11y-quick-scan http://localhost:3000`

## What This Command Does

1. **Opens browser** and navigates to the specified URL
2. **Runs comprehensive WCAG 2.1 AA audit** using axe-core
3. **Captures screenshot** for documentation
4. **Generates summary** of:
   - Total violations found
   - Issues by severity (Critical, Serious, Moderate, Minor)
   - Affected WCAG success criteria
   - Specific elements with problems
   - Recommendations for fixes
5. **Closes browser** and presents results

## Perfect For
- Initial accessibility assessment
- Quick check before deployment
- Compliance verification
- Identifying major accessibility blockers

## Output Format
The scan provides:
- **Summary**: Total issues by severity
- **Violations**: Detailed list with:
  - WCAG criterion reference
  - Severity level
  - Description of the issue
  - Affected elements (CSS selectors)
  - How to fix it
  - Code examples

## Follow-Up Actions
After the quick scan, use specialized tools for deeper testing:
- `/a11y-keyboard-test [url]` - Test keyboard navigation
- `/a11y-screen-reader-test [url]` - Test screen reader compatibility
- `/a11y-widget-test [url]` - Test ARIA widgets
- `/a11y-visual-test [url]` - Test visual accessibility

## Time Required
Typically 10-30 seconds depending on page complexity.
