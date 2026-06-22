---
name: a11y-scan
description: |
  End-to-end accessibility audit scan with iterative fixing. Orchestrates page analysis, WCAG 2.2 scanning, fix implementation, and JIRA integration.
  Triggers: "accessibility scan", "a11y scan", "a11y audit", "wcag scan", "wcag 2.2 scan".
---

## Syntax - Initiate the a11y audit scan - $1 <URL> $2 [JIRA_TICKET] $3 [USERNAME] $4 [PASSWORD] $5 [--wcag 2.1|2.2]
```bash
/a11y-scan <URL> [JIRA_TICKET] [USERNAME] [PASSWORD] [--wcag 2.1|2.2]
```

## Parameters
- `URL` (required): The page URL to audit (e.g., `http://localhost:3000/myapp/student-list`)
- `JIRA_TICKET` (optional): JIRA ticket ID for adding reports (e.g., `PROJ-123`)
- `USERNAME` (optional): Username for page authentication (overrides .env)
- `PASSWORD` (optional): Password for page authentication (overrides .env)
- `--wcag` (optional): WCAG version. Default: `2.2`. Use `--wcag 2.1` for WCAG 2.1 scanning only

**Parameter Behavior:**
- If USERNAME and PASSWORD provided: Use these credentials for authentication
- If omitted: Fall back to PLAYWRIGHT_USER and PLAYWRIGHT_PASSWORD from .env
- If neither provided and page requires auth: Prompt user for credentials

## Purpose
Orchestrates end-to-end accessibility testing workflow with iterative re-scanning and manual JIRA updates.

**Workflow:** Login → Analyze Page → Scan → Review → Fix (iterative) → Final Scan → Review → Summary

---

## Report Organization & Identifier Determination

**BEFORE PHASE 1 STARTS**, determine the identifier for organizing reports and screenshots:

### If JIRA_TICKET Parameter Provided
```
identifier = JIRA_TICKET (e.g., "A11Y-450")
has_jira_ticket = true
Enable JIRA integration (comments, sub-tasks, updates)
```

### If NO JIRA_TICKET Parameter
Present organization benefits to user and request keyword:

```
📁 REPORT ORGANIZATION

ℹ️ No JIRA ticket provided. Reports and screenshots will be organized in folders for easier management.

**Benefits of folder organization:**
✅ Easy to find all files for this scan
✅ Simple cleanup (delete one folder when done)
✅ Better for multiple scans (no file mixing)
✅ Organized screenshot management (especially important for page analysis)
✅ Clear grouping of versioned reports (v1, v2, vFINAL)

**Without organization (flat structure):**
❌ All files mixed in one directory
❌ Hard to find related files later
❌ Cleanup requires finding dozens of matching files
❌ Gets messy with multiple scans
❌ Screenshots scattered across directory

Please provide a keyword for organizing this scan's files.
**Examples:** 'student-list', 'dashboard-v2', 'sprint-45', 'myapp-filters'

**Or press Enter** to use auto-generated: '{module}-scan'
(e.g., 'student-list-scan' from URL path)

Keyword: _____
```

**WAIT for user input**

#### User Provides Keyword
```
identifier = user_keyword (e.g., "sprint-45-dashboard")
has_jira_ticket = false
Disable JIRA integration (no comments, sub-tasks disabled)
```

#### User Presses Enter (Empty Input)
```
Extract module from URL path (last segment)
identifier = "{module}-scan" (e.g., "student-list-scan")
has_jira_ticket = false
Disable JIRA integration
```

### Create Directory Structure
```bash
# Create organized directory structure
mkdir -p accessibility-reports/{identifier}/screenshots

# Store in WORKFLOW_STATE
report_directory = "accessibility-reports/{identifier}/"
screenshot_directory = "accessibility-reports/{identifier}/screenshots/"
```

### File Organization Pattern
```
accessibility-reports/
└── {identifier}/              # JIRA ticket, user keyword, or auto-generated
    ├── page-analysis-{timestamp}.md
    ├── scan-v1-{timestamp}.md
    ├── scan-v1-{timestamp}.json
    ├── scan-v2-{timestamp}.md         (if interim re-scans)
    ├── scan-v2-{timestamp}.json
    ├── scan-vFINAL-{timestamp}.md
    ├── scan-vFINAL-{timestamp}.json
    └── screenshots/
        ├── analysis-initial-{timestamp}.png
        ├── analysis-filter-button-{timestamp}.png
        ├── analysis-outreach-modal-{timestamp}.png
        ├── before-{timestamp}.png
        └── after-{timestamp}.png
```

### JIRA Integration Logic
```
Throughout ALL phases, before ANY JIRA operation:
  if (has_jira_ticket === false) {
    Skip JIRA operation
    Continue workflow
  } else {
    Proceed with JIRA operation (add comment, create sub-task, etc.)
  }
```

**JIRA Operations That Require Check:**
- Phase 1, Step 6: Add initial scan comment to JIRA
- Phase 3: Create sub-tasks for escalated issues
- Phase 3/4: Add "new issues discovered" comments
- Phase 5: Add final QA summary comment to JIRA

**Operations That Always Run (No JIRA Dependency):**
- All scanning operations
- All fix implementations
- All report generation
- All screenshot captures
- File organization and storage

---

## Quick Reference

**Phases:**
1. INITIATE - Scan & Report (JIRA comment: Initial issues)
2. REVIEW & PLAN - Analyze & Optimize fixes
3. IMPLEMENT - Apply fixes (JIRA comment: New issues if found)
4. RE-SCAN - Validate fixes
5. FINALIZE - Generate summary (JIRA comment: Final summary)

**JIRA Comments:** 3 total (Initial scan, New issues discovered, Final summary)
**Sub-tasks:** User discretion (requires preview approval before creation)
**Commits:** User's responsibility (NOT part of workflow)
**Screenshots:** Manual upload by user (workflow provides paths)

---

## Phase Roles

### Phase 1: INITIATE - Scan & Report
**Role:** Discovery & Documentation
- Scan page for all WCAG issues (version per --wcag flag) (A, AA, AAA, best practices)
- Generate initial reports (MD + JSON)
- Add initial findings to JIRA (brief comment)

### Phase 2: REVIEW & PLAN
**Role:** Analysis & Fix Planning
- Analyze discovered issues
- Classify scope (page-specific vs shared components)
- Self-review each proposed fix against `agents/a11y-fix-rules.md` before presenting
- Prioritize WCAG AA issues, make AAA optional

### Phase 3: IMPLEMENT
**Role:** Fixing & Validation
- Apply approved fixes (manual or auto mode)
- Track changes (no commits in this phase)
- Re-scan after fix batches to validate progress
- Create sub-tasks at user's discretion

### Phase 4: RE-SCAN & VALIDATE
**Role:** Verification & Comparison
- Final comprehensive accessibility scan
- Compare initial vs final results
- Identify any new issues introduced
- Validate fix success rate

### Phase 5: FINALIZE
**Role:** Documentation & Summary
- Review all changes made (no commits)
- Generate final QA summary for JIRA
- User manually uploads screenshots to JIRA
- Add comprehensive JIRA comment with testing scope

---

## PHASE BOUNDARY ENFORCEMENT (CRITICAL)

**YOU MUST follow this process at the END of EVERY phase:**

1. **Show Verification Checklist** - Display the phase verification checklist to user VERBATIM (every checkbox)
2. **Preview /double-check** - Show what you will verify, then ask: "Run /double-check to verify completion? (yes/no)"
3. **Wait for /double-check decision** - If yes, run it and show results. If no, skip to next step.
4. **STOP and WAIT** - Do NOT proceed until user explicitly types **'proceed'** (not 'yes', not 'ok', must be 'proceed')
5. **Mark Phase Complete** - Only mark `phase_X_complete = true` AFTER receiving 'proceed' command

**WHY THIS IS CRITICAL:**
- Prevents skipping steps (screenshots, JIRA updates, etc.)
- Ensures user reviews completion before continuing
- Creates explicit decision points in workflow
- Makes workflow state transparent and verifiable

**FAILURE TO FOLLOW = WORKFLOW FAILURE**

---

## MANDATORY REVIEW PATTERN (APPLIES TO EVERY TASK)

YOU MUST follow this pattern for EVERY change:

1. **Implement** the specific change
2. **STOP** - Present code changes to user
3. **WAIT** - Do not proceed until user provides feedback
4. **Track** change (do NOT commit - user commits separately)
5. **Verify** with /double-check after batch completion
6. **Mark Complete** only after verification passes

