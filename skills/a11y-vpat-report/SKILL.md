---
name: a11y-vpat-report
description: |
  Generate VPAT 2.5 accessibility conformance reports from validated scan data. Produces structured reports with WCAG 2.2 Level A & AA compliance status (with WCAG 2.1 backward compatibility).
  Triggers: "vpat report", "a11y vpat report", "accessibility report", "generate vpat".
---

## Syntax - VPAT 2.5 Report Generation from Validated Scan Data
```bash
/a11y-vpat-report <PAGES_DIRECTORY> [JIRA_TICKET] [--wcag 2.1|2.2]
```

## Parameters
- `PAGES_DIRECTORY` (required): Path to pages/ directory containing validated scan JSON files
  - Example: `test-reports/accessibility-reports/A11Y-450/pages/`
  - Example: `test-reports/accessibility-reports/sprint-45-vpat/pages/`
- `JIRA_TICKET` (optional): JIRA ticket ID for attaching final VPAT PDF (e.g., `A11Y-450`)
- `--wcag` (optional): WCAG version for conformance table. Default: `2.2`. Use `--wcag 2.1` for 50-criteria WCAG 2.1 conformance

**Parameter Behavior:**
- PAGES_DIRECTORY must contain validated JSON files from `/a11y-vpat-scan` workflow
- Each JSON file must have `review_metadata.reviewed = true` field
- JIRA ticket optional: If provided, PDF will be attached to ticket after generation

## Purpose
Generates professional VPAT 2.5 compliance reports (MD + HTML + PDF) from validated accessibility scan data.

**Workflow:** Load Validated Scans → Aggregate Results → Collect Product Info → Generate VPAT (MD + HTML + PDF)

**Key Features:**
- ✅ **Standalone execution** - Works with any validated scan data
- ✅ **Auto-discovery** - Detects all pages from JSON files
- ✅ **WCAG 2.2 mapping** - Complete Level A & AA conformance table (56 criteria; 50 for WCAG 2.1 mode)
- ✅ **Professional output** - VPAT 2.5 format suitable for customers
- ✅ **Multi-format export** - Markdown + HTML + PDF
- ✅ **PDF generation** - Pandoc primary, Playwright fallback
- ✅ **Optional JIRA integration** - Attach PDF to ticket
- ✅ **Re-runnable** - Regenerate reports with updated product info without re-scanning

**Prerequisites:** Must have validated scan JSON files from `/a11y-vpat-scan` workflow

---

## Standalone Operation

This workflow can run **completely independently** of the scanning workflow.

### Input Requirements

**Directory Structure:**
```
test-reports/accessibility-reports/
└── {identifier}/
    └── pages/                       # This directory is the input
        ├── dashboard/
        │   ├── scan-{timestamp}.json  ✅ Must have review_metadata.reviewed = true
        │   └── scan-{timestamp}.md
        ├── student-list/
        │   ├── scan-{timestamp}.json  ✅ Validated issues only
        │   └── scan-{timestamp}.md
        └── calendar/
            ├── scan-{timestamp}.json  ✅ Validated issues only
            └── scan-{timestamp}.md
```

**JSON File Requirements:**
- Must contain `review_metadata` section with `reviewed: true`
- Must have `issues` array (validated issues only)
- Must have `excluded_issues` array (for audit trail)
- Must have scan metadata (timestamp, approach, tools executed)

### Auto-Discovery Process

**Phase 0: Discover Validated Scan Data**

1. **Convert PAGES_DIRECTORY to absolute path**
   ```bash
   # If relative path provided, convert to absolute
   if [[ ! "$PAGES_DIRECTORY" = /* ]]; then
     PAGES_DIRECTORY="$(pwd)/${PAGES_DIRECTORY}"
   fi

   # Resolve to canonical path (removes .., symlinks, etc.)
   PAGES_DIRECTORY="$(cd "$PAGES_DIRECTORY" && pwd)"
   ```

2. **Extract paths and identifier**
   ```bash
   # Store absolute pages directory
   WORKFLOW_STATE.pages_directory = "$PAGES_DIRECTORY"

   # Get parent directory (report directory)
   WORKFLOW_STATE.report_directory = "$(dirname "$PAGES_DIRECTORY")"

   # Extract identifier from parent directory name
   WORKFLOW_STATE.identifier = "$(basename "$(dirname "$PAGES_DIRECTORY")")"

   # Get working directory (grandparent of grandparent)
   WORKFLOW_STATE.working_directory = "$(dirname "$(dirname "$(dirname "$PAGES_DIRECTORY")")")"
   ```

3. **Scan for JSON files** - Find all `scan-*.json` files in subdirectories
4. **Extract page identifiers** from directory structure
5. **Read and validate** each JSON file:
   - Check for `review_metadata.reviewed = true`
   - Verify `issues` array exists
   - Extract scan metadata (timestamp, approach, coverage)
6. **Build page list** automatically from discovered files

**Example with absolute paths:**
```bash
# Input (relative): test-reports/accessibility-reports/A11Y-450/pages/
# Converted to: /path/to/repo/test-reports/accessibility-reports/A11Y-450/pages/

# Extracted values:
# - pages_directory: /path/to/repo/test-reports/accessibility-reports/A11Y-450/pages/
# - report_directory: /path/to/repo/test-reports/accessibility-reports/A11Y-450/
# - identifier: A11Y-450
# - working_directory: /path/to/repo

# Auto-discovers:
#   - Page: dashboard (from pages/dashboard/scan-*.json)
#   - Page: student-list (from pages/student-list/scan-*.json)
#   - Page: calendar (from pages/calendar/scan-*.json)
```

### Use Cases

**1. Standard Workflow** (after scanning):
```bash
# Step 1: Scan and validate
/a11y-vpat-scan pages-config.json A11Y-450

# Step 2: Generate VPAT (use absolute path from scan output)
/a11y-vpat-report /path/to/repo/test-reports/accessibility-reports/A11Y-450/pages/ A11Y-450

# Or use relative path (will be converted to absolute automatically)
/a11y-vpat-report test-reports/accessibility-reports/A11Y-450/pages/ A11Y-450
```

**2. Re-generate VPAT** (update product info):
```bash
# Scan already complete, just regenerate report with corrected details
/a11y-vpat-report /path/to/repo/test-reports/accessibility-reports/sprint-45-vpat/pages/
```

**3. Generate from Archived Scans**:
```bash
# Create VPAT from old scan data
/a11y-vpat-report /path/to/repo/test-reports/accessibility-reports/2024-01-15-audit/pages/ A11Y-789
```

**4. Manual Scan Integration**:
```bash
# Generate VPAT from manually created JSON files (relative or absolute path)
/a11y-vpat-report custom-scans/my-audit/pages/
```

**Note:** Both relative and absolute paths are supported. Relative paths are automatically converted to absolute paths at workflow start.

---

## Report Organization & Identifier Detection

**Identifier is auto-detected** from parent directory name:

```
Input: /path/to/repo/test-reports/accessibility-reports/A11Y-450/pages/
└─ Identifier: "A11Y-450"

Input: /path/to/repo/test-reports/accessibility-reports/sprint-45-vpat/pages/
└─ Identifier: "sprint-45-vpat"
```

**Report output location (absolute paths):**
```
{working_directory}/test-reports/accessibility-reports/{identifier}/
├── pages/                           # Input (validated scans)
├── vpat-styles.css                  # Generated
├── vpat-styles-pdf.css              # Generated
├── VPAT-2.5-Report-{product}-{timestamp}.md    # Generated
├── VPAT-2.5-Report-{product}-{timestamp}.html  # Generated
└── VPAT-2.5-Report-{product}-{timestamp}.pdf   # Generated ✨
```

**Example:**
```
/path/to/repo/test-reports/accessibility-reports/A11Y-450/
├── pages/
│   ├── dashboard/scan-*.json
│   └── student-list/scan-*.json
├── vpat-styles.css
├── vpat-styles-pdf.css
├── VPAT-2.5-Report-MyApp-2024-01-15T12-00-00Z.md
├── VPAT-2.5-Report-MyApp-2024-01-15T12-00-00Z.html
└── VPAT-2.5-Report-MyApp-2024-01-15T12-00-00Z.pdf  ✨
```

### JIRA Integration Logic (Report Workflow)
```
After Phase 5 (VPAT generation), if JIRA_TICKET parameter provided:
  Attach PDF to JIRA ticket with comment:
  - VPAT 2.5 Report attached
  - Product name and version
  - Conformance summary
  - Link to HTML report
```

---

## Quick Reference

**Phases:**
4. AGGREGATE - Consolidate validated results across all pages
5. VPAT - Generate professional reports (MD + HTML + PDF)

