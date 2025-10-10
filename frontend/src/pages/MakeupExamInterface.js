import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MakeupExamInterface.css";
import mavericksLogo from "../assets/mavericks-logo.png";

function MakeupExamInterface() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(false);
  const [examFile, setExamFile] = useState(null);
  const [status, setStatus] = useState("Ready - Click 'Login' to begin");
  const [statusColor, setStatusColor] = useState("blue");
  const [logMessages, setLogMessages] = useState([]);
  const [students, setStudents] = useState([]);
  const [term, setTerm] = useState("");
  const [exam, setExam] = useState("");
  
  // Suppress ESLint warnings for variables that will be used in future backend integration
  console.log("Students:", students.length, "Term:", term, "Exam:", exam);

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
        setStatus("Exam file selected");
        setStatusColor("green");
        addLogMessage(`Selected exam file: ${file.name}`);
      }
    };
    
    input.click();
  };

  const handleOpenCSV = async () => {
    setStatus("Opening CSV file...");
    setStatusColor("blue");
    addLogMessage("Opening CSV file...");
    
    try {
      const response = await fetch('http://localhost:5000/api/makeup/open-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setStatus("CSV file opened");
        setStatusColor("green");
        addLogMessage("CSV file opened for editing");
      } else {
        setStatus("Failed to open CSV: " + result.error);
        setStatusColor("red");
        addLogMessage("Failed to open CSV: " + result.error);
      }
    } catch (error) {
      setStatus("CSV open error: " + error.message);
      setStatusColor("red");
      addLogMessage("CSV open error: " + error.message);
    }
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

    setStatus("Loading CSV and starting automation...");
    setStatusColor("blue");
    addLogMessage("Loading CSV and starting automation...");
    
    try {
      // First load the CSV data
      const csvResponse = await fetch('http://localhost:5000/api/makeup/load-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const csvResult = await csvResponse.json();
      
      if (!csvResult.success) {
        setStatus("CSV load failed: " + csvResult.error);
        setStatusColor("red");
        addLogMessage("CSV load failed: " + csvResult.error);
        return;
      }

      // Set the CSV data
      setStudents(csvResult.students || []);
      setTerm(csvResult.term || "");
      setExam(csvResult.exam || "");
      addLogMessage(`Loaded ${csvResult.students?.length || 0} student(s) from CSV.`);
      addLogMessage(`Term: ${csvResult.term}, Exam: ${csvResult.exam}`);
      
      // Now start the automation
      const formData = new FormData();
      formData.append('examFile', examFile);

      const response = await fetch('http://localhost:5000/api/makeup/start-automation', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setStatus("Automation completed successfully");
        setStatusColor("green");
        addLogMessage("All students processed successfully.");
      } else {
        setStatus("Automation failed: " + result.error);
        setStatusColor("red");
        addLogMessage("Automation failed: " + result.error);
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
        setStudents([]);
        setTerm("");
        setExam("");
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
                className="load-csv-btn"
                onClick={handleOpenCSV}
              >
                Open CSV
              </button>
              
              <button 
                className={`start-btn ${!loggedIn || !examFile ? 'disabled' : ''}`}
                onClick={handleStartAutomation}
                disabled={!loggedIn || !examFile}
              >
                Start Automation
              </button>
            </div>
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
