# Accessibility Scan File - Generation & Verification Rules

**Purpose:** Authoritative specification for generating and verifying accessibility scan JSON files
**For:** VPAT scan workflow (`/a11y-vpat-scan` command)
**Version:** 1.0
**Date:** 2026-02-13
**Based on:** Analysis of 7 correct reference files

---

## THE 4 GOLDEN RULES

Every scan file MUST follow these non-negotiable rules:

### Rule 1: Count Consistency
```
issues.length === summary.total_issues
issues.length === review_metadata.validated_issue_count
Sum(by_severity values) === summary.total_issues
Sum(by_wcag_level values) === summary.total_issues
```

### Rule 2: Issues Array Content
```
issues[] contains ONLY valid issues
Every item MUST have: review_status: "valid"
NO items with: review.classification: "FALSE_POSITIVE"
Can be empty array [] if no valid issues found
```

### Rule 3: Excluded Issues Separation
```
excluded_issues MUST have 4 categories (can be empty):
  - auto_excluded[]
  - out_of_scope[]
  - false_positives[]
  - existing[]

Items with review.classification: "FALSE_POSITIVE" go in excluded_issues.false_positives
Excluded items MUST NOT have review_status field
```

### Rule 4: Required Structure
```
Top-level sections (ALL required):
  - report_id
  - metadata
  - tool_coverage_verification
  - review_metadata
  - summary
  - wcag_conformance
  - issues
  - excluded_issues
```

---

## SCAN FILE STRUCTURE TEMPLATE

```json
{
  "report_id": "scan-{PageName}-{ISO8601Timestamp}",

  "metadata": {
    "page_name": "string",
    "page_url": "string",
    "audit_date": "ISO8601 with Z",
    "wcag_version": "2.2", // or "2.1" per --wcag flag
    "conformance_target": "AA",
    "scan_approach": "Smart",
    "exclusions_enabled": true,
    "exclusions": ["array of selectors and rules"]
  },

  "tool_coverage_verification": {
    "scan_approach": "Smart",
    "tools_executed": ["array of tool names"],
    "total_tools_executed": number,
    "within_expected_range": true
  },

  "review_metadata": {
    "reviewed": true,
    "reviewed_at": "ISO8601 with Z",
    "original_issue_count": number,
    "validated_issue_count": number,      // MUST = issues.length
    "auto_excluded_count": number,
    "out_of_scope_count": number,
    "manual_false_positive_count": number,
    "existing_issue_count": number
  },

  "summary": {
    "total_issues": number,                 // MUST = issues.length
    "by_severity": {
      "critical": number,
      "serious": number,                    // Sum MUST = total_issues
      "moderate": number,
      "minor": number
    },
    "by_wcag_level": {
      "A": number,                          // Sum MUST = total_issues
      "AA": number
    },
    "conformance_status": "Supports | Partially Supports | Does Not Support"
  },

  "wcag_conformance": {
    "{WCAG_CODE}": {
      "name": "string",
      "level": "A | AA",
      "status": "string",
      "issues": number
    }
  },

  "issues": [
    {
      "id": "string",
      "wcag_criterion": "string",
      "wcag_level": "A | AA",
      "title": "string",
      "severity": "critical | serious | moderate | minor",
      "impact": "string",
      "element": "string",
      "selector": "string",
      "location": "string",
      "instances": number,
      "description": "string",
      "recommendation": "string",
      "source_tool": "string",
      "review_status": "valid",             // REQUIRED
      "reviewed_at": "ISO8601 with Z",      // REQUIRED
      "validation_note": "string (optional)"
    }
  ],

  "excluded_issues": {
    "auto_excluded": [
      {
        "id": "string",
        "wcag_criterion": "string",
        "title": "string",
        "exclusion_rule": "string",         // REQUIRED
        "exclusion_reason": "string"        // REQUIRED
      }
    ],
    "out_of_scope": [
      {
        "id": "string",
        "wcag_criterion": "string",
        "title": "string",
        "scope_exclusion_reason": "string"  // REQUIRED
      }
    ],
    "false_positives": [
      {
        "id": "string",
        "wcag_criterion": "string",
        "title": "string",
        "reviewer_note": "string",          // REQUIRED
        "reviewed_at": "ISO8601 with Z"     // REQUIRED
      }
    ],
    "existing": [
      {
        "id": "string",
        "wcag_criterion": "string",
        "title": "string",
        "existing_issue_reference": "string", // REQUIRED
        "reviewed_at": "ISO8601 with Z"       // REQUIRED
      }
    ]
  }
}
```

