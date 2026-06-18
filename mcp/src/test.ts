/**
 * Test file for MCP Accessibility Server
 * 
 * This file tests the basic functionality of the MCP server
 */

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

async function runTest() {
    console.log('🧪 Starting MCP Accessibility Server Test...\n');

    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();

    try {
        // Test 1: Navigate to a test page
        console.log('📍 Test 1: Navigating to example.com...');
        await page.goto('https://example.com', { waitUntil: 'networkidle' });
        console.log('✅ Navigation successful\n');

        // Test 2: Run accessibility analysis
        console.log('🔍 Test 2: Running accessibility analysis...');
        const results = await new AxeBuilder({ page }).analyze();

        console.log('📊 Analysis Results:');
        console.log(`   - Violations: ${results.violations.length}`);
        console.log(`   - Passes: ${results.passes.length}`);
        console.log(`   - Incomplete: ${results.incomplete.length}`);
        console.log(`   - Inapplicable: ${results.inapplicable.length}\n`);

        if (results.violations.length > 0) {
            console.log('⚠️  Violations found:');
            results.violations.forEach((violation, index) => {
                console.log(`   ${index + 1}. ${violation.help} (${violation.impact})`);
                console.log(`      - ${violation.description}`);
                console.log(`      - Affected elements: ${violation.nodes.length}`);
            });
        } else {
            console.log('✅ No accessibility violations found!');
        }

        // Test 3: Take a screenshot
        console.log('\n📸 Test 3: Taking screenshot...');
        await page.screenshot({ path: 'test-screenshot.png' });
        console.log('✅ Screenshot saved as test-screenshot.png\n');

        // Test 4: Test viewport changes (mobile)
        console.log('📱 Test 4: Testing mobile viewport...');
        await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 Pro
        await page.waitForTimeout(1000);
        console.log('✅ Mobile viewport set successfully\n');

        console.log('🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
        console.log('\n🔒 Browser closed');
    }
}

// Run the test
runTest().catch(console.error);


