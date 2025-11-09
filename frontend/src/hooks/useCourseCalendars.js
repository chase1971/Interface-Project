import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Custom hook to manage course calendars
export const useCourseCalendars = () => {
  const [courseCalendars, setCourseCalendars] = useLocalStorage('courseCalendars', {});

  // Get calendar data for a specific course
  const getCourseCalendar = (courseId) => {
    return courseCalendars[courseId] || null;
  };

  // Set calendar data for a specific course
  const setCourseCalendar = (courseId, calendarData) => {
    setCourseCalendars(prev => ({
      ...prev,
      [courseId]: calendarData
    }));
  };

  // Update accepted future assignments for a course
  const updateAcceptedFutureAssignments = (courseId, acceptedAssignments) => {
    setCourseCalendars(prev => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        acceptedFutureAssignments: acceptedAssignments
      }
    }));
  };

  // Clear assignments in a date range for a course
  const clearCourseAssignmentsInRange = (courseId, startDate, endDate, normalizeDate, parseDate) => {
    const courseData = courseCalendars[courseId];
    if (!courseData) return;

    const rangeStart = normalizeDate(startDate);
    const rangeEnd = endDate; // Already set to end of day

    const filteredOriginals = (courseData.originalAssignments || []).filter(assignment => {
      const start = normalizeDate(parseDate(assignment.startDate));
      const due = normalizeDate(parseDate(assignment.dueDate));
      const startInRange = start && start >= rangeStart && start <= rangeEnd;
      const dueInRange = due && due >= rangeStart && due <= rangeEnd;
      return !startInRange && !dueInRange;
    });

    const filteredAccepted = (courseData.acceptedFutureAssignments || []).filter(assignment => {
      const start = normalizeDate(parseDate(assignment.startDate));
      const due = normalizeDate(parseDate(assignment.dueDate));
      const startInRange = start && start >= rangeStart && start <= rangeEnd;
      const dueInRange = due && due >= rangeStart && due <= rangeEnd;
      return !startInRange && !dueInRange;
    });

    setCourseCalendars(prev => ({
      ...prev,
      [courseId]: {
        originalAssignments: filteredOriginals,
        acceptedFutureAssignments: filteredAccepted
      }
    }));

    return {
      originalAssignments: filteredOriginals,
      acceptedFutureAssignments: filteredAccepted
    };
  };

  // Delete a course calendar entirely
  const deleteCourseCalendar = (courseId) => {
    setCourseCalendars(prev => {
      const updated = { ...prev };
      delete updated[courseId];
      return updated;
    });
  };

  return {
    courseCalendars,
    getCourseCalendar,
    setCourseCalendar,
    updateAcceptedFutureAssignments,
    clearCourseAssignmentsInRange,
    deleteCourseCalendar
  };
};

