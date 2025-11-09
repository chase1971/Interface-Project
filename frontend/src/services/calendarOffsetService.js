// Calendar offset calculation service
// Handles all logic for calculating and applying date offsets to calendar items

import {
  parseDate,
  formatDate,
  getEarliestDate,
  findFirstClassDay,
  getClassDayNumber,
  getDateForClassDay,
  getCourseSchedule
} from '../utils/calendarUtils';
import { detectHoliday, detectItemType } from '../utils/holidayUtils';

/**
 * Finds the current semester start date from assignments or class schedule
 * @param {Array} assignments - Array of assignment objects
 * @param {Array} classSchedule - Array of class schedule items
 * @returns {Date|null} - The start date or null if not found
 */
const findCurrentStartDate = (assignments, classSchedule) => {
  let currentStartDate = null;
  
  // First, try to use the earliest class schedule date (this is the primary calendar)
  if (classSchedule.length > 0) {
    const earliestScheduleDate = classSchedule.reduce((earliest, item) => {
      const [year, month, day] = item.date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return (!earliest || date < earliest) ? date : earliest;
    }, null);
    if (earliestScheduleDate) {
      currentStartDate = earliestScheduleDate;
    }
  }
  
  // If no class schedule, try to find the "Class starts" marker in assignments
  if (!currentStartDate) {
    const classStartsMarker = assignments.find(a => a.isClassStartsMarker || a.itemName === 'Class starts');
    if (classStartsMarker && classStartsMarker.startDate) {
      currentStartDate = parseDate(classStartsMarker.startDate);
    }
  }
  
  // If still no date, use the earliest assignment date as fallback
  if (!currentStartDate) {
    const earliestDate = getEarliestDate(assignments);
    if (earliestDate) {
      currentStartDate = earliestDate;
    }
  }
  
  return currentStartDate;
};

/**
 * Identifies holidays in the class schedule and calculates their class day numbers
 * @param {Array} classSchedule - Array of class schedule items
 * @param {string} originalFirstClassStr - First class day in YYYY-MM-DD format
 * @param {string} courseSchedule - Schedule type ('MW' or 'TR')
 * @returns {Array} - Array of holiday objects with date and classDayNum
 */
const identifyHolidaysInSchedule = (classSchedule, originalFirstClassStr, courseSchedule) => {
  const holidays = [];
  
  classSchedule.forEach(scheduleItem => {
    if (detectHoliday(scheduleItem.description)) {
      const dateStr = scheduleItem.date;
      const classDayNum = getClassDayNumber(dateStr, originalFirstClassStr, courseSchedule);
      if (classDayNum !== null) {
        holidays.push({ date: dateStr, classDayNum });
      }
    }
  });
  
  // Sort holidays by class day number
  holidays.sort((a, b) => a.classDayNum - b.classDayNum);
  
  return holidays;
};

/**
 * Adjusts class day number by subtracting skipped holidays
 * @param {number|null} classDayNum - The original class day number
 * @param {Array} holidays - Array of holiday objects with classDayNum
 * @returns {number|null} - Adjusted class day number
 */
const adjustClassDayForHolidays = (classDayNum, holidays) => {
  if (classDayNum === null) return null;
  // Count how many holidays occur before this class day
  const holidaysBefore = holidays.filter(h => h.classDayNum < classDayNum).length;
  return classDayNum - holidaysBefore;
};

/**
 * Finds the next available class day, skipping fixed holidays
 * @param {number} startClassDayNum - Starting class day number
 * @param {string} futureFirstClassStr - First class day in future calendar (YYYY-MM-DD)
 * @param {string} scheduleType - Schedule type ('MW' or 'TR')
 * @param {Set} holidayDates - Set of holiday date strings
 * @returns {number} - Class day number that doesn't fall on a holiday
 */
const findNextNonHolidayClassDay = (startClassDayNum, futureFirstClassStr, scheduleType, holidayDates) => {
  let classDayNum = startClassDayNum;
  const maxAttempts = 100; // Safety limit
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const testDate = getDateForClassDay(classDayNum, futureFirstClassStr, scheduleType);
    if (!testDate) break;
    
    const testDateStr = testDate.toISOString().split('T')[0];
    if (!holidayDates.has(testDateStr)) {
      if (classDayNum !== startClassDayNum) {
        console.log(`Pushed class day ${startClassDayNum} forward to ${classDayNum} (${testDateStr}) to avoid holiday`);
      }
      return classDayNum;
    }
    
    // This class day is a holiday, try the next one
    classDayNum++;
    attempts++;
  }
  
  // If we couldn't find a non-holiday, return the original
  console.warn(`Could not find non-holiday class day starting from ${startClassDayNum}`);
  return startClassDayNum;
};

/**
 * Processes an assignment and calculates its offset dates
 * @param {Object} assignment - Assignment object
 * @param {string} originalFirstClassStr - First class day in original calendar
 * @param {string} futureFirstClassStr - First class day in future calendar
 * @param {string} courseSchedule - Schedule type ('MW' or 'TR')
 * @param {Date} originalFirstClass - Original first class day as Date object
 * @param {Date} futureFirstClass - Future first class day as Date object
 * @param {Array} holidays - Array of holiday objects
 * @param {Set} holidayDates - Set of fixed holiday dates
 * @returns {Object} - Processed assignment item
 */
