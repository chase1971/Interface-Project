// Calendar utility functions

// Parse date string (MM-DD-YYYY) to Date object
export const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const [month, day, year] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Format date to MM-DD-YYYY string
export const formatDate = (date) => {
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
};

// Get the earliest date from assignments
export const getEarliestDate = (assignments) => {
  let earliest = null;
  if (!assignments || assignments.length === 0) return null;
  
  assignments.forEach(assignment => {
    const startDate = parseDate(assignment.startDate);
    const dueDate = parseDate(assignment.dueDate);
    
    if (startDate && (!earliest || startDate < earliest)) {
      earliest = startDate;
    }
    if (dueDate && (!earliest || dueDate < earliest)) {
      earliest = dueDate;
    }
  });
  return earliest;
};

// Determine if a date falls on Monday/Wednesday or Tuesday/Thursday
// Returns 'MW' for Monday/Wednesday, 'TR' for Tuesday/Thursday
export const getClassSchedule = (date) => {
  if (!date) return null;
  // Handle date string from input (YYYY-MM-DD format)
  let dateObj;
  if (typeof date === 'string') {
    const [year, month, day] = date.split('-').map(Number);
    dateObj = new Date(year, month - 1, day);
  } else {
    dateObj = date;
  }
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
  if (dayOfWeek === 1 || dayOfWeek === 3) return 'MW'; // Monday or Wednesday
  if (dayOfWeek === 2 || dayOfWeek === 4) return 'TR'; // Tuesday or Thursday
  return null; // Not a class day
};

// Get default future start date based on current semester
export const getDefaultFutureStartDate = (originalAssignments) => {
  if (!originalAssignments || originalAssignments.length === 0) return '';
  
  // Find the first date in August or later (Fall semester start)
  let fallStartDate = null;
  let springStartDate = null;
  
  originalAssignments.forEach(assignment => {
    const startDate = parseDate(assignment.startDate);
    const dueDate = parseDate(assignment.dueDate);
    
    [startDate, dueDate].forEach(date => {
      if (!date) return;
      const month = date.getMonth(); // 0-11
      
      // Look for August (7) through December (11) - Fall semester
      if (month >= 7 && (!fallStartDate || date < fallStartDate)) {
        fallStartDate = date;
      }
      // Look for January (0) through May (4) - Spring semester
      if (month <= 4 && (!springStartDate || date < springStartDate)) {
        springStartDate = date;
      }
    });
  });
  
  // Determine current semester and calculate next
  let nextYear, nextMonth;
  if (fallStartDate) {
    // Current semester is Fall, next is Spring (January)
    nextYear = fallStartDate.getFullYear() + 1;
    nextMonth = 0; // January
  } else if (springStartDate) {
    // Current semester is Spring, next is Fall (August)
    nextYear = springStartDate.getFullYear();
    nextMonth = 7; // August
  } else {
    // Fallback: use earliest date
    const earliestDate = getEarliestDate(originalAssignments);
    if (!earliestDate) return '';
    const currentMonth = earliestDate.getMonth();
    const currentYear = earliestDate.getFullYear();
    
    if (currentMonth >= 7) {
      nextYear = currentYear + 1;
      nextMonth = 0;
    } else {
      nextYear = currentYear;
      nextMonth = 7;
    }
  }
  
  // Format as YYYY-MM-DD for date input
  return `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-15`;
};

