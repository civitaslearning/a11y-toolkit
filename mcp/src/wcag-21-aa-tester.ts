/**
 * WCAG 2.1 Level AA Specific Tester Module
 *
 * This module provides enhanced testing for WCAG 2.1 Level AA criteria
 * that require more sophisticated checks than basic axe-core scanning.
 *
 * Based on Planning MCP's wcag-21-aa-complete-tester.ts
 */

import { Page } from 'playwright';

/**
 * WCAG 1.3.5 - Identify Input Purpose (Level AA)
 * Tests if input fields for personal data have appropriate autocomplete attributes
 */
export async function testIdentifyInputPurpose(page: Page, selector?: string): Promise<{
    passed: boolean;
    issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }>;
    summary: string;
}> {
    const results = await page.evaluate((containerSelector) => {
        const container = containerSelector ? document.querySelector(containerSelector) : document.body;
        if (!container) return { inputs: [], issues: [] };

        const personalDataTypes = [
            'name', 'email', 'tel', 'street-address', 'postal-code',
            'country', 'cc-number', 'cc-exp', 'username', 'new-password', 'current-password'
        ];

        const inputs = container.querySelectorAll('input, select, textarea');
        const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];
        let checkedCount = 0;

        inputs.forEach((input: any) => {
            const type = input.type?.toLowerCase();
            const name = input.name?.toLowerCase() || '';
            const id = input.id?.toLowerCase() || '';
            const autocomplete = input.getAttribute('autocomplete')?.toLowerCase();

            // Check if this looks like a personal data field
            const looksLikePersonalData = personalDataTypes.some(dataType =>
                name.includes(dataType.replace('-', '')) ||
                id.includes(dataType.replace('-', '')) ||
                type === 'email' || type === 'tel'
            );

            if (looksLikePersonalData) {
                checkedCount++;
                if (!autocomplete || autocomplete === 'off') {
                    issues.push({
                        element: input.id ? `#${input.id}` : `input[name="${input.name}"]`,
                        issue: `Personal data input missing autocomplete attribute (WCAG 1.3.5)`,
                        severity: 'error'
                    });
                }
            }
        });

        return { inputsChecked: checkedCount, issues };
    }, selector);

    return {
        passed: results.issues.length === 0,
        issues: results.issues,
        summary: `Checked ${results.inputsChecked} personal data inputs. Found ${results.issues.length} missing autocomplete attributes.`
    };
}

/**
 * WCAG 2.4.4 - Link Purpose (In Context) (Level A)
 * Tests if links have descriptive text (not generic "click here", "read more", etc.)
 */
export async function testLinkPurpose(page: Page, selector?: string): Promise<{
    passed: boolean;
    issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }>;
    summary: string;
}> {
    const results = await page.evaluate((containerSelector) => {
        const container = containerSelector ? document.querySelector(containerSelector) : document.body;
        if (!container) return { links: [], issues: [] };

        const genericLinkText = [
            'click here', 'here', 'more', 'read more', 'learn more',
            'link', 'this', 'continue', 'details', 'info', 'http'
        ];

        const links = container.querySelectorAll('a[href]');
        const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];

        links.forEach((link: any) => {
            const text = link.textContent?.trim().toLowerCase() || '';
            const ariaLabel = link.getAttribute('aria-label')?.toLowerCase() || '';
            const title = link.getAttribute('title')?.toLowerCase() || '';

            const effectiveText = ariaLabel || text || title;

            // Check for generic text
            if (genericLinkText.includes(effectiveText)) {
                issues.push({
                    element: link.id ? `#${link.id}` : `a[href="${link.href}"]`,
                    issue: `Link has generic text: "${effectiveText}" (WCAG 2.4.4)`,
                    severity: 'error'
                });
            }

            // Check for raw URLs as link text
            if (effectiveText.startsWith('http://') || effectiveText.startsWith('https://')) {
                issues.push({
                    element: link.id ? `#${link.id}` : `a[href="${link.href}"]`,
                    issue: `Link uses URL as text instead of descriptive text (WCAG 2.4.4)`,
                    severity: 'warning'
                });
            }

            // Check for empty links
            if (!effectiveText) {
                issues.push({
                    element: link.id ? `#${link.id}` : `a[href="${link.href}"]`,
                    issue: `Link has no accessible text (WCAG 2.4.4)`,
                    severity: 'error'
                });
            }
        });

        return { linksChecked: links.length, issues };
    }, selector);

    return {
        passed: results.issues.length === 0,
        issues: results.issues,
        summary: `Checked ${results.linksChecked} links. Found ${results.issues.length} with generic or missing text.`
    };
}

