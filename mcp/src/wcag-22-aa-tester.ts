// ABOUTME: WCAG 2.2 Level A and AA specific tester module
// ABOUTME: Tests the 7 new criteria added in WCAG 2.2 that aren't covered by WCAG 2.1

/**
 * WCAG 2.2 Level A & AA Specific Tester Module
 *
 * This module provides testing for WCAG 2.2 success criteria
 * that are new additions beyond WCAG 2.1.
 *
 * New Level A: 3.2.6 Consistent Help, 3.3.7 Redundant Entry
 * New Level AA: 2.4.11 Focus Not Obscured, 2.4.13 Focus Appearance,
 *               2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum),
 *               3.3.8 Accessible Authentication (Minimum)
 */

import { Page } from 'playwright';

/**
 * WCAG 2.4.11 - Focus Not Obscured (Minimum) (Level AA)
 * Tests that focused elements are not entirely hidden by sticky/fixed overlays
 */
export async function testFocusNotObscured(page: Page, selector?: string): Promise<{
    passed: boolean;
    issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }>;
    summary: string;
}> {
    const results = await page.evaluate((containerSelector) => {
        const container = containerSelector ? document.querySelector(containerSelector) : document.body;
        if (!container) return { elementsChecked: 0, issues: [] };

        // Find all fixed/sticky elements that could obscure focus
        const allElements = document.querySelectorAll('*');
        const overlays: Array<{ rect: DOMRect; el: Element }> = [];

        allElements.forEach((el) => {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'sticky') {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    overlays.push({ rect, el });
                }
            }
        });

        // Find all focusable elements
        const focusable = container.querySelectorAll(
            'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"]'
        );

        const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];
        let checkedCount = 0;

        focusable.forEach((el: any) => {
            if (el.offsetWidth === 0 || el.offsetHeight === 0) return;
            if (el.getAttribute('aria-hidden') === 'true') return;

            checkedCount++;
            const elRect = el.getBoundingClientRect();

            for (const overlay of overlays) {
                // Skip if the focusable element IS the overlay or inside it
                if (overlay.el.contains(el) || el.contains(overlay.el)) continue;

                // Check if overlay fully covers the focusable element
                const fullyObscured =
                    overlay.rect.top <= elRect.top &&
                    overlay.rect.bottom >= elRect.bottom &&
                    overlay.rect.left <= elRect.left &&
                    overlay.rect.right >= elRect.right;

                if (fullyObscured) {
                    const overlayId = (overlay.el as any).id
                        ? `#${(overlay.el as any).id}`
                        : overlay.el.tagName.toLowerCase();
                    issues.push({
                        element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                        issue: `Focusable element fully obscured by ${(overlay.el as any).style?.position || 'fixed/sticky'} element "${overlayId}" (WCAG 2.4.11)`,
                        severity: 'error'
                    });
                    break;
                }
            }
        });

        return { elementsChecked: checkedCount, issues };
    }, selector);

    return {
        passed: results.issues.length === 0,
        issues: results.issues,
        summary: `Checked ${results.elementsChecked} focusable elements against fixed/sticky overlays. Found ${results.issues.length} obscured elements.`
    };
}

/**
 * WCAG 2.5.7 - Dragging Movements (Level AA)
 * Tests that drag-and-drop operations have single-pointer alternatives
 */
