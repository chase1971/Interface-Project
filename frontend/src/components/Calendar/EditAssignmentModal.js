import React, { useState, useEffect } from 'react';
import { parseDate, formatDate } from '../../utils/calendarUtils';

const EditAssignmentModal = ({
  show,
  assignment,
  onClose,
  onSave
}) => {
  const [startDate, setStartDate] = useState('');
  const [startHour, setStartHour] = useState('');
  const [startAmPm, setStartAmPm] = useState('AM');
  const [dueDate, setDueDate] = useState('');
  const [dueHour, setDueHour] = useState('');
  const [dueAmPm, setDueAmPm] = useState('AM');

  // Generate hour options: 12:01, 11:59, then 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5
  const generateHourOptions = () => {
    const options = [];
    
    // Special times first
    options.push({ value: '12:01', label: '12:01' });
    options.push({ value: '11:59', label: '11:59' });
    
    // Then regular hours: 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5
    const regularHours = [6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5];
    regularHours.forEach(hour => {
      options.push({ value: String(hour), label: String(hour) });
    });
    
    return options;
  };

  const hourOptions = generateHourOptions();

  // Parse time string (e.g., "8:00 AM" or "11:59 PM") to hour and AM/PM
  const parseTimeString = (timeStr) => {
    if (!timeStr) return { hour: '', amPm: 'AM' };
    
    // Handle special times
    if (timeStr === '11:59 PM' || timeStr === '11:59') {
      return { hour: '11:59', amPm: 'PM' };
    }
    if (timeStr === '12:01 AM' || timeStr === '12:01') {
      return { hour: '12:01', amPm: 'AM' };
    }
    
    // Parse regular time format (e.g., "8:00 AM" or "8 AM")
    const match = timeStr.match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)/i);
    if (match) {
      const hour = parseInt(match[1]);
      const amPm = match[2].toUpperCase();
      return { hour: String(hour), amPm };
    }
    
    // If no AM/PM, try to extract just the hour
    const hourMatch = timeStr.match(/(\d{1,2})/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1]);
      // Guess AM/PM based on hour (12-5 could be either, default to AM)
      const amPm = hour >= 6 && hour < 12 ? 'AM' : 'PM';
      return { hour: String(hour), amPm };
    }
    
    return { hour: '', amPm: 'AM' };
  };

  // Convert hour and AM/PM to time string
  const formatTimeString = (hour, amPm) => {
    if (!hour) return '';
    
    // Special times
    if (hour === '11:59') {
      return '11:59 PM';
    }
    if (hour === '12:01') {
      return '12:01 AM';
    }
    
    // Regular hours - format as "H:00 AM/PM"
    const hourNum = parseInt(hour);
    return `${hourNum}:00 ${amPm}`;
  };

  useEffect(() => {
    if (assignment) {
      // Set start date and time
      if (assignment.startDate) {
        // Parse MM-DD-YYYY format
        const [month, day, year] = assignment.startDate.split('-').map(Number);
        if (month && day && year) {
          // Format as YYYY-MM-DD for date input (avoid timezone issues by using local date)
          setStartDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        } else {
          setStartDate('');
        }
      } else {
        setStartDate('');
      }
      
      const startTimeParsed = parseTimeString(assignment.startTime || '');
      setStartHour(startTimeParsed.hour);
      setStartAmPm(startTimeParsed.amPm);

      // Set due date and time
      if (assignment.dueDate) {
        // Parse MM-DD-YYYY format
        const [month, day, year] = assignment.dueDate.split('-').map(Number);
        if (month && day && year) {
          // Format as YYYY-MM-DD for date input (avoid timezone issues by using local date)
          setDueDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        } else {
          setDueDate('');
        }
      } else {
        setDueDate('');
      }
      
      const dueTimeParsed = parseTimeString(assignment.dueTime || '');
      setDueHour(dueTimeParsed.hour);
      setDueAmPm(dueTimeParsed.amPm);
    }
  }, [assignment]);

  if (!show || !assignment) return null;

  const handleSave = () => {
    const updatedAssignment = { ...assignment };
    
    // Update start date and time
    if (startDate) {
      // Parse YYYY-MM-DD and convert directly to MM-DD-YYYY format (avoid Date object timezone issues)
      const [year, month, day] = startDate.split('-').map(Number);
      updatedAssignment.startDate = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;
    } else {
      updatedAssignment.startDate = null;
    }
    updatedAssignment.startTime = formatTimeString(startHour, startAmPm) || null;

    // Update due date and time
    if (dueDate) {
      // Parse YYYY-MM-DD and convert directly to MM-DD-YYYY format (avoid Date object timezone issues)
      const [year, month, day] = dueDate.split('-').map(Number);
      updatedAssignment.dueDate = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;
    } else {
      updatedAssignment.dueDate = null;
    }
    updatedAssignment.dueTime = formatTimeString(dueHour, dueAmPm) || null;

    onSave(updatedAssignment);
    onClose();
  };

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    // Parse YYYY-MM-DD format and create date in local timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    // Use local date constructor to avoid timezone issues
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };

  return (
    <div className="future-planning-modal-overlay" onClick={onClose}>
      <div className="future-planning-modal" onClick={(e) => e.stopPropagation()}>
        <div className="future-planning-header">
          <h2 className="future-planning-title">Edit Assignment</h2>
          <button className="close-future-planning" onClick={onClose}>×</button>
        </div>
        <div className="future-planning-content">
          {/* Assignment Name */}
          <div className="date-input-group">
            <label><strong>Assignment Name:</strong></label>
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '0.75rem', 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '4px',
              fontSize: '1rem',
              color: 'var(--text-primary)'
            }}>
              {assignment.itemName}
            </div>
          </div>

          {/* Start Date and Time */}
          {assignment.startDate && (
            <div className="date-input-group">
              <label><strong>Start Date & Time:</strong></label>
              <div style={{ 
                marginTop: '0.5rem',
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                alignItems: 'flex-end'
              }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label htmlFor="edit-start-date" style={{ 
                    display: 'block', 
                    marginBottom: '0.25rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)'
                  }}>
                    Date:
                  </label>
                  <input
                    type="date"
                    id="edit-start-date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="date-input"
                    style={{ width: '100%' }}
                  />
                  {startDate && (
                    <div style={{ 
                      marginTop: '0.25rem', 
                      color: 'var(--text-dim)', 
                      fontSize: '0.85rem' 
                    }}>
                      {formatDateForDisplay(startDate)}
                    </div>
                  )}
                </div>
                <div style={{ flex: '1', minWidth: '150px', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1', maxWidth: '100px' }}>
                    <label htmlFor="edit-start-hour" style={{ 
                      display: 'block', 
                      marginBottom: '0.25rem',
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)'
                    }}>
                      Time:
                    </label>
                    <select
                      id="edit-start-hour"
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      className="date-input"
                      style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }}
                    >
                      <option value="">Hour...</option>
                      {hourOptions.map((option, index) => (
                        <option key={index} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {startHour && startHour !== '11:59' && startHour !== '12:01' && (
                    <button
                      type="button"
                      onClick={() => setStartAmPm(startAmPm === 'AM' ? 'PM' : 'AM')}
                      style={{
                        padding: '0.4rem 0.8rem',
                        backgroundColor: 'var(--accent-color)',
                        color: 'var(--bg-primary)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        minWidth: '50px',
                        height: '34px',
                        marginTop: '1.5rem'
                      }}
                    >
                      {startAmPm}
                    </button>
                  )}
                </div>
                {startHour && (
                  <div style={{ 
                    width: '100%',
                    marginTop: '0.25rem', 
                    color: 'var(--text-dim)', 
                    fontSize: '0.85rem' 
                  }}>
                    {formatTimeString(startHour, startAmPm)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Due Date and Time */}
          {assignment.dueDate && (
            <div className="date-input-group">
              <label><strong>Due Date & Time:</strong></label>
              <div style={{ 
                marginTop: '0.5rem',
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                alignItems: 'flex-end'
              }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label htmlFor="edit-due-date" style={{ 
                    display: 'block', 
                    marginBottom: '0.25rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)'
                  }}>
                    Date:
                  </label>
                  <input
                    type="date"
                    id="edit-due-date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="date-input"
                    style={{ width: '100%' }}
                  />
                  {dueDate && (
                    <div style={{ 
                      marginTop: '0.25rem', 
                      color: 'var(--text-dim)', 
                      fontSize: '0.85rem' 
                    }}>
                      {formatDateForDisplay(dueDate)}
                    </div>
                  )}
                </div>
                <div style={{ flex: '1', minWidth: '150px', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1', maxWidth: '100px' }}>
                    <label htmlFor="edit-due-hour" style={{ 
                      display: 'block', 
                      marginBottom: '0.25rem',
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)'
                    }}>
                      Time:
                    </label>
                    <select
                      id="edit-due-hour"
                      value={dueHour}
                      onChange={(e) => setDueHour(e.target.value)}
                      className="date-input"
                      style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }}
                    >
                      <option value="">Hour...</option>
                      {hourOptions.map((option, index) => (
                        <option key={index} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {dueHour && dueHour !== '11:59' && dueHour !== '12:01' && (
                    <button
                      type="button"
                      onClick={() => setDueAmPm(dueAmPm === 'AM' ? 'PM' : 'AM')}
                      style={{
                        padding: '0.4rem 0.8rem',
                        backgroundColor: 'var(--accent-color)',
                        color: 'var(--bg-primary)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        minWidth: '50px',
                        height: '34px',
                        marginTop: '1.5rem'
                      }}
                    >
                      {dueAmPm}
                    </button>
                  )}
                </div>
                {dueHour && (
                  <div style={{ 
                    width: '100%',
                    marginTop: '0.25rem', 
                    color: 'var(--text-dim)', 
                    fontSize: '0.85rem' 
                  }}>
                    {formatTimeString(dueHour, dueAmPm)}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="future-planning-buttons">
            <button className="calculate-button" onClick={handleSave}>
              Save Changes
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

export default EditAssignmentModal;
