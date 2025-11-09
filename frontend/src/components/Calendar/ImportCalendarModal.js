import React, { useState, useEffect } from 'react';
import { useDefaultCalendars } from '../../hooks/useDefaultCalendars';

const ImportCalendarModal = ({
  show,
  importingCourse,
  importStartDate,
  importCsvFile,
  onClose,
  onStartDateChange,
  onFileChange,
  onImport,
  onImportDefault
}) => {
  const { defaultCalendars, getDefaultCalendarsByFilter } = useDefaultCalendars();
  const [selectedDefaultCalendar, setSelectedDefaultCalendar] = useState(null);
  const [importMode, setImportMode] = useState('default'); // 'default' or 'csv'

  // Reset selection when modal closes
  useEffect(() => {
    if (!show) {
      setSelectedDefaultCalendar(null);
    }
  }, [show]);

  // Filter default calendars - show all for now, can be filtered by course type later
  const availableDefaults = defaultCalendars || [];

  // Debug: log available defaults
  useEffect(() => {
    if (show) {
      console.log('ImportCalendarModal - Available default calendars:', availableDefaults);
      console.log('ImportCalendarModal - defaultCalendars from hook:', defaultCalendars);
    }
  }, [show, availableDefaults, defaultCalendars]);

  const handleDefaultCalendarSelect = (calendarId) => {
    setSelectedDefaultCalendar(calendarId);
  };

  const handleImportDefaultClick = () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🟢 STEP 1: IMPORT BUTTON CLICKED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Selected default calendar ID:', selectedDefaultCalendar);
    console.log('Importing into course:', importingCourse);
    console.log('Has onImportDefault callback:', !!onImportDefault);
    
    if (selectedDefaultCalendar && onImportDefault) {
      console.log('✅ Calling onImportDefault with calendar ID:', selectedDefaultCalendar);
      onImportDefault(selectedDefaultCalendar);
      setSelectedDefaultCalendar(null); // Reset selection
    } else {
      console.error('❌ Cannot import - missing calendar selection or callback');
    }
  };

  if (!show) return null;

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
          minWidth: '300px',
          maxWidth: '350px',
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
            Import Calendar
          </h3>
          <p style={{ 
            margin: '0 0 0.75rem 0', 
            fontSize: '0.85rem', 
            color: 'var(--text-primary)'
          }}>
            Choose a calendar for {importingCourse || 'this course'}:
          </p>
        </div>

        {/* Default Calendar Selection */}
        {availableDefaults.length > 0 ? (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.25rem'
            }}>
              {availableDefaults.map(cal => (
                <button
                  key={cal.id}
                  className="semester-menu-button"
                  onClick={() => handleDefaultCalendarSelect(cal.id)}
                  style={{
                    width: '100%',
                    marginBottom: '0.25rem',
                    background: selectedDefaultCalendar === cal.id 
                      ? 'var(--accent-blue)' 
                      : 'transparent',
                    color: selectedDefaultCalendar === cal.id 
                      ? 'white' 
                      : 'var(--text-primary)',
                    borderColor: selectedDefaultCalendar === cal.id 
                      ? 'var(--accent-blue)' 
                      : 'var(--border-color)',
                    fontSize: '0.85rem',
                    padding: '0.5rem 0.75rem',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '0.15rem' }}>
                    {cal.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                    {cal.courseType} • {cal.schedule} • {cal.semester}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ 
              color: 'var(--text-dim)', 
              fontStyle: 'italic',
              fontSize: '0.85rem',
              margin: 0
            }}>
              No default calendars available.
            </p>
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginTop: '0.5rem'
        }}>
          <button 
            className="semester-menu-button"
            onClick={handleImportDefaultClick}
            disabled={!selectedDefaultCalendar}
            style={{
              flex: 1,
              background: selectedDefaultCalendar ? 'var(--accent-blue)' : 'transparent',
              color: selectedDefaultCalendar ? 'white' : 'var(--text-dim)',
              borderColor: selectedDefaultCalendar ? 'var(--accent-blue)' : 'var(--border-color)',
              opacity: selectedDefaultCalendar ? 1 : 0.5,
              cursor: selectedDefaultCalendar ? 'pointer' : 'not-allowed'
            }}
          >
            Import
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

export default ImportCalendarModal;

