import React from 'react';
import { getSemesterDateRange, getAvailableSemesters } from '../../utils/calendarUtils';

const ClearCalendarModal = ({
  show,
  showConfirmation,
  selectedSemester,
  clearDateRange,
  originalAssignments,
  acceptedFutureAssignments,
  onClose,
  onSemesterSelect,
  onConfirm,
  onCancel
}) => {
  if (!show) return null;

  const availableSemesters = getAvailableSemesters(originalAssignments, acceptedFutureAssignments);

  if (showConfirmation) {
    return (
      <div className="future-planning-modal-overlay" onClick={onCancel}>
        <div className="future-planning-modal" onClick={(e) => e.stopPropagation()}>
          <div className="future-planning-header">
            <h2 className="future-planning-title">Confirm Clear</h2>
            <button className="close-future-planning" onClick={onCancel}>×</button>
          </div>
          <div className="future-planning-content">
            <p className="future-planning-description">
              Are you sure you want to delete everything from {clearDateRange.start ? clearDateRange.start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''} to {clearDateRange.end ? clearDateRange.end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}?
            </p>

            <div className="future-planning-buttons">
              <button className="calculate-button" onClick={onConfirm}>
                Yes, Clear
              </button>
              <button className="cancel-button" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="future-planning-modal-overlay" onClick={onClose}>
      <div className="future-planning-modal" onClick={(e) => e.stopPropagation()}>
        <div className="future-planning-header">
          <h2 className="future-planning-title">Clear Calendar</h2>
          <button className="close-future-planning" onClick={onClose}>×</button>
        </div>
        <div className="future-planning-content">
          <p className="future-planning-description">
            What semester do you want to clear?
          </p>
          
          <div className="date-input-group">
            <label htmlFor="semester-select">Select Semester:</label>
            <select
              id="semester-select"
              value={selectedSemester}
              onChange={(e) => {
                const range = getSemesterDateRange(e.target.value);
                if (range) {
                  onSemesterSelect(e.target.value, range);
                }
              }}
              className="date-input"
            >
              <option value="">-- Select a semester --</option>
              {availableSemesters.map(semesterKey => {
                const range = getSemesterDateRange(semesterKey);
                return (
                  <option key={semesterKey} value={semesterKey}>
                    {range ? range.label : semesterKey}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="future-planning-buttons">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClearCalendarModal;