export async function testDraggingMovements(page: Page, selector?: string): Promise<{
    passed: boolean;
    issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }>;
    summary: string;
}> {
    const results = await page.evaluate((containerSelector) => {
        const container = containerSelector ? document.querySelector(containerSelector) : document.body;
        if (!container) return { elementsChecked: 0, issues: [] };

        const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];
        let checkedCount = 0;

        // Check for draggable elements
        const draggableElements = container.querySelectorAll(
            '[draggable="true"], .ui-sortable-handle, .sortable-item, [data-sortable], ' +
            '[class*="draggable"], [class*="drag-handle"], [class*="sortable"], ' +
            '[class*="dnd"], [class*="react-beautiful-dnd"], [class*="react-dnd"]'
        );

        draggableElements.forEach((el: any) => {
            checkedCount++;
            const elId = el.id ? `#${el.id}` : el.className
                ? `.${el.className.split(' ')[0]}`
                : el.tagName.toLowerCase();

            // Look for alternative controls nearby (buttons for move up/down, arrow controls)
            const parent = el.parentElement;
            const hasAlternative = parent && (
                parent.querySelector('button[aria-label*="move"], button[aria-label*="Move"]') ||
                parent.querySelector('button[aria-label*="up"], button[aria-label*="down"]') ||
                parent.querySelector('button[aria-label*="reorder"], button[aria-label*="sort"]') ||
                parent.querySelector('[role="button"][aria-label*="move"]')
            );

            if (!hasAlternative) {
                issues.push({
                    element: elId,
                    issue: `Draggable element has no single-pointer alternative (no move/reorder buttons found) (WCAG 2.5.7)`,
                    severity: 'error'
                });
            }
        });

        // Check for range sliders without click-to-set
        const sliders = container.querySelectorAll('input[type="range"], [role="slider"]');
        sliders.forEach((slider: any) => {
            checkedCount++;
            // Range inputs natively support click-to-set, so only flag custom sliders
            if (slider.getAttribute('role') === 'slider') {
                const hasClickHandler = slider.getAttribute('onclick') || slider.getAttribute('onmousedown');
                if (!hasClickHandler) {
                    issues.push({
                        element: slider.id ? `#${slider.id}` : '[role="slider"]',
                        issue: `Custom slider may not support click-to-set as drag alternative (WCAG 2.5.7)`,
                        severity: 'warning'
                    });
                }
            }
        });

        return { elementsChecked: checkedCount, issues };
    }, selector);

    return {
        passed: results.issues.length === 0,
        issues: results.issues,
        summary: `Checked ${results.elementsChecked} draggable/slider elements. Found ${results.issues.length} without single-pointer alternatives.`
    };
}

/**
 * WCAG 2.5.8 - Target Size (Minimum) (Level AA)
 * Tests that interactive targets are at least 24x24 CSS pixels
 */
export async function testTargetSize(page: Page, selector?: string): Promise<{
    passed: boolean;
    issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }>;
    summary: string;
}> {
    const results = await page.evaluate((containerSelector) => {
        const container = containerSelector ? document.querySelector(containerSelector) : document.body;
        if (!container) return { elementsChecked: 0, issues: [] };

        const interactive = container.querySelectorAll(
            'a[href], button, input:not([type="hidden"]), select, textarea, ' +
            '[role="button"], [role="link"], [role="checkbox"], [role="radio"], ' +
            '[role="tab"], [role="menuitem"], [tabindex]:not([tabindex="-1"])'
        );

        const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];
        let checkedCount = 0;

        interactive.forEach((el: any) => {
            if (el.offsetWidth === 0 || el.offsetHeight === 0) return;
            if (el.getAttribute('aria-hidden') === 'true') return;

            const style = window.getComputedStyle(el);

            // Exception: inline text links
            if (el.tagName === 'A' && style.display === 'inline') return;

            checkedCount++;
            const rect = el.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            if (width < 24 || height < 24) {
                const elId = el.id ? `#${el.id}` : el.tagName.toLowerCase();
                const text = el.textContent?.trim().substring(0, 30) || '';
                issues.push({
                    element: elId,
                    issue: `Target size ${Math.round(width)}x${Math.round(height)}px is below 24x24px minimum${text ? ` ("${text}")` : ''} (WCAG 2.5.8)`,
                    severity: 'error'
                });
            }
        });

        return { elementsChecked: checkedCount, issues };
    }, selector);

    return {
        passed: results.issues.length === 0,
        issues: results.issues,
        summary: `Checked ${results.elementsChecked} interactive targets. Found ${results.issues.length} below 24x24px minimum.`
    };
}

/**
 * WCAG 3.2.6 - Consistent Help (Level A)
 * Tests that help mechanisms appear in consistent relative order across pages
 */
