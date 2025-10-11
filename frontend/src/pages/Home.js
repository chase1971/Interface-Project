import React from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import mavericksLogo from "../assets/mavericks-logo.png";

function Home() {
  const navigate = useNavigate();

  const handleD2LClick = () => {
    navigate('/d2l');
  };

  const handleMakeupClick = () => {
    navigate('/makeup');
  };

  const handleQuizGraderClick = () => {
    navigate('/quiz-grader');
  };

  const handleFileExtractorClick = () => {
    navigate('/file-extractor');
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
            <button className="menu-card orange" onClick={handleFileExtractorClick}>
              <div className="card-title">File Extractor</div>
              <div className="card-description">Process Canvas assignment submissions</div>
            </button>
          </div>
        </section>

        {/* RIGHT SIDE - DATABASE */}
        <section className="split right-panel">
          <div className="panel-header">
            <h2>Student Database</h2>
            <p className="panel-subtitle">Student records and roster management</p>
          </div>
          <div className="button-grid">
            <button className="menu-card red">
              <div className="card-title">Database Access</div>
              <div className="card-description">View and manage student records</div>
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
