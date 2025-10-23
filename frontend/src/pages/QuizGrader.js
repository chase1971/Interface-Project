import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './QuizGrader.css';
import { listClasses, processQuizzes, processSelectedQuiz, extractGrades, splitPdf, openFolder, openDownloads, clearAllData } from '../services/quizGraderService';

function QuizGrader() {
  const navigate = useNavigate();
  // Always use C drive
  const drive = 'C';
  const [selectedClass, setSelectedClass] = useState('');
  const [processing, setProcessing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [zipFiles, setZipFiles] = useState([]);
  const [showZipSelection, setShowZipSelection] = useState(false);
  const logContainerRef = useRef(null);

  // Auto-scroll logs to bottom when new messages arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Add log helper
  const addLog = (message) => {
    setLogs(prevLogs => [...prevLogs, message]);
  };

  // Load classes from Rosters etc folder
  const handleLoadClasses = async () => {
    addLog('📂 Loading classes from Rosters etc folder...');
    
    try {
      const result = await listClasses(drive);
      
      if (result.success) {
        addLog(`✅ Found ${result.classes.length} classes`);
        // Classes are already hardcoded in the dropdown for now
        // Could dynamically populate if needed
      } else {
        addLog(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error loading classes: ${error.message}`);
    }
  };

  // Open Downloads folder
  const handleOpenDownloads = async () => {
    addLog('📁 Opening Downloads folder...');
    
    try {
      const result = await openDownloads(addLog);
      
      if (result.success) {
        addLog('✅ Downloads folder opened successfully!');
      } else {
        addLog(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  // Process quizzes (extract ZIP, combine PDFs, prepare for grading)
  const handleProcessQuizzes = async () => {
    if (!selectedClass) {
      addLog('❌ Please select a class first');
      return;
    }

    setProcessing(true);
    addLog('🔍 Searching for Canvas ZIP in Downloads...');
    
    try {
      const result = await processQuizzes(drive, selectedClass, addLog);
      
      if (result.success) {
        addLog('✅ Quiz processing completed!');
        addLog('📂 Combined PDF ready for manual grading');
      } else if (result.error === 'Multiple ZIP files found') {
        // Show ZIP file selection dialog
        setZipFiles(result.zip_files || []);
        setShowZipSelection(true);
        addLog('📁 Multiple ZIP files found - please select one');
        // Don't set processing to false here, keep it true until user selects
        return; // Exit early, don't set processing to false
      } else {
        addLog(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Handle ZIP file selection
  const handleZipSelection = async (zipPath) => {
    setShowZipSelection(false);
    setProcessing(true);
    addLog(`📁 Processing selected ZIP file: ${zipPath.split('\\').pop()}`);
    
    try {
      const result = await processSelectedQuiz(drive, selectedClass, zipPath, addLog);
      
      if (result.success) {
        addLog('✅ Quiz processing completed!');
        addLog('📂 Combined PDF ready for manual grading');
      } else {
        addLog(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Extract grades from graded PDF using OCR
  const handleExtractGrades = async () => {
    if (!selectedClass) {
      addLog('❌ Please select a class first');
      return;
    }

    setExtracting(true);
    addLog('🔬 Extracting grades from PDF using OCR...');
    
    try {
      const result = await extractGrades(drive, selectedClass, addLog);
      
      if (result.success) {
        addLog('✅ Grade extraction completed!');
        addLog('📊 Import File updated with grades');
      } else {
        addLog(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setExtracting(false);
    }
  };

  // Split combined PDF back into individual student PDFs and rezip
  const handleSplitPdf = async () => {
    if (!selectedClass) {
      addLog('❌ Please select a class first');
      return;
    }

    setSplitting(true);
    addLog('📄 Splitting combined PDF back into individual student PDFs...');
    addLog('📦 Rezipping folders back to original ZIP file...');
    
    try {
      const result = await splitPdf(drive, selectedClass, addLog);
      
      if (result.success) {
        addLog('✅ PDF splitting and rezipping completed!');
        addLog('📁 Individual PDFs restored to student folders');
        if (result.zip_created) {
          addLog('📦 ZIP file created in grade processing folder');
        }
      } else {
        addLog(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setSplitting(false);
    }
  };

  // Open grade processing folder
  const handleOpenFolder = async () => {
    if (!selectedClass) {
      addLog('❌ Please select a class first');
      return;
    }

    addLog('📂 Opening grade processing folder...');
    
    try {
      const result = await openFolder(drive, selectedClass, addLog);
      
      if (result.success) {
        // Check if it's the parent class folder that was opened
        if (result.message && result.message.includes('no grade processing folder found')) {
          addLog('📁 Class folder opened (no grade processing folder found)');
        } else {
          addLog('✅ Grade processing folder opened!');
        }
      } else {
        addLog(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  // Clear all processing data
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

  const handleClearAll = () => {
    setSelectedClass('');
    setProcessing(false);
    setExtracting(false);
    setSplitting(false);
    setClearing(false);
    setLogs([]);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="quiz-grader-container">
      <header className="quiz-header">
        <h1>Quiz Grader</h1>
        <p>Process Canvas quizzes and extract grades automatically</p>
      </header>

      <div className="workflow-container">
        <div className="workflow-grid">
          {/* LEFT SIDE: Configuration */}
          <div className="workflow-section config-section">
            <div className="section-header">
              <span className="step-number">1</span>
              <h2>Configuration</h2>
            </div>
            
            <div className="form-group">
              <label>Select Class</label>
              <div className="input-with-button">
                <select 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="form-select"
                >
                  <option value="">Choose a class...</option>
                  <option value="MW 11-1220  FM 4103">FM 4103 (MW 11:00-12:20)</option>
                  <option value="MW 930-1050 CA 4105">CA 4105 (MW 9:30-10:50)</option>
                  <option value="TTH 8-920  CA 4201">CA 4201 (TTH 8:00-9:20)</option>
                  <option value="TTH 11-1220 FM 4202">FM 4202 (TTH 11:00-12:20)</option>
                  <option value="TTH 930-1050 CA 4203">CA 4203 (TTH 9:30-10:50)</option>
                </select>
                <button className="btn-secondary" onClick={handleLoadClasses}>
                  Refresh
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Downloads Folder</label>
              <button className="btn-secondary" onClick={handleOpenDownloads}>
                📁 Open Downloads Folder
              </button>
            </div>

            {/* Activity Log */}
            <div className="log-container" ref={logContainerRef}>
              {logs.length === 0 ? (
                <div className="log-entry log-empty">Awaiting commands...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="log-entry">{log}</div>
                ))
              )}
            </div>

            {/* ZIP File Selection Dialog */}
            {showZipSelection && (
              <div className="zip-selection-dialog">
                <div className="zip-selection-content">
                  <h3>📁 Select ZIP File</h3>
                  <p>Multiple ZIP files found. Please select which one to process:</p>
                  <div className="zip-files-list">
                    {zipFiles.map((zipFile, index) => (
                      <button
                        key={index}
                        className="zip-file-option"
                        onClick={() => handleZipSelection(zipFile.path)}
                      >
                        {zipFile.index}. {zipFile.filename}
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowZipSelection(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Actions */}
          <div className="action-column">
            {/* Step 2: Process Quizzes */}
            <div className="workflow-section action-section">
              <div className="section-header">
                <span className="step-number">2</span>
                <h2>Process Quizzes</h2>
              </div>
              <p className="section-description">
                Auto-finds Canvas ZIP in Downloads, combines PDFs, prepares for grading.
              </p>
              <button 
                className="btn-primary btn-large"
                onClick={handleProcessQuizzes}
                disabled={!selectedClass || processing}
              >
                {processing ? 'Processing...' : 'Process Quizzes'}
              </button>
            </div>

            {/* Step 3: Extract Grades */}
            <div className="workflow-section action-section">
              <div className="section-header">
                <span className="step-number">3</span>
                <h2>Extract Grades</h2>
              </div>
              <p className="section-description">
                Use OCR to extract grades and update Import File.
              </p>
              <button 
                className="btn-success btn-large"
                onClick={handleExtractGrades}
                disabled={!selectedClass || extracting}
              >
                {extracting ? 'Extracting...' : 'Extract Grades'}
              </button>
            </div>

            {/* Step 4: Split PDF and Rezip */}
            <div className="workflow-section action-section">
              <div className="section-header">
                <span className="step-number">4</span>
                <h2>Split PDF and Rezip</h2>
              </div>
              <p className="section-description">
                Split combined PDF back into individual student PDFs and rezip folders.
              </p>
              <div className="button-group">
                <button 
                  className="btn-warning btn-large"
                  onClick={handleSplitPdf}
                  disabled={!selectedClass || splitting}
                >
                  {splitting ? 'Processing...' : 'Split PDF and Rezip'}
                </button>
                <button 
                  className="btn-secondary btn-large"
                  onClick={handleOpenFolder}
                  disabled={!selectedClass}
                >
                  📂 Open Folder
                </button>
              </div>
            </div>

            {/* Clear All Data */}
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
              <button className="btn-utility btn-home" onClick={handleBackToHome}>
                Back to Home
              </button>
              <button className="btn-utility btn-clear" onClick={handleClearAll}>
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizGrader;

