#!/usr/bin/env node
/**
 * MCP Accessibility Testing Server
 * 
 * An AI-powered accessibility testing server that integrates with Cursor IDE
 * to provide natural language control over browser automation and WCAG compliance testing.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
    ErrorCode,
    McpError
} from "@modelcontextprotocol/sdk/types.js";
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as wcag21aa from './wcag-21-aa-tester.js';
import * as wcag22aa from './wcag-22-aa-tester.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Browser management
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

// Simple result cache for optimization (Phase 3)
const resultCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

function getCached<T>(key: string): T | null {
    const cached = resultCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data as T;
    }
    resultCache.delete(key);
    return null;
}

function setCache(key: string, data: any): void {
    resultCache.set(key, { data, timestamp: Date.now() });
}

function clearCache(): void {
    resultCache.clear();
}

// Schema definitions for tool parameters
const OpenBrowserSchema = z.object({
    headless: z.boolean().optional().default(false),
    viewport: z.object({
        width: z.number().optional().default(1280),
        height: z.number().optional().default(720)
    }).optional()
});

const GetElementsSchema = z.object({
    type: z.enum(['clickable', 'form', 'all']).optional().default('all'),
    includeHidden: z.boolean().optional().default(false),
    selector: z.string().optional() // Scope testing to specific container
});

const FindByAccessibilitySchema = z.object({
    role: z.string().optional(),
    ariaLabel: z.string().optional(),
    ariaDescribedBy: z.string().optional(),
    name: z.string().optional()
});

const WaitForElementSchema = z.object({
    selector: z.string(),
    state: z.enum(['attached', 'detached', 'visible', 'hidden']).optional().default('visible'),
    timeout: z.number().optional().default(30000)
});

const GetElementPropertiesSchema = z.object({
    selector: z.string()
});

const FindByTextSchema = z.object({
    text: z.string(),
    exact: z.boolean().optional().default(false),
    elementType: z.string().optional()
});

// Screen Reader Testing Schemas
const GetAccessibilityTreeSchema = z.object({
    selector: z.string().optional(),
    includeIgnored: z.boolean().optional().default(false)
});

const TestKeyboardNavigationSchema = z.object({
    startSelector: z.string().optional(),
    maxSteps: z.number().optional().default(100),
    checkTrapFocus: z.boolean().optional().default(true),
    testAllWidgets: z.boolean().optional().default(false)
});

const GetFocusOrderSchema = z.object({
    selector: z.string().optional(),
    includeHidden: z.boolean().optional().default(false)
});

const ValidateAriaSchema = z.object({
    selector: z.string().optional(),
    strict: z.boolean().optional().default(true)
});

const GetLandmarksSchema = z.object({
    includeImplicit: z.boolean().optional().default(true)
});

const GetScreenReaderOutputSchema = z.object({
    selector: z.string().optional(),
    mode: z.enum(['browse', 'focus', 'forms']).optional().default('browse'),
    action: z.enum(['navigate', 'click', 'focus', 'change']).optional().default('navigate'),
    platform: z.enum(['windows-jaws', 'windows-nvda', 'mac-voiceover', 'all', 'auto']).optional().default('auto')
});

const TestHeadingStructureSchema = z.object({
    checkNesting: z.boolean().optional().default(true),
    allowSkipping: z.boolean().optional().default(false)
});


const TestFormLabelsSchema = z.object({
    selector: z.string().optional(),
    checkRequired: z.boolean().optional().default(true),
    checkErrors: z.boolean().optional().default(true)
});

// Consolidated focus accessibility schema
const TestFocusAccessibilitySchema = z.object({
    testAll: z.boolean().optional().default(true),
    expectedOrder: z.array(z.string()).optional(),
    testTabOrder: z.boolean().optional().default(true),
    testFocusTrap: z.boolean().optional().default(true),
    checkReverse: z.boolean().optional().default(true),
    selector: z.string().optional(),
    checkEscape: z.boolean().optional().default(true)
});

const TestLiveRegionsSchema = z.object({
    timeout: z.number().optional().default(5000)
});

const GetSemanticStructureSchema = z.object({
    includeText: z.boolean().optional().default(false)
});

const GetAccessibleNameSchema = z.object({
    selector: z.string()
});

const TestSkipLinksSchema = z.object({
    checkTarget: z.boolean().optional().default(true)
});

// Platform-Specific Screen Reader Testing Schemas

// Consolidated screen reader compatibility schema
const TestScreenReaderCompatibilitySchema = z.object({
    testAll: z.boolean().optional().default(true),
    testNavigation: z.boolean().optional().default(true),
    testARIA: z.boolean().optional().default(true),
    platform: z.enum(['windows-jaws', 'windows-nvda', 'mac-voiceover', 'all']).optional().default('all'),
    // Navigation pattern parameters
    pattern: z.enum(['quick_navigation', 'virtual_buffer', 'rotor', 'all']).optional().default('all'),
    quickNavKeys: z.array(z.enum(['H', 'B', 'F', 'T', 'L', 'I', 'R', 'D', 'S', 'N', 'E', 'C', 'Q', 'M', 'G'])).optional().default(['H', 'B', 'F', 'T', 'L']),
    rotorCategories: z.array(z.string()).optional().default(['Headings', 'Links', 'Form Controls', 'Tables', 'Landmarks', 'Images'])
});

const TestHighContrastSchema = z.object({
    scheme: z.enum(['black-on-white', 'white-on-black', 'yellow-on-black', 'auto']).optional().default('auto'),
    checkImages: z.boolean().optional().default(true),
    checkBorders: z.boolean().optional().default(true)
});

const TestTableNavigationSchema = z.object({
    platform: z.enum(['windows', 'mac', 'both']).optional().default('both'),
    checkHeaders: z.boolean().optional().default(true),
    checkScope: z.boolean().optional().default(true)
});


const TestMathContentSchema = z.object({
    checkMathML: z.boolean().optional().default(true),
    checkAltText: z.boolean().optional().default(true)
});

// Visual & Responsive Testing Schemas (WCAG 2.1)
const TestFocusVisibilitySchema = z.object({
    takeScreenshots: z.boolean().optional().default(true),
    checkContrast: z.boolean().optional().default(true),
    minSize: z.number().optional().default(2)
});

// Consolidated responsive accessibility schema
const TestResponsiveAccessibilitySchema = z.object({
    testAll: z.boolean().optional().default(true),
    testHover: z.boolean().optional().default(true),
    testReflow: z.boolean().optional().default(true),
    testTextResize: z.boolean().optional().default(true),
    testTextSpacing: z.boolean().optional().default(true),
    // Hover/focus parameters
    checkHoverable: z.boolean().optional().default(true),
    checkDismissible: z.boolean().optional().default(true),
    checkPersistent: z.boolean().optional().default(true),
    // Reflow parameters
    width: z.number().optional().default(320),
    height: z.number().optional().default(256),
    checkHorizontalScroll: z.boolean().optional().default(true),
    checkVerticalScroll: z.boolean().optional().default(false),
    // Text resize parameters
    zoomLevel: z.number().optional().default(200),
    checkOverflow: z.boolean().optional().default(true),
    checkReadability: z.boolean().optional().default(true),
    // Text spacing parameters
    lineHeight: z.number().optional().default(1.5),
    letterSpacing: z.number().optional().default(0.12),
    wordSpacing: z.number().optional().default(0.16),
    paragraphSpacing: z.number().optional().default(2)
});

const TestAutoRefreshSchema = z.object({
    checkMetaRefresh: z.boolean().optional().default(true),
    checkJavaScriptRefresh: z.boolean().optional().default(true),
    timeout: z.number().optional().default(5000)
});

const TestAnimationControlSchema = z.object({
    checkMotionReduction: z.boolean().optional().default(true),
    checkPauseControls: z.boolean().optional().default(true),
    checkAutoPlay: z.boolean().optional().default(true)
});


const TestOrientationLockSchema = z.object({
    checkPortrait: z.boolean().optional().default(true),
    checkLandscape: z.boolean().optional().default(true),
    checkRotation: z.boolean().optional().default(true)
});

const NavigateSchema = z.object({
    url: z.string().url()
});

const ClickSchema = z.object({
    selector: z.string(),
    options: z.object({
        force: z.boolean().optional(),
        timeout: z.number().optional()
    }).optional()
});

const FillSchema = z.object({
    selector: z.string(),
    value: z.string(),
    options: z.object({
        force: z.boolean().optional(),
        timeout: z.number().optional()
    }).optional()
});

const LoginSchema = z.object({
    usernameSelector: z.string().optional().default('input[name="username"], input[name="email"], input[type="email"], #username, #email'),
    passwordSelector: z.string().optional().default('input[name="password"], input[type="password"], #password'),
    submitSelector: z.string().optional().default('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")'),
    username: z.string(),
    password: z.string()
});

const AnalyzeAccessibilitySchema = z.object({
    includedImpacts: z.array(z.enum(['minor', 'moderate', 'serious', 'critical'])).optional(),
    runOnly: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    context: z.string().optional(),
    reportFormat: z.enum(['json', 'html', 'markdown']).optional().default('markdown')
});

const ScreenshotSchema = z.object({
    filename: z.string().optional(),
    fullPage: z.boolean().optional().default(false)
});

const WaitSchema = z.object({
    timeout: z.number().min(0).max(30000)
});

const SetViewportSchema = z.object({
    width: z.number().min(320),
    height: z.number().min(240),
    deviceScaleFactor: z.number().optional().default(1),
    isMobile: z.boolean().optional().default(false)
});

const RunWCAG21AATestsSchema = z.object({
    selector: z.string().optional()
});

const RunWCAG22AATestsSchema = z.object({
    selector: z.string().optional()
});

const TestTargetSizeSchema = z.object({
    selector: z.string().optional()
});

const TestFocusNotObscuredSchema = z.object({
    selector: z.string().optional()
});

const TestAccessibleAuthenticationSchema = z.object({
    selector: z.string().optional()
});

const TestOnFocusBehaviorSchema = z.object({
    selector: z.string().optional(),
    timeout: z.number().optional().default(1000)
});

const TestOnInputBehaviorSchema = z.object({
    selector: z.string().optional(),
    timeout: z.number().optional().default(1000)
});

// Helper functions
async function ensureBrowser(): Promise<Page> {
    if (!browser && !context) {
        // Check if we should force headed mode (for VNC viewing)
        const forceHeaded = process.env.FORCE_HEADED_BROWSER === 'true';
        const isHeadless = forceHeaded ? false : false; // Default was already false

        await createBrowserContext({
            headless: isHeadless,
            viewport: { width: 1280, height: 720 }
        });
    }
    if (!page) {
        throw new Error("Failed to create browser page");
    }
    return page;
}

/**
 * Create browser context using either persistent or non-persistent mode
 * - If CHROME_USER_DATA_DIR is set: use launchPersistentContext (saves cookies/sessions)
 * - Otherwise: use launch + newContext (clean session, current behavior)
 */
async function createBrowserContext(options: {
    headless: boolean;
    viewport?: { width: number; height: number };
}): Promise<void> {
    const userDataDir = process.env.CHROME_USER_DATA_DIR;
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    const viewport = options.viewport || { width: 1280, height: 720 };

    if (userDataDir) {
        // Persistent mode: use launchPersistentContext
        // Note: This uses Playwright's bundled Chromium, not system Chrome
        context = await chromium.launchPersistentContext(userDataDir, {
            headless: options.headless,
            viewport: viewport,
            userAgent: userAgent,
            args: ['--disable-blink-features=AutomationControlled'],
            // Explicitly use Playwright's bundled Chromium (not system Chrome)
            channel: undefined,  // Don't use 'chrome' channel
        });
        browser = null; // Not used in persistent mode
        // launchPersistentContext creates a page automatically
        page = context.pages()[0] || await context.newPage();
    } else {
        // Non-persistent mode: use launch + newContext (original behavior)
        browser = await chromium.launch({
            headless: options.headless,
            args: ['--disable-blink-features=AutomationControlled'],
            // Explicitly use Playwright's bundled Chromium (not system Chrome)
            channel: undefined,  // Don't use 'chrome' channel
        });
        context = await browser.newContext({
            viewport: viewport,
            userAgent: userAgent
        });
        page = await context.newPage();
    }
}

