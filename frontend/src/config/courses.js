// Course configuration
// Centralized list of courses with their schedules and calendar availability

/**
 * Default list of courses
 * @type {Array<Object>}
 */
export const COURSES = [
  { 
    id: 'FM 4103', 
    name: 'FM 4103', 
    schedule: 'MW 11:00-12:20', 
    hasCalendar: false 
  },
  { 
    id: 'CA 4105', 
    name: 'CA 4105', 
    schedule: 'MW 9:30-10:50', 
    hasCalendar: false 
  },
  { 
    id: 'CA 4201', 
    name: 'CA 4201', 
    schedule: 'TTH 8:00-9:20', 
    hasCalendar: false 
  },
  { 
    id: 'FM 4202', 
    name: 'FM 4202', 
    schedule: 'TTH 11:00-12:20', 
    hasCalendar: false 
  },
  { 
    id: 'CA 4203', 
    name: 'CA 4203', 
    schedule: 'TTH 9:30-10:50', 
    hasCalendar: false 
  },
];

/**
 * Get a course by its ID
 * @param {string} courseId - The course ID to find
 * @param {Array} courses - Array of course objects (defaults to COURSES)
 * @returns {Object|null} - The course object or null if not found
 */
export const getCourseById = (courseId, courses = COURSES) => {
  return courses.find(course => course.id === courseId) || null;
};

/**
 * Get all courses that have calendars
 * @param {Array} courses - Array of course objects (defaults to COURSES)
 * @param {Object} courseCalendars - Object mapping course IDs to calendar data
 * @returns {Array} - Array of courses that have calendars
 */
export const getCoursesWithCalendars = (courses = COURSES, courseCalendars = {}) => {
  return courses.filter(course => {
    const hasCalendar = course.hasCalendar || courseCalendars[course.id];
    return hasCalendar;
  });
};

