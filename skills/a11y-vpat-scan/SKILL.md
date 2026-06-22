---
name: a11y-vpat-scan
description: |
  Accessibility scan and issue validation for VPAT reporting (WCAG 2.2 / 2.1). Scans pages, validates issues, and produces structured JSON scan data.
  Triggers: "vpat scan", "a11y vpat scan", "accessibility vpat scan".
---

## Syntax - Accessibility Scan & Issue Validation
```bash
/a11y-vpat-scan <URL_OR_PAGES_FILE> [JIRA_TICKET] [USERNAME] [PASSWORD] [--wcag 2.1|2.2]
```

## Parameters
- `URL_OR_PAGES_FILE` (required):
  - **Single Page:** Direct URL (e.g., `http://localhost:3000/myapp/student-list`)
  - **Multiple Pages:** Path to JSON file with page list (e.g., `pages-config.json`)
- `JIRA_TICKET` (optional): JIRA ticket ID for tracking (e.g., `A11Y-450`)
- `USERNAME` (optional): Username for authentication (overrides .env)
- `PASSWORD` (optional): Password for authentication (overrides .env)

**Parameter Behavior:**
- If USERNAME and PASSWORD provided: Use these credentials
- If omitted: Fall back to PLAYWRIGHT_USER and PLAYWRIGHT_PASSWORD from .env
- If neither provided and page requires auth: Prompt user
- JIRA ticket optional: If provided, enables JIRA integration for scan results
- `--wcag` (optional): WCAG version to scan against. Default: `2.2`. Use `--wcag 2.1` for 50-criteria WCAG 2.1 scanning

**Pages File Format (JSON):**
```json
{
  "application": "MyApp Student Advising Platform",
  "version": "5.2.1",
  "description": "Web-based student advising and success platform",
  "pages": [
    {
      "url": "http://localhost:3000/myapp/dashboard",
      "identifier": "dashboard",
      "priority": "critical",
      "requires_auth": true
    },
    {
      "url": "http://localhost:3000/myapp/student-list",
      "identifier": "student-list",
      "priority": "high",
      "requires_auth": true
    },
    {
      "url": "http://localhost:3000/myapp/calendar",
      "identifier": "calendar",
      "priority": "high",
      "requires_auth": true,
      "how_to_navigate": "Navigate to the above page url and click on the New Event button"
    }
  ]
}
```

**Optional Field - `how_to_navigate`:**

Used for pages that share the same URL but need different interactions to reach different states.

**Supported patterns:**
- `"Navigate to the above page url and verify the page is loaded"` - No additional action
- `"Navigate to the above page url and click on the New Alert button"` - Click button after load
- `"Navigate to the above page url and click Advanced Search"` - Click link/button after load

The skill will parse instructions and execute actions after initial page load. If an element is not found, you'll see available clickable elements and recovery options (retry/skip/manual/abort).

## Purpose
Scans pages for accessibility issues and validates findings to prepare clean data for VPAT report generation.

**Workflow:** Login → Smart/Comprehensive Scan → Issue Review → Validated JSON Files

**Key Features:**
- ✅ **Two scanning approaches:** Smart (efficient) or Comprehensive (thorough)
- ✅ Single or multi-page scanning with one authentication
- ✅ WCAG 2.2 Level A & AA scanning (default), WCAG 2.1 backward compatible using `agents/a11y-audit-guidelines.md` as reference
- ✅ Issue validation to filter false positives and existing issues
- ✅ Complete audit trail of review decisions
- ✅ Optional JIRA integration (comments after validation)
- ⚠️ **Scan-only workflow** (no fix implementation)

**Output:** Validated JSON files ready for VPAT report generation via `/a11y-vpat-report`

## JSON Structure Rules

**CRITICAL:** All scan JSON files MUST follow rules in `references/SCAN-FILE-RULES.md`

**The 4 Golden Rules:**
1. **Count Consistency**: `issues.length === summary.total_issues === validated_issue_count`
2. **Issues Array**: ONLY items with `review_status: "valid"`
3. **Excluded Issues**: 4 required categories (auto_excluded, out_of_scope, false_positives, existing)
4. **Required Sections**: All 8 top-level sections present

**Verification:** See COMMAND 5A below.

---

## 🎯 Choose Your Scanning Approach

### **Smart Approach** (RECOMMENDED for most use cases)

**Philosophy:** Guidelines as Reference, Not Checklist

Uses axe-core + targeted testing to efficiently gather evidence for all 56 WCAG 2.2 criteria (or 50 for WCAG 2.1 mode).

**Benefits:**
- ⚡ **60-70% faster** (5-10 min vs 15-25 min)
- 💰 **Lower token cost** (30-50k vs 100-150k)
- 🎯 **Strategic tool selection** based on page content
- ✅ **Excellent VPAT quality** with honest scope disclosure

**Best For:**
- Internal QA/development feedback
- Sprint-level testing
- Continuous integration
- Initial assessments
- Time/token constrained scenarios
- When a faster, targeted scan is sufficient

**How It Works:**
1. **Foundation:** axe-core + run_wcag_21_aa_tests
2. **Strategic Adds:** Selectively run additional tools based on:
   - Page has forms → add form testing
   - Many interactive elements → add keyboard testing
   - Complex widgets → add ARIA validation
   - Headings present → add heading structure
3. **Total:** 5-12 tools (vs 27-30 comprehensive)

### **Comprehensive Approach** (Full tool execution)

**Philosophy:** Systematic execution of all available testing tools

Mechanically runs 27-30 tools following `agents/a11y-audit-guidelines.md` checklist.

**Benefits:**
- 📋 **All tools executed** (no gaps)
- 🏛️ **Best for legal/compliance** reviews
- ✅ **Maximum confidence** in results

**Best For:**
- Legal compliance reviews
- Pre-litigation assessments
- Government procurement (Section 508)
- When full tool coverage is required
- Time/resources not constrained

**How It Works:**
1. **Phase 1:** Core WCAG (6 tools)
2. **Phase 2:** Keyboard (4 tools)
3. **Phase 3:** Screen Reader (3 tools)
4. **Phase 4:** Structure (5 tools)
5. **Phase 5:** Forms (2 tools)
6. **Phase 6:** Dynamic (1 tool)
7. **Phase 7:** Widgets (covered by Phase 2)
8. **Phase 8:** Visual/Responsive (5 tools)
9. **Phase 9:** Platform (1-3 tools)
10. **Total:** 27-30 tools

---

## 🤔 Decision Guide: Which Approach?

| Scenario | Recommended Approach |
|----------|---------------------|
| Sprint QA testing | **Smart** |
| Production pre-release | **Smart** or Comprehensive |
| Legal compliance audit | **Comprehensive** |
| Section 508 procurement | **Comprehensive** |
| Initial assessment | **Smart** |
| Bug fix verification | **Smart** |
| Pre-litigation review | **Comprehensive** |
| Continuous integration | **Smart** |
| Customer-facing VPAT | Either (both produce professional reports) |
| Limited time/tokens | **Smart** |

**Default:** The workflow uses **Smart Approach** by default. To use Comprehensive, user will be prompted to choose at workflow start.

---

---

## Report Organization & Identifier Determination

**BEFORE PHASE 1 STARTS**, determine the identifier for organizing reports:

### If JIRA_TICKET Parameter Provided
```
identifier = JIRA_TICKET (e.g., "A11Y-450")
has_jira_ticket = true
Enable JIRA integration (comments after scan validation)
```

### If NO JIRA_TICKET Parameter
Present organization benefits and request keyword:

```
📁 REPORT ORGANIZATION

ℹ️ No JIRA ticket provided. Reports will be organized in folders.

**Benefits:**
✅ Easy to find all scan results
✅ Simple cleanup (delete one folder)
✅ Clear grouping of multi-page scans
✅ Organized screenshot management

Please provide a keyword for organizing scan files.
**Examples:** 'sprint-45-vpat', 'q1-audit', 'compliance-review'

**Or press Enter** to use auto-generated: '{app-name}-vpat-{date}'

Keyword: _____
```

**WAIT for user input**

#### User Provides Keyword
```
identifier = user_keyword (e.g., "sprint-45-vpat")
has_jira_ticket = false
Disable JIRA integration
```

#### User Presses Enter (Empty Input)
```
Extract app name from pages file or URL
identifier = "{app-name}-vpat-{YYYY-MM-DD}" (e.g., "myapp-vpat-2024-01-15")
has_jira_ticket = false
Disable JIRA integration
```

### Create Directory Structure (Absolute Paths)
```bash
# CRITICAL: Capture absolute working directory at workflow start
working_dir = $(pwd)

# Create organized directory structure using absolute path
mkdir -p "${working_dir}/test-reports/accessibility-reports/{identifier}/pages"

# Store ABSOLUTE PATHS in WORKFLOW_STATE
working_directory = "${working_dir}"  # e.g., "/Users/user/repo"
report_directory = "${working_dir}/test-reports/accessibility-reports/{identifier}/"
pages_directory = "${working_dir}/test-reports/accessibility-reports/{identifier}/pages/"
```

**Why Absolute Paths:**
- ✅ Prevents scattered files if working directory changes
- ✅ Screenshots and reports always in consistent location
- ✅ Makes paths portable across different execution contexts
- ✅ Easier to find files after workflow completion

**⚠️ CRITICAL: MCP Tool Path Requirements**
- **File operations** (Read, Write, Edit): Use absolute paths ✅
- **mcp__mcp-accessibility__screenshot**: Use RELATIVE paths WITHOUT working directory prefix ⚠️
  - The screenshot tool automatically prepends working directory AND `test-reports/`
  - Example: Use `accessibility-reports/{id}/pages/dashboard/screenshot.png`
  - NOT: `test-reports/accessibility-reports/...` (will create nested duplicate: test-reports/test-reports/...)
  - NOT: `/Users/user/repo/...` (absolute paths not supported)
- **Directory creation** (mkdir): Use absolute paths ✅

### File Organization Pattern
```
{working_directory}/test-reports/accessibility-reports/
└── {identifier}/                    # JIRA ticket or keyword or auto-generated
    ├── pages/                       # Per-page scan results
    │   ├── dashboard/
    │   │   ├── scan-{timestamp}.json  ✅ Validated issues
    │   │   └── scan-{timestamp}.md
    │   ├── student-list/
    │   │   ├── scan-{timestamp}.json  ✅ Validated issues
    │   │   └── scan-{timestamp}.md
    │   └── calendar/
    │       ├── scan-{timestamp}.json  ✅ Validated issues
    │       └── scan-{timestamp}.md
    └── issue-review-audit-{timestamp}.md  ✅ Review audit trail
```

**Example with absolute path:**
```
/path/to/repo/test-reports/accessibility-reports/A11Y-450/
└── pages/
    ├── dashboard/
    │   ├── scan-2024-01-15T10-30-00Z.json
    │   └── scan-2024-01-15T10-30-00Z.md
    └── issue-review-audit-2024-01-15T11-00-00Z.md
```

### JIRA Integration Logic (Scan Workflow)
```
After Phase 3 completion, if (has_jira_ticket === true):
  Post comment to JIRA ticket with scan summary:
  - Total pages scanned
  - Valid issues found (by severity)
  - Link to review audit trail
  - Next step: Run /a11y-vpat-report to generate VPAT
```

---

## Quick Reference

**Phases:**
1. DISCOVER - Load configuration & authenticate
2. SCAN - Multi-page analysis & comprehensive scanning
3. REVIEW - Validate issues (mark as valid/existing/false positive)

**Next Step:** Run `/a11y-vpat-report` to generate VPAT from validated scan data

**JIRA Integration:** Optional (comments after Phase 3 if ticket provided)
**Phase Boundaries:** User must type 'proceed' to advance
**Comprehensive Scanning:** Mandatory verification before moving to next page
**Output:** Per-page validated JSON files + review audit trail

---

## PHASE GATE SYSTEM (CRITICAL)

**A systematic checkpoint framework ensuring documentation is followed at every phase.**

### Overview

The Phase Gate System prevents workflow deviations by requiring:
1. **Pre-Phase Gate**: Display plan and get approval BEFORE execution
2. **Execution Phase**: Provide live updates during work
3. **Post-Phase Gate**: Show verification checklist and wait for 'proceed'

**FAILURE TO FOLLOW PHASE GATES = WORKFLOW FAILURE**

---

### PRE-PHASE GATE (Before ANY Phase Work)

**MANDATORY before starting any phase:**

Display clear header with phase name, then show:
- Documentation section read (with line numbers)
- Phase objective (1-2 sentences)
- Key steps to be executed
- Expected output files
- Workflow state updates
- Any clarification questions

**CRITICAL ENFORCEMENT:**
- MUST read documentation first and reference line numbers
- MUST NOT execute until user types 'approved'
- Wait for user response: 'approved', 'wait', or 'clarify: {question}'

---

### EXECUTION PHASE (During Work)

Provide clear progress updates showing: step number, action, tool, expected outcome, and result.

**If deviation occurs:** Stop immediately, explain expected vs actual, propose resolution, and ask user to choose: 'continue', 'stop', or 'abort'.

---

### POST-PHASE GATE (After Work, Before Next Phase)

**MANDATORY after completing any phase:**

