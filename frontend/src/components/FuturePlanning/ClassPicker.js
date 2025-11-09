import React from 'react';

/**
 * Component for selecting and picking up a class
 * @param {Array} coursesWithCalendars - Array of courses that have calendars
 * @param {string|null} pickedUpClass - ID of the currently picked up class
 * @param {boolean} hasOffsetItems - Whether there are offset calendar items
 * @param {Function} onClassPickUp - Callback when a class is picked up
 * @param {Function} onUndo - Callback when undo button is clicked
 * @param {boolean} editMode - Whether edit mode is enabled
 * @param {Function} onToggleEditMode - Callback to toggle edit mode
 */
const ClassPicker = ({ 
  coursesWithCalendars, 
  pickedUpClass, 
  hasOffsetItems,
  onClassPickUp, 
  onUndo,
  editMode,
  onToggleEditMode
}) => {
  return (
    <div className="class-picker">
      <h3>Select a Class</h3>
      <div className="class-list">
        {coursesWithCalendars.map(course => {
          const isPickedUp = pickedUpClass === course.id;
          return (
            <div
              key={course.id}
              className={`class-item ${isPickedUp ? 'picked-up' : ''}`}
              onClick={() => onClassPickUp(course.id)}
            >
              {course.name} - {course.schedule}
            </div>
          );
        })}
      </div>
      {pickedUpClass && (
        <div className="pickup-instruction">
          Click on the first day of class in the calendar below
        </div>
      )}
      {hasOffsetItems && (
        <>
          <button 
            className="edit-mode-button"
            onClick={onToggleEditMode}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '12px',
              background: editMode ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.1)',
              border: `2px solid ${editMode ? '#2196f3' : 'rgba(33, 150, 243, 0.5)'}`,
              borderRadius: '6px',
              color: '#2196f3',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: '"Rajdhani", sans-serif'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = editMode ? 'rgba(33, 150, 243, 0.4)' : 'rgba(33, 150, 243, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = editMode ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.1)';
            }}
          >
            {editMode ? '✓ Edit Mode On' : '✏️ Edit Mode'}
          </button>
          {editMode && (
            <div style={{
              marginTop: '10px',
              padding: '8px',
              background: 'rgba(33, 150, 243, 0.1)',
              borderRadius: '4px',
              fontSize: '0.85rem',
              color: '#90caf9',
              textAlign: 'center'
            }}>
              Click a class item to move it, then click a target day
            </div>
          )}
          <button 
            className="undo-button"
            onClick={onUndo}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '12px',
              background: 'rgba(255, 152, 0, 0.2)',
              border: '2px solid #ff9800',
              borderRadius: '6px',
              color: '#ff9800',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: '"Rajdhani", sans-serif'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 152, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 152, 0, 0.2)';
            }}
          >
            ↶ Undo Changes
          </button>
        </>
      )}
    </div>
  );
};

export default ClassPicker;