YOU MUST NEVER:
- Skip any step in this pattern
- Commit code during workflow (user commits separately)
- Assume approval
- Mark tasks complete without verification
- Proceed past errors without explicit permission

---

## ERROR HANDLING PROTOCOL

When ANY error occurs:

1. **STOP IMMEDIATELY** - Do not continue workflow
2. **Document Error** - Capture full error message and context
3. **Classify Error**:
   - Authentication Error → Request re-authentication
   - Token/Permission Error → Request user intervention
   - Tool/MCP Error → Request tool restart or alternative
   - Network Error → Request retry permission
   - Browser Visibility Error → Ask user to verify browser state
   - Upload Error → Check token and offer retry
   - Unknown Error → Ask for guidance

4. **Present to User**:
   ```
   ⚠️ WORKFLOW STOPPED - ERROR ENCOUNTERED

   Phase: [Current phase name]
   Task: [Specific task being performed]
   Error Type: [Classification from above]
   Error Message: [Full error text]

   Options:
   1. Re-authenticate (for auth errors)
   2. Retry operation (for transient errors)
   3. Skip this step (requires explicit permission)
   4. Abort workflow

   What would you like me to do?
   ```

5. **WAIT** - Do not proceed without explicit user decision

YOU MUST NEVER:
- Silently skip steps due to errors
- Assume user wants to continue
- Mark incomplete tasks as complete
- Make decisions about error recovery without permission

---

## AUTHENTICATION STATE MANAGEMENT

Track authentication state across workflow phases:

### Initial Authentication (Phase 1)
1. Ask if authentication needed (once only)
2. If yes: Execute automated OR manual login (once only)
3. Set `AUTHENTICATED = true`
4. Session persists in accessibility MCP browser for all phases

### Subsequent Phases
1. NEVER re-authenticate if `AUTHENTICATED = true`
2. If session expires (detected via URL redirect):
   - Warn user
   - Ask: "Re-authenticate? (yes/no)"
   - If yes: Use SAME method as initial (automated/manual)

### State Verification
Before each phase, verify:
- [ ] Authentication state is current
- [ ] No unnecessary login attempts
- [ ] User credentials never re-requested unless session expired

---

## BROWSER VISIBILITY & STATE VERIFICATION

### Before Any Browser Interaction:
Ask user for verification instead of assuming:

```
🔍 BROWSER CHECK REQUIRED

Before I [navigate/scan/screenshot], please verify:

Current Task: [What I'm about to do]
Expected State: [What browser should show]

Please check:
□ Browser window is visible
□ Page is loaded
□ No error messages displayed
□ Logged in (if authentication required)

Is everything ready? (yes/no/open-browser/refresh)
```

### User Response Handling:
- **yes**: Proceed with task
- **no**: Ask "What's wrong? I'll wait while you fix it."
- **open-browser**: Run browser open command, ask again
- **refresh**: Refresh page, wait, ask again

### Never Assume Browser Issues:
DO NOT assume:
- Browser crashed (ask user to verify)
- Page failed to load (ask user to check)
- Authentication expired (ask user to verify login)
- Network error (ask user if they see error)

ALWAYS ask user to visually confirm browser state before diagnosing issues.

### Browser Error Recovery:
If MCP tool returns error (not user-reported):

```
⚠️ BROWSER TOOL ERROR

Error: [Error message]
Task: [What I was trying to do]

This might mean:
1. Browser needs restart
2. Page didn't load correctly
3. Tool connection issue

Can you check the browser window and tell me what you see?
Then I'll know how to proceed.
```

**WAIT** for user diagnosis before taking action.

---

## WORKFLOW STATE TRACKING

Maintain state throughout workflow to prevent mistakes:

### State Variables
```javascript
WORKFLOW_STATE = {
  // WCAG version
  wcag_version: null, // Set from --wcag flag, default '2.2'

  // Report organization
  identifier: null, // JIRA ticket, user keyword, or auto-generated
  has_jira_ticket: false, // true if JIRA ticket provided
  report_directory: null, // "accessibility-reports/{identifier}/"
  screenshot_directory: null, // "accessibility-reports/{identifier}/screenshots/"

  // Authentication
  authenticated: false,
  session_start: null,

  // Workflow mode
  mode: null, // 'manual' | 'auto' (selected at Phase 2)

  // Phase tracking
  current_phase: null,
  phase_1_complete: false,
  phase_2_complete: false,
  phase_3_complete: false,
  phase_4_complete: false,
  phase_5_complete: false,

  // Page Analysis (Phase 1, Step 4)
  page_analysis: {
    complete: false,
    initial_state: null, // Initial accessibility tree and elements
    elements_discovered: [], // All interactive elements found
    dependency_map: [], // Element relationships
    interaction_plan: null, // User-approved plan
    interactions_executed: [], // List of executed interactions with outcomes
    report_path: null, // Path to page-analysis-{timestamp}.md
    screenshots: [] // Paths to all analysis screenshots
  },

  // Changes tracking (for deferred commits)
  changes: {
    files_modified: [],
    fixes_applied: [],
    lines_changed: {added: 0, removed: 0},
    ready_for_commit: false
  },

  // Scanning
  scan_versions: [], // ['v1', 'v2', 'v3', 'vFINAL']
  current_version: 'v1',
  last_scan_results: {},

  // JIRA
  jira_ticket: null,
  jira_updates: [], // Track all JIRA actions
  jira_subtasks_created: [],

  // Screenshots
  screenshot_before: null,
  screenshot_after: null,

  // Reports
  reports_generated: [],

  // Browser state
  browser_visible: null, // Track user confirmations
  last_browser_check: null,

  // Errors
  errors_encountered: []
}
```

### State Updates
Update state after EVERY action:
- Identifier determination: Set `identifier`, `has_jira_ticket`, `report_directory`, `screenshot_directory`
- Authentication: Set `authenticated = true`
- Page analysis: Update `page_analysis` fields as elements discovered and interactions executed
- Phase completion: Set `phase_X_complete = true` ONLY after verification
- JIRA actions: Record confirmations (only if `has_jira_ticket === true`)
- Errors: Add to `errors_encountered` array
- Changes: Track all file modifications

### Authentication Rules
- Use accessibility MCP tools ONLY (never `/play-login`)
- Single browser context for entire workflow
- Manual login: open blank browser, user navigates/logs in, verify URL after
- Never close browser between phases

### State Verification
Before marking workflow complete:
```
FINAL WORKFLOW VERIFICATION

□ All 5 phases completed
□ All JIRA actions confirmed
□ All reports generated and uploaded (if selected)
□ Commit made and verified
□ Screenshots uploaded (if JIRA ticket)
□ No unresolved errors
□ User confirmed completion

/double-check confirms: [READY / NOT READY]
```

Workflow complete ONLY when ALL items checked.

---

## Workflow Phases

### Phase 1: INITIATE - Scan & Report

**Role:** Discovery & Documentation (see Phase Roles above)

**Steps:**
1. **Authentication** (if needed)
   - Ask user: "Does this page require authentication?"
   - If no: Skip to step 2
   - If yes: Ask: "Automated login or manual? (auto/manual)"

   **If automated:**
   - Show source: "Using credentials from [command parameters | .env]"
   - Open browser: `mcp__mcp-accessibility__open_browser()`
   - Login: `mcp__mcp-accessibility__login(username, password)`
   - Verify success via `get_page_info()` - check URL/title
   - Set `AUTHENTICATED = true`

   **If manual:**
   - Open blank browser: `mcp__mcp-accessibility__open_browser()`
   - Show: "Chromium browser opened. Please navigate to [URL] and login. Type 'ready' when done."
   - Wait for user confirmation
   - Verify with `get_page_info()` - check URL matches expected
   - If URL wrong: Ask "URL mismatch. Retry? (yes/no)"
   - Set `AUTHENTICATED = true`

2. **Credential Loading** (for automated login only)
   - Check if USERNAME and PASSWORD were provided as command parameters
   - If yes: Use provided credentials for authentication
   - If no: Silently load from .env file (source .env or use dotenv)
   - Verify credentials are available (either from params or .env)
   - Priority order: Command parameters > .env file > Prompt user
   - If missing from all sources, show brief error: "❌ No credentials provided. Use /a11y-scan URL TICKET USERNAME PASSWORD or set PLAYWRIGHT_USER/PLAYWRIGHT_PASSWORD in .env"