---

## FIELD REQUIREMENTS BY CATEGORY

### Issues Array Items
| Field | Required | Must Have |
|-------|----------|-----------|
| review_status | YES | Must be "valid" |
| reviewed_at | YES | ISO8601 timestamp |
| id, wcag_criterion, title, severity | YES | - |
| Must NOT have | - | review.classification |

### Excluded Issues - auto_excluded
| Field | Required | Must NOT Have |
|-------|----------|---------------|
| exclusion_rule | YES | review_status |
| exclusion_reason | YES | reviewed_at |

### Excluded Issues - out_of_scope
| Field | Required | Must NOT Have |
|-------|----------|---------------|
| scope_exclusion_reason | YES | review_status |
| - | - | reviewed_at |

### Excluded Issues - false_positives
| Field | Required | Must NOT Have |
|-------|----------|---------------|
| reviewer_note | YES | review_status |
| reviewed_at | YES | - |

### Excluded Issues - existing
| Field | Required | Must NOT Have |
|-------|----------|---------------|
| existing_issue_reference | YES | review_status |
| reviewed_at | YES | - |

---

## VERIFICATION ALGORITHM

Use this to verify any scan file is correct:

```python
def verify_scan_file(scan_json):
    """Returns True if scan file follows all rules, False otherwise"""

    # Rule 1: Count Consistency
    if len(scan_json['issues']) != scan_json['summary']['total_issues']:
        return False, "issues.length != summary.total_issues"

    if len(scan_json['issues']) != scan_json['review_metadata']['validated_issue_count']:
        return False, "issues.length != validated_issue_count"

    severity_sum = sum(scan_json['summary']['by_severity'].values())
    if severity_sum != scan_json['summary']['total_issues']:
        return False, "by_severity sum != total_issues"

    level_sum = sum(scan_json['summary']['by_wcag_level'].values())
    if level_sum != scan_json['summary']['total_issues']:
        return False, "by_wcag_level sum != total_issues"

    # Rule 2: Issues Array Content
    for issue in scan_json['issues']:
        if issue.get('review_status') != 'valid':
            return False, f"Issue {issue['id']} missing review_status='valid'"

        if 'review' in issue and issue['review'].get('classification') == 'FALSE_POSITIVE':
            return False, f"Issue {issue['id']} has FALSE_POSITIVE in issues array"

        if 'reviewed_at' not in issue:
            return False, f"Issue {issue['id']} missing reviewed_at"

    # Rule 3: Excluded Issues Structure
    required_categories = ['auto_excluded', 'out_of_scope', 'false_positives', 'existing']
    for category in required_categories:
        if category not in scan_json['excluded_issues']:
            return False, f"Missing excluded_issues.{category}"

    # Rule 4: Required Sections
    required_sections = ['report_id', 'metadata', 'tool_coverage_verification',
                        'review_metadata', 'summary', 'wcag_conformance',
                        'issues', 'excluded_issues']
    for section in required_sections:
        if section not in scan_json:
            return False, f"Missing required section: {section}"

    return True, "VALID - All rules passed"
```

---

## GENERATION WORKFLOW

When generating a scan file, follow this sequence:

### Step 1: Run Accessibility Scan
- Execute 5-12 accessibility testing tools
- Collect all detected issues (raw)

### Step 2: Apply Auto-Exclusions
- Match issues against exclusion rules
- Move matched items to `auto_excluded[]`

### Step 3: Scope Filtering
- Identify out-of-scope items (third-party widgets, login forms, etc.)
- Move to `out_of_scope[]`

