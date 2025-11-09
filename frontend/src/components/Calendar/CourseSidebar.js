import React, { useState } from 'react';

const CourseSidebar = ({ courses, selectedCourse, courseCalendars, onCourseSelect, onImportClick, onSemesterClick }) => {
  const [isSemesterMenuOpen, setIsSemesterMenuOpen] = useState(false);

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
        {courses.map(course => (
          <div
            key={course.id}
            className={`course-item ${selectedCourse === course.id ? 'selected' : ''} ${!course.hasCalendar && !courseCalendars[course.id] ? 'no-calendar' : ''}`}
            onClick={() => {
              if (course.hasCalendar || courseCalendars[course.id]) {
                onCourseSelect(course.id);
              }
            }}
          >
            <div className="course-name">{course.name}</div>
            <div className="course-schedule">{course.schedule}</div>
            {!course.hasCalendar && !courseCalendars[course.id] && (
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
        ))}
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
      </div>
    </div>
  );
};

export default CourseSidebar;

