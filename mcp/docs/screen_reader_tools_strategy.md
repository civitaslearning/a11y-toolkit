# Screen Reader Tools Strategy Guide

## Overview
This document outlines strategic use cases for AI-driven screen reader testing, demonstrating how to chain multiple tools together for comprehensive accessibility validation.

## Available Screen Reader Tools

### Core Screen Reader Tools
- `get_accessibility_tree` - Provides the accessibility tree structure
- `simulate_screen_reader` - Simulates screen reader navigation modes
- `get_announcements` - Gets screen reader announcements for actions
- `get_accessible_name` - Computes accessible names for elements
- `get_semantic_structure` - Analyzes semantic HTML organization

### Supporting Accessibility Tools
- `validate_aria_attributes` - Validates ARIA implementation
- `get_landmarks` - Identifies page regions and landmarks
- `test_heading_structure` - Validates heading hierarchy
- `test_form_labels` - Tests form accessibility
- `test_skip_links` - Validates skip navigation links
- `test_live_regions` - Tests dynamic content announcements
- `test_focus_trap` - Validates modal focus management
- `test_keyboard_navigation` - Tests keyboard flow
- `get_focus_order` - Analyzes tab order
- `test_tab_order` - Validates tab sequence

## Use Cases & Testing Strategies

### Use Case 1: Complete Screen Reader Audit
**Goal:** Perform comprehensive screen reader compatibility testing

**Steps:**
1. Open browser and navigate to target URL
2. Get accessibility tree snapshot
3. Simulate screen reader in browse mode
4. Test heading structure for navigation
5. Get all landmarks for region navigation
6. Validate ARIA attributes
7. Get semantic HTML structure
8. Test skip links functionality
9. Generate comprehensive report

**Tool Chain:**
```
open_browser → navigate → get_accessibility_tree → 
simulate_screen_reader(mode: "browse") → test_heading_structure → 
get_landmarks → validate_aria_attributes → get_semantic_structure → 
test_skip_links → analyze_accessibility
```

### Use Case 2: Form Accessibility Testing
**Goal:** Ensure forms are fully accessible to screen reader users

**Steps:**
1. Navigate to form page
2. Get all form elements
3. Test form labels and associations
4. Simulate screen reader in forms mode
5. Test tab order through form fields
6. Get announcements for each field
7. Test error message announcements
8. Validate required field indicators

**Tool Chain:**
```
navigate → get_elements(type: "form") → test_form_labels → 
simulate_screen_reader(mode: "forms") → test_tab_order → 
get_announcements(action: "focus", selector: "input") → 
validate_aria_attributes(selector: "form") → test_live_regions
```

### Use Case 3: Modal Dialog Testing
**Goal:** Verify modal dialogs are screen reader accessible

**Steps:**
1. Navigate to page with modal
2. Click to open modal
3. Test focus trap implementation
4. Get accessibility tree for modal
5. Test keyboard navigation within modal
6. Get announcements when modal opens
7. Test escape key functionality
8. Verify focus return after close

**Tool Chain:**
```
navigate → click(selector: "[data-modal-trigger]") → 
wait_for_element(selector: "[role='dialog']") → test_focus_trap → 
get_accessibility_tree(selector: "[role='dialog']") → 
test_keyboard_navigation(startSelector: "[role='dialog']") → 
get_announcements(action: "open", selector: "[role='dialog']") → 
click(selector: "[data-modal-close]") → get_element_properties(selector: ":focus")
```

### Use Case 4: Dynamic Content Testing
**Goal:** Test screen reader announcements for dynamic content

**Steps:**
1. Navigate to page with dynamic content
2. Identify live regions
3. Test live region announcements
4. Trigger content updates
5. Verify announcement timing
6. Test different politeness levels
7. Validate atomic updates
8. Check announcement queue behavior

**Tool Chain:**
```
navigate → find_by_accessibility(role: "status") → 
test_live_regions → click(selector: "[data-load-more]") → 
wait(timeout: 2000) → get_announcements(action: "update", selector: "[aria-live]") → 
validate_aria_attributes(selector: "[aria-live]") → 
get_accessibility_tree(selector: "[aria-live]")
```

### Use Case 5: Navigation Testing
**Goal:** Validate screen reader navigation patterns