/**
 * WCAG 2.5.3 - Label in Name (Level A)
 * Tests if visible label text appears in the accessible name
 */
export async function testLabelInName(page: Page, selector?: string): Promise<{
    passed: boolean;
    issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }>;
    summary: string;
}> {
    const results = await page.evaluate((containerSelector) => {
        const container = containerSelector ? document.querySelector(containerSelector) : document.body;
        if (!container) return { elements: [], issues: [] };

        const interactiveElements = container.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]');
        const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];

        interactiveElements.forEach((el: any) => {
            const visibleText = el.textContent?.trim().toLowerCase() || '';
            const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
            const title = el.getAttribute('title')?.toLowerCase() || '';

            // Skip if no visible text
            if (!visibleText) return;

            // Check if visible text appears in accessible name
            const accessibleName = ariaLabel || title || visibleText;

            if (ariaLabel && !ariaLabel.includes(visibleText)) {
                issues.push({
                    element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                    issue: `Visible text "${visibleText}" not in aria-label "${ariaLabel}" (WCAG 2.5.3)`,
                    severity: 'error'
                });
            }
        });

        return { elementsChecked: interactiveElements.length, issues };
    }, selector);

    return {
        passed: results.issues.length === 0,
        issues: results.issues,
        summary: `Checked ${results.elementsChecked} interactive elements. Found ${results.issues.length} label mismatches.`
    };
}

/**
 * WCAG 3.3.1/3.3.2 - Error Identification & Labels (Level A)
 * Enhanced testing for form errors and labels beyond basic axe-core
 */
export async function testEnhancedFormAccessibility(page: Page, selector?: string): Promise<{
    passed: boolean;
    issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }>;
    summary: string;
}> {
    const results = await page.evaluate((containerSelector) => {
        const container = containerSelector ? document.querySelector(containerSelector) : document.body;
        if (!container) return { forms: [], issues: [] };

        const inputs = container.querySelectorAll('input, textarea, select');
        const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];

        inputs.forEach((input: any) => {
            const id = input.id;
            const name = input.name;
            const type = input.type;
            const required = input.required || input.getAttribute('aria-required') === 'true';

            // Check for associated label
            let hasLabel = false;
            if (id) {
                const label = document.querySelector(`label[for="${id}"]`);
                hasLabel = !!label;
            }
            if (!hasLabel) {
                const parentLabel = input.closest('label');
                hasLabel = !!parentLabel;
            }
            if (!hasLabel) {
                const ariaLabel = input.getAttribute('aria-label');
                const ariaLabelledby = input.getAttribute('aria-labelledby');
                hasLabel = !!(ariaLabel || ariaLabelledby);
            }

            if (!hasLabel && type !== 'hidden' && type !== 'submit' && type !== 'button') {
                issues.push({
                    element: id ? `#${id}` : `input[name="${name}"]`,
                    issue: `Form input missing associated label (WCAG 3.3.2)`,
                    severity: 'error'
                });
            }

            // Check required field indicators
            if (required) {
                const ariaRequired = input.getAttribute('aria-required');
                if (ariaRequired !== 'true') {
                    issues.push({
                        element: id ? `#${id}` : `input[name="${name}"]`,
                        issue: `Required field missing aria-required="true" (WCAG 3.3.2)`,
                        severity: 'warning'
                    });
                }
            }

            // Check for error associations
            const ariaInvalid = input.getAttribute('aria-invalid');
            const ariaDescribedby = input.getAttribute('aria-describedby');

            if (ariaInvalid === 'true' && !ariaDescribedby) {
                issues.push({
                    element: id ? `#${id}` : `input[name="${name}"]`,
                    issue: `Invalid field missing aria-describedby for error message (WCAG 3.3.1)`,
                    severity: 'error'
                });
            }
        });

        return { inputsChecked: inputs.length, issues };
    }, selector);

    return {
        passed: results.issues.length === 0,
        issues: results.issues,
        summary: `Checked ${results.inputsChecked} form inputs. Found ${results.issues.length} labeling/error issues.`
    };
}

