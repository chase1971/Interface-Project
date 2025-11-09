import React from 'react';
import { getSemesterDateRange } from '../../utils/calendarUtils';

const ClearCalendarModal = ({
  show,
  showConfirmation,
  selectedSemester,
  clearDateRange,
  originalAssignments,
  acceptedFutureAssignments,
  selectedCourse,
  onClose,
  onSemesterSelect,
  onConfirm,
  onCancel
}) => {
  if (!show) return null;

  // Define the specific semesters to show as buttons
  // Format matches getSemesterDateRange: "Semester-Year"
  const semesterButtons = [
    { key: 'Fall-2025', label: 'Fall 2025' },
    { key: 'Spring-2026', label: 'Spring 2026' },
    { key: 'Summer1-2026', label: 'Summer 1 2026' },
    { key: 'Summer2-2026', label: 'Summer 2 2026' },
    { key: 'Fall-2026', label: 'Fall 2026' }
  ];

  if (showConfirmation && show) {
    return (
      <div 
        className="future-planning-modal-overlay" 
        onClick={onCancel}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        }}
      >
        <div 
          className="semester-menu" 
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            zIndex: 1001,
            minWidth: '280px',
            maxWidth: '320px',
            padding: '1rem',
            margin: 0,
            animation: 'none', // Override the slideInRight animation
            left: 'auto', // Override fixed positioning
            top: 'auto',
            width: 'auto',
            borderLeft: '2px solid var(--divider)', // Restore border since we're not sliding from left
            borderRadius: '6px' // Full border radius
          }}
        >
          <div style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ 
              margin: '0 0 0.5rem 0', 
              fontSize: '1rem', 
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              Confirm Clear Calendar
            </h3>
            <p style={{ 
              margin: '0 0 0.5rem 0', 
              fontSize: '0.85rem', 
              color: 'var(--text-primary)',
              lineHeight: '1.4'
            }}>
              Clear <strong>{clearDateRange.label || selectedSemester}</strong> for <strong>{selectedCourse || 'this course'}</strong>?
            </p>
            <p style={{ 
              margin: 0, 
              fontSize: '0.75rem', 
              color: 'var(--text-dim)',
              lineHeight: '1.3'
            }}>
              This will remove all assignments from {clearDateRange.start ? clearDateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''} to {clearDateRange.end ? clearDateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}.
            </p>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginTop: '0.75rem'
          }}>
            <button 
              className="semester-menu-button"
              onClick={onConfirm}
              style={{
                flex: 1,
                background: 'var(--accent-blue)',
                color: 'white',
                borderColor: 'var(--accent-blue)'
              }}
            >
              Yes, Clear
            </button>
            <button 
              className="semester-menu-button"
              onClick={onCancel}
              style={{
                flex: 1
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="semester-menu" 
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: '8px',
        zIndex: 1000,
        minWidth: '200px',
        maxWidth: '250px'
      }}
    >
      <div className="semester-menu-buttons">
        {semesterButtons.map(semester => {
          const range = getSemesterDateRange(semester.key);
          return (
            <button
              key={semester.key}
              className="semester-menu-button"
              onClick={() => {
                if (range) {
                  onSemesterSelect(semester.key, range);
                }
              }}
              style={{
                background: selectedSemester === semester.key 
                  ? 'var(--accent-blue)' 
                  : 'transparent',
                color: selectedSemester === semester.key 
                  ? 'white' 
                  : 'var(--text-primary)'
              }}
            >
              {semester.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ClearCalendarModal;

