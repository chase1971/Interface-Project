import React from 'react';

/**
 * Component for selecting a future semester
 * @param {Array} futureSemesters - Array of semester objects
 * @param {Function} onSelectSemester - Callback when a semester is selected
 */
const SemesterSelection = ({ futureSemesters, onSelectSemester }) => {
  return (
    <div className="semester-selection">
      <h2>Select a Semester</h2>
      <div className="semester-list">
        {futureSemesters.map(semester => (
          <button
            key={semester.key}
            className="semester-button"
            onClick={() => onSelectSemester(semester)}
          >
            {semester.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SemesterSelection;

