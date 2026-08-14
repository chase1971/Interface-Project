import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./D2LInterface.css";
import mavericksLogo from "../assets/mavericks-logo.png";
import { getApiBaseUrl } from "../config";

function D2LInterface() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedCsvPath, setSelectedCsvPath] = useState(null);
  const [status, setStatus] = useState("Ready - Click 'Login to D2L' to begin");
  const [statusColor, setStatusColor] = useState("gray");

  // Class URLs mapping
  const classUrls = {
    FM4101: "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1616943",
    CA4101: "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1617029",
    FM4201: "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1616946",
    FM4203: "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1616948",
  };

  const d2lLoginUrl = "https://d2l.lonestar.edu/d2l/home";

  // ============================================
  // LOGIN TO D2L
  // ============================================
  const handleLogin = async () => {
    setStatus("Opening browser...");
    setStatusColor("blue");
    try {
      const apiBase = await getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/d2l/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classUrl: d2lLoginUrl }),
      });
      const result = await response.json();
      if (result.success) {
        setLoggedIn(true);
        setStatus("Browser opened - Please log in manually");
        setStatusColor("green");
      } else {
        setStatus("Login failed: " + result.error);
        setStatusColor("red");
      }
    } catch (error) {
      setStatus("Login error: " + error.message);
      setStatusColor("red");
    }
  };

  // ============================================
  // SELECT CLASS (opens course in browser)
  // ============================================
  const handleClassSelect = async (className) => {
    if (!loggedIn) {
      alert("Please click 'Login to D2L' first!");
      return;
    }

    setSelectedClass(className);
    setStatus(`Navigating to ${className}...`);
    setStatusColor("blue");

    try {
      // Step 1️⃣ - Tell backend to open the course page in persistent Chrome
      const apiBase = await getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/d2l/select-class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode: className })
      }).catch((fetchError) => {
        // Network error - backend might not be running
        if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
          throw new Error('Cannot connect to backend server. Please ensure the backend is running.');
        }
        throw fetchError;
      });

      if (!response.ok) {
        throw new Error(`Server returned error: ${response.status} ${response.statusText}`);
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        // If the backend ever sends non-JSON again, don't crash the UI.
        const text = await response.text().catch(() => '');
        console.error('Non-JSON from /select-class:', text);
        throw new Error('Invalid JSON returned from server');
      }
      
      if (result.success) {
        setStatus(`Opened ${className} in persistent browser`);
        setStatusColor("green");
      } else {
        setStatus("Class selection failed: " + (result.error || 'Unknown error'));
        setStatusColor("red");
      }
    } catch (error) {
      console.error('Class selection error:', error);
      setStatus("Class selection error: " + error.message);
      setStatusColor("red");
    }
  };

  // ============================================
  // OPEN CSV FILE - File picker dialog
  // ============================================
  const handleOpenCSV = async () => {
    try {
      setStatus("Select a CSV file...");
      setStatusColor("blue");

      // Create a hidden file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          setStatus("No file selected");
          setStatusColor("gray");
          return;
        }

        // Upload the file to the backend
        const formData = new FormData();
        formData.append('csvFile', file);

        try {
          const apiBase = await getApiBaseUrl();
          const response = await fetch(`${apiBase}/api/d2l/upload`, {
            method: 'POST',
            body: formData
          });

          const result = await response.json();
          
          if (result.success) {
            setSelectedCsvPath(result.filePath);
            setStatus(`✅ CSV loaded: ${file.name}`);
            setStatusColor("green");
          } else {
            setStatus("❌ Failed to upload CSV: " + result.error);
            setStatusColor("red");
          }
        } catch (error) {
          setStatus("Upload error: " + error.message);
          setStatusColor("red");
        }
      };

      // Trigger the file picker
      input.click();
    } catch (error) {
      setStatus("Open CSV error: " + error.message);
      setStatusColor("red");
    }
  };

  // ============================================
  // PROCESS SCHEDULE - Uses selected CSV
  // ============================================
  const handleProcessSchedule = async (e) => {
    // stop any parent/sibling click handlers from firing
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      if (!selectedClass) {
        setStatus("❌ Please select a class first!");
        setStatusColor("red");
        return;
      }

      if (!selectedCsvPath) {
        setStatus("❌ Please select a CSV file first!");
        setStatusColor("red");
        return;
      }

      setStatus(`⚙️ Processing schedule for ${selectedClass}...`);
      setStatusColor("blue");

      const apiBase = await getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/d2l/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          csvFilePath: selectedCsvPath,
          classUrl: classUrls[selectedClass]
        }),
      });

      let result;
      try {
        result = await response.json();
      } catch {
        setStatus("✅ Schedule process started (Python running).");
        setStatusColor("green");
        return;
      }

      if (result.success) {
        setStatus("✅ Schedule processed successfully.");
        setStatusColor("green");
      } else {
        setStatus("❌ Failed to process schedule: " + result.error);
        setStatusColor("red");
      }
    } catch (error) {
      setStatus("Process schedule error: " + error.message);
      setStatusColor("red");
    }
  };

  // ============================================
  // CLEAR LOGIN STATE
  // ============================================
  const handleClearLogin = async () => {
    try {
      const apiBase = await getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/d2l/clear`, { method: "POST" });
      const result = await response.json();
      if (result.success) {
        setLoggedIn(false);
        setSelectedClass(null);
        setStatus("Ready - Click 'Login to D2L' to begin");
        setStatusColor("gray");
      } else {
        setStatus("Clear failed: " + result.error);
        setStatusColor("red");
      }
    } catch (error) {
      setStatus("Clear error: " + error.message);
      setStatusColor("red");
    }
  };

  // ============================================
  // INTERFACE LAYOUT
  // ============================================
  return (
    <div className="d2l-container">
      <header className="d2l-header">
        <img src={mavericksLogo} alt="Mavericks Logo" className="d2l-logo" />
        <h1 className="d2l-title">D2L Date Manager</h1>
      </header>

      <main className="d2l-main">
        <div className="d2l-content">

          {/* LOGIN SECTION */}
          <div className="d2l-section">
            <h3 className="section-title">Login</h3>
            <button
              className={`login-btn ${loggedIn ? "disabled" : ""}`}
              onClick={handleLogin}
              disabled={loggedIn}
            >
              Login to D2L
            </button>
          </div>

          {/* CLASS SELECTION SECTION */}
          <div className="d2l-section">
            <h3 className="section-title">Select Class</h3>
            <div className="class-buttons">
              {Object.keys(classUrls).map((className) => (
                <button
                  key={className}
                  type="button"
                  className={`class-btn ${selectedClass === className ? "selected" : ""}`}
                  onClick={(e) => { e.stopPropagation(); handleClassSelect(className); }}
                >
                  {className}
                </button>
              ))}
            </div>
          </div>

          {/* CSV AND PROCESSING SECTION */}
          <div className="d2l-section">
            <h3 className="section-title">Schedule Processing</h3>
            {selectedCsvPath && (
              <p style={{ fontSize: '14px', color: '#4caf50', marginBottom: '10px' }}>
                📄 CSV File: {selectedCsvPath.split('\\').pop().split('/').pop()}
              </p>
            )}
            <div className="csv-upload">
              <button type="button" className="file-label" onClick={(e) => { e.stopPropagation(); handleOpenCSV(); }}>
                📂 {selectedCsvPath ? 'Change CSV File' : 'Open CSV File'}
              </button>
              <button
                type="button"
                className="update-btn"
                onClick={(e) => handleProcessSchedule(e)}
                disabled={!loggedIn || !selectedClass || !selectedCsvPath}
              >
                ⚙️ Process Schedule
              </button>
              <button type="button" className="exit-btn" onClick={(e) => { e.stopPropagation(); navigate('/'); }}>
                Back to Home
              </button>
            </div>
          </div>

          {/* STATUS SECTION */}
          <div className="status-section">
            <p className={`status-text ${statusColor}`}>{status}</p>
          </div>

          {/* CLEAR LOGIN BUTTON */}
          <div className="clear-section">
            <button className="clear-btn" onClick={handleClearLogin}>
              Clear Login
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}

export default D2LInterface;