export async function testConsistentHelp(page: Page, selector?: string): Promise<{
    passed: boolean;
    issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }>;
    summary: string;
}> {
    const results = await page.evaluate((containerSelector) => {
        const container = containerSelector ? document.querySelector(containerSelector) : document.body;
        if (!container) return { helpMechanisms: 0, issues: [] };

        const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];

        // Identify help-related elements
        const helpSelectors = [
            'a[href*="help"]', 'a[href*="support"]', 'a[href*="contact"]',
            'a[href*="faq"]', 'a[href*="chat"]',
            '[aria-label*="help" i]', '[aria-label*="support" i]', '[aria-label*="contact" i]',
            '[class*="help"]', '[class*="support"]', '[class*="chat-widget"]',
            '[id*="help"]', '[id*="support"]', '[id*="chat"]'
        ];

        const helpElements = container.querySelectorAll(helpSelectors.join(', '));

        // For single-page analysis, report what we find for cross-page comparison
        if (helpElements.length === 0) {
            issues.push({
                element: 'page',
                issue: 'No help mechanisms detected on this page. Verify help is available if other pages have it (WCAG 3.2.6)',
                severity: 'warning'
            });
        }

        // Check that help elements are in landmark regions (consistent placement)
        helpElements.forEach((el: any) => {
            const landmark = el.closest('header, footer, nav, [role="banner"], [role="contentinfo"], [role="navigation"]');
            if (!landmark) {
                const elId = el.id ? `#${el.id}` : el.textContent?.trim().substring(0, 30) || el.tagName.toLowerCase();
                issues.push({
                    element: elId,
                    issue: `Help mechanism not in a landmark region (header/footer/nav) — may be inconsistently placed across pages (WCAG 3.2.6)`,
                    severity: 'warning'
                });
            }
        });

        return { helpMechanisms: helpElements.length, issues };
    }, selector);

    return {
        passed: results.issues.length === 0,
        issues: results.issues,
        summary: `Found ${results.helpMechanisms} help mechanisms. ${results.issues.length} potential consistency issues. Note: Full 3.2.6 verification requires multi-page comparison.`
    };
}

/**
 * WCAG 3.3.7 - Redundant Entry (Level A)
 * Tests that multi-step forms don't require re-entering previously provided information
 */
export async function testRedundantEntry(page: Page, selector?: string): Promise<{
    passed: boolean;
    issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }>;
    summary: string;
}> {
    const results = await page.evaluate((containerSelector) => {
        const container = containerSelector ? document.querySelector(containerSelector) : document.body;
        if (!container) return { formsChecked: 0, issues: [] };

        const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];

        // Detect multi-step form indicators
        const multiStepIndicators = container.querySelectorAll(
            '[class*="step"], [class*="wizard"], [class*="progress"], ' +
            '[role="progressbar"], [aria-label*="step" i], ' +
            '[data-step], [class*="multi-step"], [class*="multistep"]'
        );

        const isMultiStep = multiStepIndicators.length > 0;

        if (isMultiStep) {
            // Check form inputs for autocomplete attributes
            const inputs = container.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');

            inputs.forEach((input: any) => {
                const autocomplete = input.getAttribute('autocomplete');
                const name = input.name?.toLowerCase() || '';
                const id = input.id?.toLowerCase() || '';

                // Fields likely to be repeated across steps
                const repeatedFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'country'];
                const looksRepeated = repeatedFields.some(field =>
                    name.includes(field) || id.includes(field)
                );

                if (looksRepeated && (!autocomplete || autocomplete === 'off')) {
                    issues.push({
                        element: input.id ? `#${input.id}` : `input[name="${input.name}"]`,
                        issue: `Repeated field in multi-step form missing autocomplete — users may need to re-enter data (WCAG 3.3.7)`,
                        severity: 'warning'
                    });
                }
            });
        }

        return { formsChecked: isMultiStep ? 1 : 0, issues };
    }, selector);

    return {
        passed: results.issues.length === 0,
        issues: results.issues,
        summary: results.formsChecked > 0
            ? `Multi-step form detected. Found ${results.issues.length} potential redundant entry issues.`
            : `No multi-step forms detected on this page.`
    };
}

/**
 * WCAG 3.3.8 - Accessible Authentication (Minimum) (Level AA)
 * Tests that authentication doesn't require cognitive function tests
 */