**Prerequisites:** Validated scan JSON files from `/a11y-vpat-scan`
**JIRA Integration:** Optional (attaches PDF if ticket provided)
**Phase Boundaries:** User must type 'proceed' to advance
**Output:** VPAT 2.5 report in 3 formats (MD + HTML + PDF)

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

**MANDATORY DISPLAY before starting any phase:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚪 PHASE {N} ENTRY GATE: {PHASE_NAME}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 DOCUMENTATION READ:
   File: agents/a11y-audit-guidelines.md
   Lines: {start_line}-{end_line}
   Section: "{exact_section_heading}"

📋 PHASE OBJECTIVE:
   {1-2 sentence summary from documentation}

🎯 KEY STEPS (from documentation):
   1. {step_1_name} - Line {line_ref}
   2. {step_2_name} - Line {line_ref}
   3. {step_3_name} - Line {line_ref}
   ...

📂 EXPECTED OUTPUTS:
   □ {filename} - {purpose}
   □ {filename} - {purpose}
   ...

⚙️ WORKFLOW STATE UPDATES:
   - {workflow_state.field} = {value}
   - {workflow_state.field} = {value}

❓ QUESTIONS FOR YOU:
   {any clarifications needed, or "None"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Type 'approved' to proceed with execution
❌ Type 'wait' if you need to review documentation
🔄 Type 'clarify: {question}' if something is unclear
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**CRITICAL RULES:**
- MUST read documentation first and reference specific line numbers
- MUST NOT execute ANY work until user types 'approved'
- If user types 'wait', stop and let them review docs
- If user types 'clarify:', answer their question then re-display gate

**Documentation Line References:**
- Phase 1 (DISCOVER): Lines 1814-2065
- Phase 2 (SCAN): Lines 2067-2367
- Phase 3 (REVIEW): Lines 2369-2563
- Phase 4 (AGGREGATE): Lines 2508-2563
- Phase 5 (VPAT): Lines 2566-3335

---

### EXECUTION PHASE (During Work)

**Provide continuous progress updates:**

```
🔄 EXECUTING STEP {N}/{TOTAL}: {step_name}

Current action: {what_I'm_doing}
Tool/Command: {tool_name}
Expected outcome: {what_should_happen}

[execute tool/command]

✅ Step {N} complete - {brief_result}
```

**If unexpected situation occurs:**

```
⚠️ DEVIATION DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Expected: {what_documentation_said}
Actual: {what_actually_happened}
Reason: {why_deviation_occurred}

PROPOSED RESOLUTION:
{what_I_plan_to_do}

Your options:
1. 'continue' - Proceed with proposed resolution
2. 'stop' - Pause for your guidance
3. 'abort' - Cancel this phase and rollback

Type: 'continue' | 'stop' | 'abort'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Deviation Types to Detect:**

1. **Documentation Reference Missing**
   - Starting work without reading documentation
   - Not citing line numbers for steps

2. **File Naming Mismatch**
   - Creating files that don't match pattern in lines 220-229
   - Example: `VPAT-Report.md` instead of `VPAT-2.5-Report-{product}-{timestamp}.md`

3. **Template Structure Deviation**
   - Not following exact template structure (e.g., lines 2669-2872 for VPAT)
   - Missing required sections or changing order

4. **Checklist Item Incomplete**
   - Skipping items from phase completion checklist
   - Not verifying all required outputs

---

### POST-PHASE GATE (After Work, Before Next Phase)

**MANDATORY DISPLAY after completing any phase:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁 PHASE {N} COMPLETION VERIFICATION: {PHASE_NAME}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ COMPLETION CHECKLIST (from documentation line {line_ref}):

{display_exact_checklist_from_documentation}
□ {checklist_item_1}
□ {checklist_item_2}
□ {checklist_item_3}
...

📂 FILES CREATED/MODIFIED:
   ✓ {filename} ({size}) - {verification}
   ✓ {filename} ({size}) - {verification}
   ...

📊 RESULTS SUMMARY:
   {key_metrics_or_findings}

⚙️ WORKFLOW STATE UPDATED:
   ✓ phase_{N}_complete = true
   ✓ {other_state_changes}

🔍 VERIFICATION COMMANDS (you can run):
   $ ls -lh {directory}
   $ head -5 {filename}
   $ grep "{pattern}" {filename}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
   VPAT generation steps in this skill (a11y-vpat-report/SKILL.md)
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

## ⚠️ COMPREHENSIVE SCANNING ENFORCEMENT (CRITICAL) ⚠️

**NEVER present filtered or incomplete scan results. This is a CRITICAL FAILURE.**

### 5-Layer Enforcement Mechanism (Options 1+2+3+5):

**Layer 1: Dynamic Tool Extraction (Phase 2, Step e - Option 3):**
   - **Single Source of Truth:** Read `.claude/skills/a11y-vpat-report/agents/a11y-audit-guidelines.md`
   - Extract complete tool inventory from "MCP Tool Inventory (45 Tools)" section
   - Parse all scanning tools (excluding browser control tools)
   - Store as `scanning_tools_inventory` array (27-30 scanning tools: 27 always + 0-3 conditional)
   - **Benefit:** No hardcoded duplication, guidelines doc is authoritative source
   - **Implementation:** Read lines 71-135 of guidelines, extract tool names, identify conditional tools

**Layer 2: TodoWrite Per-Tool Tracking (Phase 2, Step e - Option 2):**
   - Create individual TodoWrite item for EACH tool in `scanning_tools_inventory`
   - Mark each todo "completed" immediately after tool executes
   - Provides continuous progress visibility to user
   - User can review `/tasks` command to see tool execution status
   - **Benefit:** Real-time tracking prevents tools from being forgotten
   - **Implementation:** 30-33 todo items (3 Phase-level + 27-30 per-tool)

**Layer 3: Tool Verification Report (Phase 2, Step g - Option 5):**
   - Generate `tool-verification-{timestamp}.txt` BEFORE JSON/MD reports
   - Lists EVERY tool from `scanning_tools_inventory` with TRUE/FALSE execution status
   - Shows missing tools with count and names
   - Provides complete audit trail of what was/wasn't executed
   - **Benefit:** Written evidence of comprehensive scanning or gaps
   - **Implementation:** File created in pages/{identifier}/ directory

**Layer 4: Mandatory User Confirmation (Phase 2, Step g - Option 1):**
   - Display verification summary to user
   - Show preview of tool statuses (first 10-15 tools)
   - Link to full tool-verification-{timestamp}.txt report
   - **WAIT for user input** - CANNOT proceed without confirmation
   - User options:
     - `confirmed` - All tools executed, proceed to reports
     - `fix` - Run missing tools, regenerate verification, retry
     - `review` - Check TodoWrite list or verification report
     - `skip` - Bypass verification (adds warning to reports)
   - **Benefit:** Human checkpoint prevents AI from bypassing enforcement
   - **Implementation:** Blocking user input required, no auto-proceed

**Layer 5: JSON Audit Trail (Phase 2, Step h):**
   - `tool_coverage_verification` section dynamically populated from `scanning_tools_inventory`
   - Lists tools_executed and tools_skipped with reasons
   - Includes execution_percentage, verification_status, verification_method
   - Tracks if verification was bypassed (verification_bypassed: true/false)
   - Required fields:
     - `all_findings_merged: true` (MANDATORY)
     - `no_filtering_applied: true` (MANDATORY)
     - `tools_executed: [...]` (actual tools from inventory)
     - `total_tools_expected: N` (from scanning_tools_inventory.length)
   - **Benefit:** Permanent record in report proves comprehensive scanning
   - **Implementation:** Populated from extracted inventory, not hardcoded

### How Layers Work Together:

1. **Layer 1** extracts authoritative tool list → single source of truth
2. **Layer 2** creates visible tracking → user can monitor progress
3. **Layer 3** generates audit report → written evidence of execution
4. **Layer 4** requires user confirmation → human verification checkpoint
5. **Layer 5** embeds proof in final report → permanent audit trail

### Critical Requirements (from agents/a11y-audit-guidelines.md):
   - MUST run ALL 27 always-required tools from `scanning_tools_inventory` extracted in Layer 1
   - MUST run 0-3 conditional tools IF their conditions are met (tables, math content)
   - MUST merge ALL findings from every tool
   - NEVER filter, omit, or deprioritize results
   - Phase 1 requires ALL three core tools: run_wcag_21_aa_tests + analyze_accessibility + custom checks
   - De-duplicate identical issues but preserve ALL unique findings
   - **Total scanning requirement: 27-30 tools per page**

**WHY THIS MATTERS:**
Presenting incomplete results means users with disabilities are excluded. Each scanning tool catches different accessibility barriers. Skipping tools or filtering results creates a false sense of compliance while real barriers remain.

**FAILURE TO FOLLOW = INVALID AUDIT RESULTS**

**How This Prevents Bypass:**
- AI cannot skip tools without user seeing incomplete TodoWrite list (Layer 2)
- AI must generate verification report showing missing tools (Layer 3)
- AI CANNOT proceed without user typing 'confirmed' or 'skip' (Layer 4)
- Even if bypassed, reports contain verification_bypassed warning (Layer 5)
- Guidelines doc is single source, no hardcoded lists to get out of sync (Layer 1)

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
  working_directory: null,             // ABSOLUTE PATH: Derived from PAGES_DIRECTORY parameter
  identifier: null,                    // Auto-detected from parent directory name
  has_jira_ticket: false,              // true if JIRA_TICKET parameter provided
  report_directory: null,              // ABSOLUTE PATH: Parent of PAGES_DIRECTORY
  pages_directory: null,               // ABSOLUTE PATH: From PAGES_DIRECTORY parameter

  // Input configuration
  input_type: 'pages_directory',       // Always uses pages directory input
  pages_file_path: null,               // Not used in report workflow
  single_page_url: null,               // Not used in report workflow

  // Pages to scan
  pages: [],                           // Array of page objects
  total_pages: 0,
  current_page_index: 0,

  // Authentication
  authenticated: false,
  session_start: null,

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

## Workflow Phases

### PHASE 4: AGGREGATE - Consolidate Multi-Page Results (Validated Issues Only)

**Role:** Aggregate validated scan results (post-review) across all pages and map to WCAG conformance (version per --wcag flag)

**Note:** This phase only processes issues marked as VALID in Phase 3. Excluded issues (existing/false positives) are tracked separately in the audit trail but not included in VPAT calculations.

**Steps:**

1. **Load All Validated Scan Results**

   For each page result:
   - Read UPDATED JSON file from `page_result.json_path` (contains only validated issues after Phase 3 review)
   - Parse and validate structure
   - Verify `review_metadata.reviewed = true`
   - Add to processing list

   **Note:** These JSON files were updated in Phase 3 to contain only validated issues. Excluded issues are in `excluded_issues` field for audit purposes only.

2. **Calculate Comprehensive Statistics**

   ```javascript
   WORKFLOW_STATE.aggregated_results = {
     // Metadata
     evaluation_period: {
       start: earliest_audit_date_from_all_scans,
       end: latest_audit_date_from_all_scans
     },

     // Feature summary
     total_features: page_results.length,
     features_tested: page_results.map(p => p.page.identifier),

     // Overall issue counts
     total_issues: sum_all_issues_across_pages,
     features_with_violations: count_features_with_any_issues,

     by_severity: {
       critical: sum_critical_across_all_pages,
       high: sum_high_across_all_pages,
       moderate: sum_moderate_across_all_pages,
       low: sum_low_across_all_pages
     },

     // WCAG violations aggregated by guideline
     wcag_violations: {
       '1.1.1': {
         level: 'A',
         name: 'Non-text Content',
         issues: [combined_issues_from_all_pages],
         affected_features: [list_of_pages_with_this_issue],
         total_instances: count_across_all_pages
       },
       '1.3.1': {
         level: 'A',
         name: 'Info and Relationships',
         issues: [...],
         affected_features: [...],
         total_instances: count
       },
       // ... all violated guidelines
     },

     // Per-feature breakdown
     feature_breakdown: [
       {
         page_name: page_results[0].page.identifier,
         url: page_results[0].page.url,
         priority: page_results[0].page.priority,
         audit_date: page_results[0].scan_data.metadata.audit_date,
         total_issues: page_results[0].scan_data.summary.total_issues,
         by_severity: page_results[0].scan_data.summary.by_severity,
         conformance_status: page_results[0].scan_data.summary.conformance_status,
         wcag_criteria_failed: [list of failed criteria for this page]
       },
       // ... all pages
     ]
   }
   ```

3. **Map WCAG Conformance** (56 Level A & AA Criteria for WCAG 2.2; 50 for WCAG 2.1)

   Define all WCAG Level A & AA criteria:
   ```javascript
   const WCAG_CRITERIA = {
     // Principle 1: Perceivable (19 criteria)
     '1.1.1': { name: 'Non-text Content', level: 'A', principle: 'Perceivable' },
     '1.2.1': { name: 'Audio-only and Video-only (Prerecorded)', level: 'A', principle: 'Perceivable' },
     '1.2.2': { name: 'Captions (Prerecorded)', level: 'A', principle: 'Perceivable' },
     '1.2.3': { name: 'Audio Description or Media Alternative (Prerecorded)', level: 'A', principle: 'Perceivable' },
     '1.2.4': { name: 'Captions (Live)', level: 'AA', principle: 'Perceivable' },
     '1.2.5': { name: 'Audio Description (Prerecorded)', level: 'AA', principle: 'Perceivable' },
     '1.3.1': { name: 'Info and Relationships', level: 'A', principle: 'Perceivable' },
     '1.3.2': { name: 'Meaningful Sequence', level: 'A', principle: 'Perceivable' },
     '1.3.3': { name: 'Sensory Characteristics', level: 'A', principle: 'Perceivable' },
     '1.3.4': { name: 'Orientation', level: 'AA', principle: 'Perceivable' },
     '1.3.5': { name: 'Identify Input Purpose', level: 'AA', principle: 'Perceivable' },
     '1.4.1': { name: 'Use of Color', level: 'A', principle: 'Perceivable' },
     '1.4.2': { name: 'Audio Control', level: 'A', principle: 'Perceivable' },
     '1.4.3': { name: 'Contrast (Minimum)', level: 'AA', principle: 'Perceivable' },
     '1.4.4': { name: 'Resize Text', level: 'AA', principle: 'Perceivable' },
     '1.4.5': { name: 'Images of Text', level: 'AA', principle: 'Perceivable' },
     '1.4.10': { name: 'Reflow', level: 'AA', principle: 'Perceivable' },
     '1.4.11': { name: 'Non-text Contrast', level: 'AA', principle: 'Perceivable' },
     '1.4.12': { name: 'Text Spacing', level: 'AA', principle: 'Perceivable' },
     '1.4.13': { name: 'Content on Hover or Focus', level: 'AA', principle: 'Perceivable' },

     // Principle 2: Operable (17 criteria in WCAG 2.1; 21 in WCAG 2.2)
     '2.1.1': { name: 'Keyboard', level: 'A', principle: 'Operable' },
     '2.1.2': { name: 'No Keyboard Trap', level: 'A', principle: 'Operable' },
     '2.1.4': { name: 'Character Key Shortcuts', level: 'A', principle: 'Operable' },
     '2.2.1': { name: 'Timing Adjustable', level: 'A', principle: 'Operable' },
     '2.2.2': { name: 'Pause, Stop, Hide', level: 'A', principle: 'Operable' },
     '2.3.1': { name: 'Three Flashes or Below Threshold', level: 'A', principle: 'Operable' },
     '2.4.1': { name: 'Bypass Blocks', level: 'A', principle: 'Operable' },
     '2.4.2': { name: 'Page Titled', level: 'A', principle: 'Operable' },
     '2.4.3': { name: 'Focus Order', level: 'A', principle: 'Operable' },
     '2.4.4': { name: 'Link Purpose (In Context)', level: 'A', principle: 'Operable' },
     '2.4.5': { name: 'Multiple Ways', level: 'AA', principle: 'Operable' },
     '2.4.6': { name: 'Headings and Labels', level: 'AA', principle: 'Operable' },
     '2.4.7': { name: 'Focus Visible', level: 'AA', principle: 'Operable' },
     '2.4.11': { name: 'Focus Not Obscured (Minimum)', level: 'AA', principle: 'Operable', wcag_version: '2.2' },
     '2.4.13': { name: 'Focus Appearance', level: 'AA', principle: 'Operable', wcag_version: '2.2' },
     '2.5.1': { name: 'Pointer Gestures', level: 'A', principle: 'Operable' },
     '2.5.2': { name: 'Pointer Cancellation', level: 'A', principle: 'Operable' },
     '2.5.3': { name: 'Label in Name', level: 'A', principle: 'Operable' },
     '2.5.4': { name: 'Motion Actuation', level: 'A', principle: 'Operable' },
     '2.5.7': { name: 'Dragging Movements', level: 'AA', principle: 'Operable', wcag_version: '2.2' },
     '2.5.8': { name: 'Target Size (Minimum)', level: 'AA', principle: 'Operable', wcag_version: '2.2' },

     // Principle 3: Understandable (10 criteria in WCAG 2.1; 13 in WCAG 2.2)
     '3.1.1': { name: 'Language of Page', level: 'A', principle: 'Understandable' },
     '3.1.2': { name: 'Language of Parts', level: 'AA', principle: 'Understandable' },
     '3.2.1': { name: 'On Focus', level: 'A', principle: 'Understandable' },
     '3.2.2': { name: 'On Input', level: 'A', principle: 'Understandable' },
     '3.2.3': { name: 'Consistent Navigation', level: 'AA', principle: 'Understandable' },
     '3.2.4': { name: 'Consistent Identification', level: 'AA', principle: 'Understandable' },
     '3.2.6': { name: 'Consistent Help', level: 'A', principle: 'Understandable', wcag_version: '2.2' },
     '3.3.1': { name: 'Error Identification', level: 'A', principle: 'Understandable' },
     '3.3.2': { name: 'Labels or Instructions', level: 'A', principle: 'Understandable' },
     '3.3.3': { name: 'Error Suggestion', level: 'AA', principle: 'Understandable' },
     '3.3.4': { name: 'Error Prevention (Legal, Financial, Data)', level: 'AA', principle: 'Understandable' },
     '3.3.7': { name: 'Redundant Entry', level: 'A', principle: 'Understandable', wcag_version: '2.2' },
     '3.3.8': { name: 'Accessible Authentication (Minimum)', level: 'AA', principle: 'Understandable', wcag_version: '2.2' },

     // Principle 4: Robust (2 criteria in WCAG 2.2; 3 in WCAG 2.1)
     '4.1.1': { name: 'Parsing', level: 'A', principle: 'Robust', deprecated_in: '2.2' },
     '4.1.2': { name: 'Name, Role, Value', level: 'A', principle: 'Robust' },
     '4.1.3': { name: 'Status Messages', level: 'AA', principle: 'Robust' }
   }
   // WCAG 2.2 total: 56 criteria (Level A and AA)
   // WCAG 2.1 total: 50 criteria (filter out wcag_version: '2.2' entries)
   // When --wcag 2.2: skip criteria with deprecated_in: '2.2' (mark as N/A)
   // When --wcag 2.1: skip criteria with wcag_version: '2.2'
   ```

4. **Determine Conformance Status for Each Criterion**

   For each WCAG criterion:

   ```javascript
   function determineConformanceStatus(criterion, aggregated_results) {
     const issues = aggregated_results.wcag_violations[criterion]

     // Check if N/A first (for audio/video criteria)
     if (['1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5', '1.4.2', '2.3.1'].includes(criterion)) {
       const hasMedia = /* check if any page has audio/video */
       if (!hasMedia) {
         return {
           status: 'Not Applicable',
           icon: '⚪',
           affected_features: [],
           remarks: 'Product does not contain audio or video content in tested features.'
         }
       }
     }

     // No issues = Supports
     if (!issues || issues.total_instances === 0) {
       return {
         status: 'Supports',
         icon: '🟢',
         affected_features: [],
         remarks: 'No issues detected. Criterion is met across all tested features.'
       }
     }

     // Minor issues = Partially Supports
     const affectedCount = issues.affected_features.length
     const totalFeatures = aggregated_results.total_features

     if (affectedCount === 1 && issues.total_instances <= 2) {
       return {
         status: 'Partially Supports',
         icon: '🟡',
         affected_features: issues.affected_features,
         remarks: `Minor issues found in ${issues.affected_features[0]}. ${issues.total_instances} instance(s). Workarounds available.`
       }
     }

     if ((affectedCount / totalFeatures) <= 0.3 && issues.total_instances <= 5) {
       return {
         status: 'Partially Supports',
         icon: '🟡',
         affected_features: issues.affected_features,
         remarks: `Issues found in ${affectedCount}/${totalFeatures} features: ${issues.affected_features.join(', ')}. ${issues.total_instances} total instances.`
       }
     }

     // Significant issues = Does Not Support
     return {
       status: 'Does Not Support',
       icon: '🔴',
       affected_features: issues.affected_features,
       remarks: `Multiple issues across ${affectedCount}/${totalFeatures} features: ${issues.affected_features.join(', ')}. ${issues.total_instances} total instances. Remediation required.`
     }
   }
   ```

5. **Build Complete Conformance Table**

   ```javascript
   const wcag_version = WORKFLOW_STATE.wcag_version || '2.2'  // Default to WCAG 2.2

   WORKFLOW_STATE.wcag_conformance = {
     conformance_table: [],
     summary: {
       total_criteria: wcag_version === '2.2' ? 56 : 50,
       supports: 0,
       partially_supports: 0,
       does_not_support: 0,
       not_applicable: 0
     }
   }

   for (const [criterion, details] of Object.entries(WCAG_CRITERIA)) {
     // Skip WCAG 2.2-only criteria when in 2.1 mode
     if (wcag_version === '2.1' && details.wcag_version === '2.2') continue

     // Handle deprecated criteria in WCAG 2.2 mode
     if (wcag_version === '2.2' && details.deprecated_in === '2.2') {
       WORKFLOW_STATE.wcag_conformance.conformance_table.push({
         criterion, name: details.name, level: details.level, principle: details.principle,
         status: 'Not Applicable', icon: '⚪',
         affected_features: [],
         remarks: 'Deprecated in WCAG 2.2 — always satisfied per HTML5 parsing rules.'
       })
       WORKFLOW_STATE.wcag_conformance.summary.not_applicable++
       continue
     }

     const conformance = determineConformanceStatus(criterion, aggregated_results)

     WORKFLOW_STATE.wcag_conformance.conformance_table.push({
       criterion: criterion,
       name: details.name,
       level: details.level,
       principle: details.principle,
       status: conformance.status,
       icon: conformance.icon,
       affected_features: conformance.affected_features,
       remarks: conformance.remarks
     })

     // Update summary
     const statusKey = conformance.status.toLowerCase().replace(' ', '_')
     WORKFLOW_STATE.wcag_conformance.summary[statusKey]++
   }
   ```

6. **Calculate Overall Conformance**

   ```javascript
   const summary = WORKFLOW_STATE.wcag_conformance.summary
   const totalApplicable = summary.total_criteria - summary.not_applicable
   const conforming = summary.supports + summary.partially_supports
   const conformanceRate = (conforming / totalApplicable) * 100

   let overallStatus
   if (summary.does_not_support === 0 && summary.partially_supports === 0) {
     overallStatus = 'Supports'
   } else if (summary.does_not_support === 0) {
     overallStatus = 'Partially Supports'
   } else {
     overallStatus = 'Does Not Support'
   }

   WORKFLOW_STATE.wcag_conformance.overall = {
     status: overallStatus,
     conformance_rate: conformanceRate.toFixed(1) + '%',
     level: `WCAG ${wcag_version} Level AA`
   }
   ```

7. **Display Aggregation Summary**

   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AGGREGATION & WCAG MAPPING COMPLETE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📊 OVERALL RESULTS

   Features Analyzed: {total_features}
   Evaluation Period: {start_date} to {end_date}

   Total Issues: {total_issues}
   - 🔴 Critical (WCAG A): {critical}
   - 🟠 High (WCAG AA): {high}
   - 🟡 Moderate: {moderate}
   - 🔵 Low: {low}

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   WCAG {wcag_version} LEVEL AA CONFORMANCE

   Overall Status: {overall.status}
   Conformance Rate: {conformance_rate}

   Breakdown of 50 Criteria:
   🟢 Supports: {supports} criteria
   🟡 Partially Supports: {partially_supports} criteria
   🔴 Does Not Support: {does_not_support} criteria
   ⚪ Not Applicable: {not_applicable} criteria

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PER-FEATURE BREAKDOWN

   {for each feature in feature_breakdown}
   {N}. {page_name} ({priority})
      Issues: {total_issues} ({conformance_status})
      - Critical: {critical}, High: {high}, Moderate: {moderate}, Low: {low}
      Failed Criteria: {wcag_criteria_failed.length}
   {endfor}

   Ready to generate professional VPAT 2.5 report.
   ```

8. **Phase 3 Verification** (MANDATORY)

   **DISPLAY THIS CHECKLIST:**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PHASE 3 COMPLETION VERIFICATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   □ All {total_features} page results loaded
   □ Comprehensive statistics calculated
   □ WCAG violations aggregated by guideline
   □ All {wcag_version === '2.2' ? 56 : 50} WCAG {wcag_version} Level A & AA criteria evaluated
   □ Conformance status determined for each criterion
   □ N/A criteria identified (audio/video if not present)
   □ Overall conformance level calculated
   □ Per-feature breakdown created
   □ User reviewed aggregation summary

   Status: [COMPLETE / INCOMPLETE]
   Blockers: [List any incomplete items]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

   **REQUIRE EXPLICIT 'PROCEED':**
   ```
   Type 'proceed' to continue to Phase 5 (VPAT Generation), or 'stop' to pause.
   ```

   **WAIT** - Do NOT continue until user types 'proceed'

   Mark `WORKFLOW_STATE.phase_4_complete = true` ONLY AFTER 'proceed'

---

### PHASE 5: VPAT - Generate Professional VPAT 2.5 Report (MD + HTML + PDF)

**Role:** Collect product information and generate customer-facing VPAT 2.5 report in 3 formats

**Steps:**

1. **Collect Product & Vendor Information**

   **Product Information:**
   ```
   📋 VPAT REPORT - PRODUCT INFORMATION

   This report will be generated for external stakeholders.

   Product Name: _____
   (e.g., "MyApp Student Advising Platform")

   Product Version: _____
   (e.g., "5.2.1" or "2024 Spring Release")

   Product Description (1-2 sentences): _____
   (e.g., "Web-based student advising platform for higher education")

   Product Website (optional): _____
   (e.g., "https://www.example.com/app")
   ```

   Store in `WORKFLOW_STATE.product.*`

   **Vendor Information:**
   ```
   VENDOR/COMPANY INFORMATION

   Company Name: _____
   (e.g., "Example Corp, Inc.")

   Contact Name: _____
   (e.g., "John Smith, Accessibility Manager")

   Contact Email: _____
   (e.g., "accessibility@example.com")

   Contact Phone (optional): _____
   (e.g., "+1 (555) 123-4567")

   Company Website: _____
   (e.g., "https://www.example.com")

   Company Address (optional): _____
   (e.g., "123 Main St, Austin, TX 78701")
   ```

   Store in `WORKFLOW_STATE.vendor.*`

   **Evaluation Information:**
   ```
   EVALUATION INFORMATION

   Evaluator Name/Organization: _____
   (e.g., "Internal QA Team" or "ABC Accessibility Consultants")

   Report Version: 1.0
   Report Date: {today's date - auto-generated}
   ```

   Store in `WORKFLOW_STATE.evaluation.*`
   Store: `evaluation.date_range = aggregated_results.evaluation_period`

   **Testing Scope:**
   ```
   TESTING SCOPE

   Testing Environment:
   - Operating System(s): _____
     (e.g., "Windows 11, macOS Sonoma 14")

   - Browser(s) and Version(s): _____
     (e.g., "Chrome 120, Firefox 121, Safari 17")

   - Screen Reader(s) (if tested): _____
     (e.g., "NVDA 2024.1, JAWS 2024, VoiceOver" or "None")

   Evaluation Methods Used:
   ☑ Automated Testing (45 specialized tools) - YES (always)
   ☑ Manual Testing (keyboard, interactions) - YES (always)
   ☐ Screen Reader Testing - Was this performed? (yes/no): _____
   ☐ User Testing with Disabilities - Was this performed? (yes/no): _____
   ```

   Store in `WORKFLOW_STATE.testing_scope.*`

   **Confirm Information:**
   Display summary, ask: "Is this correct? (yes/no/edit)"
   - If edit: Allow field changes, re-display
   - If no: Restart collection
   - If yes: Continue

2. **Generate Markdown Report**

   Create comprehensive VPAT 2.5 Markdown file following official ITI VPAT 2.5 template structure:

   Path: `{report_directory}/VPAT-2.5-Report-{product.name}-{timestamp}.md`

   **EXACT REPORT STRUCTURE (Official VPAT 2.5 Format):**

   ```markdown
   # Voluntary Product Accessibility Template® (VPAT®)

   ## VPAT® Version 2.5

   **Document Date:** {evaluation.report_date}

   **Standard:** Web Content Accessibility Guidelines (WCAG) 2.1 and Section 508

   **Scope:** {list all tested features separated by commas}

   ---

   ## Product Information

   | Category | Details |
   |----------|---------|
   | **Product Name** | {product.name} |
   | **Product Version** | {product.version} |
   | **Product Description** | {product.description} |
   | **Test Environment** | {testing_scope.environment}<br>URL: {primary_url_tested} |
   | **Vendor Name** | {vendor.company} |
   | **Vendor Website** | {vendor.website} |

   ---

   ## Evaluation Methods

   **Evaluation Date:** {evaluation_period.start} to {evaluation_period.end}

   **Testing Methodology:** {testing_scope.methodology}

   **Standards Applied:** WCAG {wcag_version} Level A & AA, Section 508, EN 301 549

   **Testing Tools:**
   - {list all 45 MCP tools used}
   - {list any manual testing tools}
   - {list screen readers if tested}

   **Test Coverage:**
   - {list what was tested - pages, workflows, etc.}
   - {list testing approaches - automated, manual, keyboard, screen reader}

   ---

   ## Executive Summary

   ### Conformance Summary

   **{supports}** Supports | **{partially_supports}** Partially Supports | **{does_not_support}** Does Not Support | **{total_criteria}** Total Criteria

   **Overall Assessment:** {provide 2-3 sentence summary of conformance status}

   **Critical Issues Identified:**
   - {list top 5-10 most critical issues with WCAG criterion}

   **Recommendation:** {1-2 sentences on required remediation}

   ### Conformance Level Definitions

   **Supports:** The functionality of the product has at least one method that meets the criterion without known defects or meets with equivalent facilitation.

   **Partially Supports:** Some functionality of the product does not meet the criterion.

   **Does Not Support:** The majority of product functionality does not meet the criterion.

   **Not Applicable:** The criterion is not relevant to the product.

   ---

   ## WCAG {wcag_version} Level A Conformance

   The following table documents conformance with WCAG {wcag_version} Level A success criteria.

   | Criteria | Conformance Level | Remarks and Explanations |
   |----------|------------------|--------------------------|
   {for each Level A criterion}
   | **{criterion_number}**<br>{criterion_name} | {Supports/Partially Supports/Does Not Support/Not Applicable} | {detailed remarks with issue counts if failing} |
   {endfor}

   ---

   ## WCAG {wcag_version} Level AA Conformance

   The following table documents conformance with WCAG {wcag_version} Level AA success criteria (in addition to Level A).

   | Criteria | Conformance Level | Remarks and Explanations |
   |----------|------------------|--------------------------|
   {for each Level AA criterion}
   | **{criterion_number}**<br>{criterion_name} | {status} | {if Partially Supports or Does Not Support, include:<br><br>**Issues Found:**<br><br>**[SERIOUS/MODERATE/MINOR]** {issue title} ({instance_count} instances)<br><br>{detailed issue description with specific examples}<br><br>}<br>{if Supports: "No violations detected in testing."} |
   {endfor}

   ---

   ## Section 508 Conformance

   This section documents conformance with Revised Section 508 standards, which are harmonized with WCAG 2.0 Level A and AA.

   **Section 508 Status:** {Fully Conforms/Partially Conforms/Does Not Conform}

   **Explanation:** {explain Section 508 conformance based on WCAG evaluation}

   **Key Section 508 Requirements:**
   - **§1194.22(a) - Text Equivalents:** {Supports/Partially Supports/Does Not Support} - {explanation}
   - **§1194.22(i) - Frames:** {Not Applicable/Supports} - {explanation}
   - **§1194.22(l) - Scripts:** {Supports/Partially Supports} - {explanation}
   - **§1194.22(n) - Forms:** {Supports/Partially Supports/Does Not Support} - {explanation}

   ---

   ## EN 301 549 Conformance

   EN 301 549 is the European standard for digital accessibility, harmonized with WCAG.

   **EN 301 549 Status:** {Fully Conforms/Partially Conforms/Does Not Conform}

   **Explanation:** As EN 301 549 incorporates WCAG Level A and AA criteria, the conformance level matches the WCAG {wcag_version} assessment documented above.

   ---

   ## Legal Disclaimer

   This Voluntary Product Accessibility Template (VPAT) is provided for informational purposes only. It documents the accessibility conformance of {product.name} based on automated testing and {manual/limited manual} verification conducted {evaluation_period}.

   **Limitations:**
   - {list testing limitations - e.g., automated testing only, no comprehensive screen reader testing, etc.}
   - {list workflows not tested}
   - {list environments tested vs not tested}

   **Recommendations for Complete Evaluation:**
   1. Conduct comprehensive manual testing with assistive technologies
   2. Perform user testing with individuals who have disabilities
   3. Evaluate all user workflows including {list untested workflows}
   4. Test across multiple browsers and assistive technology combinations
   5. Re-evaluate after remediation of identified issues

   ---

   ## Remediation Priorities

   ### 🔴 Critical Priority (Must Fix)

   {for each critical issue}
   {N}. **{issue title} (WCAG {criterion})**
      - **Issue:** {description}
      - **Impact:** {user impact}
      - **Recommendation:** {fix recommendation}
      - **Estimated Effort:** {Low/Medium/High}
   {endfor}

   ### 🟠 High Priority (Should Fix)

   {for each high priority issue}
   {N}. **{issue title} (WCAG {criterion})**
      - **Issue:** {description}
      - **Impact:** {user impact}
      - **Recommendation:** {fix recommendation}
      - **Estimated Effort:** {Low/Medium/High}
   {endfor}

   ### 🟡 Medium Priority (Recommended)

   {for each medium priority issue}
   {N}. **{issue title} (WCAG {criterion})**
      - **Issue:** {description}
      - **Impact:** {user impact}
      - **Recommendation:** {fix recommendation}
      - **Estimated Effort:** {Low/Medium/High}
   {endfor}

   ---

   ## Testing Evidence

   **Test Artifacts:**
   - Raw test data: {path to JSON results}
   - Detailed findings: {path to detailed reports}
   - Test suite: {path to test scripts if applicable}
   - Screenshots: {location of screenshots}

   **Test Execution Details:**
   - Total Tests: {count}
   - Tests Passed: {count}
   - Tests Failed: {count}
   - Total Duration: {duration}
   - Browser: {browser and version}

   ---

   **Report Generated:** {evaluation.report_date}

   **VPAT® Version:** 2.5

   **Generated by:** {evaluation.evaluator_name}

   **Contact:** {vendor.contact_email}

   ---

   *VPAT® is a registered trademark of the Information Technology Industry Council (ITI).*
   *This report follows the VPAT 2.5 template structure and guidelines.*
   ```

   **IMPORTANT FORMATTING NOTES:**
   - Use Markdown tables with proper alignment
   - For "Partially Supports" or "Does Not Support" in WCAG tables, include detailed issue descriptions with severity badges
   - Priority sections must use emoji indicators: 🔴 Critical, 🟠 High, 🟡 Medium
   - All WCAG criterion references must include both number and full name
   - Testing Evidence section must link to actual file paths

   Store path: `WORKFLOW_STATE.vpat_reports.markdown_path`

3. **Create Professional CSS Files**

   Create TWO CSS files - one for HTML and one for PDF:

   **HTML CSS:** `{report_directory}/vpat-styles.css`

   ```javascript
   const vpatCSS = `
/* Professional VPAT 2.5 Styling - HTML Version */

/* Hide pandoc-generated title block to prevent duplicate titles */
#title-block-header {
  display: none;
}

