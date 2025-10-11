import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { processFiles, clearAllData } from '../services/fileExtractorService';
import './FileExtractor.css';

function FileExtractor() {
  const navigate = useNavigate();
  const logContainerRef = useRef(null);

  // State
  const [drive, setDrive] = useState('C');
  const [selectedClass, setSelectedClass] = useState('');
  const [processing, setProcessing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [logs, setLogs] = useState([]);

  // Auto-scroll logs to bottom when new messages arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (message) => {
    setLogs(prev => [...prev, message]);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleClearAll = () => {
    setLogs([]);
    setProcessing(false);
  };

  const handleProcessFiles = async () => {
    if (!selectedClass) {
      addLog('❌ Please select a class first');
      return;
    }

    setProcessing(true);
    addLog('🚀 Starting file extraction...');

    try {
      const result = await processFiles(drive, selectedClass, addLog);

      if (result.success) {
        addLog('✅ File extraction complete!');
      } else {
        addLog(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleClearAllData = async () => {
    if (!selectedClass) {
      addLog('❌ Please select a class first');
      return;
    }

    if (!window.confirm('⚠️ This will delete the grade processing folder and Canvas ZIP file. Continue?')) {
      return;
    }

    setClearing(true);
    addLog('🗑️ Clearing all processing data...');
    
    try {
      const result = await clearAllData(drive, selectedClass, addLog);
      
      if (result.success) {
        addLog('✅ All data cleared successfully!');
      } else {
        addLog(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setClearing(false);
    }
  };

  // Class options
  const classOptions = [
    { value: 'CA 4105', label: 'CA 4105 (MW 9:30-10:50)' },
    { value: 'CA 4201', label: 'CA 4201 (TTH 8:00-9:20)' },
    { value: 'CA 4203', label: 'CA 4203 (TTH 9:30-10:50)' },
    { value: 'FM 4103', label: 'FM 4103 (MW 11:00-12:20)' },
    { value: 'FM 4202', label: 'FM 4202 (TTH 11:00-12:20)' }
  ];

  return (
    <div className="file-extractor-container">
      <div className="page-header">
        <h1 className="page-title">File Extractor</h1>
        <p className="page-subtitle">Process Canvas assignment submissions</p>
      </div>

      <div className="workflow-grid">
        {/* LEFT SIDE: Configuration */}
        <div className="workflow-section config-section">
          <h2 className="section-title">Configuration</h2>

          {/* Drive Selection */}
          <div className="form-group">
            <label className="form-label">Select Drive</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="drive"
                  value="C"
                  checked={drive === 'C'}
                  onChange={(e) => setDrive(e.target.value)}
                />
                <span>C: (Main Computer)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="drive"
                  value="G"
                  checked={drive === 'G'}
                  onChange={(e) => setDrive(e.target.value)}
                />
                <span>G: (Google Drive)</span>
              </label>
            </div>
          </div>

          {/* Class Selection */}
          <div className="form-group">
            <label className="form-label">Select Class</label>
            <select
              className="form-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">-- Choose a class --</option>
              {classOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Activity Log */}
          <div className="log-section">
            <div className="log-container" ref={logContainerRef}>
              {logs.length === 0 ? (
                <div className="log-entry empty">No activity yet</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="log-entry">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Actions */}
        <div className="workflow-section action-section">
          {/* Process Files */}
          <div className="action-card">
            <h2 className="section-title">Process Files</h2>
            <p className="section-description">
              Extracts Canvas ZIP, combines PDFs, adds watermarks, and updates Import File with grades
            </p>
            <button
              className="btn-primary btn-large"
              onClick={handleProcessFiles}
              disabled={!selectedClass || processing}
            >
              {processing ? 'Processing...' : 'Start Processing'}
            </button>
          </div>

          {/* Clear All Data Button */}
          <div className="workflow-section action-section">
            <button 
              className="btn-danger btn-large"
              onClick={handleClearAllData}
              disabled={!selectedClass || clearing}
            >
              {clearing ? 'Clearing...' : 'Clear All Data'}
            </button>
          </div>

          {/* Utility Buttons */}
          <div className="utility-buttons">
            <button className="btn-home" onClick={handleBackToHome}>
              Back to Home
            </button>
            <button className="btn-clear" onClick={handleClearAll}>
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FileExtractor;

