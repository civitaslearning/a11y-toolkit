---
name: double-check
description: |
  Double check your work and ask clarifying questions before proceeding. Use this skill
  when you want to verify the quality and correctness of recent work, catch potential
  issues, or ensure nothing was missed.

  Triggers: "double check", "verify work", "review what you did", "check your work",
  "did you miss anything", "are you sure".
---

# Double Check

## Syntax
```bash
/double-check
```

## Parameters
None.

## Purpose
Pauses to systematically verify recent work and surface any uncertainties or ambiguities before proceeding.

**CI fast-path:** If the `CI` env var is set, the skill runs unattended.
Do NOT call AskUserQuestion. Do NOT pause for user input. Instead, follow
the CI variant of Step 2 below.

## Steps

### Step 1: Review Recent Work
Double check your work thoroughly. Review all changes made, decisions taken, and assumptions relied upon.

### Step 2: Identify Uncertainties

**Local mode:** Ask clarifying questions if anything is unclear before proceeding. Make a todo list of the questions and ask the user one at a time.

**CI mode** (`CI` env var set): Do NOT prompt. Internally enumerate the same
clarifying questions you would have asked, then self-answer each from the
working state — git diff, recently edited files, the calling pipeline prompt's
acceptance criteria, and the test results from the prior step. If a question
genuinely has no answer in the working state, log it as an unresolved
uncertainty in the verification summary; do not block on it.

### Step 3: Confirm Completion

**Local mode:** Once all questions are answered, summarize the verification results and confirm readiness to proceed.

**CI mode:** Output the verification summary directly. End with a sentinel
line the caller can grep for: `Verification: PASSED — N checks, M unresolved`.
