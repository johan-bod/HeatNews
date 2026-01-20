# Dependency Audit Report
**Generated**: 2026-01-18
**Project**: global-news-horizon-view

## Executive Summary

- **Total Dependencies**: 467 (271 production, 195 dev)
- **Security Vulnerabilities**: 12 (4 High, 5 Moderate, 3 Low)
- **Outdated Packages**: 19 packages with newer versions available
- **Unused Dependencies**: 4 packages identified as unused

---

## 1. Security Vulnerabilities

### CRITICAL - Must Fix Immediately

#### 🔴 HIGH: react-router-dom (XSS Vulnerability)
- **Current**: 6.26.2
- **Affected**: react-router-dom, @remix-run/router
- **Issue**: XSS via Open Redirects + Unexpected external redirect via untrusted paths
- **CVSS Score**: 8.0 (High)
- **Fix**: Update to 6.30.3 or later
```bash
npm update react-router-dom
```

#### 🔴 HIGH: glob (Command Injection)
- **Current**: 10.2.0-10.4.5
- **Issue**: Command injection via -c/--cmd executes matches with shell:true
- **CVSS Score**: 7.5
- **Fix**: Update to 10.5.0+
```bash
npm audit fix --force
```

### MODERATE - Address Soon

#### 🟡 MODERATE: vite (Multiple Security Issues)
- **Current**: 5.4.1
- **Issues**:
  - server.fs.deny bypass vulnerabilities
  - Websites can send requests to dev server and read responses
  - Multiple path traversal issues
- **Fix**: Update to 6.1.7+
```bash
npm update vite
```

#### 🟡 MODERATE: @babel/runtime (RegExp DoS)
- **Issue**: Inefficient RegExp complexity in generated code
- **CVSS Score**: 6.2
- **Fix**: Update to 7.26.10+

#### 🟡 MODERATE: esbuild (Development Server Security)
- **Current**: ≤0.24.2
- **Issue**: Any website can send requests to dev server
- **Fix**: Update to 0.24.3+

#### 🟡 MODERATE: nanoid (Predictable Generation)
- **Current**: <3.3.8
- **Issue**: Predictable results when given non-integer values
- **Fix**: Update to 3.3.8+

#### 🟡 MODERATE: js-yaml (Prototype Pollution)
- **Current**: 4.0.0-4.1.0
- **Issue**: Prototype pollution in merge (<<)
- **Fix**: Update to 4.1.1+

### LOW - Monitor

#### ⚪ LOW: eslint & @eslint/plugin-kit
- **Issue**: RegExp DoS in ConfigCommentParser
- **Fix**: Update to latest version

#### ⚪ LOW: brace-expansion
- **Issue**: RegExp DoS vulnerability
- **Fix**: Update to 2.0.2+

---

## 2. Outdated Packages

### Breaking Changes - Major Updates Available

| Package | Current | Latest | Breaking Changes |
|---------|---------|--------|------------------|
| `@hookform/resolvers` | 3.9.0 | **5.2.2** | ⚠️ Major (3→5) |
| `date-fns` | 3.6.0 | **4.1.0** | ⚠️ Major |
| `next-themes` | 0.3.0 | **0.4.6** | ⚠️ Major |
| `react` | 18.3.1 | **19.2.3** | ⚠️ Major |
| `react-dom` | 18.3.1 | **19.2.3** | ⚠️ Major |
| `react-day-picker` | 8.10.1 | **9.13.0** | ⚠️ Major |
| `react-resizable-panels` | 2.1.3 | **4.4.1** | ⚠️ Major (2→4) |
| `react-router-dom` | 6.26.2 | **7.12.0** | ⚠️ Major + Security |
| `recharts` | 2.12.7 | **3.6.0** | ⚠️ Major |
| `sonner` | 1.5.0 | **2.0.7** | ⚠️ Major |
| `tailwind-merge` | 2.5.2 | **3.4.0** | ⚠️ Major |
| `vaul` | 0.9.3 | **1.1.2** | ⚠️ Major |
| `zod` | 3.23.8 | **4.3.5** | ⚠️ Major |

### Safe Updates - Minor/Patch Versions

| Package | Current | Latest |
|---------|---------|--------|
| `lucide-react` | 0.462.0 | 0.562.0 |

---

## 3. Unused Dependencies - Bloat Analysis

### Confirmed Unused (Safe to Remove)

#### ❌ @hookform/resolvers (2.8MB)
- **Status**: NOT imported anywhere in codebase
- **Reason**: Peer dependency for react-hook-form + zod validation
- **Impact**: Can remove if not planning form validation with zod

#### ❌ zod (3.1MB)
- **Status**: NOT imported anywhere in codebase
- **Reason**: Schema validation library, typically used with forms
- **Impact**: Safe to remove unless planning to implement form validation

#### ❌ date-fns (1.2MB)
- **Status**: NOT imported anywhere in codebase
- **Reason**: Date utility library
- **Impact**: Safe to remove unless planning date manipulation features

