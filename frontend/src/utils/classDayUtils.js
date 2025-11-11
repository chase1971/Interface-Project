// Utilities for finding next class days and managing class day sequences
import { getDateForClassDay, getClassDayNumber, getCourseSchedule, isFixedItem } from './calendarUtils';
import { createHolidayDateSet } from './holidayUtils';

/**
 * Checks if a schedule item is on a class day (not in a dead zone)
 * @param {Object} item - Schedule item with a date property
 * @param {string} courseSchedule - Course schedule type ('MW' or 'TR')
 * @param {Set} holidayDates - Set of holiday date strings
 * @returns {boolean} - True if the item is on a class day
 */
export const isItemOnClassDay = (item, courseSchedule, holidayDates) => {
  if (!item || !item.date) return false;
  
  const [year, month, day] = item.date.split('-').map(Number);
  const itemDate = new Date(year, month - 1, day);
  return isClassDay(itemDate, courseSchedule, holidayDates);
};

/**
 * Filters schedule items to only include those on class days (excludes dead zone items)
 * @param {Array} items - Array of schedule items
 * @param {string} courseSchedule - Course schedule type ('MW' or 'TR')
 * @param {Set} holidayDates - Set of holiday date strings
 * @returns {Array} - Filtered array of items on class days
 */
export const filterItemsOnClassDays = (items, courseSchedule, holidayDates) => {
  return items.filter(item => {
    if (isFixedItem(item)) return false; // Don't include fixed items in this filter
    
    return isItemOnClassDay(item, courseSchedule, holidayDates);
  });
};

/**
 * Converts class schedule items to the format expected by cascadeMoveItems
 * @param {Array} classSchedule - Array of class schedule items
 * @param {Function} getClassScheduleItemType - Function to get item type from description
 * @param {Function} isFixedItem - Function to check if item is fixed
 * @returns {Array} - Array of items in cascade format
 */
