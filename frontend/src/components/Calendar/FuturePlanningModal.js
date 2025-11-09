import React, { useState, useEffect } from 'react';
import { getClassSchedule, getCourseSchedule, getDefaultFutureStartDate, parseDate, findClassStartsDate, findFirstClassDay } from '../../utils/calendarUtils';

const FuturePlanningModal = ({
  show,
  courses,
  futurePlanningCourse,
  currentStartDate,
  futureStartDate,
  originalAssignments,
  courseCalendars,
  onClose,
  onCourseChange,
  onCurrentStartDateChange,
  onFutureStartDateChange,
  onCalculate,
  shiftForwardOneDay,
  setShiftForwardOneDay
}) => {
  // Get the year from original assignments or use current year
  const getDefaultYear = () => {
    if (originalAssignments && originalAssignments.length > 0) {
      const earliest = originalAssignments.reduce((earliest, assignment) => {
        const startDate = assignment.startDate ? parseDate(assignment.startDate) : null;
        const dueDate = assignment.dueDate ? parseDate(assignment.dueDate) : null;
        let earliestDate = earliest;
        if (startDate && (!earliestDate || startDate < earliestDate)) {
          earliestDate = startDate;
        }
        if (dueDate && (!earliestDate || dueDate < earliestDate)) {
          earliestDate = dueDate;
        }
        return earliestDate;
      }, null);
      if (earliest) {
        return earliest.getFullYear();
      }
    }
    return new Date().getFullYear();
  };

  const defaultYear = getDefaultYear();

  // Get all courses that have calendars
  const getCoursesWithCalendars = () => {
    return courses.filter(c => {
      const hasCalendar = c.hasCalendar || courseCalendars[c.id];
      return hasCalendar;
    });
  };

  // Auto-detect current semester start date when course is selected
  useEffect(() => {
    if (futurePlanningCourse && !currentStartDate) {
      // Get the course's calendar data
      const courseData = courseCalendars[futurePlanningCourse];
      const assignments = courseData?.originalAssignments || originalAssignments || [];
      
      if (assignments.length > 0) {
        // Find the class starts date from the marker
        const classStartsDateStr = findClassStartsDate(assignments, futurePlanningCourse, courses);
        if (classStartsDateStr) {
          // Convert MM-DD-YYYY to YYYY-MM-DD for the input
          const [month, day, year] = classStartsDateStr.split('-').map(Number);
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          onCurrentStartDateChange(dateStr);
        }
      }
    }
  }, [futurePlanningCourse, currentStartDate, courseCalendars, originalAssignments, courses, onCurrentStartDateChange]);

  useEffect(() => {
    if (show && originalAssignments.length > 0 && !futureStartDate) {
      const defaultDate = getDefaultFutureStartDate(originalAssignments);
      if (defaultDate) {
        onFutureStartDateChange(defaultDate);
      }
    }
  }, [show, originalAssignments, futureStartDate, onFutureStartDateChange]);

  if (!show) return null;

  const handleCourseSelect = (courseId) => {
    onCourseChange(courseId);
    // Reset current start date - it will be auto-detected in useEffect
    onCurrentStartDateChange('');
  };

  const handleCalculate = () => {
    if (!currentStartDate) {
      alert('Please select a class first.');
      return;
    }
    onCalculate();
  };

  return (
    <div className="future-planning-modal-overlay" onClick={onClose}>
      <div className="future-planning-modal future-planning-modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="future-planning-header">
          <h2 className="future-planning-title">Future Planning</h2>
          <button className="close-future-planning" onClick={onClose}>×</button>
        </div>
        <div className="future-planning-content">
          {/* Class Selection - List all courses with calendars */}
          <div className="date-input-group">
            <label htmlFor="future-planning-course"><strong>What class do you want to plan with?</strong></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {getCoursesWithCalendars().map(course => {
                const schedule = getCourseSchedule(course.id, courses);
                const scheduleText = schedule === 'MW' ? 'Monday/Wednesday' : schedule === 'TR' ? 'Tuesday/Thursday' : '';
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => handleCourseSelect(course.id)}
                    className={`course-type-button ${futurePlanningCourse === course.id ? 'selected' : ''}`}
                    style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.95rem',
                      backgroundColor: futurePlanningCourse === course.id ? 'var(--accent-color)' : 'var(--bg-secondary)',
                      color: futurePlanningCourse === course.id ? 'var(--bg-primary)' : 'var(--text-primary)',
                      border: '2px solid var(--accent-color)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{course.name} - {course.schedule}</span>
                    {scheduleText && (
                      <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>({scheduleText})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Semester Start Date - Auto-determined, shown for reference */}
          {futurePlanningCourse && currentStartDate && (
            <div className="date-input-group">
              <label><strong>Current Semester Start:</strong></label>
              <div style={{ 
                marginTop: '0.5rem', 
                padding: '0.75rem', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '6px',
                fontSize: '0.95rem'
              }}>
                {(() => {
                  const [year, month, day] = currentStartDate.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  });
                })()}
                {(() => {
                  const schedule = getCourseSchedule(futurePlanningCourse, courses);
                  if (schedule) {
                    return (
                      <div className="schedule-indicator" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        {schedule === 'MW' ? 'Monday/Wednesday Class' : 'Tuesday/Thursday Class'}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          )}

          {/* Shift Forward One Day Checkbox */}
          {futurePlanningCourse && (
            <div className="date-input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={shiftForwardOneDay || false}
                  onChange={(e) => setShiftForwardOneDay(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <strong>Shift forward one day</strong>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                  (MW → TR or TR → MW)
                </span>
              </label>
            </div>
          )}

          {/* Next Semester Start Date */}
          {futurePlanningCourse && (
            <div className="date-input-group">
              <label htmlFor="future-start-date"><strong>Next Semester Start Date:</strong></label>
              <input
                type="date"
                id="future-start-date"
                value={futureStartDate || (originalAssignments.length > 0 ? getDefaultFutureStartDate(originalAssignments) : '')}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  // Auto-adjust based on course schedule
                  const courseSchedule = getCourseSchedule(futurePlanningCourse, courses);
                  if (courseSchedule && selectedDate) {
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    const dateObj = new Date(year, month - 1, day);
                    const dayOfWeek = dateObj.getDay();
                    
                    if (courseSchedule === 'TR') {
                      // Tuesday/Thursday: use as-is if it's T/Th, otherwise adjust
                      if (dayOfWeek === 2 || dayOfWeek === 4) {
                        // Already Tuesday or Thursday
                        onFutureStartDateChange(selectedDate);
                      } else if (dayOfWeek === 1) {
                        // Monday - go to Tuesday
                        dateObj.setDate(dateObj.getDate() + 1);
                        const adjusted = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                        onFutureStartDateChange(adjusted);
                      } else if (dayOfWeek === 3) {
                        // Wednesday - go to Thursday
                        dateObj.setDate(dateObj.getDate() + 1);
                        const adjusted = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                        onFutureStartDateChange(adjusted);
                      } else {
                        // Other days - find next Tuesday
                        const nextTuesday = findFirstClassDay(selectedDate, 'TR');
                        if (nextTuesday) {
                          const adjusted = `${nextTuesday.getFullYear()}-${String(nextTuesday.getMonth() + 1).padStart(2, '0')}-${String(nextTuesday.getDate()).padStart(2, '0')}`;
                          onFutureStartDateChange(adjusted);
                        } else {
                          onFutureStartDateChange(selectedDate);
                        }
                      }
                    } else if (courseSchedule === 'MW') {
                      // Monday/Wednesday: adjust to next MW day
                      const nextMW = findFirstClassDay(selectedDate, 'MW');
                      if (nextMW) {
                        const adjusted = `${nextMW.getFullYear()}-${String(nextMW.getMonth() + 1).padStart(2, '0')}-${String(nextMW.getDate()).padStart(2, '0')}`;
                        onFutureStartDateChange(adjusted);
                      } else {
                        onFutureStartDateChange(selectedDate);
                      }
                    } else {
                      onFutureStartDateChange(selectedDate);
                    }
                  } else {
                    onFutureStartDateChange(selectedDate);
                  }
                }}
                className="date-input"
              />
              {futureStartDate && (() => {
                const schedule = getClassSchedule(futureStartDate);
                if (schedule) {
                  return (
                    <div className="schedule-indicator" style={{ marginTop: '0.5rem' }}>
                      {schedule === 'MW' ? 'Monday/Wednesday Class' : 'Tuesday/Thursday Class'}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          <div className="future-planning-buttons">
            <button className="calculate-button" onClick={handleCalculate} disabled={!futurePlanningCourse || !futureStartDate}>
              Calculate Future Calendar
            </button>
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuturePlanningModal;