3. **Browser Visibility Check**
   Before scanning, verify browser state with user (see Browser Visibility section above)

4. **PAGE ANALYSIS** (Intelligent Interactive Element Discovery)

   **Purpose:** Discover ALL interactive elements and their states BEFORE scanning to ensure comprehensive accessibility testing of ALL UI states (modals, filters, conditional buttons, tooltips, etc.).

   **Substeps:**

   a. **Initial State Capture**
      - Take full-page screenshot → `{screenshot_directory}/analysis-initial-{timestamp}.png`
      - Get accessibility tree: `get_accessibility_tree()`
      - Get all interactive elements: `get_elements(type='all')`
      - Get semantic structure: `get_semantic_structure()`
      - Get landmarks: `get_landmarks()`
      - Store in `WORKFLOW_STATE.page_analysis.initial_state`

   b. **Load Page Analyzer Agent**
      - Read agent from `.claude/skills/a11y-scan/agents/a11y-page-analyzer.md`
      - Announce: "Analyzing page for interactive elements and dependencies..."

   c. **Element Discovery**
      - Identify ALL interactive element types:
        - Buttons (including disabled buttons that may be enabled)
        - Form fields (inputs, selects, checkboxes, radios)
        - Navigation elements (tabs, accordions, breadcrumbs, pagination)
        - Interactive widgets (modals/dialogs, tooltips, dropdowns, date pickers, sliders)
        - Dynamic content triggers ("Load more", "Show more", expandable cards)
      - Document each element: selector, type, current state, location
      - Store in `WORKFLOW_STATE.page_analysis.elements_discovered`

   d. **Dependency Analysis**
      - Build dependency graph showing relationships:
        - Prerequisites: "Element X (disabled) → Enabled by Element Y"
        - Triggers: "Element A → Opens Modal B (3 sub-elements)"
        - State changes: "Filter button → Enables Outreach button"
        - Sequences: "Must select dropdown before Next button enables"
      - Store in `WORKFLOW_STATE.page_analysis.dependency_map`

   e. **Interaction Sequence Planning**
      - Create execution plan with three categories:

        **PRIMARY INTERACTIONS (Must test):**
        - Elements revealing significant UI (modals, panels, sections)
        - State dependencies (disabled → enabled)
        - Elements from user requirements or bug reports

        **SECONDARY INTERACTIONS (Recommended):**
        - Tooltips and popovers
        - Expand/collapse states
        - Minor UI variations

        **EXCLUDED INTERACTIONS (Safety/Scope):**
        - Form submissions (unless requested)
        - Destructive actions (delete, remove, etc.)
        - Navigation away from page
        - Logout or session-ending actions

      - Order sequence logically:
        1. Non-dependent elements first
        2. Then prerequisite-dependent elements
        3. Then conditional elements (enabled after prerequisites)
        4. Finally nested elements (within modals, panels)

   f. **Present Analysis Plan to User**
      Show detailed plan following this format:
      ```
      📊 PAGE ANALYSIS COMPLETE

      **Page:** [Page Title]
      **URL:** [URL]

      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      DISCOVERED INTERACTIVE ELEMENTS

      **Total Found:** [N] interactive elements

      **By Type:**
      - Buttons: [N] ([M] disabled, may be enabled by actions)
      - Form Fields: [N]
      - Navigation: [N] (tabs, accordions, etc.)
      - Modals/Dialogs: [N] (triggers found)
      - Expandable Content: [N]
      - Other Widgets: [N]

      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      DEPENDENCY MAP

      **Key Relationships Identified:**

      1. [Element Name] → [What it reveals/enables]
      2. [Element Name] (disabled) → Enabled by [Action]
      3. [Element Name] → Reveals [Content]

      [List all significant dependencies...]

      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      PROPOSED INTERACTION SEQUENCE

      **PRIMARY INTERACTIONS (Must Test):**
      1. [Action] → [Expected Outcome]
         - Why: [Reason this is important for accessibility testing]

      [List all primary interactions...]

      **SECONDARY INTERACTIONS (Recommended):**
      1. [Action] → [Expected Outcome]

      [List secondary interactions...]

      **EXCLUDED INTERACTIONS (Safety/Scope):**
      - [Action]: [Reason excluded]

      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      EXECUTION SUMMARY

      **Total Interactions Proposed:** [N] primary + [M] secondary = [Total]
      **Screenshots to Capture:** [N] (one per primary interaction state)
      **Estimated Execution Time:** [X] minutes

      **Coverage Analysis:**
      This analysis will ensure we test:
      ✅ [Coverage area 1 - e.g., "Filter panel accessibility"]
      ✅ [Coverage area 2 - e.g., "Conditional button states"]
      ✅ [Coverage area 3 - e.g., "Modal dialog keyboard navigation"]

      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      USER APPROVAL REQUIRED

      Should we proceed with this interaction plan?

      Options:
      - yes: Execute all proposed interactions
      - no: Skip page analysis and proceed with scan of current state only
      - modify: Specify which interactions to skip or add

      Your choice: _____
      ```

   g. **WAIT for User Approval**
      - **MANDATORY WAIT** - Do NOT proceed until user responds
      - If user says "yes": Continue to substep h
      - If user says "no": Skip to Step 5 (Scan Page), set `page_analysis.complete = false`
      - If user says "modify": Ask for modifications, update plan, show updated plan, WAIT for approval again

   h. **Execute Approved Interactions**
      For each approved interaction (in sequence order):
      - Log start: `🔄 Executing: [interaction.description]`
      - Execute interaction (click, fill, hover, focus as appropriate)
      - Wait for state change: `wait_for_element()` or `wait(timeout)` as needed
      - Verify state change occurred
      - Take screenshot → `{screenshot_directory}/analysis-{element-name}-{timestamp}.png`
      - Log completion: `✅ Completed: [interaction.description]`
      - Add to `WORKFLOW_STATE.page_analysis.interactions_executed[]`
      - Store screenshot path

      **If Interaction Fails:**
      ```
      ⚠️ INTERACTION FAILED

      Interaction: [Description]
      Element: [Selector/Description]
      Error: [Error message]

      Options:
      1. Retry interaction
      2. Skip this interaction (continue with others)
      3. Abort page analysis (proceed with scan of current state)

      What would you like to do? _____
      ```
      **WAIT** for user decision before continuing.

   i. **Generate Page Analysis Report**
      Save detailed analysis report → `{report_directory}/page-analysis-{timestamp}.md`

      Report must include:
      - Executive summary (total elements, dependencies, interactions executed, execution time)
      - Complete interactive elements inventory
      - Dependency graph visualization
      - Interaction sequence executed (with screenshot paths)
      - Coverage analysis (what states were tested)
      - Artifacts generated (list of all screenshots)
      - Notes and observations

      Store path in `WORKFLOW_STATE.page_analysis.report_path`

   j. **Verification & State Update**
      Verify page analysis completion:
      ```
      ✅ INTERACTION EXECUTION COMPLETE

      Verification:
      □ Initial screenshot captured
      □ All [N] interactive elements identified and documented
      □ Dependency map created
      □ User approved interaction plan
      □ All [M] approved interactions executed successfully
      □ [M] state screenshots captured
      □ No errors encountered (or all errors handled)
      □ Page analysis report generated

      Ready to proceed with comprehensive accessibility scan.
      ```

      Set `WORKFLOW_STATE.page_analysis.complete = true`

   k. **CRITICAL CHECKPOINT**
      - Confirm ALL approved interactions were executed
      - Confirm ALL screenshots were captured
      - Confirm page analysis report was generated
      - If ANY item incomplete: STOP and resolve before continuing
      - Do NOT proceed to Step 5 until ALL items complete

5. **Scan Page** (Comprehensive Scan of ALL Discovered States)
   - Read agent from `.claude/skills/a11y-scan/agents/a11y-audit-guidelines.md`
   - Announce: "Starting comprehensive accessibility audit for [URL] covering all discovered states..."
   - Use a11y MCP tool to scan the page in its CURRENT state (with all interactions executed)
   - Apply audit rules from `.claude/skills/a11y-scan/agents/a11y-audit-guidelines.md`
   - Note in scan: "This scan includes analysis of [N] interactive states revealed during page analysis"

   ⚠️ **MANDATORY: You MUST execute ALL 10 phases from `.claude/skills/a11y-scan/agents/a11y-audit-guidelines.md` (Section: Comprehensive Testing Workflow)**

   This is NOT optional. The guidelines contain the complete testing workflow with 34+ tool calls.
   
   **What "comprehensive testing" means:**
   - Execute Phase 1-10 from guidelines (Section: Comprehensive Testing Workflow)
   - Run ALL 34+ tool calls listed in those phases
   - Follow ALL verification checkpoints in each phase
   - Merge ALL results before generating report
   
   **DO NOT proceed to Step 6 until:**
   - ✅ All 10 phases complete
   - ✅ All applicable tools run
   - ✅ All results merged

