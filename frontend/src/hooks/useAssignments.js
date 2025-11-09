import { useMemo } from 'react';
import { parseDate, createClassStartsMarker } from '../utils/calendarUtils';

/**
 * Custom hook to manage assignment operations (apply adjustments, get assignments for date, etc.)
 * 
 * @param {Object} params - Configuration object
 * @param {Object} params.manualAdjustments - Current manual adjustments
 * @param {Array} params.originalAssignments - Original assignments array
 * @param {Array} params.acceptedFutureAssignments - Accepted future assignments array
 * @param {Array} params.offsetAssignments - Pending future assignments array
 * @param {Array} params.assignments - Fallback assignments array
 * @param {string} params.selectedCourse - Currently selected course ID
 * @param {Array} params.courses - Array of all courses
 * @param {string} params.calendarMode - Current calendar mode ('assignment' or 'class')
 * @param {Array} params.classSchedule - Class schedule data array
 * @returns {Object} Assignment operation functions
 */
export const useAssignments = ({
  manualAdjustments,
  originalAssignments,
  acceptedFutureAssignments,
  offsetAssignments,
  assignments,
  selectedCourse,
  courses,
  calendarMode = 'assignment',
  classSchedule = []
}) => {
  // Get a unique ID for an assignment
  const getAssignmentId = (assignment) => {
    return `${assignment.itemName}-${assignment.startDate || ''}-${assignment.dueDate || ''}`;
  };

  // Apply manual adjustments to an assignment
  const applyAdjustments = (assignment) => {
    const assignmentId = getAssignmentId(assignment);
    const adjustment = manualAdjustments[assignmentId];
    
    if (adjustment) {
      return {
        ...assignment,
        startDate: adjustment.startDate !== undefined ? adjustment.startDate : assignment.startDate,
        dueDate: adjustment.dueDate !== undefined ? adjustment.dueDate : assignment.dueDate,
        startTime: adjustment.startTime !== undefined ? adjustment.startTime : assignment.startTime,
        dueTime: adjustment.dueTime !== undefined ? adjustment.dueTime : assignment.dueTime
      };
    }
    return assignment;
  };

  // Get assignments for a specific date
  const getAssignmentsForDate = (date) => {
    if (!date) {
      console.warn('getAssignmentsForDate called with null/undefined date');
      return [];
    }
    
    // If in class calendar mode, return class schedule items for this date
    if (calendarMode === 'class') {
      const dateStr = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const scheduleItems = classSchedule.filter(item => item.date === dateStr);
      
      // Debug logging (only log first few calls to avoid spam)
      if (Math.random() < 0.01) { // Log 1% of calls
        console.log('getAssignmentsForDate (class mode):', {
          date: dateStr,
          classScheduleLength: classSchedule.length,
          foundItems: scheduleItems.length,
          sampleScheduleItem: classSchedule[0]
        });
      }
      
      // Also check for multi-day holidays (e.g., Thanksgiving extends to next day)
      const dateObj = new Date(date);
      const prevDay = new Date(dateObj);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = prevDay.toISOString().split('T')[0];
      
      // Check if previous day has a holiday that extends to this day
      const prevDayItems = classSchedule.filter(item => item.date === prevDayStr);
      prevDayItems.forEach(item => {
        const desc = item.description.toLowerCase();
        // Thanksgiving spans Nov 26-27, so if it's on Nov 26, also show on Nov 27
        if (desc.includes('thanksgiving')) {
          // Parse the date from the item (YYYY-MM-DD format)
          const [year, month, day] = item.date.split('-').map(Number);
          // If Thanksgiving is on Nov 26, also show it on Nov 27
          if (month === 11 && day === 26 && dateObj.getMonth() === 10 && dateObj.getDate() === 27) {
            // Create a copy of the item with the current date so it displays correctly
            scheduleItems.push({
              ...item,
              date: dateStr, // Use current date for display
              isFixedHoliday: true // Mark as fixed
            });
          }
        }
      });
      
      // Convert class schedule items to assignment-like format for display
      return scheduleItems.map(item => {
        const description = item.description.toLowerCase();
        let itemType = 'regular';
        
        // Detect item type based on description
        if (description.includes('thanksgiving') || 
            description.includes('labor day') || 
            description.includes('holiday') ||
            description.includes('christmas') ||
            description.includes('new year') ||
            description.includes('easter') ||
            description.includes('memorial day') ||
            description.includes('independence day') ||
            description.includes('presidents day') ||
            description.includes('martin luther king') ||
            description.includes('mlk day')) {
          itemType = 'holiday';
        } else if (description.includes('final exam') || description.includes('final')) {
          itemType = 'exam';
        } else if (description.includes('test')) {
          itemType = 'test';
        } else if (description.includes('quiz')) {
          itemType = 'quiz';
        }
        
        return {
          itemName: item.description,
          startDate: item.date,
          dueDate: null,
          startTime: null,
          dueTime: null,
          isClassSchedule: true, // Flag to identify class schedule items
          classScheduleType: itemType // Type: 'quiz', 'test', 'exam', 'holiday', or 'regular'
        };
      });
    }
    
    // Assignment calendar mode - combine original assignments, accepted future assignments, and pending future assignments
    const allAssignments = [];
    
    // Add original assignments (with adjustments applied)
    const originals = (originalAssignments && originalAssignments.length > 0) 
      ? originalAssignments.map(applyAdjustments)
      : (assignments && assignments.length > 0 ? assignments.map(applyAdjustments) : []);
    allAssignments.push(...originals);
    
    // Add accepted future assignments (permanent, with adjustments applied)
    if (acceptedFutureAssignments && acceptedFutureAssignments.length > 0) {
      allAssignments.push(...acceptedFutureAssignments.map(applyAdjustments));
    }
    
    // Add pending future assignments (not yet accepted, with adjustments applied)
    if (offsetAssignments && offsetAssignments.length > 0) {
      allAssignments.push(...offsetAssignments.map(applyAdjustments));
    }
    
    // Add "Class starts" marker for the selected course if it matches the date
    if (selectedCourse && courses && courses.length > 0) {
      const classStartsMarker = createClassStartsMarker(selectedCourse, courses, date.getFullYear());
      if (classStartsMarker) {
        const markerStartDate = parseDate(classStartsMarker.startDate);
        if (markerStartDate && markerStartDate.toDateString() === date.toDateString()) {
          // Check if marker doesn't already exist (avoid duplicates)
          const markerExists = allAssignments.some(a => a.isClassStartsMarker);
          if (!markerExists) {
            allAssignments.push(classStartsMarker);
          }
        }
      }
    }
    
    if (allAssignments.length === 0) {
      return [];
    }
    
    const filtered = allAssignments.filter(assignment => {
      const startDate = parseDate(assignment.startDate);
      const dueDate = parseDate(assignment.dueDate);

      if (startDate && startDate.toDateString() === date.toDateString()) {
        return true;
      }
      if (dueDate && dueDate.toDateString() === date.toDateString()) {
        return true;
      }
      return false;
    });
    
    // Debug logging (only log first few calls to avoid spam)
    if (Math.random() < 0.01) { // Log 1% of calls
      console.log('getAssignmentsForDate (assignment mode):', {
        date: date.toDateString(),
        allAssignmentsLength: allAssignments.length,
        originalAssignmentsLength: originalAssignments?.length || 0,
        foundItems: filtered.length,
        sampleAssignment: allAssignments[0] ? {
          itemName: allAssignments[0].itemName,
          startDate: allAssignments[0].startDate,
          parsedStart: parseDate(allAssignments[0].startDate)?.toDateString()
        } : null
      });
    }
    
    return filtered;
  };

  return {
    getAssignmentId,
    applyAdjustments,
    getAssignmentsForDate
  };
};

