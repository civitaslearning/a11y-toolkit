# Screen Reader Compatibility Test

Test screen reader compatibility across JAWS, NVDA, and VoiceOver platforms.

## Usage
```
/a11y-screen-reader-test [url] [platform]
```

## Parameters
- `url` - Website to test (required)
- `platform` - Platform to test: `mac`, `windows`, or `both` (default: `both`)

## Examples
- `/a11y-screen-reader-test https://example.com` - Test both platforms
- `/a11y-screen-reader-test https://example.com mac` - VoiceOver only
- `/a11y-screen-reader-test https://example.com windows` - JAWS/NVDA only

## What This Command Does

1. **Opens browser** and navigates to URL

2. **Mac VoiceOver Testing** (if platform = mac or both):
   - Test Browse/Forms/Application modes
   - Test VoiceOver rotor navigation (VO+U)
   - Get platform-specific announcements
   - Test high contrast (Increase Contrast mode)
   - Verify rotor categories (Headings, Links, Forms, etc.)

3. **Windows JAWS/NVDA Testing** (if platform = windows or both):
   - Test Browse/Forms/Application modes
   - Test virtual buffer navigation
   - Test quick navigation keys (H, B, F, T, etc.)
   - Test Windows High Contrast mode
   - Test verbosity levels (Beginner/Intermediate/Advanced)
   - Compare JAWS vs NVDA ARIA support

4. **Cross-Platform Analysis**:
   - ARIA attribute support comparison
   - Announcement differences between platforms
   - Platform-specific best practices
   - Table navigation patterns

5. **Tests screen reader simulation**:
   - Semantic structure announcements
   - ARIA label/description reading
   - Live region announcements
   - Form label associations

6. **Generates comprehensive report** with:
   - Platform-specific issues
   - Cross-platform compatibility notes
   - ARIA support comparison
   - Screen reader announcements for key elements
   - Recommendations for each platform

7. **Closes browser**

## WCAG Success Criteria Tested
- 1.3.1 Info and Relationships (Level A)
- 4.1.2 Name, Role, Value (Level A)
- 4.1.3 Status Messages (Level AA)
- All ARIA-related criteria

## Common Issues Detected
- Missing or incorrect ARIA labels
- Invisible text not announced
- Live regions not working
- Table structure unclear to screen readers
- Heading hierarchy issues
- Landmark misuse
- Platform-specific announcement problems

## Perfect For
- Cross-platform screen reader testing
- ARIA implementation verification
- Ensuring consistent experience across platforms
- Testing dynamic content announcements

## Platform-Specific Features Tested

### Mac VoiceOver
- Rotor navigation effectiveness
- Quick Nav shortcuts
- Form mode switching
- Table navigation with VO+arrows

### Windows JAWS/NVDA
- Virtual cursor functionality
- Single-letter quick navigation
- Virtual buffer forms mode
- JAWS vs NVDA differences

## Follow-Up Commands
- `/a11y-widget-test [url]` - Test ARIA widget patterns
- `/a11y-quick-scan [url]` - Get WCAG violations
- `/a11y-keyboard-test [url]` - Verify keyboard navigation

## Time Required
1-2 minutes for comprehensive screen reader testing across platforms.
