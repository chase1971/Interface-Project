// Custom hook to manage calendar offset calculations
import { useState, useCallback } from 'react';
import { calculateOffsetForCalendar } from '../services/calendarOffsetService';
import { createHolidayDateSet } from '../utils/holidayUtils';

/**
 * Custom hook to manage calendar offset calculations
 * @param {Array} courses - Array of course objects
 * @param {Array} fixedHolidays - Array of fixed holiday calendar items
 * @returns {Object} - Object with offsetCalendarItems state and calculateOffset function
 */
export const useCalendarOffset = (courses, fixedHolidays) => {
  const [offsetCalendarItems, setOffsetCalendarItems] = useState([]);

  /**
   * Calculate offset calendar for a given course and start date
   * @param {Object} params - Calculation parameters
   * @param {Array} params.assignments - Original assignments
   * @param {Array} params.classSchedule - Original class schedule
   * @param {Date} params.futureStartDate - Future start date (drop date)
   * @param {string} params.courseId - Course ID
   * @returns {Promise<void>}
   */
  const calculateOffset = useCallback(async ({
    assignments,
    classSchedule,
    futureStartDate,
    courseId
  }) => {
    try {
      // Create holiday date set for lookup
      const holidayDates = createHolidayDateSet(fixedHolidays);
      
      console.log('Fixed holidays for lookup:', Array.from(holidayDates));

      // Use the service to calculate offset
      const result = calculateOffsetForCalendar({
        assignments,
        classSchedule,
        futureStartDate,
        courseId,
        courses,
        holidayDates
      });

      setOffsetCalendarItems(result.combinedItems);
      
      return result;
    } catch (error) {
      console.error('Error calculating calendar offset:', error);
      throw error; // Let the caller handle the error
    }
  }, [courses, fixedHolidays]);

  /**
   * Clear offset calendar items
   */
  const clearOffset = useCallback(() => {
    setOffsetCalendarItems([]);
  }, []);

  return {
    offsetCalendarItems,
    calculateOffset,
    clearOffset,
    setOffsetCalendarItems
  };
};

