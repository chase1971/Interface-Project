import React, { useState, useRef, useEffect } from 'react';
import ClearCalendarModal from './ClearCalendarModal';

const CourseSidebar = ({ 
  courses, 
  selectedCourse, 
  courseCalendars, 
  onCourseSelect, 
  onImportClick, 
  onSemesterClick,
  showCalendarOptionsMenu,
  onCalendarOptionsToggle,
  onFuturePlanningClick,
  onClearCalendarClick,
  showClearCalendarMenu,
  currentDate,
  onClearCalendarClose,
  onClearCalendarConfirm,
  onSaveDefaultCalendarClick
}) => {
  const [isSemesterMenuOpen, setIsSemesterMenuOpen] = useState(false);
  const [calendarOptionsMenuTop, setCalendarOptionsMenuTop] = useState(50);
  const calendarOptionsButtonRef = useRef(null);

  // Update menu position when it opens or when semesters menu state changes
  useEffect(() => {
    if (showCalendarOptionsMenu && calendarOptionsButtonRef.current) {
      const rect = calendarOptionsButtonRef.current.getBoundingClientRect();
      setCalendarOptionsMenuTop(rect.top);
    }
  }, [showCalendarOptionsMenu, isSemesterMenuOpen]);

  const getSemesterButtons = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    const buttons = [];

    // Always show Fall of current year
    buttons.push({ label: `Fall ${currentYear}`, semester: 'Fall', year: currentYear });
    
    // Show Spring, Summer, and Fall of next year
    buttons.push({ label: `Spring ${nextYear}`, semester: 'Spring', year: nextYear });
    buttons.push({ label: `Summer ${nextYear}`, semester: 'Summer', year: nextYear });
    buttons.push({ label: `Fall ${nextYear}`, semester: 'Fall', year: nextYear });

    return buttons;
  };

  const handleSemesterButtonClick = () => {
    setIsSemesterMenuOpen(!isSemesterMenuOpen);
  };

  const handleSemesterSelect = (semester, year) => {
    if (onSemesterClick) {
      onSemesterClick(semester, year);
    }
    // Don't close the menu - user must click the button to close it
  };

  return (
    <div className="course-sidebar">
      <div className="course-sidebar-header">
        <h3 className="course-sidebar-title">Courses</h3>
      </div>
      <div className="course-list">
        {courses.map(course => {
          // Only check courseCalendars - ignore hard-coded hasCalendar flag
          // A course only has a calendar if it was explicitly imported
          const hasCalendar = courseCalendars[course.id] && 
                             courseCalendars[course.id].originalAssignments && 
                             courseCalendars[course.id].originalAssignments.length > 0;
          return (
            <div
              key={course.id}
              className={`course-item ${selectedCourse === course.id ? 'selected' : ''} ${!hasCalendar ? 'no-calendar' : ''}`}
              onClick={() => {
                if (hasCalendar) {
                  onCourseSelect(course.id);
                } else {
                  // If no calendar, open import modal
                  onImportClick(course.id);
                }
              }}
            >
              <div className="course-name">{course.name}</div>
              <div className="course-schedule">{course.schedule}</div>
              {!hasCalendar && (
                <button 
                  className="import-calendar-button-small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImportClick(course.id);
                  }}
                >
                  Import Calendar
                </button>
              )}
            </div>
          );
        })}
        <div className="semester-button-wrapper">
          <button 
            className="semester-toggle-button"
            onClick={handleSemesterButtonClick}
          >
            {isSemesterMenuOpen ? '▼ Semesters' : '▶ Semesters'}
          </button>
          {isSemesterMenuOpen && (
            <div className="semester-menu">
              <div className="semester-menu-buttons">
                {getSemesterButtons().map((btn, idx) => (
                  <button
                    key={idx}
                    className="semester-menu-button"
                    onClick={() => handleSemesterSelect(btn.semester, btn.year)}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="calendar-options-button-wrapper" ref={calendarOptionsButtonRef}>
          <button 
            className="calendar-options-toggle-button"
            onClick={onCalendarOptionsToggle}
          >
            {showCalendarOptionsMenu ? '▼ Calendar Options' : '▶ Calendar Options'}
          </button>
          {showCalendarOptionsMenu && (
            <div 
              className={`calendar-options-menu ${isSemesterMenuOpen ? 'below-semesters' : ''}`}
              style={{
                top: `${calendarOptionsMenuTop}px`
              }}
            >
              <div className="calendar-options-menu-buttons">
                <button
                  className="calendar-options-menu-button"
                  onClick={onFuturePlanningClick}
                >
                  Future Planning
                </button>
                <button
                  className="calendar-options-menu-button"
                  onClick={onSaveDefaultCalendarClick}
                >
                  Save Current Calendar to Default
                </button>
                <button
                  type="button"
                  className="calendar-options-menu-button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onClearCalendarClick) {
                      onClearCalendarClick(e);
                    }
                  }}
                >
                  Clear Calendar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Clear Calendar Modal - moved outside menu so it persists when menu closes */}
      {showClearCalendarMenu && (
        <ClearCalendarModal
          show={showClearCalendarMenu}
          currentDate={currentDate}
          selectedCourse={selectedCourse}
          onClose={onClearCalendarClose}
          onConfirm={onClearCalendarConfirm}
        />
      )}
    </div>
  );
};

export default CourseSidebar;