@page {
  size: Letter;
  margin: 0.75in;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #000000;
  background: #ffffff;
  margin: 0;
  padding: 40px;
  max-width: 8.5in;
  margin: 0 auto;
}

/* Headings - Blue theme matching sample */
h1 {
  color: #0066cc;
  font-size: 28pt;
  font-weight: 700;
  margin: 0 0 10px 0;
  padding: 0;
  border-bottom: 4px solid #0066cc;
  padding-bottom: 12px;
}

h2 {
  color: #0066cc;
  font-size: 18pt;
  font-weight: 600;
  margin: 40px 0 15px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #0066cc;
}

h3 {
  color: #333333;
  font-size: 14pt;
  font-weight: 600;
  margin: 25px 0 12px 0;
}

/* Tables - matching sample's Product Information and WCAG tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  font-size: 10pt;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

thead th {
  background-color: #0066cc;
  color: #ffffff;
  font-weight: 600;
  padding: 12px 10px;
  text-align: left;
  border: 1px solid #0055aa;
}

tbody td {
  padding: 10px;
  border: 1px solid #cccccc;
  vertical-align: top;
}

tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}

tbody tr:hover {
  background-color: #f0f7ff;
}

/* Conformance Level column styling (2nd column in WCAG tables) */
table tbody tr td:nth-child(2) {
  font-weight: 600;
  text-align: center;
  min-width: 150px;
}