6. **Generate Initial Report (v1)**
   - Categorize issues by severity: Critical, High, Moderate, Low
   - Generate human-readable report following audit guidelines
   - **Extract module name from URL** (e.g., `student-list` from `/myapp/student-list`)
   - **Module name is REQUIRED in all report filenames**
   - Save reports to:
     - `{report_directory}scan-v1-{timestamp}.md`
     - `{report_directory}scan-v1-{timestamp}.json`
   - Update state: `scan_versions.push('v1')`, `current_version = 'v1'`

7. **Present Concise Report Preview**
   ```
   📊 ACCESSIBILITY SCAN RESULTS (v1)

   Page: [Page Name]
   URL: [URL]
   Date: [Timestamp]

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SUMMARY

   Total Issues: [X]
     🔴 Critical (Must Fix): [X] issues
     🟠 High Priority: [X] issues
     🟡 Moderate: [X] issues
     🔵 Low Priority: [X] issues

   WCAG {wcag_version} Compliance: [✅ PASSES / ❌ FAILS] Level AA

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TOP 3 CRITICAL ISSUES

   1. [Brief Issue Title] - [Count] instances
      Location: [Component/File]
      Quick Fix: [One-line description]

   2. [Brief Issue Title] - [Count] instances
      Location: [Component/File]
      Quick Fix: [One-line description]

   3. [Brief Issue Title] - [Count] instances
      Location: [Component/File]
      Quick Fix: [One-line description]

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   REPORTS SAVED

   ✅ Detailed Report: {report_directory}scan-v1-{timestamp}.md
   ✅ Machine Data: {report_directory}scan-v1-{timestamp}.json
   ```

   DETAILED reports generated but NOT shown to user unless requested.

8. **JIRA Integration** (Initial Report - Brief)

   **CONDITIONAL:** Only execute if `has_jira_ticket === true`

   - If JIRA ticket was provided at workflow start: "I'll add this brief report to {JIRA_TICKET}. Proceed?"
   - Wait for user decision
   - If approved:
     - Add brief JIRA comment (keep it concise):
       ```
       🔍 Accessibility Scan Complete (v1)

       Found [X] total issues:
       • Critical: [N]
       • High: [N]
       • Moderate: [N]

       WCAG {wcag_version} Compliance: [PASS/FAIL] Level AA

       Full reports: {report_directory}scan-v1-{timestamp}.md
       Next: Reviewing issues and planning fixes
       ```
     - Track: `jira_updates.push({type: 'initial_report', version: 'v1', timestamp})`
   - If JIRA error: STOP and request re-authentication (see Error Handling Protocol)

   **If no JIRA ticket provided:** Skip this step entirely and continue to Step 9.

9. **Phase 1 Verification** (MANDATORY - See PHASE BOUNDARY ENFORCEMENT)

   **DISPLAY THIS CHECKLIST TO USER:**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PHASE 1 COMPLETION VERIFICATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   □ Report identifier determined (JIRA ticket or keyword)
   □ Directory structure created (accessibility-reports/{identifier}/)
   □ Browser visibility confirmed
   □ Page analysis completed (interactive elements discovered)
   □ Page analysis report generated
   □ User approved interaction plan
   □ All approved interactions executed
   □ Page scanned successfully (all discovered states)
   □ Issues categorized by severity
   □ Reports generated (MD + JSON) as v1
   □ Reports saved to {report_directory}
   □ JIRA report added (if ticket provided)
   □ JIRA addition verified (if ticket provided)
   □ User reviewed summary

   Status: [COMPLETE / INCOMPLETE]
   Blockers: [List any incomplete items if any]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

   **THEN SHOW /DOUBLE-CHECK PREVIEW:**
   ```
   I will verify:
   - All checkboxes above are complete
   - No errors in workflow state
   - Reports exist at specified paths

   Run /double-check to verify completion? (yes/no)
   ```

   **WAIT for user response on /double-check**

   **THEN REQUIRE EXPLICIT 'PROCEED' COMMAND:**
   ```
   Type 'proceed' to continue to Phase 2, or 'stop' to pause workflow.
   ```

   **WAIT** - Do NOT continue until user types **'proceed'**

   Mark `phase_1_complete = true` ONLY AFTER receiving 'proceed' command.

---

### Phase 2: REVIEW & PLAN FIX

**Role:** Analysis & Fix Planning (see Phase Roles above)

**Steps:**

1. **Prioritize WCAG AA Issues**
   ```
   📊 WCAG {wcag_version} PRIORITIZATION

   Scanned [X] total issues across all WCAG {wcag_version} levels.

   Level A (Critical): [N] issues - Must fix
   Level AA (High Priority): [N] issues - Must fix
   Level AAA (Enhanced): [N] issues - Optional enhancement
   Best Practices: [N] issues - Optional enhancement

   Focus: I'll prioritize Level A and AA issues for fixing.

   Would you like to include Level AAA fixes? (yes/no/review)
   ```

   Handle responses:
   - **yes**: Include all AAA issues in fix plan
   - **no**: Set AAA issues aside (note in report as "deferred enhancements")
   - **review**: Show AAA issues, let user select specific ones to include

   Store preference: `WORKFLOW_STATE.include_aaa = true | false | [selected_ids]`

2. **Workflow Mode Selection** (Ask Once)

   ```
   📋 WORKFLOW MODE SELECTION

   I found [X] issues to fix. How would you like to proceed?

   1. **Manual Mode** (Recommended for first-time/critical pages)
      - I'll show you each fix before applying
      - You review code changes
      - More control, but requires more interaction

   2. **Auto Mode** (Faster for routine scans)
      - I'll apply all fixes automatically
      - You review everything at the end before commit
      - Less interaction, but you see final diff before commit

   Which mode do you prefer? (manual/auto)
   ```

   Store preference: `WORKFLOW_STATE.mode = 'manual' | 'auto'`

2. **Load Fix Agent**
   - Read agent from `.claude/skills/a11y-scan/agents/a11y-fix-rules.md`
   - Announce: "Reviewing reported issues and planning fixes..."

3. **Analyze Issues**
   - For each reported issue:
     - Identify affected component/file
     - Classify scope (page-specific vs shared)
     - Propose initial fix

4. **Review Fixes**
   - Announce: "🔍 Self-reviewing each proposed fix against the fix rules..."
   - For EVERY proposed fix:
     - Re-check it against `.claude/skills/a11y-scan/agents/a11y-fix-rules.md`
       (correct WCAG criterion, minimal change, no regressions, accessible name preserved)
     - Mark as ✅ VERIFIED or 🔄 REVISED
     - Refine based on the review
   - Track review statistics

5. **Present Fix Plan**
   - Show categorized fixes:
     - ✅ Safe to fix immediately (page-specific): [N] fixes
     - ⚠️ Requires approval (shared components): [N] fixes
   - Include review badges and notes
   - Display review summary
   - Note: Sub-tasks can be created for any issue at user's discretion (Phase 3)

6. **Phase 2 Verification** (MANDATORY - See PHASE BOUNDARY ENFORCEMENT)

   **DISPLAY THIS CHECKLIST TO USER:**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PHASE 2 COMPLETION VERIFICATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   □ Fix agent loaded
   □ All issues analyzed
   □ All fixes self-reviewed against fix rules
   □ Review feedback incorporated
   □ Fix plan presented to user
   □ Workflow mode selected (manual/auto)
   □ User approved fix plan

   Status: [COMPLETE / INCOMPLETE]
   Blockers: [List any incomplete items if any]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

   **THEN SHOW /DOUBLE-CHECK PREVIEW:**
   ```
   I will verify:
   - All checkboxes above are complete
   - Fix plan contains all issues
   - Workflow mode is set
   - User has approved the plan

   Run /double-check to verify completion? (yes/no)
   ```

   **WAIT for user response on /double-check**

   **THEN REQUIRE EXPLICIT 'PROCEED' COMMAND:**
   ```
   Type 'proceed' to continue to Phase 3, or 'stop' to pause workflow.
   ```

   **WAIT** - Do NOT continue until user types **'proceed'**

   Mark `phase_2_complete = true` ONLY AFTER receiving 'proceed' command.