### Step 4: Manual Review
- Review remaining issues
- Classify as:
  - **VALID** → Keep in `issues[]` with review_status="valid"
  - **FALSE_POSITIVE** → Move to `false_positives[]`
  - **EXISTING** → Move to `existing[]` if already documented

### Step 5: Calculate Counts
- Count items in `issues[]` → set `validated_issue_count` and `total_issues`
- Count items in each excluded category → set corresponding counts
- Calculate `original_issue_count` = sum of all counts
- Calculate severity breakdown from `issues[]` only
- Calculate WCAG level breakdown from `issues[]` only

### Step 6: Validate
- Run verification algorithm
- Fix any violations before saving

---

## COMMON VIOLATIONS & FIXES

### Violation 1: FALSE_POSITIVE in Issues Array
**Detection:**
```json
{
  "issues": [
    {
      "id": "issue-1",
      "review": {"classification": "FALSE_POSITIVE"}
    }
  ]
}
```

**Fix:**
```python
# Remove from issues[]
item = issues.pop(index)

# Transform
transformed = {
    "id": item["id"],
    "wcag_criterion": item["wcag_criterion"],
    "title": item["title"],
    "reviewer_note": item["review"]["reason"],
    "reviewed_at": item.get("reviewed_at", current_timestamp())
}

# Add to false_positives[]
excluded_issues["false_positives"].append(transformed)

# Update counts
review_metadata["validated_issue_count"] -= 1
review_metadata["manual_false_positive_count"] += 1
summary["total_issues"] -= 1
```

### Violation 2: Count Mismatch
**Detection:**
```json
{
  "issues": [/* 2 items */],
  "summary": {"total_issues": 13}
}
```

**Fix:**
```python
# Recalculate from actual array
summary["total_issues"] = len(issues)
review_metadata["validated_issue_count"] = len(issues)

# Recalculate severity breakdown
severity_counts = {"critical": 0, "serious": 0, "moderate": 0, "minor": 0}
for issue in issues:
    severity_counts[issue["severity"]] += 1
summary["by_severity"] = severity_counts

# Recalculate level breakdown
level_counts = {"A": 0, "AA": 0}
for issue in issues:
    level_counts[issue["wcag_level"]] += 1
summary["by_wcag_level"] = level_counts
```

---

## REFERENCE FILES (Perfect Examples)

Use these as templates:

**Zero Valid Issues:**
- `test-reports/accessibility-reports/advisor-calendar-appointment-slots/scan-2026-02-09T10-32-16Z.json`
- issues: []
- total_issues: 0
- All false positives in excluded_issues

**With Valid Issues:**
- `test-reports/accessibility-reports/communication-advisor-announcement-compose/scan-2026-02-10T11-29-00Z.json`
- issues: [3 valid items]
- total_issues: 3
- 18 false positives in excluded_issues

**Quick Verification:**
```bash
# Count issues in array
jq '.issues | length' scan.json

# Should match
jq '.summary.total_issues' scan.json
jq '.review_metadata.validated_issue_count' scan.json

# Check for violations
jq '.issues[] | select(.review.classification == "FALSE_POSITIVE")' scan.json
# Should return nothing
```

---

## INTEGRATION WITH VPAT WORKFLOW

The `/a11y-vpat-scan` command MUST:

1. **After Phase 3 Review:** Verify scan file passes all 4 Golden Rules
2. **Before Writing File:** Run verification algorithm
3. **On Failure:** Report violations and halt
4. **On Success:** Write file and proceed

**Verification Point:**
```python
# After classification but before file write
is_valid, message = verify_scan_file(scan_data)
if not is_valid:
    raise ValidationError(f"Scan file validation failed: {message}")
```

---

## VERSION HISTORY

- **v1.0 (2026-02-13):** Initial specification based on 7 reference files
  - Analyzed: advisor-student-summary, advisor-calendar, communication-advisor
  - Established 4 Golden Rules
  - Defined field requirements by category

---

**End of Rules**

For questions or clarifications, refer to reference files or contact accessibility team.
