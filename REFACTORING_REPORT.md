# Calendar Codebase Refactoring Report

## Overview
This report identifies areas in the calendar codebase that could benefit from refactoring to improve maintainability, performance, and code quality.

## Key Findings

### 1. ⚠️ **Critical: window.location.reload() Usage**
**Location:** `Calendar.js` line 2050

**Issue:** Using `window.location.reload()` forces a full page reload, which:
- Loses React state unnecessarily
- Causes poor user experience (flash, loss of scroll position)
- Is generally an anti-pattern in React applications

**Current Code:**
```javascript
setTimeout(() => {
  clearAssignmentsInRange(startDate, endDate);
  setTimeout(() => {
    window.location.reload();
  }, 200);
}, 50);
```

**Recommendation:** Replace with proper state updates:
```javascript
const confirmClearCurrentSemester = () => {
  const currentSemester = detectSemesterFromDate(currentDate);
  if (!currentSemester || !currentSemester.range) {
    alert('Could not determine current semester. Please navigate to a semester month first.');
    setShowClearCalendarMenu(false);
    return;
  }
  
  const startDate = currentSemester.range.start;
  const endDate = currentSemester.range.end;
  
  setShowClearCalendarMenu(false);
  closeAllModals();
  
  // Clear assignments and reload calendar data
  clearAssignmentsInRange(startDate, endDate);
  
  // Reload the current course calendar to reflect changes
  if (selectedCourse) {
    loadCourseCalendar(selectedCourse);
  }
};
```

### 2. 🔄 **Code Duplication: Date Formatting**
**Location:** `Calendar.js` - appears 13+ times

**Issue:** The pattern `.toISOString().split('T')[0]` is repeated throughout the codebase.

**Recommendation:** Create a utility function in `calendarUtils.js`:
```javascript
// Convert Date object to ISO date string (YYYY-MM-DD)
export const dateToISOString = (date) => {
  if (!date) return null;
  if (typeof date === 'string') {
    // If already a string, try to parse it first
    const parsed = parseDate(date);
    return parsed ? parsed.toISOString().split('T')[0] : date;
  }
  return date.toISOString().split('T')[0];
};
```

Then replace all instances:
- Line 415: `const dateStr = date.toISOString().split('T')[0];`
- Line 437: `const targetDateStr = targetDateObj.toISOString().split('T')[0];`
- Line 1013: `const dateStr = date.toISOString().split('T')[0];`
- And 10+ more instances

### 3. ⏱️ **Nested setTimeout Calls**
**Location:** `Calendar.js` lines 2045-2051

**Issue:** Nested `setTimeout` calls with arbitrary delays suggest timing issues that could be handled more elegantly.

**Current Code:**
```javascript
setTimeout(() => {
  clearAssignmentsInRange(startDate, endDate);
  setTimeout(() => {
    window.location.reload();
  }, 200);
}, 50);
```

**Recommendation:** Use async/await or Promise-based approach, or better yet, remove the need for delays by using proper state management:
```javascript
const confirmClearCurrentSemester = async () => {
  // ... validation ...
  
  setShowClearCalendarMenu(false);
  closeAllModals();
  
  // Clear assignments
  clearAssignmentsInRange(startDate, endDate);
  
  // Use useEffect or direct state update instead of setTimeout
  if (selectedCourse) {
    await loadCourseCalendar(selectedCourse);
  }
};
```

### 4. 🔧 **flushSync Usage - Potential Over-Engineering**
**Location:** `Calendar.js` lines 644-656

**Issue:** Using `flushSync` suggests trying to force synchronous updates, which may indicate a state management issue.

**Current Code:**
```javascript
flushSync(() => {
  setPickedUpScheduleItem(null);
});

requestAnimationFrame(() => {
  shouldStopDragRef.current = true;
  pickedUpScheduleItemRef.current = null;
  flushSync(() => {
    setPickedUpScheduleItem(null);
  });
});
```

**Recommendation:** Review if `flushSync` is truly necessary. React's state updates should handle this. Consider using refs for immediate values and state for render updates:
```javascript
// Clear refs immediately (synchronous)
shouldStopDragRef.current = true;
pickedUpScheduleItemRef.current = null;

// Update state (async, but React will batch)
setPickedUpScheduleItem(null);
```

### 5. 📦 **File Size: Calendar.js is Large (2616 lines)**
**Issue:** The main `Calendar.js` file is very large, making it harder to maintain.

**Recommendation:** Consider splitting into smaller components or custom hooks:
- Extract class schedule logic into `useClassSchedule.js` hook
- Extract calendar clearing logic into `useCalendarClearing.js` hook
- Move complex handlers into separate utility files

### 6. ✅ **Good Practices Found**
- ✅ Using custom hooks for state management (`useCourseCalendars`, `useDefaultCalendars`, etc.)
- ✅ Using debug utilities instead of `console.log`
- ✅ Proper error handling with try-catch blocks
- ✅ Good separation of concerns with utility functions

### 7. 🔍 **Minor Issues**

#### Unused Import Check
- `mavericksLogo` - verify if it's actually used in the render
- `navigate` - confirmed used (5 times), so it's fine

#### Date Parsing Consistency
- Multiple date parsing functions exist (`parseDate`, `normalizeDate`, `normalizeClassScheduleDate`)
- Consider consolidating or clearly documenting when to use each

## Priority Recommendations

### High Priority
1. **Replace `window.location.reload()`** - This is the most critical issue affecting UX
2. **Create date formatting utility** - Reduces code duplication significantly

### Medium Priority
3. **Simplify setTimeout chains** - Improve code clarity
4. **Review flushSync usage** - May be unnecessary

### Low Priority
5. **Consider file splitting** - If the codebase continues to grow
6. **Document date utility functions** - Clarify when to use each

## Implementation Notes

- All changes should maintain existing functionality
- Test thoroughly after each refactoring
- Consider adding unit tests for utility functions
- Update any related documentation

## Testing Checklist
After refactoring, verify:
- [ ] Clear calendar functionality works without page reload
- [ ] Date formatting is consistent across all components
- [ ] Class schedule drag-and-drop still works correctly
- [ ] Calendar navigation respects semester boundaries
- [ ] Import/export functionality remains intact