---

### Phase 3: IMPLEMENT FIXES

**Role:** Fixing & Validation (see Phase Roles above)

**IMPORTANT:** NO commits happen in this phase. User commits separately when ready.

**Steps:**

1. **⚠️ CRITICAL: Take "Before" Screenshot ⚠️**
   ```bash
   # Capture initial page state before any fixes
   screenshot --output={screenshot_directory}before-{timestamp}.png
   ```
   Store path: `WORKFLOW_STATE.screenshot_before = path`

   **VERIFY screenshot was taken and path is stored before proceeding to fixes**

2. **Manual Mode Implementation Flow**
   For each fix (iterate through fix plan):

   a. **Show Proposed Change**
      ```
      📝 FIX [N]/[M]: [Brief Issue Title]

      WCAG: [Guideline] - [Name] (Level [A/AA])
      File: [filepath:line]
      Optimization: [✅ VERIFIED / 🔄 OPTIMIZED]

      Current Code:
      ```[language]
      [Show problematic code]
      ```

      Proposed Fix:
      ```[language]
      [Show fixed code]
      ```

      Approve this fix? (yes/no/skip)
      ```

   b. **STOP** - Wait for user approval

   c. **Apply if Approved**
      - If yes: Apply the fix, track in `WORKFLOW_STATE.changes.files_modified`
      - If no/skip: Document reason, track as skipped
      - Update: `WORKFLOW_STATE.changes.fixes_applied.push({issue, status: 'applied'|'skipped'})`

   d. **Re-scan After Every 5 Fixes**
      - Browser visibility check (ask user to verify)
      - Re-run accessibility scan
      - Generate versioned report: `{module}-scan-v2-{timestamp}.md` (increment version)
      - Compare with previous version
      - Present progress update:
        ```
        📊 PROGRESS UPDATE (v1 → v2)

        Fixes Applied: 5
        Issues Remaining: [Y] (was [Z])
        Resolved: [A] issues
        New Issues: [B] issues (if any)

        Continue? (yes/no/review)
        ```
      - Track: `scan_versions.push('v2')`, `current_version = 'v2'`
      - **If new issues discovered AND has_jira_ticket === true**: Add brief JIRA comment:
        ```
        🆕 New Issues Discovered During Fixes (v2)

        Found [N] new issues while fixing:
        • [Brief issue description]
        • [Brief issue description]

        Will address after completing current fix batch.
        Report: {report_directory}scan-v2-{timestamp}.md
        ```
        Track: `jira_updates.push({type: 'new_issues', version: 'v2', count: N, timestamp})`
      - **If new issues discovered AND has_jira_ticket === false**: Just log internally, no JIRA comment

   e. **Continue to next fix**

3. **Auto Mode Implementation Flow**

   a. **Apply All Fixes Sequentially**
      - Log progress: "Applying fix [N]/[M]: [Brief description]..."
      - Track all changes in `WORKFLOW_STATE.changes`
      - Show running count: "Applied [X]/[Y] fixes..."

   b. **Re-scan After Every 10 Fixes**
      - Browser visibility check
      - Generate versioned report (v2, v3, etc.)
      - Compare with previous version
      - Present progress update (same format as manual)
      - **If new issues discovered AND has_jira_ticket === true**: Add brief JIRA comment (same format as manual mode)
      - **If new issues discovered AND has_jira_ticket === false**: Just log internally, no JIRA comment

   c. **Continue Until All Fixes Applied**

4. **Shared Component Handling** (Both Modes)
   - **Always** request explicit permission (cannot auto-approve)
   - Present detailed impact analysis:
     ```
     ⚠️ SHARED COMPONENT MODIFICATION REQUIRED

     Issue: [Clear description of accessibility violation]
     Component: [Full file path]
     WCAG: [Guideline] - [Name] (Level [A/AA])
     Severity: [Critical/High/Moderate]
     Optimization: [✅ VERIFIED / 🔄 OPTIMIZED]

     Component Usage:
     This component is used in [N] locations:
       • src/pages/Dashboard/DashboardPage.tsx ([N] instances)
       • src/pages/Settings/SettingsPage.tsx ([N] instances)
       Total: [N] instances across [N] pages

     Current Code:
     ```[language]
     [Show problematic code with context]
     ```

     Proposed Fix:
     ```[language]
     [Show fixed code]
     ```

     Impact Analysis:
     • Dashboard: [Specific expected effect]
     • Settings: [Specific expected effect]

     Risk Assessment: [Low/Medium/High]
     Reasoning: [Why this risk level]

     Do you approve this change? (yes/no/modify)
     ```
   - **WAIT** for explicit approval
   - Apply only if approved
   - Skip if denied, document reason
   - Track decision in state

5. **Sub-task Creation** (User Discretion - Only if JIRA ticket provided)

   **CONDITIONAL:** Only execute if `has_jira_ticket === true`

   **If has_jira_ticket === false:** Skip this entire step and continue to Phase 4.

   **If has_jira_ticket === true:**
   - After fixes are applied/skipped, ask user:
     ```
     📋 SUB-TASK CREATION

     Would you like to create JIRA sub-tasks for any issues?

     Reasons to create sub-tasks:
     • UI impact requiring separate tracking
     • Issue needs team coordination/discussion
     • Complex fix deferred for later sprint
     • Shared component requiring careful planning

     Create sub-tasks? (yes/no/select-specific)
     ```

   - If **no**: Skip sub-task creation, continue to Phase 4
   - If **yes** or **select-specific**:
     - Show list of all issues (fixed, skipped, or remaining)
     - Ask: "Which issues should become sub-tasks? (provide numbers or 'all')"
     - For each selected issue:

       **SUB-TASK PREVIEW (MANDATORY)**
       - Read sub-task template from `.claude/skills/a11y-scan/agents/a11y-fix-rules.md`
       - Generate sub-task following format: `[A11y Tech Debt] <Issue Description> - WCAG <Guideline>`
       - Show complete preview to user:
         ```
         📋 SUB-TASK PREVIEW

         Title: [A11y Tech Debt] [Issue Description] - WCAG [Guideline]

         Priority: [Based on WCAG level]
         Labels: ["A11y Tech Debt", "WCAG-[Level]"]

         Description:
         [Show full description using template from `.claude/skills/a11y-scan/agents/a11y-fix-rules.md`]

         This sub-task will be:
         - Created in JIRA ticket: [JIRA_TICKET]
         - Linked as sub-task to parent
         - Labeled for filtering

         Create this sub-task? (yes/no/modify)
         ```

       - **WAIT** for user decision
       - If **no**: Skip this sub-task, continue to next
       - If **modify**:
         - Ask: "What would you like to change?"
         - Update sub-task content
         - Re-show preview
         - Loop until approved

       - If **yes** (approved):
         - Create sub-task in JIRA (if ticket provided)
         - Verify creation with confirmation
         - Link to parent ticket
         - Verify link with confirmation
         - If error: STOP and request re-authentication
         - Add brief comment to JIRA: "Created sub-task [SUB-TASK-ID] for [issue description]"
         - Track: `jira_subtasks_created.push(subtask_id)`, `jira_updates.push({type: 'subtask', id: subtask_id, timestamp})`

6. **Error Handling During Implementation**
   If any fix fails:
   - **STOP** immediately
   - **Document** error with context
   - **Ask** user:
     ```
     ⚠️ FIX FAILED

     Fix: [Issue description]
     File: [filepath]
     Error: [Error message]

     Options:
     1. Skip this fix (document reason)
     2. Retry with different approach
     3. Stop workflow and investigate

     What would you like me to do?
     ```
   - **WAIT** for decision
   - **Track** skipped/failed fixes in state

