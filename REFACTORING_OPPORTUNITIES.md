# Calendar Code Refactoring Opportunities

## Summary
This document identifies code duplication and refactoring opportunities in the calendar codebase, particularly around item movement and cascading logic.

## Key Findings

### 1. Duplicate Holiday Date Building Logic ⚠️ **HIGH PRIORITY**
**Location:** `Calendar.js` - appears in 3+ functions:
- `handleScheduleItemDrop` (lines 463-478)
- `handlePushForward` (lines 670-683)
- `handlePushBack` (lines 752-765)

**Issue:** The same code block for building holiday dates (including Thanksgiving special case) is duplicated across multiple functions.

**Solution:** ✅ **CREATED** - `buildHolidayDateSetFromSchedule()` utility function in `holidayUtils.js`

**Usage:**
```javascript
import { buildHolidayDateSetFromSchedule } from '../utils/holidayUtils';
import { isFixedItem } from '../utils/calendarUtils';

const holidayDates = buildHolidayDateSetFromSchedule(classSchedule, isFixedItem);
```

### 2. Duplicate "Check if Item is on Class Day" Pattern ⚠️ **HIGH PRIORITY**
**Location:** `Calendar.js` - appears 21+ times throughout the file

**Issue:** The pattern of checking if an item is on a class day is repeated:
```javascript
const [year, month, day] = item.date.split('-').map(Number);
const itemDate = new Date(year, month - 1, day);
return isClassDay(itemDate, courseSchedule, holidayDates);
```

**Solution:** ✅ **CREATED** - `isItemOnClassDay()` utility function in `classDayUtils.js`

**Usage:**
```javascript
import { isItemOnClassDay } from '../utils/classDayUtils';

if (isItemOnClassDay(item, courseSchedule, holidayDates)) {
  // Item is on a class day
}
```

### 3. Duplicate "Filter Items on Class Days" Pattern ⚠️ **MEDIUM PRIORITY**
**Location:** `Calendar.js` - appears in multiple functions

**Issue:** The pattern of filtering items to only include those on class days is repeated:
```javascript
.filter(item => {
  if (isFixedItem(item)) return false;
  // ... date parsing and isClassDay check
  return isClassDay(itemDate, courseSchedule, holidayDates);
})
```

**Solution:** ✅ **CREATED** - `filterItemsOnClassDays()` utility function in `classDayUtils.js`

**Usage:**
```javascript
import { filterItemsOnClassDays } from '../utils/classDayUtils';

const itemsOnClassDays = filterItemsOnClassDays(items, courseSchedule, holidayDates);
```

### 4. Duplicate Schedule Conversion for cascadeMoveItems ⚠️ **MEDIUM PRIORITY**
**Location:** `Calendar.js` - appears in `handleScheduleItemDrop` and `handlePushBack`

**Issue:** Converting schedule items to the format expected by `cascadeMoveItems` is duplicated.

**Potential Solution:** Create a utility function:
```javascript
export const convertScheduleForCascade = (classSchedule) => {
  return classSchedule.map(item => {
    const itemType = getClassScheduleItemType(item.description);
    const isFixed = isFixedItem(item);
    
    return {
      type: 'classSchedule',
      date: item.date,
      itemName: item.description,
      description: item.description,
      classScheduleType: itemType,
      isClassSchedule: true,
      isFixedHoliday: isFixed
    };
  });
};
```

### 5. Long Functions ⚠️ **LOW PRIORITY**
**Location:** `Calendar.js`
- `handlePushBack` (~276 lines) - Could be broken into smaller functions
- `handleScheduleItemDrop` (~200+ lines) - Complex logic that could be modularized

**Recommendation:** Consider breaking these into smaller, focused functions:
- `findSourceItemForPushBack()`
- `handlePushBackWithOccupiedTarget()`
- `handlePushBackWithEmptyTarget()`

## Next Steps

1. ✅ **COMPLETED:** Replace duplicate holiday date building with `buildHolidayDateSetFromSchedule()`
2. ✅ **COMPLETED:** Replace duplicate class day checks with `isItemOnClassDay()`
3. ✅ **COMPLETED:** Replace duplicate filtering with `filterItemsOnClassDays()` (where applicable)
4. ✅ **COMPLETED:** Create schedule conversion utility (`convertScheduleForCascade()`)
5. **Future:** Consider refactoring long functions (`handlePushBack`, `handleScheduleItemDrop`) into smaller, focused functions

## Refactoring Status

### ✅ Completed Refactorings

1. **Holiday Date Building** - Replaced 3 instances with `buildHolidayDateSetFromSchedule()`
   - `handleScheduleItemDrop` (line 464)
   - `handlePushForward` (line 657)
   - `handlePushBack` (line 720)

2. **Class Day Checks** - Replaced 8+ instances with `isItemOnClassDay()`
   - Multiple locations in `handlePushBack`
   - Multiple locations in `handlePushForward`
   - Multiple locations in `handleScheduleItemDrop`

3. **Schedule Conversion** - Replaced 2 instances with `convertScheduleForCascade()`
   - `handleScheduleItemDrop` (line 506)
   - `handlePushBack` (line 850)

### 📊 Impact

- **Lines of code reduced:** ~50+ lines of duplicate code eliminated
- **Maintainability:** Single source of truth for common operations
- **Consistency:** All functions now use the same logic for these operations

## Notes

- The push back logic has a known issue when clicking on a class day (Wednesday) - it works when using dead zones. This may need investigation.
- All utility functions have been created and integrated.
- Consider adding unit tests for the new utility functions.