// Find the first actual class day for a given schedule type
// For T/Th: finds the first Tuesday on or after the given date
// For M/W: finds the first Monday on or after the given date
export const findFirstClassDay = (date, scheduleType) => {
  if (!date || !scheduleType) return null;

  const dateObj = typeof date === 'string'
    ? (() => {
        const [y, m, d] = date.split('-').map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date(date);

  const currentDayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
  let targetDayOfWeek;

  if (scheduleType === 'TR') {
    targetDayOfWeek = 2; // Tuesday
  } else if (scheduleType === 'MW') {
    targetDayOfWeek = 1; // Monday
  } else {
    return null;
  }

  let daysToAdjust;
  if (currentDayOfWeek <= targetDayOfWeek) {
    daysToAdjust = targetDayOfWeek - currentDayOfWeek;
  } else {
    daysToAdjust = (7 - currentDayOfWeek) + targetDayOfWeek;
  }

  const firstClassDay = new Date(dateObj);
  firstClassDay.setDate(firstClassDay.getDate() + daysToAdjust);
  
  return firstClassDay;
};

// Get schedule type from course (MW or TR)
export const getCourseSchedule = (courseId, courses) => {
  const course = courses.find(c => c.id === courseId);
  if (!course) return null;
  // Extract schedule type from schedule string (e.g., "MW 11:00-12:20" -> "MW", "TTH 8:00-9:20" -> "TR")
  const scheduleMatch = course.schedule.match(/^(MW|TTH|TR)/);
  if (scheduleMatch) {
    // Convert TTH to TR for consistency
    return scheduleMatch[1] === 'TTH' ? 'TR' : scheduleMatch[1];
  }
  return null;
};

// Count which class day number a date is (0 = first class day, 1 = second, etc.)
// For MW: Monday=even (0,2,4...), Wednesday=odd (1,3,5...)
// For TR: Tuesday=even (0,2,4...), Thursday=odd (1,3,5...)
export const getClassDayNumber = (date, firstClassDay, scheduleType) => {
  if (!date || !firstClassDay || !scheduleType) return null;
  
  const dateObj = typeof date === 'string'
    ? (() => {
        const [y, m, d] = date.split('-').map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date(date);
  
  const firstDay = typeof firstClassDay === 'string'
    ? (() => {
        const [y, m, d] = firstClassDay.split('-').map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date(firstClassDay);
  
  // Get day of week for both dates
  const dateDayOfWeek = dateObj.getDay();
  const firstDayOfWeek = firstDay.getDay();
  
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
  
  // Check if date is a valid class day
  if (dateDayOfWeek !== day1 && dateDayOfWeek !== day2) {
    return null; // Not a class day
  }
  
  // Calculate weeks and days difference
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.floor((dateObj - firstDay) / msPerDay);
  
  // Calculate which class day it is
  // Each week has 2 class days, so we can calculate based on weeks
  const weeks = Math.floor(daysDiff / 7);
  const dayInWeek = daysDiff % 7;
  
  let classDayNumber;
  if (firstDayOfWeek === day1) {
    // Started on first day of pattern (Mon for MW, Tue for TR)
    if (dateDayOfWeek === day1) {
      classDayNumber = weeks * 2;
    } else { // dateDayOfWeek === day2
      classDayNumber = weeks * 2 + 1;
    }
  } else { // firstDayOfWeek === day2
    // Started on second day of pattern (Wed for MW, Thu for TR)
    if (dateDayOfWeek === day2) {
      classDayNumber = weeks * 2;
    } else { // dateDayOfWeek === day1
      classDayNumber = weeks * 2 + 1;
    }
  }
  
  return classDayNumber;
};

// Get the date for a specific class day number
// For MW: 0=first Mon, 1=first Wed, 2=second Mon, 3=second Wed, etc.
// For TR: 0=first Tue, 1=first Thu, 2=second Tue, 3=second Thu, etc.
export const getDateForClassDay = (classDayNumber, firstClassDay, scheduleType) => {
  if (classDayNumber === null || classDayNumber === undefined || !firstClassDay || !scheduleType) return null;
  
  const firstDay = typeof firstClassDay === 'string'
    ? (() => {
        const [y, m, d] = firstClassDay.split('-').map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date(firstClassDay);
  
  const firstDayOfWeek = firstDay.getDay();
  
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
  
  // Calculate which week and which day in the pattern
  const weeks = Math.floor(classDayNumber / 2);
  const isSecondDay = classDayNumber % 2 === 1;
  
  // Determine which day of week this class day should be
  let targetDayOfWeek;
  if (firstDayOfWeek === day1) {
    // Started on first day of pattern
    targetDayOfWeek = isSecondDay ? day2 : day1;
  } else { // firstDayOfWeek === day2
    // Started on second day of pattern
    targetDayOfWeek = isSecondDay ? day1 : day2;
  }
  
  // Calculate the date
  const resultDate = new Date(firstDay);
  resultDate.setDate(resultDate.getDate() + weeks * 7);
  
  // Adjust to the correct day of week
  const currentDayOfWeek = resultDate.getDay();
  let daysToAdjust = targetDayOfWeek - currentDayOfWeek;
  if (daysToAdjust < 0) {
    daysToAdjust += 7;
  }
  resultDate.setDate(resultDate.getDate() + daysToAdjust);
  
  return resultDate;
};

// Get the class start date for a course (August 25th for MW, August 26th for TTH/TR)
export const getClassStartDate = (courseId, courses, year = 2025) => {
  const schedule = getCourseSchedule(courseId, courses);
  if (schedule === 'MW') {
    return `08-25-${year}`; // Monday, August 25th
  } else if (schedule === 'TR') {
    return `08-26-${year}`; // Tuesday, August 26th
  }
  return null;
};

// Create a "Class starts" marker assignment for a course
export const createClassStartsMarker = (courseId, courses, year = 2025) => {
  const startDate = getClassStartDate(courseId, courses, year);
  if (!startDate) return null;
  
  return {
    itemName: 'Class starts',
    startDate: startDate,
    startTime: '8:00 AM',
    dueDate: startDate,
    dueTime: '8:00 AM',
    isClassStartsMarker: true // Special flag to identify this marker
  };
};

// Find the class starts date from a course's assignments (looks for the marker)
export const findClassStartsDate = (assignments, courseId, courses) => {
  if (!assignments || assignments.length === 0) return null;
  
  // Look for the "Class starts" marker
  const marker = assignments.find(a => a.isClassStartsMarker || a.itemName === 'Class starts');
  if (marker && marker.startDate) {
    return marker.startDate; // Returns MM-DD-YYYY format
  }
  
  // If no marker found, calculate based on course schedule
  // This is a fallback - should ideally always have the marker
  const schedule = getCourseSchedule(courseId, courses);
  if (schedule) {
    // Find the earliest assignment date to determine year
    let earliestYear = new Date().getFullYear();
    assignments.forEach(a => {
      if (a.startDate) {
        const date = parseDate(a.startDate);
        if (date && date.getFullYear() < earliestYear) {
          earliestYear = date.getFullYear();
        }
      }
      if (a.dueDate) {
        const date = parseDate(a.dueDate);
        if (date && date.getFullYear() < earliestYear) {
          earliestYear = date.getFullYear();
        }
      }
    });
    return getClassStartDate(courseId, courses, earliestYear);
  }
  
  return null;
};

// Shift a date from TR schedule to MW schedule (back one day, smartly)
// Tuesday → Monday, Thursday → Wednesday
// Sunday stays Sunday, other days adjust appropriately
export const shiftDateTRtoMW = (dateStr) => {
  if (!dateStr) return dateStr;
  const date = parseDate(dateStr);
  if (!date) return dateStr;
  
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Shift back one day
  const shiftedDate = new Date(date);
  shiftedDate.setDate(shiftedDate.getDate() - 1);
  
  const newDayOfWeek = shiftedDate.getDay();
  
  // If it lands on Friday (5) or Saturday (6), move to Wednesday
  if (newDayOfWeek === 5) { // Friday
    shiftedDate.setDate(shiftedDate.getDate() - 2); // Move to Wednesday
  } else if (newDayOfWeek === 6) { // Saturday
    shiftedDate.setDate(shiftedDate.getDate() - 3); // Move to Wednesday
  }
  // Sunday (0) stays Sunday - that's fine for due dates
  // Monday (1) and Wednesday (3) are perfect for MW schedule
  
  return formatDate(shiftedDate);
};

// Copy and shift assignments from TR schedule to MW schedule
export const copyAndShiftTRtoMW = (assignments) => {
  if (!assignments || assignments.length === 0) return [];
  
  return assignments.map(assignment => {
    const shiftedAssignment = { ...assignment };
    
    // Shift start date
    if (assignment.startDate) {
      shiftedAssignment.startDate = shiftDateTRtoMW(assignment.startDate);
    }
    
    // Shift due date
    if (assignment.dueDate) {
      shiftedAssignment.dueDate = shiftDateTRtoMW(assignment.dueDate);
    }
    
    // Update class starts marker if present
    if (assignment.isClassStartsMarker) {
      // Keep the marker but update the date
      if (assignment.startDate) {
        shiftedAssignment.startDate = shiftDateTRtoMW(assignment.startDate);
      }
      if (assignment.dueDate) {
        shiftedAssignment.dueDate = shiftDateTRtoMW(assignment.dueDate);
      }
    }
    
    return shiftedAssignment;
  });
};

// Get semester date ranges
export const getSemesterDateRange = (semesterKey) => {
  const [semester, year] = semesterKey.split('-');
  const yearNum = parseInt(year);
  
  if (semester === 'Fall') {
    const start = new Date(yearNum, 7, 24); // August 24
    const end = new Date(yearNum, 11, 31); // December 31
    end.setHours(23, 59, 59, 999); // End of day
    return {
      start: start,
      end: end,
      label: `Fall ${year}`
    };
  } else if (semester === 'Spring') {
    const start = new Date(yearNum, 0, 1); // January 1
    const end = new Date(yearNum, 4, 31); // May 31 (full month)
    end.setHours(23, 59, 59, 999); // End of day
    return {
      start: start,
      end: end,
      label: `Spring ${year}`
    };
  } else if (semester === 'Summer1') {
    const start = new Date(yearNum, 5, 1); // June 1
    const end = new Date(yearNum, 6, 14); // July 14
    end.setHours(23, 59, 59, 999); // End of day
    return {
      start: start,
      end: end,
      label: `Summer 1 ${year}`
    };
  } else if (semester === 'Summer2') {
    const start = new Date(yearNum, 6, 16); // July 16
    const end = new Date(yearNum, 7, 23); // August 23
    end.setHours(23, 59, 59, 999); // End of day
    return {
      start: start,
      end: end,
      label: `Summer 2 ${year}`
    };
  }
  return null;
};

// Determine which semesters have assignments
export const getAvailableSemesters = (originalAssignments, acceptedFutureAssignments) => {
  const allAssignments = [...originalAssignments, ...acceptedFutureAssignments];
  const semesterSet = new Set();
  
  allAssignments.forEach(assignment => {
    const startDate = parseDate(assignment.startDate);
    const dueDate = parseDate(assignment.dueDate);
    
    [startDate, dueDate].forEach(date => {
      if (!date) return;
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-12
      const day = date.getDate();
      
      // Spring: January (1) through May (5) - full month
      if (month >= 1 && month <= 5) {
        semesterSet.add(`Spring-${year}`);
      }
      // Summer 1: June (6) to July 14
      else if (month === 6 || (month === 7 && day <= 14)) {
        semesterSet.add(`Summer1-${year}`);
      }
      // Summer 2: July 16 to August 23
      else if ((month === 7 && day >= 16) || (month === 8 && day <= 23)) {
        semesterSet.add(`Summer2-${year}`);
      }
      // Fall: August 24 through December (12)
      else if ((month === 8 && day >= 24) || month >= 9) {
        semesterSet.add(`Fall-${year}`);
      }
    });
  });
  
  return Array.from(semesterSet).sort();
};

// Helper function to normalize dates to midnight for comparison
export const normalizeDate = (date) => {
  if (!date) return null;
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

// Get the start date of the current semester based on a given date
export const getSemesterStartDate = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // Spring: January 1 to May 31
  if (month >= 1 && month <= 5) {
    return new Date(year, 0, 1); // January 1
  }
  // Summer 1: June 1 to July 14
  else if (month === 6 || (month === 7 && day <= 14)) {
    return new Date(year, 5, 1); // June 1
  }
  // Summer 2: July 16 to August 23
  else if ((month === 7 && day >= 16) || (month === 8 && day <= 23)) {
    return new Date(year, 6, 16); // July 16
  }
  // Fall: August 24 to December 31
  else if ((month === 8 && day >= 24) || month >= 9) {
    return new Date(year, 7, 24); // August 24
  }
  
  // Default to current date if somehow outside all ranges
  return date;
};

// Parse CSV file content
export const parseCsvFile = (csvContent) => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length >= headers.length) {
      const item = {
        itemName: values[0] || '',
        startDate: values[1] || null,
        startTime: values[2] || null,
        dueDate: values[3] || null,
        dueTime: values[4] || null
      };
      data.push(item);
    }
  }

  return data;
};

// Calendar generation utilities
export const getDaysInMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