const processAssignment = (
  assignment,
  originalFirstClassStr,
  futureFirstClassStr,
  courseSchedule,
  originalFirstClass,
  futureFirstClass,
  holidays,
  holidayDates
) => {
  const item = {
    type: 'assignment',
    itemName: assignment.itemName,
    startDate: null,
    dueDate: null,
    startTime: assignment.startTime || null,
    dueTime: assignment.dueTime || null
  };

  // Process start date
  if (assignment.startDate) {
    const date = parseDate(assignment.startDate);
    if (date) {
      const dateStr = formatDate(date);
      const classDayNum = getClassDayNumber(dateStr, originalFirstClassStr, courseSchedule);
      
      if (classDayNum !== null) {
        // Adjust for skipped holidays
        const adjustedClassDayNum = adjustClassDayForHolidays(classDayNum, holidays);
        // Check if this date falls on a fixed holiday and push forward if needed
        const finalClassDayNum = findNextNonHolidayClassDay(
          adjustedClassDayNum,
          futureFirstClassStr,
          courseSchedule,
          holidayDates
        );
        // Get corresponding date in future calendar
        const futureDate = getDateForClassDay(finalClassDayNum, futureFirstClassStr, courseSchedule);
        if (futureDate) {
          item.startDate = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD
        }
      } else {
        // Not a class day, use simple offset as fallback
        const daysFromFirstClass = Math.floor((date - originalFirstClass) / (1000 * 60 * 60 * 24));
        const futureDate = new Date(futureFirstClass);
        futureDate.setDate(futureDate.getDate() + daysFromFirstClass);
        item.startDate = futureDate.toISOString().split('T')[0];
      }
    }
  }

  // Process due date
  if (assignment.dueDate) {
    const date = parseDate(assignment.dueDate);
    if (date) {
      const dateStr = formatDate(date);
      const classDayNum = getClassDayNumber(dateStr, originalFirstClassStr, courseSchedule);
      
      if (classDayNum !== null) {
        // Adjust for skipped holidays
        const adjustedClassDayNum = adjustClassDayForHolidays(classDayNum, holidays);
        // Check if this date falls on a fixed holiday and push forward if needed
        const finalClassDayNum = findNextNonHolidayClassDay(
          adjustedClassDayNum,
          futureFirstClassStr,
          courseSchedule,
          holidayDates
        );
        // Get corresponding date in future calendar
        const futureDate = getDateForClassDay(finalClassDayNum, futureFirstClassStr, courseSchedule);
        if (futureDate) {
          item.dueDate = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD
        }
      } else {
        // Not a class day, use simple offset as fallback
        const daysFromFirstClass = Math.floor((date - originalFirstClass) / (1000 * 60 * 60 * 24));
        const futureDate = new Date(futureFirstClass);
        futureDate.setDate(futureDate.getDate() + daysFromFirstClass);
        item.dueDate = futureDate.toISOString().split('T')[0];
      }
    }
  }

  return item;
};

/**
 * Processes a class schedule item and calculates its offset date
 * @param {Object} scheduleItem - Class schedule item object
 * @param {string} originalFirstClassStr - First class day in original calendar
 * @param {string} futureFirstClassStr - First class day in future calendar
 * @param {string} courseSchedule - Schedule type ('MW' or 'TR')
 * @param {Date} originalFirstClass - Original first class day as Date object
 * @param {Date} futureFirstClass - Future first class day as Date object
 * @param {Array} holidays - Array of holiday objects
 * @param {Set} holidayDates - Set of fixed holiday dates
 * @returns {Object|null} - Processed class schedule item or null if skipped
 */
const processClassScheduleItem = (
  scheduleItem,
  originalFirstClassStr,
  futureFirstClassStr,
  courseSchedule,
  originalFirstClass,
  futureFirstClass,
  holidays,
  holidayDates
) => {
  // Skip holidays - don't transfer them over
  if (detectHoliday(scheduleItem.description)) {
    return null;
  }
  
  const dateStr = scheduleItem.date; // Already in YYYY-MM-DD format
  
  // Get class day number in original calendar
  const classDayNum = getClassDayNumber(dateStr, originalFirstClassStr, courseSchedule);
  
  let futureDate;
  if (classDayNum !== null) {
    // Adjust for skipped holidays
    const adjustedClassDayNum = adjustClassDayForHolidays(classDayNum, holidays);
    // Check if this date falls on a fixed holiday and push forward if needed
    const finalClassDayNum = findNextNonHolidayClassDay(
      adjustedClassDayNum,
      futureFirstClassStr,
      courseSchedule,
      holidayDates
    );
    // Get corresponding date in future calendar
    futureDate = getDateForClassDay(finalClassDayNum, futureFirstClassStr, courseSchedule);
  } else {
    // Not a class day, use simple offset as fallback
    const [year, month, day] = scheduleItem.date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const daysFromFirstClass = Math.floor((date - originalFirstClass) / (1000 * 60 * 60 * 24));
    futureDate = new Date(futureFirstClass);
    futureDate.setDate(futureDate.getDate() + daysFromFirstClass);
  }
  
  if (!futureDate) {
    return null;
  }
  
  // Detect item type (non-holiday items)
  const itemType = detectItemType(scheduleItem.description);
  
  return {
    type: 'classSchedule',
    itemName: scheduleItem.description,
    date: futureDate.toISOString().split('T')[0], // YYYY-MM-DD
    classScheduleType: itemType,
    isClassSchedule: true
  };
};

