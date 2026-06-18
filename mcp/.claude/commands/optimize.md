Execute a comprehensive senior-level code analysis and optimization review following this structured approach:

## 1. MULTI-AGENT ANALYSIS SETUP
**Performance Optimization Focus:**
- Invoke `@performance-optimizer` for specialized performance analysis
- Request algorithmic complexity assessment and bottleneck identification
- Analyze memory usage patterns and resource consumption
- Evaluate database query efficiency and caching opportunities

**Code Review Integration:**
- Leverage `@code-reviewer` for quality assessment alongside performance review
- Cross-reference findings between agents for comprehensive coverage
- Ensure consistency between performance recommendations and code quality standards

## 2. COMPREHENSIVE CODE ANALYSIS FRAMEWORK

### 🔍 **PHASE 1: Structural Analysis**
**Code Architecture Review:**
- Examine overall code structure and design patterns used
- Identify architectural anti-patterns or code smells
- Assess separation of concerns and modularity
- Review dependency injection and coupling levels

**File and Module Organization:**
- Analyze file structure and naming consistency
- Review import/export patterns and circular dependencies
- Assess code organization and logical grouping

### 🐛 **PHASE 2: Logic & Correctness Audit**
**Critical Logic Review:**
- **Logical Errors:** Identify flawed algorithms, incorrect conditionals, and faulty business logic
- **Data Flow Issues:** Trace variable assignments, state mutations, and data transformations
- **Control Flow Problems:** Analyze loops, recursion, and conditional branches for correctness
- **Type Safety:** Check for type mismatches, unsafe casting, and implicit conversions

**Edge Case Coverage:**
- **Boundary Conditions:** Empty arrays, null values, zero/negative numbers, string length limits
- **Error Scenarios:** Network failures, database timeouts, file system errors
- **Input Validation:** SQL injection, XSS vulnerabilities, buffer overflows
- **Concurrency Issues:** Race conditions, deadlocks, shared resource conflicts
- **Resource Limits:** Memory constraints, file handle limits, connection pool exhaustion

### 📝 **PHASE 3: Code Quality Assessment**
**Naming & Style Consistency:**
- **Variable/Function Names:** Clear, descriptive, following team conventions
- **Consistent Formatting:** Indentation, spacing, bracket placement
- **Code Style Guidelines:** Adherence to project/language style guides
- **Documentation Standards:** Inline comments, JSDoc/docstrings, README updates

**Readability & Maintainability:**
- **Function Complexity:** Single responsibility principle adherence
- **Code Duplication:** DRY principle violations and refactoring opportunities
- **Magic Numbers/Strings:** Hard-coded values that should be constants
- **Complex Expressions:** Break down into readable, testable components

### ⚡ **PHASE 4: Performance Optimization**
**Algorithm Efficiency:**
- **Time Complexity:** Big O analysis for loops, searches, and data operations
- **Space Complexity:** Memory usage optimization and data structure selection
- **Database Performance:** Query optimization, indexing, N+1 problems
- **Caching Strategies:** Redis, memcache, browser caching opportunities

**Resource Management:**
- **Memory Leaks:** Event listeners, closures, circular references
- **CPU Optimization:** Async/await usage, worker threads, batching
- **Network Efficiency:** API call optimization, payload size reduction
- **File I/O Performance:** Stream processing, batch operations

### 🔒 **PHASE 5: Security Analysis**
**Vulnerability Assessment:**
- **Input Sanitization:** XSS, SQL injection, command injection prevention
- **Authentication/Authorization:** JWT handling, permission checks, session management
- **Data Exposure:** Sensitive data in logs, error messages, client-side code
- **Dependency Security:** Known vulnerabilities in packages/libraries

**Security Best Practices:**
- **Secrets Management:** API keys, passwords, certificates handling
- **HTTPS/Encryption:** Data in transit and at rest protection
- **Rate Limiting:** DoS protection and API abuse prevention
- **Error Handling:** Information disclosure through error messages

