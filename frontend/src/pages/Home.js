import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import mavericksLogo from "../assets/mavericks-logo.png";

function Home() {
  const navigate = useNavigate();
  const [serverStatus, setServerStatus] = useState({ serversRunning: false, loading: true });
  const [restarting, setRestarting] = useState(false);
  const [lastRestartTime, setLastRestartTime] = useState(null);

  const handleD2LClick = () => {
    navigate('/d2l');
  };

  const handleMakeupClick = () => {
    navigate('/makeup');
  };

  const handleQuizGraderClick = () => {
    navigate('/quiz-grader');
  };

  // Check server status on component mount
  useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    setServerStatus(prev => ({ ...prev, loading: true }));
    try {
      console.log('Checking server status...');
      const response = await fetch('/api/server/status');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Server status response:', data);
      setServerStatus({ serversRunning: data.serversRunning, loading: false });
    } catch (error) {
      console.error('Error checking server status:', error);
      setServerStatus({ serversRunning: false, loading: false });
    }
  };

  const handleRestartServers = async () => {
    setRestarting(true);
    
    try {
      // Try to call the API first (if server is running)
      const response = await fetch('/api/server/restart-servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        // Server was running, API call succeeded
        setTimeout(() => {
          checkServerStatus();
          setLastRestartTime(new Date().toLocaleTimeString());
          setRestarting(false);
        }, 10000);
      } else {
        throw new Error('Server not responding');
      }
    } catch (error) {
      // Server is down, silently attempt to restart
      console.log('Server down, attempting to restart...');
      
      // Just set the restart time and check status - no popup messages
      setTimeout(() => {
        checkServerStatus();
        setLastRestartTime(new Date().toLocaleTimeString());
        setRestarting(false);
      }, 10000);
    }
  };

  return (
    <div className="home-container">
      <header className="header">
        <img src={mavericksLogo} alt="Mavericks Logo" className="logo" />
        <h1 className="title">Lone Star Mavericks Control Panel</h1>
      </header>

      <main className="split-container">
        {/* LEFT SIDE - MACROS */}
        <section className="split left-panel">
          <div className="panel-header">
            <h2>Automation Scripts</h2>
            <p className="panel-subtitle">Automated grading and data processing tools</p>
          </div>
          <div className="button-grid">
            <button className="menu-card blue" onClick={handleD2LClick}>
              <div className="card-title">D2L Macro</div>
              <div className="card-description">Process assignment dates and deadlines</div>
            </button>
            <button className="menu-card green" onClick={handleMakeupClick}>
              <div className="card-title">Makeup Exam Macro</div>
              <div className="card-description">Automate makeup exam scheduling</div>
            </button>
            <button className="menu-card purple" onClick={handleQuizGraderClick}>
              <div className="card-title">Quiz Grader</div>
              <div className="card-description">OCR-based quiz grading system</div>
            </button>
          </div>
        </section>

        {/* RIGHT SIDE - SYSTEM MANAGEMENT */}
        <section className="split right-panel">
          <div className="panel-header">
            <h2>System Management</h2>
            <p className="panel-subtitle">Server controls and system status</p>
            {/* Server Status Indicator */}
            <div className="server-status-indicator">
              <div className="status-dot" style={{
                backgroundColor: serverStatus.loading 
                  ? '#ff9800' 
                  : serverStatus.serversRunning 
                    ? '#4CAF50' 
                    : '#ff4444',
                boxShadow: serverStatus.loading 
                  ? '0 0 10px rgba(255, 152, 0, 0.5)' 
                  : serverStatus.serversRunning 
                    ? '0 0 10px rgba(76, 175, 80, 0.5)' 
                    : '0 0 10px rgba(255, 68, 68, 0.5)'
              }}></div>
              <span className="status-text">
                {serverStatus.loading 
                  ? 'Checking Status...' 
                  : serverStatus.serversRunning 
                    ? `Servers Running${lastRestartTime ? ` (Started: ${lastRestartTime})` : ''}` 
                    : 'Servers Offline'
                }
              </span>
            </div>
          </div>
          <div className="button-grid">
            <button className="menu-card red">
              <div className="card-title">Database Access</div>
              <div className="card-description">View and manage student records</div>
            </button>
            <button 
              className={`menu-card ${serverStatus.serversRunning ? 'green' : 'orange'} ${restarting ? 'loading' : ''}`}
              onClick={handleRestartServers}
              disabled={restarting}
              style={{ 
                borderColor: serverStatus.serversRunning ? '#4CAF50' : '#ff9800',
                boxShadow: serverStatus.serversRunning 
                  ? '0 0 10px rgba(76, 175, 80, 0.15)' 
                  : '0 0 10px rgba(255, 152, 0, 0.15)'
              }}
            >
              <div 
                className="card-title"
                style={{ 
                  color: serverStatus.serversRunning ? '#4CAF50' : '#ff9800'
                }}
              >
                {restarting ? 'Restarting...' : 'Restart Servers'}
              </div>
              <div className="card-description">
                {serverStatus.loading 
                  ? 'Checking status...' 
                  : serverStatus.serversRunning 
                    ? 'Servers are running - Click to restart' 
                    : 'Servers not detected - Click to start'
                }
              </div>
            </button>
            <button 
              className="menu-card blue"
              onClick={checkServerStatus}
            >
              <div className="card-title">Refresh Status</div>
              <div className="card-description">Check current server status</div>
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        © 2025 Lone Star College Montgomery
      </footer>
    </div>
  );
}

export default Home;
