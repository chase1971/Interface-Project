import React from 'react';

const ImportCalendarModal = ({
  show,
  importingCourse,
  importStartDate,
  importCsvFile,
  onClose,
  onStartDateChange,
  onFileChange,
  onImport
}) => {
  if (!show) return null;

  return (
    <div className="future-planning-modal-overlay" onClick={onClose}>
      <div className="future-planning-modal" onClick={(e) => e.stopPropagation()}>
        <div className="future-planning-header">
          <h2 className="future-planning-title">Import Calendar</h2>
          <button className="close-future-planning" onClick={onClose}>×</button>
        </div>
        <div className="future-planning-content">
          <p className="future-planning-description">
            Import a CSV file to create a calendar for {importingCourse || 'this course'}.
          </p>
          
          <div className="date-input-group">
            <label htmlFor="import-start-date">When did this class start?</label>
            <input
              type="date"
              id="import-start-date"
              value={importStartDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="date-input"
            />
          </div>

          <div className="date-input-group">
            <label htmlFor="import-csv-file">CSV File:</label>
            <input
              type="file"
              id="import-csv-file"
              accept=".csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onFileChange(e.target.files[0]);
                }
              }}
              className="date-input"
              style={{ padding: '0.5rem' }}
            />
            {importCsvFile && (
              <div style={{ marginTop: '0.5rem', color: 'var(--accent-green)' }}>
                Selected: {importCsvFile.name}
              </div>
            )}
          </div>

          <div className="future-planning-buttons">
            <button className="calculate-button" onClick={onImport}>
              Import Calendar
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

export default ImportCalendarModal;