/**
 * WCAG 4.1.3 - Status Messages (Level AA)
 * Tests live regions for proper implementation
 */
export async function testStatusMessages(page: Page, selector?: string): Promise<{
    passed: boolean;
    issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }>;
    summary: string;
}> {
    const results = await page.evaluate((containerSelector) => {
        const container = containerSelector ? document.querySelector(containerSelector) : document.body;
        if (!container) return { regions: [], issues: [] };

        const liveRegions = container.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]');
        const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];

        liveRegions.forEach((region: any) => {
            const ariaLive = region.getAttribute('aria-live');
            const role = region.getAttribute('role');
            const ariaAtomic = region.getAttribute('aria-atomic');

            // Check for proper politeness levels
            if (ariaLive && !['polite', 'assertive', 'off'].includes(ariaLive)) {
                issues.push({
                    element: region.id ? `#${region.id}` : region.tagName.toLowerCase(),
                    issue: `Invalid aria-live value: "${ariaLive}" (WCAG 4.1.3)`,
                    severity: 'error'
                });
            }

            // Check for aria-atomic on complex updates
            if (role === 'status' && !ariaAtomic) {
                issues.push({
                    element: region.id ? `#${region.id}` : `[role="status"]`,
                    issue: `Status region missing aria-atomic attribute (WCAG 4.1.3)`,
                    severity: 'warning'
                });
            }
        });

        return { regionsChecked: liveRegions.length, issues };
    }, selector);

    return {
        passed: results.issues.length === 0,
        issues: results.issues,
        summary: `Checked ${results.regionsChecked} live regions. Found ${results.issues.length} configuration issues.`
    };
}

/**
 * WCAG 3.2.4 - Consistent Identification (Level AA)
 * Tests if components with same functionality are identified consistently
 */
export async function testConsistentIdentification(page: Page, selector?: string): Promise<{
    passed: boolean;
    issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }>;
    summary: string;
}> {
    const results = await page.evaluate((containerSelector) => {
        const container = containerSelector ? document.querySelector(containerSelector) : document.body;
        if (!container) return { groups: [], issues: [] };

        const buttons = container.querySelectorAll('button, [role="button"]');
        const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];

        // Group buttons by apparent function
        const functionGroups: { [key: string]: Array<{ text: string; element: any }> } = {};

        buttons.forEach((button: any) => {
            const text = button.textContent?.trim().toLowerCase() || '';
            const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
            const onClick = button.getAttribute('onclick') || '';

            // Identify common functions
            const functions = ['submit', 'cancel', 'save', 'delete', 'edit', 'close', 'next', 'previous', 'search'];
            const identifiedFunction = functions.find(fn => text.includes(fn) || ariaLabel.includes(fn) || onClick.includes(fn));

            if (identifiedFunction) {
                if (!functionGroups[identifiedFunction]) {
                    functionGroups[identifiedFunction] = [];
                }
                functionGroups[identifiedFunction].push({
                    text: ariaLabel || text,
                    element: button
                });
            }
        });

        // Check for inconsistent labeling within function groups
        Object.entries(functionGroups).forEach(([func, group]) => {
            if (group.length > 1) {
                const uniqueTexts = new Set(group.map(g => g.text));
                if (uniqueTexts.size > 1) {
                    issues.push({
                        element: `${func} buttons`,
                        issue: `"${func}" buttons have inconsistent labels: ${Array.from(uniqueTexts).join(', ')} (WCAG 3.2.4)`,
                        severity: 'warning'
                    });
                }
            }
        });

        return { groupsChecked: Object.keys(functionGroups).length, issues };
    }, selector);

    return {
        passed: results.issues.length === 0,
        issues: results.issues,
        summary: `Checked ${results.groupsChecked} button function groups. Found ${results.issues.length} inconsistencies.`
    };
}