7. **Phase 3 Verification** (MANDATORY - See PHASE BOUNDARY ENFORCEMENT)

   **DISPLAY THIS CHECKLIST TO USER:**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PHASE 3 COMPLETION VERIFICATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ⚠️ CRITICAL STEPS:
   □ Before screenshot taken and path stored ← REQUIRED
   □ Screenshot path: [show actual path from WORKFLOW_STATE]

   FIX IMPLEMENTATION:
   □ All fixes attempted (applied or explicitly skipped)
   □ All changes tracked (user commits separately)
   □ Re-scans performed after each batch
   □ Versioned reports generated (v2, v3, etc.)
   □ JIRA comments added ONLY for new issues (if found)
   □ Sub-tasks created (if user requested)
   □ All shared component changes approved
   □ No unresolved fix errors

   Status: [COMPLETE / INCOMPLETE]
   Blockers: [List any incomplete items if any]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

   **THEN SHOW /DOUBLE-CHECK PREVIEW:**
   ```
   I will verify:
   - Before screenshot exists at stored path
   - All fixes are tracked in WORKFLOW_STATE
   - All changes recorded
   - No incomplete fix attempts

   Run /double-check to verify completion? (yes/no)
   ```

   **WAIT for user response on /double-check**

   **THEN REQUIRE EXPLICIT 'PROCEED' COMMAND:**
   ```
   Type 'proceed' to continue to Phase 4, or 'stop' to pause workflow.
   ```

   **WAIT** - Do NOT continue until user types **'proceed'**

   Mark `phase_3_complete = true` ONLY AFTER receiving 'proceed' command.

---

### Phase 4: FINAL RE-SCAN & VALIDATE

**Role:** Verification & Comparison (see Phase Roles above)

**Steps:**

1. **Browser Visibility Check**
   Before re-scanning, verify with user:
   ```
   🔍 BROWSER VISIBILITY CHECK (Final Scan)

   Before I perform the final re-scan, please verify:
   - Can you see the page in the browser window?
   - Is the page fully loaded?
   - Are you logged in (if authentication required)?
   - Any visible errors or issues?

   Should I proceed with final re-scan? (yes/no/refresh-page)
   ```

   Handle responses:
   - **yes**: Proceed with final scan
   - **no** or **refresh-page**: Ask user to fix, wait for confirmation

2. **Final Comprehensive Scan**
   - Run complete accessibility audit (same tools as Phase 1)
   - Use same audit rules from `.claude/skills/a11y-scan/agents/a11y-audit-guidelines.md`
   - Generate final versioned report: `{module}-scan-vFINAL-{timestamp}.md`
   - Update state: `scan_versions.push('vFINAL')`, `current_version = 'vFINAL'`

3. **Compare Initial vs Final Results**
   ```
   📊 FINAL SCAN RESULTS

   Initial Scan (v1): [X] issues
   After Fixes (vFINAL): [Y] issues

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RESOLUTION BREAKDOWN

   ✅ Fixed: [A] issues ([%] success rate)
   ⚠️ Escalated to sub-tasks: [B] issues
   🔄 New issues detected: [C] issues (requires investigation)
   ⏭️ Skipped: [D] issues (with reasons)

   WCAG {wcag_version} Compliance:
   Before: [❌ FAILS / ✅ PASSES] Level AA
   After:  [❌ FAILS / ✅ PASSES] Level AA

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Detailed Comparison:
   • [Guideline X.X.X]: [Before count] → [After count] issues
   • [Guideline Y.Y.Y]: [Before count] → [After count] issues
   • [List all affected guidelines]

   Reports saved:
   ✅ Final Report: {report_directory}scan-vFINAL-{timestamp}.md
   ✅ Machine Data: {report_directory}scan-vFINAL-{timestamp}.json
   ```

4. **Handle New Issues (If Any)**
   If new issues detected:
   ```
   ⚠️ NEW ISSUES DETECTED

   [C] new issues appeared during fixes (possible regressions).

   New Issues:
   1. [Issue description] - [WCAG guideline]
   2. [Issue description] - [WCAG guideline]

   Options:
   1. Fix new issues now (return to Phase 2)
   2. Document as known issues and continue
   3. Abort workflow and investigate

   What would you like to do?
   ```

   Handle response:
   - Option 1: Loop back to Phase 2 with new issues
   - Option 2: Document issues, proceed to Phase 5
   - Option 3: Stop workflow, provide diagnostic info

5. **Phase 4 Verification** (MANDATORY - See PHASE BOUNDARY ENFORCEMENT)

   **DISPLAY THIS CHECKLIST TO USER:**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PHASE 4 COMPLETION VERIFICATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   □ Browser visibility confirmed before scan
   □ Final comprehensive scan completed
   □ vFINAL report generated (MD + JSON)
   □ Before/after comparison generated
   □ New issues handled (if any)
   □ User reviewed final results

   Status: [COMPLETE / INCOMPLETE]
   Blockers: [List any incomplete items if any]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

   **THEN SHOW /DOUBLE-CHECK PREVIEW:**
   ```
   I will verify:
   - vFINAL report exists at specified path
   - Comparison shows before/after metrics
   - All new issues are documented
   - User has reviewed results

   Run /double-check to verify completion? (yes/no)
   ```

   **WAIT for user response on /double-check**

   **THEN REQUIRE EXPLICIT 'PROCEED' COMMAND:**
   ```
   Type 'proceed' to continue to Phase 5, or 'stop' to pause workflow.
   ```

   **WAIT** - Do NOT continue until user types **'proceed'**

   Mark `phase_4_complete = true` ONLY AFTER receiving 'proceed' command.

---

### Phase 5: FINALIZE

**Role:** Documentation & Summary (see Phase Roles above)

**IMPORTANT:** NO commits happen in this phase. User commits separately when ready.

**Steps:**

1. **⚠️ CRITICAL: Take "After" Screenshot ⚠️**
   ```bash
   # Capture final page state after all fixes
   screenshot --output={screenshot_directory}after-{timestamp}.png
   ```
   Store path: `WORKFLOW_STATE.screenshot_after = path`

   **VERIFY screenshot was taken and path is stored before proceeding**

2. **Present Complete Diff**
   Show user ALL accumulated changes from Phase 3:
   ```
   📝 COMPLETE CHANGES REVIEW

   Files Modified: [N]
     • path/to/file1.js (+X, -Y lines)
     • path/to/file2.jsx (+X, -Y lines)
     • path/to/file3.less (+X, -Y lines)

   Total Changes: +[A] lines, -[B] lines

   Fixes Applied by WCAG Guideline:
     • WCAG 1.1.1 (Alt text): [N] instances fixed
     • WCAG 1.4.3 (Contrast): [N] instances fixed
     • WCAG 2.4.7 (Focus visible): [N] instances fixed
     • [... all fixed guidelines]

   Sub-tasks Created:
     • [A11Y-XXX]: [Issue title]
     • [A11Y-YYY]: [Issue title]

   Would you like to see the full diff? (yes/no)
   ```

   If user says "yes", show `git diff` output.

3. **⚠️ CRITICAL: Screenshot Manual Upload ⚠️** (Only if JIRA ticket provided)

   **CONDITIONAL:** Only execute if `has_jira_ticket === true`

   **If has_jira_ticket === false:** Skip this entire step and continue to Step 4 (report information).

   **If has_jira_ticket === true:**

   Screenshots have been captured and saved locally:
   • Before: {WORKFLOW_STATE.screenshot_before}
   • After: {WORKFLOW_STATE.screenshot_after}

   **DISPLAY TO USER:**
   ```
   📸 SCREENSHOT UPLOAD TO JIRA

   I've saved before/after screenshots locally:

   Before fixes:
   • Full path: {WORKFLOW_STATE.screenshot_before}

   After fixes:
   • Full path: {WORKFLOW_STATE.screenshot_after}

   Please upload these screenshots to JIRA ticket {JIRA_TICKET}:

   1. Open: https://${ATLASSIAN_SITE}/browse/${JIRA_TICKET}
   2. Click "Attach files" or drag-and-drop
   3. Upload both screenshot files

   Once uploaded, I'll reference them in the final summary.

   Have you uploaded the screenshots? (yes/no/skip)
   ```

   **WAIT** for user confirmation

   Handle responses:
   - **yes**:
     - Confirm: "✅ Screenshots uploaded by user"
     - Ask: "What are the attachment filenames in JIRA? (so I can reference them correctly)"
     - **WAIT** for filenames
     - Store filenames for final summary
     - Read back: "I'll reference these in the summary: {filename1}, {filename2}"
     - Track: `jira_updates.push({type: 'screenshots', method: 'manual', files: [filenames], timestamp})`

   - **no**:
     - Ask: "Would you like me to provide the file paths again? Or skip screenshot upload? (provide-paths/skip)"
     - If provide-paths: Re-display file information
     - If skip: Continue to next step

   - **skip**:
     - Note: "Screenshots saved locally only:"
     - Display: Full paths to both screenshots
     - Track: `jira_updates.push({type: 'screenshots', method: 'skipped', timestamp})`
     - Continue to next step

