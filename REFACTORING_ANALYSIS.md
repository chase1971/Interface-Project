# FuturePlanning Component - Architecture Analysis & Refactoring Plan

## Current State Assessment

### ✅ Strengths
1. **Clear component structure** - React functional component with hooks
2. **Good separation of UI and logic** - Calendar rendering is separate from calculations
3. **Reusable utilities** - Uses shared calendar utilities
4. **State management** - Uses React hooks appropriately

### ⚠️ Issues & Areas for Improvement

#### 1. **File Size & Complexity** (765 lines)
- **Problem**: Single component file is too large, making it hard to maintain
- **Impact**: Difficult to navigate, test, and modify
- **Recommendation**: Split into smaller, focused components and hooks

#### 2. **Business Logic in Component** (Lines 232-541)
- **Problem**: `calculateOffsetForCalendar` is 300+ lines of complex calculation logic
- **Impact**: Hard to test, reuse, or modify independently
- **Recommendation**: Extract to a dedicated service/utility module

#### 3. **Duplicated Holiday Detection Logic**
- **Problem**: Holiday detection appears in 3+ places with same logic
  - Lines 315-325 (identifying holidays in class schedule)
  - Lines 467-477 (skipping holidays in class schedule)
  - Lines 507-514 (detecting item types)
- **Impact**: Changes require updates in multiple places, risk of inconsistency
- **Recommendation**: Create `detectHoliday()` and `detectItemType()` utility functions

#### 4. **Hardcoded Configuration**
- **Problem**: 
  - Courses list (lines 13-19) - should come from props/config
  - Holiday definitions (lines 37-49) - should be configurable
  - CA 4105 special case (lines 163-196) - magic logic
- **Impact**: Not flexible, hard to maintain
- **Recommendation**: Move to configuration files or props

#### 5. **Mixed Concerns**
- **Problem**: Component handles:
  - UI rendering
  - Data fetching (fetch calls inline)
  - Complex calculations
  - State management
  - Error handling (alerts)
- **Impact**: Violates single responsibility principle
- **Recommendation**: Extract custom hooks for data fetching and calculations

#### 6. **Error Handling**
- **Problem**: Uses `alert()` for errors (lines 187, 199, 266, 273, 282)
- **Impact**: Poor UX, blocks interaction
- **Recommendation**: Use toast notifications or inline error messages

#### 7. **Date String Format Inconsistencies**
- **Problem**: Mix of formats:
  - `YYYY-MM-DD` (from API)
  - `MM-DD-YYYY` (from formatDate)
  - Date objects
- **Impact**: Easy to introduce bugs, hard to debug
- **Recommendation**: Standardize on one format, use conversion utilities

#### 8. **Large Calculation Function**
- **Problem**: `calculateOffsetForCalendar` does too much:
  - Finds start dates
  - Identifies holidays
  - Calculates offsets
  - Processes assignments
  - Processes class schedule
  - Handles fixed holidays
- **Impact**: Hard to test, modify, or understand
- **Recommendation**: Break into smaller, testable functions

#### 9. **State Management**
- **Problem**: Many related state variables that could be grouped:
  - `offsetCalendarItems`, `fixedHolidays`, `futureStartDate` are related
  - `selectedSemester`, `pickedUpClass` are related
- **Impact**: State updates scattered, harder to reason about
- **Recommendation**: Use `useReducer` or combine related state

#### 10. **Magic Numbers & Strings**
- **Problem**: 
  - `maxAttempts = 100` (line 369) - why 100?
  - Holiday keywords scattered throughout
  - Schedule type strings ('MW', 'TR') used directly
- **Impact**: Hard to understand intent, easy to break
- **Recommendation**: Extract to constants/enums

## Refactoring Recommendations

### Priority 1: Extract Business Logic

**Create `services/calendarOffsetService.js`:**
```javascript
// Handles all calendar offset calculations
export const calculateCalendarOffset = (params) => { ... }
export const processAssignments = (assignments, offset) => { ... }
export const processClassSchedule = (schedule, offset) => { ... }
export const adjustForHolidays = (items, holidays) => { ... }
```

**Create `utils/holidayUtils.js`:**
```javascript
export const detectHoliday = (description) => { ... }
export const detectItemType = (description) => { ... }
export const getFixedHolidays = (year) => { ... }
export const isHolidayDate = (date, holidays) => { ... }
```

### Priority 2: Extract Custom Hooks

**Create `hooks/useFuturePlanningCalculation.js`:**
```javascript
// Handles all calculation logic
export const useFuturePlanningCalculation = () => {
  const calculateOffset = useCallback(...)
  const processData = useCallback(...)
  return { calculateOffset, processData }
}
```

**Create `hooks/useFixedHolidays.js`:**
```javascript
// Manages fixed holidays state
export const useFixedHolidays = (selectedSemester) => {
  const [holidays, setHolidays] = useState([])
  useEffect(...)
  return holidays
}
```

### Priority 3: Split Components

**Create `components/FuturePlanning/SemesterSelection.js`:**
```javascript
// Handles semester selection UI
```

**Create `components/FuturePlanning/ClassPicker.js`:**
```javascript
// Handles class selection UI
```

**Create `components/FuturePlanning/PlanningCalendar.js`:**
```javascript
// Handles calendar rendering
```

### Priority 4: Configuration Management

**Create `config/courses.js`:**
```javascript
export const COURSES = [...]
export const getCourseById = (id) => {...}
```

**Create `config/holidays.js`:**
```javascript
export const FIXED_HOLIDAYS = [...]
export const getHolidaysForYear = (year) => {...}
```

### Priority 5: Error Handling

**Create `utils/errorHandler.js`:**
```javascript
export const showError = (message) => {
  // Use toast or inline error display
}
```

## Proposed File Structure

```
frontend/src/
├── pages/
│   └── FuturePlanning.js (simplified, ~200 lines)
├── components/
│   └── FuturePlanning/
│       ├── SemesterSelection.js
│       ├── ClassPicker.js
│       ├── PlanningCalendar.js
│       └── CalendarDay.js
├── hooks/
│   ├── useFuturePlanningCalculation.js
│   ├── useFixedHolidays.js
│   └── useCalendarOffset.js
├── services/
│   └── calendarOffsetService.js
├── utils/
│   ├── holidayUtils.js
│   └── dateFormatUtils.js
└── config/
    ├── courses.js
    └── holidays.js
```

## Benefits of Refactoring

1. **Maintainability**: Smaller, focused files are easier to understand and modify
2. **Testability**: Business logic can be tested independently
3. **Reusability**: Utilities and hooks can be reused elsewhere
4. **Flexibility**: Configuration changes don't require code changes
5. **Debugging**: Easier to locate and fix issues
6. **Performance**: Better code splitting and memoization opportunities
7. **Collaboration**: Multiple developers can work on different parts

## Migration Strategy

1. **Phase 1**: Extract utility functions (non-breaking)
2. **Phase 2**: Extract custom hooks (non-breaking)
3. **Phase 3**: Split components (requires testing)
4. **Phase 4**: Move configuration (requires testing)
5. **Phase 5**: Improve error handling (UX improvement)

## Testing Strategy

- Unit tests for utility functions
- Integration tests for hooks
- Component tests for UI components
- E2E tests for user workflows

