import React, { useState, useEffect } from 'react';
import { useDefaultCalendars } from '../../hooks/useDefaultCalendars';

const SaveDefaultCalendarModal = ({
  show,
  assignments,
  classSchedule,
  selectedCourse,
  courses,
  onClose,
  onSave
}) => {
  const { defaultCalendars, addDefaultCalendar } = useDefaultCalendars();
  const [calendarName, setCalendarName] = useState('');
  const [saveMode, setSaveMode] = useState('overwrite'); // 'new' or 'overwrite' - default to overwrite
  const [selectedCalendarToOverwrite, setSelectedCalendarToOverwrite] = useState(null);
  const [semester, setSemester] = useState('Fall');

  // Map course IDs to course type names
  const getCourseTypeFromId = (courseId) => {
    if (!courseId) return '';
    if (courseId.startsWith('CA')) return 'College Algebra';
    if (courseId.startsWith('FM')) return 'Finite Math';
    return courseId; // Fallback to course ID if unknown
  };

  // Get schedule from course
  const getScheduleFromCourse = (course) => {
    if (!course || !course.schedule) return '';
    const scheduleStr = course.schedule.toUpperCase();
    if (scheduleStr.includes('MW') || scheduleStr.includes('MONDAY') || scheduleStr.includes('WEDNESDAY')) {
      return 'Monday, Wednesday';
    }
    if (scheduleStr.includes('TTH') || scheduleStr.includes('TUESDAY') || scheduleStr.includes('THURSDAY')) {
      return 'Tuesday, Thursday';
    }
    return '';
  };

  // Get available default calendars for overwrite option
  const availableCalendars = defaultCalendars || [];

  // Auto-detect course type and schedule from selected course
  const course = selectedCourse && courses ? courses.find(c => c.id === selectedCourse) : null;
  const courseType = course ? getCourseTypeFromId(course.id) : '';
  const schedule = course ? getScheduleFromCourse(course) : '';

  // When overwriting, use the selected calendar's info
  useEffect(() => {
    if (saveMode === 'overwrite' && selectedCalendarToOverwrite) {
      const calendarToOverwrite = availableCalendars.find(cal => cal.id === selectedCalendarToOverwrite);
      if (calendarToOverwrite) {
        setCalendarName(calendarToOverwrite.name);
        setSemester(calendarToOverwrite.semester || 'Fall');
      }
    } else if (saveMode === 'new') {
      // Reset when switching to new mode
      setCalendarName('');
      setSemester('Fall');
    }
  }, [saveMode, selectedCalendarToOverwrite, availableCalendars]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (show) {
      setCalendarName('');
      setSaveMode('overwrite'); // Default to overwrite
      setSelectedCalendarToOverwrite(null);
      setSemester('Fall');
    }
  }, [show]);

  const handleSave = async () => {
    if (saveMode === 'overwrite') {
      if (!selectedCalendarToOverwrite) {
        alert('Please select a calendar to overwrite.');
        return;
      }
      // Use the selected calendar's name
      const calendarToOverwrite = availableCalendars.find(cal => cal.id === selectedCalendarToOverwrite);
      if (calendarToOverwrite) {
        setCalendarName(calendarToOverwrite.name);
      }
    } else {
      // Create new mode - require calendar name
      if (!calendarName.trim()) {
        alert('Please enter a calendar name.');
        return;
      }
    }

    if (!assignments || assignments.length === 0) {
      alert('No assignments to save. Please add assignments to the calendar first.');
      return;
    }

    if (!classSchedule || classSchedule.length === 0) {
      alert('No class schedule to save. Please add class schedule items first.');
      return;
    }

    // Generate calendar ID
    const calendarId = saveMode === 'overwrite' 
      ? selectedCalendarToOverwrite
      : `default-${calendarName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    // For overwrite mode, use the selected calendar's name (already set in useEffect)
    const finalCalendarName = saveMode === 'overwrite' && selectedCalendarToOverwrite
      ? (availableCalendars.find(cal => cal.id === selectedCalendarToOverwrite)?.name || calendarName)
      : calendarName;

    // Create calendar object
    const calendarData = {
      id: calendarId,
      name: finalCalendarName,
      courseType: courseType || 'Custom',
      schedule: schedule || 'Custom',
      semester: semester || 'Fall',
      assignments: assignments,
      classSchedule: classSchedule
    };

    // Save to default calendars
    addDefaultCalendar(calendarData);

    // Generate CSV files and save them to the server
    await saveCsvFilesToServer(finalCalendarName, assignments, classSchedule, saveMode === 'overwrite' ? selectedCalendarToOverwrite : null);

    if (onSave) {
      onSave(calendarData);
    }

    alert(`Calendar "${finalCalendarName}" saved successfully!\n\nCSV files have been saved to the server.`);
    onClose();
  };

  const saveCsvFilesToServer = async (name, assignments, classSchedule, overwriteCalendarId) => {
    try {
      // First, check if backend is available
      try {
        const healthCheck = await fetch('/api/health', { method: 'GET' });
        if (!healthCheck.ok) {
          throw new Error('Backend server is not responding');
        }
      } catch (healthError) {
        console.warn('Backend health check failed:', healthError);
        alert('Backend server is not running. Please start the backend server (npm start in the backend folder) to save files directly.\n\nFiles will be downloaded instead.');
        // Fallback to download
        downloadCsv(generateAssignmentCsv(assignments), `${name.replace(/\s+/g, '-')}-Assignment-Calendar.csv`);
        downloadCsv(generateClassScheduleCsv(classSchedule), `${name.replace(/\s+/g, '-')}-Class-Calendar.csv`);
        return;
      }

      // Determine filenames based on overwrite mode
      let assignmentFilename, classScheduleFilename;
      
      if (overwriteCalendarId) {
        // When overwriting, use the existing calendar's filename pattern
        // Extract the base name from the calendar ID (e.g., "default-college-algebra-mw-fall" -> "CA-MW-Fall")
        const calendarToOverwrite = availableCalendars.find(cal => cal.id === overwriteCalendarId);
        if (calendarToOverwrite) {
          // Generate filename based on the course type and schedule from the calendar
          const calCourseType = calendarToOverwrite.courseType || courseType || 'CA';
          const calSchedule = calendarToOverwrite.schedule || schedule || '';
          const calSemester = calendarToOverwrite.semester || semester || 'Fall';
          
          // Convert course type to abbreviation
          const courseTypeAbbr = calCourseType.includes('College Algebra') ? 'CA' : 
                                 calCourseType.includes('Finite Math') ? 'FM' : 'CA';
          
          // Convert schedule to abbreviation
          const schedulePart = calSchedule.includes('Monday') || calSchedule.includes('MW') ? 'MW' : 
                              calSchedule.includes('Tuesday') || calSchedule.includes('TTH') ? 'TTH' : 'MW';
          
          assignmentFilename = `${courseTypeAbbr}-${schedulePart}-${calSemester}-Assignment-Calendar.csv`;
          classScheduleFilename = `${courseTypeAbbr}-${schedulePart}-${calSemester}-Class-Calendar.csv`;
        } else {
          // Fallback to name-based filename
          assignmentFilename = `${name.replace(/\s+/g, '-')}-Assignment-Calendar.csv`;
          classScheduleFilename = `${name.replace(/\s+/g, '-')}-Class-Calendar.csv`;
        }
      } else {
        // New calendar - use the provided name
        assignmentFilename = `${name.replace(/\s+/g, '-')}-Assignment-Calendar.csv`;
        classScheduleFilename = `${name.replace(/\s+/g, '-')}-Class-Calendar.csv`;
      }

      // Generate CSV content
      const assignmentCsv = generateAssignmentCsv(assignments);
      const classScheduleCsv = generateClassScheduleCsv(classSchedule);

      // Save assignment CSV (using relative path like other API calls)
      const assignmentResponse = await fetch('/api/calendar/save-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: assignmentFilename,
          content: assignmentCsv,
          type: 'assignment'
        })
      });

      if (!assignmentResponse.ok) {
        let errorMessage = `Failed to save assignment CSV: ${assignmentResponse.statusText}`;
        try {
          const contentType = assignmentResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await assignmentResponse.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const textResponse = await assignmentResponse.text();
            errorMessage = textResponse || errorMessage;
          }
        } catch (parseError) {
          // If we can't parse the error, use the status text
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      // Verify the response is JSON before parsing
      const assignmentData = await assignmentResponse.json();
      if (!assignmentData.success) {
        throw new Error(assignmentData.error || 'Failed to save assignment CSV');
      }

      // Save class schedule CSV
      const classScheduleResponse = await fetch('/api/calendar/save-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: classScheduleFilename,
          content: classScheduleCsv,
          type: 'class'
        })
      });

      if (!classScheduleResponse.ok) {
        let errorMessage = `Failed to save class schedule CSV: ${classScheduleResponse.statusText}`;
        try {
          const contentType = classScheduleResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await classScheduleResponse.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const textResponse = await classScheduleResponse.text();
            errorMessage = textResponse || errorMessage;
          }
        } catch (parseError) {
          // If we can't parse the error, use the status text
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      // Verify the response is JSON before parsing
      const classScheduleData = await classScheduleResponse.json();
      if (!classScheduleData.success) {
        throw new Error(classScheduleData.error || 'Failed to save class schedule CSV');
      }

      console.log('✅ CSV files saved successfully to server');
    } catch (error) {
      console.error('Error saving CSV files to server:', error);
      alert(`Error saving CSV files: ${error.message}\n\nYou may need to manually add the files to the public/Calendar folder.`);
      // Fallback: still download the files
      downloadCsv(generateAssignmentCsv(assignments), `${name.replace(/\s+/g, '-')}-Assignment-Calendar.csv`);
      downloadCsv(generateClassScheduleCsv(classSchedule), `${name.replace(/\s+/g, '-')}-Class-Calendar.csv`);
    }
  };

  const generateAndDownloadCsvFiles = (name, assignments, classSchedule) => {
    // Generate assignment CSV
    const assignmentCsv = generateAssignmentCsv(assignments);
    downloadCsv(assignmentCsv, `${name.replace(/\s+/g, '-')}-Assignment-Calendar.csv`);

    // Generate class schedule CSV
    const classScheduleCsv = generateClassScheduleCsv(classSchedule);
    downloadCsv(classScheduleCsv, `${name.replace(/\s+/g, '-')}-Class-Calendar.csv`);
  };

  const generateAssignmentCsv = (assignments) => {
    const headers = 'Item Name,Start Date,Due Date,Start Time,Due Time';
    const rows = assignments.map(assignment => {
      const itemName = (assignment.itemName || assignment.description || '').replace(/,/g, ';');
      const startDate = formatDateForCsv(assignment.startDate);
      const dueDate = formatDateForCsv(assignment.dueDate);
      const startTime = assignment.startTime || '';
      const dueTime = assignment.dueTime || '';
      return `${itemName},${startDate},${dueDate},${startTime},${dueTime}`;
    });
    return [headers, ...rows].join('\n');
  };

  const generateClassScheduleCsv = (classSchedule) => {
    const headers = 'Date,Description';
    const rows = classSchedule.map(item => {
      const date = formatClassScheduleDateForCsv(item.date);
      const description = item.description || item.itemName || '';
      // Preserve quotes if description contains commas or is already quoted
      const needsQuotes = description.includes(',') || description.includes('"');
      const formattedDescription = needsQuotes ? `"${description.replace(/"/g, '""')}"` : description;
      return `${date},${formattedDescription}`;
    });
    return [headers, ...rows].join('\n');
  };

  const formatClassScheduleDateForCsv = (dateStr) => {
    if (!dateStr) return '';
    
    // If already in M/D/YYYY format, return as is
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    
    // If in YYYY-MM-DD format, convert to M/D/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return `${month}/${day}/${year}`;
    }
    
    // Handle MM-DD-YYYY format
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('-').map(Number);
      return `${month}/${day}/${year}`;
    }
    
    // Try to parse as Date object and format as M/D/YYYY
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateForCsv = (dateStr) => {
    if (!dateStr) return '';
    
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Handle MM-DD-YYYY format (used by assignments)
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('-').map(Number);
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    // Try to parse as Date object and format
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return dateStr;
    }
  };

  const downloadCsv = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content save-default-calendar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Save Current Calendar as Default</h2>
          <button className="modal-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label>Save Mode:</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="overwrite"
                  checked={saveMode === 'overwrite'}
                  onChange={(e) => setSaveMode(e.target.value)}
                />
                Overwrite Existing Default Calendar
              </label>
              <label>
                <input
                  type="radio"
                  value="new"
                  checked={saveMode === 'new'}
                  onChange={(e) => setSaveMode(e.target.value)}
                />
                Create New Default Calendar
              </label>
            </div>
          </div>

          {saveMode === 'overwrite' && (
            <div className="form-group">
              <label>Select Calendar to Overwrite:</label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                gap: '0.5rem',
                marginTop: '0.75rem'
              }}>
                {availableCalendars.length > 0 ? (
                  availableCalendars.map((cal, index) => {
                    // Generate simplified abbreviation
                    const getAbbreviation = (calendar) => {
                      const courseType = calendar.courseType || '';
                      const schedule = calendar.schedule || '';
                      const semester = calendar.semester || '';
                      
                      // Course type abbreviation
                      let courseAbbr = 'CA';
                      if (courseType.includes('Finite Math') || courseType.includes('Finite')) {
                        courseAbbr = 'FM';
                      } else if (courseType.includes('College Algebra')) {
                        courseAbbr = 'CA';
                      }
                      
                      // Schedule abbreviation
                      let scheduleAbbr = 'MW';
                      if (schedule.includes('Tuesday') || schedule.includes('Thursday') || schedule.includes('TTH')) {
                        scheduleAbbr = 'TTH';
                      } else if (schedule.includes('Monday') || schedule.includes('Wednesday') || schedule.includes('MW')) {
                        scheduleAbbr = 'MW';
                      }
                      
                      return `${courseAbbr}-${scheduleAbbr} ${semester}`;
                    };
                    
                    // Different colors for different buttons
                    const colors = [
                      { bg: 'rgba(0, 179, 255, 0.15)', border: 'rgba(0, 179, 255, 0.4)', text: 'var(--accent-blue)', selected: 'var(--accent-blue)' }, // Blue
                      { bg: 'rgba(76, 175, 80, 0.15)', border: 'rgba(76, 175, 80, 0.4)', text: '#4caf50', selected: '#4caf50' }, // Green
                      { bg: 'rgba(255, 152, 0, 0.15)', border: 'rgba(255, 152, 0, 0.4)', text: '#ff9800', selected: '#ff9800' }, // Orange
                      { bg: 'rgba(156, 39, 176, 0.15)', border: 'rgba(156, 39, 176, 0.4)', text: '#9c27b0', selected: '#9c27b0' }, // Purple
                      { bg: 'rgba(244, 67, 54, 0.15)', border: 'rgba(244, 67, 54, 0.4)', text: '#f44336', selected: '#f44336' }, // Red
                    ];
                    const colorScheme = colors[index % colors.length];
                    
                    const abbreviation = getAbbreviation(cal);
                    const isSelected = selectedCalendarToOverwrite === cal.id;
                    
                    return (
                      <button
                        key={cal.id}
                        type="button"
                        onClick={() => setSelectedCalendarToOverwrite(cal.id)}
                        style={{
                          aspectRatio: '1',
                          padding: '0.75rem',
                          textAlign: 'center',
                          background: isSelected 
                            ? colorScheme.selected 
                            : colorScheme.bg,
                          border: `2px solid ${isSelected 
                            ? colorScheme.selected 
                            : colorScheme.border}`,
                          borderRadius: '8px',
                          color: isSelected 
                            ? 'white' 
                            : colorScheme.text,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontFamily: 'var(--font-primary)',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isSelected 
                            ? `0 0 12px ${colorScheme.selected}40` 
                            : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.target.style.background = colorScheme.bg.replace('0.15', '0.25');
                            e.target.style.borderColor = colorScheme.selected;
                            e.target.style.boxShadow = `0 0 8px ${colorScheme.selected}30`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.target.style.background = colorScheme.bg;
                            e.target.style.borderColor = colorScheme.border;
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                      >
                        {abbreviation}
                      </button>
                    );
                  })
                ) : (
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: 0, gridColumn: '1 / -1' }}>
                    No default calendars available to overwrite.
                  </p>
                )}
              </div>
            </div>
          )}

          {saveMode === 'new' && (
            <>
              <div className="form-group">
                <label>Calendar Name:</label>
                <input
                  type="text"
                  value={calendarName}
                  onChange={(e) => setCalendarName(e.target.value)}
                  placeholder="e.g., College Algebra MW Fall 2025"
                  className="form-input"
                  disabled={saveMode === 'overwrite'}
                />
              </div>

              <div className="form-group">
                <label>Semester:</label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                  gap: '0.5rem',
                  marginTop: '0.5rem'
                }}>
                  {['Fall', 'Spring', 'Summer', 'Custom'].map((sem) => {
                    const isSelected = semester === sem;
                    const colors = {
                      'Fall': { bg: 'rgba(255, 152, 0, 0.15)', border: 'rgba(255, 152, 0, 0.4)', text: '#ff9800', selected: '#ff9800' },
                      'Spring': { bg: 'rgba(76, 175, 80, 0.15)', border: 'rgba(76, 175, 80, 0.4)', text: '#4caf50', selected: '#4caf50' },
                      'Summer': { bg: 'rgba(0, 179, 255, 0.15)', border: 'rgba(0, 179, 255, 0.4)', text: 'var(--accent-blue)', selected: 'var(--accent-blue)' },
                      'Custom': { bg: 'rgba(156, 39, 176, 0.15)', border: 'rgba(156, 39, 176, 0.4)', text: '#9c27b0', selected: '#9c27b0' }
                    };
                    const colorScheme = colors[sem] || colors['Custom'];
                    
                    return (
                      <button
                        key={sem}
                        type="button"
                        onClick={() => setSemester(sem)}
                        style={{
                          aspectRatio: '1',
                          padding: '0.75rem',
                          textAlign: 'center',
                          background: isSelected 
                            ? colorScheme.selected 
                            : colorScheme.bg,
                          border: `2px solid ${isSelected 
                            ? colorScheme.selected 
                            : colorScheme.border}`,
                          borderRadius: '8px',
                          color: isSelected 
                            ? 'white' 
                            : colorScheme.text,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontFamily: 'var(--font-primary)',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isSelected 
                            ? `0 0 12px ${colorScheme.selected}40` 
                            : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.target.style.background = colorScheme.bg.replace('0.15', '0.25');
                            e.target.style.borderColor = colorScheme.selected;
                            e.target.style.boxShadow = `0 0 8px ${colorScheme.selected}30`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.target.style.background = colorScheme.bg;
                            e.target.style.borderColor = colorScheme.border;
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                      >
                        {sem}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            background: 'rgba(255, 255, 255, 0.03)', 
            borderRadius: '6px',
            fontSize: '0.85rem',
            color: 'var(--text-dim)'
          }}>
            {assignments?.length || 0} assignments • {classSchedule?.length || 0} class schedule items
          </div>
        </div>

        <div className="modal-footer">
          <button className="button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button-primary" onClick={handleSave}>
            Save Calendar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveDefaultCalendarModal;