/**
 * Main function to calculate offset calendar
 * @param {Object} params - Calculation parameters
 * @param {Array} params.assignments - Original assignments
 * @param {Array} params.classSchedule - Original class schedule
 * @param {Date} params.futureStartDate - Future start date (drop date)
 * @param {string} params.courseId - Course ID
 * @param {Array} params.courses - Array of course objects
 * @param {Set} params.holidayDates - Set of fixed holiday dates
 * @returns {Object} - Result object with combinedItems and debug info
 */
export const calculateOffsetForCalendar = ({
  assignments,
  classSchedule,
  futureStartDate,
  courseId,
  courses,
  holidayDates
}) => {
  // Find current semester start date
  const currentStartDate = findCurrentStartDate(assignments, classSchedule);
  
  if (!currentStartDate) {
    throw new Error('Could not find class start date.');
  }

  // Get the course schedule (MW or TR)
  const courseSchedule = getCourseSchedule(courseId, courses);
  if (!courseSchedule) {
    throw new Error('Could not determine course schedule.');
  }

  // Find the first actual class day in the original calendar
  const currentDateStr = `${currentStartDate.getFullYear()}-${String(currentStartDate.getMonth() + 1).padStart(2, '0')}-${String(currentStartDate.getDate()).padStart(2, '0')}`;
  const originalFirstClassDay = findFirstClassDay(currentDateStr, courseSchedule);
  
  if (!originalFirstClassDay) {
    throw new Error('Could not find first class day in original calendar.');
  }

  // Use the drop date as the first class day (user explicitly selected this date)
  const futureFirstClassDay = new Date(futureStartDate);
  futureFirstClassDay.setHours(0, 0, 0, 0);

  // Normalize dates to midnight for accurate calculation
  const originalFirstClass = new Date(originalFirstClassDay);
  originalFirstClass.setHours(0, 0, 0, 0);
  const futureFirstClass = new Date(futureFirstClassDay);
  futureFirstClass.setHours(0, 0, 0, 0);

  // Convert to YYYY-MM-DD strings for class day calculations
  const originalFirstClassStr = `${originalFirstClass.getFullYear()}-${String(originalFirstClass.getMonth() + 1).padStart(2, '0')}-${String(originalFirstClass.getDate()).padStart(2, '0')}`;
  const futureFirstClassStr = `${futureFirstClass.getFullYear()}-${String(futureFirstClass.getMonth() + 1).padStart(2, '0')}-${String(futureFirstClass.getDate()).padStart(2, '0')}`;

  // Identify holidays in the class schedule
  const holidays = identifyHolidaysInSchedule(classSchedule, originalFirstClassStr, courseSchedule);

  console.log('Offset calculation:', {
    originalStartDate: currentStartDate.toISOString(),
    originalFirstClassDay: originalFirstClass.toISOString(),
    futureDropDate: futureStartDate.toISOString(),
    futureFirstClassDay: futureFirstClass.toISOString(),
    courseSchedule,
    assignmentsCount: assignments.length,
    classScheduleCount: classSchedule.length,
    holidaysCount: holidays.length,
    holidays: holidays.map(h => ({ date: h.date, classDayNum: h.classDayNum }))
  });

  // Combine and offset all calendar items
  const combinedItems = [];

  // Process assignments (excluding class starts marker)
  assignments
    .filter(a => !a.isClassStartsMarker)
    .forEach(assignment => {
      const item = processAssignment(
        assignment,
        originalFirstClassStr,
        futureFirstClassStr,
        courseSchedule,
        originalFirstClass,
        futureFirstClass,
        holidays,
        holidayDates
      );
      combinedItems.push(item);
    });

  // Process class schedule items
  classSchedule.forEach(scheduleItem => {
    const item = processClassScheduleItem(
      scheduleItem,
      originalFirstClassStr,
      futureFirstClassStr,
      courseSchedule,
      originalFirstClass,
      futureFirstClass,
      holidays,
      holidayDates
    );
    if (item) {
      combinedItems.push(item);
    }
  });

  console.log('Combined calendar items:', {
    totalItems: combinedItems.length,
    assignments: combinedItems.filter(i => i.type === 'assignment').length,
    classSchedule: combinedItems.filter(i => i.type === 'classSchedule').length,
    sampleItems: combinedItems.slice(0, 5)
  });

  return {
    combinedItems,
    debugInfo: {
      originalStartDate: currentStartDate,
      originalFirstClassDay,
      futureFirstClassDay,
      courseSchedule,
      holidaysCount: holidays.length
    }
  };
};

