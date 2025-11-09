import React from 'react';

const SemesterSidebar = ({ onSemesterClick }) => {
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

  return (
    <div className="semester-sidebar">
      <div className="semester-sidebar-header">
        <h3 className="semester-sidebar-title">Semesters</h3>
      </div>
      <div className="semester-buttons-vertical">
        {getSemesterButtons().map((btn, idx) => (
          <button
            key={idx}
            className="semester-button-vertical"
            onClick={() => onSemesterClick(btn.semester, btn.year)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SemesterSidebar;

