<URL>: $ARGUMENTS

We're performing an accessibility audit for our application. We want to make sure that all the pages meet the WCAG 2.1 AA standard. We're going to run the accessibility tool on a given URL and perform a fix.

Don't be overly nitpicky. We're just trying to meet the spirit of the rules, not necessarily be the most perfect accessible application of all time.

## Workflow

1. Run accessibility audit mcp tool on <URL>. Perform the following:
   - overall analysis using `analyze_accessibility`
   - keyboard navigation testing using `test_keyboard_navigation`
2. Analyze the results
3. If there are no issues, you're done.
4. Make a plan to fix all the issues. Look in the @path/to/the/codebase/
5. Re-run the accessibility audit. If no violations, exit. If violations, repeat 1-5.

## Output

Print the results. Summarize what was fixed, the code changes required, and the stuff a Development Manager would want to read.
