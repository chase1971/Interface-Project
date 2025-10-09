import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./D2LInterface.css";
import mavericksLogo from "../assets/mavericks-logo.png";

function D2LInterface() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [status, setStatus] = useState("Ready - Click 'Login to D2L' to begin");
  const [statusColor, setStatusColor] = useState("gray");

  // Class URLs mapping (same as Python GUI)
  const classUrls = {
    "FM4202": "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1580392",
    "FM4103": "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1580390",
    "CA4203": "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1580436",
    "CA4201": "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1580434",
    "CA4105": "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1580431",
  };

  const d2lLoginUrl = "https://d2l.lonestar.edu/d2l/home";

  const handleLogin = async () => {
    setStatus("Opening browser...");
    setStatusColor("blue");
    
    try {
      const response = await fetch('http://localhost:5000/api/d2l/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classUrl: d2lLoginUrl
        })
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

  const handleClassSelect = async (className) => {
    if (!loggedIn) {
      alert("Please click 'Login to D2L' first!");
      return;
    }

    const classUrl = classUrls[className];
    if (!classUrl) {
      alert(`No URL found for class: ${className}`);
      return;
    }

    setSelectedClass(className);
    setStatus(`Navigating to ${className}...`);
    setStatusColor("blue");

    try {
      const response = await fetch('http://localhost:5000/api/d2l/select-class', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classUrl: classUrl
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setStatus(`Opened ${className} - Upload CSV to continue`);
        setStatusColor("green");
      } else {
        setStatus("Class selection failed: " + result.error);
        setStatusColor("red");
      }
    } catch (error) {
      setStatus("Class selection error: " + error.message);
      setStatusColor("red");
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setStatus("Uploading CSV file...");
      setStatusColor("blue");
      
      try {
        const formData = new FormData();
        formData.append('csvFile', file);

        const response = await fetch('http://localhost:5000/api/d2l/upload', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        
        if (result.success) {
          setCsvFile({ file: file, path: result.filePath });
          setStatus("CSV loaded - Click 'Update Dates' to process");
          setStatusColor("green");
        } else {
          setStatus("Upload failed: " + result.error);
          setStatusColor("red");
        }
      } catch (error) {
        setStatus("Upload error: " + error.message);
        setStatusColor("red");
      }
    }
  };

  const handleBrowseClick = async () => {
    try {
      setStatus("Opening file browser...");
      setStatusColor("blue");
      
      // Open Windows Explorer to the D2L Macro directory
      const response = await fetch('http://localhost:5000/api/d2l/browse');
      const result = await response.json();
      
      if (result.success) {
        setStatus("File browser opened - Select your CSV file");
        setStatusColor("green");
        
        // Now show the file input for CSV selection
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.style.display = 'none';
        
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            handleFileUpload({ target: { files: [file] } });
          }
        };
        
        input.click();
      } else {
        setStatus("Failed to open file browser: " + result.error);
        setStatusColor("red");
      }
    } catch (error) {
      setStatus("Browse error: " + error.message);
      setStatusColor("red");
    }
  };

  const handleUpdateDates = async () => {
    if (!loggedIn) {
      alert("Please login first!");
      return;
    }

    if (!selectedClass) {
      alert("Please select a class first!");
      return;
    }

    if (!csvFile) {
      alert("Please select a CSV file first!");
      return;
    }

    setStatus("Processing CSV...");
    setStatusColor("blue");

    try {
      const classUrl = classUrls[selectedClass];
      
      const response = await fetch('http://localhost:5000/api/d2l/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvFilePath: csvFile.path,
          classUrl: classUrl
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setStatus(`Success! Processed ${result.processed} assignments`);
        setStatusColor("green");
        alert(`Successfully processed ${result.processed} assignments!`);
      } else {
        setStatus("Processing failed: " + result.error);
        setStatusColor("red");
        alert("Processing failed: " + result.error);
      }
    } catch (error) {
      setStatus("Processing error: " + error.message);
      setStatusColor("red");
      alert("Processing error: " + error.message);
    }
  };

  const handleClearLogin = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/d2l/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setLoggedIn(false);
        setSelectedClass(null);
        setCsvFile(null);
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

  return (
    <div className="d2l-container">
      <header className="d2l-header">
        <img src={mavericksLogo} alt="Mavericks Logo" className="d2l-logo" />
        <h1 className="d2l-title">D2L Date Manager</h1>
      </header>

      <main className="d2l-main">
        <div className="d2l-content">
          {/* Login Section */}
          <div className="d2l-section">
            <h3 className="section-title">Login</h3>
            <button 
              className={`login-btn ${loggedIn ? 'disabled' : ''}`}
              onClick={handleLogin}
              disabled={loggedIn}
            >
              Login to D2L
            </button>
          </div>

          {/* Class Selection Section */}
          <div className="d2l-section">
            <h3 className="section-title">Select Class</h3>
            <div className="class-buttons">
              {Object.keys(classUrls).map((className) => (
                <button
                  key={className}
                  className={`class-btn ${selectedClass === className ? 'selected' : ''}`}
                  onClick={() => handleClassSelect(className)}
                >
                  {className}
                </button>
              ))}
            </div>
          </div>

          {/* CSV Upload Section */}
          <div className="d2l-section">
            <h3 className="section-title">Upload CSV</h3>
            <div className="csv-upload">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="file-input"
                id="csv-file"
                webkitdirectory="false"
                directory=""
                nwdirectory=""
              />
              <button className="file-label" onClick={handleBrowseClick}>
                Browse
              </button>
              <button 
                className="update-btn"
                onClick={handleUpdateDates}
                disabled={!loggedIn || !selectedClass || !csvFile}
              >
                Update Dates
              </button>
              <button className="exit-btn" onClick={() => navigate('/')}>
                Back to Home
              </button>
            </div>
          </div>

          {/* Status Section */}
          <div className="status-section">
            <p className={`status-text ${statusColor}`}>
              {status}
            </p>
          </div>

          {/* Clear Login Button */}
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