**Steps:**
1. Get page landmarks
2. Test heading hierarchy
3. Simulate browse mode navigation
4. Test landmark jumping
5. Verify skip links
6. Test heading navigation
7. Check navigation announcements
8. Validate region labels

**Tool Chain:**
```
get_landmarks → test_heading_structure → 
simulate_screen_reader(mode: "browse") → 
get_announcements(action: "navigate", selector: "nav") → 
test_skip_links → get_semantic_structure → 
validate_aria_attributes(selector: "[role='navigation']") → 
get_accessible_name(selector: "nav")
```

### Use Case 6: Table Accessibility
**Goal:** Ensure data tables are screen reader accessible

**Steps:**
1. Find all tables on page
2. Check table structure
3. Validate headers and scope
4. Test navigation within table
5. Get cell announcements
6. Verify caption and summary
7. Test sorting controls
8. Check responsive behavior

**Tool Chain:**
```
find_by_accessibility(role: "table") → get_semantic_structure → 
validate_aria_attributes(selector: "table") → 
simulate_screen_reader(mode: "browse") → 
test_keyboard_navigation(startSelector: "table") → 
get_announcements(action: "focus", selector: "th") → 
get_accessible_name(selector: "table") → 
get_element_properties(selector: "[scope]")
```

### Use Case 7: Image and Media Testing
**Goal:** Verify images and media are properly described

**Steps:**
1. Find all images
2. Check alt text presence
3. Validate decorative image handling
4. Test complex image descriptions
5. Check figure/figcaption associations
6. Test video player controls
7. Verify transcript links
8. Check audio descriptions

**Tool Chain:**
```
get_elements(type: "all") → find_by_accessibility(role: "img") → 
get_accessible_name(selector: "img") → 
validate_aria_attributes(selector: "[role='img']") → 
get_announcements(action: "focus", selector: "img") → 
find_by_text(text: "transcript") → 
get_semantic_structure → analyze_accessibility
```

### Use Case 8: Error Handling and Validation
**Goal:** Test error message accessibility

**Steps:**
1. Navigate to form
2. Submit with errors
3. Check error announcements
4. Validate error associations
5. Test inline validation
6. Check error summary
7. Test focus management
8. Verify error recovery

**Tool Chain:**
```
navigate → fill(selector: "input[type='email']", value: "invalid") → 
click(selector: "button[type='submit']") → 
wait_for_element(selector: "[role='alert']") → 
test_live_regions → get_announcements(action: "error", selector: "[aria-invalid]") → 
validate_aria_attributes(selector: "[aria-describedby]") → 
test_form_labels(checkErrors: true) → get_focus_order
```

### Use Case 9: Mobile Screen Reader Testing
**Goal:** Test mobile screen reader compatibility

**Steps:**
1. Set mobile viewport
2. Open mobile navigation
3. Test touch target sizes
4. Check gesture alternatives
5. Test mobile landmarks
6. Verify responsive ARIA
7. Test mobile-specific patterns
8. Check orientation changes

**Tool Chain:**
```
set_viewport(width: 375, height: 667, isMobile: true) → 
navigate → click(selector: "[data-mobile-menu]") → 
get_element_properties(selector: "button") → 
get_landmarks → simulate_screen_reader(mode: "browse") → 
validate_aria_attributes → test_keyboard_navigation → 
set_viewport(width: 667, height: 375) → get_accessibility_tree
```

### Use Case 10: Progressive Enhancement Testing
**Goal:** Verify screen reader functionality with/without JavaScript

**Steps:**
1. Test with JavaScript enabled
2. Get baseline accessibility tree
3. Test interactive elements
4. Disable JavaScript (simulated)
5. Test fallback functionality
6. Compare accessibility trees
7. Verify core content access
8. Check form submissions

**Tool Chain:**
```
navigate → get_accessibility_tree → test_keyboard_navigation → 
get_semantic_structure → simulate_screen_reader(mode: "browse") → 
navigate(url: "?no-js=true") → get_accessibility_tree → 
get_semantic_structure → test_form_labels → 
analyze_accessibility(tags: ["wcag2a", "best-practice"])
```

## Advanced Chaining Strategies

### Strategy 1: Parallel Testing
Run multiple non-dependent tests simultaneously:
```
Promise.all([
  get_landmarks(),
  test_heading_structure(),
  validate_aria_attributes(),
  get_semantic_structure()
])
```

