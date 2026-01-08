# Calendar Edit Mode Code Documentation

This document contains all the code related to the calendar edit mode functionality, specifically for picking up and moving date boxes in the class schedule calendar.

## Table of Contents

1. [State Variables](#state-variables)
2. [Main Handler Functions](#main-handler-functions)
3. [Hooks](#hooks)
4. [Components](#components)
5. [Utility Functions](#utility-functions)
6. [Calendar Grid Integration](#calendar-grid-integration)

---

## State Variables

### From `Calendar.js` (lines 69-78)

```javascript
// Class schedule data
const [classSchedule, setClassSchedule] = useState([]);

// Class schedule edit mode: track picked up item
const [pickedUpScheduleItem, setPickedUpScheduleItem] = useState(null);
const [scheduleItemDragPosition, setScheduleItemDragPosition] = useState(null);

// Class schedule edit mode: track original schedule for undo
const [classScheduleSnapshot, setClassScheduleSnapshot] = useState(null);

// Right-click editing state
const [editingDate, setEditingDate] = useState(null);
const [editingValue, setEditingValue] = useState('');

// Refs for drag handling
const pickedUpScheduleItemRef = useRef(null);
const shouldStopDragRef = useRef(false);
```

---

## Main Handler Functions

### 1. Enter/Exit Edit Mode

#### `handleEnterClassEditMode()` (lines 360-371)

```javascript
// Handle entering edit mode for class calendar - take snapshot
const handleEnterClassEditMode = () => {
  if (calendarMode === 'class') {
    // Take a snapshot of current class schedule when entering edit mode
    setClassScheduleSnapshot(JSON.parse(JSON.stringify(classSchedule)));
    // Clear any stuck picked up items when entering edit mode
    shouldStopDragRef.current = true;
    pickedUpScheduleItemRef.current = null;
    setPickedUpScheduleItem(null);
  }
  handleEnterEditMode();
};
```

#### `handleExitClassEditMode()` (lines 373-384)

```javascript
// Handle exiting edit mode for class calendar - save changes
const handleExitClassEditMode = () => {
  if (calendarMode === 'class') {
    // Save changes to localStorage
    const scheduleKey = `classSchedule_${selectedCourse}`;
    localStorage.setItem(scheduleKey, JSON.stringify(classSchedule));
    setClassScheduleSnapshot(null);
  }
  // Clear any picked up items when exiting edit mode
  setPickedUpScheduleItem(null);
  handleExitEditMode();
};
```

#### `handleUndoClassChanges()` (lines 386-393)

```javascript
// Handle undo for class calendar
const handleUndoClassChanges = () => {
  if (calendarMode === 'class' && classScheduleSnapshot) {
    setClassSchedule([...classScheduleSnapshot]);
    const scheduleKey = `classSchedule_${selectedCourse}`;
    localStorage.setItem(scheduleKey, JSON.stringify(classScheduleSnapshot));
  }
};
```

#### `hasClassScheduleChanges()` (lines 395-399)

```javascript
// Check if class schedule has changes
const hasClassScheduleChanges = () => {
  if (calendarMode !== 'class' || !classScheduleSnapshot) return false;
  return JSON.stringify(classSchedule) !== JSON.stringify(classScheduleSnapshot);
};
```

### 2. Pickup Handler

#### `handleScheduleItemPickup()` (lines 401-421)

```javascript
// Handle class schedule item pickup
const handleScheduleItemPickup = (date, scheduleItem, event) => {
  if (!isEditMode || calendarMode !== 'class') {
    if (date === null && scheduleItem === null) {
      // Cancel pickup
      setPickedUpScheduleItem(null);
    }
    return;
  }
  
  if (!date || !scheduleItem) {
    setPickedUpScheduleItem(null);
    return;
  }
  
  const dateStr = dateToISOString(date);
  setPickedUpScheduleItem({ 
    ...scheduleItem, 
    sourceDate: dateStr
  });
};
```

### 3. Drop Handler

#### `handleScheduleItemDrop()` (lines 423-626)

```javascript
// Handle class schedule item drop (with cascading)
const handleScheduleItemDrop = (targetDate) => {
  debugLog('handleScheduleItemDrop called', { targetDate, pickedUpScheduleItem, isEditMode, calendarMode });
  
  if (!isEditMode || calendarMode !== 'class' || !pickedUpScheduleItem) {
    debugLog('Early return - conditions not met', { isEditMode, calendarMode, hasPickedUpItem: !!pickedUpScheduleItem });
    // Clear state even on early return
    shouldStopDragRef.current = true;
    pickedUpScheduleItemRef.current = null;
    setPickedUpScheduleItem(null);
    return;
  }
  
  // Format dates consistently - use YYYY-MM-DD format
  const targetDateObj = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const targetDateStr = dateToISOString(targetDate);
  const sourceDateStr = pickedUpScheduleItem.sourceDate;
  
  debugLog('Drop attempt', { sourceDateStr, targetDateStr, targetDate });
  
  // Don't do anything if dropping on the same date
  if (targetDateStr === sourceDateStr) {
    debugLog('Dropping on same date - cancelling');
    setPickedUpScheduleItem(null);
    return;
  }
  
  // Get course schedule for cascading
  const courseSchedule = getCourseSchedule(selectedCourse, COURSES);
  if (!courseSchedule) {
    debugError('Could not determine course schedule for cascading');
    setPickedUpScheduleItem(null);
    return;
  }
  
  debugLog('Course schedule:', courseSchedule);
  
  // Create a working copy of class schedule first
  const updatedSchedule = [...classSchedule]; // Use spread to ensure new array reference
  
  // Build holiday date set from class schedule items (holidays and final exams) for cascading logic
  const holidayDates = buildHolidayDateSetFromSchedule(updatedSchedule, isFixedItem);
  
  debugLog('Holiday dates set:', Array.from(holidayDates));
  
  // Get the item name/description from picked up item (could be itemName or description)
  const itemNameToMatch = pickedUpScheduleItem.itemName || pickedUpScheduleItem.description;
  debugLog('Looking for item to move', { sourceDateStr, itemName: itemNameToMatch, scheduleLength: updatedSchedule.length });
  debugLog('Current schedule items:', updatedSchedule.map(i => ({ date: i.date, description: i.description })));
  
  // Find the item being moved by matching date and description
  const itemToMove = updatedSchedule.find(item => 
    item.date === sourceDateStr && item.description === itemNameToMatch
  );
  if (!itemToMove) {
    debugError('Could not find item to move', { sourceDateStr, itemName: itemNameToMatch, pickedUpItem: pickedUpScheduleItem, availableItems: updatedSchedule.map(i => ({ date: i.date, description: i.description })) });
    setPickedUpScheduleItem(null);
    return;
  }
  
  debugLog('Found item to move:', itemToMove);
  
  // Check if target date is a class day (not a dead zone)
  const isTargetClassDay = isClassDay(targetDateObj, courseSchedule, holidayDates);
  
  // Check if target date is empty (no item on target date)
  // Exclude fixed holidays and final exams from collision check - they don't count as "occupied"
  const targetDateItem = updatedSchedule.find(item => {
    if (item.date !== targetDateStr) return false;
    // Only count as occupied if it's NOT a fixed item
    return !isFixedItem(item);
  });
  const isTargetEmpty = !targetDateItem;
  
  debugLog('Target date status', { 
    targetDateStr, 
    isTargetClassDay,
    isTargetEmpty, 
    targetItem: targetDateItem,
    allItemsOnTarget: updatedSchedule.filter(item => item.date === targetDateStr).map(i => ({ desc: i.description, isFixed: isFixedItem(i) }))
  });
  
  // Convert to format expected by cascadeMoveItems
  const scheduleItemsForCascade = convertScheduleForCascade(updatedSchedule, getClassScheduleItemType, isFixedItem);
  
  let cascadedItems;
  
  // If target is a dead zone (not a class day), just move the item there without cascading
  if (!isTargetClassDay) {
    debugLog('Target is a dead zone (not a class day) - simple move, no cascading');
    cascadedItems = scheduleItemsForCascade.map(item => {
      if (item.date === sourceDateStr && item.itemName === itemNameToMatch) {
        return { ...item, date: targetDateStr };
      }
      return item;
    });
  } else if (isTargetEmpty) {
    // Target is a class day and empty - just move the item, no cascading
    debugLog('Target is empty class day - simple move, no cascading');
    cascadedItems = scheduleItemsForCascade.map(item => {
      if (item.date === sourceDateStr && item.itemName === itemNameToMatch) {
        return { ...item, date: targetDateStr };
      }
      return item;
    });
  } else {
    // Target is a class day and has an item - replace it and cascade
    debugLog('Calling cascadeMoveItems (target occupied class day)', { 
      itemsCount: scheduleItemsForCascade.length, 
      sourceDateStr, 
      targetDateStr, 
      courseSchedule,
      itemNameToMatch
    });
    
    cascadedItems = cascadeMoveItems(
      scheduleItemsForCascade,
      sourceDateStr,
      targetDateStr,
      courseSchedule,
      holidayDates,
      itemNameToMatch  // Pass the item description to uniquely identify the item
    );
  }
  
  debugLog('Cascaded items result', cascadedItems);
  debugLog('Cascaded items count:', cascadedItems.length);
  
  if (!cascadedItems || cascadedItems.length === 0) {
    debugError('Cascade function returned no items!');
    setPickedUpScheduleItem(null);
    return;
  }
  
  // Update class schedule with new dates
  // Create a map of cascaded items by description for quick lookup
  const cascadedMap = new Map();
  cascadedItems.forEach(ci => {
    const key = ci.itemName || ci.description;
    if (key) {
      cascadedMap.set(key, ci);
    }
  });
  
  debugLog('Cascaded map created with', cascadedMap.size, 'items');
  debugLog('Fixed items in original schedule:', updatedSchedule
    .filter(item => isFixedItem(item))
    .map(i => ({ desc: i.description, date: i.date })));
  
  const newClassSchedule = updatedSchedule.map(item => {
    // Check if this is a fixed item (holiday or final exam) - NEVER update these
    if (isFixedItem(item)) {
      // Fixed items should NEVER have their dates changed - preserve original date
      debugLog('Preserving fixed item date (holiday/final exam)', { 
        description: item.description, 
        date: item.date 
      });
      return item; // Return unchanged
    }
    
    // Find the cascaded item that matches this description
    const key = item.description;
    const cascadedItem = cascadedMap.get(key);
    
    if (cascadedItem) {
      // Only update the date from cascaded item if it's not a fixed item
      const newDate = cascadedItem.date;
      if (newDate !== item.date) {
        debugLog('Updating item date', { 
          oldDate: item.date, 
          newDate: newDate, 
          description: item.description 
        });
      }
      return { ...item, date: newDate };
    }
    // If not found in cascaded items, keep original
    debugWarn('Item not found in cascaded items, keeping original date', item.description);
    return item;
  });
  
  debugLog('New class schedule (first 5 items):', newClassSchedule.slice(0, 5));
  debugLog('Total items in new schedule:', newClassSchedule.length);
  
  // Force a state update with a new array reference
  setClassSchedule([...newClassSchedule]);
  
  // Clear picked up item AFTER schedule update to ensure ghost disappears
  // Set stop flag FIRST to immediately stop mousemove handler (refs are synchronous)
  shouldStopDragRef.current = true;
  pickedUpScheduleItemRef.current = null;
  
  // Clear state - React will batch this update, which is fine since refs already stop the drag
  setPickedUpScheduleItem(null);
  
  // Don't save to localStorage here - wait for Save Changes button
  // Changes are saved when exiting edit mode via handleExitClassEditMode
  
  debugLog('Drop completed successfully - state updated', {
    pickedUpScheduleItemCleared: true,
    shouldStopDrag: shouldStopDragRef.current,
    pickedUpScheduleItemRef: pickedUpScheduleItemRef.current
  });
};
```

### 4. Push Forward/Back Handlers

#### `handlePushForward()` (lines 628-693)

```javascript
// Handle pushing items forward (filling a gap by moving items after the empty date forward)
const handlePushForward = (emptyDate) => {
  if (!isEditMode || calendarMode !== 'class') return;
  
  const emptyDateStr = dateToISOString(emptyDate);
  debugLog('Push forward called for empty date:', emptyDateStr);
  
  // Get course schedule
  const courseSchedule = getCourseSchedule(selectedCourse, COURSES);
  if (!courseSchedule) {
    debugError('Could not determine course schedule');
    return;
  }
  
  // Build holiday dates set
  const holidayDates = buildHolidayDateSetFromSchedule(classSchedule, isFixedItem);
  
  // Find all items that come AFTER the empty date AND are on class days (sorted by date)
  // Items in "dead zones" (non-class days) are ignored by push/pull operations
  const itemsAfterEmpty = classSchedule
    .filter(item => {
      if (isFixedItem(item)) return false; // Don't move fixed items
      if (item.date <= emptyDateStr) return false; // Must be after empty date
      
      return isItemOnClassDay(item, courseSchedule, holidayDates);
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  
  if (itemsAfterEmpty.length === 0) {
    debugLog('No items to push forward');
    return;
  }
  
  debugLog(`Pushing ${itemsAfterEmpty.length} items forward from ${emptyDateStr}`);
  
  // Move each item forward by one class day
  const updatedSchedule = [...classSchedule];
  let currentDate = new Date(emptyDate);
  currentDate.setDate(currentDate.getDate() + 1); // Start from day after empty date
  
  itemsAfterEmpty.forEach((item, index) => {
    const itemIndex = updatedSchedule.findIndex(si => 
      si.date === item.date && si.description === item.description
    );
    
    if (itemIndex !== -1) {
      // Find the next class day for this item
      const nextClassDay = findNextClassDay(currentDate, courseSchedule, holidayDates);
      if (nextClassDay) {
        const nextDateStr = dateToISOString(nextClassDay);
        updatedSchedule[itemIndex] = { ...updatedSchedule[itemIndex], date: nextDateStr };
        currentDate = nextClassDay; // Update current date for next iteration
      }
    }
  });
  
  setClassSchedule(updatedSchedule);
};
```

#### `handlePushBack()` (lines 695-850+)

```javascript
// Handle pushing items backward (creating a gap by moving the item from previous class day to empty date)
const handlePushBack = (emptyDate) => {
  if (!isEditMode || calendarMode !== 'class') return;
  
  const emptyDateStr = dateToISOString(emptyDate);
  debugLog('Push back called for empty date:', emptyDateStr);
  
  // Get course schedule
  const courseSchedule = getCourseSchedule(selectedCourse, COURSES);
  if (!courseSchedule) {
    debugError('Could not determine course schedule');
    return;
  }
  
  // Build holiday dates set
  const holidayDates = buildHolidayDateSetFromSchedule(classSchedule, isFixedItem);
  
  // Check if the clicked date is a class day or a dead zone
  const isClickedDateClassDay = isClassDay(emptyDate, courseSchedule, holidayDates);
  
  let targetClassDay;
  let targetDateStr;
  
  if (isClickedDateClassDay) {
    // If clicked on a class day, use it as the target
    targetClassDay = emptyDate;
    targetDateStr = emptyDateStr;
  } else {
    // If clicked on a dead zone, find the next class day after it
    targetClassDay = findNextClassDay(emptyDate, courseSchedule, holidayDates);
    if (!targetClassDay) {
      debugWarn(`Could not find next class day after ${emptyDateStr}`);
      return;
    }
    targetDateStr = dateToISOString(targetClassDay);
  }
  
  // Check if the target class day has an item on it
  // Only check items that are on class days (dead zone items don't count as obstacles)
  const itemOnTarget = classSchedule.find(item => {
    if (item.date !== targetDateStr) return false;
    if (isFixedItem(item)) return false; // Fixed items don't block
    
    return isItemOnClassDay(item, courseSchedule, holidayDates);
  });
  
  let sourceClassDay = null;
  let itemOnSourceDay = null;
  let sourceDateStr = null;
  
  if (itemOnTarget) {
    // If target has an item, we want to push that item back to the previous class day
    // First, find the previous class day before the target
    const prevClassDay = findPreviousClassDay(targetClassDay, courseSchedule, holidayDates);
    if (!prevClassDay) {
      const message = `No previous class day found before ${targetDateStr}. Cannot push back.`;
      debugLog(message);
      alert(message);
      return;
    }
    
    const prevDateStr = dateToISOString(prevClassDay);
    
    // Check if the previous class day has an item (only check items on class days)
    const itemOnPrev = classSchedule.find(item => {
      if (item.date !== prevDateStr) return false;
      if (isFixedItem(item)) return false;
      
      return isItemOnClassDay(item, courseSchedule, holidayDates);
    });
    
    if (itemOnPrev) {
      // Previous class day is occupied - we need to cascade forward first
      // This will be handled by the cascade logic below, but we need to set up the move correctly
      // We'll move the item on the target date to the previous date, which will trigger cascading
      debugLog(`Previous class day ${prevDateStr} is occupied by ${itemOnPrev.description}. Will cascade forward.`);
    }
    
    // Push back the item that's on the target date
    sourceClassDay = targetClassDay;
    itemOnSourceDay = itemOnTarget;
    sourceDateStr = targetDateStr;
    targetDateStr = prevDateStr;
    targetClassDay = prevClassDay;
    
    debugLog(`Pushing back item on clicked date: ${itemOnSourceDay.description} from ${sourceDateStr} to ${targetDateStr}`);
  } else {
    // Target is empty, find the next class day with an item after the target date
    // Start searching from the day after the target
    let searchDate = new Date(targetClassDay);
    searchDate.setDate(searchDate.getDate() + 1);
    
    // Search for the first class day with an item
    for (let attempts = 0; attempts < 100; attempts++) {
      const nextClassDay = findNextClassDay(searchDate, courseSchedule, holidayDates);
      if (!nextClassDay) {
        break; // No more class days found
      }
      
      const nextDateStr = dateToISOString(nextClassDay);
      // Only find items that are on class days (dead zone items don't count)
      const itemOnNext = classSchedule.find(item => {
        if (item.date !== nextDateStr) return false;
        if (isFixedItem(item)) return false;
        
        return isItemOnClassDay(item, courseSchedule, holidayDates);
      });
      
      if (itemOnNext) {
        // Found an item - this is what we'll push back
        sourceClassDay = nextClassDay;
        itemOnSourceDay = itemOnNext;
        sourceDateStr = nextDateStr;
        break;
      }
      
      // Move to next class day and continue searching
      searchDate = new Date(nextClassDay);
      searchDate.setDate(searchDate.getDate() + 1);
    }
  }
  
  if (!itemOnSourceDay) {
    debugLog('No item found to push back');
    return;
  }
  
  // Now perform the push back operation
  // If the target date is occupied, we need to cascade
  const targetHasItem = classSchedule.find(item => {
    if (item.date !== targetDateStr) return false;
    if (isFixedItem(item)) return false;
    return isItemOnClassDay(item, courseSchedule, holidayDates);
  });
  
  if (targetHasItem) {
    // Use cascade logic to handle the push back
    const scheduleItemsForCascade = convertScheduleForCascade(classSchedule, getClassScheduleItemType, isFixedItem);
    const itemNameToMatch = itemOnSourceDay.description;
    
    const cascadedItems = cascadeMoveItems(
      scheduleItemsForCascade,
      sourceDateStr,
      targetDateStr,
      courseSchedule,
      holidayDates,
      itemNameToMatch
    );
    
    if (cascadedItems && cascadedItems.length > 0) {
      const cascadedMap = new Map();
      cascadedItems.forEach(ci => {
        const key = ci.itemName || ci.description;
        if (key) {
          cascadedMap.set(key, ci);
        }
      });
      
      const newClassSchedule = classSchedule.map(item => {
        if (isFixedItem(item)) {
          return item;
        }
        
        const key = item.description;
        const cascadedItem = cascadedMap.get(key);
        
        if (cascadedItem) {
          return { ...item, date: cascadedItem.date };
        }
        return item;
      });
      
      setClassSchedule([...newClassSchedule]);
    }
  } else {
    // Simple move - target is empty
    const updatedSchedule = classSchedule.map(item => {
      if (item.date === sourceDateStr && item.description === itemOnSourceDay.description) {
        return { ...item, date: targetDateStr };
      }
      return item;
    });
    
    setClassSchedule(updatedSchedule);
  }
};
```

### 5. ESC Key Handler (lines 300-309)

```javascript
// ESC cancels class carry
useEffect(() => {
  const onEsc = (e) => {
    if (e.key === 'Escape' && pickedUpScheduleItem && calendarMode === 'class' && isEditMode) {
      setPickedUpScheduleItem(null);
    }
  };
  window.addEventListener('keydown', onEsc);
  return () => window.removeEventListener('keydown', onEsc);
}, [pickedUpScheduleItem, calendarMode, isEditMode]);
```

---

## Hooks

### `useEditMode.js` - Complete File

```javascript
import { useState } from 'react';

/**
 * Custom hook to manage edit mode functionality for calendar assignments
 * 
 * @param {Object} params - Configuration object
 * @param {Object} params.manualAdjustments - Current manual adjustments
 * @param {Function} params.setManualAdjustments - Setter for manual adjustments
 * @param {Function} params.getCourseCalendar - Function to get course calendar data
 * @param {Function} params.setCourseCalendar - Function to set course calendar data
 * @param {string} params.selectedCourse - Currently selected course ID
 * @param {Function} params.handleAssignmentDragEnd - Function to clear drag state
 * @returns {Object} Edit mode state and handlers
 */
export const useEditMode = ({
  manualAdjustments,
  setManualAdjustments,
  getCourseCalendar,
  setCourseCalendar,
  selectedCourse,
  handleAssignmentDragEnd
}) => {
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editModeSnapshot, setEditModeSnapshot] = useState(null);

  // Check if changes have been made (compare current adjustments with snapshot)
  const hasChanges = () => {
    if (editModeSnapshot === null) return false;
    return JSON.stringify(manualAdjustments) !== JSON.stringify(editModeSnapshot);
  };

  // Handle entering edit mode
  const handleEnterEditMode = () => {
    // Take a snapshot of current adjustments when entering edit mode
    setEditModeSnapshot(JSON.parse(JSON.stringify(manualAdjustments)));
    // Clear any drag state
    if (handleAssignmentDragEnd) {
      handleAssignmentDragEnd();
    }
    setIsEditMode(true);
  };

  // Handle exiting edit mode
  const handleExitEditMode = () => {
    // Save changes permanently when exiting edit mode
    const courseData = getCourseCalendar(selectedCourse);
    if (courseData) {
      setCourseCalendar(selectedCourse, {
        ...courseData,
        manualAdjustments: manualAdjustments
      });
    }
    // Clear any drag state
    if (handleAssignmentDragEnd) {
      handleAssignmentDragEnd();
    }
    setIsEditMode(false);
    setEditModeSnapshot(null);
  };

  // Handle undo - revert to snapshot
  const handleUndo = () => {
    if (editModeSnapshot !== null && hasChanges()) {
      setManualAdjustments(JSON.parse(JSON.stringify(editModeSnapshot)));
    }
  };

  return {
    // State
    isEditMode,
    editModeSnapshot,
    // Handlers
    handleEnterEditMode,
    handleExitEditMode,
    handleUndo,
    hasChanges
  };
};
```

### `useDragAndDrop.js` - Key Functions for Assignments

Note: This hook is primarily for assignment drag-and-drop, but the pattern is similar. The class schedule uses a simpler click-to-pick/click-to-drop pattern instead of drag-and-drop.

---

## Components

### `EditableClassScheduleDay.js` - Complete File

```javascript
import React from 'react';

/**
 * Component for rendering an editable class schedule item.
 * This is used ONLY in edit contexts (like semester edit view).
 * It handles pickup/drop interactions.
 */
const EditableClassScheduleDay = ({ 
  classScheduleItem, 
  date, 
  isPickedUp,
  isFixed,
  onPickup,
  onDrop,
  onCancelPickup
}) => {
  const handleClick = (e) => {
    e.stopPropagation();
    
    if (isFixed) {
      // Fixed items can't be moved
      return;
    }
    
    if (isPickedUp) {
      // Cancel pickup if clicking the same item
      onCancelPickup();
    } else {
      // Pick up the item
      onPickup(date, classScheduleItem, e);
    }
  };

  const handleDayClick = (e) => {
    // If clicking on the day (not the text) and we have a picked up item, drop it
    if (!e.target.closest('.class-schedule-text') && !isPickedUp) {
      onDrop(date);
    }
  };

  return (
    <div 
      className="class-schedule-text"
      onClick={handleClick}
      style={{ 
        cursor: isFixed ? 'not-allowed' : (isPickedUp ? 'grabbing' : 'grab'),
        opacity: isPickedUp ? 0.3 : 1,
        userSelect: 'none'
      }}
    >
      {classScheduleItem.itemName}
    </div>
  );
};

export default EditableClassScheduleDay;
```

### `ClassScheduleDay.js` - Complete File

```javascript
import React from 'react';

/**
 * Component for rendering a class schedule item in a calendar day.
 * Shows picked-up state when item is being moved.
 */
const ClassScheduleDay = ({ 
  classScheduleItem, 
  date,
  pickedUp = false
}) => {
  return (
    <div
      className={`class-schedule-chip${pickedUp ? ' picked' : ''}`}
      title="Click a day to pick up / drop class schedule"
    >
      {classScheduleItem.itemName || classScheduleItem.description}
    </div>
  );
};

export default ClassScheduleDay;
```

---

## Calendar Grid Integration

### Key Section from `CalendarGrid.js` (lines 214-310)

This shows how the calendar grid handles click events for picking up and dropping schedule items:

```javascript
onClick={(e) => {
  e.stopPropagation();
  
  console.log('Calendar day clicked', {
    date: date.toISOString().split('T')[0],
    isEditMode,
    calendarMode,
    dateAssignmentsCount: dateAssignments.length,
    hasClassScheduleItem: dateAssignments.some(item => item.isClassSchedule),
    hasPickedUpItem: !!pickedUpScheduleItem
  });
  
  // ===== CLASS MODE: click-to-pick, click-to-drop =====
  if (isEditMode && calendarMode === 'class') {
    const clickedElement = e.target;
    const isClickingAssignment = clickedElement.closest('.assignment-item');
    
    // If clicking on the assignment itself, don't handle here (let assignment handle it)
    if (isClickingAssignment) {
      return;
    }
    
    // If we have a picked up schedule item, drop it on this date (click-to-drop)
    if (pickedUpScheduleItem && onScheduleItemDrop) {
      e.preventDefault();
      e.stopPropagation();
      onScheduleItemDrop(date);
      return;
    }
    
    // If no item is picked up and this date has a schedule item, pick it up
    if (!pickedUpScheduleItem && classScheduleItem && onScheduleItemPickup) {
      e.preventDefault();
      e.stopPropagation();
      // Find the actual schedule item from the date assignments
      const scheduleItem = dateAssignments.find(item => item.isClassSchedule);
      if (scheduleItem) {
        // Find the actual item from classSchedule array by matching date and description
        const dateStr = date.toISOString().split('T')[0];
        const actualScheduleItem = classSchedule.find(item => 
          item.date === dateStr && item.description === scheduleItem.itemName
        );
        if (actualScheduleItem) {
          onScheduleItemPickup(date, actualScheduleItem, e);
        }
      }
      return;
    }
    
    // If clicking on an empty date box (no schedule item), show push forward/back menu
    // This should be the last check in class mode
    const hasClassScheduleItem = dateAssignments.some(item => item.isClassSchedule);
    const dateStr = date.toISOString().split('T')[0];
    
    console.log('Checking for empty date menu', {
      date: dateStr,
      hasPickedUpItem: !!pickedUpScheduleItem,
      hasClassScheduleItem,
      hasPushHandlers: !!(onPushForward || onPushBack),
      dateAssignments: dateAssignments.map(a => ({ name: a.itemName, isClass: a.isClassSchedule }))
    });
    
    if (!pickedUpScheduleItem && !hasClassScheduleItem && (onPushForward || onPushBack)) {
      console.log('Empty date detected, showing menu');
      e.preventDefault();
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      
      // Check if this is a potential class day (Mon, Tue, Wed, Thu - not weekend)
      // Allow any weekday that could be a class day, regardless of current schedule
      const dayOfWeek = date.getDay();
      const schedule = courseSchedule || (calendarMode === 'class' ? 'TR' : 'MW');
      // Allow Monday (1), Tuesday (2), Wednesday (3), or Thursday (4)
      const isPotentialClassDay = dayOfWeek >= 1 && dayOfWeek <= 4;
      
      console.log('Class day check', { 
        dayOfWeek, 
        schedule, 
        isPotentialClassDay, 
        courseSchedule,
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]
      });
      
      if (isPotentialClassDay) {
        const menuPos = {
          top: rect.top + rect.height / 2,
          left: rect.left + rect.width / 2
        };
        console.log('Showing push menu', { date: dateStr, menuPos });
        setSelectedEmptyDate(date);
        setEmptyDateMenuPosition(menuPos);
      } else {
        console.log('Not a potential class day (weekend), not showing menu');
      }
      return;
    }
  }
  
  // ... rest of click handler for assignment mode ...
}}
```

---

## Utility Functions

### Required Imports from `Calendar.js`

```javascript
import {
  normalizeDate,
  parseCsvFile,
  parseClassScheduleCsv,
  monthNames,
  copyAndShiftTRtoMW,
  getCourseSchedule,
  normalizeClassScheduleDate,
  isFixedItem,
  getClassScheduleItemType,
  dateToISOString
} from "../utils/calendarUtils";
import { validateCsvFiles } from "../utils/csvValidation";
import { 
  cascadeMoveItems, 
  findNextClassDay, 
  findPreviousClassDay, 
  isClassDay, 
  isItemOnClassDay, 
  filterItemsOnClassDays, 
  convertScheduleForCascade 
} from "../utils/classDayUtils";
import { buildHolidayDateSetFromSchedule } from "../utils/holidayUtils";
import { debugLog, debugError, debugWarn } from "../utils/debug";
```

### Key Utility Functions

#### `dateToISOString()` - From `calendarUtils.js`

```javascript
// Convert Date object to ISO date string (YYYY-MM-DD)
// Handles Date objects, date strings, and null/undefined
export const dateToISOString = (date) => {
  if (!date) return null;
  
  // If already a string in ISO format, return it
  if (typeof date === 'string') {
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Try to parse it first
    const parsed = parseDate(date);
    if (parsed) {
      return formatDate(normalizeDate(parsed));
    }
    return null;
  }
  
  // If it's a Date object, format it
  if (date instanceof Date) {
    return formatDate(normalizeDate(date));
  }
  
  return null;
};
```

#### `getClassScheduleItemType()` - From `calendarUtils.js`

```javascript
/**
 * Determines the type of a class schedule item based on its description
 * @param {string} description - The item description
 * @returns {string} - The item type: 'holiday', 'exam', 'test', 'quiz', or 'regular'
 */
export const getClassScheduleItemType = (description) => {
  if (!description) return 'regular';
  
  const desc = description.toLowerCase();
  
  if (isFixedItem(description)) {
    // Check if it's a holiday or final exam
    if (desc.includes('final exam') || desc.includes('final')) {
      return 'exam';
    }
    return 'holiday';
  }
  
  // Check for test, quiz, etc.
  if (desc.includes('test') || desc.includes('exam')) {
    return 'test';
  }
  if (desc.includes('quiz')) {
    return 'quiz';
  }
  
  return 'regular';
};
```

---

## How It Works - Flow Summary

1. **Entering Edit Mode**: User clicks "Edit" button → `handleEnterClassEditMode()` is called → Takes snapshot of current schedule → Sets `isEditMode` to true

2. **Picking Up an Item**: User clicks on a date box with a schedule item → `handleScheduleItemPickup()` is called → Sets `pickedUpScheduleItem` state with item and source date

3. **Dropping an Item**: User clicks on a target date → `handleScheduleItemDrop()` is called → Validates conditions → Determines if cascading is needed → Updates schedule → Clears picked up item

4. **Cascading Logic**: If target date is occupied, `cascadeMoveItems()` is called to move all subsequent items forward by one class day

5. **Push Forward/Back**: User clicks empty date → Menu appears → User selects push forward/back → Items are shifted accordingly

6. **Exiting Edit Mode**: User clicks "Save Changes" → `handleExitClassEditMode()` is called → Saves to localStorage → Clears snapshot

7. **Undo**: User clicks "Undo" → `handleUndoClassChanges()` is called → Restores from snapshot

---

## Key Dependencies

- `cascadeMoveItems()` - Handles cascading logic when items are moved
- `findNextClassDay()` / `findPreviousClassDay()` - Finds next/previous class day
- `isClassDay()` - Checks if a date is a class day
- `isItemOnClassDay()` - Checks if an item is on a class day
- `convertScheduleForCascade()` - Converts schedule format for cascading
- `buildHolidayDateSetFromSchedule()` - Builds set of holiday dates
- `getCourseSchedule()` - Gets course schedule (MW, TR, etc.)
- `isFixedItem()` - Checks if item is fixed (holiday/final exam)

---

## Notes

- Fixed items (holidays and final exams) are NEVER moved or updated
- The system uses click-to-pick/click-to-drop, not drag-and-drop for class schedule items
- Cascading only occurs when dropping on an occupied class day
- Dead zones (non-class days) allow simple moves without cascading
- Changes are saved to localStorage only when exiting edit mode
- ESC key cancels pickup
