import React from 'react';
import { detectSemesterFromDate } from '../../utils/calendarUtils';

const ClearCalendarModal = ({
  show,
  currentDate,
  selectedCourse,
  onClose,
  onConfirm
}) => {
  if (!show) return null;

  // Detect which semester the current view is in
  const currentSemester = detectSemesterFromDate(currentDate);
  
  if (!currentSemester || !currentSemester.range) {
    return (
      <div 
        className="future-planning-modal-overlay" 
        onClick={onClose}
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
            animation: 'none',
            left: 'auto',
            top: 'auto',
            width: 'auto',
            borderLeft: '2px solid var(--divider)',
            borderRadius: '6px'
          }}
        >
          <div style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ 
              margin: '0 0 0.5rem 0', 
              fontSize: '1rem', 
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              Cannot Clear Calendar
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: '0.85rem', 
              color: 'var(--text-dim)',
              lineHeight: '1.4'
            }}>
              Please navigate to a semester month (Fall, Spring, or Summer) first.
            </p>
          </div>
          <button 
            className="semester-menu-button"
            onClick={onClose}
            style={{
              width: '100%',
              marginTop: '0.75rem'
            }}
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  const { label } = currentSemester.range;
  return (
    <div 
      className="future-planning-modal-overlay" 
      onClick={onClose}
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
          animation: 'none',
          left: 'auto',
          top: 'auto',
          width: 'auto',
          borderLeft: '2px solid var(--divider)',
          borderRadius: '6px'
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
            margin: 0, 
            fontSize: '0.85rem', 
            color: 'var(--text-primary)',
            lineHeight: '1.4'
          }}>
            Clear <strong>{label}</strong> for <strong>{selectedCourse || 'this course'}</strong>?
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
            onClick={onClose}
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
};

export default ClearCalendarModal;