Display completion header, then show:
- Completion checklist (from documentation with line ref)
- Files created/modified (with size and verification)
- Results summary (key metrics/findings)
- Workflow state updates (phase_N_complete = true)
- Verification commands user can run
✅ Type 'proceed' to advance to Phase {N+1}
⚠️ Type 'verify: {filename}' to inspect a file
❌ Type 'redo' if something is wrong
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**CRITICAL RULES:**
- Display exact checklist from documentation (don't paraphrase)
- MUST NOT proceed to next phase until user types 'proceed'
- Mark `phase_X_complete = true` ONLY AFTER user types 'proceed'
- If user types 'verify', show file contents and re-display gate
- If user types 'redo', rollback phase and restart from Pre-Phase Gate

---

### PHASE-SPECIFIC GATES

#### PHASE 1: DISCOVER

**Pre-Phase Gate Questions:**
```
❓ QUESTIONS FOR YOU:
   1. Authentication method? (auto/manual/params)
   2. Confirm identifier: "{proposed_identifier}"
   3. Pages source: Single URL or pages file path?
```

**Mid-Phase Checkpoint (after opening browser):**
```
🔐 AUTHENTICATION CHECKPOINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Browser opened: ✓
Navigated to: {URL}
Current page title: {title}

Are you logged in and ready to scan?
Type 'ready' when authenticated, or 'retry' to reopen browser
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### PHASE 2: SCAN

**Pre-Page Gate (for each page):**
```
🔍 SCANNING PAGE {N}/{TOTAL}: {page_name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URL: {url}
Priority: {priority}
Scanning approach: {smart/comprehensive}

Tools to execute: {count}
{list first 5 key tools}
... and {N} more (see full list in tool inventory)

Expected duration: ~{minutes} minutes
Browser must stay on this page: YES

Type 'scan' to begin scanning this page
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Post-Page Summary:**
```
✅ PAGE SCAN COMPLETE: {page_name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tools executed: {count}/{expected}
Issues found: {total} ({critical} critical, {serious} serious, {moderate} moderate)
Files created:
  ✓ scan-{timestamp}.json ({size})
  ✓ scan-{timestamp}.md ({size})
  ✓ screenshot.png ({size})

Next: {next_page_name} OR Phase 3 Review (if last page)

Type 'continue' for next page, or 'stop' to pause
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### PHASE 3: REVIEW

**Pre-Phase Gate:**
```
📋 REVIEW PHASE - ISSUE VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total issues to review: {count}
From pages: {page_list}

Review options:
1. Review each issue individually (recommended for first audit)
2. Mark all as VALID (trust automated scan results)
3. Review only Critical/Serious issues (skip moderate/minor)

Your choice affects final VPAT report accuracy.

Type: '1' | '2' | '3'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Per-Issue Gate (if option 1 selected):**
```
🔍 ISSUE {N}/{TOTAL} REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID: {issue_id}
WCAG: {criterion} (Level {level})
Severity: {severity}
Page: {page_name}

Title: {issue_title}
Description: {issue_description}
Element: {element_html}
Selector: {css_selector}
Instances: {count}

Classify this issue:
1. VALID - Include in VPAT report (new issue)
2. EXISTING - Already reported/known issue (exclude from VPAT)
3. FALSE - False positive (exclude from VPAT)

Type: '1' | '2' | '3'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### PHASE 4: AGGREGATE

**Pre-Phase Gate:**
```
📊 AGGREGATION PHASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Validated issues to aggregate: {count}
Pages scanned: {page_count}

Will create:
□ aggregate-results.json - Complete data structure
□ aggregate-summary.md - Human-readable summary
□ WCAG conformance mapping for VPAT

Aggregation will consolidate all validated issues across pages.

Type 'aggregate' to begin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### PHASE 5: VPAT

**Pre-Phase Gate (CRITICAL - Most Common Failure Point):**
```
📄 VPAT GENERATION PHASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 READING DOCUMENTATION:
   VPAT generation runs the /a11y-vpat-report skill (a11y-vpat-report/SKILL.md)
   — VPAT 2.5 template structure, vpat-styles CSS, and PDF (pandoc/WeasyPrint) generation

WILL FOLLOW EXACT TEMPLATE:
✓ Title: "Voluntary Product Accessibility Template® (VPAT®)"
✓ File naming: VPAT-2.5-Report-{product}-{timestamp}.md
✓ Structure: Product Info → Eval Methods → WCAG A → WCAG AA →
            Section 508 → EN 301 549 → Remediation
✓ Styling: vpat-styles.css (HTML), vpat-styles-pdf.css (PDF)
✓ PDF: pandoc with weasyprint engine

NEED FROM YOU (Product Information):
1. Product name: _____
   (or use default: "MyApp Student Portal")
2. Product version: _____
   (or use default: "Current")
3. Product description: _____
   (or use default: "Student engagement platform")
4. Vendor name: _____
   (or use default: "Example Corp")
5. Contact info: _____
   (or use default: "Accessibility Team")

Type 'defaults' to use all defaults
Type 'custom' to provide your own values
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Post-Generation Verification:**
```
✅ VPAT FILES GENERATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files created:
□ vpat-styles.css ({size})
□ vpat-styles-pdf.css ({size})
□ VPAT-2.5-Report-{product}-{timestamp}.md ({size})
□ VPAT-2.5-Report-{product}-{timestamp}.html ({size})
□ VPAT-2.5-Report-{product}-{timestamp}.pdf ({size})

VERIFICATION COMMANDS (you can run):

$ head -5 VPAT-2.5-Report-*.md
  Expected: "# Voluntary Product Accessibility Template® (VPAT®)"

$ grep "Does Not Support\|Supports\|Partially Supports" VPAT-2.5-Report-*.md | head -3
  Expected: Conformance level statuses in WCAG tables

$ ls -lh VPAT-2.5-Report-*.pdf
  Expected: PDF file size > 50KB

Would you like to run verification?
Type 'verify' to run checks, or 'skip' to proceed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### USER RESPONSE KEYWORDS

**Standard responses you can use at phase gates:**

| Your Input | What Happens |
|------------|--------------|
| `approved` | I proceed with phase execution |
| `proceed` | I advance to next phase |
| `ready` | Confirms authentication/readiness |
| `scan` | Begins page scanning |
| `aggregate` | Begins aggregation |
| `continue` | Continues to next item/page |
| `stop` | Pauses and saves state |
| `wait` | I pause for you to review documentation |
| `verify` | I run verification commands and show output |
| `verify: {file}` | I show contents of specific file |
| `redo` | I repeat current phase from start |
| `abort` | I cancel and rollback current phase |
| `clarify: {question}` | You ask for clarification |
| `defaults` | Use all default values (Phase 5) |
| `custom` | Prompt for custom values (Phase 5) |
| `1` / `2` / `3` | Select option from menu |
| `show-docs: {topic}` | I display relevant documentation section |

---

### BENEFITS OF PHASE GATE SYSTEM

1. **Forces Documentation Reading**: Can't skip Pre-Phase Gate without reading docs
2. **Clear Checkpoints**: You approve before I execute
3. **Traceable Decisions**: Every gate documents what/why
4. **Error Recovery**: Can redo/abort at any gate
5. **No Surprises**: You see plan before execution
6. **Verification Built-in**: Checklists ensure completeness
7. **Prevents Deviations**: System catches when I deviate from template

---

### ENFORCEMENT RULES

**I MUST:**
- Display Pre-Phase Gate before ANY phase work
- Reference specific documentation line numbers
- Wait for 'approved' before executing
- Display Post-Phase Gate after completing phase
- Wait for 'proceed' before advancing to next phase
- Stop and alert on any deviation from documentation

**I MUST NOT:**
- Skip reading documentation
- Start work without 'approved'
- Advance phases without 'proceed'
- Create files with wrong names/structure
- Deviate from templates without alerting you

**IF I VIOLATE THESE RULES:**
- You should immediately type 'stop'
- Point out which rule I violated
- I will rollback and restart correctly

---

## ⚠️ SMART SCANNING ENFORCEMENT ⚠️

**NEVER skip tools or filter scan results. All selected tools must execute.**

### Smart Approach Requirements:

**Tool Selection:**
- **Foundation (2-3 tools):** run_wcag_21_aa_tests + analyze_accessibility (MANDATORY) + run_wcag_22_aa_tests (WCAG 2.2 mode only)
- **Context Capture (3 tools):** get_page_info + screenshot + get_accessibility_tree (MANDATORY)
- **Strategic Gap Analysis (0-7 tools):** Conditional based on page content (forms, interactive elements, widgets, headings, live regions)
- **Total:** 5-12 tools per page

**Enforcement:**
1. **All selected tools MUST execute** - No skipping or partial execution
2. **Tool count MUST be validated** - Count must match array length
3. **All findings MUST be merged** - No filtering or omitting results
4. **Verification required** - Extract tool names and validate count before generating reports

**Critical Requirements:**
- MUST run foundation tools (run_wcag_21_aa_tests + analyze_accessibility)
- MUST run all 3 context capture tools (including screenshot)
- MUST analyze accessibility tree to determine strategic tools
- MUST merge ALL findings from every tool executed
- De-duplicate identical issues but preserve ALL unique findings

**WHY THIS MATTERS:**
Each tool catches different accessibility barriers. Skipping tools or filtering results creates a false sense of compliance while real barriers remain.

---

## ERROR HANDLING PROTOCOL

When ANY error occurs:

1. **STOP IMMEDIATELY** - Do not continue workflow
2. **Document Error** - Capture full error message and context
3. **Classify Error**:
   - Authentication Error → Request re-authentication
   - Token/Permission Error → Request user intervention
   - Tool/MCP Error → Request tool restart
   - Network Error → Request retry permission
   - Browser Error → Ask user to verify browser state
   - PDF Generation Error → Try fallback method
   - Unknown Error → Ask for guidance

4. **Present to User**:
   ```
   ⚠️ WORKFLOW STOPPED - ERROR ENCOUNTERED

   Phase: [Current phase name]
   Task: [Specific task being performed]
   Error Type: [Classification]
   Error Message: [Full error text]

   Options:
   1. Re-authenticate (for auth errors)
   2. Retry operation (for transient errors)
   3. Skip this step (requires permission)
   4. Abort workflow

   What would you like me to do?
   ```

5. **WAIT** - Do not proceed without explicit decision

---

## WORKFLOW STATE TRACKING

```javascript
WORKFLOW_STATE = {
  // Working directory and report organization
  working_directory: null,             // ABSOLUTE PATH: Repository root (e.g., "/Users/user/repo")
  identifier: null,                    // JIRA ticket or keyword or auto-generated
  has_jira_ticket: false,              // true if JIRA ticket provided
  report_directory: null,              // ABSOLUTE PATH: "{working_dir}/test-reports/accessibility-reports/{identifier}/"
  pages_directory: null,               // ABSOLUTE PATH: "{working_dir}/test-reports/accessibility-reports/{identifier}/pages/"

  // Input configuration
  input_type: null,                    // 'url' | 'pages_file'
  pages_file_path: null,               // Path to pages JSON (if multi-page)
  single_page_url: null,               // URL (if single page)

  // Pages to scan
  pages: [],                           // Array of page objects
  total_pages: 0,
  current_page_index: 0,

  // Authentication
  authenticated: false,
  session_start: null,

  // Scan exclusions (third-party widgets)
  exclusions_config_path: null,        // Path to exclusions JSON file
  exclusions: [],                      // Array of CSS selectors to exclude
  exclusions_enabled: false,           // Whether exclusions are active

  // Phase tracking
  current_phase: null,
  phase_1_complete: false,             // DISCOVER
  phase_2_complete: false,             // SCAN
  phase_3_complete: false,             // REVIEW (NEW)
  phase_4_complete: false,             // AGGREGATE
  phase_5_complete: false,             // VPAT GENERATION

  // Per-page results
  page_results: [],                    // Array of scan results per page

  // Issue review tracking (Phase 3)
  issue_reviews: [],                   // Array of review decisions per issue
  review_summary: {
    total_reviewed: 0,
    valid_count: 0,
    existing_count: 0,
    false_positive_count: 0
  },

  // Aggregated results (Phase 4)
  aggregated_results: null,

  // WCAG conformance (Phase 4)
  wcag_conformance: null,

  // Product information (Phase 5)
  product: {
    name: null,
    version: null,
    description: null,
    website: null
  },
  vendor: {
    company: null,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    company_address: null,
    company_website: null
  },
  evaluation: {
    evaluator: null,
    date_range: { start: null, end: null },
    report_version: '1.0',
    report_date: null
  },
  testing_scope: {
    features_tested: [],
    testing_environment: null,
    evaluation_methods: {
      automated: true,
      manual: true,
      screen_reader: false,
      user_testing: false
    }
  },

  // Generated VPAT reports (Phase 5)
  vpat_reports: {
    markdown_path: null,
    css_path: null,                    // vpat-styles.css for HTML (web viewing)
    pdf_css_path: null,                // vpat-styles-pdf.css for PDF (hides VPAT heading)
    html_path: null,
    pdf_path: null,
    pdf_method: null                   // 'pandoc-weasyprint' | 'pandoc-wkhtmltopdf' | 'playwright'
  },

  // JIRA tracking
  jira_ticket: null,
  jira_updates: [],

  // Browser state
  browser_visible: null,
  last_browser_check: null,

  // Errors
  errors_encountered: []
}
```

---

## WORKFLOW PROGRESS TRACKING (SIMPLE)

**Purpose:** Simple, verifiable tracking without over-engineering

**Implementation:** Create `.workflow-progress.txt` at workflow start

### Creating Progress File

**At Phase 1, Command 1 (after capturing working directory):**

```bash
EXECUTE: Bash
cat > "${WORKFLOW_STATE.working_directory}/test-reports/accessibility-reports/${WORKFLOW_STATE.identifier}/.workflow-progress.txt" << 'PROGRESS_EOF'
${WORKFLOW_STATE.identifier} ACCESSIBILITY SCAN PROGRESS
Started: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Type: ${WORKFLOW_STATE.input_type === 'url' ? 'SINGLE PAGE' : 'MULTI-PAGE'} (${WORKFLOW_STATE.total_pages} page(s))

━━━ PHASE 1: DISCOVER ━━━
[ ] 1.1 Working directory
[ ] 1.2 Input type
[ ] 1.3 Pages loaded
[ ] 1.4 Identifier
[ ] 1.5 Directories
[ ] 1.6 Exclusions
[ ] 1.7 Credentials
[ ] 1.8 Authentication
PHASE 1: [ ]

━━━ PHASE 2: SCAN ━━━
$(generate_page_checklist)
[ ] 2.13 Multi-page summary
[ ] 2.14 JIRA update
[ ] 2.15 Auto-filter → FILE: auto-excluded-issues.json
[ ] 2.16 AI double-check → FILES: needs-review-issues.json, suggested-exclusions.json
PHASE 2: [ ]

━━━ PHASE 3: REVIEW ━━━
[ ] 3.1 Load issues
[ ] 3.2 Present review
[ ] 3.3 Manual classification
[ ] 3.4 Review summary
[ ] 3.5 Update scan reports
[ ] 3.6 Generate per-page audits (${WORKFLOW_STATE.total_pages} files)
[ ] 3.7 Verify complete
PHASE 3: [ ]

━━━ POST-WORKFLOW ━━━
[ ] Exclusion maintenance
[ ] Browser cleanup
POST: [ ]

━━━ FILES TRACKING ━━━
Expected: $((2 + ${WORKFLOW_STATE.total_pages} * 4)) files
Created: 0
PROGRESS_EOF

STORE: WORKFLOW_STATE.progress_file = "${WORKFLOW_STATE.working_directory}/test-reports/accessibility-reports/${WORKFLOW_STATE.identifier}/.workflow-progress.txt"

DISPLAY: "✓ Progress tracking file created: .workflow-progress.txt"
```

### Helper Function for Adaptive Page Checklist

```javascript
function generate_page_checklist() {
  const total_pages = WORKFLOW_STATE.total_pages
  const pages = WORKFLOW_STATE.pages

  if (total_pages === 1) {
    return `[ ] 2.1-2.12 Page: ${pages[0].identifier} (11 tools)`
  } else {
    let checklist = ""
    for (let i = 0; i < total_pages; i++) {
      checklist += `[ ] 2.1-2.12 Page ${i+1}: ${pages[i].identifier} (11 tools)\n`
    }
    return checklist.trim()
  }
}
```

### Updating Progress

**After each command completes:**

```bash
# Mark command complete (replace [ ] with [✓])
sed -i '' 's/\[ \] 1.1 Working directory/[✓] 1.1 Working directory/' "${WORKFLOW_STATE.progress_file}"

# Update file count
current_count=$(find "${WORKFLOW_STATE.pages_directory}" -type f 2>/dev/null | wc -l | tr -d ' ')
sed -i '' "s/Created: .*/Created: ${current_count}/" "${WORKFLOW_STATE.progress_file}"
```

**Mark phase complete (after all commands in phase):**

```bash
sed -i '' 's/PHASE 1: \[ \]/PHASE 1: [✓]/' "${WORKFLOW_STATE.progress_file}"
```

**Mark phase incomplete if errors:**

```bash
sed -i '' 's/PHASE 1: \[ \]/PHASE 1: [⚠]/' "${WORKFLOW_STATE.progress_file}"
```

### Checking Progress

**Anytime during workflow:**

```bash
cat "${WORKFLOW_STATE.progress_file}"
```

**Benefits:**
- ✅ One file tracks entire workflow
- ✅ Adapts to single or multi-page automatically
- ✅ Shows files expected vs created
- ✅ Simple text format (human-readable)
- ✅ Check anytime without tool knowledge
- ✅ No over-engineering - just 3 simple rules:
  1. Update after each command
  2. Verify files with ls after creation
  3. Check progress file before marking phase complete

---

## FILE MANIFEST VERIFICATION

**Purpose:** Verify all expected files exist before marking phases complete

### Helper Functions

**Verify Phase Files Complete:**

```javascript
/**
 * Verify all expected files exist for a phase
 * Works for both single and multi-page scans
 * @param {number} phase_number - Phase number (1, 2, or 3)
 * @returns {boolean} - true if all files exist, false if any missing
 */
function verify_phase_files_complete(phase_number) {
  const expected_files = get_expected_files_for_phase(phase_number)
  const missing_files = []

  DISPLAY: ""
  DISPLAY: "🔍 Verifying Phase {phase_number} files..."

  for (const file_pattern of expected_files) {
    // Check if file exists
    const result = Bash(`ls ${file_pattern} 2>&1`)

    if (result.exit_code !== 0) {
      missing_files.push(file_pattern)
      DISPLAY: "  ✗ Missing: {file_pattern}"
    } else {
      DISPLAY: "  ✓ Found: {file_pattern}"
    }
  }

  if (missing_files.length > 0) {
    DISPLAY: ""
    DISPLAY: "❌ PHASE {phase_number} INCOMPLETE - Missing {missing_files.length} file(s)"
    DISPLAY: ""

    // Update progress file with warning
    Bash(`sed -i '' 's/PHASE ${phase_number}: \\[ \\]/PHASE ${phase_number}: [⚠]/' "${WORKFLOW_STATE.progress_file}"`)

    return false
  }

  DISPLAY: ""
  DISPLAY: "✅ All expected files verified for Phase {phase_number}"

  // Update progress file with success
  Bash(`sed -i '' 's/PHASE ${phase_number}: \\[ \\]/PHASE ${phase_number}: [✓]/' "${WORKFLOW_STATE.progress_file}"`)

  return true
}

/**
 * Get expected files for a specific phase
 * Adapts to page count automatically
 * @param {number} phase - Phase number (1, 2, or 3)
 * @returns {Array<string>} - Array of file patterns to check
 */
function get_expected_files_for_phase(phase) {
  const report_dir = WORKFLOW_STATE.report_directory
  const pages_dir = WORKFLOW_STATE.pages_directory

  switch(phase) {
    case 1:
      // Phase 1: DISCOVER - Directories and exclusions loaded
      return [
        `${report_dir}`,
        `${pages_dir}`
      ]

    case 2:
      // Phase 2: SCAN - Per-page reports + auto-filter + AI double-check
      const phase2_files = [
        `${report_dir}/auto-excluded-issues.json`,
        `${report_dir}/needs-review-issues.json`
      ]

      // Add per-page files (adapts to page count)
      for (const page of WORKFLOW_STATE.pages) {
        const page_dir = `${pages_dir}${page.identifier}/`
        phase2_files.push(`${page_dir}/scan-*.json`)
        phase2_files.push(`${page_dir}/scan-*.md`)
        phase2_files.push(`${page_dir}/screenshot.png`)
      }

      return phase2_files

    case 3:
      // Phase 3: REVIEW - Backups + audits per page
      const phase3_files = [
        `${report_dir}/issue-review-audit-*.md`
      ]

      // Add per-page backups (adapts to page count)
      for (const page of WORKFLOW_STATE.pages) {
        const page_dir = `${pages_dir}${page.identifier}/`
        phase3_files.push(`${page_dir}/scan-*.json.pre-review-backup`)
      }

      return phase3_files

    default:
      return []
  }
}

/**
 * Count actual files created vs expected
 * @returns {Object} - { expected, created, percentage }
 */
function get_file_count_summary() {
  const total_pages = WORKFLOW_STATE.total_pages
  const pages_dir = WORKFLOW_STATE.pages_directory

  // Expected:
  // - 2 root files (auto-excluded-issues.json, needs-review-issues.json)
  // - Per page: 4 files (scan.json, scan.json.pre-review-backup, scan.md, screenshot.png)
  // - 1 audit file (issue-review-audit-*.md)
  const expected = 2 + (total_pages * 4) + 1

  // Count actual files
  const result = Bash(`find "${pages_dir}" -type f 2>/dev/null | wc -l | tr -d ' '`)
  const created = parseInt(result.stdout.trim() || "0")

  const percentage = expected > 0 ? Math.round((created / expected) * 100) : 0

  return {
    expected,
    created,
    percentage
  }
}
```

### Usage in Phase Gates

**Before marking phase complete:**

```javascript
// At end of Phase 2 (before Phase 2 gate)
IF !verify_phase_files_complete(2):
  ERROR: "Cannot mark Phase 2 complete - files missing"
  ASK: "Fix missing files now? (yes/no)"
  STOP

// Mark phase complete
WORKFLOW_STATE.phase_2_complete = true
```

**At workflow completion:**

```javascript
// Show final file count
const file_summary = get_file_count_summary()

DISPLAY: ""
DISPLAY: "📁 FILE CREATION SUMMARY:"
DISPLAY: "  Expected: {file_summary.expected} files"
DISPLAY: "  Created: {file_summary.created} files"
DISPLAY: "  Completion: {file_summary.percentage}%"

IF file_summary.percentage < 100:
  DISPLAY: "  ⚠️ Warning: Not all expected files were created"
```

---

## Workflow Phases

### PHASE 1: DISCOVER - EXECUTABLE COMMAND SEQUENCE

**CRITICAL:** Execute commands in EXACT order. NO skipping. NO improvisation. NO reordering.

---

#### PRE-PHASE GATE DISPLAY

Before execution, display this EXACT checklist to user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚪 PHASE 1 ENTRY GATE: DISCOVER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 DOCUMENTATION READ:
   File: a11y-vpat-scan.md
   Section: "PHASE 1: DISCOVER - EXECUTABLE COMMAND SEQUENCE"

📋 EXACT COMMANDS I WILL EXECUTE (8 commands in order):

1. Capture Working Directory
   → Tool: Bash (git rev-parse --show-toplevel)
   → Finds git repository root (works from any subdirectory)
   → Store: WORKFLOW_STATE.working_directory
   → Verify: Display path to user

2. Determine Input Type
   → Check: parameter.endsWith('.json') OR .startsWith('http')
   → Store: WORKFLOW_STATE.input_type = 'pages_file' | 'url'
   → Verify: Announce input type to user

3. Load Pages Configuration
   → IF url: Create single page object
   → IF pages_file: Read and parse JSON
   → Store: WORKFLOW_STATE.pages, WORKFLOW_STATE.total_pages
   → Verify: Display page count to user

4. Determine Report Identifier
   → IF JIRA ticket: Use ticket ID
   → ELSE: Ask user for keyword OR auto-generate
   → Store: WORKFLOW_STATE.identifier, WORKFLOW_STATE.has_jira_ticket
   → Verify: Display identifier to user

5. Create Directory Structure
   → Tool: Bash (mkdir -p)
   → Create: {working_dir}/test-reports/accessibility-reports/{identifier}/pages/
   → Store: WORKFLOW_STATE.report_directory, WORKFLOW_STATE.pages_directory
   → Verify: Run ls -la to confirm directories exist

6. Load Scan Exclusions (MANDATORY - DO NOT SKIP)
   → Tool: Bash (ls) to check if file exists
   → File: {working_dir}/test-reports/accessibility-scan-exclusions.json
   → IF exists: Read file, ask user "Use exclusions? (yes/no)"
   → Store: WORKFLOW_STATE.exclusions, WORKFLOW_STATE.exclusions_enabled
   → Verify: Display exclusions_enabled and count to user

7. Load Credentials
   → Check: Command parameters for USERNAME/PASSWORD
   → IF missing: Check .env for PLAYWRIGHT_USER/PLAYWRIGHT_PASSWORD
   → Store: credentials (do not display)
   → Verify: Announce "Credentials: found/not found"

8. Authentication
   → Ask: "Does page require authentication? (yes/no)"
   → IF yes: Ask "Automated or manual? (auto/manual)"
   → Execute: open_browser, login (auto) OR navigate + wait for 'ready' (manual)
   → Verify: get_page_info() - confirm on correct page
   → Store: WORKFLOW_STATE.authenticated = true

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I WILL EXECUTE EXACTLY THESE 8 COMMANDS IN ORDER.
I WILL NOT SKIP ANY COMMANDS.
I WILL NOT CHANGE THE ORDER.
I WILL VERIFY EACH COMMAND BEFORE PROCEEDING TO NEXT.

Type 'approved' to proceed with execution
Type 'clarify: [command number]' if you want detail on a command
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**WAIT for user to type 'approved' before executing ANY commands.**

---

#### COMMAND EXECUTION SEQUENCE

##### COMMAND 1: Capture Working Directory

```bash
EXECUTE: git rev-parse --show-toplevel 2>&1

IF command succeeds (exit code 0):
  STORE: WORKFLOW_STATE.working_directory = <result>
  DISPLAY: "Working directory (git repo root): {WORKFLOW_STATE.working_directory}"
  DISPLAY: "All reports will be created in: {WORKFLOW_STATE.working_directory}/test-reports/"
  VERIFY: Value is non-empty absolute path starting with "/"

ELSE (not in git repo):
  ERROR: "This command must be run from within a git repository"
  ERROR: "Current directory: $(pwd)"
  ERROR: "Please cd to your repository root and try again"
  STOP
```

**Checkpoint:** If verification fails, STOP and alert user.

**Why use git rev-parse:**
- ✅ Always finds repository root regardless of where command is invoked
- ✅ Works from any subdirectory (e.g., `.claude/commands`)
- ✅ Prevents creating reports in wrong location
- ✅ Ensures exclusions file is found at correct path

---

##### COMMAND 2: Determine Input Type

```javascript
GET: parameter (first argument to workflow)
CHECK:
  IF parameter.endsWith('.json'):
    WORKFLOW_STATE.input_type = 'pages_file'
    WORKFLOW_STATE.pages_file_path = parameter
  ELSE IF parameter.startsWith('http'):
    WORKFLOW_STATE.input_type = 'url'
    WORKFLOW_STATE.single_page_url = parameter
  ELSE:
    ERROR: "Invalid input. Provide URL or path to pages JSON file."
    EXIT workflow

DISPLAY: "Input type: {WORKFLOW_STATE.input_type}"
VERIFY: input_type is 'pages_file' OR 'url'
```

**Checkpoint:** If verification fails, STOP and alert user.

---

##### COMMAND 3: Load Pages Configuration

**IF input_type === 'url':**
```javascript
EXECUTE:
  identifier = extract_last_path_segment(WORKFLOW_STATE.single_page_url)
  page_object = {
    url: WORKFLOW_STATE.single_page_url,
    identifier: identifier,
    priority: 'high',
    requires_auth: null
  }
  WORKFLOW_STATE.pages = [page_object]
  WORKFLOW_STATE.total_pages = 1

DISPLAY:
  "📋 SINGLE-PAGE AUDIT"
  "Page: {identifier}"
  "URL: {url}"

VERIFY: WORKFLOW_STATE.pages.length === 1
```

**IF input_type === 'pages_file':**
```javascript
EXECUTE:
  Tool: Read (WORKFLOW_STATE.pages_file_path)
  config = JSON.parse(file_content)
  WORKFLOW_STATE.pages = config.pages
  WORKFLOW_STATE.total_pages = config.pages.length

DISPLAY:
  "📋 MULTI-PAGE AUDIT CONFIGURATION"
  "Pages to Scan: {WORKFLOW_STATE.total_pages}"
  [List all pages]

VERIFY: WORKFLOW_STATE.pages.length > 0
```

**Checkpoint:** If verification fails, STOP and alert user.

---

##### COMMAND 4: Determine Report Identifier

```javascript
IF JIRA_TICKET parameter provided:
  WORKFLOW_STATE.identifier = JIRA_TICKET
  WORKFLOW_STATE.has_jira_ticket = true
  DISPLAY: "Identifier: {JIRA_TICKET} (JIRA ticket)"
ELSE:
  DISPLAY:
    "📁 REPORT ORGANIZATION"
    "No JIRA ticket provided. Reports will be organized in folders."
    "Provide keyword OR press Enter for auto-generated: '{app-name}-vpat-{date}'"
    "Keyword: _____"

  WAIT for user input

  IF user provides keyword:
    WORKFLOW_STATE.identifier = user_keyword
  ELSE (empty input):
    app_name = extract_app_name_from_url() OR 'scan'
    WORKFLOW_STATE.identifier = "{app_name}-vpat-{YYYY-MM-DD}"

  WORKFLOW_STATE.has_jira_ticket = false
  DISPLAY: "Identifier: {WORKFLOW_STATE.identifier}"

VERIFY: WORKFLOW_STATE.identifier is non-empty string
VERIFY: WORKFLOW_STATE.has_jira_ticket is boolean
```

**Checkpoint:** If verification fails, STOP and alert user.

---

##### COMMAND 5: Create Directory Structure

```bash
EXECUTE: Bash
  mkdir -p "{WORKFLOW_STATE.working_directory}/test-reports/accessibility-reports/{WORKFLOW_STATE.identifier}/pages"

STORE:
  WORKFLOW_STATE.report_directory = "{WORKFLOW_STATE.working_directory}/test-reports/accessibility-reports/{WORKFLOW_STATE.identifier}/"
  WORKFLOW_STATE.pages_directory = "{WORKFLOW_STATE.working_directory}/test-reports/accessibility-reports/{WORKFLOW_STATE.identifier}/pages/"

VERIFY: Bash
  ls -la "{WORKFLOW_STATE.report_directory}"

DISPLAY:
  "✅ Directories created:"
  "   Report: {WORKFLOW_STATE.report_directory}"
  "   Pages: {WORKFLOW_STATE.pages_directory}"

CHECK: ls command shows directories exist
```

**Checkpoint:** If directories don't exist, STOP and alert user.

---

##### COMMAND 6: Load Scan Exclusions (MANDATORY - DO NOT SKIP THIS COMMAND)

```bash
DEFINE: exclusions_file = "{WORKFLOW_STATE.working_directory}/test-reports/accessibility-scan-exclusions.json"

EXECUTE: Bash
  ls -la "{exclusions_file}" 2>&1

IF file exists (exit code 0):
  EXECUTE: Read
    file_content = Read(exclusions_file)
    config = JSON.parse(file_content)

  DISPLAY:
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    "🚫 SCAN EXCLUSIONS LOADED"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    ""
    "Found exclusions configuration: {config.exclusions.length} selector(s)"
    ""
    "The following elements will be EXCLUDED from scanning:"
    [List each selector in config.exclusions]
    ""
    "Source: {exclusions_file}"
    ""
    "Use exclusions? (yes/no, default: yes): _____"

  WAIT for user response

  IF response === 'no' OR response === 'skip':
    WORKFLOW_STATE.exclusions_enabled = false
    WORKFLOW_STATE.exclusions = []
    DISPLAY: "✓ Exclusions disabled - scanning entire page"
  ELSE:
    WORKFLOW_STATE.exclusions_enabled = true
    WORKFLOW_STATE.exclusions = config.exclusions
    DISPLAY: "✓ Exclusions enabled - {config.exclusions.length} selectors will be excluded"

ELSE (file not found):
  WORKFLOW_STATE.exclusions_enabled = false
  WORKFLOW_STATE.exclusions = []
  DISPLAY: "ℹ️  No exclusions file found - scanning entire page"

VERIFY: Display to user
  "Exclusions enabled: {WORKFLOW_STATE.exclusions_enabled}"
  "Exclusions count: {WORKFLOW_STATE.exclusions.length}"
```

**Checkpoint:**
- WORKFLOW_STATE.exclusions_enabled MUST be boolean (true/false)
- WORKFLOW_STATE.exclusions MUST be array (empty or with selectors)
- MUST display verification to user
- If any check fails, STOP and alert user

**⚠️ CRITICAL:** This command CANNOT be skipped. Even if no exclusions file exists, you must set exclusions_enabled=false and exclusions=[].

---

##### COMMAND 7: Load Credentials

```javascript
CHECK: Command parameters
  username_param = parameter[2] (if provided)
  password_param = parameter[3] (if provided)

IF username_param AND password_param:
  credentials = { username: username_param, password: password_param }
  DISPLAY: "Credentials: Loaded from command parameters"
ELSE:
  EXECUTE: Bash
    grep -E "^(PLAYWRIGHT_USER|PLAYWRIGHT_PASSWORD)=" .env | wc -l

  IF result >= 2:
    credentials = { loaded: true }
    DISPLAY: "Credentials: Found in .env file"
  ELSE:
    credentials = { loaded: false }
    DISPLAY: "Credentials: Not found (will prompt if needed)"

STORE: credentials (do not display actual values)
VERIFY: Display credential status to user
```

**Checkpoint:** User sees credential status message.

---

##### COMMAND 8: Authentication

```javascript
DISPLAY:
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  "🔐 AUTHENTICATION"
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ""
  "Does this page require authentication? (yes/no)"

WAIT for user response

IF response === 'no':
  WORKFLOW_STATE.authenticated = true
  DISPLAY: "✓ No authentication required"
  GOTO: POST-PHASE VERIFICATION

ELSE IF response === 'yes':
  DISPLAY: "Authentication method? (auto/manual)"
  WAIT for user response

  IF method === 'auto':
    VERIFY: credentials are available
    IF NOT available:
      ERROR: "Credentials not found. Please provide or use manual login."
      STOP

    EXECUTE:
      mcp__mcp-accessibility__open_browser(headless: false)
      mcp__mcp-accessibility__navigate(first_page.url)
      mcp__mcp-accessibility__login(username, password)
      page_info = mcp__mcp-accessibility__get_page_info()

    VERIFY: page_info.url matches expected page
    IF verification fails:
      ERROR: "Login failed - URL mismatch"
      STOP

    WORKFLOW_STATE.authenticated = true
    DISPLAY: "✓ Automated login successful"

  ELSE IF method === 'manual':
    EXECUTE:
      mcp__mcp-accessibility__open_browser(headless: false)
      mcp__mcp-accessibility__navigate(first_page.url)
      page_info = mcp__mcp-accessibility__get_page_info()

    DISPLAY:
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      "🔐 AUTHENTICATION CHECKPOINT"
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      "Browser opened: ✓"
      "Navigated to: {page_info.url}"
      "Current page title: {page_info.title}"
      ""
      "Please log in manually if needed."
      ""
      "Are you logged in and ready to scan?"
      "Type 'ready' when authenticated, or 'retry' to reopen browser"
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    WAIT for user response

    IF response === 'ready':
      page_info = mcp__mcp-accessibility__get_page_info()
      WORKFLOW_STATE.authenticated = true
      DISPLAY: "✓ Manual authentication confirmed"
      DISPLAY: "Current page: {page_info.title} ({page_info.url})"

    ELSE IF response === 'retry':
      GOTO: start of manual authentication

    ELSE:
      ERROR: "Invalid response. Type 'ready' or 'retry'"
      STOP

VERIFY: WORKFLOW_STATE.authenticated === true
```

**Checkpoint:** If authenticated is not true, STOP and alert user.

---

#### POST-PHASE GATE VERIFICATION

After ALL 8 commands complete, display this checklist:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁 PHASE 1 COMPLETION VERIFICATION: DISCOVER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ COMPLETION CHECKLIST:

✓ Command 1: Working directory captured
  → Value: {WORKFLOW_STATE.working_directory}

✓ Command 2: Input type determined
  → Value: {WORKFLOW_STATE.input_type}

✓ Command 3: Pages configuration loaded
  → Value: {WORKFLOW_STATE.total_pages} page(s)

✓ Command 4: Report identifier determined
  → Value: {WORKFLOW_STATE.identifier}
  → JIRA integration: {WORKFLOW_STATE.has_jira_ticket}

✓ Command 5: Directory structure created
  → Report dir: {WORKFLOW_STATE.report_directory}
  → Pages dir: {WORKFLOW_STATE.pages_directory}

✓ Command 6: Scan exclusions loaded (CRITICAL CHECK)
  → Enabled: {WORKFLOW_STATE.exclusions_enabled}
  → Count: {WORKFLOW_STATE.exclusions.length}
  → Selectors: {list WORKFLOW_STATE.exclusions OR 'None'}

✓ Command 7: Credentials loaded
  → Status: {credential_status}

✓ Command 8: Authentication completed
  → Value: {WORKFLOW_STATE.authenticated}
  → Current page: {page_info.title}

📂 FILES CREATED:
   ✓ Directories: {count} folders created
   ✓ Browser: Open and authenticated

⚙️ WORKFLOW STATE UPDATED:
   ✓ phase_1_complete = (will be set to true after 'proceed')

Status: COMPLETE
Blockers: None

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Type 'proceed' to advance to Phase 2 (SCAN)
⚠️ Type 'verify: [command number]' to inspect a specific command result
❌ Type 'redo' if something is wrong
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**WAIT** for user to type 'proceed' before marking phase complete.

**ONLY AFTER 'proceed':**
```javascript
WORKFLOW_STATE.phase_1_complete = true
```

---

#### ENFORCEMENT RULES

1. **MUST execute commands in exact order (1→2→3→4→5→6→7→8)**
2. **CANNOT skip any command** (including Command 6 - Exclusions)
3. **CANNOT reorder commands**
4. **MUST verify each command before proceeding to next**
5. **MUST display verification evidence to user after each command**
6. **MUST stop if any verification fails**
7. **MUST wait for user 'proceed' before marking phase complete**

---

#### DEVIATION DETECTION

If you detect yourself about to:
- Skip a command
- Execute commands out of order
- Not verify a command
- Not display evidence to user

**IMMEDIATELY STOP AND DISPLAY:**

```
⚠️ DEVIATION DETECTED - STOPPED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
I was about to deviate from the command sequence.

What I was about to do: {description}
Correct action: {what should happen}

HALTED - Awaiting user permission to continue correctly.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### PHASE 2: SCAN - EXECUTABLE COMMAND SEQUENCE (SMART APPROACH ONLY)

**CRITICAL:** Execute commands in EXACT order. NO skipping. NO improvisation. NO reordering.

---

## PRE-PHASE GATE DISPLAY

Display Phase 2 entry gate with:
- Documentation section read ("PHASE 2: SCAN - EXECUTABLE COMMAND SEQUENCE")
- Approach: Smart Scanning (5-12 tools/page)
- Pages to scan: {WORKFLOW_STATE.total_pages}
- Command summary: Per-page loop (14 commands) - Setup, Browser Check, Navigate, Exclusions, Foundation Scan (2-3 tools), Context Capture (3 tools), Gap Analysis (0-7 tools), Tool Validation, Reports, Summary
- After all pages: Multi-page summary, JIRA update if applicable

**CRITICAL:** Will execute commands in exact order, no skipping, verify each step.

Wait for 'approved' to proceed.

**WAIT for user to type 'approved' before executing ANY commands.**

---

## COMMAND EXECUTION SEQUENCE

### INITIALIZATION

#### COMMAND 1: Initialize Phase

```javascript
EXECUTE:
  console.log("Starting smart accessibility scan for {WORKFLOW_STATE.total_pages} page(s)...")
  scan_start_time = Date.now()
  WORKFLOW_STATE.current_page_index = 0
  WORKFLOW_STATE.page_results = []

VERIFY: scan_start_time is set
VERIFY: page_results array is empty
```

**Checkpoint:** If initialization fails, STOP and alert user.

---

### PER-PAGE SCANNING LOOP

**FOR EACH PAGE in WORKFLOW_STATE.pages array (index 0 to total_pages-1):**

#### COMMAND 2: Setup Page Context

```bash
EXECUTE:
  current_page = WORKFLOW_STATE.pages[WORKFLOW_STATE.current_page_index]
  page_directory = "{WORKFLOW_STATE.pages_directory}{current_page.identifier}/"

  mkdir -p "{page_directory}"

STORE:
  WORKFLOW_STATE.current_page = current_page
  WORKFLOW_STATE.page_directory = page_directory
  all_findings = []  // Initialize empty findings array for this page

VERIFY: Bash
  ls -la "{page_directory}"

DISPLAY:
  "Page directory created: {page_directory}"

CHECK: Directory exists
```

**Checkpoint:** If directory creation fails, STOP and alert user.

---

#### COMMAND 3: Announce Page Scan

```
DISPLAY:
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  "SCANNING PAGE {current_page_index + 1}/{total_pages}"
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ""
  "Identifier: {current_page.identifier}"
  "URL: {current_page.url}"
  "Priority: {current_page.priority}"
```

---

#### COMMAND 4: Browser Check

```
DISPLAY:
  "🔍 BROWSER CHECK"
  ""
  "About to navigate to: {current_page.url}"
  ""
  "Please verify:"
  "□ Browser window is visible"
  "□ No errors displayed"
  "□ Logged in (if authentication required)"
  ""
  "Ready to proceed? (yes/no/refresh)"

WAIT for user response

IF response === 'refresh':
  mcp__mcp-accessibility__navigate(current_page.url)
  WAIT 2000ms
  ASK AGAIN: "Ready to proceed? (yes/no)"

IF response === 'no':
  ERROR: "User not ready. Please resolve browser issues."
  STOP

ELSE (response === 'yes'):
  CONTINUE to Command 5
```

**Checkpoint:** User must confirm browser is ready.

---

#### COMMAND 5: Navigate to Page

```javascript
// Step 1: Initial Navigation
EXECUTE:
  mcp__mcp-accessibility__navigate(current_page.url)
  WAIT 2000ms  // Allow page to load
  page_info = mcp__mcp-accessibility__get_page_info()

STORE:
  WORKFLOW_STATE.current_page_info = page_info

VERIFY: page_info.url matches current_page.url (allow for redirects)

DISPLAY:
  "✓ Navigated to: {page_info.title}"
  "  URL: {page_info.url}"

// Step 2: Execute Navigation Instructions (if provided)
IF current_page.how_to_navigate EXISTS:
  DISPLAY:
    "📍 Navigation: {current_page.how_to_navigate}"

  instructions = current_page.how_to_navigate.toLowerCase()

  // Check for "no action" patterns
  IF instructions.includes("verify the page is loaded"):
    DISPLAY: "  → Page ready (no additional actions)"
    CONTINUE to Command 6

  // Parse for click actions
  IF instructions.match(/click\s+(?:on\s+)?(?:the\s+)?(.+?)\s+button/i):
    button_text = extract_text_from_match(instructions, /click\s+(?:on\s+)?(?:the\s+)?(.+?)\s+button/i)

    DISPLAY: "  → Clicking button: {button_text}"

    // Get snapshot to find element
    TRY:
      snapshot = mcp__mcp-accessibility__browser_snapshot()

      // Find element ref in snapshot
      element_ref = findElementInSnapshot(snapshot, button_text, 'button')

      IF element_ref === null:
        // Try fuzzy match
        element_ref = findElementInSnapshotFuzzy(snapshot, button_text)

      IF element_ref !== null:
        TRY:
          mcp__mcp-accessibility__click(selector: element_ref)
          WAIT 1500ms  // Allow UI to respond
          DISPLAY: "  ✓ Clicked successfully"
        CATCH error:
          ERROR: "Click failed: {error.message}"
          DISPLAY_RECOVERY_OPTIONS()
      ELSE:
        ERROR: "Could not find button: {button_text}"
        DISPLAY: "Available clickable elements:"
        DISPLAY: extractClickableElements(snapshot)
        DISPLAY_RECOVERY_OPTIONS()
    CATCH error:
      ERROR: "Navigation action failed: {error.message}"
      DISPLAY_RECOVERY_OPTIONS()

  ELSE IF instructions.match(/click\s+(.+)/i):
    // Generic click (no "button" keyword)
    element_text = extract_text_from_match(instructions, /click\s+(.+)/i)

    DISPLAY: "  → Clicking: {element_text}"

    TRY:
      snapshot = mcp__mcp-accessibility__browser_snapshot()
      element_ref = findElementInSnapshot(snapshot, element_text, 'any')

      IF element_ref === null:
        element_ref = findElementInSnapshotFuzzy(snapshot, element_text)

      IF element_ref !== null:
        TRY:
          mcp__mcp-accessibility__click(selector: element_ref)
          WAIT 1500ms
          DISPLAY: "  ✓ Clicked successfully"
        CATCH error:
          ERROR: "Click failed: {error.message}"
          DISPLAY_RECOVERY_OPTIONS()
      ELSE:
        ERROR: "Could not find element: {element_text}"
        DISPLAY: "Available elements:"
        DISPLAY: extractClickableElements(snapshot)
        DISPLAY_RECOVERY_OPTIONS()
    CATCH error:
      ERROR: "Navigation action failed: {error.message}"
      DISPLAY_RECOVERY_OPTIONS()

  // Verify final state
  final_info = mcp__mcp-accessibility__get_page_info()
  DISPLAY: "  ✓ Current page: {final_info.title}"

ELSE:
  DISPLAY: "  ℹ️  No navigation instructions"

CONTINUE to Command 6


// HELPER: Display recovery options
FUNCTION DISPLAY_RECOVERY_OPTIONS():
  ASK: "Navigation failed. Choose an option:"
  ASK: "  1. retry - Try the action again"
  ASK: "  2. skip - Skip this page, continue to next"
  ASK: "  3. manual - I'll navigate manually (tell me when done)"
  ASK: "  4. abort - Stop the scan"

  WAIT for user response

  IF response === 'retry':
    RETRY current navigation action
  ELSE IF response === 'skip':
    DISPLAY: "⏭️  Skipping page: {current_page.identifier}"
    CONTINUE to next page in loop
  ELSE IF response === 'manual':
    ASK: "Please navigate to the correct page state manually."
    ASK: "Type 'done' when ready to continue."
    WAIT for 'done'
    CONTINUE to Command 6
  ELSE IF response === 'abort':
    ERROR: "Scan aborted by user"
    STOP
```

**Checkpoint:** If page load fails or URL mismatch, STOP and alert user.

---

#### Navigation Instruction Parsing

Parse navigation instructions to extract element selectors from page snapshot. Use regex to match snapshot format `type "text" [ref="..."]` and find elements by text (exact or fuzzy matching with 50%+ word match). If element not found, display available clickable elements for user guidance.

---

#### COMMAND 6: Apply Exclusions (If Enabled)

```javascript
IF WORKFLOW_STATE.exclusions_enabled === true:
  DISPLAY:
    "🚫 Applying exclusions..."
    "Excluding {WORKFLOW_STATE.exclusions.length} selector(s):"
    [List each selector in WORKFLOW_STATE.exclusions]

  // Note: MCP accessibility tools don't support JS injection
  // Document exclusions for manual consideration during scan
  console.log("Exclusions will be considered in tool-specific contexts where supported")

ELSE:
  DISPLAY: "ℹ️  No exclusions - scanning entire page"

VERIFY: exclusions_enabled status displayed
```

---

#### COMMAND 7: Execute Foundation Scan (2 MANDATORY Tools)

```javascript
ANNOUNCE: "▶ STEP 1: Foundation Scan (2-3 tools)"

// Tool 1: WCAG 2.1 AA Enhanced Tests
ANNOUNCE: "▶ Executing: run_wcag_21_aa_tests..."
result_1 = await mcp__mcp-accessibility__run_wcag_21_aa_tests()
all_findings.push({tool: 'run_wcag_21_aa_tests', timestamp: new Date().toISOString(), result: result_1})
ANNOUNCE: "✅ Completed: run_wcag_21_aa_tests ({result_1.issues?.length || 0} issues)"

// Tool 1b: WCAG 2.2 AA Tests (WCAG 2.2 mode only)
if (wcag_version === '2.2') {
  ANNOUNCE: "▶ Executing: run_wcag_22_aa_tests..."
  result_1b = await mcp__mcp-accessibility__run_wcag_22_aa_tests()
  all_findings.push({tool: 'run_wcag_22_aa_tests', timestamp: new Date().toISOString(), result: result_1b})
  ANNOUNCE: "✅ Completed: run_wcag_22_aa_tests ({result_1b.issues?.length || 0} issues)"
}

// Tool 2: axe-core Automated Testing
ANNOUNCE: "▶ Executing: analyze_accessibility..."
result_2 = await mcp__mcp-accessibility__analyze_accessibility({reportFormat: 'json'})
all_findings.push({tool: 'analyze_accessibility', timestamp: new Date().toISOString(), result: result_2})
ANNOUNCE: "✅ Completed: analyze_accessibility ({result_2.issues?.length || 0} issues)"

VERIFY: all_findings.length === 2
DISPLAY: "✓ Foundation Scan Complete: 2 tools executed"
```

**Checkpoint:** If either tool fails, STOP and alert user.

---

#### COMMAND 8: Execute Page Context Capture (3 MANDATORY Tools)

```javascript
ANNOUNCE: "▶ STEP 2: Page Context Capture (3 tools)"

// Tool 3: Page Info
ANNOUNCE: "▶ Executing: get_page_info..."
result_3 = await mcp__mcp-accessibility__get_page_info()
all_findings.push({tool: 'get_page_info', timestamp: new Date().toISOString(), result: result_3})
ANNOUNCE: "✅ Completed: get_page_info"

// Tool 4: Screenshot (CRITICAL: Use RELATIVE path WITHOUT test-reports prefix)
ANNOUNCE: "▶ Executing: screenshot..."
// Note: The screenshot tool automatically prepends working_directory AND test-reports/
// So we only provide: accessibility-reports/{identifier}/pages/{page}/screenshot.png
screenshot_relative_path = "accessibility-reports/{WORKFLOW_STATE.identifier}/pages/{current_page.identifier}/screenshot.png"
result_4 = await mcp__mcp-accessibility__screenshot({
  fullPage: true,
  filename: screenshot_relative_path
})
all_findings.push({tool: 'screenshot', timestamp: new Date().toISOString(), result: result_4})

// MANDATORY: Verify screenshot was saved correctly
// Expected final path: {working_directory}/test-reports/{screenshot_relative_path}
expected_screenshot_path = "{WORKFLOW_STATE.working_directory}/test-reports/{screenshot_relative_path}"
VERIFY: Bash
  ls -la "{expected_screenshot_path}"

CHECK: File exists at correct path
IF verification fails:
  ERROR: "Screenshot not saved at expected path: {expected_screenshot_path}"
  STOP

ANNOUNCE: "✅ Completed: screenshot (saved to test-reports/{screenshot_relative_path})"

// Tool 5: Accessibility Tree
ANNOUNCE: "▶ Executing: get_accessibility_tree..."
result_5 = await mcp__mcp-accessibility__get_accessibility_tree()
all_findings.push({tool: 'get_accessibility_tree', timestamp: new Date().toISOString(), result: result_5})
ANNOUNCE: "✅ Completed: get_accessibility_tree"

VERIFY: all_findings.length === 5
DISPLAY: "✓ Page Context Capture Complete: 5 tools executed total"
```

**Checkpoint:** If any tool fails or screenshot verification fails, STOP and alert user.

---

#### COMMAND 9: Execute Strategic Gap Analysis (0-7 CONDITIONAL Tools)

```javascript
ANNOUNCE: "▶ STEP 3: Strategic Gap Analysis (analyzing page content)"

// Get accessibility tree from results
accessibilityTree = all_findings.find(f => f.tool === 'get_accessibility_tree')?.result

strategic_tools_count = 0

// Check for forms
hasForms = accessibilityTree.includes('textbox') ||
           accessibilityTree.includes('searchbox') ||
           accessibilityTree.includes('combobox')

IF hasForms:
  ANNOUNCE: "▶ Forms detected - running form accessibility tools..."

  ANNOUNCE: "▶ Executing: test_form_labels..."
  result_forms = await mcp__mcp-accessibility__test_form_labels()
  all_findings.push({tool: 'test_form_labels', timestamp: new Date().toISOString(), result: result_forms})
  ANNOUNCE: "✅ Completed: test_form_labels ({result_forms.issues?.length || 0} issues)"
  strategic_tools_count++

  ANNOUNCE: "▶ Executing: test_on_input_behavior..."
  result_input = await mcp__mcp-accessibility__test_on_input_behavior()
  all_findings.push({tool: 'test_on_input_behavior', timestamp: new Date().toISOString(), result: result_input})
  ANNOUNCE: "✅ Completed: test_on_input_behavior ({result_input.issues?.length || 0} issues)"
  strategic_tools_count++

// Check for interactive elements
buttonMatches = accessibilityTree.match(/button:/g)
linkMatches = accessibilityTree.match(/link:/g)
interactiveCount = (buttonMatches?.length || 0) + (linkMatches?.length || 0)

IF interactiveCount > 10:
  ANNOUNCE: "▶ {interactiveCount} interactive elements detected - running keyboard navigation tools..."

  ANNOUNCE: "▶ Executing: test_keyboard_navigation..."
  result_kb = await mcp__mcp-accessibility__test_keyboard_navigation({testAllWidgets: true, maxSteps: 100})
  all_findings.push({tool: 'test_keyboard_navigation', timestamp: new Date().toISOString(), result: result_kb})
  ANNOUNCE: "✅ Completed: test_keyboard_navigation ({result_kb.issues?.length || 0} issues)"
  strategic_tools_count++

  ANNOUNCE: "▶ Executing: get_focus_order..."
  result_focus = await mcp__mcp-accessibility__get_focus_order()
  all_findings.push({tool: 'get_focus_order', timestamp: new Date().toISOString(), result: result_focus})
  ANNOUNCE: "✅ Completed: get_focus_order"
  strategic_tools_count++

// Check for complex widgets
hasWidgets = accessibilityTree.includes('tablist') ||
             accessibilityTree.includes('menu') ||
             accessibilityTree.includes('combobox') ||
             accessibilityTree.includes('slider')

IF hasWidgets:
  ANNOUNCE: "▶ ARIA widgets detected - running ARIA validation..."

  ANNOUNCE: "▶ Executing: validate_aria_attributes..."
  result_aria = await mcp__mcp-accessibility__validate_aria_attributes({strict: true})
  all_findings.push({tool: 'validate_aria_attributes', timestamp: new Date().toISOString(), result: result_aria})
  ANNOUNCE: "✅ Completed: validate_aria_attributes ({result_aria.issues?.length || 0} issues)"
  strategic_tools_count++

// Check for headings
hasHeadings = accessibilityTree.includes('heading:')

IF hasHeadings:
  ANNOUNCE: "▶ Headings detected - running heading structure test..."

  ANNOUNCE: "▶ Executing: test_heading_structure..."
  result_headings = await mcp__mcp-accessibility__test_heading_structure()
  all_findings.push({tool: 'test_heading_structure', timestamp: new Date().toISOString(), result: result_headings})
  ANNOUNCE: "✅ Completed: test_heading_structure ({result_headings.issues?.length || 0} issues)"
  strategic_tools_count++

// Check for live regions
hasLiveRegions = accessibilityTree.includes('[aria-live') ||
                 accessibilityTree.includes('alert') ||
                 accessibilityTree.includes('status')

IF hasLiveRegions:
  ANNOUNCE: "▶ Live regions detected - running live region test..."

  ANNOUNCE: "▶ Executing: test_live_regions..."
  result_live = await mcp__mcp-accessibility__test_live_regions()
  all_findings.push({tool: 'test_live_regions', timestamp: new Date().toISOString(), result: result_live})
  ANNOUNCE: "✅ Completed: test_live_regions ({result_live.issues?.length || 0} issues)"
  strategic_tools_count++

VERIFY: strategic_tools_count <= 7
DISPLAY: "✓ Strategic Gap Analysis Complete: {strategic_tools_count} additional tools executed"
DISPLAY: "  Total tools so far: {5 + strategic_tools_count}"
```

**Checkpoint:** Strategic tools are conditional - count should be 0-7.

---

#### COMMAND 10: Extract Tool Names and Validate Count

```javascript
ANNOUNCE: "▶ STEP 4: Extracting tool names and validating count..."

// Extract tool names from all_findings
tools_executed = all_findings.map(finding => finding.tool)
total_tools_executed = tools_executed.length

// Validate count matches array length (prevents metadata bug)
IF total_tools_executed !== tools_executed.length:
  ERROR: "❌ CRITICAL ERROR: Tool count mismatch!"
  ERROR: "Expected: {tools_executed.length}, Got: {total_tools_executed}"
  STOP

// Validate expected range for Smart Approach
IF total_tools_executed < 5 OR total_tools_executed > 12:
  WARNING: "⚠️ Tool count outside expected range (5-12): {total_tools_executed}"

DISPLAY:
  "✅ Smart Scan Complete: {total_tools_executed} tools executed"
  "Tools executed:"
  [List each tool in tools_executed array with index]

VERIFY: total_tools_executed === tools_executed.length
VERIFY: total_tools_executed >= 5 AND total_tools_executed <= 12
```

**Checkpoint:** Tool count validation must pass. If mismatch, STOP and alert user.

---

#### PRE-GENERATION CHECKLIST (Before COMMAND 11)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 PRE-GENERATION CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before generating files, answer these questions:

1. Have you READ the reference example?
   Reference: test-reports/accessibility-reports/A11Y-1319/pages/report-selection/scan-*.json

2. Format confirmed?
   - Individual entries (one per issue) or grouped? → INDIVIDUAL
   - Full details or summaries? → FULL DETAILS
   - Check reference to confirm format

3. Red flags to avoid:
   ❌ Using "etc." or "..." (indicates incomplete)
   ❌ Grouping multiple issues into one entry
   ❌ Writing "see above for format" (each entry needs full details)
   ❌ Creating summaries (need full issue details)

If uncertain about format → READ reference example now before generating.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Checkpoint:** Review checklist before proceeding to file generation.

---

#### COMMAND 11: Generate Scan Reports

```javascript
ANNOUNCE: "▶ Generating scan reports..."

// Create JSON report
json_report = {
  "report_id": "scan-{current_page.identifier}-{timestamp}",
  "metadata": {
    "page_name": current_page.identifier,
    "page_url": current_page.url,
    "page_priority": current_page.priority,
    "audit_date": new Date().toISOString(),
    "audit_duration_seconds": Math.floor((Date.now() - scan_start_time) / 1000),
    "wcag_version": "{wcag_version}",
    "conformance_target": "AA",
    "scan_approach": "Smart",
    "exclusions_enabled": WORKFLOW_STATE.exclusions_enabled,
    "exclusions_count": WORKFLOW_STATE.exclusions.length,
    "exclusions": WORKFLOW_STATE.exclusions
  },
  "tool_coverage_verification": {
    "scan_approach": "Smart",
    "tools_executed": tools_executed,  // From COMMAND 10
    "total_tools_executed": total_tools_executed,  // From COMMAND 10
    "expected_range": "5-12 tools",
    "within_expected_range": (total_tools_executed >= 5 && total_tools_executed <= 12),
    "all_findings_merged": true,
    "no_filtering_applied": true
  },
  "summary": {
    // Aggregate issues from all_findings
    "total_issues": count_total_issues(all_findings),
    "by_severity": calculate_severity_breakdown(all_findings),
    "by_wcag_level": calculate_wcag_breakdown(all_findings),
    "conformance_status": determine_conformance(all_findings)
  },
  "wcag_conformance": map_issues_to_wcag_criteria(all_findings),
  "issues": extract_all_issues(all_findings)
}

// Final validation before saving
actual_count = json_report.tool_coverage_verification.tools_executed.length
declared_count = json_report.tool_coverage_verification.total_tools_executed

IF actual_count !== declared_count:
  ERROR: "❌ VALIDATION FAILED: Tool count mismatch in JSON!"
  ERROR: "Array length: {actual_count}, Declared count: {declared_count}"
  // Auto-correct
  json_report.tool_coverage_verification.total_tools_executed = actual_count
  WARNING: "⚠️ Auto-corrected total_tools_executed to {actual_count}"
ELSE:
  DISPLAY: "✅ Validation passed: {actual_count} tools"

// Save JSON report
json_path = "{page_directory}/scan-{timestamp}.json"
Write(json_path, JSON.stringify(json_report, null, 2))

// Create Markdown report
md_report = generate_markdown_report(json_report)
md_path = "{page_directory}/scan-{timestamp}.md"
Write(md_path, md_report)

VERIFY: Bash
  ls -la "{json_path}"
  ls -la "{md_path}"

CHECK: Both files exist

DISPLAY:
  "✅ Reports generated:"
  "   JSON: {json_path}"
  "   MD: {md_path}"
```

**Checkpoint:** If report generation fails or files don't exist, STOP and alert user.

---

#### FILE VERIFICATION CHECKPOINT (After COMMAND 11)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 FILE VERIFICATION CHECKPOINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated files for: {current_page.identifier}
Location: {page_directory}

Invoke /double-check to verify:

**1. scan-{timestamp}.json**
   - Count: {json_report.issues.length} issues detected → {json_report.issues.length} individual entries? (NOT grouped)
   - Format: Each entry has full details? (NOT summaries)
   - Check for: "...", "etc.", "see above" → NONE present?

**2. scan-{timestamp}.md**
   - Count: {json_report.issues.length} issues → {json_report.issues.length} individual sections? (NOT grouped)
   - Format: Full WCAG criteria, description, location, remediation?
   - Check for: "...", "etc.", "see above" → NONE present?

**3. screenshot.png**
   - File exists and opens correctly?
   - Shows the actual page state tested?
   - File size reasonable (~50KB-500KB, not 0 bytes)?

📖 Reference for comparison:
   test-reports/accessibility-reports/A11Y-1319/pages/report-selection/

Show:
- File sizes (ls -lh)
- First 15 lines of scan-*.json
- First 15 lines of scan-*.md
- Confirm screenshot visible

Type 'confirmed' only after verification passes all checks.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

EXECUTE: Bash
  ls -lh "{json_path}" "{md_path}" "{page_directory}/screenshot.png"

DISPLAY: Bash output

EXECUTE: Bash
  echo "First 15 lines of JSON:"
  head -15 "{json_path}"

DISPLAY: Bash output

EXECUTE: Bash
  echo "First 15 lines of MD:"
  head -15 "{md_path}"

DISPLAY: Bash output

EXECUTE: Bash
  echo "Screenshot file info:"
  file "{page_directory}/screenshot.png" 2>&1 || echo "Screenshot file check failed"

DISPLAY: Bash output

WAIT for user to type 'confirmed'

**Checkpoint:** User must confirm file verification passed before proceeding.

---

#### COMMAND 12: Store Page Result

```javascript
EXECUTE:
  page_result = {
    page: current_page,
    json_path: json_path,
    md_path: md_path,
    scan_data: json_report,
    tools_executed: total_tools_executed
  }

  WORKFLOW_STATE.page_results.push(page_result)

VERIFY: WORKFLOW_STATE.page_results.length === (current_page_index + 1)
```

**Checkpoint:** Page result must be stored before continuing.

---

#### COMMAND 13: Display Page Summary

```
DISPLAY:
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  "✅ PAGE SCAN COMPLETE: {current_page.identifier}"
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ""
  "Tools Executed: {total_tools_executed}"
  "Issues Found: {json_report.summary.total_issues}"
  "  - Critical: {json_report.summary.by_severity.critical}"
  "  - High: {json_report.summary.by_severity.high}"
  "  - Moderate: {json_report.summary.by_severity.moderate}"
  "  - Low: {json_report.summary.by_severity.low}"
  ""
  "Conformance: {json_report.summary.conformance_status} WCAG {wcag_version} Level AA"
  ""
  "Reports saved:"
  "  ✓ JSON: {json_path}"
  "  ✓ MD: {md_path}"
  ""
```

---

#### COMMAND 14: Increment Page Index and Continue

```javascript
EXECUTE:
  WORKFLOW_STATE.current_page_index++

IF WORKFLOW_STATE.current_page_index < WORKFLOW_STATE.total_pages:
  DISPLAY: "Moving to next page ({current_page_index + 1}/{total_pages})..."
  GOTO: COMMAND 2 (repeat for next page)
ELSE:
  DISPLAY: "All pages scanned. Moving to multi-page summary..."
  GOTO: COMMAND 15
```

---

### POST-SCANNING SUMMARY

#### COMMAND 15: Display Multi-Page Summary

```
DISPLAY:
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  "ALL PAGES SCANNED - SUMMARY"
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ""
  "Pages Scanned: {WORKFLOW_STATE.total_pages}"
  ""
  "Per-Page Results:"
  [For each page in page_results:]
    "{index + 1}. {page.identifier}: {scan_data.summary.total_issues} issues ({scan_data.summary.conformance_status})"
  ""
  "Total Issues Across All Pages: {sum all page issues}"
  "  - Critical: {sum critical}"
  "  - High: {sum high}"
  "  - Moderate: {sum moderate}"
  "  - Low: {sum low}"
  ""
  "Ready to aggregate results for VPAT generation."
```

---

#### COMMAND 16: Update JIRA (If Ticket Provided)

```javascript
IF WORKFLOW_STATE.has_jira_ticket === true:
  ANNOUNCE: "▶ Updating JIRA ticket..."

  jira_comment = """
  🔍 Smart Accessibility Scan Complete

  Scanned {WORKFLOW_STATE.total_pages} page(s) for VPAT report generation.

  Total Issues: {sum_all_issues}
  • Critical (WCAG A): {sum_critical}
  • High (WCAG AA): {sum_high}
  • Moderate: {sum_moderate}
  • Low: {sum_low}

  Per-Page Breakdown:
  [List each page with issue count]

  Scan Approach: Smart (5-12 tools per page)
  Next: Generating VPAT 2.5 compliance report
  Reports location: {WORKFLOW_STATE.report_directory}
  """

  // Add comment to JIRA using JIRA integration
  add_jira_comment(WORKFLOW_STATE.identifier, jira_comment)

  DISPLAY: "✅ JIRA ticket updated: {WORKFLOW_STATE.identifier}"

ELSE:
  DISPLAY: "ℹ️  No JIRA ticket - skipping JIRA update"
```

---

### COMMAND 17: Auto-Filter Known False Positives

**Purpose:** Fast pattern matching to automatically exclude known false positive patterns using rule-based exclusions from `accessibility-scan-exclusions.json`

**Execution Order:** After all pages scanned, before Command 18

```javascript
EXECUTE:

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STAGE 1: AUTO-FILTER (PATTERN MATCHING)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANNOUNCE: "🔍 Stage 1: Auto-Filtering Known False Positives..."
DISPLAY: ""

// Step 1: Check if exclusions enabled
IF WORKFLOW_STATE.exclusions_enabled !== true:
  DISPLAY: "  ℹ️  Auto-filtering disabled (no exclusion list loaded)"
  DISPLAY: "  → All issues will proceed to AI-powered double-check (Command 18)"
  DISPLAY: ""

  // Initialize empty filtering data
  WORKFLOW_STATE.auto_filter_summary = {
    enabled: false,
    total_issues: 0,
    auto_excluded: 0,
    needs_double_check: 0,
    exclusion_breakdown: {}
  }

  // Skip to Command 18 (AI-powered double-check)
  GOTO Command 18

// Step 2: Load rule exclusions from workflow state
rule_exclusions = WORKFLOW_STATE.exclusions.rule_exclusions || []

IF rule_exclusions.length === 0:
  DISPLAY: "  ⚠️  No rule exclusions found in exclusion list"
  DISPLAY: "  → All issues will proceed to AI-powered double-check (Command 18)"
  DISPLAY: ""
  GOTO Command 18

DISPLAY: "  ✓ Loaded {rule_exclusions.length} exclusion rules from v{WORKFLOW_STATE.exclusions.version}"

// Step 3: Collect all issues from all page scan results
all_issues = []

for (page_result of WORKFLOW_STATE.page_results) {
  scan_data = read_json(page_result.json_path)

  for (issue of scan_data.issues) {
    all_issues.push({
      ...issue,
      page_identifier: page_result.page.identifier,
      page_url: page_result.page.url,
      page_priority: page_result.page.priority,
      unique_id: `${page_result.page.identifier}-${issue.wcag_criterion}-${hash(issue.selector)}`
    })
  }
}

total_issues = all_issues.length
DISPLAY: "  ✓ Collected {total_issues} issues from {WORKFLOW_STATE.total_pages} pages"

// Step 4: Apply pattern matching
auto_excluded_issues = []
needs_double_check_issues = []
exclusion_breakdown = {}

DISPLAY: ""
DISPLAY: "  🔎 Applying pattern matching..."

for (issue of all_issues) {
  let excluded = false
  let matched_rule = null

  // Try matching against each rule
  for (rule of rule_exclusions) {
    const match_result = matchesExclusionPattern(issue, rule)

    if (match_result.matched) {
      // Found a match - auto-exclude this issue
      auto_excluded_issues.push({
        ...issue,
        auto_excluded: true,
        exclusion_rule_id: rule.rule_id,
        exclusion_reason: rule.reason,
        matched_pattern: match_result.pattern,
        matched_field: match_result.field,
        exclusion_stage: 'auto_filter'
      })

      // Track breakdown by rule
      if (!exclusion_breakdown[rule.rule_id]) {
        exclusion_breakdown[rule.rule_id] = {
          rule_id: rule.rule_id,
          reason: rule.reason,
          count: 0
        }
      }
      exclusion_breakdown[rule.rule_id].count++

      excluded = true
      matched_rule = rule.rule_id
      break  // First match wins
    }
  }

  if (!excluded) {
    // No match found - needs AI-powered double-check
    needs_double_check_issues.push({
      ...issue,
      auto_excluded: false,
      passed_auto_filter: true
    })
  }
}

// Step 5: Calculate summary statistics
auto_excluded_count = auto_excluded_issues.length
needs_double_check_count = needs_double_check_issues.length
auto_excluded_percentage = Math.round((auto_excluded_count / total_issues) * 100)

// Step 6: Write JSON output files
auto_excluded_file = `${WORKFLOW_STATE.report_directory}/auto-excluded-issues.json`
needs_double_check_file = `${WORKFLOW_STATE.report_directory}/needs-double-check.json`

write_json(auto_excluded_file, {
  summary: {
    total_issues_scanned: total_issues,
    auto_excluded_count: auto_excluded_count,
    exclusion_percentage: auto_excluded_percentage,
    generated_at: new Date().toISOString(),
    exclusion_list_version: WORKFLOW_STATE.exclusions.version || 'unknown'
  },
  exclusion_breakdown: Object.values(exclusion_breakdown),
  issues: auto_excluded_issues
})

write_json(needs_double_check_file, {
  summary: {
    total_issues_scanned: total_issues,
    passed_auto_filter: needs_double_check_count,
    requires_ai_validation: needs_double_check_count,
    generated_at: new Date().toISOString()
  },
  issues: needs_double_check_issues
})

// MANDATORY FILE VERIFICATION
VERIFY: Bash
  ls -lh "${auto_excluded_file}"
  ls -lh "${needs_double_check_file}"

CHECK: Both commands exit code 0

IF any file missing:
  ERROR: "❌ CRITICAL - File creation failed for Command 17"
  ERROR: "Expected files:"
  ERROR: "  - ${auto_excluded_file}"
  ERROR: "  - ${needs_double_check_file}"
  DISPLAY: "Workflow cannot proceed without these files."
  STOP

// SHOW PROOF TO USER
DISPLAY: ""
DISPLAY: "✅ Files created and verified:"
EXECUTE: Bash
  ls -lh "${auto_excluded_file}"
  ls -lh "${needs_double_check_file}"

DISPLAY: Bash output

// SHOW CONTENT SAMPLE
DISPLAY: ""
DISPLAY: "📄 File content sample (auto-excluded-issues.json):"
EXECUTE: Bash
  jq '.summary' "${auto_excluded_file}"

DISPLAY: Bash output

// UPDATE PROGRESS TRACKING
EXECUTE: Bash
  sed -i '' 's/\[ \] 2.15 Auto-filter/[✓] 2.15 Auto-filter/' "${WORKFLOW_STATE.progress_file}"

// Step 7: Display summary
DISPLAY: ""
DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: "✅ STAGE 1 COMPLETE: Auto-Filter Results"
DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: ""
DISPLAY: "📊 FILTERING SUMMARY:"
DISPLAY: "  • Total issues found: {total_issues}"
DISPLAY: "  • Auto-excluded: {auto_excluded_count} ({auto_excluded_percentage}%)"
DISPLAY: "  • Needs double-check: {needs_double_check_count} ({100 - auto_excluded_percentage}%)"
DISPLAY: ""

IF auto_excluded_count > 0:
  DISPLAY: "🚫 EXCLUSION BREAKDOWN (by rule):"
  DISPLAY: ""

  // Sort by count (descending)
  sorted_rules = Object.values(exclusion_breakdown).sort((a, b) => b.count - a.count)

  for (rule_stat of sorted_rules) {
    rule_percentage = Math.round((rule_stat.count / auto_excluded_count) * 100)
    DISPLAY: "  • {rule_stat.rule_id}: {rule_stat.count} issues ({rule_percentage}%)"
    DISPLAY: "    Reason: {rule_stat.reason}"
    DISPLAY: ""
  }

DISPLAY: "📁 OUTPUT FILES:"
DISPLAY: "  ✓ {auto_excluded_file}"
DISPLAY: "  ✓ {needs_double_check_file}"
DISPLAY: ""
DISPLAY: "➡️  Next: Stage 2 - AI-Powered Double-Check ({needs_double_check_count} issues)"
DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: ""

// Step 8: Update workflow state
WORKFLOW_STATE.auto_filter_summary = {
  enabled: true,
  total_issues: total_issues,
  auto_excluded: auto_excluded_count,
  auto_excluded_percentage: auto_excluded_percentage,
  needs_double_check: needs_double_check_count,
  exclusion_breakdown: exclusion_breakdown,
  auto_excluded_file: auto_excluded_file,
  needs_double_check_file: needs_double_check_file
}

STORE:
  WORKFLOW_STATE.auto_filter_summary
  WORKFLOW_STATE.auto_excluded_issues = auto_excluded_issues
  WORKFLOW_STATE.needs_double_check_issues = needs_double_check_issues

VERIFY:
  auto_excluded_count + needs_double_check_count === total_issues
  auto_excluded_file exists
  needs_double_check_file exists
```

**Pattern Matching Helper Function:**

```javascript
function matchesExclusionPattern(issue, rule) {
  // Support both string and array patterns
  const patterns = Array.isArray(rule.pattern_match)
    ? rule.pattern_match
    : [rule.pattern_match]

  // Fields to check (in priority order)
  const fields_to_check = [
    { name: 'description', value: issue.description },
    { name: 'title', value: issue.title },
    { name: 'selector', value: issue.selector },
    { name: 'element_text', value: issue.element_text },
    { name: 'element', value: issue.element }
  ]

  // Check each pattern against each field (case-insensitive)
  for (const pattern of patterns) {
    const lower_pattern = pattern.toLowerCase()

    for (const field of fields_to_check) {
      if (field.value && typeof field.value === 'string') {
        const lower_value = field.value.toLowerCase()

        if (lower_value.includes(lower_pattern)) {
          return {
            matched: true,
            pattern: pattern,
            field: field.name
          }
        }
      }
    }
  }

  return { matched: false }
}
```

**Checkpoint:** If auto-filter fails or verification fails, STOP and alert user.

---

### COMMAND 18: AI-Powered Comprehensive Double-Check

**Purpose:** Use AI to validate ALL issues with pragmatic WCAG reasoning + exclusion list awareness + scope checking + barrier assessment

**User's Manual Prompt (Translated into Command 18):**
> "Before we start review. Please double check each issues which we have identified and check if they are VALID or FALSE Positive. Focus on only WCAG violation. Be pragmatic. Think hard before marking an issue VALID. Make sure we stick to the scope of the page refer to the exclusion list (i.e. accessibility-scan-exclusions.json)"

**Execution Order:** After auto-filter (Command 17), before Phase 3

**CRITICAL:** This command runs even if exclusions disabled (provides value through semantic validation)

```javascript
EXECUTE:

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STAGE 2: AI-POWERED COMPREHENSIVE DOUBLE-CHECK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANNOUNCE: "🧠 Stage 2: AI-Powered Comprehensive Double-Check..."
DISPLAY: ""

// Step 1: Load issues for validation
IF WORKFLOW_STATE.exclusions_enabled === true:
  // Load issues that passed auto-filter
  issues_to_validate = WORKFLOW_STATE.needs_double_check_issues
  DISPLAY: "  📋 Validating {issues_to_validate.length} issues that passed auto-filter..."
ELSE:
  // Load all issues (no auto-filter ran)
  issues_to_validate = []
  for (page_result of WORKFLOW_STATE.page_results) {
    scan_data = read_json(page_result.json_path)
    for (issue of scan_data.issues) {
      issues_to_validate.push({
        ...issue,
        page_identifier: page_result.page.identifier,
        page_url: page_result.page.url,
        unique_id: `${page_result.page.identifier}-${issue.wcag_criterion}-${hash(issue.selector)}`
      })
    }
  }
  DISPLAY: "  📋 Validating ALL {issues_to_validate.length} issues (auto-filter was disabled)..."

IF issues_to_validate.length === 0:
  DISPLAY: "  ✓ No issues to validate (all were auto-excluded)"
  DISPLAY: ""
  GOTO Phase 2 Gate

// Step 2: Load exclusion list for context (even if Command 17 didn't run)
exclusion_list = null
rule_exclusions = []

IF WORKFLOW_STATE.exclusions_enabled === true:
  exclusion_list = WORKFLOW_STATE.exclusions
  rule_exclusions = exclusion_list.rule_exclusions || []
  DISPLAY: "  ✓ Loaded {rule_exclusions.length} exclusion rules for AI context"
ELSE:
  DISPLAY: "  ℹ️  No exclusion list available (AI will use built-in heuristics)"

DISPLAY: ""
DISPLAY: "  🔍 AI REASONING INSTRUCTIONS:"
DISPLAY: "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: "  • Focus on only WCAG violations"
DISPLAY: "  • Be pragmatic, not pedantic"
DISPLAY: "  • Think hard before marking VALID"
DISPLAY: "  • Stick to the scope of the tested page"
DISPLAY: "  • Refer to exclusion list for context"
DISPLAY: "  • Ask: Would this create an actual barrier for users with disabilities?"
DISPLAY: "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: ""

// Step 3: First Pass - Analyze each issue with AI reasoning
first_pass_valid = []
first_pass_excluded = []
suggested_exclusions = []

for (issue_index, issue of issues_to_validate) {
  progress = `(${issue_index + 1}/${issues_to_validate.length})`
  DISPLAY: "  🔍 {progress} Analyzing: {issue.title}"

  // Perform comprehensive AI-powered validation
  validation_result = performComprehensiveValidation(issue, rule_exclusions, exclusion_list)

  IF validation_result.classification === 'VALID':
    // Mark for double-check (all VALID issues get second pass)
    first_pass_valid.push({
      ...issue,
      first_pass_result: validation_result,
      needs_second_pass: true
    })
    DISPLAY: "    ⚠️  POTENTIALLY VALID - Will double-check"

  ELSE IF validation_result.classification === 'FALSE':
    // Exclude this issue
    first_pass_excluded.push({
      ...issue,
      auto_excluded: true,
      exclusion_stage: 'ai_double_check',
      exclusion_reason: validation_result.reason,
      exclusion_category: validation_result.category,
      validation_details: validation_result.details
    })
    DISPLAY: "    🚫 FALSE - {validation_result.category}: {validation_result.reason}"

    // Check if this should be added to exclusion list
    IF validation_result.suggest_exclusion === true:
      suggested_exclusions.push({
        issue_pattern: extractPattern(issue),
        reason: validation_result.reason,
        category: validation_result.category,
        occurrences: 1,
        example_issue: {
          title: issue.title,
          selector: issue.selector,
          description: issue.description
        }
      })
      DISPLAY: "    💡 Suggested for next version of exclusion list"

  DISPLAY: ""
}

// Step 4: Second Pass - Double-check ALL VALID issues (stricter lens)
DISPLAY: ""
DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: "🔍 SECOND PASS: Double-Checking {first_pass_valid.length} VALID Issues"
DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: ""
DISPLAY: "  Using stricter pragmatic lens..."
DISPLAY: "  Prioritizing Critical and High severity issues..."
DISPLAY: ""

final_valid = []
second_pass_excluded = []

// Sort by severity (Critical > High > Moderate > Low)
const severity_order = { 'critical': 0, 'serious': 1, 'high': 1, 'moderate': 2, 'minor': 3, 'low': 3 }
const sorted_issues = first_pass_valid.sort((a, b) =>
  (severity_order[a.severity] || 999) - (severity_order[b.severity] || 999)
)

for (issue_index, issue of sorted_issues) {
  progress = `(${issue_index + 1}/${first_pass_valid.length})`
  severity_badge = issue.severity?.toUpperCase() || 'UNKNOWN'

  DISPLAY: "  🔍 {progress} [${severity_badge}] Re-analyzing: {issue.title}"

  // Second validation with stricter criteria
  second_validation = performStrictValidation(
    issue,
    issue.first_pass_result,
    rule_exclusions,
    exclusion_list
  )

  IF second_validation.classification === 'VALID':
    // Confirmed VALID after double-check
    final_valid.push({
      ...issue,
      validation_status: 'valid',
      first_pass: issue.first_pass_result,
      second_pass: second_validation,
      double_checked: true,
      final_confidence: second_validation.confidence
    })
    DISPLAY: "    ✅ CONFIRMED VALID - {second_validation.confidence} confidence"
    DISPLAY: "       Reason: {second_validation.reason}"

  ELSE:
    // Actually FALSE after second look
    second_pass_excluded.push({
      ...issue,
      auto_excluded: true,
      exclusion_stage: 'ai_second_pass',
      exclusion_reason: second_validation.reason,
      exclusion_category: second_validation.category,
      first_pass_thought_valid: true,
      second_pass_caught: true
    })
    DISPLAY: "    🚫 FALSE (caught on second pass)"
    DISPLAY: "       Reason: {second_validation.reason}"

    IF second_validation.suggest_exclusion === true:
      suggested_exclusions.push({
        issue_pattern: extractPattern(issue),
        reason: second_validation.reason,
        category: second_validation.category,
        occurrences: 1,
        caught_on_second_pass: true,
        example_issue: {
          title: issue.title,
          selector: issue.selector,
          description: issue.description
        }
      })
      DISPLAY: "       💡 Suggested for next version of exclusion list"

  DISPLAY: ""
}

// Step 5: Consolidate all excluded issues
all_excluded_issues = [
  ...first_pass_excluded,
  ...second_pass_excluded
]

// Step 6: Consolidate suggested exclusions (group similar patterns)
consolidated_suggestions = consolidateSuggestions(suggested_exclusions)

// Step 7: Calculate summary statistics
total_validated = issues_to_validate.length
first_pass_excluded_count = first_pass_excluded.length
second_pass_excluded_count = second_pass_excluded.length
total_excluded_by_ai = all_excluded_issues.length
final_valid_count = final_valid.length

// Step 8: Update auto-excluded-issues.json (append AI exclusions)
auto_excluded_file = WORKFLOW_STATE.auto_filter_summary?.auto_excluded_file ||
                     `${WORKFLOW_STATE.report_directory}/auto-excluded-issues.json`

IF file_exists(auto_excluded_file):
  // Merge with Command 17 exclusions
  existing_excluded = read_json(auto_excluded_file)
  all_excluded_combined = [
    ...existing_excluded.issues,
    ...all_excluded_issues
  ]

  total_excluded_combined = all_excluded_combined.length
  total_excluded_percentage = Math.round(
    (total_excluded_combined / (WORKFLOW_STATE.auto_filter_summary?.total_issues || total_validated)) * 100
  )
ELSE:
  // No Command 17 ran, create new file
  all_excluded_combined = all_excluded_issues
  total_excluded_combined = all_excluded_issues.length
  total_excluded_percentage = Math.round((total_excluded_combined / total_validated) * 100)

write_json(auto_excluded_file, {
  summary: {
    total_issues_scanned: WORKFLOW_STATE.auto_filter_summary?.total_issues || total_validated,
    auto_excluded_by_pattern: WORKFLOW_STATE.auto_filter_summary?.auto_excluded || 0,
    excluded_by_ai_first_pass: first_pass_excluded_count,
    excluded_by_ai_second_pass: second_pass_excluded_count,
    total_excluded: total_excluded_combined,
    total_excluded_percentage: total_excluded_percentage,
    ai_validation_completed_at: new Date().toISOString(),
    exclusion_list_version: exclusion_list?.version || 'not_available'
  },
  exclusion_breakdown: WORKFLOW_STATE.auto_filter_summary?.exclusion_breakdown || {},
  issues: all_excluded_combined
})

// Step 9: Write needs-review-issues.json (final VALID issues only)
needs_review_file = `${WORKFLOW_STATE.report_directory}/needs-review-issues.json`

write_json(needs_review_file, {
  summary: {
    total_issues_scanned: WORKFLOW_STATE.auto_filter_summary?.total_issues || total_validated,
    auto_excluded_by_pattern: WORKFLOW_STATE.auto_filter_summary?.auto_excluded || 0,
    excluded_by_ai: total_excluded_by_ai,
    total_excluded: total_excluded_combined,
    valid_issues_for_review: final_valid_count,
    exclusion_rate: total_excluded_percentage,
    double_checked: true,
    generated_at: new Date().toISOString()
  },
  issues: final_valid
})

// Step 10: Write suggested-exclusions.json (if any)
IF consolidated_suggestions.length > 0:
  suggested_exclusions_file = `${WORKFLOW_STATE.report_directory}/suggested-exclusions.json`

  write_json(suggested_exclusions_file, {
    summary: {
      total_suggestions: consolidated_suggestions.length,
      generated_at: new Date().toISOString(),
      recommendation: "Consider adding these patterns to accessibility-scan-exclusions.json (next version)"
    },
    suggestions: consolidated_suggestions
  })

  // VERIFY suggested-exclusions.json file
  VERIFY: Bash
    ls -lh "${suggested_exclusions_file}"

  CHECK: Exit code 0

  IF file missing:
    ERROR: "❌ CRITICAL - File creation failed: suggested-exclusions.json"
    STOP

// MANDATORY FILE VERIFICATION FOR COMMAND 18
VERIFY: Bash
  ls -lh "${auto_excluded_file}"
  ls -lh "${needs_review_file}"

CHECK: Both commands exit code 0

IF any file missing:
  ERROR: "❌ CRITICAL - File creation failed for Command 18"
  ERROR: "Expected files:"
  ERROR: "  - ${auto_excluded_file} (updated)"
  ERROR: "  - ${needs_review_file}"
  IF consolidated_suggestions.length > 0:
    ERROR: "  - ${suggested_exclusions_file}"
  DISPLAY: "Workflow cannot proceed without these files."
  STOP

// SHOW PROOF TO USER
DISPLAY: ""
DISPLAY: "✅ Files created and verified:"
EXECUTE: Bash
  ls -lh "${auto_excluded_file}"
  ls -lh "${needs_review_file}"
  IF [[ "${consolidated_suggestions.length}" -gt 0 ]]; then
    ls -lh "${suggested_exclusions_file}"
  fi

DISPLAY: Bash output

// SHOW CONTENT SAMPLES
DISPLAY: ""
DISPLAY: "📄 File content sample (auto-excluded-issues.json):"
EXECUTE: Bash
  jq '.summary' "${auto_excluded_file}"

DISPLAY: Bash output

DISPLAY: ""
DISPLAY: "📄 File content sample (needs-review-issues.json):"
EXECUTE: Bash
  jq '.summary' "${needs_review_file}"

DISPLAY: Bash output

IF consolidated_suggestions.length > 0:
  DISPLAY: ""
  DISPLAY: "📄 File content sample (suggested-exclusions.json):"
  EXECUTE: Bash
    jq '.summary' "${suggested_exclusions_file}"

  DISPLAY: Bash output

// UPDATE PROGRESS TRACKING
EXECUTE: Bash
  sed -i '' 's/\[ \] 2.16 AI double-check/[✓] 2.16 AI double-check/' "${WORKFLOW_STATE.progress_file}"

// Step 11: Display comprehensive summary
DISPLAY: ""
DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: "✅ STAGE 2 COMPLETE: AI Double-Check Results"
DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: ""
DISPLAY: "📊 AI VALIDATION SUMMARY:"
DISPLAY: "  • Issues validated: {total_validated}"
DISPLAY: "  • First pass - VALID: {first_pass_valid.length}"
DISPLAY: "  • First pass - FALSE: {first_pass_excluded_count}"
DISPLAY: "  • Second pass - Confirmed VALID: {final_valid_count}"
DISPLAY: "  • Second pass - Caught FALSE: {second_pass_excluded_count}"
DISPLAY: ""

IF second_pass_excluded_count > 0:
  DISPLAY: "  🎯 Second pass caught {second_pass_excluded_count} additional false positive(s)"
  DISPLAY: ""

IF total_excluded_by_ai > 0:
  DISPLAY: "🚫 AI EXCLUSIONS (by category):"
  DISPLAY: ""

  // Group by category
  category_breakdown = groupBy(all_excluded_issues, 'exclusion_category')

  for (category, issues of category_breakdown) {
    DISPLAY: "  • {category}: {issues.length} issues"
    // Show first example
    example = issues[0]
    DISPLAY: "    Example: {example.title}"
    DISPLAY: "    Reason: {example.exclusion_reason}"
    DISPLAY: ""
  }

IF consolidated_suggestions.length > 0:
  DISPLAY: "💡 SUGGESTED EXCLUSIONS (for next version):"
  DISPLAY: "  {consolidated_suggestions.length} new patterns identified"
  DISPLAY: "  → See: suggested-exclusions.json"
  DISPLAY: ""

DISPLAY: "📁 OUTPUT FILES:"
DISPLAY: "  ✓ {auto_excluded_file} (updated)"
DISPLAY: "  ✓ {needs_review_file} (created)"
IF consolidated_suggestions.length > 0:
  DISPLAY: "  ✓ {suggested_exclusions_file} (created)"
DISPLAY: ""

DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: "📈 COMBINED FILTERING RESULTS:"
DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: ""

IF WORKFLOW_STATE.exclusions_enabled === true:
  original_total = WORKFLOW_STATE.auto_filter_summary.total_issues
  stage1_excluded = WORKFLOW_STATE.auto_filter_summary.auto_excluded
  stage2_excluded = total_excluded_by_ai

  DISPLAY: "  Original issues found: {original_total}"
  DISPLAY: "  Stage 1 (auto-filter): -{stage1_excluded}"
  DISPLAY: "  Stage 2 (AI first pass): -{first_pass_excluded_count}"
  DISPLAY: "  Stage 2 (AI second pass): -{second_pass_excluded_count}"
  DISPLAY: "  ─────────────────────────"
  DISPLAY: "  VALID for review: {final_valid_count} ({100 - total_excluded_percentage}%)"
  DISPLAY: ""
  DISPLAY: "  🎯 Efficiency gain: {total_excluded_percentage}% reduction in manual review"
ELSE:
  DISPLAY: "  Original issues found: {total_validated}"
  DISPLAY: "  AI validation (first pass): -{first_pass_excluded_count}"
  DISPLAY: "  AI validation (second pass): -{second_pass_excluded_count}"
  DISPLAY: "  ─────────────────────────"
  DISPLAY: "  VALID for review: {final_valid_count} ({100 - total_excluded_percentage}%)"
  DISPLAY: ""
  DISPLAY: "  🎯 Efficiency gain: {total_excluded_percentage}% reduction in manual review"

DISPLAY: ""
DISPLAY: "➡️  Next: Phase 3 - Review {final_valid_count} validated issues"
DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: ""

// Step 12: Update workflow state
WORKFLOW_STATE.ai_double_check_summary = {
  total_validated: total_validated,
  first_pass_valid: first_pass_valid.length,
  first_pass_excluded: first_pass_excluded_count,
  second_pass_valid: final_valid_count,
  second_pass_excluded: second_pass_excluded_count,
  total_excluded_by_ai: total_excluded_by_ai,
  suggested_exclusions_count: consolidated_suggestions.length,
  needs_review_file: needs_review_file,
  suggested_exclusions_file: consolidated_suggestions.length > 0 ? suggested_exclusions_file : null
}

WORKFLOW_STATE.combined_filter_summary = {
  total_issues: WORKFLOW_STATE.auto_filter_summary?.total_issues || total_validated,
  stage1_excluded: WORKFLOW_STATE.auto_filter_summary?.auto_excluded || 0,
  stage2_first_pass_excluded: first_pass_excluded_count,
  stage2_second_pass_excluded: second_pass_excluded_count,
  total_excluded: total_excluded_combined,
  total_excluded_percentage: total_excluded_percentage,
  valid_for_review: final_valid_count,
  efficiency_gain_percentage: total_excluded_percentage
}

STORE:
  WORKFLOW_STATE.ai_double_check_summary
  WORKFLOW_STATE.combined_filter_summary
  WORKFLOW_STATE.final_valid_issues = final_valid
  WORKFLOW_STATE.all_excluded_issues = all_excluded_combined

VERIFY:
  final_valid_count + total_excluded_combined === (WORKFLOW_STATE.auto_filter_summary?.total_issues || total_validated)
  needs_review_file exists
  final_valid.length === final_valid_count
```

**Comprehensive Validation Helper Function (First Pass):**

```javascript
function performComprehensiveValidation(issue, rule_exclusions, exclusion_list) {
  /**
   * AI-POWERED COMPREHENSIVE VALIDATION
   *
   * INSTRUCTIONS:
   * - Focus on only WCAG violations
   * - Be pragmatic, not pedantic
   * - Think hard before marking VALID
   * - Stick to the scope of the tested page
   * - Refer to exclusion list for context
   * - Ask: Would this create an actual barrier for users with disabilities?
   *
   * Returns: { classification, confidence, reason, category, details, suggest_exclusion }
   */

  // Initialize result (default: VALID for safety)
  let result = {
    classification: 'VALID',
    confidence: 'medium',
    reason: '',
    category: '',
    details: {},
    suggest_exclusion: false
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHECK 1: Hidden Elements
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const hidden_indicators = [
    'type="hidden"',
    'display: none',
    'display:none',
    'visibility: hidden',
    'visibility:hidden',
    'aria-hidden="true"',
    'hidden="true"',
    'style="display:none"'
  ]

  const is_hidden = hidden_indicators.some(indicator =>
    issue.selector?.toLowerCase().includes(indicator.toLowerCase()) ||
    issue.element?.toLowerCase().includes(indicator.toLowerCase()) ||
    issue.description?.toLowerCase().includes(indicator.toLowerCase()) ||
    issue.element_attributes?.toLowerCase().includes(indicator.toLowerCase())
  )

  IF is_hidden:
    return {
      classification: 'FALSE',
      confidence: 'high',
      reason: 'Hidden element (not visible to users)',
      category: 'hidden_field',
      suggest_exclusion: true,
      details: {
        check: 'hidden_element',
        found_indicator: hidden_indicators.find(ind =>
          issue.selector?.toLowerCase().includes(ind.toLowerCase()) ||
          issue.element?.toLowerCase().includes(ind.toLowerCase())
        )
      }
    }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHECK 2: Third-Party Widgets
---

## POST-PHASE GATE VERIFICATION

After ALL commands complete, display this checklist:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁 PHASE 2 COMPLETION VERIFICATION: SCAN + FILTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ COMPLETION CHECKLIST:

✓ All {WORKFLOW_STATE.total_pages} pages scanned successfully

PER-PAGE VERIFICATION:
[For each page:]
✓ Page {N}: {page_identifier}
  → Directory created: {page_directory}
  → Browser check passed
  → Navigation successful
  → Foundation scan (2-3 tools): ✓
  → Context capture (3 tools): ✓
  → Strategic scan (0-7 tools): ✓
  → Tool count validated: {tools_executed} tools
  → Reports generated (JSON + MD): ✓
  → Page result stored: ✓

AGGREGATE RESULTS:
✓ Total pages scanned: {total_pages}
✓ Total issues found: {sum_all_issues}
✓ All reports generated: {total_pages * 2} files (JSON + MD)
✓ JIRA updated: {has_jira_ticket ? 'Yes' : 'N/A'}

WORKFLOW STATE UPDATED:
✓ page_results array populated: {page_results.length} pages
✓ phase_2_complete = (will be set to true after 'proceed')
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ INTELLIGENT FILTERING APPLIED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IF WORKFLOW_STATE.exclusions_enabled === true:

  STAGE 1: Auto-Filter (Pattern Matching)
  ✓ Exclusion list loaded: v{WORKFLOW_STATE.exclusions.version}
  ✓ Rules applied: {WORKFLOW_STATE.exclusions.rule_exclusions.length}
  ✓ Auto-excluded: {WORKFLOW_STATE.auto_filter_summary.auto_excluded} issues ({WORKFLOW_STATE.auto_filter_summary.auto_excluded_percentage}%)

  STAGE 2: AI-Powered Double-Check
  ✓ Issues validated: {WORKFLOW_STATE.ai_double_check_summary.total_validated}
  ✓ First pass - FALSE: {WORKFLOW_STATE.ai_double_check_summary.first_pass_excluded}
  ✓ Second pass - FALSE: {WORKFLOW_STATE.ai_double_check_summary.second_pass_excluded}
  ✓ Final VALID: {WORKFLOW_STATE.ai_double_check_summary.second_pass_valid}
  ✓ Suggested patterns: {WORKFLOW_STATE.ai_double_check_summary.suggested_exclusions_count}

  COMBINED FILTERING RESULTS:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Original issues: {WORKFLOW_STATE.combined_filter_summary.total_issues}
  Total excluded: {WORKFLOW_STATE.combined_filter_summary.total_excluded} ({WORKFLOW_STATE.combined_filter_summary.total_excluded_percentage}%)
  → Stage 1 (pattern): {WORKFLOW_STATE.combined_filter_summary.stage1_excluded}
  → Stage 2 (AI first): {WORKFLOW_STATE.combined_filter_summary.stage2_first_pass_excluded}
  → Stage 2 (AI second): {WORKFLOW_STATE.combined_filter_summary.stage2_second_pass_excluded}

  🎯 VALID for review: {WORKFLOW_STATE.combined_filter_summary.valid_for_review} ({100 - WORKFLOW_STATE.combined_filter_summary.total_excluded_percentage}%)

  EFFICIENCY GAIN: {WORKFLOW_STATE.combined_filter_summary.efficiency_gain_percentage}% reduction in manual review

ELSE:
  STAGE 1: Auto-Filter
  ℹ️  Skipped (no exclusion list)

  STAGE 2: AI-Powered Double-Check
  ✓ Issues validated: {WORKFLOW_STATE.ai_double_check_summary.total_validated}
  ✓ First pass - FALSE: {WORKFLOW_STATE.ai_double_check_summary.first_pass_excluded}
  ✓ Second pass - FALSE: {WORKFLOW_STATE.ai_double_check_summary.second_pass_excluded}
  ✓ Final VALID: {WORKFLOW_STATE.ai_double_check_summary.second_pass_valid}

  RESULTS:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Original issues: {WORKFLOW_STATE.ai_double_check_summary.total_validated}
  AI excluded: {WORKFLOW_STATE.ai_double_check_summary.total_excluded_by_ai}

  🎯 VALID for review: {WORKFLOW_STATE.combined_filter_summary.valid_for_review}

  EFFICIENCY GAIN: {WORKFLOW_STATE.combined_filter_summary.efficiency_gain_percentage}% reduction in manual review

WORKFLOW STATE UPDATED:
✓ page_results array populated: {page_results.length} pages
✓ auto_filter_summary stored
✓ ai_double_check_summary stored
✓ combined_filter_summary stored
✓ phase_2_complete = (will be set to true after 'proceed')

Status: COMPLETE
Blockers: None

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Type 'proceed' to advance to Phase 3 (REVIEW)
⚠️ Type 'verify: [page identifier]' to inspect a specific page result
❌ Type 'redo' if something is wrong
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**WAIT** for user to type 'proceed' before marking phase complete.

**ONLY AFTER 'proceed':**
```javascript
WORKFLOW_STATE.phase_2_complete = true
```
```

---

## Phase 3 Entry Modifications

**Location:** Lines 2192+ (PHASE 3: REVIEW - EXECUTABLE COMMAND SEQUENCE)

**Replace Command 1 with:**

```markdown
### COMMAND 1: Load Issues for Review

```javascript
EXECUTE:
  // Load VALID issues from AI double-check (always available)
  needs_review_file = WORKFLOW_STATE.ai_double_check_summary.needs_review_file

  IF !file_exists(needs_review_file):
    ERROR: "Filtered issues file not found. Phase 2 filtering may have failed."
    STOP

  filtered_data = read_json(needs_review_file)
  issues_for_review = filtered_data.issues

  DISPLAY: "✓ Loaded {issues_for_review.length} VALID issues (post-filtering + AI double-check)"
  DISPLAY: "  Original: {filtered_data.summary.total_issues_scanned}"
  DISPLAY: "  Excluded: {filtered_data.summary.total_excluded} ({filtered_data.summary.exclusion_rate}%)"
  DISPLAY: "  Double-checked: Yes"
  DISPLAY: ""

  // Group by WCAG criterion for easier review
  grouped_by_wcag = group_by(issues_for_review, 'wcag_criterion')

  total_for_review = issues_for_review.length

STORE:
  WORKFLOW_STATE.issues_for_review = issues_for_review
  WORKFLOW_STATE.grouped_by_wcag = grouped_by_wcag
  WORKFLOW_STATE.total_for_review = total_for_review
  WORKFLOW_STATE.issue_reviews = []  // Initialize review tracking array

DISPLAY:
  "✓ Grouped into {Object.keys(grouped_by_wcag).length} WCAG criteria"

VERIFY: total_for_review === issues_for_review.length
VERIFY: issues_for_review.length >= 0  // Can be 0 if all were excluded
```

**Checkpoint:** If loading fails or verification fails, STOP and alert user.

---
```

---

## Post-Workflow Exclusion List Maintenance

**NEW SECTION - Insert after Phase 5 (VPAT generation completes)**

**Location:** After the final "✅ VPAT 2.5 Report Generation Complete" message

Status: COMPLETE
Blockers: None

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Type 'proceed' to advance to Phase 3 (REVIEW)
⚠️ Type 'verify: [page identifier]' to inspect a specific page result
❌ Type 'redo' if something is wrong
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**WAIT** for user to type 'proceed' before marking phase complete.

**ONLY AFTER 'proceed':**
```javascript
WORKFLOW_STATE.phase_2_complete = true
```

---

## ENFORCEMENT RULES

1. **MUST execute commands in exact order for each page**
2. **CANNOT skip any command** (including browser check, screenshot verification)
3. **MUST complete all pages** (cannot stop mid-way without user approval)
4. **MUST verify tool count** (5-12 tools per page for Smart approach)
5. **MUST validate before report generation** (tool count must match array length)
6. **MUST wait for user 'proceed' before marking phase complete**

---

## DEVIATION DETECTION

If you detect yourself about to:
- Skip a command
- Skip a page
- Not verify tool count
- Generate reports without validation
- Not display verification to user

**IMMEDIATELY STOP AND DISPLAY:**

```
⚠️ DEVIATION DETECTED - STOPPED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
I was about to deviate from the command sequence.

What I was about to do: {description}
Correct action: {what should happen}

HALTED - Awaiting user permission to continue correctly.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---
### PHASE 3: REVIEW - EXECUTABLE COMMAND SEQUENCE

**CRITICAL:** Execute commands in EXACT order. NO skipping. NO improvisation. NO reordering.

**⚠️ IMPORTANT - ZERO ISSUES HANDLING:**
- **IF 0 valid issues after Command 18:** Commands 1-4 can be skipped (no interactive review needed)
- **BUT Command 5 MUST ALWAYS RUN** - Updates scan files with review metadata even with 0 issues
- **Commands 6-7:** Generate audit trail documenting that 0 issues were found
- **NEVER skip Command 5** - Scan files MUST be updated with phase3_review, wcag_conformance, and review sections

---

## PRE-PHASE GATE DISPLAY

Display Phase 3 entry gate with:
- Documentation section read ("PHASE 3: REVIEW - EXECUTABLE COMMAND SEQUENCE")
- Purpose: Validate scan results, filter issues for VPAT accuracy
- Pages reviewed: {WORKFLOW_STATE.total_pages}
- Command summary: 7 commands - Consolidate issues, present for review, interactive classification (VALID/EXISTS/FALSE), summary, adjust reports with backups, generate audit trail, verify completion

**CRITICAL:** Will execute commands in exact order, no skipping, verify each step.

Wait for 'approved' to proceed.

---

## COMMAND EXECUTION SEQUENCE

### COMMAND 1: Consolidate All Issues Across Pages

```javascript
EXECUTE:
  // Load VALID issues from AI double-check (always available)
  needs_review_file = WORKFLOW_STATE.ai_double_check_summary.needs_review_file

  IF !file_exists(needs_review_file):
    ERROR: "Filtered issues file not found. Phase 2 filtering may have failed."
    STOP

  filtered_data = read_json(needs_review_file)
  issues_for_review = filtered_data.issues

  DISPLAY: "✓ Loaded {issues_for_review.length} VALID issues (post-filtering + AI double-check)"
  DISPLAY: "  Original: {filtered_data.summary.total_issues_scanned}"
  DISPLAY: "  Excluded: {filtered_data.summary.total_excluded} ({filtered_data.summary.exclusion_rate}%)"
  DISPLAY: "  Double-checked: Yes"
  DISPLAY: ""

  // Group by WCAG criterion for easier review
  grouped_by_wcag = group_by(issues_for_review, 'wcag_criterion')

  total_for_review = issues_for_review.length

STORE:
  WORKFLOW_STATE.issues_for_review = issues_for_review
  WORKFLOW_STATE.grouped_by_wcag = grouped_by_wcag
  WORKFLOW_STATE.total_for_review = total_for_review
  WORKFLOW_STATE.issue_reviews = []  // Initialize review tracking array

DISPLAY:
  "✓ Grouped into {Object.keys(grouped_by_wcag).length} WCAG criteria"

VERIFY: total_for_review === issues_for_review.length
VERIFY: issues_for_review.length >= 0  // Can be 0 if all were excluded
```

**Checkpoint:** If consolidation fails or verification fails, STOP and alert user.

---

### COMMAND 2: Present Issues for Review

```
DISPLAY:
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  "SCAN RESULTS REVIEW - ISSUE VALIDATION"
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ""
  "Total Issues Found: {WORKFLOW_STATE.total_issues_found}"
  "Pages Scanned: {WORKFLOW_STATE.total_pages}"
  ""
  "You will now review each issue to determine if it should be included in the final VPAT report."
  ""
  "For each issue, you can mark it as:"
  "  • VALID - Real accessibility barrier, include in VPAT"
  "  • EXISTS - Already reported/fixed, exclude from VPAT (tracked separately)"
  "  • FALSE - False positive, exclude from VPAT (tracked separately)"
  ""
  "This ensures the VPAT report contains only valid, actionable issues."
  ""
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ""
  "Ready to start review? (yes/start-review)"

WAIT for user response

IF response !== 'yes' AND response !== 'start-review':
  ERROR: "User not ready to review. Type 'yes' or 'start-review' to begin."
  STOP

DISPLAY: "✓ Starting issue review..."
```

**Checkpoint:** User must confirm readiness to start review.

---

### COMMAND 3: Interactive Issue Review (Per-Issue Loop)

```javascript
EXECUTE:
  review_complete = false
  current_issue_index = 0

  // Iterate through each WCAG criterion group
  for (wcag_criterion in WORKFLOW_STATE.grouped_by_wcag) {
    issues_in_criterion = WORKFLOW_STATE.grouped_by_wcag[wcag_criterion]
    criterion_info = get_wcag_criterion_info(wcag_criterion)  // Name, level

    DISPLAY:
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      "WCAG {wcag_criterion} - {criterion_info.name} (Level {criterion_info.level})"
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      ""
      "Issues in this criterion: {issues_in_criterion.length}"

    // Iterate through each issue in this criterion
    for (issue_index, issue of issues_in_criterion) {
      current_issue_index++

      // Check if issue is pre-classified (auto-excluded)
      IF issue.auto_excluded === true:
        // Automatically classify without user prompt
        DISPLAY:
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          "Issue #{current_issue_index}/{WORKFLOW_STATE.total_issues_found} [AUTO-EXCLUDED]"
          ""
          "Title: {issue.title}"
          "Element: {issue.element}"
          "Selector: {issue.selector}"
          ""
          "🚫 AUTOMATICALLY CLASSIFIED AS FALSE POSITIVE"
          "Reason: {issue.exclusion_reason}"
          ""
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        // Store auto-classification
        WORKFLOW_STATE.issue_reviews.push({
          issue_id: issue.unique_id,
          page: issue.page,
          wcag_criterion: issue.wcag_criterion,
          original_status: 'found',
          reviewed_status: 'false_positive',
          reviewer_note: issue.exclusion_reason,
          reviewed_at: new Date().toISOString(),
          auto_classified: true
        })

        // Skip user prompt and continue to next issue
        CONTINUE to next issue

      // Display issue for manual review (not auto-excluded)
      DISPLAY:
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        "Issue #{current_issue_index}/{WORKFLOW_STATE.total_issues_found}"
        ""
        "Title: {issue.title}"
        "Severity: {issue.severity}"
        "Page: {issue.page} ({issue.page_url})"
        "Location: {issue.location}"
        ""
        "Description:"
        "{issue.description}"
        ""
        "Impact:"
        "{issue.impact}"
        ""
        "Element:"
        "{issue.element}"
        ""
        "Selector: {issue.selector}"
        "Instances: {issue.instances}"
        ""
        "Recommendation:"
        "{issue.recommendation}"
        ""
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        ""
        "How should this issue be classified?"
        ""
        "Options:"
        "  1. VALID - Include in VPAT (real accessibility barrier)"
        "  2. EXISTS - Already reported/documented (exclude from VPAT)"
        "  3. FALSE - False positive (exclude from VPAT)"
        "  4. OUT OF SCOPE - Third-party/external (exclude from VPAT)"
        ""
        "Enter choice (1/2/3/4) or 'all-valid' to mark all remaining as valid: _____"

      WAIT for user input

      // Handle 'all-valid' special case
      IF response === 'all-valid':
        DISPLAY: "Marking all remaining {WORKFLOW_STATE.total_issues_found - current_issue_index + 1} issues as VALID..."

        // Mark current issue as valid
        WORKFLOW_STATE.issue_reviews.push({
          issue_id: issue.unique_id,
          page: issue.page,
          wcag_criterion: issue.wcag_criterion,
          original_status: 'found',
          reviewed_status: 'valid',
          reviewer_note: 'Bulk validated via all-valid',
          reviewed_at: new Date().toISOString()
        })

        // Mark ALL remaining issues as valid
        for (remaining_issue of get_remaining_issues(current_issue_index)) {
          WORKFLOW_STATE.issue_reviews.push({
            issue_id: remaining_issue.unique_id,
            page: remaining_issue.page,
            wcag_criterion: remaining_issue.wcag_criterion,
            original_status: 'found',
            reviewed_status: 'valid',
            reviewer_note: 'Bulk validated via all-valid',
            reviewed_at: new Date().toISOString()
          })
        }

        DISPLAY: "✓ All remaining issues marked as VALID"
        review_complete = true
        BREAK from all loops

      // Handle individual classification
      ELSE IF response === '1':
        reviewed_status = 'valid'
        reviewer_note = null

      ELSE IF response === '2':
        reviewed_status = 'existing'

        DISPLAY: "Enter JIRA ticket reference (e.g., A11Y-1234): _____"
        WAIT for user input
        existing_reference = user_input

        DISPLAY: "Optional: Add context note (or press Enter to skip)"
        DISPLAY: "Note: _____"
        WAIT for user input
        reviewer_note = user_input (can be empty)

      ELSE IF response === '3':
        reviewed_status = 'false_positive'

        DISPLAY: "Optional: Add a note explaining this decision (or press Enter to skip)"
        DISPLAY: "Note: _____"
        WAIT for user input
        reviewer_note = user_input (can be empty)

      ELSE IF response === '4':
        reviewed_status = 'out_of_scope'

        DISPLAY: "Why is this out of scope? (e.g., 'Third-party widget', 'Login form'): _____"
        WAIT for user input
        scope_exclusion_reason = user_input

      ELSE:
        ERROR: "Invalid choice. Please enter 1, 2, 3, 4, or 'all-valid'"
        REPEAT this issue (don't increment)
        CONTINUE

      // Store review decision
      WORKFLOW_STATE.issue_reviews.push({
        issue_id: issue.unique_id,
        page: issue.page,
        wcag_criterion: issue.wcag_criterion,
        original_status: 'found',
        reviewed_status: reviewed_status,
        reviewer_note: reviewer_note,
        existing_reference: existing_reference || undefined,
        scope_exclusion_reason: scope_exclusion_reason || undefined,
        reviewed_at: new Date().toISOString()
      })

      DISPLAY: "✓ Issue classified as {reviewed_status.toUpperCase()}"

      // If review_complete (all-valid used), break out
      IF review_complete:
        BREAK

    // If review_complete (all-valid used), break out of criterion loop
    IF review_complete:
      BREAK
  }

VERIFY: WORKFLOW_STATE.issue_reviews.length === WORKFLOW_STATE.total_issues_found
DISPLAY: "✓ All issues reviewed: {WORKFLOW_STATE.issue_reviews.length} decisions recorded"
```

**Checkpoint:** All issues must be reviewed (individually or via 'all-valid').

---

### COMMAND 4: Display Review Summary

```javascript
EXECUTE:
  // Calculate counts by classification
  count_valid = WORKFLOW_STATE.issue_reviews.filter(r => r.reviewed_status === 'valid').length
  count_existing = WORKFLOW_STATE.issue_reviews.filter(r => r.reviewed_status === 'existing').length
  count_out_of_scope = WORKFLOW_STATE.issue_reviews.filter(r => r.reviewed_status === 'out_of_scope').length
  count_false = WORKFLOW_STATE.issue_reviews.filter(r => r.reviewed_status === 'false_positive').length

STORE:
  WORKFLOW_STATE.count_valid = count_valid
  WORKFLOW_STATE.count_existing = count_existing
  WORKFLOW_STATE.count_out_of_scope = count_out_of_scope
  WORKFLOW_STATE.count_false = count_false

DISPLAY:
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  "ISSUE REVIEW COMPLETE"
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ""
  "Total Issues Found: {WORKFLOW_STATE.total_issues_found}"
  ""
  "Review Results:"
  "  • VALID (include in VPAT): {count_valid} issues"
  "  • EXISTING (exclude): {count_existing} issues"
  "  • OUT OF SCOPE (exclude): {count_out_of_scope} issues"
  "  • FALSE POSITIVE (exclude): {count_false} issues"
  ""
  "Final VPAT will contain: {count_valid} validated issues"
  ""
  "Excluded Issues Summary:"
  "  • Already Existing: {count_existing} ({(count_existing / WORKFLOW_STATE.total_issues_found * 100).toFixed(1)}%)"
  "  • Out of Scope: {count_out_of_scope} ({(count_out_of_scope / WORKFLOW_STATE.total_issues_found * 100).toFixed(1)}%)"
  "  • False Positives: {count_false} ({(count_false / WORKFLOW_STATE.total_issues_found * 100).toFixed(1)}%)"
  "  • Total Excluded: {count_existing + count_out_of_scope + count_false} ({((count_existing + count_out_of_scope + count_false) / WORKFLOW_STATE.total_issues_found * 100).toFixed(1)}%)"
  ""
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

VERIFY: count_valid + count_existing + count_out_of_scope + count_false === WORKFLOW_STATE.total_issues_found
```

**Checkpoint:** Total must equal valid + existing + false.

---

### COMMAND 5: Adjust Scan Reports with Validated Issues

```javascript
ANNOUNCE: "▶ Updating scan reports with validated issues..."

EXECUTE:
  for (page_result of WORKFLOW_STATE.page_results) {
    ANNOUNCE: "▶ Processing page: {page_result.page.identifier}..."

    // Read original scan data
    scan_data = read_json(page_result.json_path)

    // Create backup
    backup_path = `${page_result.json_path}.pre-review-backup`
    copy_file(page_result.json_path, backup_path)
    DISPLAY: "  ✓ Backup created: {backup_path}"

    // Filter issues based on review
    validated_issues = []
    excluded_issues = {
      auto_excluded: [],
      out_of_scope: [],
      existing: [],
      false_positives: []
    }

    // Populate auto_excluded from earlier stages (Commands 17-18)
    if (WORKFLOW_STATE.all_excluded_issues && WORKFLOW_STATE.all_excluded_issues.length > 0) {
      for (auto_issue of WORKFLOW_STATE.all_excluded_issues) {
        // Only include issues for current page
        if (auto_issue.page_identifier === page_result.page.identifier) {
          excluded_issues.auto_excluded.push({
            id: auto_issue.id,
            wcag_criterion: auto_issue.wcag_criterion,
            wcag_level: auto_issue.wcag_level,
            title: auto_issue.title,
            severity: auto_issue.severity,
            element: auto_issue.element || 'N/A',
            selector: auto_issue.selector || 'N/A',
            exclusion_rule: auto_issue.exclusion_rule_id || 'ai_validation',
            exclusion_reason: auto_issue.exclusion_reason
          })
        }
      }
    }

    for (issue of scan_data.issues) {
      // Find review decision for this issue
      review = WORKFLOW_STATE.issue_reviews.find(r =>
        r.page === page_result.page.identifier &&
        r.wcag_criterion === issue.wcag_criterion &&
        r.issue_id === generate_unique_id(issue, page_result.page.identifier)
      )

      if (review.reviewed_status === 'valid') {
        validated_issues.push({
          ...issue,
          review_status: 'valid',
          reviewed_at: review.reviewed_at,
          validation_note: review.reviewer_note || undefined
        })
      } else if (review.reviewed_status === 'existing') {
        excluded_issues.existing.push({
          ...issue,
          existing_issue_reference: review.existing_reference,
          reviewed_at: review.reviewed_at,
          reviewer_note: review.reviewer_note || undefined
        })
      } else if (review.reviewed_status === 'out_of_scope') {
        excluded_issues.out_of_scope.push({
          ...issue,
          scope_exclusion_reason: review.scope_exclusion_reason
        })
      } else if (review.reviewed_status === 'false_positive') {
        excluded_issues.false_positives.push({
          ...issue,
          reviewer_note: review.reviewer_note || 'Marked as false positive',
          reviewed_at: review.reviewed_at
        })
      }
    }

    // Remove review_status from all excluded items (must not be present)
    for (category of ['auto_excluded', 'out_of_scope', 'false_positives', 'existing']) {
      for (item of excluded_issues[category]) {
        delete item.review_status
      }
    }

    // Update scan data
    original_issue_count = scan_data.issues.length
    scan_data.issues = validated_issues
    scan_data.summary.total_issues = validated_issues.length
    scan_data.summary.by_severity = recalculate_severity_counts(validated_issues)
    scan_data.summary.by_wcag_level = recalculate_wcag_level_counts(validated_issues)

    // Add review metadata
    scan_data.review_metadata = {
      reviewed: true,
      reviewed_at: new Date().toISOString(),
      original_issue_count: original_issue_count,
      validated_issue_count: validated_issues.length,
      auto_excluded_count: excluded_issues.auto_excluded.length,
      out_of_scope_count: excluded_issues.out_of_scope.length,
      manual_false_positive_count: excluded_issues.false_positives.length,
      existing_issue_count: excluded_issues.existing.length
    }

    // Store excluded issues for audit trail
    scan_data.excluded_issues = excluded_issues

    // Save updated JSON
    write_json(page_result.json_path, scan_data)
    DISPLAY: "  ✓ JSON updated: {page_result.json_path}"

    // Regenerate markdown report with validated issues only
    md_report = generate_markdown_report(scan_data)
    write_file(page_result.md_path, md_report)
    DISPLAY: "  ✓ Markdown regenerated: {page_result.md_path}"

    total_excluded = excluded_issues.auto_excluded.length + excluded_issues.out_of_scope.length + excluded_issues.false_positives.length + excluded_issues.existing.length
    DISPLAY: "  ✓ Page {page_result.page.identifier}: {original_issue_count} → {validated_issues.length} issues (excluded: {total_excluded})"
  }

VERIFY: All page results processed
DISPLAY: "✓ All scan reports updated with validated issues"
```

**Checkpoint:** All JSON and MD files must be updated and backed up.

---

### COMMAND 5A: VERIFY SCAN FILE INTEGRITY (MANDATORY GATE)

```javascript
ANNOUNCE: "▶ MANDATORY: Verifying scan file integrity..."

EXECUTE:
  verification_errors = []

  for (page_result of WORKFLOW_STATE.page_results) {
    scan_data = read_json(page_result.json_path)
    page_errors = []

    // Rule 1: Count Consistency
    if (scan_data.issues.length !== scan_data.summary.total_issues) {
      page_errors.push(`Count mismatch: issues.length (${scan_data.issues.length}) !== total_issues (${scan_data.summary.total_issues})`)
    }

    if (scan_data.issues.length !== scan_data.review_metadata.validated_issue_count) {
      page_errors.push(`Count mismatch: issues.length (${scan_data.issues.length}) !== validated_issue_count (${scan_data.review_metadata.validated_issue_count})`)
    }

    severity_sum = Object.values(scan_data.summary.by_severity).reduce((a, b) => a + b, 0)
    if (severity_sum !== scan_data.summary.total_issues) {
      page_errors.push(`Severity sum (${severity_sum}) !== total_issues (${scan_data.summary.total_issues})`)
    }

    level_sum = Object.values(scan_data.summary.by_wcag_level).reduce((a, b) => a + b, 0)
    if (level_sum !== scan_data.summary.total_issues) {
      page_errors.push(`WCAG level sum (${level_sum}) !== total_issues (${scan_data.summary.total_issues})`)
    }

    // Rule 2: Issues Array Content
    for (issue of scan_data.issues) {
      if (issue.review_status !== 'valid') {
        page_errors.push(`Issue ${issue.id} missing review_status='valid' (has: '${issue.review_status || 'undefined'}')`)
      }

      if (!issue.reviewed_at) {
        page_errors.push(`Issue ${issue.id} missing reviewed_at field`)
      }
    }

    // Rule 3: Excluded Issues Structure
    required_categories = ['auto_excluded', 'out_of_scope', 'false_positives', 'existing']
    for (category of required_categories) {
      if (!(category in scan_data.excluded_issues)) {
        page_errors.push(`Missing excluded_issues.${category}`)
      }
    }

    // Check for review_status in excluded items (must not be present)
    for (category of required_categories) {
      if (scan_data.excluded_issues[category]) {
        for (item of scan_data.excluded_issues[category]) {
          if ('review_status' in item) {
            page_errors.push(`Excluded item ${item.id} in ${category} has review_status (must not be present)`)
          }
        }
      }
    }

    // Rule 4: Required Sections
    required_sections = ['report_id', 'metadata', 'tool_coverage_verification',
                        'review_metadata', 'summary', 'wcag_conformance', 'issues', 'excluded_issues']
    for (section of required_sections) {
      if (!(section in scan_data)) {
        page_errors.push(`Missing required section: ${section}`)
      }
    }

    // Store results
    if (page_errors.length > 0) {
      verification_errors.push({page: page_result.page.identifier, errors: page_errors})
      DISPLAY: `  ⛔ ${page_result.page.identifier}: ${page_errors.length} violation(s)`
    } else {
      DISPLAY: `  ✅ ${page_result.page.identifier}: PASSED`
    }
  }

// Check if all passed
if (verification_errors.length > 0) {
  DISPLAY: ""
  DISPLAY: "⛔ SCAN FILE VERIFICATION FAILED"
  DISPLAY: ""
  for (result of verification_errors) {
    DISPLAY: `Page: ${result.page}`
    for (error of result.errors) {
      DISPLAY: `  ❌ ${error}`
    }
  }
  DISPLAY: ""
  DISPLAY: "❌ CANNOT PROCEED - Fix violations above"
  DISPLAY: "Reference: references/SCAN-FILE-RULES.md"
  STOP: "Validation failed"
}

DISPLAY: "✅ All scan files passed verification"
```

**Checkpoint:** This is a BLOCKING GATE. Workflow must STOP if any violations found.

---

### COMMAND 6: Generate Review Audit Report

```javascript
ANNOUNCE: "▶ Generating review audit report..."

EXECUTE:
  audit_timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  audit_path = `${WORKFLOW_STATE.report_directory}/issue-review-audit-${audit_timestamp}.md`

  // Build audit report content
  audit_content = `# Accessibility Scan Issue Review Audit

**Review Date:** ${new Date().toISOString()}
**Total Issues Reviewed:** ${WORKFLOW_STATE.total_issues_found}

## Review Summary

| Classification | Count | Percentage |
|---------------|-------|------------|
| Valid (Included in VPAT) | ${WORKFLOW_STATE.count_valid} | ${(WORKFLOW_STATE.count_valid / WORKFLOW_STATE.total_issues_found * 100).toFixed(1)}% |
| Already Existing (Excluded) | ${WORKFLOW_STATE.count_existing} | ${(WORKFLOW_STATE.count_existing / WORKFLOW_STATE.total_issues_found * 100).toFixed(1)}% |
| False Positive (Excluded) | ${WORKFLOW_STATE.count_false} | ${(WORKFLOW_STATE.count_false / WORKFLOW_STATE.total_issues_found * 100).toFixed(1)}% |
| **Total** | ${WORKFLOW_STATE.total_issues_found} | 100% |

## Valid Issues (Included in VPAT)

${generate_valid_issues_section(WORKFLOW_STATE.issue_reviews, WORKFLOW_STATE.all_issues)}

## Excluded Issues - Already Existing

${generate_existing_issues_section(WORKFLOW_STATE.issue_reviews, WORKFLOW_STATE.all_issues)}

## Excluded Issues - False Positives

${generate_false_positive_issues_section(WORKFLOW_STATE.issue_reviews, WORKFLOW_STATE.all_issues)}

## Per-Page Review Breakdown

${generate_per_page_breakdown(WORKFLOW_STATE.page_results, WORKFLOW_STATE.issue_reviews)}

## Review Decisions Detail

${generate_review_decisions_detail(WORKFLOW_STATE.issue_reviews, WORKFLOW_STATE.all_issues)}
`

  // Save audit report
  write_file(audit_path, audit_content)

STORE:
  WORKFLOW_STATE.audit_report_path = audit_path

DISPLAY:
  "✓ Review audit report generated"
  "  Path: {audit_path}"

VERIFY: Bash
  ls -la "{audit_path}"

CHECK: File exists
```

**Checkpoint:** Audit report file must exist.

---

### COMMAND 7: Verify Phase Completion

Display this checklist:

```
DISPLAY:
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  "🏁 PHASE 3 COMPLETION VERIFICATION: REVIEW"
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ""
  "✅ COMPLETION CHECKLIST:"
  ""
  "✓ Command 1: Issues consolidated"
  "  → Total issues: {WORKFLOW_STATE.total_issues_found}"
  "  → Grouped by WCAG: {Object.keys(WORKFLOW_STATE.grouped_by_wcag).length} criteria"
  ""
  "✓ Command 2: Review overview presented"
  "  → User confirmed ready to review"
  ""
  "✓ Command 3: Interactive review completed"
  "  → All {WORKFLOW_STATE.total_issues_found} issues reviewed"
  "  → Review decisions recorded: {WORKFLOW_STATE.issue_reviews.length}"
  ""
  "✓ Command 4: Review summary displayed"
  "  → Valid: {WORKFLOW_STATE.count_valid}"
  "  → Existing: {WORKFLOW_STATE.count_existing}"
  "  → False: {WORKFLOW_STATE.count_false}"
  ""
  "✓ Command 5: Scan reports updated"
  "  → All {WORKFLOW_STATE.total_pages} pages updated"
  "  → Backups created: {WORKFLOW_STATE.total_pages} .pre-review-backup files"
  "  → JSON reports updated with validated issues only"
  "  → Markdown reports regenerated"
  "  → review_metadata added"
  "  → excluded_issues stored for audit trail"
  ""
  "✓ Command 6: Review audit report generated"
  "  → Path: {WORKFLOW_STATE.audit_report_path}"
  ""
  "WORKFLOW STATE UPDATED:"
  "  ✓ phase_3_complete = (will be set to true after 'proceed')"
  ""
  "Status: COMPLETE"
  "Blockers: None"
  ""
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  "✅ Type 'proceed' to complete workflow (ready for VPAT generation)"
  "⚠️ Type 'verify' to review audit report"
  "❌ Type 'redo' if something is wrong"
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

WAIT for user response

IF response === 'proceed':
  WORKFLOW_STATE.phase_3_complete = true
  DISPLAY: "✓ Phase 3 marked complete"
  DISPLAY: ""

  // Check if VPAT generation will be skipped
  ASK: "Generate VPAT report now? (yes/no/later)"
  WAIT for user response

  IF response === 'no' OR response === 'later':
    DISPLAY: ""
    DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    DISPLAY: "ℹ️  VPAT generation skipped - proceeding to POST-WORKFLOW maintenance"
    DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    DISPLAY: ""

    // Store skip decision
    WORKFLOW_STATE.vpat_generation_skipped = true

    // Execute POST-WORKFLOW now (before final summary)
    GOTO: POST-WORKFLOW EXCLUSION LIST MAINTENANCE

  ELSE:
    DISPLAY: ""
    DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    DISPLAY: "✅ SCAN WORKFLOW COMPLETE"
    DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    DISPLAY: ""
    DISPLAY: "You now have:"
    DISPLAY: "  ✅ Validated JSON files for each scanned page"
    DISPLAY: "  ✅ Complete review audit trail with all decisions"
    DISPLAY: "  ✅ Clean data ready for VPAT generation"
    DISPLAY: ""
    DISPLAY: "Next Step: Generate VPAT Report"
    DISPLAY: ""
    DISPLAY: "To generate the professional VPAT 2.5 report (MD + HTML + PDF), run:"
    DISPLAY: ""
    DISPLAY: "/a11y-vpat-report {WORKFLOW_STATE.report_directory}pages/ {WORKFLOW_STATE.identifier}"
    DISPLAY: ""
    DISPLAY: "(POST-WORKFLOW maintenance will run after VPAT generation)"
    DISPLAY: ""

ELSE IF response === 'verify':
  DISPLAY: "Opening audit report for review..."
  Read(WORKFLOW_STATE.audit_report_path)
  DISPLAY: "Review complete. Type 'proceed' to continue."
  WAIT for 'proceed'
  WORKFLOW_STATE.phase_3_complete = true

ELSE IF response === 'redo':
  ERROR: "User requested redo. Please specify what needs to be redone."
  STOP
```

---

## ✅ SCAN WORKFLOW COMPLETE

**After Phase 3 completion, you have:**
- ✅ Validated JSON files for each scanned page
- ✅ Complete review audit trail with all decisions
- ✅ Clean data ready for VPAT generation

**Next Step: Generate VPAT Report**

To generate the professional VPAT 2.5 report (MD + HTML + PDF), run:

```bash
/a11y-vpat-report {working_directory}/test-reports/accessibility-reports/{identifier}/pages/ [JIRA_TICKET]
```

**Example with absolute paths:**
```bash
# If you used JIRA ticket A11Y-450
/a11y-vpat-report /path/to/repo/test-reports/accessibility-reports/A11Y-450/pages/ A11Y-450

# If you used custom identifier
/a11y-vpat-report /path/to/repo/test-reports/accessibility-reports/sprint-45-vpat/pages/
```

**Tip:** The scan workflow displays the full absolute path at completion, so you can copy it directly.

The report workflow will:
- Aggregate all validated scan results
- Map issues to WCAG {wcag_version} conformance levels
- Collect product/vendor information
- Generate VPAT 2.5 report in 3 formats (MD + HTML + PDF)
- Optionally attach PDF to JIRA ticket

---

## Requirements

### MCP Servers
- **@mcp-accessibility** - Browser automation and accessibility testing tools
- **@playwright** - Browser control and snapshot capabilities

### Optional Tools
- ⚠️ PLAYWRIGHT_USER and PLAYWRIGHT_PASSWORD in .env (optional, can use command params)
- ⚠️ JIRA API access (optional, for ticket integration)

### Browser
- Chromium (installed via Playwright)
- Must remain visible during scanning (required for MCP tools)

---

## Output Files

### Per-Page Scan Reports
- `pages/{identifier}/scan-{timestamp}.json` - Machine-readable scan data with validated issues
- `pages/{identifier}/scan-{timestamp}.json.pre-review-backup` - Original scan before review
- `pages/{identifier}/scan-{timestamp}.md` - Human-readable scan report (regenerated post-review)

### Review Audit Trail
- `issue-review-audit-{timestamp}.md` - Complete audit trail of all review decisions with notes

### JIRA Integration (if ticket provided)
- Comment posted after Phase 3 with scan summary and link to audit trail

---

## Notes

### Workflow Features
- **Two scanning approaches** - Smart (efficient, 5-12 tools) or Comprehensive (thorough, 27-30 tools)
- **Scan-only workflow** - Focuses on finding and validating issues (no fix implementation)
- **Single or multi-page** - Flexible input (URL or JSON file)
- **One authentication** - Session persists for all pages
- **Issue validation** - Review phase filters false positives and existing issues
- **Audit trail** - Complete documentation of review decisions with notes
- **Clean handoff** - Validated JSON files ready for VPAT generation
- **3 phase boundaries** - User control at each major step (Discover → Scan → Review)

### Smart vs Comprehensive Approach

**Smart Approach (DEFAULT):**
- Uses `agents/a11y-audit-guidelines.md` as **reference**, not checklist
- Foundation: axe-core + run_wcag_21_aa_tests + run_wcag_22_aa_tests (WCAG 2.2 mode)
- Strategic tool selection based on page content analysis
- 5-12 tools per page (vs 27-30 comprehensive)
- 60-70% faster execution
- **Transparent testing scope** documented in scan reports
- Best for: QA, development feedback, sprint testing, CI/CD

**Comprehensive Approach:**
- Systematic execution of all 27-30 tools per guidelines
- Mechanical checklist approach
- 15-25 minutes per page
- Best for: Legal compliance, Section 508, pre-litigation, maximum confidence

**Both produce:**
- Validated JSON files suitable for VPAT generation
- Complete issue review audit trail
- Actionable remediation guidance
- Professional scan documentation

### Separation of Concerns

This scan workflow is **separate** from VPAT report generation:
- **Scan workflow** (`/a11y-vpat-scan`) - Find and validate issues
- **Report workflow** (`/a11y-vpat-report`) - Generate professional VPAT documents

**Benefits:**
- ✅ Re-scan without regenerating VPAT
- ✅ Re-generate VPAT without re-scanning (update product info, fix errors)
- ✅ Smaller, focused command files
- ✅ Independent execution and maintenance
- ✅ Team can scan while someone else formats reports


## POST-WORKFLOW: EXCLUSION LIST MAINTENANCE

**Execution Order:**
- After Phase 3 completion (if VPAT skipped or delayed)
- After Phase 5 completion (if VPAT generated)
- ALWAYS runs before final summary

**Trigger Logic:**
```javascript
IF user_requested_vpat_skip OR workflow_stopped_at_phase_3:
  RUN: POST-WORKFLOW after Phase 3
ELSE IF phase_5_complete:
  RUN: POST-WORKFLOW after Phase 5

// ALWAYS run POST-WORKFLOW before final summary
```

**Purpose:** Analyze FALSE positives identified during this scan and suggest additions to exclusion list

```javascript
EXECUTE:

ANNOUNCE: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ANNOUNCE: "📋 EXCLUSION LIST MAINTENANCE CHECK"
ANNOUNCE: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: ""

// Step 1: Collect all FALSE positives from this scan
false_positives_from_review = WORKFLOW_STATE.issue_reviews.filter(review =>
  review.reviewed_status === 'false_positive'
)

auto_excluded_count = WORKFLOW_STATE.combined_filter_summary?.total_excluded || 0
manual_false_count = false_positives_from_review.length

total_issues_scanned = WORKFLOW_STATE.combined_filter_summary?.total_issues || WORKFLOW_STATE.total_issues_found || 0

DISPLAY: "During this scan:"
DISPLAY: "  • Pages scanned: {WORKFLOW_STATE.total_pages}"
DISPLAY: "  • Total issues found: {total_issues_scanned}"
DISPLAY: "  • Auto-excluded (Commands 15 & 16): {auto_excluded_count}"
DISPLAY: "  • Manually marked FALSE (Phase 3): {manual_false_count}"
DISPLAY: "  • Total FALSE positives: {auto_excluded_count + manual_false_count}"
DISPLAY: ""

// Step 2: Check if there are suggested exclusions from Command 18
suggested_file = WORKFLOW_STATE.ai_double_check_summary?.suggested_exclusions_file

IF suggested_file && file_exists(suggested_file):
  DISPLAY: "✓ Command 18 already identified {WORKFLOW_STATE.ai_double_check_summary.suggested_exclusions_count} potential patterns"
  DISPLAY: ""

// Step 3: Analyze manually marked FALSE positives for new patterns
IF manual_false_count > 0:
  DISPLAY: "🔍 Analyzing {manual_false_count} manually marked FALSE positives..."
  DISPLAY: ""

  // Load current exclusion list
  current_exclusion_list = read_json('test-reports/accessibility-scan-exclusions.json')
  current_version = current_exclusion_list.version
  next_version = incrementVersion(current_version)  // e.g., "3.2" → "3.3"

  // Analyze patterns in manually marked FALSE positives
  manual_suggestions = analyzeManualFalsePositives(
    false_positives_from_review,
    current_exclusion_list
  )

  // Merge with Command 18 suggestions (if any)
  IF suggested_file && file_exists(suggested_file):
    command8_suggestions = read_json(suggested_file).suggestions
    all_suggestions = [...command8_suggestions, ...manual_suggestions]
  ELSE:
    all_suggestions = manual_suggestions

  // Deduplicate and consolidate
  consolidated_suggestions = consolidateSuggestions(all_suggestions)

  IF consolidated_suggestions.length > 0:
    DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    DISPLAY: "💡 RECOMMENDATIONS FOR NEXT VERSION (v{next_version})"
    DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    DISPLAY: ""
    DISPLAY: "Found {consolidated_suggestions.length} patterns worth adding to exclusion list:"
    DISPLAY: ""

    for (i, suggestion of consolidated_suggestions) {
      DISPLAY: "{i + 1}. {suggestion.category}: {suggestion.reason}"
      DISPLAY: "   Occurrences: {suggestion.occurrences}"
      DISPLAY: "   Pattern: {suggestion.issue_pattern.description_pattern || suggestion.issue_pattern.selector_pattern}"
      DISPLAY: "   WCAG: {suggestion.issue_pattern.wcag_criterion}"
      DISPLAY: ""
    }

    // Step 4: Offer to update exclusion list
    DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    DISPLAY: ""
    DISPLAY: "Would you like me to:"
    DISPLAY: "  1. Update accessibility-scan-exclusions.json now (auto-bump to v{next_version})"
    DISPLAY: "  2. Show me the JSON changes to review first"
    DISPLAY: "  3. Save suggestions to file (I'll update manually later)"
    DISPLAY: "  4. Skip for now (no action)"
    DISPLAY: ""
    ASK: "Your choice (1/2/3/4):"

    WAIT for user response

    IF response === '1':
      // Auto-update exclusion list
      DISPLAY: ""
      DISPLAY: "✓ Updating accessibility-scan-exclusions.json..."

      // Generate new rule exclusions
      new_rules = generateRuleExclusions(consolidated_suggestions, next_version)

      // Append to current exclusion list
      updated_exclusion_list = {
        ...current_exclusion_list,
        version: next_version,
        rule_exclusions: [
          ...current_exclusion_list.rule_exclusions,
          ...new_rules
        ],
        notes: {
          ...current_exclusion_list.notes,
          [`version_${next_version.replace('.', '_')}`]: `Added ${new_rules.length} new rule exclusions based on scan: ${WORKFLOW_STATE.identifier} (${new Date().toISOString().split('T')[0]})`
        }
      }

      // Backup current version
      backup_file = `test-reports/accessibility-scan-exclusions.json.v${current_version}.backup`
      write_json(backup_file, current_exclusion_list)

      // Write updated version
      write_json('test-reports/accessibility-scan-exclusions.json', updated_exclusion_list)

      DISPLAY: "  ✓ Backed up v{current_version} to: {backup_file}"
      DISPLAY: "  ✓ Updated to v{next_version} with {new_rules.length} new rules"
      DISPLAY: ""
      DISPLAY: "✅ Exclusion list updated successfully!"

    ELSE IF response === '2':
      // Show JSON changes for review
      DISPLAY: ""
      DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      DISPLAY: "📄 PROPOSED JSON CHANGES"
      DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      DISPLAY: ""

      new_rules = generateRuleExclusions(consolidated_suggestions, next_version)

      DISPLAY: "Add these rules to \"rule_exclusions\" array:"
      DISPLAY: ""
      DISPLAY: JSON.stringify(new_rules, null, 2)
      DISPLAY: ""

      DISPLAY: "Update version:"
      DISPLAY: `  "version": "${next_version}"`
      DISPLAY: ""

      DISPLAY: "Add version note:"
      DISPLAY: `  "version_${next_version.replace('.', '_')}": "Added ${new_rules.length} new rule exclusions based on scan: ${WORKFLOW_STATE.identifier} (${new Date().toISOString().split('T')[0]})"`
      DISPLAY: ""

      ASK: "Review complete. Update now? (yes/no):"
      WAIT for response

      IF response === 'yes':
        // Same as option 1
        [Update exclusion list...]
        DISPLAY: "✅ Exclusion list updated successfully!"
      ELSE:
        DISPLAY: "ℹ️  Skipped. You can update manually using the JSON above."

    ELSE IF response === '3':
      // Save suggestions to file
      suggestions_file = `${WORKFLOW_STATE.report_directory}/exclusion-suggestions-for-v${next_version}.json`

      write_json(suggestions_file, {
        current_version: current_version,
        next_version: next_version,
        scan_identifier: WORKFLOW_STATE.identifier,
        generated_at: new Date().toISOString(),
        suggestions: consolidated_suggestions,
        proposed_rules: generateRuleExclusions(consolidated_suggestions, next_version)
      })

      DISPLAY: ""
      DISPLAY: "✓ Saved suggestions to: {suggestions_file}"
      DISPLAY: "  You can review and update accessibility-scan-exclusions.json manually."

    ELSE:
      DISPLAY: ""
      DISPLAY: "ℹ️  Skipped exclusion list update."

  ELSE:
    DISPLAY: "✓ No new patterns identified that need to be added to exclusion list."
    DISPLAY: "  Current exclusion list (v{current_version}) is comprehensive."

ELSE:
  DISPLAY: "✓ No manual FALSE positives to analyze (all issues handled by auto-filtering)."
  DISPLAY: "  Exclusion list (v{WORKFLOW_STATE.exclusions.version}) is working excellently."

// Step 4: Browser cleanup
DISPLAY: ""
DISPLAY: "🧹 Cleaning up browser..."
EXECUTE: mcp__mcp-accessibility__close_browser()
DISPLAY: "✓ Browser closed"

// Step 5: Update progress tracking
EXECUTE: Bash
  sed -i '' 's/\[ \] Exclusion maintenance/[✓] Exclusion maintenance/' "${WORKFLOW_STATE.progress_file}"
  sed -i '' 's/\[ \] Browser cleanup/[✓] Browser cleanup/' "${WORKFLOW_STATE.progress_file}"
  sed -i '' 's/POST: \[ \]/POST: [✓]/' "${WORKFLOW_STATE.progress_file}"

DISPLAY: ""
DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: "✅ POST-WORKFLOW MAINTENANCE COMPLETE"
DISPLAY: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY: ""
```

**Helper Logic:**
- Increment version: Parse version string and increment minor (e.g., "3.2" → "3.3")
- Analyze false positives: Extract patterns from manually marked FALSE issues, check if similar rule exists in exclusion list, suggest new rules for unique patterns
- Generate rule exclusions: Convert suggestions to rule format with rule_id, reason, wcag_criterion, pattern_match, version metadata
- Categorize false positives: Use AI to categorize by type (hidden_field, third_party_widget, out_of_scope, wcag_not_applicable, tool_misinterpretation, timing_issue)

---

## WORKFLOW_STATE Updates

**Add these new fields to WORKFLOW_STATE structure:**

```javascript
WORKFLOW_STATE = {
  // ... existing fields ...

  // Auto-Filter Summary (Command 17)
  auto_filter_summary: {
    enabled: boolean,                      // true if exclusions loaded
    total_issues: number,                  // Total issues from all pages
    auto_excluded: number,                 // Count of pattern-matched exclusions
    auto_excluded_percentage: number,      // Percentage excluded
    needs_double_check: number,            // Count passing to AI validation
    exclusion_breakdown: {                 // Breakdown by rule
      [rule_id]: {
        rule_id: string,
        reason: string,
        count: number
      }
    },
    auto_excluded_file: string,            // Path to auto-excluded-issues.json
    needs_double_check_file: string        // Path to needs-double-check.json
  },

  // AI Double-Check Summary (Command 18)
  ai_double_check_summary: {
    total_validated: number,               // Count of issues validated
    first_pass_valid: number,              // Count marked VALID in first pass
    first_pass_excluded: number,           // Count marked FALSE in first pass
    second_pass_valid: number,             // Count confirmed VALID in second pass
    second_pass_excluded: number,          // Count caught FALSE in second pass
    total_excluded_by_ai: number,          // Total excluded by AI (first + second)
    suggested_exclusions_count: number,    // Count of new patterns suggested
    needs_review_file: string,             // Path to needs-review-issues.json
    suggested_exclusions_file: string      // Path to suggested-exclusions.json (optional)
  },

  // Combined Filter Summary (Both Stages)
  combined_filter_summary: {
    total_issues: number,                  // Original total
    stage1_excluded: number,               // Auto-filter exclusions
    stage2_first_pass_excluded: number,    // AI first pass exclusions
    stage2_second_pass_excluded: number,   // AI second pass exclusions
    total_excluded: number,                // Combined exclusions
    total_excluded_percentage: number,     // Percentage excluded
    valid_for_review: number,              // Final count for Phase 3
    efficiency_gain_percentage: number     // Same as total_excluded_percentage
  },

  // Issue Arrays
  auto_excluded_issues: [],                // Issues excluded by pattern matching
  needs_double_check_issues: [],           // Issues passing auto-filter
  final_valid_issues: [],                  // Final VALID issues after double-check
  all_excluded_issues: [],                 // All excluded issues (combined)

  // Phase 3 Updates
  issues_for_review: [],                   // Final VALID issues for Phase 3
  total_for_review: number,                // Count of issues_for_review

  // ... rest of existing fields ...
}
```

---

## JSON File Structures

### auto-excluded-issues.json (After Command 18)

```json
{
  "summary": {
    "total_issues_scanned": 150,
    "auto_excluded_by_pattern": 147,
    "excluded_by_ai_first_pass": 1,
    "excluded_by_ai_second_pass": 1,
    "total_excluded": 149,
    "total_excluded_percentage": 99,
    "ai_validation_completed_at": "2026-02-11T10:35:00Z",
    "exclusion_list_version": "3.2"
  },
  "exclusion_breakdown": {
    "color-contrast-disabled-controls": {
      "rule_id": "color-contrast-disabled-controls",
      "reason": "Disabled UI controls exempt from WCAG 1.4.3",
      "count": 45
    }
  },
  "issues": [
    {
      "title": "Color contrast insufficient",
      "wcag_criterion": "1.4.3",
      "severity": "serious",
      "page_identifier": "advising-note-list",
      "selector": "button[disabled]",
      "description": "Element has insufficient color contrast (disabled state)",
      "auto_excluded": true,
      "exclusion_rule_id": "color-contrast-disabled-controls",
      "exclusion_reason": "Disabled UI controls exempt from WCAG 1.4.3",
      "matched_pattern": "disabled",
      "matched_field": "description",
      "exclusion_stage": "auto_filter"
    },
    {
      "title": "Element missing accessible name",
      "wcag_criterion": "4.1.2",
      "severity": "serious",
      "page_identifier": "advising-note-create",
      "selector": "input[type='hidden']",
      "description": "Form element has type=hidden",
      "auto_excluded": true,
      "exclusion_stage": "ai_double_check",
      "exclusion_reason": "Hidden element (not visible to users)",
      "exclusion_category": "hidden_field"
    },
    {
      "title": "Div missing name",
      "wcag_criterion": "4.1.2",
      "severity": "moderate",
      "page_identifier": "advising-note-list",
      "selector": "div.decorative",
      "description": "Div element with no accessible name",
      "auto_excluded": true,
      "exclusion_stage": "ai_second_pass",
      "exclusion_reason": "Non-interactive decorative container",
      "exclusion_category": "wcag_not_applicable",
      "first_pass_thought_valid": true,
      "second_pass_caught": true
    }
  ]
}
```

### needs-review-issues.json (Final VALID Issues)

```json
{
  "summary": {
    "total_issues_scanned": 150,
    "auto_excluded_by_pattern": 147,
    "excluded_by_ai": 2,
    "total_excluded": 149,
    "valid_issues_for_review": 1,
    "exclusion_rate": 99,
    "double_checked": true,
    "generated_at": "2026-02-11T10:35:00Z"
  },
  "issues": [
    {
      "title": "Form label missing",
      "wcag_criterion": "1.3.1",
      "severity": "critical",
      "page_identifier": "advising-note-create",
      "selector": "input#student-search",
      "description": "Form input lacks associated label",
      "validation_status": "valid",
      "first_pass": {
        "classification": "VALID",
        "confidence": "medium",
        "reason": "Appears to be a legitimate WCAG violation (needs double-check)"
      },
      "second_pass": {
        "classification": "VALID",
        "confidence": "high",
        "reason": "Confirmed legitimate WCAG violation after double-check"
      },
      "double_checked": true,
      "final_confidence": "high"
    }
  ]
}
```

---

## Testing Checklist

Once implementation is complete, Mudassir will test manually with these scenarios:

### Test Scenario 1: Exclusions Enabled (Normal Flow)

**Setup:**
- Ensure `accessibility-scan-exclusions.json` v3.2 exists
- Scan pages with known false positives

**Expected Results:**
- ✅ Command 17 auto-excludes ~98% of issues
- ✅ Command 18 first pass excludes additional false positives
- ✅ Command 18 second pass double-checks ALL VALID issues
- ✅ Phase 2 gate shows combined filtering summary
- ✅ Phase 3 receives only 1-2 VALID issues
- ✅ Files created: `auto-excluded-issues.json`, `needs-review-issues.json`
- ✅ Efficiency gain: ~99% reduction

### Test Scenario 2: Exclusions Disabled

**Setup:**
- Remove or rename `accessibility-scan-exclusions.json`
- Scan same pages

**Expected Results:**
- ✅ Command 17 skips with message
- ✅ Command 18 STILL RUNS (validates all issues with AI)
- ✅ Phase 2 gate shows AI validation results
- ✅ Phase 3 receives VALID issues (fewer than 150 due to AI filtering)
- ✅ Efficiency gain from AI validation alone

### Test Scenario 3: Post-Workflow Exclusion Maintenance

**Setup:**
- Complete full scan workflow
- Mark some issues as FALSE in Phase 3

**Expected Results:**
- ✅ After VPAT generation, maintenance prompt appears
- ✅ Shows suggested patterns for next version
- ✅ Offers to update exclusion list
- ✅ Can preview JSON changes before applying
- ✅ Version incremented correctly (v3.2 → v3.3)


**End of Implementation Patch v2.0**
