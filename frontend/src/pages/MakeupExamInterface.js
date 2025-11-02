import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MakeupExamInterface.css";
import mavericksLogo from "../assets/mavericks-logo.png";

function MakeupExamInterface() {
  const navigate = useNavigate();
  const drive = 'C'; // Always use C drive
  
  // Load scheduler values from localStorage on mount
  const loadSchedulerFromStorage = () => {
    try {
      const saved = localStorage.getItem('makeupExamScheduler');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          startDate: parsed.startDate || '',
          endDate: parsed.endDate || '',
          examHours: parsed.examHours !== undefined ? parsed.examHours : 0,
          examMinutes: parsed.examMinutes !== undefined ? parsed.examMinutes : 0,
          specifyType: parsed.specifyType || 'none',
          customSpecifyText: parsed.customSpecifyText || ''
        };
      }
    } catch (error) {
      console.error('Error loading scheduler from storage:', error);
    }
    return {
      startDate: '',
      endDate: '',
      examHours: 0,
      examMinutes: 0,
      specifyType: 'none',
      customSpecifyText: ''
    };
  };
  
  const savedScheduler = loadSchedulerFromStorage();
  
  const [loggedIn, setLoggedIn] = useState(false);
  const [examFile, setExamFile] = useState(null);
  const [status, setStatus] = useState("Ready - Click 'Login' to begin");
  const [statusColor, setStatusColor] = useState("blue");
  const [logMessages, setLogMessages] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [examName, setExamName] = useState('');
  const [startDate, setStartDate] = useState(savedScheduler.startDate);
  const [endDate, setEndDate] = useState(savedScheduler.endDate);
  const [examHours, setExamHours] = useState(savedScheduler.examHours);
  const [examMinutes, setExamMinutes] = useState(savedScheduler.examMinutes);
  const [specifyType, setSpecifyType] = useState(savedScheduler.specifyType);
  const [customSpecifyText, setCustomSpecifyText] = useState(savedScheduler.customSpecifyText);
  const [termCode, setTermCode] = useState(savedScheduler.termCode || '1258'); // Default to Fall 2025
  
  // Save scheduler values to localStorage whenever they change
  useEffect(() => {
    const schedulerData = {
      startDate,
      endDate,
      examHours,
      examMinutes,
      specifyType,
      customSpecifyText,
      termCode
    };
    localStorage.setItem('makeupExamScheduler', JSON.stringify(schedulerData));
  }, [startDate, endDate, examHours, examMinutes, specifyType, customSpecifyText, termCode]);

  const addLogMessage = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogMessages(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleLogin = async () => {
    setStatus("Opening browser for login...");
    setStatusColor("blue");
    addLogMessage("Opening browser for login...");
    
    try {
      const response = await fetch('http://localhost:5000/api/makeup/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setLoggedIn(true);
        setStatus("Please log in manually");
        setStatusColor("orange");
        addLogMessage("Login page loaded - please log in manually");
      } else {
        setStatus("Login failed: " + result.error);
        setStatusColor("red");
        addLogMessage("Login failed: " + result.error);
      }
    } catch (error) {
      setStatus("Login error: " + error.message);
      setStatusColor("red");
      addLogMessage("Login error: " + error.message);
    }
  };

  const handleBrowseExam = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.style.display = 'none';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setExamFile(file);
        // Extract exam name from filename (remove extension)
        const fileName = file.name;
        const examNameFromFile = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
        setExamName(examNameFromFile);
        setStatus("Exam file selected");
        setStatusColor("green");
        addLogMessage(`Selected exam file: ${file.name}`);
        addLogMessage(`Exam name: ${examNameFromFile}`);
      }
    };
    
    input.click();
  };

  // Load students from Import File when class is selected
  const handleClassChange = async (className) => {
    console.log('🔍 handleClassChange called with:', className);
    setSelectedClass(className);
    setSelectedStudents(new Set());
    setStudents([]);
    setSchedulerOpen(false); // Close scheduler when class changes
    
    if (!className) {
      console.log('❌ No className provided');
      return;
    }
    
    setStatus("Loading students...");
    setStatusColor("blue");
    addLogMessage(`Loading students for ${className}...`);
    
    try {
      console.log('📡 Making request to load-import-file with:', { drive, className });
      const response = await fetch('http://localhost:5000/api/makeup/load-import-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          drive: drive,
          className: className
        })
      });

      console.log('📥 Response status:', response.status);
      const result = await response.json();
      console.log('📥 Response data:', result);
      
      if (result.success) {
        console.log('✅ Success! Students loaded:', result.students?.length);
        setStudents(result.students || []);
        setStatus(`Loaded ${result.students?.length || 0} students`);
        setStatusColor("green");
        addLogMessage(`✅ Loaded ${result.students?.length || 0} students from Import File`);
        // Sidebar and scheduler automatically open when students are loaded
        setSchedulerOpen(true);
      } else {
        console.error('❌ Request failed:', result.error);
        setStatus("Failed to load students: " + result.error);
        setStatusColor("red");
        addLogMessage("❌ Failed to load students: " + result.error);
      }
    } catch (error) {
      console.error('❌ Request error:', error);
      setStatus("Error loading students: " + error.message);
      setStatusColor("red");
      addLogMessage("❌ Error loading students: " + error.message);
    }
  };

  // Toggle student selection
  const toggleStudentSelection = (studentIndex) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentIndex)) {
      newSelected.delete(studentIndex);
    } else {
      newSelected.add(studentIndex);
    }
    setSelectedStudents(newSelected);
  };

  const handleStartAutomation = async () => {
    if (!loggedIn) {
      alert("Please login first!");
      return;
    }

    if (!examFile) {
      alert("Please select an exam file before starting.");
      return;
    }

    if (!selectedClass) {
      alert("Please select a class first!");
      return;
    }

    if (selectedStudents.size === 0) {
      alert("Please select at least one student for makeup exam.");
      return;
    }

    setStatus("Starting automation...");
    setStatusColor("blue");
    addLogMessage(`Starting automation for ${selectedStudents.size} student(s)...`);
    
    try {
      // Pass all necessary data to backend
      const formData = new FormData();
      formData.append('examFile', examFile);
      formData.append('className', selectedClass);
      formData.append('examName', examName);
      formData.append('selectedStudents', JSON.stringify(Array.from(selectedStudents)));
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('examHours', examHours.toString());
      formData.append('examMinutes', examMinutes.toString());
      formData.append('specifyType', specifyType);
      formData.append('customSpecifyText', customSpecifyText);
      formData.append('termCode', termCode);

      const response = await fetch('http://localhost:5000/api/makeup/start-automation', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setStatus("Automation completed successfully");
        setStatusColor("green");
        addLogMessage("All students processed successfully.");
        
        // Display all debug output from Python script
        if (result.output) {
          const debugLines = result.output.split('\n').filter(line => line.trim());
          debugLines.forEach(line => {
            if (line.includes('[LOG]') || line.includes('[STATUS]')) {
              addLogMessage(line);
            }
          });
        }
      } else {
        setStatus("Automation failed: " + result.error);
        setStatusColor("red");
        addLogMessage("Automation failed: " + result.error);
        
        // Display all debug output from Python script
        if (result.details) {
          const debugLines = result.details.split('\n').filter(line => line.trim());
          debugLines.forEach(line => {
            if (line.includes('[LOG]') || line.includes('[STATUS]')) {
              addLogMessage(line);
            }
          });
        }
      }
    } catch (error) {
      setStatus("Automation error: " + error.message);
      setStatusColor("red");
      addLogMessage("Automation error: " + error.message);
    }
  };

  const handleClearLogin = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/makeup/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setLoggedIn(false);
        setExamFile(null);
        setExamName('');
        setSelectedClass("");
        setStudents([]);
        setSelectedStudents(new Set());
        setLogMessages([]);
        setStatus("Ready - Click 'Login' to begin");
        setStatusColor("blue");
      } else {
        setStatus("Clear failed: " + result.error);
        setStatusColor("red");
      }
    } catch (error) {
      setStatus("Clear error: " + error.message);
      setStatusColor("red");
    }
  };

  return (
    <div className="makeup-container">
      <header className="makeup-header">
        <img src={mavericksLogo} alt="Mavericks Logo" className="makeup-logo" />
        <h1 className="makeup-title">Exam Form Automation Agent</h1>
      </header>

      <main className="makeup-main">
        {/* Student Selection Sidebar */}
        {selectedClass && students.length > 0 && (
          <div className="students-sidebar">
            <div className="sidebar-header">
              <h3 className="sidebar-title">Select Students</h3>
              <div className="sidebar-selection-count-small">
                {selectedStudents.size} of {students.length}
              </div>
            </div>
            <div className="sidebar-students-container">
              {students.map((student, index) => (
                <div
                  key={index}
                  className={`sidebar-student-item ${selectedStudents.has(index) ? 'selected' : ''}`}
                  onClick={() => toggleStudentSelection(index)}
                >
                  {student.fullName || 'Unknown Student'}
                </div>
              ))}
            </div>
            </div>
          )}

        {/* Scheduler Panel */}
        {selectedClass && students.length > 0 && schedulerOpen && (
          <div className="scheduler-sidebar">
            <div className="scheduler-header">
              <h3 className="scheduler-title">Scheduler</h3>
              <button 
                className="scheduler-close-btn"
                onClick={() => setSchedulerOpen(false)}
              >
                ×
              </button>
            </div>
            
            <div className="scheduler-content">
              {/* Term Code */}
              <div className="scheduler-field">
                <label className="scheduler-label">Term Code</label>
                <input
                  type="text"
                  value={termCode}
                  onChange={(e) => setTermCode(e.target.value)}
                  placeholder="e.g., 1258"
                  className="scheduler-text-input"
                  maxLength={4}
                />
              </div>

              {/* Start Date */}
              <div className="scheduler-field">
                <label className="scheduler-label">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="scheduler-date-input"
                />
              </div>

              {/* End Date */}
              <div className="scheduler-field">
                <label className="scheduler-label">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="scheduler-date-input"
                  min={startDate}
                />
              </div>

              {/* Exam Duration */}
              <div className="scheduler-field">
                <label className="scheduler-label">Exam Duration</label>
                <div className="duration-selectors">
                  <select
                    value={examHours}
                    onChange={(e) => setExamHours(Number(e.target.value))}
                    className="duration-select"
                  >
                    <option value={0}>0 hours</option>
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={3}>3 hours</option>
                  </select>
                  <select
                    value={examMinutes}
                    onChange={(e) => setExamMinutes(Number(e.target.value))}
                    className="duration-select"
                  >
                    <option value={0}>0 minutes</option>
                    <option value={20}>20 minutes</option>
                    <option value={40}>40 minutes</option>
                  </select>
                </div>
              </div>

              {/* Specify Option */}
              <div className="scheduler-field">
                <label className="scheduler-label">Specify (Optional)</label>
                <div className="specify-options">
                  <label className="specify-radio-label">
                    <input
                      type="radio"
                      name="specify"
                      value="none"
                      checked={specifyType === 'none'}
                      onChange={(e) => setSpecifyType(e.target.value)}
                      className="specify-radio"
                    />
                    <span>None</span>
                  </label>
                  <label className="specify-radio-label">
                    <input
                      type="radio"
                      name="specify"
                      value="noteCard"
                      checked={specifyType === 'noteCard'}
                      onChange={(e) => setSpecifyType(e.target.value)}
                      className="specify-radio"
                    />
                    <span>3x5 Note Card</span>
                  </label>
                  <label className="specify-radio-label">
                    <input
                      type="radio"
                      name="specify"
                      value="custom"
                      checked={specifyType === 'custom'}
                      onChange={(e) => setSpecifyType(e.target.value)}
                      className="specify-radio"
                    />
                    <span>Custom</span>
                  </label>
                </div>
                
                {specifyType === 'noteCard' && (
                  <div className="note-card-preview">
                    <div className="note-card-text">
                      Students are allowed to use one 3x5 note card during the exam.
                    </div>
                  </div>
                )}
                
                {specifyType === 'custom' && (
                  <textarea
                    value={customSpecifyText}
                    onChange={(e) => setCustomSpecifyText(e.target.value)}
                    placeholder="Enter custom specification text..."
                    className="custom-specify-input"
                    rows={4}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        <div className="makeup-content">
          {/* Control Buttons Section */}
          <div className="makeup-section">
            <div className="button-row">
              <button 
                className={`login-btn ${loggedIn ? 'disabled' : ''}`}
                onClick={handleLogin}
                disabled={loggedIn}
              >
                Login
              </button>
              
              <button 
                className="browse-btn"
                onClick={handleBrowseExam}
              >
                Browse Exam
              </button>
              
              <button 
                className={`start-btn ${!loggedIn || !examFile || !selectedClass || selectedStudents.size === 0 ? 'disabled' : ''}`}
                onClick={handleStartAutomation}
                disabled={!loggedIn || !examFile || !selectedClass || selectedStudents.size === 0}
              >
                Start Automation
              </button>
            </div>
          </div>

          {/* Class Selection */}
          <div className="makeup-section">
            <h3 className="section-title">Select Class</h3>
            <select 
              value={selectedClass} 
              onChange={(e) => {
                console.log('🔍 Select onChange triggered with:', e.target.value);
                handleClassChange(e.target.value);
              }}
              className="class-select"
            >
              <option value="">Choose a class...</option>
              <option value="MW 11-1220  FM 4103">FM 4103 (MW 11:00-12:20)</option>
              <option value="MW 930-1050 CA 4105">CA 4105 (MW 9:30-10:50)</option>
              <option value="TTH 8-920  CA 4201">CA 4201 (TTH 8:00-9:20)</option>
              <option value="TTH 11-1220 FM 4202">FM 4202 (TTH 11:00-12:20)</option>
              <option value="TTH 930-1050 CA 4203">CA 4203 (TTH 9:30-10:50)</option>
            </select>
            {/* Debug info */}
            {selectedClass && (
              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#94a3b8' }}>
                Selected: {selectedClass} | Students: {students.length}
              </div>
            )}
          </div>

          {/* Log Section */}
          <div className="makeup-section">
            <h3 className="section-title">Log:</h3>
            <div className="log-container">
              {logMessages.map((message, index) => (
                <div key={index} className="log-message">
                  {message}
                </div>
              ))}
            </div>
          </div>

          {/* Status Section */}
          <div className="status-section">
            <p className={`status-text ${statusColor}`}>
              {status}
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="nav-section">
            <button className="back-btn" onClick={() => navigate('/')}>
              Back to Home
            </button>
            <button className="clear-btn" onClick={handleClearLogin}>
              Clear Login
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default MakeupExamInterface;