4. **Report Information Display**

   **Always display (regardless of JIRA ticket):**
   ```
   📎 REPORTS GENERATED

   I've generated these reports in {report_directory}:
   1. Page analysis: page-analysis-{timestamp}.md
   2. Final scan report: scan-vFINAL-{timestamp}.md
   3. Machine data: scan-vFINAL-{timestamp}.json
   4. All versioned reports: v1, v2, v3, ..., vFINAL ([N] versions)

   Screenshots saved in {screenshot_directory}:
   • analysis-initial-{timestamp}.png (and per-interaction screenshots)
   • before-{timestamp}.png
   • after-{timestamp}.png
   ```

   **If has_jira_ticket === true, also show:**
   ```
   These are available locally if you want to attach additional reports to JIRA ticket {JIRA_TICKET}.

   Note: The final summary (next step) will be comprehensive, so attaching
   individual reports is optional for most cases.
   ```

   No further action needed - reports saved locally for reference.

5. **Generate Final QA Summary for JIRA**
    Create comprehensive summary using hybrid format.

    **Instructions for "Specific Tests" Section:**
    Analyze `WORKFLOW_STATE.changes.fixes_applied` and populate "Specific Tests (Based on Fixes Applied)" with relevant manual tests:
    - If aria-label/aria-labelledby fixes: Add "Verify '[actual label text]' announcement makes sense in page context"
    - If form label/instruction fixes: Add "Verify error messages and instructions are clear and sufficient"
    - If link text fixes: Add "Verify link purpose is clear from text + surrounding context"
    - If aria-live/live region fixes: Add "Verify screen reader announces updates for [specific content]"
    - If timing/auto-refresh changes: Add "Verify pause/stop/adjust controls work for [specific feature]"
    - If focus order/tabindex changes: Add "Verify tab order follows visual layout for [specific section]"
    - Keep max 5 specific tests, prioritize based on fix criticality

    **Template:**

    ```markdown
    *Development Complete - Ready for QA Testing*

    📋 Summary of Changes
    [Brief business-friendly overview of accessibility fixes]
    Fixed [X] accessibility issues to achieve WCAG {wcag_version} Level AA compliance on the [Page Name] page.
    All interactive elements now have accessible names, proper heading hierarchy established,
    and color contrast meets AA standards.

    🔧 Technical Changes Made
    * *Files Modified:* [N] files in [package/module] package
    * *Accessibility Fixes:*
      - Added aria-labels to [N] buttons
      - Fixed [N] color contrast issues
      - Corrected heading hierarchy ([specific changes])
      - [List other specific fixes]
    * *WCAG {wcag_version} Compliance:* [Before state] → [After state] Level AA

    🏗️ Impacted Modules/Components
    * *Frontend:* [Specific components affected]
    * *Shared Components:* [Cross-page impacts or "None - all changes are page-specific"]

    ♿ Accessibility Testing Scope

    *WCAG {wcag_version} Level AA Verification:*
    * [X.X.X Guideline Name] - [What was fixed]
    * [Y.Y.Y Guideline Name] - [What was fixed]
    * [List all fixed guidelines]

    *Screen Reader Testing Required:*
    * Test with NVDA/JAWS (Windows) or VoiceOver (Mac)
    * Verify announcements:
      - "[Specific announcement to verify]" when focusing [element]
      - "[Specific announcement]" when [action]
      - [List all announcements to test]

    *Keyboard Navigation Testing:*
    * Tab through [specific page sections]
    * Verify all [X] buttons are keyboard accessible (Tab + Enter/Space)
    * Verify focus indicators are visible on all interactive elements
    * [List other keyboard tests]

    *Manual Testing Required for WCAG {wcag_version} AA Compliance:*

    *Generic Tests (Always Required):*
    * Screen Reader Verification:
      - Test with NVDA, JAWS, or VoiceOver
      - Verify all interactive elements have meaningful announcements
      - Verify context/purpose is clear from announcements alone
    * Keyboard Navigation:
      - Tab through entire page, verify logical focus order
      - Verify no keyboard traps (can Tab/Shift+Tab out of all components)
      - Verify focus indicators are clearly visible on all elements
      - Test all interactive elements with Enter/Space keys
    * Focus Management:
      - Open/close modals, verify focus returns to trigger
      - Verify Escape key closes overlays without focus loss

    *Specific Tests (Based on Fixes Applied):*
    [Dynamically generated based on what was actually fixed]
    * If aria-labels added to buttons: Verify announcements make sense in context
    * If form labels/instructions added: Verify clarity and sufficiency
    * If link text changed: Verify purpose clear from text + surrounding context
    * If live regions added: Verify updates announced by screen reader
    * If auto-refresh/timing: Verify user can pause/stop/adjust timing
    * If focus order changed: Verify new order follows visual layout logically

    🧪 QA Testing Scope

    *Primary Testing Areas:*
    * [Feature/functionality] still works correctly
    * [Specific interactions] unchanged
    * [List key features to test]

    *Regression Testing Required:*
    * [Feature 1] still works as before
    * [Feature 2] still works as before
    * [List regression areas]

    *Test Data Requirements:*
    * [Specific data needed for testing]
    * [Account requirements, permissions, etc.]

    🔍 Acceptance Criteria Verification
    * ✅ All [X] buttons have accessible names (verified with screen reader)
    * ✅ Heading hierarchy starts with H1 (verified with accessibility tree)
    * ✅ Color contrast meets 4.5:1 minimum for AA (verified with contrast tool)
    * ✅ axe-core scan passes with 0 WCAG {wcag_version} Level A/AA violations
    * ✅ Manual NVDA/JAWS testing passes
    * ✅ Keyboard navigation works for all interactive elements
    * ✅ No visual regressions (screenshots attached)
    * ✅ No functional regressions (all features work as before)

    📊 Accessibility Metrics
    * *Before Fixes:* [X] violations - [❌ FAILS / ✅ PASSES] WCAG {wcag_version} Level AA
    * *After Fixes:* [Y] violations - [❌ FAILS / ✅ PASSES] WCAG {wcag_version} Level AA
    * *Resolution Rate:* [Z]% ([N] fixed, [M] escalated, [O] skipped)
    * *Escalated Issues:* [Details of sub-tasks with links]

    🚨 Known Issues & Limitations
    * [Issue description] requires team discussion (escalated to sub-task [A11Y-XXX])
    * [List any other known limitations]

    ----
    *Reports Generated:*
    * Final Report: [^{module}-scan-vFINAL-{timestamp}.md]
    * Machine Data: [^{module}-scan-vFINAL-{timestamp}.json]
    * Versioned Reports: v1, v2, v3, ..., vFINAL ([N] iterations)

    *Screenshots:*
    * Before fixes: !{module}-before-{timestamp}.png! (manually uploaded)
    * After fixes: !{module}-after-{timestamp}.png! (manually uploaded)

    *Next Steps:*
    Review changes, commit when ready, then push and create PR if needed.
    ```

6. **⚠️ CRITICAL: Add Final Summary to JIRA ⚠️** (Only if JIRA ticket provided)

    **CONDITIONAL:** Only execute if `has_jira_ticket === true`

    **If has_jira_ticket === false:** Skip this step entirely and continue to Step 7 (Phase 5 Verification).

    **If has_jira_ticket === true:**
    ```
    📊 ADDING FINAL SUMMARY TO JIRA

    Comprehensive QA summary generated. Add to {JIRA_TICKET}? (yes/no)
    ```

    **WAIT** for user decision.

    If yes:
    - Add summary comment to JIRA ticket
    - Verify addition with confirmation
    - If error: STOP and request re-authentication (see Error Handling Protocol)
    - Track: `jira_updates.push({type: 'final_summary', timestamp})`

    **THIS STEP IS MANDATORY IF JIRA TICKET PROVIDED - DO NOT SKIP**