/* Strong tags in tables */
strong {
  font-weight: 600;
}

/* Lists */
ul, ol {
  margin: 12px 0;
  padding-left: 30px;
}

li {
  margin: 6px 0;
  line-height: 1.6;
}

/* Horizontal rules */
hr {
  border: none;
  border-top: 2px solid #0066cc;
  margin: 30px 0;
}

/* Emphasis */
em {
  font-style: italic;
}

/* Code blocks */
code {
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 10pt;
}

/* Print optimizations */
@media print {
  body {
    padding: 0;
    max-width: 100%;
  }

  h1, h2, h3 {
    page-break-after: avoid;
  }

  table {
    page-break-inside: avoid;
  }

  tr {
    page-break-inside: avoid;
  }
}
`;

   fs.writeFileSync(css_path, vpatCSS, 'utf8');
   ```

   Store path: `WORKFLOW_STATE.vpat_reports.css_path`

   **PDF CSS:** `{report_directory}/vpat-styles-pdf.css`

   ```javascript
   const vpatPDFCSS = `
/* Professional VPAT 2.5 Styling - PDF Version (WeasyPrint Optimized) */

/* Hide pandoc-generated title block to prevent duplicate titles */
#title-block-header {
  display: none;
}

/* CRITICAL: Hide the "Voluntary Product Accessibility Template" heading in PDF only */
h1#voluntary-product-accessibility-template-vpat {
  display: none;
}

