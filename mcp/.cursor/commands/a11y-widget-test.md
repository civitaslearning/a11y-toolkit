# ARIA Widget Keyboard Pattern Test

Test ARIA widgets for compliance with W3C ARIA Authoring Practices Guide (APG).

## Usage
```
/a11y-widget-test [url]
```

## Examples
- `/a11y-widget-test https://example.com/dashboard`
- `/a11y-widget-test http://localhost:3000`

## What This Command Does

1. **Opens browser** and navigates to URL

2. **Detects ARIA widgets** on the page:
   - Tabs (role="tablist")
   - Accordions (role="region" with expandable sections)
   - Comboboxes (role="combobox")
   - Sliders (role="slider")
   - Menus (role="menu" or role="menubar")
   - Listboxes (role="listbox")
   - Radio groups (role="radiogroup")
   - Trees (role="tree")
   - Modal dialogs (role="dialog" with aria-modal)
   - Date pickers
   - Data tables/grids (role="grid")
   - Carousels
   - Toolbars (role="toolbar")

3. **Tests each widget** against APG keyboard patterns:

   **Tabs Widget:**
   - Arrow keys navigate between tabs
   - Home/End keys jump to first/last tab
   - Automatic vs manual activation
   - Tab key moves focus out

   **Accordion Widget:**
   - Enter/Space to expand/collapse
   - Arrow keys navigate headers (optional)
   - Focus management on expand

   **Combobox Widget:**
   - Alt+Down opens listbox
   - Arrow keys navigate options
   - Escape closes listbox
   - Enter selects option
   - Type-ahead filtering

   **Slider Widget:**
   - Arrow keys increment/decrement
   - Home/End to min/max
   - Page Up/Down for larger steps
   - aria-valuemin/max/now present

   **Menu Widget:**
   - Arrow keys navigate items
   - Enter/Space activates
   - Escape closes menu
   - Letter keys jump to items
   - Submenu navigation

   **Modal Dialog Widget:**
   - Focus trap working
   - Escape key closes
   - Initial focus set correctly
   - Focus returns on close

   **And 7 more widget patterns...**

4. **Validates ARIA attributes**:
   - Required roles present
   - aria-expanded states correct
   - aria-selected for selections
   - aria-disabled for disabled items
   - aria-labelledby/describedby associations
   - aria-controls relationships
   - aria-activedescendant for composite widgets

5. **Tests keyboard navigation**:
   - Arrow key navigation
   - Home/End keys
   - Page Up/Down (where applicable)
   - Enter/Space activation
   - Escape dismissal
   - Tab key behavior

6. **Generates detailed report** with:
   - Widgets found and their types
   - APG pattern compliance
   - Keyboard pattern issues
   - ARIA attribute problems
   - Recommendations for each widget
   - Code examples for fixes

7. **Closes browser**

## WCAG Success Criteria Tested
- 1.3.1 Info and Relationships (Level A)
- 2.1.1 Keyboard (Level A)
- 2.1.2 No Keyboard Trap (Level A)
- 4.1.2 Name, Role, Value (Level A)

## Common Issues Detected
- Arrow keys not working
- Home/End keys not implemented
- Incorrect tab key behavior
- Missing ARIA roles
- Wrong aria-expanded states
- Focus not managed correctly
- Keyboard traps in widgets
- Missing aria-activedescendant
- Incorrect automatic activation

## Perfect For
- Testing custom component libraries
- Verifying ARIA widget implementations
- Ensuring APG pattern compliance
- Validating keyboard interaction patterns
- Testing React/Vue/Angular component accessibility

## APG Reference
All patterns tested against: https://www.w3.org/WAI/ARIA/apg/patterns/

## Follow-Up Commands
- `/a11y-keyboard-test [url]` - General keyboard testing
- `/a11y-screen-reader-test [url]` - Test screen reader announcements
- `/a11y-quick-scan [url]` - Full WCAG audit

## Time Required
30-90 seconds depending on number of widgets on page.
