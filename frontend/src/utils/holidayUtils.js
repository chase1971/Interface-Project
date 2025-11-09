// Holiday detection and management utilities
import { getHolidaysForYear } from '../config/holidays';

/**
 * Detects if a description indicates a holiday
 * @param {string} description - The description to check
 * @returns {boolean} - True if the description indicates a holiday
 */
export const detectHoliday = (description) => {
  if (!description) return false;
  
  const lowerDescription = description.toLowerCase();
  const holidayKeywords = [
    'thanksgiving',
    'labor day',
    'holiday',
    'christmas',
    'new year',
    'easter',
    'memorial day',
    'independence day',
    'presidents day',
    'martin luther king',
    'mlk day'
  ];
  
  return holidayKeywords.some(keyword => lowerDescription.includes(keyword));
};

/**
 * Detects the type of a class schedule item based on its description
 * @param {string} description - The description to analyze
 * @returns {string} - The item type: 'holiday', 'exam', 'test', 'quiz', or 'regular'
 */
export const detectItemType = (description) => {
  if (!description) return 'regular';
  
  const lowerDescription = description.toLowerCase();
  
  // Check for holidays first
  if (detectHoliday(lowerDescription)) {
    return 'holiday';
  }
  
  // Check for exams
  if (lowerDescription.includes('final exam') || lowerDescription.includes('final')) {
    return 'exam';
  }
  
  // Check for tests
  if (lowerDescription.includes('test')) {
    return 'test';
  }
  
  // Check for quizzes
  if (lowerDescription.includes('quiz')) {
    return 'quiz';
  }
  
  return 'regular';
};

/**
 * Gets fixed holidays for a given year
 * Delegates to config/holidays.js for centralized configuration
 * @param {number} year - The year to get holidays for
 * @returns {Array} - Array of holiday objects with date/range information
 */
export const getFixedHolidays = (year) => {
  return getHolidaysForYear(year);
};

/**
 * Converts fixed holiday definitions to calendar items format
 * @param {Array} holidays - Array of holiday objects from getFixedHolidays
 * @returns {Array} - Array of calendar item objects
 */
export const convertHolidaysToCalendarItems = (holidays) => {
  const holidayItems = [];
  
  holidays.forEach(holiday => {
    if (holiday.date) {
      // Single day holiday
      holidayItems.push({
        type: 'classSchedule',
        itemName: holiday.description,
        date: holiday.date,
        classScheduleType: 'holiday',
        isClassSchedule: true,
        isFixedHoliday: true
      });
    } else if (holiday.startDate && holiday.endDate) {
      // Multi-day holiday (Spring Break)
      const start = new Date(holiday.startDate);
      const end = new Date(holiday.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        holidayItems.push({
          type: 'classSchedule',
          itemName: holiday.description,
          date: dateStr,
          classScheduleType: 'holiday',
          isClassSchedule: true,
          isFixedHoliday: true
        });
      }
    }
  });
  
  return holidayItems;
};

/**
 * Creates a set of holiday dates for quick lookup
 * @param {Array} holidayItems - Array of calendar item objects with holiday dates
 * @returns {Set} - Set of date strings (YYYY-MM-DD format)
 */
export const createHolidayDateSet = (holidayItems) => {
  const holidayDates = new Set();
  holidayItems.forEach(holiday => {
    if (holiday && holiday.date) {
      holidayDates.add(holiday.date);
    }
  });
  return holidayDates;
};

/**
 * Checks if a date string is a fixed holiday
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {Set} holidayDates - Set of holiday date strings
 * @returns {boolean} - True if the date is a holiday
 */
export const isFixedHoliday = (dateStr, holidayDates) => {
  return holidayDates.has(dateStr);
};