/**
 * WCAG 4.1.2 - Name, Role, Value (Screen Reader Announcement Simulation)
 * Simulates what screen readers would announce for interactive elements
 */
export async function getElementAnnouncements(page: Page, selector?: string): Promise<{
    passed: boolean;
    issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }>;
    summary: string;
}> {
    const results = await page.evaluate((containerSelector) => {
        const container = containerSelector ? document.querySelector(containerSelector) : document.body;
        if (!container) return { elements: [], issues: [] };

        // Helper: Get accessible name (simplified version for simulation)
        const getAccessibleName = (element: any): string => {
            // aria-labelledby
            const labelledby = element.getAttribute('aria-labelledby');
            if (labelledby) {
                const ids = labelledby.split(/\s+/);
                const names = ids.map((id: string) => {
                    const el = document.getElementById(id);
                    return el ? el.textContent?.trim() : '';
                }).filter((n: string) => n);
                if (names.length > 0) return names.join(' ');
            }

            // aria-label
            const ariaLabel = element.getAttribute('aria-label');
            if (ariaLabel) return ariaLabel.trim();

            // label element
            if (element.labels && element.labels.length > 0) {
                return element.labels[0].textContent?.trim() || '';
            }

            // alt for images
            if (element.tagName === 'IMG') {
                return element.getAttribute('alt') || '';
            }

            // text content for buttons/links
            if (['BUTTON', 'A'].includes(element.tagName)) {
                return element.textContent?.trim() || '';
            }

            // placeholder
            if (element.placeholder) return element.placeholder;

            return '';
        };

        // Get role
        const getRole = (element: any): string => {
            const explicitRole = element.getAttribute('role');
            if (explicitRole) return explicitRole;

            // Implicit roles
            const tagRoles: { [key: string]: string } = {
                'A': 'link',
                'BUTTON': 'button',
                'INPUT': element.type === 'text' ? 'textbox' : element.type,
                'SELECT': 'combobox',
                'TEXTAREA': 'textbox',
                'NAV': 'navigation',
                'MAIN': 'main',
                'HEADER': 'banner',
                'FOOTER': 'contentinfo',
                'ASIDE': 'complementary'
            };

            return tagRoles[element.tagName] || element.tagName.toLowerCase();
        };

        // Get state information
        const getState = (element: any): string[] => {
            const states: string[] = [];

            if (element.getAttribute('aria-expanded') === 'true') states.push('expanded');
            if (element.getAttribute('aria-expanded') === 'false') states.push('collapsed');
            if (element.getAttribute('aria-checked') === 'true') states.push('checked');
            if (element.getAttribute('aria-checked') === 'false') states.push('not checked');
            if (element.getAttribute('aria-selected') === 'true') states.push('selected');
            if (element.getAttribute('aria-pressed') === 'true') states.push('pressed');
            if (element.disabled || element.getAttribute('aria-disabled') === 'true') states.push('disabled');
            if (element.getAttribute('aria-invalid') === 'true') states.push('invalid');
            if (element.required || element.getAttribute('aria-required') === 'true') states.push('required');

            return states;
        };

        // Get all interactive elements
        const interactiveSelectors = [
            'button', 'a[href]', 'input', 'select', 'textarea',
            '[role="button"]', '[role="link"]', '[role="textbox"]',
            '[role="combobox"]', '[role="checkbox"]', '[role="radio"]',
            '[role="tab"]', '[role="menuitem"]', '[tabindex]:not([tabindex="-1"])'
        ];

        const elements = container.querySelectorAll(interactiveSelectors.join(', '));
        const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];
        const genericLabels = ['button', 'link', 'click here', 'submit', 'ok', 'close', 'update', 'edit', 'delete', 'add'];

        elements.forEach((el: any) => {
            // Skip hidden elements
            if (el.offsetWidth === 0 || el.offsetHeight === 0) return;
            if (el.getAttribute('aria-hidden') === 'true') return;

            const name = getAccessibleName(el);
            const role = getRole(el);
            const states = getState(el);

            const elementId = el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}`;

            // Simulate what screen reader would announce
            const announcement = [name, role, ...states].filter(s => s).join(', ');

            // 1. Check for empty announcements
            if (!name) {
                issues.push({
                    element: elementId,
                    issue: `Screen reader would announce: "${role}" with no name/label (WCAG 4.1.2)`,
                    severity: 'error'
                });
            }

            // 2. Check for generic labels
            if (name && genericLabels.includes(name.toLowerCase())) {
                issues.push({
                    element: elementId,
                    issue: `Screen reader would announce generic label: "${name}, ${role}" (lacks context - WCAG 4.1.2)`,
                    severity: 'warning'
                });
            }

            // 3. Check for duplicate announcements (same name+role in same container)
            const duplicates = Array.from(elements).filter((other: any) => {
                if (other === el) return false;
                const otherName = getAccessibleName(other);
                const otherRole = getRole(other);
                return otherName === name && otherRole === role;
            });

            if (duplicates.length > 0 && name) {
                issues.push({
                    element: elementId,
                    issue: `Screen reader would announce: "${announcement}" (${duplicates.length + 1} elements with identical announcement - users can't distinguish)`,
                    severity: 'warning'
                });
            }

            // 4. Check for overly verbose announcements
            if (name && name.length > 100) {
                issues.push({
                    element: elementId,
                    issue: `Screen reader announcement is too long (${name.length} characters): "${name.substring(0, 50)}..." (WCAG 4.1.2)`,
                    severity: 'warning'
                });
            }
        });

        return {
            elementsChecked: elements.length,
            issues
        };
    }, selector);

    // Deduplicate issues (e.g., if 5 buttons have same generic label, report once)
    const uniqueIssues = results.issues.reduce((acc: any[], issue: any) => {
        const duplicate = acc.find(i =>
            i.issue === issue.issue && i.severity === issue.severity
        );
        if (!duplicate) {
            acc.push(issue);
        }
        return acc;
    }, []);

    return {
        passed: uniqueIssues.length === 0,
        issues: uniqueIssues,
        summary: `Checked ${results.elementsChecked} interactive elements. Found ${uniqueIssues.length} announcement issues.`
    };
}