### 📚 **PHASE 6: Documentation & Clarity**
**Code Documentation Needs:**
- **Complex Logic:** Algorithms, business rules, mathematical calculations
- **API Documentation:** Function signatures, parameters, return values
- **Configuration:** Environment variables, deployment requirements
- **Architecture Decisions:** Why certain patterns/technologies were chosen

**Debugging & Production Readiness:**
- **Debug Code Removal:** console.log, print statements, debug flags
- **Test Code Cleanup:** Mock data, test-specific configurations
- **Environment Configuration:** Development vs production settings
- **Monitoring Integration:** Logging, metrics, error tracking setup

## 3. STRUCTURED OUTPUT FORMAT

### 📊 **EXECUTIVE SUMMARY**
```
🎯 **Overall Code Quality Score:** [1-10 with reasoning]
⚠️  **Critical Issues Found:** [Number and brief description]
🚀 **Performance Impact:** [High/Medium/Low with key bottlenecks]
🔒 **Security Risk Level:** [High/Medium/Low with main concerns]
📈 **Recommended Priority:** [Immediate/Soon/Future improvements]
```

### 🔧 **DETAILED FINDINGS & RECOMMENDATIONS**

**1. 🚨 CRITICAL ISSUES (Fix Immediately)**
```
Issue: [Specific problem description]
Location: [File:Line or function name]
Impact: [Potential consequences]
Solution: [Detailed fix with code example if applicable]
Priority: CRITICAL
Effort: [Small/Medium/Large]
```

**2. ⚡ PERFORMANCE OPTIMIZATIONS**
```
Issue: [Performance bottleneck description]
Current Complexity: [Big O notation if applicable]
Improvement: [Optimized approach]
Expected Gain: [Quantified improvement]
Implementation: [Step-by-step approach]
```

**3. 🔒 SECURITY CONCERNS**
```
Vulnerability: [Security issue description]
Risk Level: [High/Medium/Low]
Attack Vector: [How it could be exploited]
Mitigation: [Security fix implementation]
```

**4. 📝 CODE QUALITY IMPROVEMENTS**
```
Category: [Naming/Style/Structure]
Current Issue: [What's wrong]
Improvement: [Better approach]
Benefit: [Why this matters]
```

**5. 📚 DOCUMENTATION NEEDS**
```
Area: [What needs documentation]
Complexity: [Why it's confusing]
Documentation Type: [Inline/External/API docs]
Content Needed: [What to document]
```

### 🎯 **PRIORITIZED ACTION PLAN**
**Phase 1 (Immediate - Security & Critical):**
- [ ] [Critical issue 1 with timeline]
- [ ] [Security vulnerability fix]

**Phase 2 (Short-term - Performance & Quality):**
- [ ] [Performance optimization 1]
- [ ] [Code quality improvement]

**Phase 3 (Long-term - Refactoring & Documentation):**
- [ ] [Architecture improvement]
- [ ] [Documentation completion]

### 📈 **MEASURABLE OUTCOMES**
- **Performance Metrics:** Expected improvements in load time, memory usage, etc.
- **Quality Metrics:** Reduced complexity, improved maintainability scores
- **Security Metrics:** Vulnerability reduction, compliance improvements

## 4. AGENT COORDINATION
**Performance Optimizer Integration:**
- Request specific performance analysis from `@performance-optimizer`
- Cross-validate performance recommendations with code quality requirements
- Ensure optimizations don't compromise code readability or maintainability

**Documentation Specialist Support:**
- Engage `@documentation-specialist` for complex documentation needs
- Request API documentation updates for any interface changes
- Coordinate inline comment improvements with overall documentation strategy

## 5. QUALITY ASSURANCE
**Review Completeness Checklist:**
- [ ] All seven analysis categories covered comprehensively
- [ ] Specific, actionable recommendations provided
- [ ] Code examples included for complex fixes
- [ ] Priority levels assigned based on impact and risk
- [ ] Effort estimates provided for planning purposes
- [ ] Measurable success criteria defined

Execute this comprehensive analysis ensuring no aspect is overlooked and all recommendations are practical, specific, and implementable.
```