@page {
  size: Letter;
  margin: 0.75in;
  @bottom-center {
    content: "Page " counter(page) " of " counter(pages);
    font-size: 9pt;
    color: #666;
  }
}

body {
  font-family: 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #000000;
  background: #ffffff;
  margin: 0;
  padding: 0;
}

/* Headings - Blue theme matching sample */
h1 {
  color: #0066cc;
  font-size: 24pt;
  font-weight: 700;
  margin: 0 0 10px 0;
  padding: 0;
  border-bottom: 4px solid #0066cc;
  padding-bottom: 12px;
  page-break-after: avoid;
}

h2 {
  color: #0066cc;
  font-size: 18pt;
  font-weight: 600;
  margin: 1em 0 0.5em 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #0066cc;
  page-break-after: avoid;
}

h3 {
  color: #333333;
  font-size: 14pt;
  font-weight: 600;
  margin: 0.8em 0 0.4em 0;
  page-break-after: avoid;
}

/* Tables - matching sample's Product Information and WCAG tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 10pt;
  page-break-inside: avoid;
}

thead {
  background-color: #0066cc;
  color: #ffffff;
  display: table-header-group;
}

thead th {
  background-color: #0066cc;
  color: #ffffff;
  font-weight: 600;
  padding: 12px 10px;
  text-align: left;
  border: 1px solid #0055aa;
}

tbody td {
  padding: 10px;
  border: 1px solid #cccccc;
  vertical-align: top;
}

tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}

/* Conformance Level column styling (2nd column in WCAG tables) */
table tbody tr td:nth-child(2) {
  font-weight: 600;
  text-align: center;
  min-width: 150px;
}