7. **Phase 5 Verification** (MANDATORY - See PHASE BOUNDARY ENFORCEMENT)

    **DISPLAY THIS CHECKLIST TO USER:**
    ```
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    PHASE 5 COMPLETION VERIFICATION
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ⚠️ CRITICAL STEPS:
    □ After screenshot taken and path stored ← REQUIRED
    □ Screenshot path: [show actual path from WORKFLOW_STATE]
    □ Screenshots manually uploaded to JIRA (confirmed by user) ← REQUIRED (if JIRA ticket provided)
    □ Final QA summary added to JIRA (confirmed) ← REQUIRED (if JIRA ticket provided)

    OTHER STEPS:
    □ All changes reviewed by user
    □ Reports and screenshots saved locally in {report_directory}
    □ Final QA summary generated
    □ User confirmed workflow completion

    Status: [COMPLETE / INCOMPLETE]
    Blockers: [List any incomplete items if any]
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ```

    **THEN SHOW /DOUBLE-CHECK PREVIEW:**
    ```
    I will verify:
    - After screenshot exists at stored path
    - Screenshots confirmed uploaded by user
    - Final JIRA summary confirmed added
    - All workflow steps complete

    Run /double-check to verify completion? (yes/no)
    ```

    **WAIT for user response on /double-check**

    **THEN REQUIRE EXPLICIT 'PROCEED' COMMAND:**
    ```
    Type 'proceed' to mark workflow complete, or 'stop' if any steps are missing.
    ```

    **WAIT** - Do NOT continue until user types **'proceed'**

    Mark `phase_5_complete = true` ONLY AFTER receiving 'proceed' command.

8. **Workflow Completion**
    ```
    ✅ ACCESSIBILITY WORKFLOW COMPLETE

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    SUMMARY

    Initial Issues: [X]
    Fixed: [Y] ([Z]% success rate)
    Sub-tasks Created: [A] (user discretion)
    Skipped: [B] issues (with documented reasons)
    Reports: [N] versioned reports (v1 through vFINAL)
    Screenshots: 2 (before/after, manually uploaded to JIRA)

    JIRA Updates:
    ✅ Initial report added (brief)
    ✅ New issues comments (if discovered during fixes)
    ✅ [A] sub-tasks created and linked (if requested)
    ✅ Final QA summary added (comprehensive)

    Local Files:
    • Reports: accessibility-reports/
      - {module}-scan-v1-{timestamp}.md/json
      - {module}-scan-v2-{timestamp}.md/json (if re-scanned)
      - {module}-scan-vFINAL-{timestamp}.md/json
    • Screenshots: .playwright-mcp/test-reports/
      - {module}-before-{timestamp}.png
      - {module}-after-{timestamp}.png

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    Next Steps:
    1. Review changes: git diff
    2. Commit when ready: git add . && git commit -m "..."
    3. Push: git push origin [branch]
    4. Create PR if needed
    5. QA team reviews using JIRA testing scope and screenshots
    6. Monitor sub-tasks [A11Y-XXX, A11Y-YYY] for team decisions (if created)

    Workflow complete! 🎉
    ```

---

## Command Behavior

### Error Handling Summary
- **Authentication errors**: Request re-authentication, never skip
- **JIRA errors**: STOP and request token check, never silently fail
- **Browser errors**: Ask user to verify browser state, never assume
- **Fix errors**: Present options (skip/retry/abort), wait for decision
- **Upload errors**: Show error, offer retry or skip with local file paths
- **Unknown errors**: Stop workflow, ask for user guidance

### User Interaction Points
1. Authentication confirmation (Phase 1)
2. JIRA ticket input if not provided (Phase 1)
3. Browser visibility checks (before each scan)
4. WCAG AAA prioritization choice (Phase 2)
5. Workflow mode selection - manual or auto (Phase 2, once)
6. Fix plan approval (Phase 2)
7. Individual fix approvals in manual mode (Phase 3)
8. Shared component modification approvals (Phase 3)
9. Sub-task creation - user decides which issues (Phase 3)
10. Sub-task preview approval for each sub-task (Phase 3)
11. Progress review after each re-scan batch (Phase 3)
12. Final re-scan decision (Phase 4)
13. Complete diff review (Phase 5)
14. Manual screenshot upload confirmation (Phase 5)
15. JIRA summary addition approval (Phase 5)

### Data Persistence
- All reports saved to `accessibility-reports/` directory with version numbers
- Versioned reports track progress: v1, v2, v3, ..., vFINAL
- Both human-readable (.md) and machine-readable (.json) formats
- Module name extracted from URL for consistent naming
- Screenshots saved to `.playwright-mcp/test-reports/`
- All state tracked in WORKFLOW_STATE object throughout execution

### Integration Points
- Uses `agents/a11y-audit-guidelines.md` agent for scanning rules
- Uses `agents/a11y-fix-rules.md` agent for fix implementation
- Authentication via accessibility MCP: automated (with credentials) or manual (user-driven)
- Single browser context maintained throughout workflow
- Self-reviews every fix against `agents/a11y-fix-rules.md` before presenting
- Integrates with JIRA API for comments and sub-tasks (via Atlassian MCP)
- Uses a11y MCP tool for scanning
- User manually uploads screenshots and reports to JIRA

---

## Example Usage

```bash
# Simple scan (no JIRA, uses .env credentials if auth needed)
/a11y-scan http://localhost:3000/myapp/student-list

# Scan with JIRA ticket (recommended, uses .env credentials)
/a11y-scan http://localhost:3000/myapp/dashboard A11Y-456

# Scan with explicit credentials (overrides .env)
/a11y-scan http://localhost:3000/myapp/dashboard A11Y-456 john@example.com SecurePass123

# Expected flow:
# Phase 1: Login → Scan → Generate v1 report → Brief JIRA comment → Decision gate
# Phase 2: Prioritize AA → Select mode → Plan fixes → Optimize → Decision gate
# Phase 3: Take before screenshot → Apply fixes → Re-scan after batches (v2, v3) → JIRA comment if new issues → Optional sub-task creation → Decision gate
# Phase 4: Final scan → Generate vFINAL → Compare → Decision gate
# Phase 5: Take after screenshot → Review diff → User uploads screenshots manually → Generate QA summary → Add JIRA comment → Complete
# User commits separately when ready
```

---

## Prerequisites
- ✅ a11y MCP tool configured and accessible
- ✅ `agents/a11y-audit-guidelines.md` agent defined
- ✅ `agents/a11y-fix-rules.md` agent defined
- ✅ Atlassian MCP server configured (for JIRA integration)
- ⚠️ PLAYWRIGHT_USER and PLAYWRIGHT_PASSWORD in .env (optional, can use command params)
- ⚠️ JIRA API access (optional, for ticket integration)

---

## Output Files

Generated during workflow execution:

### Reports (Versioned)
- `{report_directory}page-analysis-{timestamp}.md` - Interactive element discovery and interaction map
- `{report_directory}scan-v1-{timestamp}.md` - Initial audit report
- `{report_directory}scan-v1-{timestamp}.json` - Initial audit data
- `{report_directory}scan-v2-{timestamp}.md` - After first fix batch
- `{report_directory}scan-v2-{timestamp}.json` - After first fix batch data
- `{report_directory}scan-v3-{timestamp}.md` - After second fix batch (if applicable)
- `...` (additional versions as fixes progress)
- `{report_directory}scan-vFINAL-{timestamp}.md` - Final validation report
- `{report_directory}scan-vFINAL-{timestamp}.json` - Final validation data

### Screenshots
- `{screenshot_directory}analysis-initial-{timestamp}.png` - Initial page state (before interactions)
- `{screenshot_directory}analysis-{element}-{timestamp}.png` - Per-interaction discovered states
- `{screenshot_directory}before-{timestamp}.png` - Before fixes
- `{screenshot_directory}after-{timestamp}.png` - After fixes

### JIRA Attachments (if ticket provided)
- Before and after screenshots (manually uploaded by user)
- Reports available locally (optional to attach)
- Referenced in final JIRA comment

---

## Notes
- **NO commits during workflow** - user commits separately when ready
- Workflow mode (manual/auto) selected once at Phase 2 start
- Reports are versioned (v1, v2, v3, ..., vFINAL) to track progress
- Re-scanning happens after every 5 fixes (manual) or 10 fixes (auto)
- Browser visibility verified before each scan operation
- **JIRA comments:** 3 total (initial scan, new issues if found, final summary)
- **Screenshots:** User uploads manually to JIRA (workflow provides paths)
- **Sub-tasks:** User discretion (preview required before creation)
- WCAG AA issues prioritized; AAA optional
- User maintains control at 4 decision gates across 5 phases
- Each phase has verification checklist before marking complete
- /double-check used to verify phase completion
- Module name is auto-extracted from URL for file naming
- JIRA integration is optional but encouraged for full workflow
- Sub-tasks use format: `[A11y Tech Debt] <Description> - WCAG <Guideline>`
- Authentication: Command params > .env > prompt user
