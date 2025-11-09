import { useState, useEffect } from 'react';
import {
  parseDate,
  formatDate,
  getClassSchedule,
  getCourseSchedule,
  findFirstClassDay,
  getDefaultFutureStartDate
} from '../utils/calendarUtils';

/**
 * Custom hook to manage future planning functionality for calendar assignments
 * 
 * @param {Object} params - Configuration object
 * @param {Array} params.courses - List of courses
 * @param {Array} params.originalAssignments - Original assignments array
 * @param {Array} params.assignments - Fallback assignments array
 * @param {boolean} params.showFuturePlanning - Whether future planning modal is open
 * @param {Function} params.setCurrentDate - Function to navigate calendar to a date
 * @returns {Object} Future planning state and handlers
 */
export const useFuturePlanning = ({
  courses,
  originalAssignments,
  assignments,
  showFuturePlanning,
  setCurrentDate
}) => {
  // Future planning state
  const [futureStartDate, setFutureStartDate] = useState('');
  const [currentStartDate, setCurrentStartDate] = useState('');
  const [futurePlanningCourse, setFuturePlanningCourse] = useState('');
  const [offsetAssignments, setOffsetAssignments] = useState([]);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [shiftForwardOneDay, setShiftForwardOneDay] = useState(false);

  // Set default future start date when modal opens
  useEffect(() => {
    if (showFuturePlanning && futurePlanningCourse && !futureStartDate && originalAssignments.length > 0) {
      const defaultDate = getDefaultFutureStartDate(originalAssignments);
      if (defaultDate) {
        setFutureStartDate(defaultDate);
      }
    }
  }, [showFuturePlanning, futurePlanningCourse, originalAssignments, futureStartDate]);

  // Calculate offset and create future calendar
  const calculateFutureCalendar = () => {
    if (!futurePlanningCourse) {
      alert('Please select a class.');
      return;
    }
    
    if (!currentStartDate) {
      alert('Please select the current semester start date.');
      return;
    }
    
    if (!futureStartDate) {
      alert('Please select the next semester start date.');
      return;
    }

    // Get schedule type from the current start date (determined by user's MW/TTH selection)
    const currentSchedule = getClassSchedule(currentStartDate);
    if (!currentSchedule) {
      alert('Could not determine the schedule type from the current start date. Please ensure it is a Monday, Tuesday, Wednesday, or Thursday.');
      return;
    }

    // Parse dates correctly from YYYY-MM-DD format
    const [currentYear, currentMonth, currentDay] = currentStartDate.split('-').map(Number);
    const currentStart = new Date(currentYear, currentMonth - 1, currentDay);
    
    const [futureYear, futureMonth, futureDay] = futureStartDate.split('-').map(Number);
    let newStartDate = new Date(futureYear, futureMonth - 1, futureDay);
    let newSchedule = getClassSchedule(futureStartDate);
    
    // If shiftForwardOneDay is enabled, adjust the future start date
    if (shiftForwardOneDay) {
      // Shift forward one day
      newStartDate.setDate(newStartDate.getDate() + 1);
      // Recalculate schedule for the shifted date
      const shiftedDateStr = `${newStartDate.getFullYear()}-${String(newStartDate.getMonth() + 1).padStart(2, '0')}-${String(newStartDate.getDate()).padStart(2, '0')}`;
      newSchedule = getClassSchedule(shiftedDateStr);
      // newStartDate is already a Date object, no need to convert
    }
    
    // Automatically adjust future start date to match the schedule
    // If shiftForwardOneDay is enabled, use the opposite schedule; otherwise use current schedule
    let targetSchedule = currentSchedule;
    if (shiftForwardOneDay) {
      // Switch schedules: MW ↔ TR
      targetSchedule = currentSchedule === 'MW' ? 'TR' : 'MW';
    }
    
    const futureDayOfWeek = newStartDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    if (targetSchedule === 'MW') {
      // Need Monday (1) or Wednesday (3)
      if (futureDayOfWeek === 2) { // Tuesday - go back to Monday
        newStartDate.setDate(newStartDate.getDate() - 1);
      } else if (futureDayOfWeek === 4) { // Thursday - go back to Wednesday
        newStartDate.setDate(newStartDate.getDate() - 1);
      } else if (futureDayOfWeek === 5) { // Friday - go back to Wednesday
        newStartDate.setDate(newStartDate.getDate() - 2);
      } else if (futureDayOfWeek === 6) { // Saturday - go forward to Monday
        newStartDate.setDate(newStartDate.getDate() + 2);
      } else if (futureDayOfWeek === 0) { // Sunday - go forward to Monday
        newStartDate.setDate(newStartDate.getDate() + 1);
      }
      // If it's already Monday (1) or Wednesday (3), keep it
    } else if (targetSchedule === 'TR') {
      // Need Tuesday (2) or Thursday (4)
      if (futureDayOfWeek === 1) { // Monday - go forward to Tuesday
        newStartDate.setDate(newStartDate.getDate() + 1);
      } else if (futureDayOfWeek === 3) { // Wednesday - go forward to Thursday
        newStartDate.setDate(newStartDate.getDate() + 1);
      } else if (futureDayOfWeek === 5) { // Friday - go back to Thursday
        newStartDate.setDate(newStartDate.getDate() - 1);
      } else if (futureDayOfWeek === 6) { // Saturday - go forward to Tuesday
        newStartDate.setDate(newStartDate.getDate() + 3);
      } else if (futureDayOfWeek === 0) { // Sunday - go forward to Tuesday
        newStartDate.setDate(newStartDate.getDate() + 2);
      }
      // If it's already Tuesday (2) or Thursday (4), keep it
    }
    
    // Recalculate schedule after adjustment
    const adjustedDateStr = `${newStartDate.getFullYear()}-${String(newStartDate.getMonth() + 1).padStart(2, '0')}-${String(newStartDate.getDate()).padStart(2, '0')}`;
    newSchedule = getClassSchedule(adjustedDateStr);
    
    if (!newSchedule) {
      alert('Could not determine the schedule type for the future start date.');
      return;
    }

    // Get assignments for the selected course - always use original assignments
    const sourceAssignments = (originalAssignments && originalAssignments.length > 0) 
      ? originalAssignments 
      : assignments;
    if (sourceAssignments.length === 0) {
      alert('No assignments found for the selected course.');
      return;
    }

    // Find the actual first class day for current calendar (from the "Class starts" marker)
    const currentFirstClassDay = findFirstClassDay(currentStartDate, currentSchedule);
    
    // Use the adjusted future start date for finding the first class day
    const adjustedFutureDateStr = `${newStartDate.getFullYear()}-${String(newStartDate.getMonth() + 1).padStart(2, '0')}-${String(newStartDate.getDate()).padStart(2, '0')}`;
    let futureFirstClassDay = findFirstClassDay(adjustedFutureDateStr, newSchedule);
    
    // If shiftForwardOneDay is enabled, add one day to the future start
    if (shiftForwardOneDay && futureFirstClassDay) {
      futureFirstClassDay = new Date(futureFirstClassDay);
      futureFirstClassDay.setDate(futureFirstClassDay.getDate() + 1);
    }
    
    if (!currentFirstClassDay || !futureFirstClassDay) {
      alert('Could not determine the first class day.');
      return;
    }

    // Find the "Class starts" marker date in the source assignments to use as reference
    const classStartsMarker = sourceAssignments.find(a => a.isClassStartsMarker || a.itemName === 'Class starts');
    const classStartsDate = classStartsMarker ? parseDate(classStartsMarker.startDate) : currentFirstClassDay;
    
    if (!classStartsDate) {
      alert('Could not find class start date.');
      return;
    }

    // Create offset assignments preserving relative spacing
    // Calculate days from class start for each assignment, then apply to future calendar
    const offset = sourceAssignments
      .filter(assignment => !assignment.isClassStartsMarker) // Exclude the marker itself
      .map(assignment => {
        const offsetAssignment = { ...assignment };
        
        // Calculate days from class start for start date
        if (assignment.startDate) {
          const startDate = parseDate(assignment.startDate);
          if (startDate) {
            // Calculate days from class start
            const daysFromStart = Math.floor((startDate - classStartsDate) / (1000 * 60 * 60 * 24));
            // Apply to future start date
            const futureDate = new Date(futureFirstClassDay);
            futureDate.setDate(futureDate.getDate() + daysFromStart);
            offsetAssignment.startDate = formatDate(futureDate);
          }
        }
        
        // Calculate days from class start for due date
        if (assignment.dueDate) {
          const dueDate = parseDate(assignment.dueDate);
          if (dueDate) {
            // Calculate days from class start
            const daysFromStart = Math.floor((dueDate - classStartsDate) / (1000 * 60 * 60 * 24));
            // Apply to future start date
            const futureDate = new Date(futureFirstClassDay);
            futureDate.setDate(futureDate.getDate() + daysFromStart);
            offsetAssignment.dueDate = formatDate(futureDate);
          }
        }
        
        return offsetAssignment;
      });

    // Add future assignments as pending (not yet accepted)
    setOffsetAssignments(offset);
    setHasPendingChanges(true);
    
    // Navigate to the start date in the calendar (use adjusted date)
    // Create a fresh Date object to ensure it's valid
    if (setCurrentDate) {
      const navYear = newStartDate.getFullYear();
      const navMonth = newStartDate.getMonth();
      // Ensure we have valid year and month values
      if (navYear > 1900 && navYear < 2100 && navMonth >= 0 && navMonth < 12) {
        setCurrentDate(new Date(navYear, navMonth, 1));
      } else {
        console.error('Invalid date for navigation:', { navYear, navMonth, newStartDate });
      }
    }
  };

  // Accept pending future assignments (make them permanent)
  // This now REPLACES existing future assignments instead of adding to them
  const acceptFutureAssignments = (setAcceptedFutureAssignments) => {
    if (offsetAssignments.length > 0) {
      // Replace instead of append - clear existing and set new ones
      setAcceptedFutureAssignments(offsetAssignments);
      setOffsetAssignments([]);
      setHasPendingChanges(false);
    }
  };

  // Clear pending future assignments
  const clearPendingFutureAssignments = () => {
    setOffsetAssignments([]);
    setHasPendingChanges(false);
  };

  return {
    // State
    futureStartDate,
    currentStartDate,
    futurePlanningCourse,
    offsetAssignments,
    hasPendingChanges,
    shiftForwardOneDay,
    // Setters
    setFutureStartDate,
    setCurrentStartDate,
    setFuturePlanningCourse,
    setOffsetAssignments,
    setHasPendingChanges,
    setShiftForwardOneDay,
    // Handlers
    calculateFutureCalendar,
    acceptFutureAssignments,
    clearPendingFutureAssignments
  };
};

