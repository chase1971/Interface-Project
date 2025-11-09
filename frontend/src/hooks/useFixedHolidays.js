// Custom hook to manage fixed holidays for future planning
import { useState, useEffect } from 'react';
import { getFixedHolidays, convertHolidaysToCalendarItems } from '../utils/holidayUtils';

/**
 * Custom hook to manage fixed holidays for a selected semester
 * @param {Object|null} selectedSemester - The selected semester object with year property
 * @returns {Array} - Array of holiday calendar items
 */
export const useFixedHolidays = (selectedSemester) => {
  const [fixedHolidays, setFixedHolidays] = useState([]);

  useEffect(() => {
    if (selectedSemester) {
      const year = selectedSemester.year;
      const holidays = getFixedHolidays(year);
      const holidayItems = convertHolidaysToCalendarItems(holidays);
      setFixedHolidays(holidayItems);
    } else {
      setFixedHolidays([]);
    }
  }, [selectedSemester]);

  return fixedHolidays;
};

