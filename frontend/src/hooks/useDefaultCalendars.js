import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Custom hook to manage default calendar templates
export const useDefaultCalendars = () => {
  const [defaultCalendars, setDefaultCalendars] = useLocalStorage('defaultCalendars', []);

  // Get all default calendars
  const getDefaultCalendars = () => {
    return defaultCalendars || [];
  };

  // Get a specific default calendar by ID
  const getDefaultCalendar = (calendarId) => {
    return defaultCalendars.find(cal => cal.id === calendarId) || null;
  };

  // Add a new default calendar
  const addDefaultCalendar = (calendarData) => {
    const newCalendar = {
      id: calendarData.id || `default-${Date.now()}`,
      name: calendarData.name,
      courseType: calendarData.courseType, // e.g., 'College Algebra'
      schedule: calendarData.schedule, // e.g., 'Monday, Wednesday'
      semester: calendarData.semester, // e.g., 'Fall'
      assignments: calendarData.assignments || [],
      classSchedule: calendarData.classSchedule || [], // Class schedule items
      createdAt: calendarData.createdAt || new Date().toISOString()
    };
    
    setDefaultCalendars(prev => {
      // Check if calendar with same ID exists
      const existing = prev.find(cal => cal.id === newCalendar.id);
      if (existing) {
        // Update existing
        return prev.map(cal => cal.id === newCalendar.id ? newCalendar : cal);
      } else {
        // Add new
        return [...prev, newCalendar];
      }
    });
    
    return newCalendar;
  };

  // Remove a default calendar
  const removeDefaultCalendar = (calendarId) => {
    setDefaultCalendars(prev => prev.filter(cal => cal.id !== calendarId));
  };

  // Get default calendars filtered by course type, schedule, or semester
  const getDefaultCalendarsByFilter = (filters = {}) => {
    let filtered = defaultCalendars;
    
    if (filters.courseType) {
      filtered = filtered.filter(cal => cal.courseType === filters.courseType);
    }
    
    if (filters.schedule) {
      filtered = filtered.filter(cal => cal.schedule === filters.schedule);
    }
    
    if (filters.semester) {
      filtered = filtered.filter(cal => cal.semester === filters.semester);
    }
    
    return filtered;
  };

  return {
    defaultCalendars: getDefaultCalendars(),
    getDefaultCalendar,
    addDefaultCalendar,
    removeDefaultCalendar,
    getDefaultCalendarsByFilter
  };
};