export const convertScheduleForCascade = (classSchedule, getClassScheduleItemType, isFixedItem) => {
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

/**
 * Finds the next class day after a given date, respecting the schedule pattern
 * @param {Date|string} date - The starting date
 * @param {string} scheduleType - Schedule type ('MW' or 'TR')
 * @param {Set} holidayDates - Set of holiday date strings to skip
 * @returns {Date|null} - The next class day, or null if not found
 */
export const findNextClassDay = (date, scheduleType, holidayDates = new Set()) => {
  if (!date || !scheduleType) return null;
  
  const dateObj = typeof date === 'string'
    ? (() => {
        const [y, m, d] = date.split('-').map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date(date);
  
  // Ensure we're working with a date at midnight to avoid timezone issues
  dateObj.setHours(0, 0, 0, 0);
  
  // Determine target days for schedule
  let day1, day2;
  if (scheduleType === 'MW') {
    day1 = 1; // Monday
    day2 = 3; // Wednesday
  } else if (scheduleType === 'TR') {
    day1 = 2; // Tuesday
    day2 = 4; // Thursday
  } else {
    return null;
  }
  
  const currentDayOfWeek = dateObj.getDay();
  
  // Find the next class day - start from the day AFTER the given date
  let nextDate = new Date(dateObj);
  nextDate.setDate(nextDate.getDate() + 1); // Start from tomorrow
  
  // Skip holidays and find the next valid class day
  let attempts = 0;
  while (attempts < 100) {
    const nextDayOfWeek = nextDate.getDay();
    const nextDateStr = nextDate.toISOString().split('T')[0];
    
    // Check if this is a class day and not a holiday
    // Also check if it's Thanksgiving (Nov 26-27) - skip both days
    const [year, month, day] = nextDateStr.split('-').map(Number);
    const isThanksgiving = (month === 11 && (day === 26 || day === 27));
    const isHoliday = holidayDates.has(nextDateStr) || isThanksgiving;
    
    if ((nextDayOfWeek === day1 || nextDayOfWeek === day2) && !isHoliday) {
      return nextDate;
    }
    
    // Not a valid class day (either wrong day of week or holiday), move forward
    if (nextDayOfWeek === day1) {
      // It's day1 but it's a holiday, move to day2
      nextDate.setDate(nextDate.getDate() + 2);
    } else if (nextDayOfWeek === day2) {
      // It's day2 but it's a holiday, move to next week's day1
      nextDate.setDate(nextDate.getDate() + 5);
    } else if (nextDayOfWeek < day1) {
      // Before day1, move to day1
      nextDate.setDate(nextDate.getDate() + (day1 - nextDayOfWeek));
    } else if (nextDayOfWeek < day2) {
      // Between day1 and day2, move to day2
      nextDate.setDate(nextDate.getDate() + (day2 - nextDayOfWeek));
    } else {
      // After day2, move to next week's day1
      nextDate.setDate(nextDate.getDate() + (7 - nextDayOfWeek + day1));
    }
    
    attempts++;
  }
  
  console.warn('findNextClassDay: Could not find next class day after', dateObj.toISOString().split('T')[0]);
  return null;
};

/**
 * Finds the previous class day before a given date, respecting the schedule pattern
 * @param {Date|string} date - The starting date
 * @param {string} scheduleType - Schedule type ('MW' or 'TR')
 * @param {Set} holidayDates - Set of holiday date strings to skip
 * @returns {Date|null} - The previous class day, or null if not found
 */
export const findPreviousClassDay = (date, scheduleType, holidayDates = new Set()) => {
  if (!date || !scheduleType) return null;
  
  const dateObj = typeof date === 'string'
    ? (() => {
        const [y, m, d] = date.split('-').map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date(date);
  
  // Ensure we're working with a date at midnight to avoid timezone issues
  dateObj.setHours(0, 0, 0, 0);
  
  // Determine target days for schedule
  let day1, day2;
  if (scheduleType === 'MW') {
    day1 = 1; // Monday
    day2 = 3; // Wednesday
  } else if (scheduleType === 'TR') {
    day1 = 2; // Tuesday
    day2 = 4; // Thursday
  } else {
    return null;
  }
  
  const currentDayOfWeek = dateObj.getDay();
  
  // Find the previous class day - start from the day BEFORE the given date
  let prevDate = new Date(dateObj);
  prevDate.setDate(prevDate.getDate() - 1); // Start from yesterday
  
  // Skip holidays and find the previous valid class day
  let attempts = 0;
  while (attempts < 100) {
    const prevDayOfWeek = prevDate.getDay();
    const prevDateStr = prevDate.toISOString().split('T')[0];
    
    // Check if this is a class day and not a holiday
    // Also check if it's Thanksgiving (Nov 26-27) - skip both days
    const [year, month, day] = prevDateStr.split('-').map(Number);
    const isThanksgiving = (month === 11 && (day === 26 || day === 27));
    const isHoliday = holidayDates.has(prevDateStr) || isThanksgiving;
    
    if ((prevDayOfWeek === day1 || prevDayOfWeek === day2) && !isHoliday) {
      return prevDate;
    }
    
    // Not a valid class day (either wrong day of week or holiday), move backward
    if (prevDayOfWeek === day2) {
      // It's day2 but it's a holiday, move to day1
      prevDate.setDate(prevDate.getDate() - 2);
    } else if (prevDayOfWeek === day1) {
      // It's day1 but it's a holiday, move to previous week's day2
      prevDate.setDate(prevDate.getDate() - 5);
    } else if (prevDayOfWeek > day2) {
      // After day2, move to day2
      prevDate.setDate(prevDate.getDate() - (prevDayOfWeek - day2));
    } else if (prevDayOfWeek > day1) {
      // Between day1 and day2, move to day1
      prevDate.setDate(prevDate.getDate() - (prevDayOfWeek - day1));
    } else {
      // Before day1, move to previous week's day2
      prevDate.setDate(prevDate.getDate() - (prevDayOfWeek + 7 - day2));
    }
    
    attempts++;
  }
  
  console.warn('findPreviousClassDay: Could not find previous class day before', dateObj.toISOString().split('T')[0]);
  return null;
};

/**
 * Checks if a given date is a class day for the specified schedule
 * @param {Date|string} date - The date to check
 * @param {string} scheduleType - Schedule type ('MW' or 'TR')
 * @param {Set} holidayDates - Set of holiday date strings to skip
 * @returns {boolean} - True if the date is a class day, false otherwise
 */
export const isClassDay = (date, scheduleType, holidayDates = new Set()) => {
  if (!date || !scheduleType) return false;
  
  const dateObj = typeof date === 'string'
    ? (() => {
        const [y, m, d] = date.split('-').map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date(date);
  
  dateObj.setHours(0, 0, 0, 0);
  
  // Determine target days for schedule
  let day1, day2;
  if (scheduleType === 'MW') {
    day1 = 1; // Monday
    day2 = 3; // Wednesday
  } else if (scheduleType === 'TR') {
    day1 = 2; // Tuesday
    day2 = 4; // Thursday
  } else {
    return false;
  }
  
  const dayOfWeek = dateObj.getDay();
  const dateStr = dateObj.toISOString().split('T')[0];
  
  // Check if it's a holiday
  const [year, month, day] = dateStr.split('-').map(Number);
  const isThanksgiving = (month === 11 && (day === 26 || day === 27));
  const isHoliday = holidayDates.has(dateStr) || isThanksgiving;
  
  // Return true if it's a class day and not a holiday
  return (dayOfWeek === day1 || dayOfWeek === day2) && !isHoliday;
};

/**
 * Cascades items when moving an item to a new date
 * @param {Array} items - Array of calendar items
 * @param {string} sourceDateStr - Source date (YYYY-MM-DD)
 * @param {string} targetDateStr - Target date (YYYY-MM-DD)
 * @param {string} scheduleType - Schedule type ('MW' or 'TR')
 * @param {Set} holidayDates - Set of holiday date strings
 * @returns {Array} - Updated array of items with cascaded dates
 */
export const cascadeMoveItems = (items, sourceDateStr, targetDateStr, scheduleType, holidayDates = new Set(), sourceItemDescription = null) => {
  console.log('=== cascadeMoveItems called ===', { sourceDateStr, targetDateStr, scheduleType, itemsCount: items.length, sourceItemDescription });
  
  // Filter out items that are in dead zones (non-class days) - they should not participate in collision detection
  // Only include items that are on actual class days
  const itemsOnClassDays = items.filter(item => {
    if (item.type !== 'classSchedule') return false;
    
    // Check if the item's date is a class day
    const [year, month, day] = item.date.split('-').map(Number);
    const itemDate = new Date(year, month - 1, day);
    return isClassDay(itemDate, scheduleType, holidayDates);
  });
  
  console.log('Filtered items on class days:', { 
    originalCount: items.length, 
    filteredCount: itemsOnClassDays.length,
    removedItems: items.filter(item => {
      if (item.type !== 'classSchedule') return false;
      const [year, month, day] = item.date.split('-').map(Number);
      const itemDate = new Date(year, month - 1, day);
      return !isClassDay(itemDate, scheduleType, holidayDates);
    }).map(i => ({ date: i.date, desc: i.description || i.itemName }))
  });
  
  // Find the item being moved - if we have a description, use it to uniquely identify the item
  // This is important when multiple items might have the same date after cascading
  // Also exclude fixed items (holidays and final exams)
  // Only search in items that are on class days
  let itemToMove;
  if (sourceItemDescription) {
    itemToMove = itemsOnClassDays.find(item => 
      item.type === 'classSchedule' && 
      item.date === sourceDateStr && 
      !isFixedItem(item) &&
      (item.itemName === sourceItemDescription || item.description === sourceItemDescription)
    );
  } else {
    itemToMove = itemsOnClassDays.find(item => 
      item.type === 'classSchedule' && 
      item.date === sourceDateStr && 
      !isFixedItem(item)
    );
  }
  
  if (!itemToMove) {
    console.warn('No item found to move', { sourceDateStr, sourceItemDescription, availableDates: items.map(i => ({ date: i.date, desc: i.description || i.itemName, isFixed: isFixedItem(i) })) });
    return items; // No item to move
  }
  
  console.log('Item to move found:', { description: itemToMove.description || itemToMove.itemName, date: itemToMove.date });
  
  // Create a deep copy of ALL items (including dead zone items) to modify
  // We need to preserve dead zone items in the final result, but only cascade items on class days
  const updatedItems = items.map(item => ({ ...item }));
  
  // Find what's currently on the target date (if anything) - exclude the item we're moving and fixed items
  // Only check items that are on class days (dead zone items don't count as collisions)
  const targetItem = itemsOnClassDays.find(item => 
    item.type === 'classSchedule' && 
    item.date === targetDateStr && 
    !isFixedItem(item) && 
    item !== itemToMove &&
    (item.itemName !== itemToMove.itemName && item.description !== itemToMove.description)
  );
  
  console.log('Target item found:', targetItem ? { description: targetItem.description || targetItem.itemName, date: targetItem.date } : 'none');
  
  // Move the source item to target FIRST
  const itemIndex = updatedItems.findIndex(item => 
    item === itemToMove || 
    (item.date === sourceDateStr && 
     item.type === 'classSchedule' && 
     (item.itemName === itemToMove.itemName || item.description === itemToMove.description))
  );
  
  if (itemIndex !== -1) {
    updatedItems[itemIndex] = {
      ...itemToMove,
      date: targetDateStr
    };
    console.log('✓ Moved source item to target:', { from: sourceDateStr, to: targetDateStr, description: itemToMove.description || itemToMove.itemName });
  }
  
  // If there was an item on the target date, cascade it forward to the NEXT CLASS DAY
  if (targetItem) {
    const targetItemOriginalDate = targetItem.date; // Save original date before we modify
    const targetItemDescription = targetItem.description || targetItem.itemName;
    
    // Find the next class day after the target date
    const targetDate = new Date(targetDateStr + 'T00:00:00');
    const dayAfterTarget = new Date(targetDate);
    dayAfterTarget.setDate(dayAfterTarget.getDate() + 1);
    
    const nextClassDay = findNextClassDay(dayAfterTarget, scheduleType, holidayDates);
    
    console.log('Next class day after target:', nextClassDay ? nextClassDay.toISOString().split('T')[0] : 'none');
    
    if (nextClassDay) {
      const nextDateStr = nextClassDay.toISOString().split('T')[0];
      
      // Check if next date is already occupied by a different item (BEFORE we move targetItem there)
      // We need to find it by matching the date AND ensuring it's not the item we're moving, the target item, or a fixed item
      // Only check items that are on class days (dead zone items don't count as collisions)
      // Save the nextItem BEFORE we modify anything, so we can find it later even after targetItem moves to the same date
      const nextItem = itemsOnClassDays.find(item => 
        item.type === 'classSchedule' && 
        item.date === nextDateStr && 
        !isFixedItem(item) && 
        item !== targetItem &&
        item !== itemToMove &&
        (item.itemName !== itemToMove.itemName && item.description !== itemToMove.description) &&
        (item.itemName !== targetItem.itemName && item.description !== targetItem.description)
      );
      
      // Save nextItem's unique identifier for later lookup
      const nextItemId = nextItem ? (nextItem.itemName || nextItem.description) : null;
      
      // Also check if nextDateStr is a holiday (even if no item is there, we should skip it)
      const isNextDateHoliday = holidayDates.has(nextDateStr);
      if (isNextDateHoliday && !nextItem) {
        console.log('⚠ Next class day is a holiday, finding next available class day');
        // Find the next class day after the holiday
        const dayAfterHoliday = new Date(nextDateStr + 'T00:00:00');
        dayAfterHoliday.setDate(dayAfterHoliday.getDate() + 1);
        const nextAfterHoliday = findNextClassDay(dayAfterHoliday, scheduleType, holidayDates);
        if (nextAfterHoliday) {
          const nextAfterHolidayStr = nextAfterHoliday.toISOString().split('T')[0];
          // Check if that date is occupied (only check items on class days)
          const itemAfterHoliday = itemsOnClassDays.find(item => 
            item.type === 'classSchedule' && 
            item.date === nextAfterHolidayStr && 
            !isFixedItem(item) && 
            item !== targetItem &&
            item !== itemToMove
          );
          
          // Move targetItem to the date after the holiday
          updatedItems[targetItemIndex] = {
            ...targetItem,
            date: nextAfterHolidayStr
          };
          console.log('✓ Moved target item past holiday to:', nextAfterHolidayStr);
          
          // If that date is also occupied, recursively cascade
          if (itemAfterHoliday) {
            const itemAfterHolidayDesc = itemAfterHoliday.description || itemAfterHoliday.itemName;
            console.log('⚠ Date after holiday is occupied, recursively cascading');
            return cascadeMoveItems(updatedItems, itemAfterHoliday.date, nextAfterHolidayStr, scheduleType, holidayDates, itemAfterHolidayDesc);
          }
          return updatedItems;
        }
      }
      
      // Find the index of targetItem in updatedItems
      const targetItemIndex = updatedItems.findIndex(item => 
        item === targetItem || 
        (item.date === targetItemOriginalDate && 
         item.type === 'classSchedule' &&
         (item.itemName === targetItem.itemName || item.description === targetItem.description))
      );
      
      if (targetItemIndex !== -1) {
        // Move targetItem to nextDateStr
        updatedItems[targetItemIndex] = {
          ...targetItem,
          date: nextDateStr
        };
        console.log('✓ Moved target item to next class day:', { 
          from: targetItemOriginalDate, 
          to: nextDateStr, 
          description: targetItemDescription 
        });
        
        // If next date was occupied, recursively cascade that item forward
        if (nextItem) {
          const nextItemDescription = nextItem.description || nextItem.itemName;
          // After moving targetItem, nextItem is now at nextDateStr (same date as targetItem)
          // We need to move nextItem to the next available class day
          console.log('⚠ Next class day was occupied by:', nextItemDescription, '- recursively cascading');
          
          // The item that was on nextDateStr needs to move to the next class day AFTER nextDateStr
          const dayAfterNext = new Date(nextDateStr + 'T00:00:00');
          dayAfterNext.setDate(dayAfterNext.getDate() + 1);
          const nextNextClassDay = findNextClassDay(dayAfterNext, scheduleType, holidayDates);
          
          if (nextNextClassDay) {
            const nextNextDateStr = nextNextClassDay.toISOString().split('T')[0];
            console.log('→ Recursively cascading', nextItemDescription, 'from', nextDateStr, 'to', nextNextDateStr);
            
            // Find nextItem by its unique identifier - it should now be at nextDateStr (same as targetItem)
            // Make sure it's not a fixed item and it's not the targetItem or itemToMove
            // Use the saved nextItemId to find it reliably
            // Only check items that are on class days
            const nextItemToCascade = itemsOnClassDays.find(item =>
              item.type === 'classSchedule' &&
              (item.itemName === nextItemId || item.description === nextItemId) &&
              item.date === nextDateStr && // After moving targetItem, nextItem is at nextDateStr
              !isFixedItem(item) &&
              item !== targetItem &&
              item !== itemToMove &&
              (item.itemName !== targetItem.itemName && item.description !== targetItem.description)
            );
            
            if (nextItemToCascade) {
              // Recursively call cascadeMoveItems to move nextItem from nextDateStr to nextNextDateStr
              // Pass the description to uniquely identify the item
              return cascadeMoveItems(updatedItems, nextDateStr, nextNextDateStr, scheduleType, holidayDates, nextItemDescription);
            } else {
              console.warn('❌ Could not find nextItem to cascade in updatedItems', {
                nextItemDescription,
                nextDateStr,
                availableItems: updatedItems.filter(i => i.date === nextDateStr).map(i => ({ desc: i.description || i.itemName, isFixed: isFixedItem(i) }))
              });
            }
          } else {
            console.warn('❌ Could not find next class day after', nextDateStr, 'for recursive cascade');
          }
        } else {
          console.log('✓ Next class day is free, cascade complete');
        }
      }
    } else {
      console.warn('❌ Could not find next class day after target date', targetDateStr);
    }
  } else {
    console.log('✓ No target item to cascade');
  }
  
  console.log('=== Cascade complete, returning', updatedItems.length, 'items ===');
  return updatedItems;
};