/* Strong tags in tables */
strong {
  font-weight: 600;
}

/* Lists */
ul, ol {
  margin: 12px 0;
  padding-left: 30px;
}

li {
  margin: 6px 0;
  line-height: 1.6;
}

/* Horizontal rules */
hr {
  border: none;
  border-top: 2px solid #0066cc;
  margin: 30px 0;
}

/* Code blocks */
code {
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 10pt;
}

pre {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  border-left: 4px solid #0066cc;
  page-break-inside: avoid;
}

/* Links - show URLs in PDF */
a[href^="http"]::after {
  content: " (" attr(href) ")";
  font-size: 8pt;
  color: #666;
}
`;

   const pdfCssPath = path.join(report_directory, 'vpat-styles-pdf.css');
   fs.writeFileSync(pdfCssPath, vpatPDFCSS, 'utf8');
   ```

   Store path: `WORKFLOW_STATE.vpat_reports.pdf_css_path`

   **Key Differences Between HTML and PDF CSS:**
   - **PDF hides the "Voluntary Product Accessibility Template®" H1 heading** (not needed in final PDF)
   - **PDF includes @page footer** with page numbers (no page header to keep PDF clean)
   - **PDF optimized for WeasyPrint** (no unsupported CSS properties)
   - **PDF shows full URLs** in print via `::after` pseudo-element
   - **PDF has reduced margins** for more compact layout matching HTML
   - **HTML keeps all headings** for web viewing