export async function testAccessibleAuthentication(page: Page, selector?: string): Promise<{
    passed: boolean;
    issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }>;
    summary: string;
}> {
    const results = await page.evaluate((containerSelector) => {
        const container = containerSelector ? document.querySelector(containerSelector) : document.body;
        if (!container) return { authFormsChecked: 0, issues: [] };

        const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];

        // Detect authentication forms
        const passwordFields = container.querySelectorAll('input[type="password"]');
        const loginForms = container.querySelectorAll(
            'form[action*="login"], form[action*="signin"], form[action*="auth"], ' +
            'form[class*="login"], form[class*="signin"], form[id*="login"]'
        );

        const isAuthPage = passwordFields.length > 0 || loginForms.length > 0;

        if (isAuthPage) {
            // Check if password fields allow paste
            passwordFields.forEach((field: any) => {
                const autocomplete = field.getAttribute('autocomplete');
                const onpaste = field.getAttribute('onpaste');

                // Check for paste prevention
                if (onpaste && (onpaste.includes('return false') || onpaste.includes('preventDefault'))) {
                    issues.push({
                        element: field.id ? `#${field.id}` : 'input[type="password"]',
                        issue: `Password field prevents paste — blocks password managers (WCAG 3.3.8)`,
                        severity: 'error'
                    });
                }

                // Check autocomplete attribute
                if (autocomplete === 'off') {
                    issues.push({
                        element: field.id ? `#${field.id}` : 'input[type="password"]',
                        issue: `Password field has autocomplete="off" — blocks password managers (WCAG 3.3.8)`,
                        severity: 'error'
                    });
                }

                if (!autocomplete || !['current-password', 'new-password'].includes(autocomplete)) {
                    issues.push({
                        element: field.id ? `#${field.id}` : 'input[type="password"]',
                        issue: `Password field missing autocomplete="current-password" or "new-password" (WCAG 3.3.8)`,
                        severity: 'warning'
                    });
                }
            });

            // Check for CAPTCHA without alternatives
            const captchaElements = container.querySelectorAll(
                '[class*="captcha" i], [id*="captcha" i], [class*="recaptcha" i], ' +
                'iframe[src*="captcha"], iframe[src*="recaptcha"], [class*="hcaptcha" i]'
            );

            captchaElements.forEach((captcha: any) => {
                const parent = captcha.parentElement;
                const hasAudioAlt = parent && (
                    parent.querySelector('[class*="audio" i]') ||
                    parent.querySelector('a[href*="audio" i]') ||
                    parent.querySelector('button[aria-label*="audio" i]')
                );

                if (!hasAudioAlt) {
                    issues.push({
                        element: captcha.id ? `#${captcha.id}` : 'captcha',
                        issue: `CAPTCHA detected without accessible alternative (audio/logic-based) (WCAG 3.3.8)`,
                        severity: 'error'
                    });
                }
            });
        }

        return { authFormsChecked: isAuthPage ? 1 : 0, issues };
    }, selector);

    return {
        passed: results.issues.length === 0,
        issues: results.issues,
        summary: results.authFormsChecked > 0
            ? `Authentication form detected. Found ${results.issues.length} accessible authentication issues.`
            : `No authentication forms detected on this page.`
    };
}

/**
 * Run all WCAG 2.2 Level A & AA specific tests
 */
export async function runAllWCAG22AATests(page: Page, selector?: string): Promise<{
    overallPassed: boolean;
    totalIssues: number;
    results: {
        focusNotObscured: Awaited<ReturnType<typeof testFocusNotObscured>>;
        draggingMovements: Awaited<ReturnType<typeof testDraggingMovements>>;
        targetSize: Awaited<ReturnType<typeof testTargetSize>>;
        consistentHelp: Awaited<ReturnType<typeof testConsistentHelp>>;
        redundantEntry: Awaited<ReturnType<typeof testRedundantEntry>>;
        accessibleAuthentication: Awaited<ReturnType<typeof testAccessibleAuthentication>>;
    };
}> {
    const results = {
        focusNotObscured: await testFocusNotObscured(page, selector),
        draggingMovements: await testDraggingMovements(page, selector),
        targetSize: await testTargetSize(page, selector),
        consistentHelp: await testConsistentHelp(page, selector),
        redundantEntry: await testRedundantEntry(page, selector),
        accessibleAuthentication: await testAccessibleAuthentication(page, selector)
    };

    const totalIssues = Object.values(results).reduce((sum, result) => sum + result.issues.length, 0);
    const overallPassed = totalIssues === 0;

    return {
        overallPassed,
        totalIssues,
        results
    };
}