#### ⚠️ react-hook-form (784KB)
- **Status**: Only wrapped in UI component (form.tsx), never used in application
- **Usage**: Template/scaffold dependency for future forms
- **Impact**: Consider removing if no forms planned, otherwise keep for future use

### Potentially Over-Provisioned (Review)

#### 🔍 @radix-ui/* Components (27 packages, ~15MB total)
- **Status**: All wrapped in shadcn/ui components but not all actively used
- **Current Usage in Pages**:
  - Used: Avatar, Label, Tooltip, Slot (via Button), Scroll Area
  - Wrapped but unused: 22+ other components
- **Recommendation**:
  - **Keep for now** - This is standard shadcn/ui pattern
  - Consider removing specific unused components only if bundle size becomes critical
  - Components are tree-shakeable, so unused ones shouldn't significantly impact production bundle

---

## 4. Recommendations

### Immediate Actions (This Week)

1. **Fix Security Vulnerabilities**
```bash
# Update react-router-dom (HIGH severity XSS)
npm update react-router-dom

# Run automated fixes
npm audit fix

# Force fixes for breaking changes (review carefully)
npm audit fix --force
```

2. **Remove Unused Dependencies**
```bash
npm uninstall @hookform/resolvers zod date-fns
```

3. **Update Safe Minor Versions**
```bash
npm update lucide-react
```

### Near-term Actions (This Month)

4. **Update React 18 → 19** (Breaking changes)
```bash
npm install react@latest react-dom@latest
npm install --save-dev @types/react@latest @types/react-dom@latest
```
**Testing Required**:
- Review React 19 migration guide
- Test all components for breaking changes
- Update React Query if needed

5. **Update Vite to v6** (Security + Features)
```bash
npm install vite@latest
```
**Testing Required**:
- Review Vite 6 changelog
- Test dev server and build process

6. **Update React Router v6 → v7** (After React 19)
```bash
npm install react-router-dom@latest
```
**Testing Required**:
- Review React Router v7 migration guide
- Major API changes expected

### Future Considerations

7. **Bundle Size Optimization**
   - Current production dependencies: 271 packages
   - Consider analyzing with `npm run build` + bundle analyzer
   - If bundle size is critical, audit unused @radix-ui components

8. **Update Strategy**
   - Set up Dependabot or Renovate for automated dependency updates
   - Establish a monthly dependency review schedule
   - Pin versions in package.json (remove ^ for critical dependencies)

---

## 5. Update Script

### Safe Updates (No Breaking Changes)
```bash
#!/bin/bash
# safe-update.sh - Run these updates with minimal risk

# Remove unused dependencies
npm uninstall @hookform/resolvers zod date-fns

# Fix security vulnerabilities
npm update react-router-dom  # Fixes HIGH severity XSS
npm audit fix                # Auto-fix compatible issues

# Update minor versions
npm update lucide-react
npm update @tanstack/react-query
npm update embla-carousel-react
npm update input-otp
npm update cmdk

# Verify
npm audit
npm run build
npm run dev
```

### Breaking Updates (Test Carefully)
```bash
#!/bin/bash
# breaking-update.sh - Test in separate branch

# Update React 18 → 19
npm install react@latest react-dom@latest
npm install --save-dev @types/react@latest @types/react-dom@latest

# Update Vite 5 → 6
npm install vite@latest

# Update other major versions
npm install next-themes@latest
npm install sonner@latest
npm install tailwind-merge@latest
npm install vaul@latest

# Full rebuild and test
npm install
npm run build
npm run dev
```

---

## 6. Risk Assessment

| Risk Level | Count | Action Required |
|------------|-------|-----------------|
| 🔴 Critical | 2 | Fix immediately (react-router-dom, glob) |
| 🟡 High | 5 | Fix this week (vite, babel, esbuild, etc.) |
| ⚪ Low | 3 | Monitor and update when convenient |
| 📦 Bloat | 4 | Remove unused dependencies |

---

## 7. Cost-Benefit Analysis

### Benefits of Updates
- **Security**: Eliminate 12 known vulnerabilities
- **Performance**: React 19 has improved performance
- **Features**: Vite 6 has better dev experience
- **Bundle Size**: Remove ~7MB of unused dependencies

### Risks
- **Breaking Changes**: React 19, React Router 7, and others require migration
- **Testing Effort**: Comprehensive testing needed for major updates
- **Time Investment**: ~4-8 hours for full migration and testing

### Recommendation Priority
1. **High Priority (Do Now)**: Security fixes + remove unused deps (2 hours)
2. **Medium Priority (This Month)**: Update React 19, Vite 6 (4-6 hours)
3. **Low Priority (When Convenient)**: Update other major versions (2-4 hours)

---

## 8. Monitoring & Prevention

### Ongoing Practices
- Run `npm audit` weekly
- Review `npm outdated` monthly
- Set up GitHub Dependabot alerts
- Use `npm ci` in CI/CD for reproducible builds
- Consider dependency version pinning for critical packages

### Tools to Consider
- **depcheck**: Find unused dependencies automatically
- **bundlephobia**: Check package sizes before installing
- **npm-check-updates**: Interactive dependency updates
- **Snyk**: Advanced security scanning