4. **Generate HTML Report**

   Convert Markdown to HTML using pandoc with the custom CSS:

   Path: `{report_directory}/VPAT-2.5-Report-{product.name}-{timestamp}.html`

   ```bash
   pandoc "${markdown_path}" \
     -o "${html_path}" \
     --standalone \
     --css="${css_path}" \
     --metadata title="Accessibility Conformance Report"
   ```

   **Key Pandoc Options:**
   - `--standalone`: Creates complete HTML document with head/body
   - `--css`: Links to external CSS file
   - `--metadata title`: Sets HTML `<title>` tag (must match first H1 in markdown)

   **IMPORTANT:**
   - The `--metadata title` is REQUIRED to set the HTML title tag correctly (otherwise it uses filename)
   - The CSS file hides the pandoc-generated title block (`#title-block-header`) to prevent duplicate titles
   - The title in metadata should match the first H1 heading in the markdown
   - Do NOT use `--table-of-contents` - no TOC is needed in VPAT reports

   Store path: `WORKFLOW_STATE.vpat_reports.html_path`

5. **Generate PDF Report**

   **Primary Method: Pandoc with WeasyPrint**

   Check if pandoc available:
   ```bash
   which pandoc
   ```

   If available, generate PDF from Markdown using PDF-specific CSS:
   ```bash
   # BEST METHOD: Convert Markdown to PDF using WeasyPrint engine with PDF CSS
   pandoc "${markdown_path}" \
     -f markdown \
     -o "${pdf_path}" \
     --pdf-engine=weasyprint \
     --css="${pdf_css_path}" \
     --metadata title="Accessibility Conformance Report"
   ```

   **CRITICAL:** Use the PDF-specific CSS (`vpat-styles-pdf.css`), NOT the HTML CSS. The PDF CSS:
   - Hides the "Voluntary Product Accessibility Template®" H1 heading
   - Adds page footers with page numbers (no page headers to keep PDF clean)
   - Optimized for WeasyPrint (no unsupported CSS properties)
   - Shows full URLs for links in print
   - Reduced margins for more compact layout matching HTML

   **Important:** WeasyPrint is STRONGLY PREFERRED because it:
   - Fully supports CSS3 (colored table cells, borders, etc.)
   - Handles @page rules for proper margins
   - Renders professional-quality PDFs matching the sample

   Alternative if weasyprint not available:
   ```bash
   # Fallback: Use wkhtmltopdf engine (limited CSS support)
   pandoc "${markdown_path}" \
     -f markdown \
     -o "${pdf_path}" \
     --pdf-engine=wkhtmltopdf \
     --css="${pdf_css_path}" \
     --metadata title="Accessibility Conformance Report"
   ```

   **Note:** wkhtmltopdf has limited CSS3 support - colored table cells and @page rules may not render correctly.

   Store: `WORKFLOW_STATE.vpat_reports.pdf_method = 'pandoc-weasyprint'`

   **Fallback Method: Playwright Browser PDF (High Quality)**

   If pandoc not available or fails:
   ```javascript
   // Open HTML in Playwright browser
   const browser = await mcp__mcp-accessibility__open_browser({ headless: true })
   await mcp__mcp-accessibility__navigate(`file://${html_path}`)
   await mcp__mcp-accessibility__wait({ timeout: 3000 })  // Allow full rendering

   // Generate high-quality PDF matching sample format
   await page.pdf({
     path: pdf_path,
     format: 'Letter',  // US Letter size to match sample
     printBackground: true,  // CRITICAL - includes colored table cells and boxes
     displayHeaderFooter: true,
     headerTemplate: '<div style="font-size:9pt; text-align:center; width:100%; color:#666;"></div>',
     footerTemplate: `
       <div style="font-size:9pt; text-align:center; width:100%; color:#666; margin-top:10px;">
         Page <span class="pageNumber"></span> of <span class="totalPages"></span>
       </div>
     `,
     margin: {
       top: '0.75in',
       right: '0.75in',
       bottom: '0.75in',
       left: '0.75in'
     },
     preferCSSPageSize: false,
     scale: 1.0
   })

   await mcp__mcp-accessibility__close_browser()
   ```

   Store: `WORKFLOW_STATE.vpat_reports.pdf_method = 'playwright'`

   **IMPORTANT PDF GENERATION NOTES:**
   - **Pandoc methods use Markdown + PDF CSS** - generates PDF with hidden VPAT heading and page numbers in footer only
   - **Playwright method uses HTML** - for fallback when pandoc unavailable
   - **printBackground: true is REQUIRED** (Playwright only) - without this, colored table cells won't appear
   - Letter format (8.5" x 11") matches official VPAT template
   - 0.75" margins with @page footer for page numbers (no page header to keep PDF clean)
   - **PDF-specific CSS hides "Voluntary Product Accessibility Template®" H1 heading** - cleaner final PDF
   - **PDF has reduced heading/table margins** for more compact layout matching HTML
   - **Default title is "Accessibility Conformance Report"** for all reports
   - WeasyPrint engine is STRONGLY PREFERRED for full CSS3 support (colored table cells, proper page breaks, page numbers)

   **Error Handling:**
   If both methods fail:
   ```
   ⚠️ PDF GENERATION FAILED

   Could not generate PDF using pandoc or Playwright.

   Available reports:
   ✓ Markdown: {markdown_path}
   ✓ HTML: {html_path}

   MANUAL PDF GENERATION INSTRUCTIONS:
   1. Open HTML file in Chrome/Edge browser: {html_path}
   2. Press Ctrl+P (Windows) or Cmd+P (Mac) to print
   3. Select "Save as PDF" as destination
   4. In print settings, ensure:
      - Paper size: Letter
      - Margins: Default (0.75in)
      - Background graphics: ENABLED (CRITICAL for colored cells)
      - Scale: 100%
   5. Save as: VPAT-2.5-Report-{product.name}-{timestamp}.pdf

   The HTML report contains all required formatting and will produce a
   professional PDF matching the official VPAT 2.5 template.

   Continue without PDF? (yes/no)
   ```

   If yes: Continue (PDF optional)
   If no: Abort workflow

   Store path: `WORKFLOW_STATE.vpat_reports.pdf_path`

6. **Display Report Summary**

   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ VPAT 2.5 REPORT GENERATED
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Product: {product.name} v{product.version}
   Report Date: {evaluation.report_date}

   Overall Conformance: {wcag_conformance.overall.status} WCAG {wcag_version} Level AA
   Conformance Rate: {wcag_conformance.overall.conformance_rate}

   📊 WCAG {wcag_version} CONFORMANCE SUMMARY ({wcag_version === '2.2' ? 56 : 50} criteria)
   🟢 Supports: {supports} criteria
   🟡 Partially Supports: {partially_supports} criteria
   🔴 Does Not Support: {does_not_support} criteria
   ⚪ Not Applicable: {not_applicable} criteria

   📄 REPORTS GENERATED

   ✓ Markdown Report:
     {markdown_path}

   ✓ CSS Stylesheet:
     {css_path}

   ✓ HTML Report:
     {html_path}

   {if pdf_path}
   ✓ PDF Report:
     {pdf_path}
     (Generated using: {pdf_method})
   {else}
   ⚠ PDF Report: Generation failed (use HTML for manual conversion)
   {endif}

   📁 ALL SCAN DATA

   Per-Page Reports ({total_pages} pages):
   {for each page in page_results}
   • {page.page.identifier}:
     - Scan (JSON): {page.json_path}
     - Scan (MD): {page.md_path}
   {endfor}

   Complete audit location: {report_directory}
   ```

6. **JIRA Update** (if ticket provided)

   **CONDITIONAL:** Only if `has_jira_ticket === true`

   Add comprehensive VPAT summary to JIRA:
   ```
   📄 VPAT 2.5 COMPLIANCE REPORT COMPLETE

   Professional VPAT 2.5 report generated for {product.name} v{product.version}.

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OVERALL CONFORMANCE

   Status: {wcag_conformance.overall.status} WCAG {wcag_version} Level AA
   Conformance Rate: {wcag_conformance.overall.conformance_rate}

   WCAG {wcag_version} Breakdown ({wcag_version === '2.2' ? 56 : 50} criteria):
   • 🟢 Supports: {supports} criteria
   • 🟡 Partially Supports: {partially_supports} criteria
   • 🔴 Does Not Support: {does_not_support} criteria
   • ⚪ Not Applicable: {not_applicable} criteria

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FEATURES TESTED

   Total Features: {total_features}
   Evaluation Period: {date_range.start} to {date_range.end}

   Per-Feature Results:
   {for each feature in feature_breakdown}
   • {page_name}: {total_issues} issues ({conformance_status})
   {endfor}

   Total Issues: {total_issues}
   • Critical (WCAG A): {critical}
   • High (WCAG AA): {high}
   • Moderate: {moderate}
   • Low: {low}

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   REPORT FORMATS

   All reports available at: {report_directory}

   • Markdown: VPAT-2.5-Report-{product}-{timestamp}.md
   • HTML: VPAT-2.5-Report-{product}-{timestamp}.html
   • PDF: VPAT-2.5-Report-{product}-{timestamp}.pdf ✓

   Report includes:
   ✓ Executive summary for stakeholders
   ✓ Complete {wcag_version === '2.2' ? 56 : 50}-criteria WCAG {wcag_version} conformance table
   ✓ Feature-by-feature breakdown
   ✓ Issue details by severity
   ✓ Remediation plan with timelines
   ✓ Legal compliance statements (ADA, Section 508, EN 301 549)
   ✓ 6 comprehensive appendices

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   NEXT STEPS

   1. Review VPAT report for accuracy
   2. Share with stakeholders/customers as needed
   3. Address "Does Not Support" criteria ({does_not_support} items)
   4. Schedule remediation work per timeline in Appendix C

   Report is ready for external distribution.
   ```

   Track: `jira_updates.push({type: 'vpat_complete', timestamp})`

