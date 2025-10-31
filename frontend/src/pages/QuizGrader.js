import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './QuizGrader.css';
import { listClasses, processQuizzes, processSelectedQuiz, processCompletion, processSelectedCompletion, extractGrades, splitPdf, openFolder, openDownloads, clearAllData } from '../services/quizGraderService';

function QuizGrader() {
  const navigate = useNavigate();
  // Always use C drive
  const drive = 'C';
  const [selectedClass, setSelectedClass] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processingCompletion, setProcessingCompletion] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [zipFiles, setZipFiles] = useState([]);
  const [showZipSelection, setShowZipSelection] = useState(false);
  const [zipSelectionMode, setZipSelectionMode] = useState('quiz'); // 'quiz' or 'completion'
  const [extendedLogging, setExtendedLogging] = useState(false); // Regular logging by default
  const logContainerRef = useRef(null);

  // Auto-scroll logs to bottom when new messages arrive or logging mode changes
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, extendedLogging]);

  // Add log helper with error handling
  const addLog = (message) => {
    try {
      if (message) {
        setLogs(prevLogs => {
          try {
            return [...prevLogs, message];
          } catch (e) {
            console.error('Error adding log:', e);
            return [message]; // Start fresh if there's an issue
          }
        });
      }
    } catch (e) {
      console.error('Critical error in addLog:', e, message);
      // Try to set a single log message
      try {
        setLogs([`Error logging message: ${message}`]);
      } catch (e2) {
        console.error('Could not set logs at all:', e2);
      }
    }
  };

  // Filter logs for regular logging mode
  // Shows only: processing start/end, class/assignment info, student names/points, and final summary
  const shouldShowLog = (log, index) => {
    if (extendedLogging) return true; // Show everything in extended mode
    
    const logLower = log.toLowerCase();
    const logTrimmed = log.trim();
    
    // Show any message that starts with an emoji (likely important user-facing messages)
    if (/^[🔬📦✅❌⚠️📡🔍📁📄📊📝📂🗑️]/.test(logTrimmed)) {
      return true;
    }
    
    // Always show errors and warnings
    if (
      logLower.includes('error') || 
      logLower.includes('❌') || 
      logLower.includes('failed') ||
      logLower.includes('warning') ||
      logTrimmed.includes('ERROR') ||
      logTrimmed.includes('WARNING')
    ) {
      return true;
    }
    
    // Extract Grades simplified logging - only show important messages
    if (
      logLower.includes('🔬 extracting grades') ||
      logLower.includes('🔬 starting grade extraction') ||
      logLower.includes('extracting grades from pdf') ||
      logLower.includes('starting extraction') ||
      logTrimmed.includes('✅ Done') ||
      logTrimmed.includes('✅ Grade extraction completed successfully!')
    ) {
      return true;
    }
    
    // Show low confidence students (need verification)
    if (
      logLower.includes('low confidence') ||
      logLower.includes('marked verify') ||
      (logLower.includes('⚠️') && (logLower.includes('verify') || logLower.includes('confidence')))
    ) {
      return true;
    }
    
    // Show matching errors from Extract Grades
    if (
      logLower.includes('could not match:') ||
      (logLower.includes('⚠️') && logLower.includes('could not match'))
    ) {
      return true;
    }
    
    // Hide other Extract Grades success messages (like "✅ Updated {name}: {grade}")
    if (
      logLower.includes('✅ updated') && logLower.includes(':') ||
      logLower.includes('updated') && logLower.includes('grades in import file') ||
      logLower.includes('extracted') && logLower.includes('grades') ||
      logLower.includes('found') && logLower.includes('non-empty grades') ||
      logLower.includes('verifying update') ||
      logLower.includes('closed open files') ||
      logLower.includes('closing any open') ||
      logLower.includes('using column:') ||
      logLower.includes('opened excel') ||
      logLower.includes('opened first pages') ||
      logLower.includes('found combined pdf') ||
      logLower.includes('import file updated with grades')
    ) {
      return false;
    }
    
    // Hide frontend communication messages
    if (
      logLower.includes('📡 sending') ||
      logLower.includes('🔍 searching') ||
      logLower.includes('📁 processing selected') ||
      logLower.includes('📁 multiple zip files') ||
      logTrimmed.includes('Multiple ZIP files found - user selection required')
    ) {
      return false;
    }
    
    // Hide intermediate start messages like "STARTING COMPLETION PROCESSING"
    if (
      logTrimmed.includes('STARTING COMPLETION PROCESSING') ||
      logTrimmed.includes('STARTING QUIZ PROCESSING')
    ) {
      return false;
    }
    
    // Show only the first main processing start message (COMPLETION/QUIZ PROCESSING STARTED)
    // Track if we've already seen it to avoid duplicates
    const hasSeenStart = logs.slice(0, index).some(l => 
      l.trim().includes('COMPLETION PROCESSING STARTED') || 
      l.trim().includes('QUIZ PROCESSING STARTED')
    );
    if (
      (logTrimmed.includes('COMPLETION PROCESSING STARTED') || 
       logTrimmed.includes('QUIZ PROCESSING STARTED')) &&
      !hasSeenStart
    ) {
      return true;
    }
    
    // Hide plain completion messages without checkmark (duplicates)
    if (
      logTrimmed === 'COMPLETION PROCESSING COMPLETED' ||
      logTrimmed === 'QUIZ PROCESSING COMPLETED'
    ) {
      return false;
    }
    
    // Show class name (but only the first occurrence, not duplicates)
    const hasSeenClass = logs.slice(0, index).some(l => 
      l.trim().startsWith('Class:') && 
      !l.trim().includes('Processing folder') &&
      !l.trim().includes('Drive:')
    );
    if (
      logTrimmed.startsWith('Class:') && 
      !logTrimmed.includes('Processing folder') &&
      !logTrimmed.includes('Drive:') &&
      !hasSeenClass
    ) {
      return true;
    }
    
    // Show assignment name
    if (logTrimmed.startsWith('Assignment:')) {
      return true;
    }
    
    // Show import file loaded message
    if (logTrimmed.includes('Loaded Import File:') && logTrimmed.includes('students')) {
      return true;
    }
    
    // Show unique students found
    if (logTrimmed.includes('Found') && logTrimmed.includes('unique students')) {
      return true;
    }
    
    // Show student names and points - exact pattern: "Name: PDF found → 10 points"
    if (
      /^[^:]+: PDF found → \d+ points$/i.test(logTrimmed) ||
      /^[^:]+: No submission → \d+ points$/i.test(logTrimmed) ||
      /^[^:]+: .*unreadable/i.test(logTrimmed) ||
      /→ \d+ points$/i.test(logTrimmed)
    ) {
      return true;
    }
    
    // Show matching issues (students who couldn't be matched)
    if (
      logLower.includes('could not match') ||
      logLower.includes('cannot match') ||
      (logTrimmed.includes(':') && logLower.includes('could not match'))
    ) {
      return true;
    }
    
    // Show combined PDF creation message
    if (
      logTrimmed.includes('Created combined PDF:') && 
      logTrimmed.includes('submissions')
    ) {
      return true;
    }
    
    // Hide PDF opened message
    if (
      logTrimmed.includes('Opened PDF file:') ||
      (logLower.includes('opened') && logLower.includes('pdf'))
    ) {
      return false;
    }
    
    // Hide duplicate auto-assigned messages (the ones that say "Auto-assigned X points to Y submissions")
    if (
      logTrimmed.includes('✅ Auto-assigned') && 
      (logTrimmed.includes('submissions') || logTrimmed.includes('all submissions'))
    ) {
      return false;
    }
    
    // Show only the final completion message with checkmark
    if (
      logTrimmed.includes('✅ Completion processing completed!') ||
      logTrimmed.includes('✅ Quiz processing completed!')
    ) {
      return true;
    }
    
    // Split PDF simplified logging
    if (
      logLower.includes('📦 starting pdf split') ||
      logLower.includes('starting pdf split') ||
      (logLower.includes('split pdf for') && logLower.includes('students')) ||
      logTrimmed === '✅ Done'
    ) {
      return true;
    }
    
    // Show friendly error messages (without emojis)
    if (
      logTrimmed.includes('Oops.') ||
      logTrimmed.includes('Something went wrong') ||
      logTrimmed.includes('Something ran into a problem') ||
      logTrimmed.includes('It ran into a problem') ||
      logTrimmed.includes('Could not process')
    ) {
      return true;
    }
    
    // Hide everything else: technical details, paths, renaming, column operations, etc.
    return false;
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
        setZipSelectionMode('quiz');
        setShowZipSelection(true);
        addLog('📁 Multiple ZIP files found - please select one');
        // Don't set processing to false here, keep it true until user selects
        return; // Exit early, don't set processing to false
      } else {
        // Check if it's a wrong class/file error
        if (result.error && (result.error.includes('Oops') || result.error.includes('wrong file') || result.error.includes('wrong class'))) {
          addLog('Oops. You\'ve chosen the wrong file or class. Try again.');
          setProcessing(false);
          setSelectedClass(''); // Reset class selection
        } else {
          addLog(`Error: ${result.error}`);
        }
      }
    } catch (error) {
      // Check if it's a wrong class/file error
      if (error.message && (error.message.includes('Oops') || error.message.includes('wrong file') || error.message.includes('wrong class'))) {
        addLog('Oops. You\'ve chosen the wrong file or class. Try again.');
        setSelectedClass(''); // Reset class selection
      } else {
        addLog(`Error: ${error.message}`);
      }
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
        // Check if it's a wrong class/file error
        if (result.error && (result.error.includes('Oops') || result.error.includes('wrong file') || result.error.includes('wrong class'))) {
          addLog('Oops. You\'ve chosen the wrong file or class. Try again.');
          setProcessing(false);
          setSelectedClass(''); // Reset class selection
        } else {
          addLog(`Error: ${result.error}`);
        }
      }
    } catch (error) {
      // Check if it's a wrong class/file error
      if (error.message && (error.message.includes('Oops') || error.message.includes('wrong file') || error.message.includes('wrong class'))) {
        addLog('Oops. You\'ve chosen the wrong file or class. Try again.');
        setSelectedClass(''); // Reset class selection
      } else {
        addLog(`Error: ${error.message}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  // Process completions (extract ZIP, combine PDFs, auto-assign 10 points)
  const handleProcessCompletion = async () => {
    if (!selectedClass) {
      addLog('❌ Please select a class first');
      return;
    }

    setProcessingCompletion(true);
    addLog('🔍 Searching for Canvas ZIP in Downloads...');
    
    try {
      const result = await processCompletion(drive, selectedClass, addLog);
      
      if (result.success) {
        addLog('✅ Completion processing completed!');
        addLog('✅ Auto-assigned 10 points to all submissions');
      } else if (result.error === 'Multiple ZIP files found') {
        // Show ZIP file selection dialog
        setZipFiles(result.zip_files || []);
        setZipSelectionMode('completion');
        setShowZipSelection(true);
        addLog('📁 Multiple ZIP files found - please select one');
        // Keep processingCompletion true until user selects
        return;
      } else {
        // Check if it's a wrong class/file error
        if (result.error && (result.error.includes('Wrong class') || result.error.includes('wrong ZIP') || result.error.includes('No submissions found'))) {
          addLog('❌ Wrong class or wrong ZIP file chosen');
          addLog('Please verify your class selection and ZIP file, then try again');
          setProcessingCompletion(false);
          setSelectedClass(''); // Reset class selection
        } else {
          addLog(`❌ Error: ${result.error}`);
        }
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setProcessingCompletion(false);
    }
  };

  // Handle ZIP file selection for completions
  const handleCompletionZipSelection = async (zipPath) => {
    setShowZipSelection(false);
    setProcessingCompletion(true);
    addLog(`📁 Processing selected ZIP file: ${zipPath.split('\\').pop()}`);
    
    try {
      const result = await processSelectedCompletion(drive, selectedClass, zipPath, addLog);
      
      if (result.success) {
        addLog('✅ Completion processing completed!');
        addLog('✅ Auto-assigned 10 points to all submissions');
      } else {
        // Check if it's a wrong class/file error
        if (result.error && (result.error.includes('Wrong class') || result.error.includes('wrong ZIP') || result.error.includes('No submissions found'))) {
          addLog('❌ Wrong class or wrong ZIP file chosen');
          addLog('Please verify your class selection and ZIP file, then try again');
          setProcessingCompletion(false);
          setSelectedClass(''); // Reset class selection
        } else {
          addLog(`❌ Error: ${result.error}`);
        }
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setProcessingCompletion(false);
    }
  };

  // Extract grades from graded PDF using OCR
  const handleExtractGrades = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      console.log('handleExtractGrades called', { selectedClass });
      
      if (!selectedClass) {
        addLog('❌ Please select a class first');
        return;
      }

      setExtracting(true);
      addLog('🔬 Starting grade extraction...');
      
      try {
        const result = await extractGrades(drive, selectedClass, addLog);
        
        // Check if result is null/undefined (network error, etc.)
        if (!result) {
          addLog('Something went wrong with the extraction.');
          setExtracting(false);
          return;
        }
        
        if (result.success) {
          addLog('✅ Done');
        } else {
          // Display the error message from the backend (already formatted by Python script)
          if (result.error) {
            addLog(result.error);
          } else {
            addLog('Something went wrong with the extraction.');
          }
          
          // Reset class selection if it's a wrong file/class error
          if (result.error && (result.error.includes('Oops') || result.error.includes('wrong file') || result.error.includes('wrong class'))) {
            setSelectedClass('');
          }
        }
      } catch (error) {
        console.error('Extract grades error:', error);
        // Check what type of error it is
        if (error && error.message && (error.message.includes('Oops') || error.message.includes('wrong file') || error.message.includes('wrong class'))) {
          addLog('Oops. You\'ve chosen the wrong file or class. Try again.');
          setSelectedClass('');
        } else if (error && error.message && (error.message.includes('empty') || error.message.includes('could not be read'))) {
          addLog('Something went wrong with the extraction. Make sure you\'ve run "Process Quizzes" or "Process Completion" first.');
        } else if (error && error.message) {
          addLog(`Something went wrong with the extraction: ${error.message}`);
        } else {
          addLog('It ran into a problem.');
        }
      } finally {
        setExtracting(false);
      }
    } catch (outerError) {
      console.error('Critical error in handleExtractGrades:', outerError);
      addLog('It ran into a problem.');
      setExtracting(false);
    }
  };

  // Split combined PDF back into individual student PDFs and rezip
  const handleSplitPdf = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      console.log('handleSplitPdf called', { selectedClass });
      
      if (!selectedClass) {
        addLog('❌ Please select a class first');
        return;
      }

      setSplitting(true);
      addLog('📦 Starting PDF split and rezip...');
      
      try {
        const result = await splitPdf(drive, selectedClass, addLog);
        
        // Check if result is null/undefined (network error, etc.)
        if (!result) {
          addLog('Something ran into a problem with the split and zip.');
          setSplitting(false);
          return;
        }
        
        if (result.success) {
          addLog('✅ Done');
        } else {
          // Display the error message from the backend (already formatted by Python script)
          if (result.error) {
            addLog(result.error);
          } else {
            addLog('Something ran into a problem with the split and zip.');
          }
        }
      } catch (error) {
        console.error('Split PDF error:', error);
        // Check what type of error it is
        if (error && error.message) {
          addLog(`Something ran into a problem with the split and zip: ${error.message}`);
        } else {
          addLog('Something ran into a problem with the split and zip.');
        }
      } finally {
        setSplitting(false);
      }
    } catch (outerError) {
      console.error('Critical error in handleSplitPdf:', outerError);
      addLog('Something ran into a problem with the split and zip.');
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
    setProcessingCompletion(false);
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
                <button type="button" className="btn-secondary" onClick={handleLoadClasses}>
                  Refresh
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Downloads Folder</label>
              <button type="button" className="btn-secondary" onClick={handleOpenDownloads}>
                📁 Open Downloads Folder
              </button>
            </div>

            {/* Activity Log */}
            <div className="log-section">
              <div className="log-header">
                <label className="log-control-label">
                  <input
                    type="checkbox"
                    checked={extendedLogging}
                    onChange={(e) => setExtendedLogging(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '0.9em', color: '#666' }}>Extended Logging</span>
                </label>
              </div>
              <div className="log-container" ref={logContainerRef}>
                {logs.length === 0 ? (
                  <div className="log-entry log-empty">Awaiting commands...</div>
                ) : (
                  (extendedLogging ? logs : logs.filter(shouldShowLog)).map((log, index) => (
                    <div key={`log-${index}-${log.substring(0, 20)}`} className="log-entry">{log}</div>
                  ))
                )}
              </div>
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
                        type="button"
                        key={index}
                        className="zip-file-option"
                        onClick={() => {
                          if (zipSelectionMode === 'quiz') {
                            handleZipSelection(zipFile.path);
                          } else {
                            handleCompletionZipSelection(zipFile.path);
                          }
                        }}
                      >
                        {zipFile.index}. {zipFile.filename}
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setShowZipSelection(false);
                      setProcessing(false);
                      setProcessingCompletion(false);
                    }}
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
              <div className="button-group">
                <button 
                  type="button"
                  className="btn-primary btn-large"
                  onClick={handleProcessQuizzes}
                  disabled={!selectedClass || processing || processingCompletion}
                >
                  {processing ? 'Processing...' : 'Process Quizzes'}
                </button>
                <button 
                  type="button"
                  className="btn-success btn-large"
                  onClick={handleProcessCompletion}
                  disabled={!selectedClass || processing || processingCompletion}
                  style={{ marginLeft: '10px' }}
                >
                  {processingCompletion ? 'Processing...' : 'Process Completion'}
                </button>
              </div>
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
                type="button"
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
                  type="button"
                  className="btn-warning btn-large"
                  onClick={handleSplitPdf}
                  disabled={!selectedClass || splitting}
                >
                  {splitting ? 'Processing...' : 'Split PDF and Rezip'}
                </button>
                <button 
                  type="button"
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
                type="button"
                className="btn-danger btn-large"
                onClick={handleClearAllData}
                disabled={!selectedClass || clearing}
              >
                {clearing ? 'Clearing...' : 'Clear All Data'}
              </button>
            </div>

            {/* Utility Buttons */}
            <div className="utility-buttons">
              <button type="button" className="btn-utility btn-home" onClick={handleBackToHome}>
                Back to Home
              </button>
              <button type="button" className="btn-utility btn-clear" onClick={handleClearAll}>
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