### Strategy 2: Conditional Chains
Branch based on findings:
```
if (hasLiveRegions) {
  test_live_regions → get_announcements
} else {
  validate_aria_attributes → suggest_live_regions
}
```

### Strategy 3: Iterative Testing
Test multiple similar elements:
```
for (each form on page) {
  test_form_labels → test_tab_order → get_announcements
}
```

### Strategy 4: Regression Testing
Compare before/after states:
```
get_accessibility_tree(before) → make_changes → 
get_accessibility_tree(after) → compare_trees
```

## Best Practices

### Pre-Test Setup
1. **Always start with:** `open_browser → navigate`
2. **Set viewport if testing responsive:** `set_viewport`
3. **Wait for page load:** `wait_for_element` for key content

### During Testing
1. **Chain related tools:** Group tools that test similar aspects
2. **Use specific selectors:** Target specific regions for focused testing
3. **Simulate user actions:** Click, fill, navigate as a user would
4. **Wait between actions:** Use `wait` for dynamic content

### Post-Test Analysis
1. **Always end with:** `analyze_accessibility` for comprehensive report
2. **Take screenshots:** Document issues visually
3. **Close browser:** Clean up with `close_browser`

## Common Testing Patterns

### Pattern 1: Element Discovery
```
find_by_accessibility → get_element_properties → get_accessible_name
```

### Pattern 2: Navigation Flow
```
test_keyboard_navigation → get_focus_order → test_tab_order
```

### Pattern 3: Content Structure
```
get_semantic_structure → test_heading_structure → get_landmarks
```

### Pattern 4: Interactive Testing
```
click → wait_for_element → get_announcements → validate_aria_attributes
```

### Pattern 5: Form Flow
```
fill → test_form_labels → get_announcements → submit → test_live_regions
```

## Error Recovery Strategies

### When Tests Fail
1. **Re-navigate:** Clear state and retry
2. **Increase timeouts:** Wait longer for dynamic content
3. **Use fallback selectors:** Try alternative element selection
4. **Break down chains:** Test smaller segments
5. **Add debugging:** Screenshot and get page info

### Common Issues & Solutions
- **Element not found:** Use `wait_for_element` before interaction
- **Stale references:** Re-query elements after page changes
- **Timing issues:** Add explicit waits between actions
- **Focus loss:** Use `get_element_properties(":focus")` to track
- **Modal traps:** Test `test_focus_trap` with escape handling

## Reporting Templates

### Comprehensive Report Structure
1. **Executive Summary:** Pass/fail status, critical issues
2. **Screen Reader Compatibility:** Supported/unsupported features
3. **Navigation Analysis:** Landmark, heading, link structure
4. **Form Accessibility:** Labels, errors, instructions
5. **Dynamic Content:** Live regions, announcements
6. **Keyboard Access:** Tab order, traps, shortcuts
7. **ARIA Implementation:** Correct usage, validation results
8. **Recommendations:** Prioritized fixes with code examples

## Automation Tips

### CI/CD Integration
```bash
# Run core screen reader tests
npm run test:screen-reader

# Run specific use case
npm run test:screen-reader:forms

# Generate report
npm run test:screen-reader:report
```

### Batch Testing Script
```javascript
const testSuites = [
  'navigation',
  'forms',
  'modals',
  'tables',
  'media'
];

for (const suite of testSuites) {
  await runScreenReaderTests(suite);
  await generateReport(suite);
}
```

## Metrics & KPIs

### Key Metrics to Track
1. **Announcement Accuracy:** Correct screen reader announcements
2. **Navigation Efficiency:** Steps to reach content
3. **Form Completion Rate:** Successful form submissions
4. **Error Recovery Time:** Time to fix validation errors
5. **Landmark Coverage:** Percentage of content in landmarks
6. **Heading Structure:** Proper nesting and hierarchy
7. **ARIA Validity:** Percentage of valid ARIA usage
8. **Focus Management:** Proper focus order and traps

## Conclusion

Effective screen reader testing requires systematic chaining of multiple tools to simulate real user experiences. By following these strategies and use cases, AI can comprehensively test screen reader accessibility and identify issues that might be missed by traditional testing methods.

Remember: The goal is not just compliance, but creating genuinely accessible experiences for screen reader users.