/**
 * Run all WCAG 2.1 AA specific tests
 */
export async function runAllWCAG21AATests(page: Page, selector?: string): Promise<{
    overallPassed: boolean;
    totalIssues: number;
    results: {
        identifyInputPurpose: Awaited<ReturnType<typeof testIdentifyInputPurpose>>;
        linkPurpose: Awaited<ReturnType<typeof testLinkPurpose>>;
        labelInName: Awaited<ReturnType<typeof testLabelInName>>;
        enhancedFormAccessibility: Awaited<ReturnType<typeof testEnhancedFormAccessibility>>;
        statusMessages: Awaited<ReturnType<typeof testStatusMessages>>;
        consistentIdentification: Awaited<ReturnType<typeof testConsistentIdentification>>;
        elementAnnouncements: Awaited<ReturnType<typeof getElementAnnouncements>>;
    };
}> {
    const results = {
        identifyInputPurpose: await testIdentifyInputPurpose(page, selector),
        linkPurpose: await testLinkPurpose(page, selector),
        labelInName: await testLabelInName(page, selector),
        enhancedFormAccessibility: await testEnhancedFormAccessibility(page, selector),
        statusMessages: await testStatusMessages(page, selector),
        consistentIdentification: await testConsistentIdentification(page, selector),
        elementAnnouncements: await getElementAnnouncements(page, selector)
    };

    const totalIssues = Object.values(results).reduce((sum, result) => sum + result.issues.length, 0);
    const overallPassed = totalIssues === 0;

    return {
        overallPassed,
        totalIssues,
        results
    };
}