7. **Phase 5 Verification** (MANDATORY)

   **DISPLAY THIS CHECKLIST:**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PHASE 5 COMPLETION VERIFICATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   □ Product information collected
   □ Vendor information collected
   □ Evaluation information collected
   □ Testing scope documented
   □ User confirmed all information correct
   □ Markdown report generated
   □ HTML report generated
   □ PDF report generated (or fallback explained)
   □ All report paths stored in workflow state
   □ Report summary displayed to user
   □ JIRA comment added (if ticket provided)

   REPORT FILES VERIFICATION:
   □ Markdown exists at: {markdown_path}
   □ HTML exists at: {html_path}
   □ PDF exists at: {pdf_path} (or fallback used)

   Status: [COMPLETE / INCOMPLETE]
   Blockers: [List any incomplete items]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

   **REQUIRE EXPLICIT 'PROCEED':**
   ```
   Type 'proceed' to mark workflow complete, or 'stop' if any steps missing.
   ```

   **WAIT** - Do NOT continue until user types 'proceed'

   Mark `WORKFLOW_STATE.phase_5_complete = true` ONLY AFTER 'proceed'

8. **Workflow Completion**

   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ COMPREHENSIVE A11Y VPAT AUDIT COMPLETE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📊 SUMMARY

   Product: {product.name} v{product.version}
   Features Scanned: {total_features}
   Total Issues: {total_issues}
   Overall Conformance: {wcag_conformance.overall.status} WCAG {wcag_version} Level AA

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📁 ALL DELIVERABLES

   VPAT 2.5 Reports:
   • Markdown: {markdown_path}
   • HTML: {html_path}
   • PDF: {pdf_path}

   Per-Page Scan Data ({total_pages} pages):
   {for each page}
   • {identifier}/
     - Scan Results (JSON + Markdown)
   {endfor}

   All files organized in: {report_directory}

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎯 NEXT STEPS

   1. Review VPAT PDF report
   2. Share with stakeholders/customers
   3. Address remediation items per Appendix C
   4. Track progress in JIRA: {jira_ticket}
   5. Schedule follow-up audit after fixes

   Workflow complete! 🎉
   ```

---

## Command Behavior

### Authentication Strategy
- **Single authentication** for all pages
- Session persists in MCP browser throughout workflow
- Methods: Automated (with credentials) or Manual (user-driven)
- Never close browser between pages

### Multi-Page Processing
- Sequential page scanning (not parallel)
- Per-page report generation
- Cross-page aggregation in Phase 3

### Guidelines Reference
- `agents/a11y-audit-guidelines.md` (agents/a11y-audit-guidelines.md) provides comprehensive testing rules
  - 10-phase workflow for complete WCAG coverage
  - Defines all 45 MCP accessibility tools to use
  - Screen reader compatibility testing included
  - Applied directly in Phase 2, Step 2e (MCP tools called directly, not via agent)

### PDF Generation Strategy
1. **Primary:** pandoc with WeasyPrint (best formatting)
2. **Fallback:** Playwright browser PDF export
3. **Manual:** User converts HTML if both fail

### JIRA Integration
- Optional (only if ticket provided)
- Two JIRA comments:
  1. After Phase 2 (scan complete)
  2. After Phase 5 (VPAT generated)
- Brief, business-friendly format

### Error Handling
- Stop immediately on errors
- Present options to user
- Never skip steps silently
- Track all errors in workflow state

---

## Example Usage

```bash
# Single page scan with JIRA
/a11y-vpat-scan http://localhost:3000/myapp/dashboard A11Y-500

# Single page scan without JIRA
/a11y-vpat-scan http://localhost:3000/myapp/dashboard

# Multi-page scan with JIRA and explicit credentials
/a11y-vpat-scan pages-config.json A11Y-500 john@example.com SecurePass123

# Multi-page scan without JIRA (uses .env credentials)
/a11y-vpat-scan pages-config.json

# Expected flow:
# Phase 1: Load config → Authenticate once → Setup directories → proceed
# Phase 2: For each page: Navigate → Scan (following guidelines) → Reports → proceed
# Phase 3: Review all issues → Mark valid/existing/false → Adjust reports → proceed
# Phase 4: Aggregate validated results → Map WCAG conformance → proceed
# Phase 5: Collect product info → Generate MD/HTML/PDF → JIRA update → complete
```

---

## Prerequisites

- ✅ MCP accessibility tools configured
- ✅ `agents/a11y-audit-guidelines.md` reference documentation available (agents/a11y-audit-guidelines.md)
- ✅ Chromium browser (via MCP)
- ⚠️ PLAYWRIGHT_USER and PLAYWRIGHT_PASSWORD in .env (optional, can use command params)
- ⚠️ JIRA API access (optional, for ticket integration)
- ⚠️ pandoc + WeasyPrint (optional, for best PDF generation)

---

## Output Files

### Per-Page Reports
- `pages/{identifier}/scan-{timestamp}.json` - Machine-readable scan data (updated post-review with validated issues)
- `pages/{identifier}/scan-{timestamp}.json.pre-review-backup` - Original scan before review
- `pages/{identifier}/scan-{timestamp}.md` - Human-readable scan report (regenerated post-review)

### Review Audit Trail
- `issue-review-audit-{timestamp}.md` - Complete audit trail of all review decisions

### VPAT Reports
- `vpat-styles.css` - Professional CSS stylesheet for HTML (web viewing)
- `vpat-styles-pdf.css` - PDF-optimized CSS (hides VPAT heading, adds page numbers)
- `VPAT-2.5-Report-{product}-{timestamp}.md` - Professional Markdown report (validated issues only)
- `VPAT-2.5-Report-{product}-{timestamp}.html` - Styled HTML report with CSS (validated issues only)
- `VPAT-2.5-Report-{product}-{timestamp}.pdf` - PDF report (validated issues only, primary deliverable) ✨

---

## Notes

### Workflow Features
- **Two scanning approaches** - Smart (efficient, 5-12 tools) or Comprehensive (thorough, 27-30 tools)
- **Scan-only workflow** - No fix implementation (faster execution)
- **Single or multi-page** - Flexible input (URL or JSON file)
- **One authentication** - Session persists for all pages
- **Issue validation** - Review phase filters false positives and existing issues before VPAT generation
- **Audit trail** - Complete documentation of review decisions with notes
- **Professional output** - VPAT 2.5 format with validated issues only, suitable for customers
- **PDF primary** - pandoc first, Playwright fallback
- **56 WCAG 2.2 criteria** (or 50 for WCAG 2.1) - Complete Level A & AA conformance table
- **JIRA optional** - Can run without ticket for ad-hoc audits
- **5 phase boundaries** - User control at each major step (Discover → Scan → Review → Aggregate → VPAT)

### Smart vs Comprehensive Approach

**Smart Approach (DEFAULT):**
- Uses `agents/a11y-audit-guidelines.md` as **reference**, not checklist
- Foundation: axe-core + run_wcag_21_aa_tests
- Strategic tool selection based on page content analysis
- 5-12 tools per page (vs 27-30 comprehensive)
- 60-70% faster execution
- **Transparent testing scope** documented in VPAT report
- Best for: QA, development feedback, sprint testing, CI/CD

**Comprehensive Approach:**
- Systematic execution of all 27-30 tools per guidelines
- Mechanical checklist approach
- 15-25 minutes per page
- Best for: Legal compliance, Section 508, pre-litigation, maximum confidence

**Both produce:**
- Professional VPAT 2.5 reports (MD + HTML + PDF)
- Valid WCAG 2.2 / 2.1 Level A & AA conformance assessment
- Actionable remediation guidance
- Stakeholder-ready documentation
- Complete issue review audit trail

**Report Transparency:**
Both approaches explicitly document:
- Tools executed
- Testing methodology
- Coverage percentage
- Testing limitations
- Recommendations for additional testing

The Smart approach is honest about its scope and provides excellent VPAT quality for most use cases.
