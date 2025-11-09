// Holiday configuration
// Centralized holiday definitions for academic calendars

/**
 * Get fixed holidays for a given year
 * @param {number} year - The year to get holidays for
 * @returns {Array} - Array of holiday objects with date/range information
 */
export const getHolidaysForYear = (year) => {
  return [
    {
      name: 'Martin Luther King Jr. Holiday',
      date: `${year}-01-19`, // January 19
      description: 'Martin Luther King Jr. Holiday (Offices Closed)'
    },
    {
      name: 'Spring Break',
      startDate: `${year}-03-16`, // March 16
      endDate: `${year}-03-22`, // March 22
      description: 'Spring Break (Offices Closed)'
    }
  ];
};

/**
 * Default fixed holidays configuration
 * Can be extended to support different academic calendars
 */
export const FIXED_HOLIDAYS_CONFIG = {
  // Add more holiday configurations here if needed
  // e.g., for different academic calendars or institutions
};