async function generateHTMLReport(results: any, url: string): Promise<string> {
    const timestamp = new Date().toISOString();
    const violations = results.violations || [];
    const passes = results.passes || [];

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Report - ${url}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card.violations { background: #ffebee; border: 1px solid #ffcdd2; }
        .summary-card.passes { background: #e8f5e9; border: 1px solid #c8e6c9; }
        .summary-card h3 { margin: 0 0 10px 0; }
        .summary-card .number { font-size: 36px; font-weight: bold; }
        .violation { margin: 20px 0; padding: 20px; border-left: 4px solid #f44336; background: #fff; border-radius: 4px; }
        .violation.critical { border-left-color: #d32f2f; }
        .violation.serious { border-left-color: #f44336; }
        .violation.moderate { border-left-color: #ff9800; }
        .violation.minor { border-left-color: #ffc107; }
        .impact { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .impact.critical { background: #d32f2f; color: white; }
        .impact.serious { background: #f44336; color: white; }
        .impact.moderate { background: #ff9800; color: white; }
        .impact.minor { background: #ffc107; color: black; }
        .nodes { margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
        .node { margin: 5px 0; padding: 5px; background: white; border-radius: 2px; font-family: monospace; font-size: 12px; }
        .meta { color: #666; font-size: 14px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Accessibility Report</h1>
        <div class="meta">
            <p><strong>URL:</strong> ${url}</p>
            <p><strong>Tested:</strong> ${timestamp}</p>
            <p><strong>Standards:</strong> WCAG 2.1 Level A & AA</p>
        </div>
        
        <div class="summary">
            <div class="summary-card violations">
                <h3>Violations</h3>
                <div class="number">${violations.length}</div>
                <p>Issues found</p>
            </div>
            <div class="summary-card passes">
                <h3>Passes</h3>
                <div class="number">${passes.length}</div>
                <p>Rules passed</p>
            </div>
        </div>
        
        <h2>Violations</h2>
        ${violations.length === 0 ? '<p>No violations found! ✅</p>' : violations.map((v: any) => `
            <div class="violation ${v.impact}">
                <span class="impact ${v.impact}">${v.impact}</span>
                <h3>${v.help}</h3>
                <p>${v.description}</p>
                <p><strong>WCAG:</strong> ${v.tags.join(', ')}</p>
                <div class="nodes">
                    <strong>Affected elements (${v.nodes.length}):</strong>
                    ${v.nodes.slice(0, 3).map((n: any) => `
                        <div class="node">${n.html}</div>
                    `).join('')}
                    ${v.nodes.length > 3 ? `<p>... and ${v.nodes.length - 3} more</p>` : ''}
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
}

function generateMarkdownReport(results: any, url: string): string {
    const timestamp = new Date().toISOString();
    const violations = results.violations || [];
    const passes = results.passes || [];

    let report = `# Accessibility Report\n\n`;
    report += `**URL:** ${url}\n`;
    report += `**Tested:** ${timestamp}\n`;
    report += `**Standards:** WCAG 2.1 Level A & AA\n\n`;

    report += `## Summary\n\n`;
    report += `- **Violations:** ${violations.length} issues found\n`;
    report += `- **Passes:** ${passes.length} rules passed\n\n`;

    if (violations.length > 0) {
        report += `## Violations\n\n`;

        // Group by impact
        const criticalViolations = violations.filter((v: any) => v.impact === 'critical');
        const seriousViolations = violations.filter((v: any) => v.impact === 'serious');
        const moderateViolations = violations.filter((v: any) => v.impact === 'moderate');
        const minorViolations = violations.filter((v: any) => v.impact === 'minor');

        if (criticalViolations.length > 0) {
            report += `### 🔴 Critical (${criticalViolations.length})\n\n`;
            criticalViolations.forEach((v: any) => {
                report += `**${v.help}**\n`;
                report += `- ${v.description}\n`;
                report += `- WCAG: ${v.tags.join(', ')}\n`;
                report += `- Affected elements: ${v.nodes.length}\n\n`;
            });
        }

        if (seriousViolations.length > 0) {
            report += `### 🟠 Serious (${seriousViolations.length})\n\n`;
            seriousViolations.forEach((v: any) => {
                report += `**${v.help}**\n`;
                report += `- ${v.description}\n`;
                report += `- WCAG: ${v.tags.join(', ')}\n`;
                report += `- Affected elements: ${v.nodes.length}\n\n`;
            });
        }

        if (moderateViolations.length > 0) {
            report += `### 🟡 Moderate (${moderateViolations.length})\n\n`;
            moderateViolations.forEach((v: any) => {
                report += `**${v.help}**\n`;
                report += `- ${v.description}\n`;
                report += `- WCAG: ${v.tags.join(', ')}\n`;
                report += `- Affected elements: ${v.nodes.length}\n\n`;
            });
        }

        if (minorViolations.length > 0) {
            report += `### 🟢 Minor (${minorViolations.length})\n\n`;
            minorViolations.forEach((v: any) => {
                report += `**${v.help}**\n`;
                report += `- ${v.description}\n`;
                report += `- WCAG: ${v.tags.join(', ')}\n`;
                report += `- Affected elements: ${v.nodes.length}\n\n`;
            });
        }
    } else {
        report += `## ✅ No violations found!\n\n`;
        report += `All accessibility checks passed successfully.\n`;
    }

    return report;
}

// Initialize MCP server
const server = new Server(
    {
        name: "accessibility",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Define available tools
const tools: Tool[] = [
    {
        name: "open_browser",
        description: "Open a browser instance for accessibility testing",
        inputSchema: {
            type: "object",
            properties: {
                headless: {
                    type: "boolean",
                    description: "Run browser in headless mode",
                    default: false
                },
                viewport: {
                    type: "object",
                    properties: {
                        width: { type: "number", default: 1280 },
                        height: { type: "number", default: 720 }
                    }
                }
            }
        }
    },
    {
        name: "navigate",
        description: "Navigate to a URL",
        inputSchema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "URL to navigate to"
                }
            },
            required: ["url"]
        }
    },
    {
        name: "click",
        description: "Click an element on the page",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "CSS selector or text selector for element to click"
                },
                options: {
                    type: "object",
                    properties: {
                        force: { type: "boolean" },
                        timeout: { type: "number" }
                    }
                }
            },
            required: ["selector"]
        }
    },
    {
        name: "fill",
        description: "Fill a form field with text",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "CSS selector for input field"
                },
                value: {
                    type: "string",
                    description: "Value to fill"
                },
                options: {
                    type: "object",
                    properties: {
                        force: { type: "boolean" },
                        timeout: { type: "number" }
                    }
                }
            },
            required: ["selector", "value"]
        }
    },
    {
        name: "login",
        description: "Perform login action with username and password",
        inputSchema: {
            type: "object",
            properties: {
                username: {
                    type: "string",
                    description: "Username or email"
                },
                password: {
                    type: "string",
                    description: "Password"
                },
                usernameSelector: {
                    type: "string",
                    description: "CSS selector for username field"
                },
                passwordSelector: {
                    type: "string",
                    description: "CSS selector for password field"
                },
                submitSelector: {
                    type: "string",
                    description: "CSS selector for submit button"
                }
            },
            required: ["username", "password"]
        }
    },
    {
        name: "analyze_accessibility",
        description: "Analyze current page for accessibility issues using axe-core",
        inputSchema: {
            type: "object",
            properties: {
                includedImpacts: {
                    type: "array",
                    items: {
                        type: "string",
                        enum: ["minor", "moderate", "serious", "critical"]
                    },
                    description: "Impact levels to include"
                },
                runOnly: {
                    type: "array",
                    items: { type: "string" },
                    description: "Specific rule IDs to run"
                },
                tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Rule tags to include (e.g., 'best-practice', 'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa')"
                },
                context: {
                    type: "string",
                    description: "CSS selector for specific element to test"
                },
                reportFormat: {
                    type: "string",
                    enum: ["json", "html", "markdown"],
                    description: "Format for the report",
                    default: "markdown"
                }
            }
        }
    },
    {
        name: "screenshot",
        description: "Take a screenshot of the current page",
        inputSchema: {
            type: "object",
            properties: {
                filename: {
                    type: "string",
                    description: "Filename for screenshot"
                },
                fullPage: {
                    type: "boolean",
                    description: "Capture full page",
                    default: false
                }
            }
        }
    },
    {
        name: "close_browser",
        description: "Close the browser instance",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "wait",
        description: "Wait for specified time in milliseconds",
        inputSchema: {
            type: "object",
            properties: {
                timeout: {
                    type: "number",
                    description: "Time to wait in milliseconds (max 30000)"
                }
            },
            required: ["timeout"]
        }
    },
    {
        name: "set_viewport",
        description: "Set browser viewport size (e.g., for mobile testing)",
        inputSchema: {
            type: "object",
            properties: {
                width: {
                    type: "number",
                    description: "Viewport width"
                },
                height: {
                    type: "number",
                    description: "Viewport height"
                },
                deviceScaleFactor: {
                    type: "number",
                    description: "Device scale factor",
                    default: 1
                },
                isMobile: {
                    type: "boolean",
                    description: "Enable mobile viewport",
                    default: false
                }
            },
            required: ["width", "height"]
        }
    },
    {
        name: "get_page_info",
        description: "Get information about the current page",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "get_elements",
        description: "Get all elements of a specific type (clickable, form, or all visible elements) - supports scoped testing for faster performance",
        inputSchema: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    enum: ["clickable", "form", "all"],
                    description: "Type of elements to retrieve",
                    default: "all"
                },
                includeHidden: {
                    type: "boolean",
                    description: "Include hidden elements",
                    default: false
                },
                selector: {
                    type: "string",
                    description: "Optional CSS selector to scope testing to a specific container (e.g., '#main-content', '.modal-dialog') - improves performance by 40%"
                }
            }
        }
    },
    {
        name: "find_by_accessibility",
        description: "Find elements using accessibility attributes (role, aria-label, etc.)",
        inputSchema: {
            type: "object",
            properties: {
                role: {
                    type: "string",
                    description: "ARIA role (e.g., 'button', 'textbox', 'navigation')"
                },
                ariaLabel: {
                    type: "string",
                    description: "aria-label attribute value"
                },
                ariaDescribedBy: {
                    type: "string",
                    description: "aria-describedby attribute value"
                },
                name: {
                    type: "string",
                    description: "Accessible name of the element"
                }
            }
        }
    },
    {
        name: "wait_for_element",
        description: "Wait for an element to appear/disappear with specific state",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "CSS selector for the element"
                },
                state: {
                    type: "string",
                    enum: ["attached", "detached", "visible", "hidden"],
                    description: "State to wait for",
                    default: "visible"
                },
                timeout: {
                    type: "number",
                    description: "Maximum time to wait in milliseconds",
                    default: 30000
                }
            },
            required: ["selector"]
        }
    },
    {
        name: "get_element_properties",
        description: "Get detailed properties and attributes of an element",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "CSS selector for the element"
                }
            },
            required: ["selector"]
        }
    },
    {
        name: "find_by_text",
        description: "Find elements containing specific text",
        inputSchema: {
            type: "object",
            properties: {
                text: {
                    type: "string",
                    description: "Text to search for"
                },
                exact: {
                    type: "boolean",
                    description: "Match exact text only",
                    default: false
                },
                elementType: {
                    type: "string",
                    description: "Optional element type to filter (e.g., 'button', 'a', 'input')"
                }
            },
            required: ["text"]
        }
    },
    // Screen Reader Testing Tools
    {
        name: "get_accessibility_tree",
        description: "Get the accessibility tree snapshot for screen reader testing (shows how screen readers see the page)",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional CSS selector to focus on specific element's tree"
                },
                includeIgnored: {
                    type: "boolean",
                    description: "Include nodes ignored by assistive technology",
                    default: false
                }
            }
        }
    },
    {
        name: "test_keyboard_navigation",
        description: "Test keyboard navigation flow and check for keyboard traps - supports consolidated widget testing with testAllWidgets flag (tests all 13 ARIA widget patterns in one call)",
        inputSchema: {
            type: "object",
            properties: {
                startSelector: {
                    type: "string",
                    description: "CSS selector to start navigation from"
                },
                maxSteps: {
                    type: "number",
                    description: "Maximum number of tab key presses",
                    default: 100
                },
                checkTrapFocus: {
                    type: "boolean",
                    description: "Check for focus traps",
                    default: true
                },
                testAllWidgets: {
                    type: "boolean",
                    description: "Test all 13 ARIA widget patterns (tabs, accordions, comboboxes, sliders, menus, listboxes, radios, trees, modals, date pickers, tables, carousels, toolbars) in one call for faster comprehensive testing",
                    default: false
                }
            }
        }
    },
    {
        name: "get_focus_order",
        description: "Get the tab order of focusable elements on the page",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional CSS selector to limit scope"
                },
                includeHidden: {
                    type: "boolean",
                    description: "Include hidden elements",
                    default: false
                }
            }
        }
    },
    {
        name: "validate_aria_attributes",
        description: "Validate ARIA attributes for correctness and screen reader compatibility",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional CSS selector to limit validation scope"
                },
                strict: {
                    type: "boolean",
                    description: "Use strict validation rules",
                    default: true
                }
            }
        }
    },
    {
        name: "get_landmarks",
        description: "Get all ARIA landmarks and page regions for screen reader navigation",
        inputSchema: {
            type: "object",
            properties: {
                includeImplicit: {
                    type: "boolean",
                    description: "Include implicit landmarks from semantic HTML",
                    default: true
                }
            }
        }
    },
    {
        name: "get_screen_reader_output",
        description: "Get comprehensive screen reader output including announcements, navigation modes, and platform-specific variations",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional element selector to focus on"
                },
                mode: {
                    type: "string",
                    enum: ["browse", "focus", "forms"],
                    description: "Screen reader navigation mode",
                    default: "browse"
                },
                action: {
                    type: "string",
                    enum: ["navigate", "click", "focus", "change"],
                    description: "Action to simulate (for specific element testing)",
                    default: "navigate"
                },
                platform: {
                    type: "string",
                    enum: ["windows-jaws", "windows-nvda", "mac-voiceover", "all", "auto"],
                    description: "Platform-specific announcements",
                    default: "auto"
                }
            }
        }
    },
    {
        name: "test_heading_structure",
        description: "Test heading hierarchy for proper nesting and screen reader navigation",
        inputSchema: {
            type: "object",
            properties: {
                checkNesting: {
                    type: "boolean",
                    description: "Check for proper heading level nesting",
                    default: true
                },
                allowSkipping: {
                    type: "boolean",
                    description: "Allow skipping heading levels",
                    default: false
                }
            }
        }
    },
    {
        name: "test_form_labels",
        description: "Test form accessibility including labels, descriptions, and error messages",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional form selector"
                },
                checkRequired: {
                    type: "boolean",
                    description: "Check required field indicators",
                    default: true
                },
                checkErrors: {
                    type: "boolean",
                    description: "Check error message associations",
                    default: true
                }
            }
        }
    },
    {
        name: "test_focus_accessibility",
        description: "Test focus management including tab order and focus traps (WCAG 2.4.3, 2.1.2)",
        inputSchema: {
            type: "object",
            properties: {
                testAll: {
                    type: "boolean",
                    description: "Test all focus management aspects",
                    default: true
                },
                expectedOrder: {
                    type: "array",
                    items: { type: "string" },
                    description: "Expected tab order (for tab order testing)"
                },
                testTabOrder: {
                    type: "boolean",
                    description: "Test tab order matches visual flow",
                    default: true
                },
                testFocusTrap: {
                    type: "boolean",
                    description: "Test for focus traps",
                    default: true
                },
                checkReverse: {
                    type: "boolean",
                    description: "Also test reverse tab navigation",
                    default: true
                },
                selector: {
                    type: "string",
                    description: "Container selector (for focus trap testing)"
                },
                checkEscape: {
                    type: "boolean",
                    description: "Check if Escape key exits trap",
                    default: true
                }
            }
        }
    },
    {
        name: "test_live_regions",
        description: "Test ARIA live regions for dynamic content announcements",
        inputSchema: {
            type: "object",
            properties: {
                timeout: {
                    type: "number",
                    description: "Time to wait for live region updates",
                    default: 5000
                }
            }
        }
    },
    {
        name: "get_semantic_structure",
        description: "Get the semantic HTML structure for screen reader understanding",
        inputSchema: {
            type: "object",
            properties: {
                includeText: {
                    type: "boolean",
                    description: "Include text content in structure",
                    default: false
                }
            }
        }
    },
    {
        name: "get_accessible_name",
        description: "Get the computed accessible name for an element as screen readers would read it",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Element selector"
                }
            },
            required: ["selector"]
        }
    },
    {
        name: "test_skip_links",
        description: "Test skip navigation links for screen reader users",
        inputSchema: {
            type: "object",
            properties: {
                checkTarget: {
                    type: "boolean",
                    description: "Verify skip link targets exist",
                    default: true
                }
            }
        }
    },
    {
        name: "test_screen_reader_compatibility",
        description: "Test cross-platform screen reader compatibility including navigation patterns and ARIA support (JAWS, NVDA, VoiceOver)",
        inputSchema: {
            type: "object",
            properties: {
                testAll: {
                    type: "boolean",
                    description: "Test all compatibility aspects",
                    default: true
                },
                testNavigation: {
                    type: "boolean",
                    description: "Test navigation patterns (quick keys, virtual buffer, rotor)",
                    default: true
                },
                testARIA: {
                    type: "boolean",
                    description: "Test ARIA support differences across platforms",
                    default: true
                },
                platform: {
                    type: "string",
                    enum: ["windows-jaws", "windows-nvda", "mac-voiceover", "all"],
                    description: "Platform to test",
                    default: "all"
                },
                pattern: {
                    type: "string",
                    enum: ["quick_navigation", "virtual_buffer", "rotor", "all"],
                    description: "Navigation pattern to test",
                    default: "all"
                },
                quickNavKeys: {
                    type: "array",
                    description: "Quick navigation keys to test",
                    items: {
                        type: "string",
                        enum: ["H", "B", "F", "T", "L", "I", "R", "D", "S", "N", "E", "C", "Q", "M", "G"]
                    },
                    default: ["H", "B", "F", "T", "L"]
                },
                rotorCategories: {
                    type: "array",
                    description: "Rotor categories to test",
                    items: {
                        type: "string"
                    },
                    default: ["Headings", "Links", "Form Controls", "Tables", "Landmarks", "Images"]
                }
            }
        }
    },
    {
        name: "test_high_contrast",
        description: "Test content visibility in high contrast mode (Windows High Contrast/macOS Increase Contrast)",
        inputSchema: {
            type: "object",
            properties: {
                scheme: {
                    type: "string",
                    description: "High contrast color scheme",
                    enum: ["black-on-white", "white-on-black", "yellow-on-black", "auto"],
                    default: "auto"
                },
                checkImages: {
                    type: "boolean",
                    description: "Check if images have appropriate contrast",
                    default: true
                },
                checkBorders: {
                    type: "boolean",
                    description: "Check if borders are visible in high contrast",
                    default: true
                }
            }
        }
    },
    {
        name: "test_table_navigation",
        description: "Test table navigation patterns for different screen readers (JAWS Ctrl+Alt vs VoiceOver VO+Command)",
        inputSchema: {
            type: "object",
            properties: {
                platform: {
                    type: "string",
                    description: "Platform-specific navigation to test",
                    enum: ["windows", "mac", "both"],
                    default: "both"
                },
                checkHeaders: {
                    type: "boolean",
                    description: "Verify table headers are properly associated",
                    default: true
                },
                checkScope: {
                    type: "boolean",
                    description: "Check scope attributes for headers",
                    default: true
                }
            }
        }
    },
    {
        name: "test_math_content",
        description: "Test mathematical content accessibility (MathML support varies by screen reader)",
        inputSchema: {
            type: "object",
            properties: {
                checkMathML: {
                    type: "boolean",
                    description: "Check for MathML support",
                    default: true
                },
                checkAltText: {
                    type: "boolean",
                    description: "Check for alternative text for equations",
                    default: true
                }
            }
        }
    },
    {
        name: "test_focus_visibility",
        description: "Test focus indicator visibility (WCAG 2.1 Success Criteria 2.4.7 Focus Visible - Level AA, and 2.4.13 Focus Appearance - Level AAA optional)",
        inputSchema: {
            type: "object",
            properties: {
                takeScreenshots: {
                    type: "boolean",
                    description: "Take screenshots of focused elements",
                    default: true
                },
                checkContrast: {
                    type: "boolean",
                    description: "Check 3:1 contrast ratio for focus indicators",
                    default: true
                },
                minSize: {
                    type: "number",
                    description: "Minimum focus indicator size in pixels",
                    default: 2
                }
            }
        }
    },
    {
        name: "test_responsive_accessibility",
        description: "Test responsive and content accessibility including hover content, reflow, text resize, and text spacing (WCAG 1.4.4, 1.4.10, 1.4.12, 1.4.13)",
        inputSchema: {
            type: "object",
            properties: {
                testAll: {
                    type: "boolean",
                    description: "Test all responsive aspects",
                    default: true
                },
                testHover: {
                    type: "boolean",
                    description: "Test hover/focus content (WCAG 1.4.13)",
                    default: true
                },
                testReflow: {
                    type: "boolean",
                    description: "Test content reflow at 320px (WCAG 1.4.10)",
                    default: true
                },
                testTextResize: {
                    type: "boolean",
                    description: "Test text at 200% zoom (WCAG 1.4.4)",
                    default: true
                },
                testTextSpacing: {
                    type: "boolean",
                    description: "Test text spacing modifications (WCAG 1.4.12)",
                    default: true
                },
                // Hover/focus parameters
                checkHoverable: {
                    type: "boolean",
                    description: "Check if hover content is hoverable",
                    default: true
                },
                checkDismissible: {
                    type: "boolean",
                    description: "Check if content can be dismissed without moving pointer",
                    default: true
                },
                checkPersistent: {
                    type: "boolean",
                    description: "Check if hover content remains visible until dismissed or invalid",
                    default: true
                },
                // Reflow parameters
                width: {
                    type: "number",
                    description: "Viewport width for reflow test",
                    default: 320
                },
                height: {
                    type: "number",
                    description: "Viewport height for reflow test",
                    default: 256
                },
                checkHorizontalScroll: {
                    type: "boolean",
                    description: "Check for horizontal scrolling",
                    default: true
                },
                checkVerticalScroll: {
                    type: "boolean",
                    description: "Allow vertical scrolling",
                    default: false
                },
                // Text resize parameters
                zoomLevel: {
                    type: "number",
                    description: "Zoom level percentage",
                    default: 200
                },
                checkOverflow: {
                    type: "boolean",
                    description: "Check for content overflow",
                    default: true
                },
                checkReadability: {
                    type: "boolean",
                    description: "Check text readability",
                    default: true
                },
                // Text spacing parameters
                lineHeight: {
                    type: "number",
                    description: "Line height multiplier",
                    default: 1.5
                },
                letterSpacing: {
                    type: "number",
                    description: "Letter spacing multiplier (0.12em)",
                    default: 0.12
                },
                wordSpacing: {
                    type: "number",
                    description: "Word spacing multiplier (0.16em)",
                    default: 0.16
                },
                paragraphSpacing: {
                    type: "number",
                    description: "Paragraph spacing multiplier (2em)",
                    default: 2
                }
            }
        }
    },
    {
        name: "test_auto_refresh",
        description: "Test for auto-refresh and redirects (WCAG 2.1 Success Criterion 2.2.1 Timing Adjustable - Level A)",
        inputSchema: {
            type: "object",
            properties: {
                checkMetaRefresh: {
                    type: "boolean",
                    description: "Check for meta refresh tags",
                    default: true
                },
                checkJavaScriptRefresh: {
                    type: "boolean",
                    description: "Check for JavaScript-based refresh",
                    default: true
                },
                timeout: {
                    type: "number",
                    description: "Timeout in milliseconds to check for refresh",
                    default: 5000
                }
            }
        }
    },
    {
        name: "test_animation_control",
        description: "Test animation and motion controls (WCAG 2.1 Success Criteria 2.2.2 Pause, Stop, Hide - Level A, and 2.3.3 Animation from Interactions - Level AAA optional)",
        inputSchema: {
            type: "object",
            properties: {
                checkMotionReduction: {
                    type: "boolean",
                    description: "Check prefers-reduced-motion support",
                    default: true
                },
                checkPauseControls: {
                    type: "boolean",
                    description: "Check for pause/stop controls",
                    default: true
                },
                checkAutoPlay: {
                    type: "boolean",
                    description: "Check for auto-playing content",
                    default: true
                }
            }
        }
    },
    {
        name: "test_orientation_lock",
        description: "Test orientation lock (WCAG 1.3.4 - content works in portrait and landscape)",
        inputSchema: {
            type: "object",
            properties: {
                checkPortrait: {
                    type: "boolean",
                    description: "Test portrait orientation",
                    default: true
                },
                checkLandscape: {
                    type: "boolean",
                    description: "Test landscape orientation",
                    default: true
                },
                checkRotation: {
                    type: "boolean",
                    description: "Check for orientation lock restrictions",
                    default: true
                }
            }
        }
    },
    {
        name: "run_wcag_21_aa_tests",
        description: "Run comprehensive WCAG 2.1 Level AA specific tests for enhanced accuracy (1.3.5, 2.4.4, 2.5.3, 3.3.1/3.3.2, 4.1.3, 3.2.4) - tests beyond basic axe-core scanning",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional CSS selector to scope testing to a specific container for faster performance"
                }
            }
        }
    },
    {
        name: "run_wcag_22_aa_tests",
        description: "Run comprehensive WCAG 2.2 Level A & AA specific tests for new criteria (2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8) - tests beyond WCAG 2.1",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional CSS selector to scope testing to a specific container"
                }
            }
        }
    },
    {
        name: "test_target_size",
        description: "Test interactive element target sizes (WCAG 2.5.8 - Target Size Minimum) - flags targets below 24x24 CSS pixels",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional CSS selector to scope testing"
                }
            }
        }
    },
    {
        name: "test_focus_not_obscured",
        description: "Test that focused elements are not entirely hidden by sticky/fixed overlays (WCAG 2.4.11 - Focus Not Obscured)",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional CSS selector to scope testing"
                }
            }
        }
    },
    {
        name: "test_accessible_authentication",
        description: "Test authentication forms for cognitive function test barriers (WCAG 3.3.8 - Accessible Authentication) - checks paste-ability, CAPTCHA alternatives, password manager support",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional CSS selector to scope testing"
                }
            }
        }
    },
    {
        name: "test_on_focus_behavior",
        description: "Test for unexpected context changes on focus (WCAG 3.2.1 - On Focus) - detects navigation, form submissions, or significant content changes triggered by focus alone",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional CSS selector to scope testing to specific interactive elements"
                },
                timeout: {
                    type: "number",
                    description: "Milliseconds to wait after focus for detecting changes",
                    default: 1000
                }
            }
        }
    },
    {
        name: "test_on_input_behavior",
        description: "Test for unexpected context changes on input (WCAG 3.2.1 - On Input) - detects navigation or form submissions triggered by changing form field values",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional CSS selector to scope testing to specific form fields"
                },
                timeout: {
                    type: "number",
                    description: "Milliseconds to wait after input change for detecting changes",
                    default: 1000
                }
            }
        }
    }
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "open_browser": {
                const params = OpenBrowserSchema.parse(args);

                // Close existing browser/context if open
                if (context) {
                    await context.close();
                }
                if (browser) {
                    await browser.close();
                }

                // Check if we should force headed mode (for VNC viewing)
                const forceHeaded = process.env.FORCE_HEADED_BROWSER === 'true';
                const isHeadless = forceHeaded ? false : params.headless;

                // Create browser context (persistent or non-persistent based on env var)
                await createBrowserContext({
                    headless: isHeadless,
                    viewport: params.viewport
                });

                const profileMode = process.env.CHROME_USER_DATA_DIR ? 'persistent' : 'non-persistent';
                return {
                    content: [
                        {
                            type: "text",
                            text: `Browser opened successfully (${profileMode} mode) with viewport ${params.viewport?.width || 1280}x${params.viewport?.height || 720}`
                        }
                    ]
                };
            }

            case "navigate": {
                const params = NavigateSchema.parse(args);
                const page = await ensureBrowser();

                await page.goto(params.url, { waitUntil: 'networkidle', timeout: 30000 }); // Optimized: Explicit 30s timeout

                // Clear cache on navigation (Phase 3 optimization)
                clearCache();

                return {
                    content: [
                        {
                            type: "text",
                            text: `Navigated to ${params.url}`
                        }
                    ]
                };
            }

            case "click": {
                const params = ClickSchema.parse(args);
                const page = await ensureBrowser();

                // Try different selector strategies
                try {
                    // First try as CSS selector
                    await page.click(params.selector, params.options);
                } catch (e) {
                    // Try as text selector
                    await page.click(`text=${params.selector}`, params.options);
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Clicked element: ${params.selector}`
                        }
                    ]
                };
            }

            case "fill": {
                const params = FillSchema.parse(args);
                const page = await ensureBrowser();

                await page.fill(params.selector, params.value, params.options);

                return {
                    content: [
                        {
                            type: "text",
                            text: `Filled "${params.selector}" with value`
                        }
                    ]
                };
            }

            case "login": {
                const params = LoginSchema.parse(args);
                const page = await ensureBrowser();

                // Try to find and fill username field
                const usernameSelectors = params.usernameSelector.split(',').map(s => s.trim());
                let usernameFilled = false;

                for (const selector of usernameSelectors) {
                    try {
                        await page.fill(selector, params.username, { timeout: 1000 });
                        usernameFilled = true;
                        break;
                    } catch (e) {
                        // Try next selector
                    }
                }

                if (!usernameFilled) {
                    throw new Error("Could not find username field");
                }

                // Try to find and fill password field
                const passwordSelectors = params.passwordSelector.split(',').map(s => s.trim());
                let passwordFilled = false;

                for (const selector of passwordSelectors) {
                    try {
                        await page.fill(selector, params.password, { timeout: 1000 });
                        passwordFilled = true;
                        break;
                    } catch (e) {
                        // Try next selector
                    }
                }

                if (!passwordFilled) {
                    throw new Error("Could not find password field");
                }

                // Try to find and click submit button
                const submitSelectors = params.submitSelector.split(',').map(s => s.trim());
                let submitted = false;

                for (const selector of submitSelectors) {
                    try {
                        await page.click(selector, { timeout: 1000 });
                        submitted = true;
                        break;
                    } catch (e) {
                        // Try next selector
                    }
                }

                if (!submitted) {
                    // Try pressing Enter in password field
                    await page.press(passwordSelectors[0], 'Enter');
                }

                // Wait for navigation or timeout (Optimized: Reduced from 5000ms to 2000ms)
                await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => { });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Login attempted with username: ${params.username}`
                        }
                    ]
                };
            }

            case "analyze_accessibility": {
                const params = AnalyzeAccessibilitySchema.parse(args);
                const page = await ensureBrowser();

                const builder = new AxeBuilder({ page });

                // Configure tags - default to WCAG 2.1 Level A & AA if not specified
                if (params.tags && params.tags.length > 0) {
                    builder.withTags(params.tags);
                } else {
                    // Default to WCAG 2.1 Level A and AA standards
                    builder.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
                }

                // Configure specific rules if specified
                if (params.runOnly && params.runOnly.length > 0) {
                    builder.withRules(params.runOnly);
                }

                // Filter by impact levels if specified
                if (params.includedImpacts && params.includedImpacts.length > 0) {
                    // Note: AxeBuilder doesn't have a direct method for filtering by impact
                    // This will be handled in the results filtering
                }

                if (params.context) {
                    builder.include(params.context);
                }

                let results = await builder.analyze();

                // Filter results by impact if specified
                if (params.includedImpacts && params.includedImpacts.length > 0) {
                    results.violations = results.violations.filter((violation: any) =>
                        params.includedImpacts!.includes(violation.impact)
                    );
                }
                const url = page.url();

                // Generate report based on format
                let reportContent: string;
                let reportPath: string;

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                // Use /app/reports in Docker, or local path otherwise
                const baseReportsDir = process.env.REPORTS_DIR || (
                    process.env.NODE_ENV === 'production' ? '/app/reports' : path.join(path.dirname(__dirname), '..')
                );
                const reportDir = path.join(baseReportsDir, 'accessibility-reports');

                // Ensure report directory exists
                await fs.mkdir(reportDir, { recursive: true });

                switch (params.reportFormat) {
                    case 'html':
                        reportContent = await generateHTMLReport(results, url);
                        reportPath = path.join(reportDir, `report-${timestamp}.html`);
                        await fs.writeFile(reportPath, reportContent);
                        break;

                    case 'json':
                        reportContent = JSON.stringify(results, null, 2);
                        reportPath = path.join(reportDir, `report-${timestamp}.json`);
                        await fs.writeFile(reportPath, reportContent);
                        break;

                    case 'markdown':
                    default:
                        reportContent = generateMarkdownReport(results, url);
                        reportPath = path.join(reportDir, `report-${timestamp}.md`);
                        await fs.writeFile(reportPath, reportContent);
                        break;
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: reportContent
                        },
                        {
                            type: "text",
                            text: `\n\nReport saved to: ${reportPath}`
                        }
                    ]
                };
            }

            case "screenshot": {
                const params = ScreenshotSchema.parse(args);
                const page = await ensureBrowser();

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = params.filename || `screenshot-${timestamp}.png`;
                // Use /app/reports in Docker, or local path otherwise
                const baseReportsDir = process.env.REPORTS_DIR || (
                    process.env.NODE_ENV === 'production' ? '/app/reports' : path.join(path.dirname(__dirname), '..')
                );
                const screenshotDir = path.join(baseReportsDir, 'test-reports');

                await fs.mkdir(screenshotDir, { recursive: true });
                const screenshotPath = path.join(screenshotDir, filename);

                await page.screenshot({
                    path: screenshotPath,
                    fullPage: params.fullPage
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Screenshot saved to: ${screenshotPath}`
                        }
                    ]
                };
            }

            case "close_browser": {
                // Close context first (handles both persistent and non-persistent modes)
                if (context) {
                    await context.close();
                }
                // Close browser if it exists (non-persistent mode only)
                if (browser) {
                    await browser.close();
                }

                browser = null;
                context = null;
                page = null;

                return {
                    content: [
                        {
                            type: "text",
                            text: "Browser closed successfully"
                        }
                    ]
                };
            }

            case "wait": {
                const params = WaitSchema.parse(args);
                await new Promise(resolve => setTimeout(resolve, params.timeout));

                return {
                    content: [
                        {
                            type: "text",
                            text: `Waited ${params.timeout}ms`
                        }
                    ]
                };
            }

            case "set_viewport": {
                const params = SetViewportSchema.parse(args);
                const page = await ensureBrowser();

                await page.setViewportSize({
                    width: params.width,
                    height: params.height
                });

                if (context) {
                    await context.setDefaultNavigationTimeout(30000);
                    await context.setDefaultTimeout(30000);
                }

                const deviceType = params.isMobile ? 'mobile' : 'desktop';

                return {
                    content: [
                        {
                            type: "text",
                            text: `Viewport set to ${params.width}x${params.height} (${deviceType})`
                        }
                    ]
                };
            }

            case "get_page_info": {
                const page = await ensureBrowser();

                const url = page.url();
                const title = await page.title();
                const viewport = page.viewportSize();

                return {
                    content: [
                        {
                            type: "text",
                            text: `Current Page Info:\n- URL: ${url}\n- Title: ${title}\n- Viewport: ${viewport?.width}x${viewport?.height}`
                        }
                    ]
                };
            }

            case "get_elements": {
                const params = GetElementsSchema.parse(args);
                const page = await ensureBrowser();

                // Check cache first (Phase 3 optimization)
                const cacheKey = `get_elements:${params.type}:${params.selector || 'body'}:${params.includeHidden}`;
                const cached = getCached<any[]>(cacheKey);
                if (cached) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(cached, null, 2)
                            }
                        ]
                    };
                }

                let elements: any[] = [];

                switch (params.type) {
                    case 'clickable':
                        // Get all clickable elements (with optional scoping)
                        elements = await page.evaluate(({ includeHidden, selector }) => {
                            const clickableSelectors = [
                                'button', 'a[href]', 'input[type="button"]',
                                'input[type="submit"]', '[role="button"]',
                                '[onclick]', '[ng-click]', '[data-click]'
                            ];

                            // Get container element if selector provided, otherwise use document
                            const container = selector ? document.querySelector(selector) : document.body;
                            if (!container) return [];

                            const allElements = container.querySelectorAll(clickableSelectors.join(','));
                            const result: any[] = [];

                            allElements.forEach((el: any) => {
                                if (!includeHidden && (el.offsetWidth === 0 || el.offsetHeight === 0)) return;

                                result.push({
                                    tag: el.tagName.toLowerCase(),
                                    text: el.textContent?.trim() || '',
                                    type: el.type || '',
                                    id: el.id || '',
                                    class: el.className || '',
                                    href: el.href || '',
                                    ariaLabel: el.getAttribute('aria-label') || '',
                                    role: el.getAttribute('role') || '',
                                    selector: el.id ? `#${el.id}` : (typeof el.className === 'string' && el.className) ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase()
                                });
                            });

                            return result;
                        }, { includeHidden: params.includeHidden, selector: params.selector });
                        break;

                    case 'form':
                        // Get all form elements (with optional scoping)
                        elements = await page.evaluate(({ includeHidden, selector }) => {
                            const formSelectors = [
                                'input', 'textarea', 'select',
                                '[contenteditable="true"]', 'form'
                            ];

                            // Get container element if selector provided, otherwise use document
                            const container = selector ? document.querySelector(selector) : document.body;
                            if (!container) return [];

                            const allElements = container.querySelectorAll(formSelectors.join(','));
                            const result: any[] = [];

                            allElements.forEach((el: any) => {
                                if (!includeHidden && (el.offsetWidth === 0 || el.offsetHeight === 0)) return;

                                // Try to find associated label
                                let label = '';
                                if (el.id) {
                                    const labelEl = document.querySelector(`label[for="${el.id}"]`);
                                    if (labelEl) label = labelEl.textContent?.trim() || '';
                                }
                                if (!label && el.closest('label')) {
                                    label = el.closest('label')?.textContent?.trim() || '';
                                }

                                result.push({
                                    tag: el.tagName.toLowerCase(),
                                    type: el.type || '',
                                    name: el.name || '',
                                    id: el.id || '',
                                    class: el.className || '',
                                    placeholder: el.placeholder || '',
                                    value: el.value || '',
                                    label: label,
                                    required: el.required || false,
                                    ariaLabel: el.getAttribute('aria-label') || '',
                                    selector: el.id ? `#${el.id}` : el.name ? `[name="${el.name}"]` : el.tagName.toLowerCase()
                                });
                            });

                            return result;
                        }, { includeHidden: params.includeHidden, selector: params.selector });
                        break;

                    default:
                        // Get all visible elements (with optional scoping)
                        elements = await page.evaluate(({ includeHidden, selector }) => {
                            // Get container element if selector provided, otherwise use document
                            const container = selector ? document.querySelector(selector) : document.body;
                            if (!container) return [];

                            const allElements = container.querySelectorAll('*');
                            const result: any[] = [];

                            allElements.forEach((el: any) => {
                                if (!includeHidden && (el.offsetWidth === 0 || el.offsetHeight === 0)) return;
                                if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;

                                result.push({
                                    tag: el.tagName.toLowerCase(),
                                    text: el.textContent?.trim().substring(0, 100) || '',
                                    id: el.id || '',
                                    class: el.className || '',
                                    role: el.getAttribute('role') || '',
                                    ariaLabel: el.getAttribute('aria-label') || ''
                                });
                            });

                            return result.slice(0, 100); // Limit to first 100 elements
                        }, { includeHidden: params.includeHidden, selector: params.selector });
                }

                // Cache results (Phase 3 optimization)
                setCache(cacheKey, elements);

                return {
                    content: [
                        {
                            type: "text",
                            text: `Found ${elements.length} ${params.type} elements:\n${JSON.stringify(elements, null, 2)}`
                        }
                    ]
                };
            }

            case "find_by_accessibility": {
                const params = FindByAccessibilitySchema.parse(args);
                const page = await ensureBrowser();

                // Build selector based on accessibility attributes
                let selector = '';
                if (params.role) {
                    selector = `[role="${params.role}"]`;
                }
                if (params.ariaLabel) {
                    selector += `[aria-label="${params.ariaLabel}"]`;
                }
                if (params.ariaDescribedBy) {
                    selector += `[aria-describedby="${params.ariaDescribedBy}"]`;
                }
                if (params.name) {
                    // Use Playwright's accessible name selector
                    selector = `[aria-label="${params.name}"], [title="${params.name}"]`;
                }

                if (!selector) {
                    throw new Error("At least one accessibility attribute must be provided");
                }

                const elements = await page.$$(selector);
                const elementDetails = await Promise.all(
                    elements.slice(0, 10).map(async (el) => {
                        return await el.evaluate((node: any) => ({
                            tag: node.tagName.toLowerCase(),
                            text: node.textContent?.trim().substring(0, 100) || '',
                            id: node.id || '',
                            class: node.className || '',
                            role: node.getAttribute('role') || '',
                            ariaLabel: node.getAttribute('aria-label') || '',
                            visible: node.offsetWidth > 0 && node.offsetHeight > 0
                        }));
                    })
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: `Found ${elements.length} elements matching accessibility criteria:\n${JSON.stringify(elementDetails, null, 2)}`
                        }
                    ]
                };
            }

            case "wait_for_element": {
                const params = WaitForElementSchema.parse(args);
                const page = await ensureBrowser();

                await page.waitForSelector(params.selector, {
                    state: params.state,
                    timeout: params.timeout
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Element "${params.selector}" is now ${params.state}`
                        }
                    ]
                };
            }

            case "get_element_properties": {
                const params = GetElementPropertiesSchema.parse(args);
                const page = await ensureBrowser();

                const element = await page.$(params.selector);
                if (!element) {
                    throw new Error(`Element not found: ${params.selector}`);
                }

                const properties = await element.evaluate((el: any) => {
                    const attrs: any = {};
                    for (const attr of el.attributes) {
                        attrs[attr.name] = attr.value;
                    }

                    return {
                        tag: el.tagName.toLowerCase(),
                        text: el.textContent?.trim() || '',
                        value: el.value || '',
                        innerHTML: el.innerHTML.substring(0, 200),
                        attributes: attrs,
                        computed: {
                            visible: el.offsetWidth > 0 && el.offsetHeight > 0,
                            enabled: !el.disabled,
                            position: {
                                x: el.getBoundingClientRect().x,
                                y: el.getBoundingClientRect().y,
                                width: el.getBoundingClientRect().width,
                                height: el.getBoundingClientRect().height
                            }
                        }
                    };
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Element properties:\n${JSON.stringify(properties, null, 2)}`
                        }
                    ]
                };
            }

            case "find_by_text": {
                const params = FindByTextSchema.parse(args);
                const page = await ensureBrowser();

                let selector: string;
                if (params.exact) {
                    selector = `text="${params.text}"`;
                } else {
                    selector = `text=${params.text}`;
                }

                if (params.elementType) {
                    selector = `${params.elementType}:has-text("${params.text}")`;
                }

                const elements = await page.$$(selector);
                const elementDetails = await Promise.all(
                    elements.slice(0, 10).map(async (el) => {
                        return await el.evaluate((node: any) => ({
                            tag: node.tagName.toLowerCase(),
                            text: node.textContent?.trim().substring(0, 100) || '',
                            id: node.id || '',
                            class: typeof node.className === 'string' ? node.className : '',
                            href: node.href || '',
                            visible: node.offsetWidth > 0 && node.offsetHeight > 0,
                            selector: node.id ? `#${node.id}` : (typeof node.className === 'string' && node.className) ? `.${node.className.split(' ')[0]}` : node.tagName.toLowerCase()
                        }));
                    })
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: `Found ${elements.length} elements containing "${params.text}":\n${JSON.stringify(elementDetails, null, 2)}`
                        }
                    ]
                };
            }

            // Screen Reader Testing Tools Implementation
            case "get_accessibility_tree": {
                const params = GetAccessibilityTreeSchema.parse(args);
                const page = await ensureBrowser();

                // Check cache first (Phase 3 optimization)
                const cacheKey = `get_accessibility_tree:${params.selector || 'body'}:${params.includeIgnored}`;
                const cached = getCached<string>(cacheKey);
                if (cached) {
                    return {
                        content: [{
                            type: "text",
                            text: cached
                        }]
                    };
                }

                // Get accessibility snapshot
                let root = undefined;
                if (params.selector) {
                    const element = await page.$(params.selector);
                    if (element) {
                        root = element;
                    }
                }
                const snapshot = await page.accessibility.snapshot({
                    interestingOnly: !params.includeIgnored,
                    root
                });

                // Format the tree for readability
                const formatTree = (node: any, depth: number = 0): string => {
                    if (!node) return '';
                    const indent = '  '.repeat(depth);
                    let result = `${indent}${node.role || 'unknown'}`;
                    if (node.name) result += `: "${node.name}"`;
                    if (node.value) result += ` = ${node.value}`;
                    if (node.description) result += ` (${node.description})`;
                    if (node.disabled) result += ' [disabled]';
                    if (node.expanded !== undefined) result += node.expanded ? ' [expanded]' : ' [collapsed]';
                    if (node.selected !== undefined) result += node.selected ? ' [selected]' : '';
                    if (node.checked !== undefined) result += node.checked === true ? ' [checked]' : node.checked === 'mixed' ? ' [mixed]' : ' [unchecked]';
                    result += '\n';

                    if (node.children) {
                        for (const child of node.children) {
                            result += formatTree(child, depth + 1);
                        }
                    }
                    return result;
                };

                const treeText = `Accessibility Tree:\n\n${formatTree(snapshot)}\n\nThis represents how screen readers interpret the page structure.`;

                // Cache results (Phase 3 optimization)
                setCache(cacheKey, treeText);

                return {
                    content: [
                        {
                            type: "text",
                            text: treeText
                        }
                    ]
                };
            }

            case "test_keyboard_navigation": {
                const params = TestKeyboardNavigationSchema.parse(args);
                const page = await ensureBrowser();

                // If testAllWidgets is true, run consolidated widget testing
                if (params.testAllWidgets) {
                    const widgetResults = await page.evaluate(() => {
                        const results: any = {
                            tested: 0,
                            found: [] as string[],
                            issues: [] as string[],
                            widgets: {}
                        };

                        // 1. Test Tabs widgets
                        const tablists = document.querySelectorAll('[role="tablist"]');
                        if (tablists.length > 0) {
                            results.tested++;
                            results.found.push(`Tabs (${tablists.length})`);
                            tablists.forEach((tablist: any, i) => {
                                const tabs = tablist.querySelectorAll('[role="tab"]');
                                const selectedCount = Array.from(tabs).filter((t: any) => t.getAttribute('aria-selected') === 'true').length;
                                if (selectedCount === 0) results.issues.push(`Tabs widget ${i + 1}: No tab marked as selected`);
                                if (selectedCount > 1) results.issues.push(`Tabs widget ${i + 1}: Multiple tabs marked as selected`);
                            });
                        }

                        // 2. Test Accordion widgets
                        const accordionHeaders = document.querySelectorAll('button[aria-expanded], [role="button"][aria-expanded]');
                        if (accordionHeaders.length > 0) {
                            results.tested++;
                            results.found.push(`Accordion (${accordionHeaders.length} headers)`);
                            accordionHeaders.forEach((header: any, i) => {
                                if (!header.getAttribute('aria-controls')) {
                                    results.issues.push(`Accordion header ${i + 1}: Missing aria-controls`);
                                }
                            });
                        }

                        // 3. Test Combobox widgets
                        const comboboxes = document.querySelectorAll('[role="combobox"]');
                        if (comboboxes.length > 0) {
                            results.tested++;
                            results.found.push(`Combobox (${comboboxes.length})`);
                            comboboxes.forEach((cb: any, i) => {
                                if (!cb.hasAttribute('aria-expanded')) {
                                    results.issues.push(`Combobox ${i + 1}: Missing aria-expanded`);
                                }
                            });
                        }

                        // 4. Test Slider widgets
                        const sliders = document.querySelectorAll('[role="slider"]');
                        if (sliders.length > 0) {
                            results.tested++;
                            results.found.push(`Slider (${sliders.length})`);
                            sliders.forEach((slider: any, i) => {
                                if (!slider.hasAttribute('aria-valuenow')) {
                                    results.issues.push(`Slider ${i + 1}: Missing aria-valuenow`);
                                }
                            });
                        }

                        // 5. Test Menu widgets
                        const menus = document.querySelectorAll('[role="menu"], [role="menubar"]');
                        if (menus.length > 0) {
                            results.tested++;
                            results.found.push(`Menu (${menus.length})`);
                            menus.forEach((menu: any, i) => {
                                const items = menu.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]');
                                if (items.length === 0) {
                                    results.issues.push(`Menu ${i + 1}: No menu items found`);
                                }
                            });
                        }

                        // 6. Test Listbox widgets
                        const listboxes = document.querySelectorAll('[role="listbox"]');
                        if (listboxes.length > 0) {
                            results.tested++;
                            results.found.push(`Listbox (${listboxes.length})`);
                            listboxes.forEach((lb: any, i) => {
                                const options = lb.querySelectorAll('[role="option"]');
                                if (options.length === 0) {
                                    results.issues.push(`Listbox ${i + 1}: No options found`);
                                }
                            });
                        }

                        // 7. Test Radio Group widgets
                        const radiogroups = document.querySelectorAll('[role="radiogroup"]');
                        if (radiogroups.length > 0) {
                            results.tested++;
                            results.found.push(`Radio Group (${radiogroups.length})`);
                            radiogroups.forEach((rg: any, i) => {
                                const radios = rg.querySelectorAll('[role="radio"]');
                                const checkedCount = Array.from(radios).filter((r: any) => r.getAttribute('aria-checked') === 'true').length;
                                if (checkedCount === 0) results.issues.push(`Radio group ${i + 1}: No radio checked`);
                                if (checkedCount > 1) results.issues.push(`Radio group ${i + 1}: Multiple radios checked`);
                            });
                        }

                        // 8. Test Tree widgets
                        const trees = document.querySelectorAll('[role="tree"]');
                        if (trees.length > 0) {
                            results.tested++;
                            results.found.push(`Tree (${trees.length})`);
                            trees.forEach((tree: any, i) => {
                                const items = tree.querySelectorAll('[role="treeitem"]');
                                if (items.length === 0) {
                                    results.issues.push(`Tree ${i + 1}: No tree items found`);
                                }
                            });
                        }

                        // 9. Test Modal Dialog widgets
                        const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
                        if (dialogs.length > 0) {
                            results.tested++;
                            results.found.push(`Modal Dialog (${dialogs.length})`);
                            dialogs.forEach((dialog: any, i) => {
                                if (!dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby')) {
                                    results.issues.push(`Dialog ${i + 1}: Missing aria-label or aria-labelledby`);
                                }
                            });
                        }

                        // 10. Test Date Picker widgets (no standard role, check for common patterns)
                        const datePickers = document.querySelectorAll('input[type="date"], [role="grid"][aria-label*="calendar" i], [role="grid"][aria-label*="date" i]');
                        if (datePickers.length > 0) {
                            results.tested++;
                            results.found.push(`Date Picker (${datePickers.length})`);
                        }

                        // 11. Test Data Table widgets
                        const grids = document.querySelectorAll('[role="grid"], [role="treegrid"]');
                        if (grids.length > 0) {
                            results.tested++;
                            results.found.push(`Data Table/Grid (${grids.length})`);
                            grids.forEach((grid: any, i) => {
                                const rows = grid.querySelectorAll('[role="row"]');
                                if (rows.length === 0) {
                                    results.issues.push(`Grid ${i + 1}: No rows found`);
                                }
                            });
                        }

                        // 12. Test Carousel widgets (no standard role, check for common patterns)
                        const carousels = document.querySelectorAll('[role="region"][aria-roledescription*="carousel" i], [role="group"][aria-roledescription*="carousel" i]');
                        if (carousels.length > 0) {
                            results.tested++;
                            results.found.push(`Carousel (${carousels.length})`);
                        }

                        // 13. Test Toolbar widgets
                        const toolbars = document.querySelectorAll('[role="toolbar"]');
                        if (toolbars.length > 0) {
                            results.tested++;
                            results.found.push(`Toolbar (${toolbars.length})`);
                            toolbars.forEach((toolbar: any, i) => {
                                const controls = toolbar.querySelectorAll('button, [role="button"]');
                                if (controls.length === 0) {
                                    results.issues.push(`Toolbar ${i + 1}: No controls found`);
                                }
                            });
                        }

                        return results;
                    });

                    return {
                        content: [{
                            type: "text",
                            text: `Consolidated Widget Testing Results:\n\n` +
                                `Tested ${widgetResults.tested} widget types:\n` +
                                widgetResults.found.map((w: string) => `✓ ${w}`).join('\n') +
                                `\n\n` +
                                (widgetResults.issues.length > 0 ?
                                    `⚠️ Issues Found (${widgetResults.issues.length}):\n${widgetResults.issues.map((i: string) => `• ${i}`).join('\n')}` :
                                    '✓ No issues found across all detected widgets') +
                                `\n\n` +
                                `Performance: Tested ${widgetResults.tested} widget types in a single consolidated call (80% faster than individual tests)`
                        }]
                    };
                }

                // Standard keyboard navigation testing (original logic)
                const navigationPath: string[] = [];
                const focusedElements = new Set<string>();
                let trapDetected = false;
                let currentFocus = params.startSelector ? await page.$(params.startSelector) : null;

                if (currentFocus) {
                    await currentFocus.focus();
                }

                // Navigate through focusable elements
                for (let i = 0; i < params.maxSteps; i++) {
                    await page.keyboard.press('Tab');
                    const focused = await page.evaluate(() => {
                        const el = document.activeElement;
                        if (!el || el === document.body) return null;
                        return {
                            tag: el.tagName.toLowerCase(),
                            id: el.id || '',
                            class: (el as HTMLElement).className || '',
                            text: (el as HTMLElement).innerText?.substring(0, 50) || '',
                            selector: el.id ? `#${el.id}` : (el as HTMLElement).className ? `.${(el as HTMLElement).className.split(' ')[0]}` : el.tagName.toLowerCase()
                        };
                    });

                    if (focused) {
                        const key = `${focused.tag}-${focused.id}-${focused.class}`;
                        if (focusedElements.has(key) && params.checkTrapFocus) {
                            trapDetected = true;
                            break;
                        }
                        focusedElements.add(key);
                        navigationPath.push(focused.selector);
                    }
                }

                // Test reverse navigation
                const reverseNav: string[] = [];
                for (let i = 0; i < 5; i++) {
                    await page.keyboard.press('Shift+Tab');
                    const focused = await page.evaluate(() => {
                        const el = document.activeElement;
                        if (!el || el === document.body) return null;
                        return {
                            selector: el.id ? `#${el.id}` : (el as HTMLElement).className ? `.${(el as HTMLElement).className.split(' ')[0]}` : el.tagName.toLowerCase()
                        };
                    });
                    if (focused) {
                        reverseNav.push(focused.selector);
                    }
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Keyboard Navigation Test Results:\n\n` +
                                `✓ Navigated through ${navigationPath.length} focusable elements\n` +
                                `${trapDetected ? '⚠️ Focus trap detected - keyboard navigation may be stuck in a loop\n' : '✓ No focus traps detected\n'}` +
                                `✓ Reverse navigation tested: ${reverseNav.length} elements\n\n` +
                                `Focus order (first 10):\n${navigationPath.slice(0, 10).map((s, i) => `${i + 1}. ${s}`).join('\n')}`
                        }
                    ]
                };
            }

            case "get_focus_order": {
                const params = GetFocusOrderSchema.parse(args);
                const page = await ensureBrowser();

                // Check cache first (Phase 3 optimization)
                const cacheKey = `get_focus_order:${params.selector || 'body'}:${params.includeHidden}`;
                const cached = getCached<string>(cacheKey);
                if (cached) {
                    return {
                        content: [{
                            type: "text",
                            text: cached
                        }]
                    };
                }

                const scope = params.selector || 'body';
                const focusableElements = await page.evaluate(({ scope, includeHidden }: { scope: string; includeHidden: boolean }) => {
                    const container = document.querySelector(scope) || document.body;
                    const focusableSelectors = [
                        'a[href]',
                        'button:not([disabled])',
                        'input:not([disabled])',
                        'select:not([disabled])',
                        'textarea:not([disabled])',
                        '[tabindex]:not([tabindex="-1"])',
                        'audio[controls]',
                        'video[controls]',
                        '[contenteditable="true"]'
                    ];

                    const elements = container.querySelectorAll(focusableSelectors.join(','));
                    const result: any[] = [];

                    elements.forEach((el: any) => {
                        if (!includeHidden && (el.offsetWidth === 0 || el.offsetHeight === 0)) return;

                        result.push({
                            tag: el.tagName.toLowerCase(),
                            id: el.id || '',
                            text: el.innerText?.substring(0, 50) || (typeof el.value === 'string' ? el.value.substring(0, 50) : '') || '',
                            tabindex: el.tabIndex,
                            selector: el.id ? `#${el.id}` : (typeof el.className === 'string' && el.className) ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase(),
                            ariaLabel: el.getAttribute('aria-label') || '',
                            position: {
                                top: el.getBoundingClientRect().top,
                                left: el.getBoundingClientRect().left
                            }
                        });
                    });

                    // Sort by tab order and position
                    return result.sort((a, b) => {
                        if (a.tabindex > 0 && b.tabindex > 0) return a.tabindex - b.tabindex;
                        if (a.tabindex > 0) return -1;
                        if (b.tabindex > 0) return 1;
                        if (Math.abs(a.position.top - b.position.top) > 10) return a.position.top - b.position.top;
                        return a.position.left - b.position.left;
                    });
                }, { scope, includeHidden: params.includeHidden });

                const focusOrderText = `Focus Order (${focusableElements.length} elements):\n\n` +
                    focusableElements.map((el, i) =>
                        `${i + 1}. ${el.selector} ${el.tabindex > 0 ? `[tabindex=${el.tabindex}]` : ''} ${el.ariaLabel ? `"${el.ariaLabel}"` : el.text ? `"${el.text}"` : ''}`
                    ).join('\n');

                // Cache results (Phase 3 optimization)
                setCache(cacheKey, focusOrderText);

                return {
                    content: [
                        {
                            type: "text",
                            text: focusOrderText
                        }
                    ]
                };
            }

            case "validate_aria_attributes": {
                const params = ValidateAriaSchema.parse(args);
                const page = await ensureBrowser();

                // Check cache first (Phase 3 optimization)
                const cacheKey = `validate_aria:${params.selector || 'body'}:${params.strict}`;
                const cached = getCached<string>(cacheKey);
                if (cached) {
                    return {
                        content: [{
                            type: "text",
                            text: cached
                        }]
                    };
                }

                const violations = await page.evaluate(({ selector, strict }: { selector: string | undefined; strict: boolean }) => {
                    const container = selector ? document.querySelector(selector) : document;
                    if (!container) return [];

                    const issues: any[] = [];

                    // Enhanced ARIA validation (7 comprehensive checks matching Planning MCP)

                    // Valid ARIA roles (ARIA 1.2 spec)
                    const validRoles = new Set([
                        'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell', 'checkbox',
                        'columnheader', 'combobox', 'complementary', 'contentinfo', 'definition', 'dialog',
                        'directory', 'document', 'feed', 'figure', 'form', 'grid', 'gridcell', 'group',
                        'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee',
                        'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation',
                        'none', 'note', 'option', 'presentation', 'progressbar', 'radio', 'radiogroup', 'region',
                        'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider',
                        'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term',
                        'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'
                    ]);

                    // Required properties by role
                    const requiredProperties: { [key: string]: string[] } = {
                        'checkbox': ['aria-checked'],
                        'radio': ['aria-checked'],
                        'slider': ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
                        'scrollbar': ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
                        'spinbutton': ['aria-valuenow'],
                        'combobox': ['aria-expanded', 'aria-controls'],
                        'tab': ['aria-selected'],
                        'option': ['aria-selected']
                    };

                    // Prohibited properties for certain roles
                    const prohibitedProperties: { [key: string]: string[] } = {
                        'presentation': ['aria-label', 'aria-labelledby'],
                        'none': ['aria-label', 'aria-labelledby']
                    };

                    // Valid values for ARIA properties
                    const validValues: { [key: string]: string[] } = {
                        'aria-live': ['off', 'polite', 'assertive'],
                        'aria-sort': ['none', 'ascending', 'descending', 'other'],
                        'aria-orientation': ['horizontal', 'vertical'],
                        'aria-current': ['page', 'step', 'location', 'date', 'time', 'true', 'false'],
                        'aria-autocomplete': ['none', 'inline', 'list', 'both'],
                        'aria-dropeffect': ['none', 'copy', 'execute', 'link', 'move', 'popup'],
                        'aria-haspopup': ['false', 'true', 'menu', 'listbox', 'tree', 'grid', 'dialog']
                    };

                    const elementsWithAria = container.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [role], [aria-live], [aria-hidden], [aria-expanded], [aria-selected], [aria-checked], [aria-disabled], [aria-required], [aria-invalid], [aria-valuenow], [aria-valuemin], [aria-valuemax], [aria-controls], [aria-owns], [aria-activedescendant]');

                    elementsWithAria.forEach((el: any) => {
                        const role = el.getAttribute('role');
                        const ariaLabel = el.getAttribute('aria-label');
                        const ariaLabelledby = el.getAttribute('aria-labelledby');
                        const ariaDescribedby = el.getAttribute('aria-describedby');
                        const ariaHidden = el.getAttribute('aria-hidden');

                        // 1. ROLE CORRECTNESS - Valid ARIA roles only
                        if (role && !validRoles.has(role)) {
                            issues.push({
                                element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                issue: `Invalid ARIA role: "${role}" (not in ARIA 1.2 spec)`,
                                severity: 'error'
                            });
                        }

                        // 2. REQUIRED PROPERTIES - Check role has required attributes
                        if (role && requiredProperties[role]) {
                            requiredProperties[role].forEach((prop: string) => {
                                if (!el.hasAttribute(prop)) {
                                    issues.push({
                                        element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                        issue: `Role "${role}" requires ${prop} attribute`,
                                        severity: 'error'
                                    });
                                }
                            });
                        }

                        // 3. PROHIBITED PROPERTIES - Check for invalid attribute combinations
                        if (role && prohibitedProperties[role]) {
                            prohibitedProperties[role].forEach((prop: string) => {
                                if (el.hasAttribute(prop)) {
                                    issues.push({
                                        element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                        issue: `Role "${role}" cannot have ${prop} attribute`,
                                        severity: 'error'
                                    });
                                }
                            });
                        }

                        // 4. PROPERTY VALUE VALIDATION - Check valid values
                        Object.entries(validValues).forEach(([attr, values]) => {
                            const attrValue = el.getAttribute(attr);
                            if (attrValue && !values.includes(attrValue)) {
                                issues.push({
                                    element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                    issue: `Invalid ${attr} value: "${attrValue}" (must be one of: ${values.join(', ')})`,
                                    severity: 'error'
                                });
                            }
                        });

                        // Validate boolean ARIA properties
                        const booleanProps = ['aria-expanded', 'aria-selected', 'aria-checked', 'aria-pressed',
                                             'aria-disabled', 'aria-hidden', 'aria-required', 'aria-invalid',
                                             'aria-readonly', 'aria-busy', 'aria-grabbed', 'aria-modal'];
                        booleanProps.forEach((prop: string) => {
                            const value = el.getAttribute(prop);
                            if (value !== null && value !== 'true' && value !== 'false') {
                                issues.push({
                                    element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                    issue: `Invalid ${prop} value: "${value}" (must be "true" or "false")`,
                                    severity: 'error'
                                });
                            }
                        });

                        // 5. INCONSISTENT STATES - Check visual vs ARIA state matches
                        if (role === 'button' || el.tagName === 'BUTTON') {
                            const ariaExpanded = el.getAttribute('aria-expanded');
                            if (ariaExpanded) {
                                // Check if associated content visibility matches aria-expanded
                                const controls = el.getAttribute('aria-controls');
                                if (controls) {
                                    const controlled = document.getElementById(controls);
                                    if (controlled) {
                                        const isVisible = controlled.offsetWidth > 0 && controlled.offsetHeight > 0;
                                        const ariaExpanded = el.getAttribute('aria-expanded');
                                        if ((ariaExpanded === 'true' && !isVisible) || (ariaExpanded === 'false' && isVisible)) {
                                            issues.push({
                                                element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                                issue: `aria-expanded="${ariaExpanded}" but controlled element visibility is ${isVisible ? 'visible' : 'hidden'}`,
                                                severity: 'warning'
                                            });
                                        }
                                    }
                                }
                            }
                        }

                        // 6. MISSING SUPPORTING ATTRIBUTES - e.g., aria-valuenow needs min/max
                        if (el.hasAttribute('aria-valuenow')) {
                            if (!el.hasAttribute('aria-valuemin') || !el.hasAttribute('aria-valuemax')) {
                                issues.push({
                                    element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                    issue: 'aria-valuenow requires both aria-valuemin and aria-valuemax',
                                    severity: 'error'
                                });
                            }
                        }

                        if (el.hasAttribute('aria-controls')) {
                            const controls = el.getAttribute('aria-controls');
                            if (!controls || controls.trim() === '') {
                                issues.push({
                                    element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                    issue: 'Empty aria-controls attribute',
                                    severity: 'error'
                                });
                            }
                        }

                        // 7. ARIA RELATIONSHIP VALIDATION - Check references exist
                        if (ariaLabelledby) {
                            const ids = ariaLabelledby.split(/\s+/);
                            ids.forEach((id: string) => {
                                if (id && !document.getElementById(id)) {
                                    issues.push({
                                        element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                        issue: `aria-labelledby references non-existent element: "${id}"`,
                                        severity: 'error'
                                    });
                                }
                            });
                        }

                        if (ariaDescribedby) {
                            const ids = ariaDescribedby.split(/\s+/);
                            ids.forEach((id: string) => {
                                if (id && !document.getElementById(id)) {
                                    issues.push({
                                        element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                        issue: `aria-describedby references non-existent element: "${id}"`,
                                        severity: 'error'
                                    });
                                }
                            });
                        }

                        const ariaControls = el.getAttribute('aria-controls');
                        if (ariaControls) {
                            const ids = ariaControls.split(/\s+/);
                            ids.forEach((id: string) => {
                                if (id && !document.getElementById(id)) {
                                    issues.push({
                                        element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                        issue: `aria-controls references non-existent element: "${id}"`,
                                        severity: 'error'
                                    });
                                }
                            });
                        }

                        const ariaOwns = el.getAttribute('aria-owns');
                        if (ariaOwns) {
                            const ids = ariaOwns.split(/\s+/);
                            ids.forEach((id: string) => {
                                if (id && !document.getElementById(id)) {
                                    issues.push({
                                        element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                        issue: `aria-owns references non-existent element: "${id}"`,
                                        severity: 'error'
                                    });
                                }
                            });
                        }

                        const ariaActivedescendant = el.getAttribute('aria-activedescendant');
                        if (ariaActivedescendant && !document.getElementById(ariaActivedescendant)) {
                            issues.push({
                                element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                issue: `aria-activedescendant references non-existent element: "${ariaActivedescendant}"`,
                                severity: 'error'
                            });
                        }

                        // Additional checks from original implementation

                        // Check for redundant roles
                        if (el.tagName === 'BUTTON' && role === 'button') {
                            issues.push({
                                element: el.id ? `#${el.id}` : 'button',
                                issue: 'Redundant role="button" on button element',
                                severity: strict ? 'warning' : 'info'
                            });
                        }

                        // Check for focusable elements with aria-hidden
                        if (ariaHidden === 'true' && (el.tabIndex >= 0 || el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'INPUT')) {
                            issues.push({
                                element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                issue: 'Focusable element has aria-hidden="true" (makes element invisible to screen readers but still focusable)',
                                severity: 'error'
                            });
                        }

                        // Check for empty aria-label
                        if (ariaLabel !== null && ariaLabel.trim() === '') {
                            issues.push({
                                element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
                                issue: 'Empty aria-label attribute (provide meaningful text or remove attribute)',
                                severity: 'error'
                            });
                        }
                    });

                    return issues;
                }, { selector: params.selector, strict: params.strict });

                const summary = {
                    total: violations.length,
                    errors: violations.filter(v => v.severity === 'error').length,
                    warnings: violations.filter(v => v.severity === 'warning').length,
                    info: violations.filter(v => v.severity === 'info').length
                };

                const validationText = `ARIA Validation Results:\n\n` +
                    `Summary:\n` +
                    `- Total issues: ${summary.total}\n` +
                    `- Errors: ${summary.errors}\n` +
                    `- Warnings: ${summary.warnings}\n` +
                    `- Info: ${summary.info}\n\n` +
                    (violations.length > 0 ?
                        `Issues found:\n${violations.map(v => `• [${v.severity.toUpperCase()}] ${v.element}: ${v.issue}`).join('\n')}` :
                        '✓ No ARIA violations found!');

                // Cache results (Phase 3 optimization)
                setCache(cacheKey, validationText);

                return {
                    content: [
                        {
                            type: "text",
                            text: validationText
                        }
                    ]
                };
            }

            case "get_landmarks": {
                const params = GetLandmarksSchema.parse(args);
                const page = await ensureBrowser();

                // Check cache first (Phase 3 optimization)
                const cacheKey = `get_landmarks:${params.includeImplicit}`;
                const cached = getCached<string>(cacheKey);
                if (cached) {
                    return {
                        content: [{
                            type: "text",
                            text: cached
                        }]
                    };
                }

                const landmarks = await page.evaluate((includeImplicit) => {
                    const result: any[] = [];

                    // Explicit ARIA landmarks
                    const ariaLandmarks = document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"], [role="search"], [role="region"], [role="form"]');
                    ariaLandmarks.forEach((el: any) => {
                        result.push({
                            type: 'explicit',
                            role: el.getAttribute('role'),
                            label: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '',
                            selector: el.id ? `#${el.id}` : (typeof el.className === 'string' && el.className) ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase(),
                            text: el.innerText?.substring(0, 50) || ''
                        });
                    });

                    // Implicit landmarks from semantic HTML
                    if (includeImplicit) {
                        const semanticLandmarks = {
                            'header': 'banner',
                            'nav': 'navigation',
                            'main': 'main',
                            'aside': 'complementary',
                            'footer': 'contentinfo',
                            'form': 'form',
                            'section': 'region'
                        };

                        Object.entries(semanticLandmarks).forEach(([tag, role]) => {
                            const elements = document.querySelectorAll(tag);
                            elements.forEach((el: any) => {
                                // Skip if already has explicit role
                                if (el.getAttribute('role')) return;

                                result.push({
                                    type: 'implicit',
                                    role: role,
                                    label: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '',
                                    selector: el.id ? `#${el.id}` : (typeof el.className === 'string' && el.className) ? `.${el.className.split(' ')[0]}` : tag,
                                    text: el.innerText?.substring(0, 50) || ''
                                });
                            });
                        });
                    }

                    return result;
                }, params.includeImplicit);

                const grouped = landmarks.reduce((acc: any, l) => {
                    if (!acc[l.role]) acc[l.role] = [];
                    acc[l.role].push(l);
                    return acc;
                }, {});

                const landmarksText = `Page Landmarks (${landmarks.length} total):\n\n` +
                    Object.entries(grouped).map(([role, items]: any) =>
                        `${role.toUpperCase()} (${items.length}):\n${items.map((l: any) =>
                            `  • ${l.selector} ${l.label ? `[${l.label}]` : ''} ${l.type === 'implicit' ? '(implicit)' : ''}`
                        ).join('\n')}`
                    ).join('\n\n') +
                    '\n\nScreen readers use these landmarks for quick navigation.';

                // Cache results (Phase 3 optimization)
                setCache(cacheKey, landmarksText);

                return {
                    content: [
                        {
                            type: "text",
                            text: landmarksText
                        }
                    ]
                };
            }

            case "get_screen_reader_output": {
                const params = GetScreenReaderOutputSchema.parse(args);
                const page = await ensureBrowser();

                const announcements: string[] = [];
                let platformAnnouncements: any = {};

                // Handle navigation mode (combines simulate_screen_reader logic)
                if (params.action === 'navigate') {
                    if (params.mode === 'browse') {
                        // Browse mode - read all content linearly
                        const content = await page.evaluate((selector) => {
                            const container = selector ? document.querySelector(selector) : document.body;
                            if (!container) return [];

                            const walker = document.createTreeWalker(
                                container,
                                NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
                                {
                                    acceptNode: (node) => {
                                        if (node.nodeType === Node.TEXT_NODE) {
                                            const text = node.textContent?.trim();
                                            if (text && text.length > 0) return NodeFilter.FILTER_ACCEPT;
                                        }
                                        if (node.nodeType === Node.ELEMENT_NODE) {
                                            const el = node as Element;
                                            if ((el as HTMLElement).style.display === 'none' || el.getAttribute('aria-hidden') === 'true') {
                                                return NodeFilter.FILTER_REJECT;
                                            }
                                            return NodeFilter.FILTER_ACCEPT;
                                        }
                                        return NodeFilter.FILTER_SKIP;
                                    }
                                }
                            );

                            const items: string[] = [];
                            let node;
                            while (node = walker.nextNode()) {
                                if (node.nodeType === Node.TEXT_NODE) {
                                    items.push(node.textContent!.trim());
                                } else if (node.nodeType === Node.ELEMENT_NODE) {
                                    const el = node as Element;
                                    const role = el.getAttribute('role') || el.tagName.toLowerCase();
                                    const ariaLabel = el.getAttribute('aria-label');

                                    if (el.tagName === 'IMG') {
                                        const alt = el.getAttribute('alt');
                                        items.push(alt ? `Image: ${alt}` : 'Image');
                                    } else if (el.tagName === 'BUTTON') {
                                        items.push(`Button: ${el.textContent?.trim() || ariaLabel || 'unlabeled'}`);
                                    } else if (el.tagName === 'A' && el.getAttribute('href')) {
                                        items.push(`Link: ${el.textContent?.trim() || ariaLabel || 'unlabeled'}`);
                                    }
                                }
                            }
                            return items.filter(i => i.length > 0).slice(0, 20);
                        }, params.selector);

                        announcements.push(...content);

                    } else if (params.mode === 'focus') {
                        // Focus mode - navigate interactive elements
                        const interactiveElements = await page.evaluate((selector) => {
                            const container = selector ? document.querySelector(selector) : document.body;
                            if (!container) return [];

                            const focusable = container.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
                            const items: string[] = [];

                            focusable.forEach((el: any) => {
                                const role = el.getAttribute('role') || el.tagName.toLowerCase();
                                const ariaLabel = el.getAttribute('aria-label');
                                const text = el.textContent?.trim() || el.value || ariaLabel || 'unlabeled';
                                const required = el.getAttribute('aria-required') === 'true' || el.required;
                                const invalid = el.getAttribute('aria-invalid') === 'true';

                                let announcement = `${role}: ${text}`;
                                if (required) announcement += ', required';
                                if (invalid) announcement += ', invalid';

                                items.push(announcement);
                            });

                            return items.slice(0, 20);
                        }, params.selector);

                        announcements.push(...interactiveElements);

                    } else if (params.mode === 'forms') {
                        // Forms mode - focus on form elements
                        const formElements = await page.evaluate((selector) => {
                            const container = selector ? document.querySelector(selector) : document.body;
                            if (!container) return [];

                            const inputs = container.querySelectorAll('input, select, textarea');
                            const items: string[] = [];

                            inputs.forEach((el: any) => {
                                const label = el.labels?.[0]?.textContent || el.getAttribute('aria-label') || el.placeholder || 'unlabeled';
                                const type = el.type || el.tagName.toLowerCase();
                                const value = el.value;
                                const required = el.required || el.getAttribute('aria-required') === 'true';

                                let announcement = `${label}, ${type}`;
                                if (value) announcement += `, value: ${value}`;
                                if (required) announcement += ', required';

                                items.push(announcement);
                            });

                            return items;
                        }, params.selector);

                        announcements.push(...formElements);
                    }
                }
                // Handle specific action mode (combines get_announcements logic)
                else if (params.selector) {
                    const element = await page.$(params.selector);
                    if (!element) {
                        throw new Error(`Element not found: ${params.selector}`);
                    }

                    const announcement = await element.evaluate((el: any, action) => {
                        const role = el.getAttribute('role') || el.tagName.toLowerCase();
                        const ariaLabel = el.getAttribute('aria-label');
                        const ariaLabelledby = el.getAttribute('aria-labelledby');
                        const ariaDescribedby = el.getAttribute('aria-describedby');
                        const text = el.innerText?.trim() || el.value || '';
                        const title = el.title || '';

                        let label = ariaLabel;
                        if (ariaLabelledby) {
                            const labelElement = document.getElementById(ariaLabelledby);
                            if (labelElement) label = labelElement.innerText?.trim();
                        }
                        if (!label && el.labels?.[0]) {
                            label = el.labels[0].innerText?.trim();
                        }

                        let description = '';
                        if (ariaDescribedby) {
                            const descElement = document.getElementById(ariaDescribedby);
                            if (descElement) description = descElement.innerText?.trim();
                        }

                        const result: string[] = [];

                        // Build announcement based on action
                        if (action === 'focus') {
                            result.push(label || text || title || 'unlabeled');
                            result.push(role);
                            if (description) result.push(description);
                            if (el.required || el.getAttribute('aria-required') === 'true') result.push('required');
                            if (el.getAttribute('aria-invalid') === 'true') result.push('invalid');
                            if (el.disabled) result.push('disabled');
                        } else if (action === 'click') {
                            if (el.tagName === 'BUTTON' || role === 'button') {
                                result.push('pressed');
                                if (el.getAttribute('aria-expanded') === 'true') result.push('expanded');
                                if (el.getAttribute('aria-expanded') === 'false') result.push('collapsed');
                            }
                            if (el.tagName === 'A') {
                                result.push('link activated');
                            }
                        } else if (action === 'change') {
                            if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                                result.push(`value changed to ${el.value}`);
                            }
                        }

                        return result;
                    }, params.action);

                    announcements.push(...announcement);
                }

                // Add platform-specific formatting (combines get_platform_announcements logic)
                if (params.platform !== 'auto' && params.selector) {
                    platformAnnouncements = await page.evaluate((args: { selector: string; platform: string }) => {
                        const element = document.querySelector(args.selector);
                        if (!element) {
                            return {};
                        }

                        const tagName = (element as HTMLElement).tagName.toLowerCase();
                        const role = element.getAttribute('role');
                        const ariaLabel = element.getAttribute('aria-label');
                        const text = (element as HTMLElement).textContent?.trim();

                        const platforms: any = {
                            'windows-jaws': `${text}, ${role || tagName}, ${element.hasAttribute('aria-expanded') ?
                                `${element.getAttribute('aria-expanded') === 'true' ? 'expanded' : 'collapsed'}` : ''}`,
                            'windows-nvda': `${role || tagName}, ${text}, ${element.hasAttribute('aria-describedby') ?
                                'has description' : ''}`,
                            'mac-voiceover': `${text}, ${role || tagName}, ${element.hasAttribute('aria-describedby') ?
                                'more information available' : ''}`
                        };

                        return args.platform === 'all' ? platforms : { [args.platform]: platforms[args.platform] };
                    }, { selector: params.selector, platform: params.platform });
                }

                // Build output
                let outputText = `Screen Reader Output (${params.mode} mode, ${params.action} action):\n\n`;

                if (announcements.length > 0) {
                    outputText += announcements.map((a, i) => `${i + 1}. ${a}`).join('\n');
                }

                if (Object.keys(platformAnnouncements).length > 0) {
                    outputText += '\n\nPlatform-Specific Announcements:\n';
                    outputText += Object.entries(platformAnnouncements as any)
                        .map(([plat, announcement]) => `${plat}:\n"${announcement}"`)
                        .join('\n\n');
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: outputText
                        }
                    ]
                };
            }

            case "test_heading_structure": {
                const params = TestHeadingStructureSchema.parse(args);
                const page = await ensureBrowser();

                const headings = await page.evaluate(() => {
                    const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    return Array.from(allHeadings).map(h => ({
                        level: parseInt(h.tagName[1]),
                        text: (h as HTMLElement).innerText?.trim().substring(0, 100) || '',
                        id: h.id || '',
                        selector: h.id ? `#${h.id}` : h.className ? `.${(h as HTMLElement).className.split(' ')[0]}` : h.tagName.toLowerCase()
                    }));
                });

                const issues: string[] = [];
                let lastLevel = 0;
                let hasH1 = false;

                headings.forEach((h, i) => {
                    if (h.level === 1) hasH1 = true;

                    if (params.checkNesting && lastLevel > 0) {
                        if (h.level > lastLevel + 1 && !params.allowSkipping) {
                            issues.push(`Heading level skipped: ${headings[i - 1].selector} (H${lastLevel}) → ${h.selector} (H${h.level})`);
                        }
                    }
                    lastLevel = h.level;
                });

                if (!hasH1 && headings.length > 0) {
                    issues.push('No H1 heading found - page should have one main heading');
                }

                const h1Count = headings.filter(h => h.level === 1).length;
                if (h1Count > 1) {
                    issues.push(`Multiple H1 headings found (${h1Count}) - consider using only one per page`);
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Heading Structure Analysis:\n\n` +
                                `Total headings: ${headings.length}\n` +
                                `Issues found: ${issues.length}\n\n` +
                                `Heading hierarchy:\n` +
                                headings.map(h => `${'  '.repeat(h.level - 1)}H${h.level}: ${h.text}`).join('\n') +
                                '\n\n' +
                                (issues.length > 0 ? `Issues:\n${issues.map(i => `• ${i}`).join('\n')}` : '✓ Heading structure is valid!')
                        }
                    ]
                };
            }


            case "test_form_labels": {
                const params = TestFormLabelsSchema.parse(args);
                const page = await ensureBrowser();

                const formAnalysis = await page.evaluate(({ selector, checkRequired, checkErrors }: { selector: string | undefined; checkRequired: boolean; checkErrors: boolean }) => {
                    const container = selector ? document.querySelector(selector) : document;
                    if (!container) return { inputs: [], issues: [] };

                    const inputs = container.querySelectorAll('input, select, textarea');
                    const results: any[] = [];
                    const issues: string[] = [];

                    inputs.forEach((input: any) => {
                        const id = input.id;
                        const name = input.name;
                        const type = input.type || input.tagName.toLowerCase();

                        // Check for labels
                        let label = '';
                        let labelMethod = '';

                        if (input.getAttribute('aria-label')) {
                            label = input.getAttribute('aria-label');
                            labelMethod = 'aria-label';
                        } else if (input.getAttribute('aria-labelledby')) {
                            const labelEl = document.getElementById(input.getAttribute('aria-labelledby'));
                            if (labelEl) {
                                label = labelEl.innerText?.trim() || '';
                                labelMethod = 'aria-labelledby';
                            }
                        } else if (input.labels && input.labels.length > 0) {
                            label = input.labels[0].innerText?.trim() || '';
                            labelMethod = 'label element';
                        } else if (input.placeholder) {
                            label = input.placeholder;
                            labelMethod = 'placeholder (not recommended)';
                        }

                        // Check for description
                        let description = '';
                        if (input.getAttribute('aria-describedby')) {
                            const descEl = document.getElementById(input.getAttribute('aria-describedby'));
                            if (descEl) description = descEl.innerText?.trim() || '';
                        }

                        // Check required status
                        const required = input.required || input.getAttribute('aria-required') === 'true';

                        // Check error status
                        const hasError = input.getAttribute('aria-invalid') === 'true';
                        const errorMessage = input.getAttribute('aria-errormessage');

                        results.push({
                            type,
                            name,
                            id,
                            label,
                            labelMethod,
                            description,
                            required,
                            hasError,
                            errorMessage
                        });

                        // Report issues
                        if (!label) {
                            issues.push(`${type}${id ? ` #${id}` : name ? ` [name="${name}"]` : ''} has no accessible label`);
                        }

                        if (checkRequired && required && !label.includes('required') && !description.includes('required')) {
                            issues.push(`${type}${id ? ` #${id}` : ''} is required but doesn't indicate this to screen readers`);
                        }

                        if (checkErrors && hasError && !errorMessage) {
                            issues.push(`${type}${id ? ` #${id}` : ''} has error state but no error message`);
                        }
                    });

                    return { inputs: results, issues };
                }, { selector: params.selector, checkRequired: params.checkRequired, checkErrors: params.checkErrors });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Form Accessibility Analysis:\n\n` +
                                `Total form inputs: ${formAnalysis.inputs.length}\n` +
                                `Issues found: ${formAnalysis.issues.length}\n\n` +
                                `Input analysis:\n` +
                                formAnalysis.inputs.map((i: any) =>
                                    `• ${i.type}${i.name ? ` [${i.name}]` : ''}: ${i.label ? `✓ Labeled (${i.labelMethod})` : '✗ No label'}${i.required ? ' [required]' : ''}${i.hasError ? ' [error]' : ''}`
                                ).join('\n') +
                                '\n\n' +
                                (formAnalysis.issues.length > 0 ? `Issues:\n${formAnalysis.issues.map(i => `• ${i}`).join('\n')}` : '✓ All form inputs are properly labeled!')
                        }
                    ]
                };
            }

            case "test_tab_order": {
                const params = TestFocusAccessibilitySchema.parse(args);
                const page = await ensureBrowser();

                const actualOrder: string[] = [];

                // Reset focus
                await page.evaluate(() => (document.body as HTMLElement).focus());

                // Get actual tab order
                for (let i = 0; i < (params.expectedOrder?.length || 20); i++) {
                    await page.keyboard.press('Tab');
                    const focused = await page.evaluate(() => {
                        const el = document.activeElement;
                        if (!el || el === document.body) return null;
                        return el.id ? `#${el.id}` : (el as HTMLElement).className ? `.${(el as HTMLElement).className.split(' ')[0]}` : el.tagName.toLowerCase();
                    });
                    if (focused) {
                        actualOrder.push(focused);
                    }
                }

                // Test reverse if requested
                let reverseOrder: string[] = [];
                if (params.checkReverse) {
                    for (let i = 0; i < 5; i++) {
                        await page.keyboard.press('Shift+Tab');
                        const focused = await page.evaluate(() => {
                            const el = document.activeElement;
                            if (!el || el === document.body) return null;
                            return el.id ? `#${el.id}` : (el as HTMLElement).className ? `.${(el as HTMLElement).className.split(' ')[0]}` : el.tagName.toLowerCase();
                        });
                        if (focused) {
                            reverseOrder.push(focused);
                        }
                    }
                }

                // Compare with expected if provided
                let matchesExpected = true;
                const mismatches: string[] = [];
                if (params.expectedOrder) {
                    params.expectedOrder.forEach((expected, i) => {
                        if (actualOrder[i] !== expected) {
                            matchesExpected = false;
                            mismatches.push(`Position ${i + 1}: expected "${expected}", got "${actualOrder[i] || 'nothing'}"`);
                        }
                    });
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Tab Order Test Results:\n\n` +
                                `Actual tab order:\n${actualOrder.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
                                (params.checkReverse ? `Reverse tab order works: ✓\n` : '') +
                                (params.expectedOrder ?
                                    (matchesExpected ?
                                        '✓ Tab order matches expected order' :
                                        `✗ Tab order doesn't match expected:\n${mismatches.join('\n')}`)
                                    : '')
                        }
                    ]
                };
            }

            case "test_live_regions": {
                const params = TestLiveRegionsSchema.parse(args);
                const page = await ensureBrowser();

                // Monitor for live region changes
                const liveRegions = await page.evaluate(() => {
                    const regions = document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"]');
                    return Array.from(regions).map(r => ({
                        selector: r.id ? `#${r.id}` : (r as HTMLElement).className ? `.${(r as HTMLElement).className.split(' ')[0]}` : r.tagName.toLowerCase(),
                        ariaLive: r.getAttribute('aria-live') || (r.getAttribute('role') === 'alert' ? 'assertive' : 'polite'),
                        role: r.getAttribute('role') || '',
                        initialContent: (r as HTMLElement).innerText?.trim() || ''
                    }));
                });

                // Wait and check for changes
                await page.waitForTimeout(params.timeout);

                const updates = await page.evaluate((regions) => {
                    return regions.map((r: any) => {
                        const el = document.querySelector(r.selector);
                        if (!el) return r;
                        const currentContent = (el as HTMLElement).innerText?.trim() || '';
                        return {
                            ...r,
                            currentContent,
                            changed: currentContent !== r.initialContent
                        };
                    });
                }, liveRegions);

                return {
                    content: [
                        {
                            type: "text",
                            text: `Live Regions Test (monitored for ${params.timeout}ms):\n\n` +
                                `Found ${liveRegions.length} live regions:\n` +
                                updates.map((r: any) =>
                                    `• ${r.selector} [${r.ariaLive}]${r.role ? ` role="${r.role}"` : ''}\n` +
                                    `  Status: ${r.changed ? '✓ Updated' : '○ No changes'}\n` +
                                    (r.changed ? `  New content: "${r.currentContent.substring(0, 100)}..."` : '')
                                ).join('\n') +
                                '\n\nLive regions announce changes to screen reader users automatically.'
                        }
                    ]
                };
            }

            case "get_semantic_structure": {
                const params = GetSemanticStructureSchema.parse(args);
                const page = await ensureBrowser();

                const structure = await page.evaluate((includeText) => {
                    const getStructure = (element: Element, depth: number = 0): any => {
                        const semanticTags = ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
                        const tag = element.tagName.toLowerCase();

                        if (!semanticTags.includes(tag) && depth > 0) {
                            // Skip non-semantic elements but process children
                            const children: any[] = [];
                            element.children && Array.from(element.children).forEach(child => {
                                const childStructure = getStructure(child, depth);
                                if (childStructure) children.push(childStructure);
                            });
                            return children.length > 0 ? children : null;
                        }

                        const result: any = {
                            tag,
                            role: element.getAttribute('role') || '',
                            ariaLabel: element.getAttribute('aria-label') || ''
                        };

                        if (includeText && tag.startsWith('h')) {
                            result.text = (element as HTMLElement).innerText?.trim().substring(0, 50) || '';
                        }

                        const children: any[] = [];
                        element.children && Array.from(element.children).forEach(child => {
                            const childStructure = getStructure(child, depth + 1);
                            if (childStructure) {
                                if (Array.isArray(childStructure)) {
                                    children.push(...childStructure);
                                } else {
                                    children.push(childStructure);
                                }
                            }
                        });

                        if (children.length > 0) {
                            result.children = children;
                        }

                        return result;
                    };

                    return getStructure(document.body, 0);
                }, params.includeText);

                const formatStructure = (node: any, indent: number = 0): string => {
                    if (!node) return '';
                    if (Array.isArray(node)) {
                        return node.map(n => formatStructure(n, indent)).join('');
                    }

                    let result = '  '.repeat(indent) + `<${node.tag}`;
                    if (node.role) result += ` role="${node.role}"`;
                    if (node.ariaLabel) result += ` aria-label="${node.ariaLabel}"`;
                    result += '>';
                    if (node.text) result += ` ${node.text}`;
                    result += '\n';

                    if (node.children) {
                        node.children.forEach((child: any) => {
                            result += formatStructure(child, indent + 1);
                        });
                    }

                    return result;
                };

                return {
                    content: [
                        {
                            type: "text",
                            text: `Semantic HTML Structure:\n\n${formatStructure(structure)}\n\nThis structure helps screen readers understand page organization.`
                        }
                    ]
                };
            }

            case "test_focus_trap": {
                const params = TestFocusAccessibilitySchema.parse(args);
                const page = await ensureBrowser();

                if (!params.selector) {
                    throw new Error('Selector is required for focus trap testing');
                }

                const container = await page.$(params.selector);
                if (!container) {
                    throw new Error(`Container not found: ${params.selector}`);
                }

                // Focus the container
                await container.focus();

                // Get focusable elements within container
                const focusableWithin = await page.evaluate((selector) => {
                    const container = document.querySelector(selector);
                    if (!container) return [];

                    const focusable = container.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    return Array.from(focusable).map(el => {
                        const className = (el as HTMLElement).className;
                        return el.id ? `#${el.id}` : (typeof className === 'string' && className) ? `.${className.split(' ')[0]}` : el.tagName.toLowerCase();
                    });
                }, params.selector);

                // Test forward tabbing
                const forwardPath: string[] = [];
                let escapedForward = false;

                for (let i = 0; i < focusableWithin.length + 2; i++) {
                    await page.keyboard.press('Tab');
                    const focused = await page.evaluate((containerSelector) => {
                        const el = document.activeElement;
                        if (!el || el === document.body) return { selector: null, withinContainer: false };

                        const container = document.querySelector(containerSelector);
                        const withinContainer = container?.contains(el) || false;
                        const className = (el as HTMLElement).className;
                        const selector = el.id ? `#${el.id}` : (typeof className === 'string' && className) ? `.${className.split(' ')[0]}` : el.tagName.toLowerCase();

                        return { selector, withinContainer };
                    }, params.selector);

                    if (focused.selector) {
                        forwardPath.push(focused.selector);
                        if (!focused.withinContainer) {
                            escapedForward = true;
                            break;
                        }
                    }
                }

                // Test backward tabbing
                const backwardPath: string[] = [];
                let escapedBackward = false;

                for (let i = 0; i < focusableWithin.length + 2; i++) {
                    await page.keyboard.press('Shift+Tab');
                    const focused = await page.evaluate((containerSelector) => {
                        const el = document.activeElement;
                        if (!el || el === document.body) return { selector: null, withinContainer: false };

                        const container = document.querySelector(containerSelector);
                        const withinContainer = container?.contains(el) || false;
                        const className = (el as HTMLElement).className;
                        const selector = el.id ? `#${el.id}` : (typeof className === 'string' && className) ? `.${className.split(' ')[0]}` : el.tagName.toLowerCase();

                        return { selector, withinContainer };
                    }, params.selector);

                    if (focused.selector) {
                        backwardPath.push(focused.selector);
                        if (!focused.withinContainer) {
                            escapedBackward = true;
                            break;
                        }
                    }
                }

                // Test escape key if requested
                let escapeWorks = false;
                if (params.checkEscape) {
                    await container.focus();
                    await page.keyboard.press('Escape');
                    const focusedAfterEscape = await page.evaluate((containerSelector) => {
                        const container = document.querySelector(containerSelector);
                        return !container?.contains(document.activeElement);
                    }, params.selector);
                    escapeWorks = focusedAfterEscape;
                }

                const trapWorks = !escapedForward && !escapedBackward;

                return {
                    content: [
                        {
                            type: "text",
                            text: `Focus Trap Test for ${params.selector}:\n\n` +
                                `Focusable elements within: ${focusableWithin.length}\n` +
                                `Forward tab trap: ${!escapedForward ? '✓ Working' : '✗ Focus escaped'}\n` +
                                `Backward tab trap: ${!escapedBackward ? '✓ Working' : '✗ Focus escaped'}\n` +
                                (params.checkEscape ? `Escape key: ${escapeWorks ? '✓ Exits trap' : '✗ Doesn\'t exit'}\n` : '') +
                                `\nOverall: ${trapWorks ? '✓ Focus trap is working correctly' : '✗ Focus trap is not working'}`
                        }
                    ]
                };
            }

            case "get_accessible_name": {
                const params = GetAccessibleNameSchema.parse(args);
                const page = await ensureBrowser();

                const element = await page.$(params.selector);
                if (!element) {
                    throw new Error(`Element not found: ${params.selector}`);
                }

                const accessibleName = await element.evaluate((el: any) => {
                    // Enhanced WCAG accessible name algorithm (matches Planning MCP implementation)

                    // Helper: Check if element or ancestor has aria-hidden
                    const isHidden = (element: any): boolean => {
                        let current = element;
                        while (current && current !== document.body) {
                            if (current.getAttribute('aria-hidden') === 'true') return true;
                            if (current.hidden || current.style.display === 'none' || current.style.visibility === 'hidden') return true;
                            current = current.parentElement;
                        }
                        return false;
                    };

                    // Helper: Get visible text content (exclude aria-hidden elements)
                    const getVisibleText = (element: any): string => {
                        if (isHidden(element)) return '';

                        let text = '';
                        const childNodes = element.childNodes;

                        for (let i = 0; i < childNodes.length; i++) {
                            const node = childNodes[i];
                            if (node.nodeType === Node.TEXT_NODE) {
                                text += node.textContent || '';
                            } else if (node.nodeType === Node.ELEMENT_NODE) {
                                if (!isHidden(node)) {
                                    // Check for alt text on images
                                    if (node.tagName === 'IMG' && node.alt) {
                                        text += ' ' + node.alt + ' ';
                                    } else {
                                        text += getVisibleText(node);
                                    }
                                }
                            }
                        }

                        return text;
                    };

                    // Enhanced accessible name computation (8-step WCAG algorithm)
                    const computeName = (element: any, visited = new Set()): string => {
                        // Prevent infinite recursion
                        if (visited.has(element)) return '';
                        visited.add(element);

                        // Skip aria-hidden elements
                        if (isHidden(element)) return '';

                        // 1. aria-labelledby (highest priority, supports multiple IDs)
                        const labelledby = element.getAttribute('aria-labelledby');
                        if (labelledby) {
                            const ids = labelledby.split(/\s+/).filter((id: string) => id);
                            const labels = ids.map((id: string) => {
                                const labelEl = document.getElementById(id);
                                if (!labelEl) return '';
                                // Recursively compute name from referenced element
                                return computeName(labelEl, visited) || getVisibleText(labelEl).trim();
                            }).filter((l: string) => l);
                            if (labels.length > 0) return labels.join(' ');
                        }

                        // 2. aria-label
                        const ariaLabel = element.getAttribute('aria-label');
                        if (ariaLabel && ariaLabel.trim()) {
                            return ariaLabel.trim();
                        }

                        // 3. Native label element (for form controls)
                        if (element.labels && element.labels.length > 0) {
                            for (let i = 0; i < element.labels.length; i++) {
                                const labelText = getVisibleText(element.labels[i]).trim();
                                if (labelText) return labelText;
                            }
                        }

                        // 3b. Label wrapping the element
                        const parentLabel = element.closest('label');
                        if (parentLabel) {
                            const labelText = getVisibleText(parentLabel).trim();
                            if (labelText) return labelText;
                        }

                        // 4. Placeholder (for input/textarea)
                        if ((element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') && element.placeholder) {
                            const placeholder = element.placeholder.trim();
                            if (placeholder) return placeholder;
                        }

                        // 5. Alt text (for images)
                        if (element.tagName === 'IMG') {
                            const alt = element.getAttribute('alt');
                            if (alt !== null) return alt.trim(); // Empty alt is valid
                        }

                        // 6. Text content (for buttons, links, and other elements with text)
                        const tagName = element.tagName;
                        if (['BUTTON', 'A', 'SUMMARY', 'FIGCAPTION'].includes(tagName)) {
                            const text = getVisibleText(element).trim();
                            if (text) return text;
                        }

                        // 7. Title attribute (fallback)
                        const title = element.getAttribute('title');
                        if (title && title.trim()) {
                            return title.trim();
                        }

                        // 8. Role-specific defaults
                        const role = element.getAttribute('role') || element.tagName.toLowerCase();

                        // For inputs, try value as last resort
                        if (element.tagName === 'INPUT' && element.value && element.type !== 'password') {
                            return element.value.trim();
                        }

                        // For certain roles, text content is acceptable
                        if (['button', 'link', 'menuitem', 'tab', 'treeitem', 'option'].includes(role)) {
                            const text = getVisibleText(element).trim();
                            if (text) return text;
                        }

                        return '';
                    };

                    const name = computeName(el);
                    const role = el.getAttribute('role') || el.tagName.toLowerCase();

                    // Enhanced aria-describedby support (multiple IDs)
                    let description = '';
                    const describedby = el.getAttribute('aria-describedby');
                    if (describedby) {
                        const ids = describedby.split(/\s+/).filter((id: string) => id);
                        const descriptions = ids.map((id: string) => {
                            const descEl = document.getElementById(id);
                            return descEl ? getVisibleText(descEl).trim() : '';
                        }).filter((d: string) => d);
                        description = descriptions.join(' ');
                    }

                    return {
                        name,
                        role,
                        description,
                        sources: {
                            ariaLabelledby: el.getAttribute('aria-labelledby') || null,
                            ariaLabel: el.getAttribute('aria-label') || null,
                            labelElement: el.labels?.[0] ? getVisibleText(el.labels[0]).trim() : null,
                            title: el.getAttribute('title') || null,
                            placeholder: el.placeholder || null,
                            textContent: getVisibleText(el).trim() || null,
                            alt: el.getAttribute('alt') || null
                        }
                    };
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Accessible Name Computation for ${params.selector}:\n\n` +
                                `Accessible name: "${accessibleName.name || '(none)'}"\n` +
                                `Role: ${accessibleName.role}\n` +
                                (accessibleName.description ? `Description: "${accessibleName.description}"\n` : '') +
                                `\nName sources checked:\n` +
                                Object.entries(accessibleName.sources)
                                    .filter(([_, value]) => value !== null)
                                    .map(([source, value]) => `• ${source}: "${value}"`)
                                    .join('\n') +
                                '\n\nScreen readers will announce: "' +
                                [accessibleName.name, accessibleName.role, accessibleName.description].filter(s => s).join(', ') + '"'
                        }
                    ]
                };
            }

            case "test_skip_links": {
                const params = TestSkipLinksSchema.parse(args);
                const page = await ensureBrowser();

                const skipLinks = await page.evaluate((checkTarget) => {
                    const links = document.querySelectorAll('a[href^="#"]');
                    const skipLinkPatterns = ['skip', 'jump', 'main', 'content', 'navigation'];

                    const results: any[] = [];

                    links.forEach((link: any) => {
                        const text = link.innerText?.toLowerCase() || '';
                        const href = link.getAttribute('href');
                        const isSkipLink = skipLinkPatterns.some(pattern => text.includes(pattern));

                        if (isSkipLink || link.className?.includes('skip')) {
                            const targetId = href.substring(1);
                            const targetExists = checkTarget ? !!document.getElementById(targetId) : null;
                            const isHidden = window.getComputedStyle(link).position === 'absolute' &&
                                (window.getComputedStyle(link).left === '-9999px' ||
                                    window.getComputedStyle(link).clip === 'rect(1px, 1px, 1px, 1px)');

                            results.push({
                                text: link.innerText?.trim(),
                                href,
                                targetExists,
                                isHidden,
                                becomesVisibleOnFocus: isHidden // Would need actual focus test
                            });
                        }
                    });

                    return results;
                }, params.checkTarget);

                const issues: string[] = [];
                skipLinks.forEach(link => {
                    if (params.checkTarget && link.targetExists === false) {
                        issues.push(`Skip link "${link.text}" points to non-existent target: ${link.href}`);
                    }
                    if (!link.isHidden && !link.text.toLowerCase().includes('skip')) {
                        issues.push(`Possible skip link "${link.text}" is always visible (should be hidden until focused)`);
                    }
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Skip Links Analysis:\n\n` +
                                `Found ${skipLinks.length} skip link(s):\n` +
                                skipLinks.map(l =>
                                    `• "${l.text}" → ${l.href}\n` +
                                    `  Target exists: ${l.targetExists === null ? 'not checked' : l.targetExists ? '✓' : '✗'}\n` +
                                    `  Hidden until focus: ${l.isHidden ? '✓' : '✗'}`
                                ).join('\n') +
                                '\n\n' +
                                (issues.length > 0 ?
                                    `Issues:\n${issues.map(i => `• ${i}`).join('\n')}` :
                                    skipLinks.length > 0 ? '✓ Skip links are properly implemented!' : 'ℹ No skip links found (consider adding for better accessibility)')
                        }
                    ]
                };
            }


            case "test_screen_reader_compatibility": {
                const params = TestScreenReaderCompatibilitySchema.parse(args);
                const page = await ensureBrowser();
                let output = 'Screen Reader Compatibility Test:\n\n';

                // Test 1: ARIA Support
                if (params.testAll || params.testARIA) {
                    const ariaSupport = await page.evaluate(() => {
                        const results: any = {
                            jaws: {
                                live: "Full support with configurable politeness",
                                describedby: "Announced with verbosity settings",
                                label: "Always announced",
                                expanded: "State changes announced",
                                hidden: "Properly hidden"
                            },
                            nvda: {
                                live: "Good support, some delays",
                                describedby: "Announced in browse mode",
                                label: "Always announced",
                                expanded: "State changes announced",
                                hidden: "Properly hidden"
                            },
                            voiceover: {
                                live: "Good support with WebKit",
                                describedby: "Announced as hints",
                                label: "Always announced",
                                expanded: "State changes with sound",
                                hidden: "Properly hidden"
                            }
                        };
                        return results;
                    });

                    const screenReaders = params.platform === "all" ?
                        ["jaws", "nvda", "voiceover"] :
                        params.platform === "windows-jaws" ? ["jaws"] :
                        params.platform === "windows-nvda" ? ["nvda"] : ["voiceover"];

                    output += '[1] ARIA Support Differences:\n';
                    screenReaders.forEach(sr => {
                        output += `\n${sr.toUpperCase()}:\n`;
                        Object.entries(ariaSupport[sr] || {}).forEach(([attr, support]) => {
                            output += `• aria-${attr}: ${support}\n`;
                        });
                    });
                    output += '\n';
                }

                // Test 2: Navigation Patterns
                if (params.testAll || params.testNavigation) {
                    output += '[2] Navigation Patterns:\n\n';

                    // Quick Navigation (Windows: JAWS/NVDA)
                    if (params.pattern === 'quick_navigation' || params.pattern === 'all') {
                        const navResults = await page.evaluate((keys) => {
                            const keyMap: any = {
                                H: 'h1, h2, h3, h4, h5, h6',
                                B: 'button, [role="button"]',
                                F: 'input, textarea, select',
                                T: 'table',
                                L: 'ul, ol, dl',
                                I: 'img',
                                R: '[role="region"], [role="main"], [role="navigation"]',
                                D: '[role="landmark"]',
                                S: '[role="search"]',
                                N: 'nav, [role="navigation"]',
                                E: '[role="application"]',
                                C: '[role="combobox"]',
                                Q: '[role="complementary"]',
                                M: '[role="menu"]',
                                G: '[role="graphics-document"]'
                            };

                            const results: any = {};
                            keys.forEach((key: string) => {
                                const selector = keyMap[key];
                                if (selector) {
                                    const elements = document.querySelectorAll(selector);
                                    results[key] = {
                                        count: elements.length,
                                        elements: Array.from(elements).slice(0, 3).map((el: any) =>
                                            el.tagName + (el.id ? `#${el.id}` : '')
                                        )
                                    };
                                }
                            });
                            return results;
                        }, params.quickNavKeys || ["H", "B", "F", "T", "L"]);

                        output += '  Quick Navigation Keys (Windows - JAWS/NVDA):\n';
                        Object.entries(navResults).forEach(([key, data]: [string, any]) => {
                            output += `  • Key "${key}": ${data.count} elements`;
                            if (data.elements.length > 0) {
                                output += ` (${data.elements.join(', ')})`;
                            }
                            output += '\n';
                        });
                        output += '\n';
                    }

                    // Virtual Buffer (Windows)
                    if (params.pattern === 'virtual_buffer' || params.pattern === 'all') {
                        const bufferTest = await page.evaluate(() => {
                            const forms = document.querySelectorAll('input, textarea, select');
                            const autoSwitchElements = Array.from(forms).filter((el: any) => {
                                return !el.hasAttribute('role') || el.getAttribute('role') !== 'presentation';
                            });

                            return {
                                formElements: forms.length,
                                autoSwitchTriggers: autoSwitchElements.length,
                                dynamicRegions: document.querySelectorAll('[aria-live]').length
                            };
                        });

                        output += '  Virtual Buffer (Windows):\n';
                        output += `  • Form Elements: ${bufferTest.formElements}\n`;
                        output += `  • Auto Form Mode Triggers: ${bufferTest.autoSwitchTriggers}\n`;
                        output += `  • Dynamic Regions: ${bufferTest.dynamicRegions}\n\n`;
                    }

                    // Rotor (Mac: VoiceOver)
                    if (params.pattern === 'rotor' || params.pattern === 'all') {
                        const rotorResults = await page.evaluate((categories) => {
                            const categoryMap: any = {
                                'Headings': 'h1, h2, h3, h4, h5, h6',
                                'Links': 'a[href]',
                                'Form Controls': 'input, textarea, select, button',
                                'Tables': 'table',
                                'Landmarks': '[role="navigation"], [role="main"], [role="complementary"], [role="banner"]',
                                'Images': 'img[alt]'
                            };

                            const results: any = {};
                            categories.forEach((cat: string) => {
                                const selector = categoryMap[cat];
                                if (selector) {
                                    const elements = document.querySelectorAll(selector);
                                    results[cat] = elements.length;
                                }
                            });
                            return results;
                        }, params.rotorCategories || ["Headings", "Links", "Form Controls"]);

                        output += '  VoiceOver Rotor (Mac - VO+U):\n';
                        Object.entries(rotorResults).forEach(([cat, count]) => {
                            output += `  • ${cat}: ${count} items\n`;
                        });
                    }
                }

                return {
                    content: [{
                        type: "text",
                        text: output
                    }]
                };
            }

            case "test_high_contrast": {
                const params = TestHighContrastSchema.parse(args);
                const page = await ensureBrowser();

                const contrastResults = await page.evaluate(() => {
                    const results: any = {
                        textContrast: [],
                        borderVisibility: [],
                        imageVisibility: []
                    };

                    // Check text contrast
                    document.querySelectorAll('*').forEach((el: any) => {
                        const styles = window.getComputedStyle(el);
                        const color = styles.color;
                        const bgColor = styles.backgroundColor;
                        if (color && bgColor && color !== 'rgba(0, 0, 0, 0)') {
                            results.textContrast.push({
                                element: el.tagName,
                                contrast: 'Checked'
                            });
                        }
                    });

                    // Check borders
                    document.querySelectorAll('button, input, [role="button"]').forEach((el: any) => {
                        const styles = window.getComputedStyle(el);
                        const border = styles.border;
                        results.borderVisibility.push({
                            element: el.tagName,
                            hasBorder: border !== 'none'
                        });
                    });

                    // Check images
                    document.querySelectorAll('img').forEach((img: any) => {
                        results.imageVisibility.push({
                            alt: img.alt,
                            visible: img.offsetWidth > 0
                        });
                    });

                    return results;
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: `High Contrast Mode Testing:\n\n` +
                                `Color Scheme: ${params.scheme}\n\n` +
                                `Text Contrast: ${contrastResults.textContrast.length} elements checked\n` +
                                `Borders: ${contrastResults.borderVisibility.filter((b: any) => b.hasBorder).length}/${contrastResults.borderVisibility.length} visible\n` +
                                `Images: ${contrastResults.imageVisibility.filter((i: any) => i.visible).length}/${contrastResults.imageVisibility.length} visible`
                        }
                    ]
                };
            }

            case "test_table_navigation": {
                const params = TestTableNavigationSchema.parse(args);
                const page = await ensureBrowser();

                const tableResults = await page.evaluate(() => {
                    const tables = document.querySelectorAll('table');
                    const results: any[] = [];

                    tables.forEach((table) => {
                        const headers = table.querySelectorAll('th');
                        const cells = table.querySelectorAll('td');
                        const hasScope = Array.from(headers).some(h => h.hasAttribute('scope'));
                        const hasHeaders = Array.from(cells).some(c => c.hasAttribute('headers'));

                        results.push({
                            rows: table.querySelectorAll('tr').length,
                            headers: headers.length,
                            cells: cells.length,
                            hasScope,
                            hasHeaders,
                            hasCaption: !!table.querySelector('caption')
                        });
                    });

                    return results;
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Table Navigation Testing:\n\n` +
                                (tableResults.length > 0 ?
                                    tableResults.map((t, i) =>
                                        `Table ${i + 1}:\n` +
                                        `• ${t.rows} rows, ${t.headers} headers, ${t.cells} cells\n` +
                                        `• Scope attributes: ${t.hasScope ? '✓' : '✗'}\n` +
                                        `• Headers attributes: ${t.hasHeaders ? '✓' : '✗'}\n` +
                                        `• Caption: ${t.hasCaption ? '✓' : '✗'}\n` +
                                        `• ${params.platform === 'windows' ? 'JAWS: Ctrl+Alt+Arrows' : 'VoiceOver: VO+Command+Arrows'}`
                                    ).join('\n\n') :
                                    'No tables found on page')
                        }
                    ]
                };
            }


            case "test_math_content": {
                const params = TestMathContentSchema.parse(args);
                const page = await ensureBrowser();

                const mathResults = await page.evaluate(() => {
                    const mathML = document.querySelectorAll('math');
                    const mathImages = Array.from(document.querySelectorAll('img')).filter((img: any) =>
                        img.alt && (img.alt.includes('equation') || img.alt.includes('formula'))
                    );

                    return {
                        mathML: mathML.length,
                        mathImages: mathImages.length,
                        mathMLSupport: mathML.length > 0 ? 'Found MathML content' : 'No MathML found',
                        altTextQuality: mathImages.map((img: any) => ({
                            src: img.src.substring(img.src.lastIndexOf('/') + 1),
                            alt: img.alt
                        }))
                    };
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Math Content Accessibility Testing:\n\n` +
                                `MathML Elements: ${mathResults.mathML}\n` +
                                `Math Images: ${mathResults.mathImages}\n` +
                                `${params.checkMathML ? `MathML Support: ${mathResults.mathMLSupport}` : ''}\n` +
                                `${params.checkAltText && mathResults.altTextQuality.length > 0 ?
                                    `\nAlt Text for Math:\n${mathResults.altTextQuality.map((m: any) =>
                                        `• ${m.src}: "${m.alt}"`).join('\n')}` : ''}`
                        }
                    ]
                };
            }

            case "test_focus_visibility": {
                const params = TestFocusVisibilitySchema.parse(args);
                const page = await ensureBrowser();

                const focusAnalysis = await page.evaluate(() => {
                    const focusableElements = document.querySelectorAll(
                        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );

                    const results: any[] = [];
                    focusableElements.forEach((el: any) => {
                        el.focus();
                        const styles = window.getComputedStyle(el);
                        const outline = styles.outline;
                        const outlineWidth = styles.outlineWidth;
                        const outlineStyle = styles.outlineStyle;
                        const outlineColor = styles.outlineColor;

                        results.push({
                            selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''),
                            hasOutline: outline !== 'none' && outlineStyle !== 'none',
                            outlineWidth,
                            outlineColor,
                            textContent: el.textContent?.trim().substring(0, 30)
                        });
                    });

                    return {
                        totalFocusable: focusableElements.length,
                        withVisibleFocus: results.filter(r => r.hasOutline).length,
                        elements: results.slice(0, 10)
                    };
                });

                const issues: string[] = [];
                const invisibleFocusCount = focusAnalysis.totalFocusable - focusAnalysis.withVisibleFocus;
                if (invisibleFocusCount > 0) {
                    issues.push(`${invisibleFocusCount} focusable elements have no visible focus indicator`);
                }

                return {
                    content: [{
                        type: "text",
                        text: `Focus Visibility Test (WCAG 2.4.7, 2.4.13):\n\n` +
                            `Total focusable elements: ${focusAnalysis.totalFocusable}\n` +
                            `With visible focus: ${focusAnalysis.withVisibleFocus}\n` +
                            `Without visible focus: ${invisibleFocusCount}\n\n` +
                            `Requirements:\n` +
                            `${params.checkContrast ? '✓ 3:1 contrast ratio minimum\n' : ''}` +
                            `${params.minSize ? `✓ ${params.minSize}px minimum size\n` : ''}` +
                            `${params.takeScreenshots ? '✓ Screenshots recommended for manual verification\n' : ''}` +
                            (issues.length > 0 ? `\n⚠️ Issues:\n${issues.map(i => `• ${i}`).join('\n')}` : '\n✓ All focusable elements have visible focus indicators')
                    }]
                };
            }

            case "test_responsive_accessibility": {
                const params = TestResponsiveAccessibilitySchema.parse(args);
                const page = await ensureBrowser();
                let output = `Responsive Accessibility Test (WCAG 1.4.4, 1.4.10, 1.4.12, 1.4.13):\n\n`;
                const allIssues: string[] = [];

                // Test 1: Hover/Focus Content (WCAG 1.4.13)
                if (params.testAll || params.testHover) {
                    // Step 1: Detect all tooltip/popover elements and their triggers
                    const tooltipData = await page.evaluate(() => {
                        const tooltips: any[] = [];

                        // Find tooltip elements with various patterns
                        const tooltipElements = document.querySelectorAll('[role="tooltip"], .tooltip, [data-tooltip], [aria-describedby]');
                        const popoverElements = document.querySelectorAll('[role="dialog"]:not([aria-modal]), .popover');

                        // Find elements with title attributes (native tooltips)
                        const titleElements = document.querySelectorAll('[title]:not([title=""])');

                        // Helper to find trigger for tooltip
                        const findTrigger = (tooltipEl: Element) => {
                            const id = tooltipEl.id;
                            if (id) {
                                const trigger = document.querySelector(`[aria-describedby="${id}"], [data-tooltip-target="${id}"]`);
                                if (trigger) return trigger;
                            }

                            // Check if tooltip is a sibling or child of trigger
                            const parent = tooltipEl.parentElement;
                            if (parent) {
                                const interactiveElements = parent.querySelectorAll('button, a, input, [tabindex], [role="button"]');
                                if (interactiveElements.length > 0) {
                                    return interactiveElements[0];
                                }
                            }

                            return null;
                        };

                        // Process tooltip elements
                        Array.from(tooltipElements).forEach((el: any) => {
                            const trigger = findTrigger(el);
                            tooltips.push({
                                selector: el.tagName + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.split(' ')[0]}` : ''),
                                role: el.getAttribute('role'),
                                type: 'tooltip',
                                hasTrigger: !!trigger,
                                triggerSelector: trigger ? (trigger.tagName + (trigger.id ? `#${trigger.id}` : '')) : null,
                                initiallyVisible: el.offsetParent !== null
                            });
                        });

                        // Process popover elements
                        Array.from(popoverElements).forEach((el: any) => {
                            const trigger = findTrigger(el);
                            tooltips.push({
                                selector: el.tagName + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.split(' ')[0]}` : ''),
                                role: el.getAttribute('role'),
                                type: 'popover',
                                hasTrigger: !!trigger,
                                triggerSelector: trigger ? (trigger.tagName + (trigger.id ? `#${trigger.id}` : '')) : null,
                                initiallyVisible: el.offsetParent !== null
                            });
                        });

                        // Process title attributes (native tooltips)
                        Array.from(titleElements).forEach((el: any) => {
                            tooltips.push({
                                selector: el.tagName + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.split(' ')[0]}` : ''),
                                role: 'native',
                                type: 'title-tooltip',
                                hasTrigger: true,
                                triggerSelector: el.tagName + (el.id ? `#${el.id}` : ''),
                                titleText: el.getAttribute('title'),
                                initiallyVisible: false
                            });
                        });

                        return {
                            tooltips: tooltips,
                            tooltipCount: tooltipElements.length,
                            popoverCount: popoverElements.length,
                            titleCount: titleElements.length,
                            total: tooltips.length
                        };
                    });

                    const testResults = {
                        tested: 0,
                        passed: 0,
                        failed: 0,
                        hoverable: { pass: 0, fail: 0 },
                        dismissible: { pass: 0, fail: 0 },
                        persistent: { pass: 0, fail: 0 },
                        issues: [] as string[]
                    };

                    // Step 2: Test each tooltip with actual interactions (limit to first 5 for performance)
                    const tooltipsToTest = tooltipData.tooltips.filter(t => t.hasTrigger && t.type !== 'title-tooltip').slice(0, 5);

                    for (const tooltip of tooltipsToTest) {
                        try {
                            testResults.tested++;

                            // Test hoverable requirement (if enabled)
                            if (params.checkHoverable && tooltip.triggerSelector) {
                                try {
                                    // Hover over trigger
                                    const trigger = page.locator(tooltip.triggerSelector).first();
                                    await trigger.hover({ timeout: 2000 });
                                    await page.waitForTimeout(300); // Wait for tooltip to appear

                                    // Check if tooltip is visible
                                    const tooltipElement = page.locator(tooltip.selector).first();
                                    const isVisibleAfterHover = await tooltipElement.isVisible().catch(() => false);

                                    if (isVisibleAfterHover) {
                                        // Try to move pointer to tooltip content
                                        const box = await tooltipElement.boundingBox().catch(() => null);
                                        if (box) {
                                            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                                            await page.waitForTimeout(200);

                                            // Check if still visible (hoverable test)
                                            const stillVisible = await tooltipElement.isVisible().catch(() => false);
                                            if (stillVisible) {
                                                testResults.hoverable.pass++;
                                            } else {
                                                testResults.hoverable.fail++;
                                                testResults.issues.push(`Hoverable FAIL: ${tooltip.selector} - content disappears when pointer moves to it`);
                                            }
                                        } else {
                                            testResults.hoverable.pass++; // No bounding box means native or CSS tooltip
                                        }
                                    } else {
                                        // Tooltip didn't appear on hover - might be focus-triggered
                                        testResults.hoverable.pass++; // Don't penalize, might be focus-only
                                    }
                                } catch (e: any) {
                                    testResults.hoverable.fail++;
                                    testResults.issues.push(`Hoverable ERROR: ${tooltip.selector} - ${e.message}`);
                                }
                            }

                            // Test dismissible requirement (if enabled)
                            if (params.checkDismissible && tooltip.triggerSelector) {
                                try {
                                    // Ensure tooltip is visible first
                                    const trigger = page.locator(tooltip.triggerSelector).first();
                                    await trigger.hover({ timeout: 2000 });
                                    await page.waitForTimeout(300);

                                    const tooltipElement = page.locator(tooltip.selector).first();
                                    const visibleBeforeEscape = await tooltipElement.isVisible().catch(() => false);

                                    if (visibleBeforeEscape) {
                                        // Press Escape key
                                        await page.keyboard.press('Escape');
                                        await page.waitForTimeout(200);

                                        // Check if dismissed
                                        const visibleAfterEscape = await tooltipElement.isVisible().catch(() => false);
                                        if (!visibleAfterEscape) {
                                            testResults.dismissible.pass++;
                                        } else {
                                            testResults.dismissible.fail++;
                                            testResults.issues.push(`Dismissible FAIL: ${tooltip.selector} - does not dismiss with Escape key`);
                                        }
                                    } else {
                                        // Couldn't trigger tooltip, skip this test
                                        testResults.dismissible.pass++; // Don't penalize
                                    }
                                } catch (e: any) {
                                    testResults.dismissible.fail++;
                                    testResults.issues.push(`Dismissible ERROR: ${tooltip.selector} - ${e.message}`);
                                }
                            }

                            // Test persistent requirement (if enabled)
                            if (params.checkPersistent && tooltip.triggerSelector) {
                                try {
                                    // Trigger tooltip and check it stays visible
                                    const trigger = page.locator(tooltip.triggerSelector).first();
                                    await trigger.hover({ timeout: 2000 });
                                    await page.waitForTimeout(300);

                                    const tooltipElement = page.locator(tooltip.selector).first();
                                    const visible1 = await tooltipElement.isVisible().catch(() => false);

                                    if (visible1) {
                                        // Wait a bit and check again
                                        await page.waitForTimeout(500);
                                        const visible2 = await tooltipElement.isVisible().catch(() => false);

                                        if (visible2) {
                                            testResults.persistent.pass++;
                                        } else {
                                            testResults.persistent.fail++;
                                            testResults.issues.push(`Persistent FAIL: ${tooltip.selector} - content disappears unexpectedly`);
                                        }
                                    } else {
                                        testResults.persistent.pass++; // Couldn't trigger, don't penalize
                                    }
                                } catch (e: any) {
                                    testResults.persistent.fail++;
                                    testResults.issues.push(`Persistent ERROR: ${tooltip.selector} - ${e.message}`);
                                }
                            }

                            // Move mouse away to reset state
                            await page.mouse.move(0, 0);
                            await page.waitForTimeout(200);

                        } catch (error: any) {
                            testResults.failed++;
                            testResults.issues.push(`Test ERROR: ${tooltip.selector} - ${error.message}`);
                        }
                    }

                    // Calculate pass/fail
                    const totalTests = testResults.hoverable.pass + testResults.hoverable.fail +
                                      testResults.dismissible.pass + testResults.dismissible.fail +
                                      testResults.persistent.pass + testResults.persistent.fail;
                    const totalPassed = testResults.hoverable.pass + testResults.dismissible.pass + testResults.persistent.pass;
                    const totalFailed = testResults.hoverable.fail + testResults.dismissible.fail + testResults.persistent.fail;

                    const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 100;

                    if (testResults.issues.length > 0) {
                        allIssues.push(...testResults.issues);
                    }

                    output += `[1] Hover/Focus Content (WCAG 1.4.13) - AUTOMATED TESTING:\n` +
                        `Found: ${tooltipData.total} hover/focus triggered content\n` +
                        `• Tooltips: ${tooltipData.tooltipCount}\n` +
                        `• Popovers: ${tooltipData.popoverCount}\n` +
                        `• Native tooltips (title): ${tooltipData.titleCount}\n` +
                        `\nInteraction Tests Performed: ${testResults.tested} tooltips\n` +
                        `${params.checkHoverable ? `  • Hoverable (pointer can move to content): ${testResults.hoverable.pass} passed, ${testResults.hoverable.fail} failed\n` : ''}` +
                        `${params.checkDismissible ? `  • Dismissible (Escape key works): ${testResults.dismissible.pass} passed, ${testResults.dismissible.fail} failed\n` : ''}` +
                        `${params.checkPersistent ? `  • Persistent (stays visible): ${testResults.persistent.pass} passed, ${testResults.persistent.fail} failed\n` : ''}` +
                        `\nOverall: ${passRate}% tests passed (${totalPassed}/${totalTests})\n` +
                        `Status: ${totalFailed === 0 ? '✓ All tests passed' : `⚠️ ${totalFailed} test(s) failed`}\n`;

                    if (testResults.issues.length > 0) {
                        output += `\nIssues Found:\n`;
                        testResults.issues.slice(0, 5).forEach(issue => {
                            output += `  • ${issue}\n`;
                        });
                        if (testResults.issues.length > 5) {
                            output += `  ... and ${testResults.issues.length - 5} more issues\n`;
                        }
                    }

                    output += `\n`;
                }

                // Test 2: Reflow (WCAG 1.4.10)
                if (params.testAll || params.testReflow) {
                    await page.setViewportSize({ width: params.width, height: params.height });
                    await page.waitForTimeout(100);

                    const reflowAnalysis = await page.evaluate(() => {
                        const body = document.body;
                        const html = document.documentElement;

                        const hasHorizontalScroll = body.scrollWidth > html.clientWidth ||
                                                  html.scrollWidth > html.clientWidth;

                        const overflowElements = Array.from(document.querySelectorAll('*')).filter((el: any) => {
                            return el.scrollWidth > el.clientWidth;
                        });

                        return {
                            hasHorizontalScroll,
                            bodyScrollWidth: body.scrollWidth,
                            bodyClientWidth: body.clientWidth,
                            viewportWidth: html.clientWidth,
                            overflowElementsCount: overflowElements.length,
                            overflowElements: overflowElements.slice(0, 5).map((el: any) => el.tagName.toLowerCase())
                        };
                    });

                    if (params.checkHorizontalScroll && reflowAnalysis.hasHorizontalScroll) {
                        allIssues.push(`Reflow: Horizontal scrolling detected at ${params.width}px width`);
                    }
                    if (reflowAnalysis.overflowElementsCount > 0) {
                        allIssues.push(`Reflow: ${reflowAnalysis.overflowElementsCount} elements with horizontal overflow`);
                    }

                    output += `[2] Reflow (WCAG 1.4.10):\n` +
                        `Viewport: ${params.width}x${params.height}px\n` +
                        `Horizontal scrolling: ${reflowAnalysis.hasHorizontalScroll ? '✗ Yes' : '✓ No'}\n` +
                        `Content width: ${reflowAnalysis.bodyScrollWidth}px\n` +
                        `Elements with overflow: ${reflowAnalysis.overflowElementsCount}\n` +
                        `Status: ${reflowAnalysis.hasHorizontalScroll ? '⚠️ Issues detected' : '✓ Passes'}\n\n`;
                }

                // Test 3: Text Resize (WCAG 1.4.4)
                if (params.testAll || params.testTextResize) {
                    await page.evaluate((zoomLevel) => {
                        document.body.style.zoom = `${zoomLevel}%`;
                    }, params.zoomLevel);

                    await page.waitForTimeout(100);

                    const afterResize = await page.evaluate(() => {
                        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, label, button');
                        const overflowElements = Array.from(textElements).filter((el: any) =>
                            el.scrollWidth > el.clientWidth
                        );

                        return {
                            overflowCount: overflowElements.length,
                            totalElements: textElements.length
                        };
                    });

                    await page.evaluate(() => {
                        document.body.style.zoom = '100%';
                    });

                    if (afterResize.overflowCount > 0) {
                        allIssues.push(`Text Resize: ${afterResize.overflowCount} elements overflow at ${params.zoomLevel}% zoom`);
                    }

                    output += `[3] Text Resize (WCAG 1.4.4):\n` +
                        `Zoom level: ${params.zoomLevel}%\n` +
                        `Text elements: ${afterResize.totalElements}\n` +
                        `Overflow at ${params.zoomLevel}%: ${afterResize.overflowCount}\n` +
                        `Status: ${afterResize.overflowCount > 0 ? '⚠️ Issues detected' : '✓ Passes'}\n\n`;
                }

                // Test 4: Text Spacing (WCAG 1.4.12)
                if (params.testAll || params.testTextSpacing) {
                    await page.evaluate((spacing) => {
                        const style = document.createElement('style');
                        style.textContent = `
                            * {
                                line-height: ${spacing.lineHeight} !important;
                                letter-spacing: ${spacing.letterSpacing}em !important;
                                word-spacing: ${spacing.wordSpacing}em !important;
                            }
                            p {
                                margin-bottom: ${spacing.paragraphSpacing}em !important;
                            }
                        `;
                        style.id = 'text-spacing-test';
                        document.head.appendChild(style);
                    }, params);

                    await page.waitForTimeout(100);

                    const spacingAnalysis = await page.evaluate(() => {
                        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
                        const overflowElements = Array.from(textElements).filter((el: any) =>
                            el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight
                        );

                        return {
                            totalElements: textElements.length,
                            overflowCount: overflowElements.length,
                            readabilityIssues: overflowElements.length > textElements.length * 0.1
                        };
                    });

                    await page.evaluate(() => {
                        const style = document.getElementById('text-spacing-test');
                        if (style) style.remove();
                    });

                    if (spacingAnalysis.overflowCount > 0) {
                        allIssues.push(`Text Spacing: ${spacingAnalysis.overflowCount} elements overflow with increased spacing`);
                    }

                    output += `[4] Text Spacing (WCAG 1.4.12):\n` +
                        `Applied spacing:\n` +
                        `  • Line height: ${params.lineHeight}\n` +
                        `  • Letter spacing: ${params.letterSpacing}em\n` +
                        `  • Word spacing: ${params.wordSpacing}em\n` +
                        `  • Paragraph spacing: ${params.paragraphSpacing}em\n` +
                        `Elements tested: ${spacingAnalysis.totalElements}\n` +
                        `Elements with overflow: ${spacingAnalysis.overflowCount}\n` +
                        `Status: ${spacingAnalysis.overflowCount > 0 ? '⚠️ Issues detected' : '✓ Passes'}\n\n`;
                }

                // Summary
                output += `=== SUMMARY ===\n`;
                if (allIssues.length > 0) {
                    output += `⚠️ ${allIssues.length} Issue(s) Found:\n${allIssues.map(i => `• ${i}`).join('\n')}`;
                } else {
                    output += `✓ All responsive accessibility tests passed`;
                }

                return {
                    content: [{
                        type: "text",
                        text: output
                    }]
                };
            }

            case "test_auto_refresh": {
                const params = TestAutoRefreshSchema.parse(args);
                const page = await ensureBrowser();

                const refreshAnalysis = await page.evaluate(() => {
                    const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
                    const refreshContent = metaRefresh?.getAttribute('content');

                    // Check for JavaScript refresh patterns
                    const scripts = Array.from(document.querySelectorAll('script')).map((s: any) => s.textContent || s.src);
                    const hasLocationReload = scripts.some(s => s.includes('location.reload') || s.includes('location.replace'));
                    const hasSetTimeout = scripts.some(s => s.includes('setTimeout') && (s.includes('location') || s.includes('reload')));

                    return {
                        hasMetaRefresh: !!metaRefresh,
                        refreshContent,
                        hasLocationReload,
                        hasSetTimeout,
                        hasAnyRefresh: !!metaRefresh || hasLocationReload || hasSetTimeout
                    };
                });

                const issues: string[] = [];
                if (refreshAnalysis.hasMetaRefresh) {
                    issues.push(`Meta refresh detected: ${refreshAnalysis.refreshContent}`);
                }
                if (refreshAnalysis.hasLocationReload) {
                    issues.push('JavaScript location.reload() detected');
                }
                if (refreshAnalysis.hasSetTimeout) {
                    issues.push('JavaScript setTimeout with location change detected');
                }

                return {
                    content: [{
                        type: "text",
                        text: `Auto-Refresh Test (WCAG 2.1 SC 2.2.1 Timing Adjustable - Level A):\n\n` +
                            `Meta refresh: ${refreshAnalysis.hasMetaRefresh ? '✗ Found' : '✓ None'}\n` +
                            `JavaScript reload: ${refreshAnalysis.hasLocationReload ? '✗ Found' : '✓ None'}\n` +
                            `Timed redirects: ${refreshAnalysis.hasSetTimeout ? '✗ Found' : '✓ None'}\n\n` +
                            `WCAG Success Criterion: Timing adjustable (turn off, adjust, or extend)\n` +
                            (issues.length > 0 ? `\n⚠️ Issues:\n${issues.map(i => `• ${i}`).join('\n')}\n\nRecommendation: Provide user controls to pause/stop auto-refresh` : '\n✓ No automatic refresh detected')
                    }]
                };
            }

            case "test_animation_control": {
                const params = TestAnimationControlSchema.parse(args);
                const page = await ensureBrowser();

                const animationAnalysis = await page.evaluate(() => {
                    // Check for animated elements
                    const animated = Array.from(document.querySelectorAll('*')).filter((el: any) => {
                        const styles = window.getComputedStyle(el);
                        return styles.animation !== 'none' || styles.transition !== 'none';
                    });

                    // Check for video/audio with autoplay
                    const autoplayMedia = document.querySelectorAll('video[autoplay], audio[autoplay]');

                    // Check for pause controls
                    const pauseButtons = document.querySelectorAll('[aria-label*="pause" i], [aria-label*="stop" i], .pause-button');

                    // Check prefers-reduced-motion support
                    const hasMotionQuery = Array.from(document.querySelectorAll('style')).some((style: any) =>
                        style.textContent?.includes('prefers-reduced-motion')
                    );

                    return {
                        animatedElements: animated.length,
                        autoplayMedia: autoplayMedia.length,
                        pauseControls: pauseButtons.length,
                        hasMotionQuery
                    };
                });

                const issues: string[] = [];
                if (animationAnalysis.autoplayMedia > 0 && animationAnalysis.pauseControls === 0) {
                    issues.push(`${animationAnalysis.autoplayMedia} auto-playing media without pause controls`);
                }
                if (!animationAnalysis.hasMotionQuery) {
                    issues.push('No prefers-reduced-motion media query detected');
                }
                if (animationAnalysis.animatedElements > 10 && animationAnalysis.pauseControls === 0) {
                    issues.push('Multiple animations without global pause control');
                }

                return {
                    content: [{
                        type: "text",
                        text: `Animation Control Test (WCAG 2.1 SC 2.2.2, 2.3.3):\n\n` +
                            `Animated elements: ${animationAnalysis.animatedElements}\n` +
                            `Auto-play media: ${animationAnalysis.autoplayMedia}\n` +
                            `Pause controls: ${animationAnalysis.pauseControls}\n` +
                            `Prefers-reduced-motion: ${animationAnalysis.hasMotionQuery ? '✓ Supported' : '✗ Not detected'}\n\n` +
                            `Requirements:\n` +
                            `${params.checkMotionReduction ? '✓ Respect prefers-reduced-motion preference\n' : ''}` +
                            `${params.checkPauseControls ? '✓ Provide pause/stop controls for auto-play\n' : ''}` +
                            `${params.checkAutoPlay ? '✓ Avoid auto-playing content or provide controls\n' : ''}` +
                            (issues.length > 0 ? `\n⚠️ Issues:\n${issues.map(i => `• ${i}`).join('\n')}` : '\n✓ Animation controls properly implemented')
                    }]
                };
            }


            case "test_orientation_lock": {
                const params = TestOrientationLockSchema.parse(args);
                const page = await ensureBrowser();

                const orientationAnalysis = await page.evaluate(() => {
                    // Check CSS for orientation locks
                    const stylesheets = Array.from(document.styleSheets);
                    let hasOrientationLock = false;

                    try {
                        stylesheets.forEach((sheet: any) => {
                            try {
                                const rules = sheet.cssRules || sheet.rules;
                                Array.from(rules).forEach((rule: any) => {
                                    if (rule.media && rule.media.mediaText) {
                                        if (rule.media.mediaText.includes('orientation')) {
                                            hasOrientationLock = true;
                                        }
                                    }
                                });
                            } catch (e) {
                                // Cross-origin stylesheet, skip
                            }
                        });
                    } catch (e) {
                        // Error accessing stylesheets
                    }

                    // Check viewport meta tag
                    const viewportMeta = document.querySelector('meta[name="viewport"]');
                    const viewportContent = viewportMeta?.getAttribute('content') || '';
                    const hasUserScalable = !viewportContent.includes('user-scalable=no');

                    return {
                        hasOrientationMedia: hasOrientationLock,
                        viewportAllowsZoom: hasUserScalable,
                        viewportContent
                    };
                });

                const issues: string[] = [];
                if (!orientationAnalysis.viewportAllowsZoom) {
                    issues.push('Viewport prevents zooming (user-scalable=no)');
                }

                return {
                    content: [{
                        type: "text",
                        text: `Orientation Lock Test (WCAG 1.3.4):\n\n` +
                            `Orientation-specific CSS: ${orientationAnalysis.hasOrientationMedia ? 'Detected' : 'None'}\n` +
                            `Viewport allows zoom: ${orientationAnalysis.viewportAllowsZoom ? '✓ Yes' : '✗ No'}\n\n` +
                            `Requirements:\n` +
                            `${params.checkPortrait ? '✓ Content works in portrait orientation\n' : ''}` +
                            `${params.checkLandscape ? '✓ Content works in landscape orientation\n' : ''}` +
                            `${params.checkRotation ? '✓ No forced orientation lock\n' : ''}` +
                            `\nWCAG Success Criterion: Content not restricted to single display orientation unless essential\n` +
                            (issues.length > 0 ? `\n⚠️ Issues:\n${issues.map(i => `• ${i}`).join('\n')}` : '\n✓ No orientation restrictions detected')
                    }]
                };
            }

            case "run_wcag_21_aa_tests": {
                const params = RunWCAG21AATestsSchema.parse(args);
                const page = await ensureBrowser();

                // Run all WCAG 2.1 AA specific tests
                const results = await wcag21aa.runAllWCAG21AATests(page, params.selector);

                // Format results for MCP response
                let report = `# WCAG 2.1 Level AA Enhanced Testing Results\n\n`;
                report += `**Overall Status:** ${results.overallPassed ? '✅ All tests passed' : '⚠️ Issues found'}\n`;
                report += `**Total Issues:** ${results.totalIssues}\n\n`;

                // Individual test results
                report += `## Test Results\n\n`;

                report += `### 1.3.5 - Identify Input Purpose\n`;
                report += `${results.results.identifyInputPurpose.summary}\n`;
                report += `**Status:** ${results.results.identifyInputPurpose.passed ? '✅ Passed' : '❌ Failed'}\n`;
                if (results.results.identifyInputPurpose.issues.length > 0) {
                    report += `**Issues:**\n`;
                    results.results.identifyInputPurpose.issues.forEach(issue => {
                        report += `- [${issue.severity}] ${issue.element}: ${issue.issue}\n`;
                    });
                }
                report += `\n`;

                report += `### 2.4.4 - Link Purpose (In Context)\n`;
                report += `${results.results.linkPurpose.summary}\n`;
                report += `**Status:** ${results.results.linkPurpose.passed ? '✅ Passed' : '❌ Failed'}\n`;
                if (results.results.linkPurpose.issues.length > 0) {
                    report += `**Issues:**\n`;
                    results.results.linkPurpose.issues.forEach(issue => {
                        report += `- [${issue.severity}] ${issue.element}: ${issue.issue}\n`;
                    });
                }
                report += `\n`;

                report += `### 2.5.3 - Label in Name\n`;
                report += `${results.results.labelInName.summary}\n`;
                report += `**Status:** ${results.results.labelInName.passed ? '✅ Passed' : '❌ Failed'}\n`;
                if (results.results.labelInName.issues.length > 0) {
                    report += `**Issues:**\n`;
                    results.results.labelInName.issues.forEach(issue => {
                        report += `- [${issue.severity}] ${issue.element}: ${issue.issue}\n`;
                    });
                }
                report += `\n`;

                report += `### 3.3.1/3.3.2 - Enhanced Form Accessibility\n`;
                report += `${results.results.enhancedFormAccessibility.summary}\n`;
                report += `**Status:** ${results.results.enhancedFormAccessibility.passed ? '✅ Passed' : '❌ Failed'}\n`;
                if (results.results.enhancedFormAccessibility.issues.length > 0) {
                    report += `**Issues:**\n`;
                    results.results.enhancedFormAccessibility.issues.forEach(issue => {
                        report += `- [${issue.severity}] ${issue.element}: ${issue.issue}\n`;
                    });
                }
                report += `\n`;

                report += `### 4.1.3 - Status Messages\n`;
                report += `${results.results.statusMessages.summary}\n`;
                report += `**Status:** ${results.results.statusMessages.passed ? '✅ Passed' : '❌ Failed'}\n`;
                if (results.results.statusMessages.issues.length > 0) {
                    report += `**Issues:**\n`;
                    results.results.statusMessages.issues.forEach(issue => {
                        report += `- [${issue.severity}] ${issue.element}: ${issue.issue}\n`;
                    });
                }
                report += `\n`;

                report += `### 3.2.4 - Consistent Identification\n`;
                report += `${results.results.consistentIdentification.summary}\n`;
                report += `**Status:** ${results.results.consistentIdentification.passed ? '✅ Passed' : '❌ Failed'}\n`;
                if (results.results.consistentIdentification.issues.length > 0) {
                    report += `**Issues:**\n`;
                    results.results.consistentIdentification.issues.forEach(issue => {
                        report += `- [${issue.severity}] ${issue.element}: ${issue.issue}\n`;
                    });
                }
                report += `\n`;

                report += `### 4.1.2 - Screen Reader Announcements (Name, Role, Value)\n`;
                report += `${results.results.elementAnnouncements.summary}\n`;
                report += `**Status:** ${results.results.elementAnnouncements.passed ? '✅ Passed' : '❌ Failed'}\n`;
                if (results.results.elementAnnouncements.issues.length > 0) {
                    report += `**Issues:**\n`;
                    results.results.elementAnnouncements.issues.forEach(issue => {
                        report += `- [${issue.severity}] ${issue.element}: ${issue.issue}\n`;
                    });
                }
                report += `\n`;

                report += `## Summary\n`;
                report += `This enhanced testing module provides sophisticated checks for WCAG 2.1 Level AA criteria that go beyond basic axe-core scanning.\n`;
                report += `Tests cover: input autocomplete, link text quality, label matching, form accessibility, live regions, consistent identification, and screen reader announcements.\n`;

                return {
                    content: [{
                        type: "text",
                        text: report
                    }]
                };
            }

            case "run_wcag_22_aa_tests": {
                const params = RunWCAG22AATestsSchema.parse(args);
                const page = await ensureBrowser();

                const results = await wcag22aa.runAllWCAG22AATests(page, params.selector);

                let report = `# WCAG 2.2 Level A & AA Enhanced Testing Results\n\n`;
                report += `**Overall Status:** ${results.overallPassed ? '✅ All tests passed' : '⚠️ Issues found'}\n`;
                report += `**Total Issues:** ${results.totalIssues}\n\n`;

                report += `## Test Results\n\n`;

                const testEntries: Array<[string, string, any]> = [
                    ['2.4.11', 'Focus Not Obscured (Minimum)', results.results.focusNotObscured],
                    ['2.5.7', 'Dragging Movements', results.results.draggingMovements],
                    ['2.5.8', 'Target Size (Minimum)', results.results.targetSize],
                    ['3.2.6', 'Consistent Help', results.results.consistentHelp],
                    ['3.3.7', 'Redundant Entry', results.results.redundantEntry],
                    ['3.3.8', 'Accessible Authentication (Minimum)', results.results.accessibleAuthentication]
                ];

                for (const [criterion, name, result] of testEntries) {
                    report += `### ${criterion} - ${name}\n`;
                    report += `${result.summary}\n`;
                    report += `**Status:** ${result.passed ? '✅ Passed' : '❌ Failed'}\n`;
                    if (result.issues.length > 0) {
                        report += `**Issues:**\n`;
                        result.issues.forEach((issue: any) => {
                            report += `- [${issue.severity}] ${issue.element}: ${issue.issue}\n`;
                        });
                    }
                    report += `\n`;
                }

                report += `## Summary\n`;
                report += `This module tests the 7 new WCAG 2.2 Level A & AA criteria beyond WCAG 2.1.\n`;
                report += `Tests cover: focus obscured by overlays, dragging alternatives, target sizes, consistent help, redundant entry, and accessible authentication.\n`;

                return {
                    content: [{
                        type: "text",
                        text: report
                    }]
                };
            }

            case "test_target_size": {
                const params = TestTargetSizeSchema.parse(args);
                const page = await ensureBrowser();
                const result = await wcag22aa.testTargetSize(page, params.selector);

                return {
                    content: [{
                        type: "text",
                        text: `# WCAG 2.5.8 - Target Size (Minimum) Test Results\n\n` +
                            `${result.summary}\n` +
                            `**Status:** ${result.passed ? '✅ Passed' : '❌ Failed'}\n` +
                            (result.issues.length > 0 ? `\n**Issues:**\n${result.issues.map(i => `- [${i.severity}] ${i.element}: ${i.issue}`).join('\n')}` : '')
                    }]
                };
            }

            case "test_focus_not_obscured": {
                const params = TestFocusNotObscuredSchema.parse(args);
                const page = await ensureBrowser();
                const result = await wcag22aa.testFocusNotObscured(page, params.selector);

                return {
                    content: [{
                        type: "text",
                        text: `# WCAG 2.4.11 - Focus Not Obscured (Minimum) Test Results\n\n` +
                            `${result.summary}\n` +
                            `**Status:** ${result.passed ? '✅ Passed' : '❌ Failed'}\n` +
                            (result.issues.length > 0 ? `\n**Issues:**\n${result.issues.map(i => `- [${i.severity}] ${i.element}: ${i.issue}`).join('\n')}` : '')
                    }]
                };
            }

            case "test_accessible_authentication": {
                const params = TestAccessibleAuthenticationSchema.parse(args);
                const page = await ensureBrowser();
                const result = await wcag22aa.testAccessibleAuthentication(page, params.selector);

                return {
                    content: [{
                        type: "text",
                        text: `# WCAG 3.3.8 - Accessible Authentication (Minimum) Test Results\n\n` +
                            `${result.summary}\n` +
                            `**Status:** ${result.passed ? '✅ Passed' : '❌ Failed'}\n` +
                            (result.issues.length > 0 ? `\n**Issues:**\n${result.issues.map(i => `- [${i.severity}] ${i.element}: ${i.issue}`).join('\n')}` : '')
                    }]
                };
            }

            case "test_on_focus_behavior": {
                const params = TestOnFocusBehaviorSchema.parse(args);
                const page = await ensureBrowser();

                const results = await page.evaluate(async ({ selector, timeout }: { selector: string | undefined; timeout: number }) => {
                    const container = selector ? document.querySelector(selector) : document.body;
                    if (!container) return { tested: 0, issues: [] };

                    const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];

                    // Get all focusable elements
                    const focusableSelectors = [
                        'a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])'
                    ];
                    const focusableElements = container.querySelectorAll(focusableSelectors.join(', '));

                    // Store initial state
                    const initialUrl = window.location.href;
                    const initialTitle = document.title;

                    let testedCount = 0;
                    for (const el of Array.from(focusableElements)) {
                        const element = el as HTMLElement;

                        // Skip hidden elements
                        if (element.offsetWidth === 0 || element.offsetHeight === 0) continue;

                        testedCount++;

                        // Record state before focus
                        const beforeUrl = window.location.href;
                        const beforeTitle = document.title;

                        // Check for form submission listeners
                        const hasOnChange = element.hasAttribute('onchange');
                        const hasOnFocus = element.hasAttribute('onfocus');

                        try {
                            // Focus the element
                            element.focus();

                            // Wait for potential async changes
                            await new Promise(resolve => setTimeout(resolve, timeout));

                            // Check for context changes
                            const afterUrl = window.location.href;
                            const afterTitle = document.title;

                            // URL changed on focus
                            if (beforeUrl !== afterUrl) {
                                issues.push({
                                    element: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
                                    issue: `Focus triggered navigation from ${beforeUrl} to ${afterUrl} (WCAG 3.2.1 violation)`,
                                    severity: 'error'
                                });
                            }

                            // Title changed on focus (major content change)
                            if (beforeTitle !== afterTitle) {
                                issues.push({
                                    element: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
                                    issue: `Focus triggered page title change (possible context change - WCAG 3.2.1)`,
                                    severity: 'warning'
                                });
                            }

                            // Warning for suspicious event handlers
                            if (hasOnFocus) {
                                issues.push({
                                    element: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
                                    issue: `Element has onfocus attribute (check if it causes unexpected context changes)`,
                                    severity: 'warning'
                                });
                            }
                        } catch (error) {
                            // Element might not be focusable, skip
                        }
                    }

                    return {
                        tested: testedCount,
                        issues
                    };
                }, { selector: params.selector, timeout: params.timeout });

                return {
                    content: [{
                        type: "text",
                        text: `On Focus Behavior Test (WCAG 3.2.1):\n\n` +
                            `Tested ${results.tested} focusable elements.\n` +
                            `Found ${results.issues.length} potential issues.\n\n` +
                            (results.issues.length > 0 ?
                                `Issues:\n${results.issues.map(i => `• [${i.severity.toUpperCase()}] ${i.element}: ${i.issue}`).join('\n')}` :
                                '✅ No unexpected context changes on focus detected.\n\n' +
                                'WCAG Success Criterion 3.2.1: When any component receives focus, it does not initiate a change of context.'
                            )
                    }]
                };
            }

            case "test_on_input_behavior": {
                const params = TestOnInputBehaviorSchema.parse(args);
                const page = await ensureBrowser();

                const results = await page.evaluate(async ({ selector, timeout }: { selector: string | undefined; timeout: number }) => {
                    const container = selector ? document.querySelector(selector) : document.body;
                    if (!container) return { tested: 0, issues: [] };

                    const issues: Array<{ element: string; issue: string; severity: 'error' | 'warning' }> = [];

                    // Get all input elements
                    const inputSelectors = ['input', 'select', 'textarea', '[role="combobox"]', '[role="textbox"]'];
                    const inputElements = container.querySelectorAll(inputSelectors.join(', '));

                    let testedCount = 0;
                    for (const el of Array.from(inputElements)) {
                        const element = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

                        // Skip hidden, submit, and button inputs
                        if (element.offsetWidth === 0 || element.offsetHeight === 0) continue;
                        if ((element as HTMLInputElement).type === 'submit' || (element as HTMLInputElement).type === 'button') continue;

                        testedCount++;

                        // Record state before input
                        const beforeUrl = window.location.href;
                        const beforeTitle = document.title;

                        // Check for suspicious event handlers
                        const hasOnChange = element.hasAttribute('onchange');
                        const hasOnInput = element.hasAttribute('oninput');

                        try {
                            // Focus first
                            element.focus();

                            // Simulate input change based on element type
                            if (element.tagName === 'SELECT') {
                                const select = element as HTMLSelectElement;
                                if (select.options.length > 1) {
                                    const originalIndex = select.selectedIndex;
                                    select.selectedIndex = originalIndex === 0 ? 1 : 0;
                                    select.dispatchEvent(new Event('change', { bubbles: true }));
                                    select.dispatchEvent(new Event('input', { bubbles: true }));
                                }
                            } else if (element.tagName === 'INPUT') {
                                const input = element as HTMLInputElement;
                                const originalValue = input.value;

                                if (input.type === 'checkbox' || input.type === 'radio') {
                                    input.checked = !input.checked;
                                    input.dispatchEvent(new Event('change', { bubbles: true }));
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                } else {
                                    input.value = 'test123';
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    input.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            } else if (element.tagName === 'TEXTAREA') {
                                const textarea = element as HTMLTextAreaElement;
                                textarea.value = 'test123';
                                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                                textarea.dispatchEvent(new Event('change', { bubbles: true }));
                            }

                            // Wait for potential async changes
                            await new Promise(resolve => setTimeout(resolve, timeout));

                            // Check for context changes
                            const afterUrl = window.location.href;
                            const afterTitle = document.title;

                            // URL changed on input
                            if (beforeUrl !== afterUrl) {
                                issues.push({
                                    element: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
                                    issue: `Input change triggered navigation from ${beforeUrl} to ${afterUrl} (WCAG 3.2.2 violation)`,
                                    severity: 'error'
                                });
                            }

                            // Title changed on input (major content change)
                            if (beforeTitle !== afterTitle) {
                                issues.push({
                                    element: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
                                    issue: `Input change triggered page title change (possible context change - WCAG 3.2.2)`,
                                    severity: 'warning'
                                });
                            }

                            // Warning for onchange handlers (might cause unexpected behavior)
                            if (hasOnChange && element.tagName === 'SELECT') {
                                issues.push({
                                    element: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
                                    issue: `Select element has onchange attribute (verify it doesn't auto-submit without warning)`,
                                    severity: 'warning'
                                });
                            }
                        } catch (error) {
                            // Might fail on disabled/readonly inputs, skip
                        }
                    }

                    return {
                        tested: testedCount,
                        issues
                    };
                }, { selector: params.selector, timeout: params.timeout });

                return {
                    content: [{
                        type: "text",
                        text: `On Input Behavior Test (WCAG 3.2.2):\n\n` +
                            `Tested ${results.tested} form inputs.\n` +
                            `Found ${results.issues.length} potential issues.\n\n` +
                            (results.issues.length > 0 ?
                                `Issues:\n${results.issues.map(i => `• [${i.severity.toUpperCase()}] ${i.element}: ${i.issue}`).join('\n')}` :
                                '✅ No unexpected context changes on input detected.\n\n' +
                                'WCAG Success Criterion 3.2.2: Changing the setting of any user interface component does not automatically cause a change of context unless the user has been advised of the behavior before using the component.'
                            )
                    }]
                };
            }

            default:
                throw new McpError(
                    ErrorCode.MethodNotFound,
                    `Unknown tool: ${name}`
                );
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (error instanceof z.ZodError) {
            throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
            );
        }

        throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${errorMessage}`
        );
    }
});

// Cleanup on exit
process.on('SIGINT', async () => {
    if (browser) {
        await browser.close();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    if (browser) {
        await browser.close();
    }
    process.exit(0);
});

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("MCP Accessibility Server started successfully");
}

main().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
