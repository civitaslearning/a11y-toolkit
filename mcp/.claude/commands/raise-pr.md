Execute a complete push and PR workflow against base branch $1 for ticket $2 following this comprehensive approach:

## 1. INPUT VALIDATION & CONTEXT GATHERING
**Base Branch Parameter ($1):**
- If $1 is provided: Use the specified base branch
- If $1 is missing: Prompt user with "Please specify the target base branch (e.g., main, develop, staging)"
- Check memory/git history for commonly used base branches and suggest options
- Default suggestions: `main`, `develop`, `master`, `staging`

**Ticket Parameter ($2):**
- If $2 is provided: Use the specified ticket number
- If $2 is missing: Prompt user with "Please provide the JIRA ticket number (e.g., MULTI-123, PROJ-456)"
- Check memory/conversation history for recent ticket references and suggest options
- Validate ticket format matches team conventions

## 2. COMMIT ANALYSIS & PREPARATION
**Commit Filtering:**
- Identify commits related to the specified ticket ($1)
- Focus only on the most recent commit for this ticket
- Ignore any uncommitted/staged changes
- Extract commit message, files changed, and modification scope

**Branch Validation:**
- Verify current branch name and commit status
- Ensure working directory is clean (no uncommitted changes)
- Confirm the target commit is ready for push

## 3. GIT OPERATIONS
**Push Execution:**
- Execute: `git push origin <current_branch_name>`
- Handle common push scenarios (first push, force push if needed)
- Verify push success and provide confirmation
- Capture any push errors and suggest resolutions

## 4. PR CREATION STRATEGY
**Title Generation:**
- Format: `[TICKET-ID] Brief, compelling description of the change`
- Use action-oriented language (implement, fix, enhance, refactor)
- Keep under 60 characters for readability
- Match the tone of the commit but make it PR-appropriate

**Description Structure:**
```
🔗 **JIRA Link:** [Ticket URL with ID]

## 🚀 What's New
[Exciting description of the changes with relevant emojis]

## 💡 Why This Matters
[Business value and problem this solves]

## 🔧 Technical Changes
- 📁 **Files Modified:** List key files
- 🏗️ **Architecture Impact:** Any structural changes
- 🔒 **Security Considerations:** If applicable
- ⚡ **Performance Impact:** Expected performance changes

## 🧪 Testing Done
- ✅ Unit tests updated/added
- 🔍 Integration testing completed
- 🐛 Edge cases covered

## 📋 Checklist
- [ ] Code follows team standards
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## 🎯 Impact Assessment
**Positive Impacts:**
- [List benefits and improvements]

**Potential Risks:**
- [Any risks and mitigation strategies]
```

## 5. EMOJI GUIDELINES
**Use strategically placed emojis to enhance readability:**
- 🚀 for new features
- 🐛 for bug fixes
- ⚡ for performance improvements
- 🔒 for security changes
- 📚 for documentation
- 🧪 for testing
- 🔧 for technical changes
- 💡 for insights/improvements
- 🎯 for goals/targets
- ✅ for completed items

## 6. CONTENT GUIDELINES
**Professional Standards:**
- Write in engaging, positive tone
- Focus on value delivered to users/business
- Use clear, jargon-free language where possible
- Highlight the "why" behind changes, not just "what"

**Strict Prohibitions:**
- NEVER include co-authored-by attributions
- NEVER mention AI tools, assistants, or automation used
- NEVER reference the tool/method used for commit or PR generation
- NEVER include generic/template language that reveals automation

## 7. EXECUTION WORKFLOW
**Step-by-Step Process:**
1. ✅ **Validate inputs** (ticket and base branch)
2. 🔍 **Analyze commits** for the specified ticket
3. 📤 **Execute git push** with proper error handling
4. 📝 **Generate PR title and description** using above format
5. 🎯 **Create draft PR** against specified base branch
6. 📋 **Populate PR with generated content**
7. ✅ **Confirm PR creation** and provide PR link

## 8. ERROR HANDLING
**Common Scenarios:**
- **Push conflicts:** Suggest rebase/merge strategies
- **Branch protection:** Inform about required checks
- **Invalid ticket:** Request correct ticket format
- **Missing base branch:** Verify branch exists remotely
- **Authentication issues:** Guide through auth setup

## 9. SUCCESS CONFIRMATION
**Final Output:**
```
🎉 Success! Your changes have been pushed and PR created:

📤 **Pushed:** [commit_hash] to origin/[branch_name]
🔗 **PR Created:** [PR_URL]
📋 **Status:** Draft PR ready for review
🎯 **Target:** Merging into [base_branch]

Next steps: Review the PR description and mark as ready for review when complete!
```

Execute this workflow ensuring all operations are completed successfully and providing clear feedback at each step.
```